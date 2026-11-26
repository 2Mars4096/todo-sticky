"""Synthetic signed-in Dockit account and guarded assignment states, offline."""
import base64,datetime,gzip,hashlib,json,os
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
(Path(__file__).resolve().parents[2]/'output').mkdir(exist_ok=True)
import browser as b
def main():
 dist=b.ROOT/'dist';build=hashlib.sha256(next((dist/'assets').glob('index-*.js')).read_bytes()).hexdigest()[:16]
 origin='https://dockit.pipedreams.work';service='dear-diane-202610-api.web.app';uid='fixture-editor'
 fixed=datetime.datetime(2026,11,21,12,tzinfo=datetime.timezone.utc);now=int(fixed.timestamp())
 def enc(o):return base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
 token=enc({'alg':'RS256','typ':'JWT'})+'.'+enc({'sub':uid,'user_id':uid,'aud':'dear-diane-202610','iss':'https://securetoken.google.com/dear-diane-202610','iat':now,'exp':now+3600,'auth_time':now,'firebase':{'sign_in_provider':'custom'}})+'.fixture'
 gaps=[];total=0
 with sync_playwright()as pl,gzip.open(b.OUT/'personal-account.jsonl.gz','wt')as out:
  chrome=pl.chromium.launch(executable_path=b.CHROME)
  for tag in ('en','de'):
   labels={} if tag=='en' else json.loads((b.ROOT/'phone/assets/interface'/(tag+'.json')).read_text());t=lambda s:labels.get(s,s)
   for cycle in range(1,4):
    ctx=chrome.new_context(viewport={'width':320 if tag=='en' else 1100,'height':760},reduced_motion='reduce' if cycle==4 else 'no-preference')
    ctx.add_init_script("localStorage.setItem('pipedreams.displayLanguage',"+json.dumps(tag)+")")
    page=ctx.new_page();page.set_default_timeout(3800);page.clock.set_fixed_time(fixed)
    writes=[];members=[{'role':'editor','name':'A long shared project destination '+str(i),'id':'studio'+str(i)} for i in range(cycle-1)];pages={}
    def route(r):
     u=urlsplit(r.request.url);p=u.path;result=None;status=200
     if u.netloc=='dockit.pipedreams.work':
      if p=='/seed':return r.fulfill(body='<title>Fixture</title>',content_type='text/html')
      f=dist/(p.lstrip('/')or'index.html')
      if f.is_file():return r.fulfill(path=str(f))
     if u.netloc==service:
      if 'connected-apps/config'in p:result={'schemaVersion':1,'firebase':{'projectId':'dear-diane-202610','authDomain':'fixture.example.test','appId':'1:123:web:fixture','apiKey':'fixture-key'},'login':{'exchangePath':'/api/connected-apps/auth/exchange'}}
      elif p.endswith('/exchange'):result={'customToken':'fixture-only'}
      elif p.endswith('/workspaces'):result={'workspaces':members}
      elif '/shiprite/assignments'in p:
       if r.request.method=='POST':
        writes.append(r.request.post_data_json)
        if len(writes)==1:status=503;result={'detail':'Fixture transport interrupted'}
        else:result={'id':writes[-1]['id'],'workspaceId':'studio','state':'ready','revision':1}
       elif writes:result={'id':writes[-1]['id'],'workspaceId':'studio','state':'review','revision':3}
      if result is None:result={}
     elif u.netloc=='identitytoolkit.googleapis.com':
      if 'signInWithCustomToken' in p:result={'idToken':token,'refreshToken':'fixture','expiresIn':'3600','localId':uid}
      elif 'lookup' in p:result={'users':[{'localId':uid,'email':'editor@example.test'}]}
     if result is not None:return r.fulfill(status=status,json=result,headers={'Access-Control-Allow-Origin':'*'})
     return r.abort()
    ctx.route('**/*',route)
    def snap(k):b.capture(page,k,'.cloud-account',pages)
    try:
     b.seed_browser(page,origin)
     if cycle==2:
      page.evaluate('''()=>new Promise(resolve=>{const r=indexedDB.open('dockit-notebook-v1',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('days','readwrite'),store=tx.objectStore('days'),q=store.get('2026-11-21');q.onsuccess=()=>{const rows=q.result;rows[0].subtasks=[];store.put(rows,'2026-11-21')};tx.oncomplete=()=>{db.close();resolve()}}})''')
     page.goto(origin)
     page.locator('.sync-indicator').click();page.locator('.cloud-login-actions button').first.click();page.locator('.assignment-fields').wait_for(state='attached',timeout=12000)
     page.locator('.cloud-email').wait_for()
     sync=page.locator('.cloud-sync-controls button').bounding_box()
     assign=page.locator('.cloud-connection summary').filter(has_text=t('Assign in Shiprite')).bounding_box()
     assert sync['y'] < assign['y'], 'Personal sync must precede collaboration'
     snap('personal-account')
     page.get_by_text(t('Assign in Shiprite'),exact=True).click()
     page.get_by_role('button',name=t('Refresh workspaces'),exact=True).wait_for(state='visible')
     page.wait_for_function("!document.querySelector('.assignment-fields button:last-of-type')?.disabled")
     if not members:
      page.get_by_text(t('You need editor access to a workspace to assign tasks.'),exact=True).wait_for()
      assert page.locator('.assignment-fields select').count()==0
      page.evaluate("localStorage.setItem('dockit-workspace-v1:dear-diane-202610:fixture-editor','!invalid!')")
      page.get_by_text(t('Assign in Shiprite'),exact=True).click()
      page.get_by_text(t('Assign in Shiprite'),exact=True).click()
      page.get_by_role('button',name=t('Clear selection'),exact=True).click()
      assert page.evaluate("localStorage.getItem('dockit-workspace-v1:dear-diane-202610:fixture-editor')") is None
      snap('invalid-selection-recovered')
     else:
      select=page.locator('.assignment-fields select').first
      select.wait_for()
      assert select.input_value()==''
      select.select_option('studio0')
      if cycle==2:
       assert page.locator('.assignment-fields select').count()==1, 'The sole local task needs no chooser'
      else:page.locator('.assignment-fields select').nth(1).select_option(index=1)
      assert page.locator('.assignment-preview').is_visible()
      snap('explicit-shared-'+str(cycle-1))
      output=b.OUT/'personal-account';output.mkdir(parents=True,exist_ok=True)
      page.screenshot(path=str(output/(tag+'-selected-'+str(cycle-1)+'.png')))
      assert page.locator('.settings-panel').evaluate('(e)=>e.scrollWidth<=e.clientWidth')
      select.select_option('')
      assert page.locator('.assignment-actions').count()==0
      assert not writes
     snap('destinations-'+str(cycle-1))
     output=b.OUT/'personal-account';output.mkdir(parents=True,exist_ok=True)
     page.screenshot(path=str(output/(tag+'-'+str(cycle-1)+'.png')))
     assert page.locator('.settings-panel').evaluate('(e)=>e.scrollWidth<=e.clientWidth')
    except Exception as e:gaps.append([tag,cycle,list(pages)[-1] if pages else 'sign-in',str(e).splitlines()[0]])
    for state,rows in pages.items():
     total+=1
     for row in rows:out.write(json.dumps(['account-fixture',build,tag,cycle,state,row],ensure_ascii=False,separators=(',',':'))+'\n')
    out.flush();ctx.close()
  chrome.close()
 (b.OUT/'personal-account-gaps.json').write_text(json.dumps(gaps,ensure_ascii=False,indent=2));print(total,'signed-in renders;',len(gaps),'gaps',gaps[:3])
 assert not gaps, 'Personal account rendering failed'
if __name__=='__main__':main()
