"""Replay Dockit's local UI without network or real accounts. PYTHONPATH must provide Playwright."""
import argparse, concurrent.futures, datetime, gzip, hashlib, json, os, re, subprocess
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[2]; OUT=ROOT/'output/interface-five'; OUT.mkdir(exist_ok=True)
TAGS=('en','zh-Hans','zh-Hant','yue','ja','ko','fr','de','es','pt')
EXTRACT='scope=>{'+(Path(__file__).with_name('dom-elements.js')).read_text()+'}'
CHROME=os.environ.get('CHROME_EXECUTABLE','/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
DATE='2026-11-21'
def capture(page,state,scope,rows):
 page.evaluate("""async()=>{await Promise.race([Promise.allSettled(document.getAnimations().filter(a=>a.effect && a.effect.getComputedTiming().endTime<=550).map(a=>a.finished)),new Promise(ok=>setTimeout(ok,550))]);await new Promise(ok=>requestAnimationFrame(()=>requestAnimationFrame(ok)))}""")
 found=page.evaluate(EXTRACT,scope)
 if not found:raise ValueError('No rendered UI in '+scope)
 rows[state]=found
def notebook(page,tag,rows,wrappers):
 t=lambda k:wrappers.get(k,k)
 btn=lambda name:page.get_by_role('button',name=t(name),exact=True).first
 snap=lambda state,scope='body':capture(page,state,scope,rows)
 page.locator('#quick-add-task').wait_for()
 snap('notebook')
 page.locator('.date-title').click();snap('calendar','.calendar-popup');page.keyboard.press('Escape')
 control=page.locator('.task-steps-toggle').first
 if control.count() and control.is_visible():
  control.click();snap('task-tree')
  item=page.locator('.task-text[role="button"]').first
  if item.count():item.dblclick();snap('editing-task');page.keyboard.press('Escape')
 trigger=page.locator('pipedreams-app-menu .pd-switch')
 trigger.click();snap('app-switcher','pipedreams-app-menu dialog');page.keyboard.press('Escape')
 for idx,state in [(0,'search'),(1,'progress')]:
  page.locator('.workflow-entry').nth(idx).click();page.locator('.archive-page').wait_for();snap(state,'.archive-page')
  if state=='search':
   page.locator('.archive-page input[type=search]').fill('synthetic nothing found');snap('search-no-results','.archive-page')
  page.locator('.archive-heading button').first.click()
 page.locator('button.gear').click();panel=page.locator('.settings-panel');panel.wait_for()
 for i in range(panel.locator('nav button').count()):
  tab=panel.locator('nav button').nth(i);tab.click()
  snap('settings-tab-'+str(i),'.settings-panel')
  for j in range(min(3,panel.locator('details').count())):
   detail=panel.locator('details').nth(j)
   if not detail.is_visible():continue
   detail.locator('summary').first.click();snap(f'settings-tab-{i}-details-{j}','.settings-panel')
 page.keyboard.press('Escape')
 if panel.count() and panel.is_visible():panel.locator('button').first.click()
 goals=page.locator('.compact-goals-entry')
 if goals.count() and goals.is_visible():goals.click();snap('goals','#goals-panel');page.keyboard.press('Escape')
 else:
  openGoals=page.locator('#goals-panel .sidebar-toggle')
  if openGoals.count() and openGoals.is_visible():openGoals.click();snap('goals','#goals-panel');openGoals.click()
 plan=page.locator('button[title]').filter(has_text=t('Plan')).last
 plan=page.locator('button[title]').and_(page.get_by_role('button',name=t('Plan'),exact=True)).last
 if plan.count() and plan.is_visible() and plan.is_enabled():
  plan.click();snap('day-plan','.day-plan-overlay');page.keyboard.press('Escape')
 focus=page.locator('.compact-focus-entry')
 if not (focus.count() and focus.is_visible()):focus=page.locator('.mission-mini-open')
 if focus.count() and focus.is_visible():focus.click();snap('focus','.tracking-overlay');page.keyboard.press('Escape')
def seed_browser(page,origin):
 page.goto(origin+'/seed')
 page.evaluate("""day=>new Promise(ok=>{const r=indexedDB.open('dockit-notebook-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('days');r.onsuccess=()=>{const db=r.result,tx=db.transaction('days','readwrite');tx.objectStore('days').put([{id:'review-parent',text:'Fixture note · 草稿',status:'todo',subtasks:[{id:'review-step',text:'Fixture step',status:'todo',subtasks:[]}]}],day);tx.oncomplete=()=>{db.close();ok()}}})""",DATE)
def run(profile,cycles):
 origin='https://dockit.example.test';dist=ROOT/'dist'
 build=hashlib.sha256(next((dist/'assets').glob('index-*.js')).read_bytes()).hexdigest()
 if profile=='embedded': build=hashlib.sha256((OUT/'embedded/index.js').read_bytes()).hexdigest()
 if profile=='signin': build=hashlib.sha256((ROOT/'backend/signin.js').read_bytes()).hexdigest()
 seed=subprocess.check_output(['node','-p',"require('./tests/helpers/browser-fixture.cjs').seedBridge.toString()"],cwd=ROOT,text=True) if profile=='mac-shared' else ''
 w={'web-compact':340,'web-wide':1100,'mac-shared':460,'embedded':480,'signin':400}[profile]
 results=[];gaps=[];states=0
 with sync_playwright() as pl:
  b=pl.chromium.launch(executable_path=CHROME)
  for tag in TAGS:
   cat={} if tag=='en' else json.loads((ROOT/'phone/assets/interface'/(tag+'.json')).read_text())
   for cycle in range(1,cycles+1):
    checkpoint=OUT/'cycles'/profile/(tag+'-'+str(cycle)+'.json.gz')
    if checkpoint.is_file():
     try:
      with gzip.open(checkpoint,'rt')as f:cached=json.load(f)
      if cached['build']==build[:16] and not cached['gaps'] and (profile!='signin' or 'cancelled' in cached['states']):
       for state,items in cached['states'].items():
        states+=1
        for item in items:results.append([profile,build[:16],tag,cycle,state,item])
       continue
     except (ValueError,OSError,EOFError):pass
    ctx=b.new_context(viewport={'width':w,'height':760},locale=tag if tag!='yue' else 'zh-HK',reduced_motion='reduce' if cycle==4 else 'no-preference',has_touch=profile=='web-compact')
    ctx.add_init_script("localStorage.setItem('pipedreams.displayLanguage',"+json.dumps(tag)+");document.documentElement && (document.documentElement.lang="+json.dumps(tag)+")")
    if seed:ctx.add_init_script('('+seed+')()')
    page=ctx.new_page();page.set_default_timeout(8000 if profile=="embedded" else 3500);page.clock.set_fixed_time(datetime.datetime(2026,11,21,12,tzinfo=datetime.timezone.utc));pages={};signin_reject=[False]
    def route(req):
     u=urlsplit(req.request.url)
     if u.hostname!='dockit.example.test':return req.abort()
     if u.path=='/seed':return req.fulfill(body='<title>Fixture</title>',content_type='text/html')
     if profile=='signin':
      if u.path in ('/','/signin'):return req.fulfill(path=str(ROOT/'backend/signin.html'),content_type='text/html')
      if u.path=='/signin.js':return req.fulfill(body=(ROOT/'backend/signin.js').read_text().replace("from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js'","from '/fixture-firebase.js'").replace("from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js'","from '/fixture-firebase.js'"),content_type='text/javascript')
      if u.path=='/fixture-firebase.js':return req.fulfill(body="export const initializeApp=()=>({}),getAuth=()=>({}),inMemoryPersistence={},setPersistence=async()=>{},signOut=async()=>{};export class GoogleAuthProvider{setCustomParameters(){}};export async function signInWithPopup(){if(window.__dockitCancel)throw Object.assign(new Error('fixture canceled'),{code:'auth/popup-closed-by-user'});return {user:{getIdToken:async()=>'synthetic'}}}",content_type='text/javascript')
      if u.path=='/v1/config':return req.fulfill(json={'firebase':{}})
      if u.path=='/v1/auth/complete':return req.fulfill(status=503 if signin_reject[0] else 200,json={} if signin_reject[0] else {'ok':True})
      if u.path=='/signin-interface.js':return req.fulfill(path=str(ROOT/'backend/signin-interface.js'),content_type='text/javascript')
      return req.abort()
     folder=OUT/'embedded' if profile=='embedded' else dist
     f=folder/(u.path.lstrip('/') or 'index.html')
     if f.is_file():return req.fulfill(path=str(f))
     return req.abort()
    page.route('**/*',route)
    try:
     if profile=='signin':
      page.goto(origin+'/signin#language='+tag+'&sessionId='+'a'*43+'&challenge='+'b'*43);page.wait_for_function("document.documentElement.lang==="+json.dumps(tag))
      capture(page,'account-confirmation','main',pages)
      page.evaluate('window.__dockitCancel=true');page.locator('#signin').click();page.wait_for_function('document.querySelector("#error").textContent.length>0');capture(page,'cancelled','main',pages)
      page.evaluate('window.__dockitCancel=false');signin_reject[0]=True;page.locator('#signin').click();page.wait_for_function('document.querySelector("#error").textContent.length>0');capture(page,'connection-retry','main',pages);signin_reject[0]=False;page.locator('#signin').click();page.wait_for_function('document.querySelector("#signin").hidden');capture(page,'confirmed','main',pages)
      page.goto(origin+'/signin#language='+tag);page.wait_for_function('document.querySelector("#signin").disabled');capture(page,'invalid-link','main',pages)
     elif profile=='embedded':
      for state in ['panel','panel-task','settings-machines','settings-backups','document-choose','document-loaded','document-pending','document-unavailable','task-editor','task-execution','disconnected']:
       try:
        page.goto(origin+'/?state='+state+'&language='+tag);page.wait_for_selector('#review-ready');page.wait_for_timeout(90)
        if state.startswith('settings-'):
         page.locator('.todo-settings-panel > summary').click()
         if state.endswith('backups'):page.locator('.todo-settings-nav button').nth(1).click()
        if state in ('document-loaded','document-pending'):
         page.locator('#review-ready select').select_option('weekly/fixture.md')
         page.wait_for_timeout(50)
        if state=='panel-task':page.locator('.task-steps-toggle').first.click()
        capture(page,state,'#review-ready',pages)
       except Exception as e:gaps.append([tag,cycle,state,str(e).splitlines()[0]])
     else:
      if profile!='mac-shared':
       page.goto(origin+'/');page.locator('#quick-add-task').wait_for();capture(page,'empty-notebook','body',pages)
       seed_browser(page,origin)
      page.goto(origin+'/');notebook(page,tag,pages,cat)
    except Exception as e:gaps.append([tag,cycle,list(pages)[-1] if pages else 'startup',str(e).splitlines()[0]])
    for state,items in pages.items():
     states+=1
     for item in items:results.append([profile,build[:16],tag,cycle,state,item])
    part=OUT/'cycles'/profile;part.mkdir(parents=True,exist_ok=True)
    with gzip.open(part/(tag+'-'+str(cycle)+'.json.gz'),'wt') as f:
     json.dump({'states':pages,'build':build[:16],'gaps':[g for g in gaps if g[0]==tag and g[1]==cycle]},f,ensure_ascii=False,separators=(',',':'))
    ctx.close()
  b.close()
 with gzip.open(OUT/(profile+'.jsonl.gz'),'wt',encoding='utf8') as f:
  for row in results:f.write(json.dumps(row,ensure_ascii=False,separators=(',',':'))+'\n')
 (OUT/(profile+'-gaps.json')).write_text(json.dumps(gaps,ensure_ascii=False,indent=2))
 print(profile,'state renders',states,'rows',len(results),'gaps',len(gaps),gaps[:2],flush=True)
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('profiles',nargs='+');parser.add_argument('--cycles',type=int,default=5);a=parser.parse_args()
 with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
  list(pool.map(lambda name:run(name,a.cycles),a.profiles))
