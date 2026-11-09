import copy
import json
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from diane.plugins.service import PluginService, editable
from diane.plugins.store import SQLitePluginRepository
from diane.plugins.todo_sync import CanonicalTodoSync, META, build_sync_router
from diane.plugins.todo_sync_protocol import Mutation

DAY='2026-11-09'
def task(identifier='a',text='Task A',children=None,**extra):return {'id':identifier,'text':text,'status':'todo','subtasks':children or [],**extra}
def mutation(payload=None,revision=0,mid='mutation-0000000001',deleted=False,schema=2):return Mutation(expectedRevision=revision,mutationId=mid,deleted=deleted,payload=payload,schemaVersion=schema)
def day(tasks=None):return {'date':DAY,'tasks':[task()] if tasks is None else tasks}
def conflict(value):assert value.status_code==409;return json.loads(value.body)
@pytest.fixture
def host(tmp_path):return PluginService(SQLitePluginRepository(str(tmp_path/'todo.sqlite')))
@pytest.fixture
def sync(host):return CanonicalTodoSync(host)
def current(sync,owner='alice',key='day:'+DAY,schema=2):return next(r for r in sync.records(owner,schema_version=schema)['records'] if r['key']==key)

def test_writes_canonical_records_and_reads_plugin_edits(sync,host):
    saved=sync.mutate('alice','day:'+DAY,mutation(day([task(children=[task('step','Read source')])])) )
    assert saved['revision']==1
    records=host.list_records('alice','todo')['items'];assert len(records)==2
    parent=next(r for r in records if r['text']=='Task A')
    content=editable(parent);content['text']='Changed in Diane';content['extensions']['priority']='high'
    host.put_record('alice','todo','task',parent['record_id'],{'request_id':'plugin-change','expected_revision':parent['revision'],'record':content})
    live=current(sync);assert live['revision']==2 and live['payload']['tasks'][0]['text']=='Changed in Diane'
    stale=sync.mutate('alice','day:'+DAY,mutation(day(),revision=1,mid='mutation-0000000002'))
    assert conflict(stale)['current']['revision']==2
    new=copy.deepcopy(live['payload']);new['tasks'][0]['text']='Changed on phone'
    sync.mutate('alice','day:'+DAY,mutation(new,revision=2,mid='mutation-0000000003'))
    assert host.get_record('alice','todo','task',parent['record_id'])['extensions']['priority']=='high'
    assert sync.records('bob')['records']==[]

def test_retries_are_idempotent_and_never_reapply_after_newer_changes(sync,host):
    request=mutation(day());one=sync.mutate('alice','day:'+DAY,request)
    assert sync.mutate('alice','day:'+DAY,request)==one
    with pytest.raises(HTTPException):sync.mutate('alice','day:'+DAY,mutation(day([task(text='different')]),mid=request.mutationId))
    record=host.list_records('alice','todo')['items'][0]
    content=editable(record);content['text']='Another device'
    host.put_record('alice','todo','task',record['record_id'],{'request_id':'other','expected_revision':record['revision'],'record':content})
    assert conflict(sync.mutate('alice','day:'+DAY,request))['alreadyApplied'] is True
    assert current(sync)['payload']['tasks'][0]['text']=='Another device'

def test_legacy_clients_preserve_goal_plans_and_links(sync,host):
    goals={'targets':[{'id':'goal','text':'Outcome','done':False,'plan':[{'id':'g1','text':'Check'}]}],'recurring':[]}
    sync.mutate('alice','goals',mutation(goals))
    sync.mutate('alice','day:'+DAY,mutation(day([task(goalId='goal',goalStepId='g1')]),mid='mutation-0000000002'))
    old=current(sync,schema=1);assert 'goalId' not in old['payload']['tasks'][0]
    old['payload']['tasks'][0]['text']='Edited by v1'
    sync.mutate('alice','day:'+DAY,mutation(old['payload'],revision=old['revision'],mid='mutation-0000000003',schema=1))
    assert current(sync)['payload']['tasks'][0]['goalId']=='goal'
    old_goals=current(sync,key='goals',schema=1);old_goals['payload']['targets'][0]['text']='Changed title'
    sync.mutate('alice','goals',mutation(old_goals['payload'],revision=old_goals['revision'],mid='mutation-0000000004',schema=1))
    assert current(sync,key='goals')['payload']['targets'][0]['plan']==goals['targets'][0]['plan']
    canonical_task=host.list_records('alice','todo',record_type='task')['items'][0]
    canonical_goal=host.list_records('alice','todo',record_type='goal')['items'][0]
    assert canonical_task['extensions']['goal_id']==canonical_goal['record_id']

def test_same_original_id_on_multiple_dates_is_not_flattened(sync,host):
    sync.mutate('alice','day:'+DAY,mutation(day()))
    nextday='2026-11-10';sync.mutate('alice','day:'+nextday,mutation({'date':nextday,'tasks':[task()]},mid='mutation-0000000002'))
    records=host.list_records('alice','todo',record_type='task')['items']
    assert len({r['record_id'] for r in records})==2
    assert {r['extensions']['source']['id'] for r in records}=={'a'}
    rows=sync.records('alice')['records'];assert rows[0]['payload']['tasks'][0]['id']==rows[1]['payload']['tasks'][0]['id']=='a'

def test_empty_dates_tombstones_and_goal_order_roundtrip(sync):
    assert sync.records('alice')['records']==[]
    empty=sync.mutate('alice','day:'+DAY,mutation(day([])));assert empty['payload']['tasks']==[] and not empty['deleted']
    deleted=sync.mutate('alice','day:'+DAY,mutation(revision=1,deleted=True,mid='mutation-0000000002'));assert deleted['deleted'] and deleted['payload'] is None
    payload={'targets':[{'id':'z','text':'First','done':False},{'id':'a','text':'Second','done':True}],'recurring':[]}
    assert sync.mutate('alice','goals',mutation(payload,mid='mutation-0000000003'))['payload']==payload

def test_finish_empty_shape_and_hidden_metadata_are_preserved(sync):
    payload=day([task(finish={'by':'','originalBy':'','doneWhen':''}),task('b','Other',finish={})])
    assert sync.mutate('alice','day:'+DAY,mutation(payload))['payload']==payload
    assert current(sync)['payload']==payload

def test_focus_history_uses_canonical_focus_records(sync,host):
    payload={'id':'focus_a','taskId':'a','taskText':'Read paper','durationMinutes':25,'completedAt':1794210000000,'vehicleCode':'v1','orbitIndex':2,'orbitLabel':'Moon'}
    assert sync.mutate('alice','focus:focus_a',mutation(payload))['payload']==payload
    stored=host.list_records('alice','todo',record_type='focus_session')['items'][0]
    assert stored['status']=='completed' and stored['extensions']['duration_minutes']==25

def test_pagination_and_metadata_do_not_duplicate_live_payloads(sync,host):
    for index in range(3):
        value='2026-11-'+str(9+index).zfill(2)
        sync.mutate('alice','day:'+value,mutation({'date':value,'tasks':[task()]},mid='mutation-00000000'+str(index).zfill(2)))
    first=sync.records('alice',limit=1);assert len(first['records'])==1
    second=sync.records('alice',after=first['nextCursor'],limit=2);assert len(second['records'])==2 and second['nextCursor'] is None
    def inspect(state):
        assert all('payload' not in value for key,value in state['settings'].items() if key.startswith(META))
        assert all('payload' not in value for key,value in state['receipts'].items() if key.startswith('standalone-write:'))
    host.repository.transact('alice','todo',inspect)

def test_seed_preserves_old_revisions_and_is_idempotent_after_plugin_edits(sync,host):
    original={'key':'day:'+DAY,'revision':73,'payload':day(),'deleted':False,'updatedAt':'2026-10-31T10:00:00Z','mutationId':'old-mutation-0000001'}
    report=sync.seed_records('alice',[original],source_id='sticky-todo-personal-migration-2026')
    assert report['records'][0]['status']=='seeded'
    assert current(sync)==original
    record=host.list_records('alice','todo',record_type='task')['items'][0]
    assert record['extensions']['source']['namespace']=='sticky-todo-personal-migration-2026'
    content=editable(record);content['text']='New work after migration'
    host.put_record('alice','todo','task',record['record_id'],{'request_id':'new-work','expected_revision':record['revision'],'record':content})
    assert current(sync)['revision']==74
    assert sync.seed_records('alice',[original],source_id='sticky-todo-personal-migration-2026')['records'][0]['status']=='already_seeded'
    assert current(sync)['payload']['tasks'][0]['text']=='New work after migration'

def test_seed_matches_preimported_namespace_and_refuses_divergence(sync,host):
    from diane.plugins.imports import convert_import
    namespace='sticky-todo-personal-migration-2026'
    archive=convert_import('todo',{'format':'todo-sticky','version':1,'source_id':namespace,'dates':[{'date':DAY,'tasks':[task()]}]})
    host.import_records('alice','todo',{'request_id':'import','dry_run':False,'archive':archive})
    before=host.list_records('alice','todo')['items'][0]
    legacy={'key':'day:'+DAY,'revision':4,'payload':day(),'deleted':False,'updatedAt':'then','mutationId':'source-mutation-0001'}
    sync.seed_records('alice',[legacy],source_id=namespace)
    after=host.list_records('alice','todo')['items'][0]
    assert before==after and current(sync)['revision']==4
    other=copy.deepcopy(legacy);other['payload']['tasks'][0]['text']='Different original'
    with pytest.raises(HTTPException):sync.seed_records('alice',[other],source_id=namespace)

def test_atomic_write_limit_never_partially_changes_a_day(sync,host):
    bounded=CanonicalTodoSync(host,max_changes=1)
    with pytest.raises(HTTPException) as error:bounded.mutate('alice','day:'+DAY,mutation(day([task(),task('b')])))
    assert error.value.status_code==413 and sync.records('alice')['records']==[]

def test_router_keeps_old_paths_and_owner_guard(host):
    class Auth:
        def user(self,authorization):
            if not authorization or not authorization.startswith('Bearer '):raise HTTPException(401,'Sign in')
            return authorization[7:]
    app=FastAPI();app.include_router(build_sync_router(host,Auth(),object()))
    with TestClient(app) as client:
        assert client.get('/v1/sync').status_code==401
        saved=client.put('/v1/sync/day:'+DAY,headers={'Authorization':'Bearer alice'},json=mutation(day()).model_dump())
        assert saved.status_code==200,saved.text
        assert saved.headers['cache-control']=='no-store'
        assert client.get('/v1/sync?schemaVersion=2',headers={'Authorization':'Bearer alice'}).json()['records'][0]['payload']==day()
        assert client.get('/v1/sync',headers={'Authorization':'Bearer bob'}).json()['records']==[]
        stale=client.put('/v1/sync/day:'+DAY,headers={'Authorization':'Bearer alice'},json=mutation(day(),mid='other-mutation-001').model_dump())
        assert stale.status_code==409 and 'current' in stale.json()

def test_goal_reassignment_updates_canonical_link_but_keeps_other_provenance(sync,host):
    sync.mutate('alice','goals',mutation({'targets':[{'id':'old','text':'Old','done':False},{'id':'new','text':'New','done':False}],'recurring':[]}))
    sync.mutate('alice','day:'+DAY,mutation(day([task(goalId='old')]),mid='mutation-create-001'))
    value=current(sync);value['payload']['tasks'][0]['goalId']='new'
    sync.mutate('alice','day:'+DAY,mutation(value['payload'],revision=value['revision'],mid='mutation-change-001'))
    record=host.list_records('alice','todo',record_type='task')['items'][0]
    links=[r for r in record['relationships'] if r['kind']=='belongs-to']
    assert len(links)==1 and links[0]['target']['record_id']==record['extensions']['goal_id']

def test_unreachable_cycle_refuses_read_without_returning_an_empty_destructive_snapshot(sync,host):
    sync.mutate('alice','day:'+DAY,mutation(day([task('a'),task('b')])))
    def corrupt(state):
        rows=[r for r in state['records'].values() if r['record_type']=='task']
        for row,other in [(rows[0],rows[1]),(rows[1],rows[0])]:
            row['relationships']=[{'kind':'parent','target':{'plugin_id':'todo','record_type':'task','record_id':other['record_id']}}]
            state['records']['task:'+row['record_id']]=row
    host.repository.transact('alice','todo',corrupt)
    with pytest.raises(HTTPException,match='cycle'):sync.records('alice')
    assert len(host.list_records('alice','todo',record_type='task')['items'])==2

def test_derived_goal_link_repair_pins_revision_and_preserves_sync_revision(sync,host):
    sync.mutate('alice','goals',mutation({'targets':[{'id':'goal','text':'Project','done':False}],'recurring':[]}))
    sync.mutate('alice','day:'+DAY,mutation(day([task(goalId='goal')]),mid='mutation-create-001'))
    record=host.list_records('alice','todo',record_type='task')['items'][0]
    content=editable(record);content['relationships']=[]
    host.put_record('alice','todo','task',record['record_id'],{'request_id':'simulate-first-seed','expected_revision':record['revision'],'record':content})
    before=current(sync);canonical_before=host.get_record('alice','todo','task',record['record_id'])
    candidate=sync.reconcile_goal_links('alice')['candidates'];assert len(candidate)==1
    report=sync.reconcile_goal_links('alice',dry_run=False,expected=candidate);assert report['changed']==[record['record_id']]
    after=host.get_record('alice','todo','task',record['record_id'])
    assert after['revision']==canonical_before['revision']+1 and after['text']==canonical_before['text'] and after['status']==canonical_before['status']
    assert current(sync)==before
    assert sync.reconcile_goal_links('alice')['candidates']==[]
    assert sync.reconcile_goal_links('alice',dry_run=False,expected=candidate)['conflicts']==[record['record_id']]
