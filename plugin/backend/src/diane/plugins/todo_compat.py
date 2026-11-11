"""Todo Sticky frontend adapter over Diane's canonical plugin records.

No Markdown files or original-app databases are opened. Whole-day edits use a
revision digest and a single plugin transaction; retries keep their receipt.
"""
from __future__ import annotations
import copy
import json
from datetime import date, timedelta
from types import SimpleNamespace
from uuid import uuid4, uuid5, NAMESPACE_URL
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict, Field
from .models import PluginError
from .service import fingerprint, now, editable
from .registry import identifier
from .todo_actions import TodoActionService, parent_id


class Command(BaseModel):
    model_config = ConfigDict(extra='forbid')
    request_id: str = Field(min_length=1, max_length=160)
    payload: dict = Field(default_factory=dict)


def valid_day(value):
    try:
        parsed = date.fromisoformat(value)
    except (ValueError, TypeError):
        raise PluginError(422, 'Choose a valid calendar date')
    if parsed.isoformat() != value:
        raise PluginError(422, 'Choose an ISO calendar date')
    return value


def task_from_record(record):
    ext = record['extensions']
    finish = {target: copy.deepcopy(ext[source]) for source, target in {
        'outcome': 'doneWhen', 'due_date': 'by', 'original_due_date': 'originalBy',
        'deadline_changes': 'deadlineChanges', 'review_ready': 'reviewReady',
    }.items() if source in ext}
    return {'id': record['record_id'], 'text': record['text'] or record['title'],
            'status': record['status'] or 'todo', 'subtasks': [],
            **({'finish': finish} if finish else {}),
            **({'goalId': ext['goal_id']} if ext.get('goal_id') else {}),
            **({'goalStepId': ext['goal_step_id']} if ext.get('goal_step_id') else {})}


def day_snapshot(records, day, local_today=None):
    local_today=valid_day(local_today) if local_today else date.today().isoformat()
    chosen = [r for r in records if r['record_type'] == 'task' and not r.get('deleted')
              and (r['extensions'].get('date') or local_today) == day]
    chosen.sort(key=lambda r: (r['extensions'].get('order', 0), r['record_id']))
    nodes = {r['record_id']: task_from_record(r) for r in chosen}
    roots = []
    for record in chosen:
        parent = parent_id(record)
        if parent in nodes and parent != record['record_id']:
            nodes[parent]['subtasks'].append(nodes[record['record_id']])
        else:
            roots.append(nodes[record['record_id']])
    digest = fingerprint([(r['record_id'], r['revision']) for r in sorted(chosen, key=lambda r:r['record_id'])])
    return {'date': day, 'tasks': roots, 'revision': digest, 'filePath': 'diane:' + day,
            'weekStart': (date.fromisoformat(day) - timedelta(days=date.fromisoformat(day).weekday())).isoformat()}


def flatten(tasks):
    if not isinstance(tasks, list):
        raise PluginError(422, 'Expected tasks')
    output, seen = [], set()
    def visit(items, parent=None, depth=0):
        if depth > 32 or len(output) > 1000:
            raise PluginError(413, 'Use at most 1,000 tasks and 32 nesting levels per day')
        for order, task in enumerate(items):
            if not isinstance(task, dict) or set(task) - {'id','text','status','subtasks','finish','goalId','goalStepId'}:
                raise PluginError(422, 'Unsupported task fields; original data was not changed')
            identifier(task.get('id'))
            if task['id'] in seen:
                raise PluginError(422, 'Duplicate task identity within one date')
            seen.add(task['id'])
            if not isinstance(task.get('text'), str) or len(task['text']) > 10000:
                raise PluginError(422, 'Task text must be a string of at most 10,000 characters')
            if task.get('status') not in ('todo','done','partial','question','stopped'):
                raise PluginError(422, 'Unknown task state')
            if not isinstance(task.get('subtasks', []), list):
                raise PluginError(422, 'Expected nested tasks')
            output.append((task, parent, order))
            visit(task.get('subtasks', []), task['id'], depth + 1)
    visit(tasks)
    return output


class TodoCompatService:
    def __init__(self, plugins, provider=None):
        self.plugins, self.repository, self.provider = plugins, plugins.repository, provider
        self.actions = TodoActionService(plugins)

    def records(self, owner):
        values, cursor = [], None
        while True:
            page = self.repository.page(owner, 'todo', limit=500, cursor=cursor)
            values.extend(page['items'])
            cursor = page['next_cursor']
            if not cursor:
                return values
            if len(values) >= 10000:
                raise PluginError(413, 'Use an archive with at most 10,000 records')

    def extract(self, owner, query):
        self.plugins.registry.require_capability('todo', 'records.read')
        records = self.records(owner)
        today=valid_day(query.get('local_today')) if query.get('local_today') else date.today().isoformat()
        days = {r['extensions'].get('date') or today for r in records if r['record_type'] == 'task' and not r.get('deleted')}
        if query.get('date'):
            days = {valid_day(query['date'])}
        if query.get('fromDate'):
            start = valid_day(query['fromDate']); days = {day for day in days if day >= start}
        if query.get('toDate'):
            end = valid_day(query['toDate']); days = {day for day in days if day <= end}
        return {'dates': [day_snapshot(records, day,today) for day in sorted(days)], 'unavailableFiles': []}

    def get_tasks(self,owner,day,local_today=None):
        day=valid_day(day)
        records=self.records(owner)
        snapshot=day_snapshot(records,day,local_today)
        active={r['record_id']:r for r in records if r['record_type']=='task' and not r.get('deleted')}
        def lineage(record):
            source=record['extensions'].get('source',{})
            return (source.get('namespace',''),source.get('id') or record['record_id'])
        dates={r['extensions'].get('date') for r in active.values() if r['extensions'].get('date') and r['extensions']['date']<day}
        historical={value:day_snapshot(records,value)['tasks'] for value in dates}
        tasks=[]
        for item in snapshot['tasks']:
            current=active[item['id']]
            other=[]
            for older,roots in sorted(historical.items()):
                for root in roots:
                    if lineage(active[root['id']])==lineage(current):
                        other.extend([{**child,'sourceDate':older} for child in root['subtasks']])
            tasks.append({**{k:v for k,v in item.items() if k!='subtasks'},'todaySubtasks':item['subtasks'],'otherSubtasks':other})
        return {**snapshot,'tasks':tasks}

    def push_task(self,owner,payload,request_id):
        digest=fingerprint(payload);receipt_key='todo-port-push:'+request_id
        prior=self.repository.read(owner,'todo','receipts',receipt_key)
        if prior:
            if prior['fingerprint']!=digest:raise PluginError(409,'Move request ID belongs to different input')
            return copy.deepcopy(prior['result'])
        def acknowledged(result):
            def store(state):
                self.plugins._receipt(state,receipt_key,digest,result)
            self.repository.transact(owner,'todo',store)
            return result
        def comparable(task):
            return {key:([comparable(child) for child in value] if key=='subtasks' else value) for key,value in task.items() if key!='id'}
        source_day=valid_day(payload.get('fromDate'));target_day=valid_day(payload.get('toDate'))
        if source_day==target_day:raise PluginError(422,'Choose another date')
        snapshot=payload.get('taskSnapshot');flatten([snapshot])
        records=self.records(owner);index={r['record_id']:r for r in records if r['record_type']=='task' and not r.get('deleted')}
        source=day_snapshot(records,source_day,payload.get('local_today'))
        def find(items,identifier):
            for item in items:
                if item['id']==identifier:return item
                found=find(item['subtasks'],identifier)
                if found:return found
            return None
        actual=find(source['tasks'],snapshot['id'])
        if actual!=snapshot:raise PluginError(409,'The source task changed. Refresh before moving it.')
        target=day_snapshot(records,target_day,payload.get('local_today'))
        def lineage(record_id):
            record=index.get(record_id)
            if not record:return ('',record_id)
            origin=record['extensions'].get('source',{})
            return (origin.get('namespace',''),origin.get('id') or record_id)
        parent=payload.get('parentSnapshot')
        if parent:
            flatten([parent])
            if find(source['tasks'],parent['id'])!=parent or not find(parent['subtasks'],snapshot['id']):raise PluginError(409,'The source parent changed. Refresh before moving this step.')
            destination=next((row for row in target['tasks'] if lineage(row['id'])==lineage(parent['id'])),None)
            if destination:
                existing=next((row for row in destination['subtasks'] if lineage(row['id'])==lineage(snapshot['id'])),None)
                if existing:
                    if comparable(existing)!=comparable(snapshot):raise PluginError(409,'The destination step differs. Review both copies before moving.')
                    return acknowledged({**target,'ok':True})
                destination['subtasks'].append(snapshot)
            else:target['tasks'].append({**parent,'subtasks':[snapshot]})
        else:
            existing=next((row for row in target['tasks'] if lineage(row['id'])==lineage(snapshot['id'])),None)
            if existing:
                if comparable(existing)!=comparable(snapshot):raise PluginError(409,'The destination task differs. Review both copies before moving.')
                return acknowledged({**target,'ok':True})
            target['tasks'].append(snapshot)
        return acknowledged(self.save_day(owner,{'date':target_day,'tasks':target['tasks'],'expectedRevision':target['revision'],'local_today':payload.get('local_today')},request_id))

    def save_day(self, owner, payload, request_id):
        day = valid_day(payload.get('dateStr') or payload.get('date'))
        today=valid_day(payload.get('local_today')) if payload.get('local_today') else date.today().isoformat()
        tasks = payload.get('tasks')
        rows = flatten(tasks)
        expected = payload.get('expectedRevision')
        digest = fingerprint({'day':day,'tasks':tasks,'expected':expected})
        key = 'todo-port:' + request_id
        self.plugins.registry.require_capability('todo','records.write')
        def save(state):
            replay = self.plugins._replay(state,key,digest)
            if replay is not None:return replay
            self.plugins._enabled(state)
            all_records = list(state['records'].values())
            previous = day_snapshot(all_records,day,today)
            if expected != previous['revision']:
                raise PluginError(409,'This day changed in another window. Your edit is retained; refresh before saving it.')
            mapping = {}
            for task, _, _ in rows:
                old = state['records'].get('task:' + task['id'])
                if old and (old['extensions'].get('date') or day) != day:
                    origin = old['extensions'].get('source', {}).get('id') or task['id']
                    source = old['extensions'].get('source', {})
                    if source.get('app') == 'todo-sticky' and source.get('namespace'):
                        from .imports import mapped_todo_task
                        mapping[task['id']] = mapped_todo_task(source['namespace'], origin, day)
                    else:
                        mapping[task['id']] = str(uuid5(NAMESPACE_URL, 'diane-todo-occurrence:' + day + ':' + origin))
                else:
                    mapping[task['id']] = task['id']
            rows_normalized = [(dict(task, id=mapping[task['id']]), mapping.get(parent) if parent else None, order, task['id']) for task,parent,order in rows]
            if len({task['id'] for task,_,_,_ in rows_normalized}) != len(rows_normalized):
                raise PluginError(409, 'Duplicate occurrence after matching dated task identities')
            existing = {r['record_id']:r for r in all_records if r['record_type']=='task' and not r.get('deleted') and (r['extensions'].get('date') or today)==day}
            wanted = {task['id'] for task,_,_,_ in rows_normalized}
            for task,parent,order,origin_id in rows_normalized:
                old = state['records'].get('task:'+task['id'])
                if old and task['id'] not in existing and not old.get('deleted'):
                    raise PluginError(409,'This task identity belongs to another date; use Move instead of replacing history')
                original = state['records'].get('task:' + origin_id)
                base = old or original
                content = editable(base) if base else {'schema_version':1,'title':'','text':'','status':'todo','tags':[],'relationships':[],'attachments':[],'extensions':{}}
                ext=content['extensions']; ext.update({'date':day,'order':order})
                if original and origin_id != task['id'] and not ext.get('source'):
                    ext['source'] = {'app':'todo-sticky','id':origin_id}
                finish=task.get('finish') or {}
                if not isinstance(finish,dict) or set(finish)-{'doneWhen','by','originalBy','deadlineChanges','reviewReady'}:
                    raise PluginError(422,'Unsupported outcome fields')
                for a,b in {'doneWhen':'outcome','by':'due_date','originalBy':'original_due_date','deadlineChanges':'deadline_changes','reviewReady':'review_ready'}.items():
                    if a in finish and finish[a] is not None:ext[b]=copy.deepcopy(finish[a])
                    else:ext.pop(b,None)
                for a,b in [('goalId','goal_id'),('goalStepId','goal_step_id')]:
                    if task.get(a):ext[b]=task[a]
                    else:ext.pop(b,None)
                content.update(title=task['text'][:200],text=task['text'],status=task['status'])
                content['relationships']=[r for r in content['relationships'] if r['kind']!='parent']
                if parent:content['relationships'].append({'kind':'parent','target':{'plugin_id':'todo','record_type':'task','record_id':parent}})
                if old and old.get('deleted'):
                    content=self.plugins._validate(owner,'todo','task',content,old)
                    self.plugins._relationships(owner,'todo','task',task['id'],content,state)
                    restored={**content,'plugin_id':'todo','record_type':'task','record_id':task['id'],'revision':old['revision']+1,'created_at':old['created_at'],'updated_at':now(),'deleted':False}
                    state['records']['task:'+task['id']]=restored
                    self.plugins._event(state,request_id,restored,'record.updated')
                else:
                    self.actions._save(owner,state,SimpleNamespace(request_id=request_id),'task',task['id'],content,old)
            for record_id,old in existing.items():
                if record_id in wanted:continue
                deleted={**old,'deleted':True,'revision':old['revision']+1,'updated_at':now()}
                state['records']['task:'+record_id]=deleted
                self.plugins._event(state,request_id,deleted,'record.deleted')
            result=day_snapshot(list(state['records'].values()),day,today)
            result['ok']=True
            self.plugins._receipt(state,key,digest,result)
            return result
        return self.repository.transact(owner,'todo',save)

    def run(self,owner,command,payload,request_id):
        identifier(request_id)
        fingerprint(payload,max_bytes=8*1024*1024)
        self.plugins.registry.require_capability('todo','records.read')
        if command=='preferences':return self.repository.read(owner,'todo','settings','port:preferences') or {'revision':0,'machines':[],'planningPreferences':{}}
        if command=='save_preferences':
            value=validate_preferences(payload.get('value',{}));expected=payload.get('expected_revision')
            digest=fingerprint(payload)
            def save_preferences(state):
                self.plugins._enabled(state)
                replay=self.plugins._replay(state,'todo-port-prefs:'+request_id,digest)
                if replay is not None:return replay
                current=state['settings'].get('port:preferences',{'revision':0})
                if current['revision']!=expected:raise PluginError(409,'Planning settings changed. Reload before saving.')
                result={**value,'revision':current['revision']+1};state['settings']['port:preferences']=result
                self.plugins._receipt(state,'todo-port-prefs:'+request_id,digest,result);return result
            return self.repository.transact(owner,'todo',save_preferences)
        if command=='prepare_backup':return prepare_backup(payload.get('archive'))
        if command=='recoveries':return self.repository.read(owner,'todo','settings','port:recoveries') or {'items':[]}
        if command=='retain_recoveries':
            items=payload.get('items',[])
            if not isinstance(items,list) or len(items)>40:raise PluginError(422,'Use at most 40 unfinished project operations')
            fingerprint(items,max_bytes=500000)
            def retain(state):
                self.plugins._enabled(state)
                previous=state['settings'].get('port:recoveries',{'items':[]})['items']
                merged={fingerprint(item):item for item in [*previous,*items]}
                if len(merged)>40:raise PluginError(413,'Resolve unfinished project saves before importing more')
                result={'items':list(merged.values())};state['settings']['port:recoveries']=result;return result
            return self.repository.transact(owner,'todo',retain)
        if command=='dismiss_recovery':
            target=payload.get('fingerprint')
            operation=payload.get('operation')
            if operation is not None:
                if not isinstance(operation,dict):raise PluginError(422,'Invalid project recovery')
                operation={**operation,'folder':''}
                fingerprint(operation,max_bytes=500000)
            def dismiss(state):
                self.plugins._enabled(state)
                result={'items':[item for item in state['settings'].get('port:recoveries',{'items':[]})['items'] if fingerprint(item)!=target and (operation is None or {**item.get('operation',{}),'folder':''}!=operation)]}
                state['settings']['port:recoveries']=result;return result
            return self.repository.transact(owner,'todo',dismiss)
        if command=='push_task':return self.push_task(owner,payload,request_id)
        if command=='get_tasks':return self.get_tasks(owner,payload.get('dateStr'),payload.get('local_today'))
        if command=='extract':return self.extract(owner,payload)
        if command=='save_day':return self.save_day(owner,payload,request_id)
        if command=='record':return self.plugins.get_record(owner,'todo','task',identifier(payload.get('id')))
        if command=='goals':
            items=[r for r in self.records(owner) if not r.get('deleted') and r['record_type'] in ('goal','routine')]
            return {'items':items}
        if command=='ai':
            return self.suggest(owner,payload,request_id)
        raise PluginError(404,'Unknown Todo command')

    def suggest(self,owner,payload,request_id):
        action=payload.get('action')
        if action not in ('breakdown','schedule','project','albums'):
            raise PluginError(422,'Unknown suggestion action')
        if self.provider is None:
            raise PluginError(503,'Configure Diane’s analysis provider before requesting AI suggestions')
        self.plugins.registry.require_capability('todo','records.read')
        required={'breakdown':'intelligence.steps','schedule':'intelligence.day_plan','project':'intelligence.project','albums':'intelligence.albums'}[action]
        if required not in self.plugins.registry.manifests['todo'].get('actions',[]):raise PluginError(403,'Todo has not declared this AI action')
        source=payload.get('input',{})
        if not isinstance(source,dict):raise PluginError(422,'Suggestion input must be an object')
        digest=fingerprint(payload,max_bytes=200000)
        key='todo-port-ai:'+request_id
        from .todo_context import TodoSuggestionContext
        prior=self.repository.read(owner,'todo','receipts',key)
        context=TodoSuggestionContext(self.plugins,owner,None if prior else payload.get('sources'))
        def reserve(state):
            self.plugins._enabled(state)
            prior=state['receipts'].get(key)
            if prior:
                if prior['fingerprint']!=digest:raise PluginError(409,'Request ID belongs to different input')
                if prior['status']=='completed':return copy.deepcopy(prior['result'])
                raise PluginError(409,'This AI request already started. Its outcome is '+prior['status']+'; do not replay it automatically.')
            context.check(state)
            revision=state['settings'].get('config',{}).get('revision',0)
            state['receipts'][key]={'fingerprint':digest,'status':'running','settings_revision':revision,'created_at':now()}
            return None
        replay=self.repository.transact(owner,'todo',reserve)
        if replay is not None:return replay
        schema=AI_SCHEMAS['project_steps' if action=='project' and source.get('mode')=='steps' else action]
        usage={};agent_execution=None
        try:
            result=self.provider('todo_'+action,{'task_request':source,**context.payload()},schema)
            if not isinstance(result,dict):raise PluginError(502,'The provider returned an incomplete suggestion')
            result=copy.deepcopy(result)
            usage=result.pop('_usage',{})
            agent_execution=result.pop('_agent_execution',None)
            from jsonschema import Draft202012Validator
            if list(Draft202012Validator(schema).iter_errors(result)):
                raise PluginError(502,'The provider returned an incomplete suggestion. Saved tasks are unchanged.')
            fingerprint(result)
            def settle(state):
                receipt=state['receipts'][key]
                if not state['settings'].get('config',{}).get('enabled',True) or state['settings'].get('config',{}).get('revision',0)!=receipt['settings_revision']:
                    state['receipts'][key]={**receipt,'status':'revoked','usage':usage,'agent_execution':agent_execution}
                    return None
                context.check(state)
                state['receipts'][key]={**receipt,'status':'completed','result':result,'usage':usage,'agent_execution':agent_execution,'completed_at':now()}
                return result
            accepted=self.repository.transact(owner,'todo',settle)
            if accepted is None:raise PluginError(409,'Todo permissions changed during the request. The suggestion was not applied.')
            return accepted
        except Exception as error:
            if agent_execution is None:
                agent_execution=copy.deepcopy(getattr(error,'execution',None))
            if isinstance(agent_execution,dict):
                agent_execution={**agent_execution,'domain_validated':False}
            def failed(state):
                receipt=state['receipts'].get(key)
                if receipt and receipt['status']=='running':state['receipts'][key]={**receipt,'status':'uncertain' if getattr(error,'uncertain',False) else 'failed','usage':getattr(error,'usage',usage),'agent_execution':agent_execution,'completed_at':now()}
            self.repository.transact(owner,'todo',failed)
            if getattr(error,'uncertain',False):
                raise PluginError(502,'The provider outcome is uncertain. A new Generate action starts a separate request and may incur another charge; saved tasks are unchanged.') from error
            raise


def validate_preferences(value):
    import re
    if not isinstance(value,dict) or set(value)-{'machines','planningPreferences'}:raise PluginError(422,'Unsupported planning preferences')
    machines=value.get('machines',[])
    if not isinstance(machines,list) or len(machines)>40:raise PluginError(422,'Use at most 40 scheduling machines')
    names=set()
    for machine in machines:
        if not isinstance(machine,dict) or set(machine)-{'name','type','specs','capabilities'} or machine.get('type') not in ('server','workstation') or not isinstance(machine.get('name'),str) or not 1<=len(machine['name'].strip())<=100 or machine['name'] in names:raise PluginError(422,'Machines need unique names and a valid type')
        names.add(machine['name'])
        if not isinstance(machine.get('specs',''),str) or len(machine.get('specs',''))>2000 or not isinstance(machine.get('capabilities',[]),list) or len(machine.get('capabilities',[]))>100 or any(not isinstance(c,str) or len(c)>200 for c in machine.get('capabilities',[])):raise PluginError(422,'Invalid machine details')
    preferences=value.get('planningPreferences',{})
    if not isinstance(preferences,dict) or set(preferences)-{'start','end','machines'}:raise PluginError(422,'Unsupported day-planning preferences')
    for field in ('start','end'):
        if field in preferences and (not isinstance(preferences[field],str) or not re.fullmatch(r'([01]\d|2[0-3]):[0-5]\d',preferences[field])):raise PluginError(422,'Choose valid available times')
    if 'machines' in preferences and (not isinstance(preferences['machines'],list) or len(preferences['machines'])>40 or any(not isinstance(name,str) or len(name)>100 for name in preferences['machines'])):raise PluginError(422,'Invalid selected machine list')
    return {'machines':copy.deepcopy(machines),'planningPreferences':copy.deepcopy(preferences)}


def prepare_backup(value):
    """Read source exports and optional localStorage data, never supplied file paths."""
    from .imports import convert_import, _mapped, mapped_todo_task
    if not isinstance(value,dict):raise PluginError(422,'Expected a Todo archive object')
    if value.get('format')=='diane-todo-port-backup':
        if value.get('version')!=1:raise PluginError(422,'Unsupported Todo backup version')
        archive=convert_import('todo',value.get('archive',{}))
        recoveries=copy.deepcopy(value.get('recoveries',[]))
        if not isinstance(recoveries,list) or len(recoveries)>40:raise PluginError(422,'Invalid recovery metadata')
        return {'archive':archive,'recoveries':recoveries,'preferences':validate_preferences(value.get('preferences',{})),'warnings':archive.get('warnings',[])}
    storage=value.get('localStorage')
    if storage is None and any(str(key).startswith('todo-sticky-') for key in value):storage=value
    if storage is None:
        return {'archive':convert_import('todo',value),'recoveries':[],'preferences':None,'warnings':[]}
    if not isinstance(storage,dict):raise PluginError(422,'Expected a localStorage backup object')
    def decode(item):
        if isinstance(item,str):
            try:return json.loads(item)
            except ValueError as error:raise PluginError(422,'A stored Todo field contains invalid JSON') from error
        return copy.deepcopy(item)
    namespace=value.get('source_id','default')
    archive={'format':'todo-sticky','version':1,'source_id':namespace,'dates':[], 'goals':{},'routine_schedules':{}}
    for section in value.get('dates',[]):
        if not isinstance(section,dict):raise PluginError(422,'Invalid dated task section')
        archive['dates'].append({'date':section.get('date'),'tasks':section.get('tasks',[])})
    journals=[]
    preferences={'machines':(value.get('settings') or {}).get('machines',[]),'planningPreferences':{}}
    for key,raw in storage.items():
        if key=='todo-sticky-goals-v1':archive['goals']=decode(raw)
        elif key.startswith('todo-sticky-routines-v1:'):
            schedules=decode(raw)
            if not isinstance(schedules,dict):raise PluginError(422,'Invalid routine schedule backup')
            for identifier,schedule in schedules.items():
                if identifier in archive['routine_schedules'] and archive['routine_schedules'][identifier]!=schedule:raise PluginError(409,'Choose one notebook backup when routine schedules differ')
                archive['routine_schedules'][identifier]=schedule
        elif key=='todo-sticky-planning-preferences-v1':preferences['planningPreferences']=decode(raw)
        elif key.startswith('todo-sticky-project-write-v1:'):
            journals.append(decode(raw))
    converted=convert_import('todo',archive)
    def mapped_task(task,day):
        flatten([task])
        result=copy.deepcopy(task);result['id']=mapped_todo_task(namespace,task['id'],day)
        if task.get('goalId'):result['goalId']=_mapped('todo-sticky',namespace,'goal',task['goalId'])
        result['subtasks']=[mapped_task(child,day) for child in task.get('subtasks',[])]
        return result
    def mapped_goal(goal):
        if not isinstance(goal,dict) or set(goal)-{'id','text','done','plan'} or not isinstance(goal.get('id'),str) or not isinstance(goal.get('text'),str):raise PluginError(422,'Invalid unfinished goal save')
        result=copy.deepcopy(goal);result['id']=_mapped('todo-sticky',namespace,'goal',goal['id']);return result
    recoveries=[]
    for journal in journals:
        if not isinstance(journal,dict) or set(journal)-{'folder','before','after','days'} or not isinstance(journal.get('days'),list):raise PluginError(422,'Invalid unfinished project operation')
        before,after=mapped_goal(journal.get('before')),mapped_goal(journal.get('after'))
        if before['id']!=after['id']:raise PluginError(422,'A project save must keep its identity')
        days=[]
        for day in journal['days']:
            valid_day(day.get('date'))
            days.append({'date':day['date'],'before':[mapped_task(t,day['date']) for t in day.get('before',[])],'after':[mapped_task(t,day['date']) for t in day.get('after',[])]})
        recoveries.append({'original':journal,'operation':{'folder':'','before':before,'after':after,'days':days}})
    return {'archive':converted,'recoveries':recoveries,'preferences':validate_preferences(preferences),'warnings':converted.get('warnings',[])+(['Unfinished project saves are retained for explicit review; they will not run on import.'] if recoveries else [])}


AI_SCHEMAS={
 'breakdown':{'type':'object','required':['subtasks'],'properties':{'finishSuggestion':{'type':'string'},'subtasks':{'type':'array','maxItems':8,'items':{'type':'object','required':['text'],'properties':{'text':{'type':'string'},'estimatedMinutes':{'type':'integer','minimum':1},'machineTask':{'type':'boolean'}},'additionalProperties':False}}},'additionalProperties':False},
 'schedule':{'type':'object','required':['plan','schedule'],'properties':{'plan':{'type':'string'},'schedule':{'type':'array','maxItems':100,'items':{'type':'object','required':['taskId','parentTask','time','endTime','action','assignedTo'],'properties':{name:{'type':'string'} for name in ('taskId','parentTask','time','endTime','action','assignedTo')},'additionalProperties':False}}},'additionalProperties':False},
 'project_steps':{'type':'object','required':['steps'],'properties':{'steps':{'type':'array','minItems':1,'maxItems':30,'items':{'type':'string','minLength':1,'maxLength':5000}}},'additionalProperties':False},
 'project':{'type':'object','required':['actions'],'properties':{'actions':{'type':'array','maxItems':30,'items':{'type':'object','required':['text','date','minutes'],'properties':{'text':{'type':'string'},'date':{'type':'string'},'minutes':{'type':'integer'},'stepId':{'type':'string'}},'additionalProperties':False}}},'additionalProperties':False},
 'albums':{'type':'object','required':['summary','albums'],'properties':{'summary':{'type':'string'},'albums':{'type':'array','maxItems':4,'items':{'type':'object','required':['title','artist','fit','bestFor'],'properties':{'title':{'type':'string'},'artist':{'type':'string'},'year':{'type':'integer'},'fit':{'type':'string'},'bestFor':{'type':'string'}},'additionalProperties':False}}},'additionalProperties':False}}


def build_router(plugins,auth,companion_service,provider=None):
    from .router import plugin_owner_dependency
    from .intelligence import ConfiguredPluginProvider
    router=APIRouter(prefix='/api/plugins/todo/compat',tags=['todo-compat'])
    owner=plugin_owner_dependency(auth,companion_service)
    adapter=TodoCompatService(plugins,provider or ConfiguredPluginProvider(getattr(companion_service,'analyzer',None)))
    @router.post('/{command}')
    def execute(command:str,body:Command,account=Depends(owner)):
        return adapter.run(account,command,body.payload,body.request_id)
    return router
