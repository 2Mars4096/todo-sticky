import copy
import pytest
from fastapi import HTTPException
from diane.plugins.todo_document import parse,identify,patch,TodoDocuments
from diane.plugins.service import PluginService
from diane.plugins.store import SQLitePluginRepository

SOURCE='---\r\ntitle: Keep me\r\n---\r\nIntro **prose**\r\n## 2026-11-13\r\n- [~] First <!-- sticky-todo:id=a -->\r\n  - [?] Child <!-- sticky-todo:id=b -->\r\n\r\nParagraph remains.\r\n```md\r\n- [ ] Example\r\n```\r\n## 2026-11-14\r\n- [-] Last <!-- sticky-todo:id=c -->\r\n## Notes\r\n- untouched prose\r\n'

def test_lossless_parse_patch_status_frontmatter_fences():
    parsed=parse(SOURCE)
    assert [s['id'] for s in parsed['spans']]==['a','b','c']
    assert parsed['days']['2026-11-13'][0]['subtasks'][0]['status']=='question'
    assert identify(SOURCE)==SOURCE
    task=copy.deepcopy(parsed['spans'][0]['task']);task['text']='Edited'
    updated=patch(SOURCE,{'a':task})
    assert updated==SOURCE.replace('First','Edited')
    assert patch(updated,{})==updated

def test_missing_copy_and_metadata():
    content='## 2026-11-13\n- [ ] New\n'
    assert parse(content)['missing']==[2]
    assigned=identify(content);assert not parse(assigned)['missing']
    with pytest.raises(HTTPException):parse(SOURCE+ '\n## 2026-11-15\n- [ ] Copy <!-- sticky-todo:id=a -->')
    paragraph={'id':'a','text':'Paragraph\n## literal\n<!-- x -->','status':'done','subtasks':[], 'finish':{'doneWhen':'Enough'}}
    updated=patch(SOURCE,{'a':paragraph})
    assert parse(updated)['spans'][0]['task']['text']==paragraph['text']
    assert parse(updated)['spans'][0]['task']['finish']==paragraph['finish']

@pytest.fixture
def product(tmp_path): return PluginService(SQLitePluginRepository(str(tmp_path/'records.sqlite')))

def preview(service,content=SOURCE,document='a'*64):
    body=dict(content=content,document=document)
    result=service.operation('alice',body)
    return {**body,'expected':result['token']},result

def test_roundtrip_move_reorder_edit_delete_history_and_retry(product):
    service=TodoDocuments(product);body,review=preview(service)
    assert review['initial'];assert len(review['created'])==3
    result=service.operation('alice',body,True);ids=result['links']
    assert service.operation('alice',body,True)['applied']
    # Runtime/session metadata stays on the exact canonical record.
    def annotate(state): state['records']['task:'+ids['a']]['tags']=['existing-session']
    product.repository.transact('alice','todo',annotate)
    moved='---\ntitle: untouched\n---\n## 2026-11-14\n- [x] Edited <!-- sticky-todo:id=a -->\n  - [?] Child <!-- sticky-todo:id=b -->\nProse survives\n'
    body,_=preview(service,moved);result=service.operation('alice',body,True)
    assert result['links']['a']==ids['a']
    row=product.repository.read('alice','todo','records','task:'+ids['a'])
    assert row['tags']==['existing-session']
    assert row['extensions']['date']=='2026-11-14' and row['text']=='Edited'
    assert product.repository.read('alice','todo','records','task:'+ids['c'])['deleted']
    projected=service.sync.records('alice','',200,2)
    assert any(r.get('payload',{}).get('date')=='2026-11-14' for r in projected['records'])

def test_revision_owner_and_document_collisions(product):
    service=TodoDocuments(product);body,_=preview(service);service.operation('alice',body,True)
    stale,_=preview(service,SOURCE.replace('First','Stale'))
    latest,_=preview(service,SOURCE.replace('First','Latest'));service.operation('alice',latest,True)
    with pytest.raises(HTTPException):service.operation('alice',stale,True)
    with pytest.raises(HTTPException):preview(service,SOURCE,'b'*64)
    assert service.operation('bob',{'document':'a'*64,'content':SOURCE})['initial']

def test_existing_running_session_survives_move_and_delete_without_dispatch(product):
    from uuid import uuid4
    from diane.plugins.workflows import WorkflowService,WorkflowInput,DeliveryInput
    service=TodoDocuments(product);body,_=preview(service);result=service.operation('alice',body,True)
    task_id=result['links']['a']; workflows=WorkflowService(product)
    workflow=workflows.start('alice',WorkflowInput(request_id=uuid4(),task_id=task_id,expected_revision=1,project_id='project'),'mac')
    workflows.deliver('alice',workflow['workflow_id'],DeliveryInput(dispatch_id=workflow['dispatch_id'],status='running',session_id='session',run_id='run'),'mac')
    body,_=preview(service,SOURCE.replace('2026-11-13','2026-11-12'));service.operation('alice',body,True)
    body,_=preview(service,'## 2026-11-12\nNotes retained\n');service.operation('alice',body,True)
    stored=workflows.get('alice',workflow['workflow_id'])
    assert stored['task_id']==task_id and stored['session_id']=='session' and stored['state']=='running'

def test_reorder_copy_and_unchanged_reconcile_are_idempotent(product):
    service=TodoDocuments(product);body,_=preview(service);first=service.operation('alice',body,True)
    copied=identify(SOURCE.replace('Paragraph remains.','- [ ] Copied\r\nParagraph remains.'))
    body,projection=preview(service,copied);assert len(projection['created'])==1
    service.operation('alice',body,True)
    before=product.repository.read('alice','todo','records','task:'+first['links']['a'])['revision']
    body,_=preview(service,copied);service.operation('alice',body,True)
    assert product.repository.read('alice','todo','records','task:'+first['links']['a'])['revision']==before

def test_multiline_preview_drift_is_explicit_not_silently_overwritten():
    from diane.plugins.todo_document import task_line
    source='## 2026-11-13\n'+task_line({'id':'a','text':'Original\nDetails','status':'todo','subtasks':[]},0)+'\n'
    with pytest.raises(HTTPException,match='Task preview differs'):
        parse(source.replace('] Original','] Edited'))
