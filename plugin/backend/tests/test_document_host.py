"""Real host file coordinator + real product canonical adapter, synthetic KB only."""
import asyncio
from pathlib import Path
from types import SimpleNamespace
import pytest
from fastapi import HTTPException
from diane.plugins.service import PluginService
from diane.plugins.store import SQLitePluginRepository
from diane.plugins.todo_document import TodoDocuments
from diane.server.routers import todo_documents as files, plugins

@pytest.fixture
def fixture(tmp_path, monkeypatch):
    root=tmp_path/'kb'; path=root/'content/to-do/week/index.md';path.parent.mkdir(parents=True)
    path.write_bytes(b'---\r\ntitle: Keep\r\n---\r\n## 2026-11-13\r\n- [ ] Work <!-- sticky-todo:id=a -->\r\nProse\r\n')
    monkeypatch.setattr(files,'getenv',lambda name:'owner-alice' if name=='DIANE_TODO_KB_OWNER' else str(root))
    product=PluginService(SQLitePluginRepository(str(tmp_path/'records.sqlite'))); service=TodoDocuments(product)
    class Transport:
        binding='owner-alice'; fail=False; owner='alice'
        def assert_current(self): pass
        async def call(self,method,route,body):
            if self.fail and route.endswith('/commit'): raise HTTPException(503,'offline')
            return service.operation(self.owner,body,route.endswith('/commit'))
    monkeypatch.setattr(plugins,'HostedTransport',Transport)
    request=SimpleNamespace(app=SimpleNamespace(state=SimpleNamespace(chat_store=SimpleNamespace(base_dir=tmp_path/'state'))))
    return path,request,Transport,product

def run(awaitable): return asyncio.run(awaitable)
def read(request): return run(files.read({'path':'content/to-do/week/index.md'},request))
def write(snapshot,content): return {k:snapshot[k] for k in ('path','document','revision')} | {'content':content,'expected':snapshot['projection']['token']}

def test_full_file_record_file_roundtrip_and_partial_retry(fixture):
    path,request,transport,product=fixture
    snap=read(request);body=write(snap,snap['content'].replace('Work','Edited'))
    preview=run(files.preview(body,request));assert preview['content']==body['content']
    transport.fail=True
    with pytest.raises(HTTPException):run(files.save(body,request))
    assert path.read_bytes()==body['content'].encode()
    assert read(request)['pending']
    pending=run(files.recover(body,request));assert pending==body
    transport.fail=False
    result=run(files.save(pending,request));assert result['applied']
    assert not read(request)['pending']
    assert path.read_bytes().startswith(b'---\r\ntitle: Keep\r\n---')
    canonical=product.repository.read('alice','todo','records','task:'+result['links']['a'])
    # A canonical UI change returns as a task-span patch, preserving non-task bytes.
    def update(state): state['records']['task:'+canonical['record_id']]['text']='From record'
    product.repository.transact('alice','todo',update)
    snap=read(request);content=snap['projection']['canonicalContent']
    assert content==body['content'].replace('Edited','From record')
    run(files.save(write(snap,content),request))
    assert path.read_bytes()==content.encode()

def test_revision_root_owner_path_and_recovery_review(fixture,monkeypatch,tmp_path):
    path,request,transport,_=fixture
    snap=read(request);body=write(snap,snap['content'].replace('Work','Draft'))
    path.write_text('external')
    with pytest.raises(HTTPException):run(files.save(body,request))
    assert path.read_text()=='external'
    path.write_bytes(snap['content'].encode())
    transport.binding='different-owner'
    with pytest.raises(HTTPException):run(files.save(body,request))
    transport.binding='owner-alice'
    other=tmp_path/'other';other.mkdir();monkeypatch.setattr(files,'getenv',lambda name:'owner-alice' if name=='DIANE_TODO_KB_OWNER' else str(other))
    with pytest.raises(HTTPException):run(files.save(body,request))
    monkeypatch.setattr(files,'getenv',lambda name:'owner-alice' if name=='DIANE_TODO_KB_OWNER' else str(path.parents[3]))
    with pytest.raises(HTTPException):files.target('../secret.md')
    transport.fail=True
    with pytest.raises(HTTPException):run(files.save(body,request))
    fresh=read(request);run(files.review_again(fresh,request))
    assert not read(request)['pending']
    assert list((request.app.state.chat_store.base_dir/'todo-documents').glob('*.retained-*.json'))


def test_specific_routes_precede_proxy_and_catalog_is_owner_bound(fixture):
    _,_,transport,_=fixture
    routes=[r.path for r in plugins.router.routes]
    assert routes.index('/api/plugins/todo-documents/read') < routes.index('/api/plugins/{path:path}')
    transport.binding='bob'
    with pytest.raises(HTTPException):run(files.catalog())
