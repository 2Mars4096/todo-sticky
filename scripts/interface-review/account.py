"""Synthetic signed-in Dockit account and guarded assignment states, offline."""
import base64,datetime,gzip,hashlib,json,os
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
import browser as b
def main():
 dist=b.ROOT/'dist';build=hashlib.sha256(next((dist/'assets').glob('index-*.js')).read_bytes()).hexdigest()[:16]
 origin='https://dockit.pipedreams.work';service='dear-diane-202610-api.web.app';uid='fixture-editor'
 fixed=datetime.datetime(2026,11,21,12,tzinfo=datetime.timezone.utc);now=int(fixed.timestamp())
 def enc(o):return base64.urlsafe_b64encode(json.dumps(o).encode()).decode().rstrip('=')
 token=enc({'alg':'RS256','typ':'JWT'})+'.'+enc({'sub':uid,'user_id':uid,'aud':'dear-diane-202610','iss':'https://securetoken.google.com/dear-diane-202610','iat':now,'exp':now+3600,'auth_time':now,'firebase':{'sign_in_provider':'custom'}})+'.fixture'
 gaps=[];total=0
 with sync_playwright()as pl,gzip.open(b.OUT/'account-fixture.jsonl.gz','wt')as out:
  chrome=pl.chromium.launch(executable_path=b.CHROME)
  for tag in b.TAGS:
   labels={} if tag=='en' else json.loads((b.ROOT/'phone/assets/interface'/(tag+'.json')).read_text());t=lambda s:labels.get(s,s)
   for cycle in range(1,6):
    ctx=chrome.new_context(viewport={'width':460,'height':720},reduced_motion='reduce' if cycle==4 else 'no-preference')
    ctx.add_init_script("localStorage.setItem('pipedreams.displayLanguage',"+json.dumps(tag)+")")
    page=ctx.new_page();page.set_default_timeout(3800);page.clock.set_fixed_time(fixed)
    writes=[];members=[{'role':'editor','name':'Fixture workspace','id':'studio'}];pages={}
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
     b.seed_browser(page,origin);page.goto(origin)
     page.locator('.sync-indicator').click();page.locator('.cloud-login-actions button').first.click();page.locator('.assignment-fields').wait_for(state='attached',timeout=12000)
     snap('signed-in');page.get_by_text(t('Workspace assignments'),exact=True).click()
     page.locator('.assignment-fields select').first.select_option('studio');snap('workspace-selected')
     page.locator('.assignment-fields select').nth(1).select_option(index=1);snap('task-preview')
     details=page.locator('.assignment-preview details summary');details.click();snap('included-steps')
     page.locator('.assignment-fields input').fill('fixture-member')
     submit=page.locator('.assignment-actions button').first;submit.click();page.get_by_text('Fixture transport interrupted').wait_for();snap('retry')
     submit.click();page.locator('.assignment-receipt').wait_for();snap('ready')
     page.locator('.assignment-actions button').nth(1).click();page.get_by_text(t('Awaiting review'),exact=True).wait_for();snap('awaiting-review')
     members.clear();page.get_by_role('button',name=t('Refresh workspaces'),exact=True).click();page.get_by_text(t('You need editor access to a workspace to assign tasks.'),exact=True).wait_for();snap('access-required')
     for i,state in [(0,'conflicts-empty'),(1,'recovery-empty')]:
      page.locator('.cloud-review-launchers button').nth(i).click();page.locator('.cloud-review').wait_for();snap(state);page.locator('.cloud-review-heading button').first.click()
    except Exception as e:gaps.append([tag,cycle,list(pages)[-1] if pages else 'sign-in',str(e).splitlines()[0]])
    for state,rows in pages.items():
     total+=1
     for row in rows:out.write(json.dumps(['account-fixture',build,tag,cycle,state,row],ensure_ascii=False,separators=(',',':'))+'\n')
    out.flush();ctx.close()
  chrome.close()
 (b.OUT/'account-fixture-gaps.json').write_text(json.dumps(gaps,ensure_ascii=False,indent=2));print(total,'signed-in renders;',len(gaps),'gaps',gaps[:3])
if __name__=='__main__':main()
