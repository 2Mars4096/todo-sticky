"""Legacy Todo sync envelopes projected from Diane canonical records.

The only sync-owned persistence is revision/hash/shape metadata and hash-only
mutation receipts. Tasks, goals, routines and completed focus sessions remain
ordinary owner-scoped plugin records, edited by every product surface.
"""
from __future__ import annotations

import copy
import hashlib
from datetime import date
from typing import Callable
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from .todo_sync_protocol import KEY, ID, Mutation, validate_payload, project_record, legacy_payload
from .service import editable, fingerprint, now
from .models import PluginError
from .imports import _mapped, mapped_todo_task
from .todo_actions import parent_id

META = 'standalone-sync:'
NAMESPACE = 'standalone-sync-source'
MAX_CHANGES = 180  # canonical record + outbox writes remain below Firestore's 500 limit


def wire_id(record):
    source = record.get('extensions', {}).get('source', {})
    value = source.get('id') if source.get('app') == 'todo-sticky' else record['record_id']
    if isinstance(value, str) and ID.fullmatch(value):
        return value
    return 'diane_' + hashlib.sha256((record['record_type'] + ':' + record['record_id']).encode()).hexdigest()[:40]


def day_of(record):
    value = record.get('extensions', {}).get('date') or record['created_at'][:10]
    try:
        if date.fromisoformat(value).isoformat() != value:
            raise ValueError()
    except (TypeError, ValueError):
        raise HTTPException(422, 'A canonical Todo task has an invalid date; its data was not changed')
    return value


def identity_map(records):
    result = {}
    for record in records:
        if record.get('deleted'):
            continue
        identity = wire_id(record)
        if identity in result and result[identity]['record_id'] != record['record_id']:
            raise HTTPException(409, 'Two imported records share one original ID in this date. Resolve the source identity conflict before syncing.')
        result[identity] = record
    return result


class CanonicalTodoSync:
    def __init__(self, plugins, *, max_changes=MAX_CHANGES):
        self.plugins, self.repository, self.max_changes = plugins, plugins.repository, max_changes

    def _authorize(self, write=False):
        self.plugins.registry.require_capability('todo', 'records.write' if write else 'records.read')

    @staticmethod
    def _index(state):
        rows = list(state['records'].values())
        if len(rows) > 30000:
            raise HTTPException(413, 'This sync release supports at most 30,000 Todo records')
        days, focus = {}, {}
        goals = {'targets': [], 'recurring': []}
        by_id = {}
        for row in rows:
            by_id[row['record_id']] = row
            if row['record_type'] == 'task':
                days.setdefault(day_of(row), []).append(row)
            elif row['record_type'] in ('goal', 'routine'):
                goals['targets' if row['record_type'] == 'goal' else 'recurring'].append(row)
            elif row['record_type'] == 'focus_session' and (row.get('deleted') or row.get('status') == 'completed'):
                key = 'focus:' + wire_id(row)
                if key in focus and not focus[key].get('deleted') and not row.get('deleted'):
                    raise HTTPException(409, 'Repeated original focus identity requires review before syncing')
                if key not in focus or not row.get('deleted'):
                    focus[key] = row
        return {'days': days, 'goals': goals, 'focus': focus, 'by_id': by_id}

    def _project(self, key, index, meta):
        if key.startswith('day:'):
            rows = index['days'].get(key[4:], [])
            active = sorted((r for r in rows if not r.get('deleted')), key=lambda r:(r['extensions'].get('order', 0), r['record_id']))
            ids = identity_map(active)
            nodes = {}
            for raw, record in ids.items():
                ext = record['extensions']
                item = {'id': raw, 'text': record.get('text', ''), 'status': record['status'] or 'todo', 'subtasks': []}
                finish = {}
                for source, target in {'outcome':'doneWhen','due_date':'by','original_due_date':'originalBy','deadline_changes':'deadlineChanges','review_ready':'reviewReady'}.items():
                    if source in ext and ext[source] is not None:
                        finish[target] = copy.deepcopy(ext[source])
                shape = (meta.get('shapes') or {}).get(raw, {})
                for empty in shape.get('emptyDates', []):
                    if empty not in finish:
                        finish[empty] = ''
                if finish or shape.get('finishPresent'):
                    item['finish'] = finish
                if ext.get('goal_id'):
                    goal = index['by_id'].get(ext['goal_id'])
                    item['goalId'] = wire_id(goal) if goal else (meta.get('goalAliases') or {}).get(ext['goal_id'], ext['goal_id'])
                if ext.get('goal_step_id'):
                    item['goalStepId'] = ext['goal_step_id']
                nodes[record['record_id']] = item
            roots = []
            for record in active:
                parent = parent_id(record)
                if parent in nodes:
                    if parent == record['record_id']:
                        raise HTTPException(422, 'A task cannot be its own parent')
                    nodes[parent]['subtasks'].append(nodes[record['record_id']])
                else:
                    roots.append(nodes[record['record_id']])
            exists = bool(rows) or bool(meta.get('present'))
            deleted = not active and bool(meta.get('deleted'))
            return (None if deleted else {'date':key[4:], 'tasks':roots}), deleted, exists
        if key == 'goals':
            payload = {'targets': [], 'recurring': []}
            for group, rows in index['goals'].items():
                identities = identity_map(rows)
                order = (meta.get('order') or {}).get(group, [])
                ordered = sorted(identities, key=lambda raw:(order.index(raw) if raw in order else len(order), identities[raw]['created_at'], raw))
                for raw in ordered:
                    record = identities[raw]
                    item = {'id':raw, 'text':record.get('text') or record['title'], 'done':bool(record['extensions'].get('done'))}
                    if 'plan' in record['extensions']:
                        item['plan'] = copy.deepcopy(record['extensions']['plan'])
                    payload[group].append(item)
            exists = any(index['goals'].values()) or bool(meta.get('present'))
            deleted = not any(payload.values()) and bool(meta.get('deleted'))
            return None if deleted else payload, deleted, exists
        record = index['focus'].get(key)
        if not record or record.get('deleted'):
            return None, True, bool(record) or bool(meta.get('present'))
        ext = record['extensions']
        task = index['by_id'].get(ext.get('task_id'))
        payload = {'id':key[6:], 'taskId':wire_id(task) if task else ext.get('task_id', ''),
                   'taskText':record.get('text') or record['title'], 'durationMinutes':ext.get('duration_minutes'),
                   'completedAt':ext.get('completed_at'), 'vehicleCode':ext.get('vehicle_code', ''),
                   'orbitIndex':ext.get('orbit_index'), 'orbitLabel':ext.get('orbit_label', '')}
        return payload, False, True

    def _refresh(self, state, key, index=None):
        meta = state['settings'].get(META + key, {})
        payload, deleted, exists = self._project(key, index or self._index(state), meta)
        if not exists:
            return None
        validate_payload(key, Mutation(expectedRevision=0, mutationId='projection-validation', deleted=deleted, payload=payload, schemaVersion=2))
        digest = fingerprint({'payload':payload, 'deleted':deleted})
        if meta.get('fingerprint') != digest:
            meta = {**meta, 'present':True, 'deleted':deleted, 'fingerprint':digest,
                    'revision':meta.get('revision',0)+1, 'updatedAt':now(), 'mutationId':'diane_'+digest[:32]}
            state['settings'][META + key] = meta
        return {'key':key, 'revision':meta['revision'], 'deleted':deleted, 'payload':payload,
                'updatedAt':meta['updatedAt'], 'mutationId':meta['mutationId']}

    def records(self, owner, after='', limit=200, schema_version=2):
        self._authorize()
        if after and not KEY.fullmatch(after):
            raise HTTPException(422, 'Invalid cursor')
        if not 1 <= limit <= 250 or schema_version not in (1,2):
            raise HTTPException(422, 'Unsupported page size or schema')
        def read(state):
            index = self._index(state)
            keys = {'day:'+day for day in index['days']} | set(index['focus'])
            if any(index['goals'].values()):
                keys.add('goals')
            keys.update(name[len(META):] for name in state['settings'] if name.startswith(META) and KEY.fullmatch(name[len(META):]))
            selected = sorted(key for key in keys if key > after)
            page = selected[:limit]
            rows = [self._refresh(state,key,index) for key in page]
            return {'records':[project_record(row,schema_version) for row in rows if row],
                    'nextCursor':page[-1] if len(selected)>limit else None,
                    'schemaVersion':1, 'payloadSchemaVersion':schema_version}
        return self.repository.transact(owner,'todo',read)

    @staticmethod
    def _namespace(state):
        return state['settings'].get(NAMESPACE,{}).get('source_id','todo-standalone')

    def _changes(self, state, key, payload, deleted, source_id):
        index = self._index(state)
        plans, shapes, aliases = [], {}, {}
        if key.startswith('day:'):
            day = key[4:]
            current = identity_map(index['days'].get(day,[]))
            goals = identity_map(index['goals']['targets'])
            def visit(items,parent=None):
                for order,item in enumerate(items):
                    old = current.get(item['id'])
                    canonical = old['record_id'] if old else mapped_todo_task(source_id,item['id'],day)
                    content = editable(old) if old else {'schema_version':1,'title':'','text':'','status':'todo','tags':[],'relationships':[],'attachments':[],'extensions':{'source':{'app':'todo-sticky','namespace':source_id,'id':item['id']}}}
                    ext = content['extensions']; ext.update(date=day, order=order)
                    for source in ('outcome','due_date','original_due_date','deadline_changes','review_ready','goal_id','goal_step_id'):
                        ext.pop(source,None)
                    finish = item.get('finish')
                    if finish is not None:
                        shape = {'finishPresent':True, 'emptyDates':[]}
                        for original,target in {'doneWhen':'outcome','by':'due_date','originalBy':'original_due_date','deadlineChanges':'deadline_changes','reviewReady':'review_ready'}.items():
                            if original in finish:
                                if original in ('by','originalBy') and finish[original]=='':shape['emptyDates'].append(original)
                                else:ext[target]=copy.deepcopy(finish[original])
                        shapes[item['id']] = shape
                    if item.get('goalId'):
                        original = item['goalId']; canonical_goal = goals[original]['record_id'] if original in goals else _mapped('todo-sticky',source_id,'goal',original)
                        ext['goal_id']=canonical_goal;aliases[canonical_goal]=original
                    if item.get('goalStepId'):
                        ext['goal_step_id']=item['goalStepId']
                    content.update(title=item['text'][:200],text=item['text'],status=item['status'])
                    content['relationships']=[link for link in content['relationships'] if link['kind']!='parent']
                    if parent:content['relationships'].append({'kind':'parent','target':{'plugin_id':'todo','record_type':'task','record_id':parent}})
                    plans.append(('task',canonical,content))
                    visit(item['subtasks'],canonical)
            if not deleted:visit(payload['tasks'])
            affected = [row for row in index['days'].get(day,[]) if not row.get('deleted')]
            metadata = {'shapes':shapes,'goalAliases':aliases}
        elif key == 'goals':
            metadata = {'order':{'targets':[], 'recurring':[]}}
            affected = []
            for group,kind in (('targets','goal'),('recurring','routine')):
                rows=index['goals'][group];current=identity_map(rows)
                affected.extend(row for row in rows if not row.get('deleted'))
                for item in ([] if deleted else payload[group]):
                    old=current.get(item['id']);canonical=old['record_id'] if old else _mapped('todo-sticky',source_id,kind,item['id'])
                    content=editable(old) if old else {'schema_version':1,'title':'','text':'','status':'todo','tags':[],'relationships':[],'attachments':[],'extensions':{'source':{'app':'todo-sticky','namespace':source_id,'id':item['id']}}}
                    content.update(title=item['text'][:200],text=item['text'],status='done' if item['done'] else 'todo')
                    content['extensions']['done']=item['done']
                    if 'plan' in item:content['extensions']['plan']=copy.deepcopy(item['plan'])
                    else:content['extensions'].pop('plan',None)
                    plans.append((kind,canonical,content));metadata['order'][group].append(item['id'])
        else:
            old=index['focus'].get(key);affected=[old] if old and not old.get('deleted') else []
            metadata={}
            if not deleted:
                canonical=old['record_id'] if old else _mapped('todo-sticky',source_id,'focus_session',key[6:])
                content=editable(old) if old else {'schema_version':1,'title':'','text':'','status':'completed','tags':[],'relationships':[],'attachments':[],'extensions':{'source':{'app':'todo-sticky','namespace':source_id,'id':key[6:]}}}
                content.update(title=payload['taskText'][:200],text=payload['taskText'],status='completed')
                content['extensions'].update({target:copy.deepcopy(payload[source]) for source,target in {'taskId':'task_id','durationMinutes':'duration_minutes','completedAt':'completed_at','vehicleCode':'vehicle_code','orbitIndex':'orbit_index','orbitLabel':'orbit_label'}.items()})
                plans.append(('focus_session',canonical,content))
        return plans, affected, metadata

    def _apply(self, owner, state, plans, affected, mutation_id):
        keep={(kind,record_id) for kind,record_id,_ in plans}
        pending={kind+':'+record_id:content for kind,record_id,content in plans}
        changed=[]
        for kind,record_id,content in plans:
            previous=state['records'].get(kind+':'+record_id)
            content=self.plugins._validate(owner,'todo',kind,content,previous)
            self.plugins._relationships(owner,'todo',kind,record_id,content,state,pending)
            if previous and not previous.get('deleted') and editable(previous)==content:continue
            saved={**content,'plugin_id':'todo','record_type':kind,'record_id':record_id,
                   'revision':(previous or {}).get('revision',0)+1,'created_at':(previous or {}).get('created_at',now()),'updated_at':now(),'deleted':False}
            changed.append(saved)
        for previous in affected:
            if (previous['record_type'],previous['record_id']) not in keep:
                changed.append({**previous,'revision':previous['revision']+1,'updated_at':now(),'deleted':True})
        if len(changed)>self.max_changes:
            raise HTTPException(413,'This change affects too many records for one atomic sync write. Keep your local changes and split the edit, or use the staged migration importer.')
        for saved in changed:
            state['records'][saved['record_type']+':'+saved['record_id']]=saved
            self.plugins._event(state,mutation_id,saved,'record.deleted' if saved.get('deleted') else 'record.updated' if saved['revision']>1 else 'record.created')

    def mutate(self, owner, key, mutation):
        self._authorize(write=True)
        if isinstance(mutation,dict):mutation=Mutation.model_validate(mutation)
        validate_payload(key,mutation)
        request_hash=fingerprint({'key':key,**mutation.model_dump()},max_bytes=700000)
        receipt_key='standalone-write:'+hashlib.sha256((key+':'+mutation.mutationId).encode()).hexdigest()
        def write(state):
            self.plugins._enabled(state)
            current=self._refresh(state,key)
            previous_receipt=state['receipts'].get(receipt_key)
            if previous_receipt:
                if previous_receipt['fingerprint']!=request_hash:raise HTTPException(409,'Mutation ID was reused with different contents')
                if current and fingerprint({'payload':current['payload'],'deleted':current['deleted']})==previous_receipt['result_fingerprint']:
                    return project_record(current,mutation.schemaVersion)
                return JSONResponse({'error':'conflict','alreadyApplied':True,'current':project_record(current,mutation.schemaVersion)},status_code=409)
            payload=mutation.payload
            if mutation.schemaVersion<2 and payload is not None and current and current['payload'] is not None:
                payload=legacy_payload(key,payload,current['payload'])
                validate_payload(key,mutation.model_copy(update={'payload':payload,'schemaVersion':2}))
            # A seeded last mutation retains the old server's retry contract.
            if current and current['mutationId']==mutation.mutationId:
                if current['payload']!=payload or current['deleted']!=mutation.deleted:raise HTTPException(409,'Mutation ID was reused with different contents')
                return project_record(current,mutation.schemaVersion)
            if mutation.expectedRevision!=(current['revision'] if current else 0):
                return JSONResponse({'error':'conflict','current':project_record(current,mutation.schemaVersion)},status_code=409)
            plans,affected,metadata=self._changes(state,key,payload,mutation.deleted,self._namespace(state))
            self._apply(owner,state,plans,affected,mutation.mutationId)
            old=state['settings'].get(META+key,{})
            result_hash=fingerprint({'payload':payload,'deleted':mutation.deleted})
            state['settings'][META+key]={**old,**metadata,'present':True,'deleted':mutation.deleted,'fingerprint':result_hash,
                'revision':mutation.expectedRevision+1,'updatedAt':now(),'mutationId':mutation.mutationId}
            result=self._refresh(state,key)
            if not result or result['payload']!=payload or result['deleted']!=mutation.deleted:
                raise HTTPException(422,'This legacy payload cannot round-trip through the canonical schema; no changes were saved')
            state['receipts'][receipt_key]={'fingerprint':request_hash,'result_fingerprint':result_hash,'revision':result['revision'],'created_at':now()}
            return project_record(result,mutation.schemaVersion)
        return self.repository.transact(owner,'todo',write)

    def seed_records(self, owner, legacy_records, *, source_id='todo-standalone'):
        """Offline/admin migration API; never exposed as an unauthenticated route.

        Validate the whole source before writing. Seed goals before dates. Existing
        divergent canonical content refuses; seed retries never overwrite later edits.
        """
        if not isinstance(source_id,str) or not source_id or len(source_id)>200:raise ValueError('Choose a stable source_id')
        records=copy.deepcopy(list(legacy_records));seen=set()
        for record in records:
            if not isinstance(record,dict) or not isinstance(record.get('revision'),int) or isinstance(record['revision'],bool) or record['revision']<1:raise ValueError('Legacy records need positive integer revisions')
            key=record.get('key');request=Mutation(expectedRevision=0,mutationId=record.get('mutationId'),deleted=record.get('deleted'),payload=record.get('payload'),schemaVersion=2)
            validate_payload(key,request)
            if key in seen:raise ValueError('Repeated legacy record key')
            seen.add(key)
        report=[]
        for record in sorted(records,key=lambda r:(r['key']!='goals',r['key'])):
            key=record['key'];seed_hash=fingerprint(record,max_bytes=700000)
            def seed(state):
                existing_meta=state['settings'].get(META+key,{})
                if existing_meta.get('seed_fingerprint')==seed_hash:
                    return {'key':key,'status':'already_seeded','revision':existing_meta['revision']}
                if existing_meta:
                    raise HTTPException(409,'Sync metadata already exists for '+key+'; migration must be reconciled before reseeding')
                namespace=state['settings'].get(NAMESPACE)
                if namespace and namespace.get('source_id')!=source_id:raise HTTPException(409,'This owner is already bound to a different original Todo source')
                plans,affected,metadata=self._changes(state,key,record['payload'],record['deleted'],source_id)
                index=self._index(state)
                projected,deleted,exists=self._project(key,index,{**metadata,'present':True,'deleted':record['deleted']})
                if exists and (affected or record['deleted']) and (projected!=record['payload'] or deleted!=record['deleted']):
                    raise HTTPException(409,'Canonical data differs from original '+key+'; existing data was not overwritten')
                self._apply(owner,state,plans,affected,record['mutationId'])
                state['settings'][NAMESPACE]={'source_id':source_id}
                state['settings'][META+key]={**metadata,'present':True,'deleted':record['deleted'],
                    'fingerprint':fingerprint({'payload':record['payload'],'deleted':record['deleted']}),
                    'revision':record['revision'],'updatedAt':record.get('updatedAt') or now(),'mutationId':record['mutationId'],
                    'seed_fingerprint':seed_hash,'source_id':source_id}
                actual=self._refresh(state,key)
                if not actual or actual['payload']!=record['payload'] or actual['revision']!=record['revision']:
                    raise HTTPException(422,'Source record cannot round-trip through the shared schema: '+key)
                return {'key':key,'status':'seeded','revision':record['revision']}
            report.append(self.repository.transact(owner,'todo',seed))
        return {'source_id':source_id,'records':report}


def build_sync_router(plugins, auth, companion_service, *, before_write: Callable|None=None):
    from .router import plugin_owner_dependency
    router=APIRouter(tags=['todo-standalone-sync'])
    owner=plugin_owner_dependency(auth,companion_service)
    adapter=CanonicalTodoSync(plugins)
    @router.get('/v1/health')
    def health():return {'ok':True,'canonical':True,'contract':'todo/1'}
    @router.get('/v1/sync')
    def records(after:str='',pageSize:int=Query(default=200,ge=1,le=250),schemaVersion:int=Query(default=1,ge=1,le=2),account=Depends(owner)):
        return JSONResponse(adapter.records(account,after,pageSize,schemaVersion),headers={'Cache-Control':'no-store','Pragma':'no-cache','X-Content-Type-Options':'nosniff'})
    @router.put('/v1/sync/{key}')
    def mutate(key:str,body:Mutation,account=Depends(owner)):
        if before_write:before_write(account,key,body)
        result=adapter.mutate(account,key,body)
        if not isinstance(result,JSONResponse):result=JSONResponse(result)
        result.headers['Cache-Control']='no-store';result.headers['Pragma']='no-cache';result.headers['X-Content-Type-Options']='nosniff'
        return result
    return router
