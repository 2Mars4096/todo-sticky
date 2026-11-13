"""Lossless full-document Todo source and canonical reconciliation.

No filesystem or execution authority lives here. The host supplies revision-guarded
files; CanonicalTodoSync remains the only record writer.
"""
from __future__ import annotations
import copy
import hashlib
import json
import re
from datetime import date
from uuid import uuid4
from fastapi import HTTPException
from .todo_sync import CanonicalTodoSync, wire_id, day_of
from .todo_sync_protocol import Mutation, validate_payload
from .service import fingerprint

STATUS = {' ': 'todo', 'x': 'done', 'X': 'done', '~': 'partial', '?': 'question', '-': 'stopped'}
CHAR = {v: k for k, v in STATUS.items() if k != 'X'}
META = re.compile(r'\s*<!--\s*sticky-todo:(id|finish|goal|text)=((?:(?!-->).)*)\s*-->\s*$')

def parse(content, assign=False):
    if not isinstance(content, str) or len(content.encode()) > 500000:
        raise HTTPException(413, 'Todo document exceeds 500 KB')
    lines = content.splitlines(keepends=True)
    days, spans, seen, stack = {}, [], set(), []
    current = None; fence = None; front = False; offset = 0; missing = []
    for number, line in enumerate(lines):
        raw = line.rstrip('\r\n')
        if number == 0 and raw.lstrip('\ufeff') == '---': front = True; offset += len(line); continue
        if front:
            if raw in ('---', '...'): front = False
            offset += len(line); continue
        marker = re.match(r'^\s{0,3}(`{3,}|~{3,})', raw)
        if marker:
            if fence is None: fence = marker[1]
            elif marker[1][0] == fence[0] and len(marker[1]) >= len(fence): fence = None
            offset += len(line); continue
        if fence: offset += len(line); continue
        heading = re.fullmatch(r'##\s+(\d{4}-\d{2}-\d{2})\s*', raw)
        if heading:
            current = heading[1]
            try: date.fromisoformat(current)
            except ValueError: raise HTTPException(422, 'Invalid Todo date')
            if current in days: raise HTTPException(409, 'Repeated date section requires review')
            days[current] = []; stack = []
        elif raw.startswith('## '): current = None; stack = []
        elif current:
            match = re.match(r'^([ \t]*)- (?:\[(.)\]\s+)?(.*)$', raw)
            if match:
                indent, status, text = len(match[1]), match[2] or ' ', match[3]
                if status not in STATUS: raise HTTPException(422, f'Unsupported checkbox on line {number+1}')
                metadata = {}
                while (m := META.search(text)):
                    key, value = m[1], m[2].strip()
                    if key in metadata: raise HTTPException(409, 'Repeated task metadata')
                    try: metadata[key] = value if key == 'id' else json.loads(value)
                    except ValueError: raise HTTPException(422, 'Invalid Todo metadata JSON')
                    text = text[:m.start()]
                if 'text' in metadata and (not isinstance(metadata['text'],str) or text.strip() != (metadata['text'].splitlines() or [''])[0].replace('<!--','&lt;!--')):
                    raise HTTPException(409,'Task preview differs from sticky-todo:text metadata; edit the full text metadata before saving')
                identity = metadata.get('id')
                if identity and not re.fullmatch(r'[A-Za-z0-9_-]{1,128}', identity): raise HTTPException(422, 'Invalid task ID')
                if identity in seen: raise HTTPException(409, 'Copied task ID: remove the copied ID to create a new task')
                if not identity:
                    missing.append(number+1)
                    identity = 'task_' + uuid4().hex if assign else f'missing_{number+1}'
                seen.add(identity)
                task = dict(id=identity, text=metadata.get('text', text.strip()), status=STATUS[status], subtasks=[])
                if 'finish' in metadata: task['finish'] = metadata['finish']
                if 'goal' in metadata:
                    if not isinstance(metadata['goal'],dict) or set(metadata['goal'])-{'goalId','goalStepId'}: raise HTTPException(422,'Invalid goal metadata')
                    task.update(metadata['goal'])
                while stack and stack[-1][0] >= indent: stack.pop()
                (stack[-1][1]['subtasks'] if stack else days[current]).append(task)
                stack.append((indent, task))
                spans.append(dict(id=identity, date=current, line=number+1, start=offset, end=offset+len(raw), task=task, indent=indent, missing='id' not in metadata))
        offset += len(line)
    for day, tasks in days.items():
        validate_payload('day:'+day, Mutation.model_validate(dict(schemaVersion=2, mutationId=str(uuid4()), expectedRevision=0, deleted=False, payload=dict(date=day,tasks=tasks))))
    return dict(days=days, spans=spans, missing=missing)

def identify(content):
    parsed = parse(content, True)
    for span in reversed(parsed['spans']):
        if span['missing']: content = content[:span['end']] + ' <!-- sticky-todo:id='+span['id']+' -->' + content[span['end']:]
    return content

def task_line(task, indent):
    def meta(key, value):
        return ' <!-- sticky-todo:'+key+'='+json.dumps(value, ensure_ascii=False, separators=(',', ':')).replace('<','\\u003c').replace('>','\\u003e')+' -->'
    text = task['text']
    if '\n' in text or '\r' in text or '<!--' in text:
        text = text.splitlines()[0].replace('<!--','&lt;!--') + meta('text', text)
    if task.get('goalId'): text += meta('goal', {k:task[k] for k in ('goalId','goalStepId') if k in task})
    if 'finish' in task: text += meta('finish',task['finish'])
    return ' '*indent+'- ['+CHAR[task['status']]+'] '+text+' <!-- sticky-todo:id='+task['id']+' -->'

def patch(content, tasks):
    """Replace only selected task lines; all other bytes survive."""
    for span in reversed(parse(content)['spans']):
        if span['id'] in tasks and {k:v for k,v in span['task'].items() if k!='subtasks'} != {k:v for k,v in tasks[span['id']].items() if k!='subtasks'}:
            content = content[:span['start']] + task_line(tasks[span['id']],span['indent']) + content[span['end']:]
    return content

class TodoDocuments:
    def __init__(self, plugins): self.sync = CanonicalTodoSync(plugins)
    def operation(self, owner, body, apply=False):
        sync = self.sync; sync._authorize(write=apply)
        document = body.get('document')
        if not isinstance(document,str) or not re.fullmatch(r'[a-f0-9]{64}', document): raise HTTPException(422,'Invalid document binding')
        content = body.get('content'); parsed = parse(content)
        if parsed['missing']: raise HTTPException(409, 'Preview ID assignment before reconciliation')
        key = 'markdown-document:'+document
        def run(state):
            sync.plugins._enabled(state)
            binding = state['settings'].get(key, {})
            rows = [r for r in state['records'].values() if r['record_type']=='task']
            token = fingerprint(rows)
            request_hash = fingerprint(dict(content=content, expected=body.get('expected')))
            if apply and binding.get('request') == request_hash:
                return dict(applied=True, token=token, links=binding['links'])
            if apply and body.get('expected') != token: raise HTTPException(409, 'Canonical tasks changed. Preview again; file remains recoverable.')
            active = [r for r in rows if not r.get('deleted')]
            by_wire = {}
            for row in active: by_wire.setdefault(wire_id(row),[]).append(row)
            ids = {s['id'] for s in parsed['spans']}
            old_ids = set(binding.get('ids', []))
            selected = []
            for identity in ids | old_ids:
                candidates = by_wire.get(identity, [])
                if len(candidates)>1: raise HTTPException(409, 'Original ID maps to multiple records; explicit identity repair required')
                if candidates: selected.append(candidates[0])
            # Reuse canonical mapping while relocating known IDs before per-day projection.
            working = copy.deepcopy(state)
            locations = {s['id']:s['date'] for s in parsed['spans']}
            working['records'] = {k:r for k,r in working['records'].items() if r['record_type']!='task' or wire_id(r) in ids}
            for row in working['records'].values():
                if row['record_type']=='task' and wire_id(row) in locations: row['extensions']['date']=locations[wire_id(row)]
            plans = []
            for day,tasks in parsed['days'].items():
                plan,_,_ = sync._changes(working,'day:'+day,dict(date=day,tasks=tasks),False,sync._namespace(state))
                plans.extend(plan)
            links = {span['id']: plan[1] for span,plan in zip(parsed['spans'],plans)}
            # Another bound document must never take ownership of these identities.
            for other,value in state['settings'].items():
                if other.startswith('markdown-document:') and other != key and ids.intersection(value.get('ids',[])):
                    raise HTTPException(409, 'Task belongs to another document; cross-document move requires review')
            canonical = {}
            index = sync._index(state)
            def flatten(items):
                for item in items:
                    canonical[item['id']] = item
                    flatten(item['subtasks'])
            for day in {day_of(r) for r in selected}:
                payload,_,_ = sync._project('day:'+day,index,state['settings'].get('standalone-sync:day:'+day,{}))
                if payload: flatten(payload['tasks'])
            result = dict(canonicalContent=patch(content,canonical), token=token, links=links, created=[i for i in ids if i not in by_wire], removed=sorted(old_ids-ids), initial=not bool(binding))
            if not apply:
                sync._apply(owner,copy.deepcopy(state),plans,selected,'document-preview')
            if apply:
                sync._apply(owner,state,plans,selected,'document-'+request_hash[:40])
                state['settings'][key] = dict(ids=sorted(ids),links=links,request=request_hash,content_hash=hashlib.sha256(content.encode()).hexdigest())
                sync._advance_clock(state)
                result['applied']=True
            return result
        return sync.repository.transact(owner,'todo',run)

def build_document_router(plugins, auth, companion):
    from fastapi import APIRouter, Depends
    from .router import plugin_owner_dependency
    router=APIRouter(); owner=plugin_owner_dependency(auth,companion); service=TodoDocuments(plugins)
    @router.post('/api/plugins/todo/documents/preview')
    def preview(body:dict, account=Depends(owner)): return service.operation(account,body)
    @router.post('/api/plugins/todo/documents/commit')
    def commit(body:dict, account=Depends(owner)): return service.operation(account,body,True)
    return router
