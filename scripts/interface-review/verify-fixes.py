"""Repeat the saved date, goal count, and Focus phase workflows in isolated browser profiles."""
import datetime, gzip, hashlib, json, subprocess
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
import browser as b
out=b.ROOT/'docs/reviews/25-interface-elements/supplemental-goal-focus/corrected'
out.mkdir(exist_ok=True,parents=True)
seed=subprocess.check_output(['node','-p',"require('./tests/helpers/browser-fixture.cjs').seedBridge.toString()"],cwd=b.ROOT,text=True)
def test(profile):
 folder=b.ROOT/'dist' if profile=='notebook' else b.OUT/(profile+'-components')
 bundle=next((folder/'assets').glob('index-*.js')) if profile=='notebook' else folder/'index.js'
 build=hashlib.sha256(bundle.read_bytes()).hexdigest()
 count=0; errors=[]
 with sync_playwright() as pw,gzip.open(out/(profile+'.jsonl.gz'),'wt') as f:
  chrome=pw.chromium.launch(executable_path=b.CHROME)
  for tag in b.TAGS:
   labels={} if tag=='en' else json.loads((b.ROOT/'phone/assets/interface'/(tag+'.json')).read_text())
   t=lambda key:labels.get(key,key)
   for cycle in range(1,6):
    ctx=chrome.new_context(viewport={'width':460,'height':740},locale='zh-HK' if tag=='yue' else tag,reduced_motion='reduce')
    ctx.add_init_script("localStorage.setItem('pipedreams.displayLanguage',"+json.dumps(tag)+");"+("("+seed+")();" if profile=='notebook' else ''))
    def serve(route):
     u=urlsplit(route.request.url);path=folder/(u.path.lstrip('/') or 'index.html')
     if u.hostname=='dockit.example.test' and path.is_file():return route.fulfill(path=str(path))
     return route.abort()
    ctx.route('**/*',serve);page=ctx.new_page();page.set_default_timeout(2300)
    page.clock.set_fixed_time(datetime.datetime(2026,11,21,12,tzinfo=datetime.timezone.utc))
    def check(state,locator,actual,expected):
     nonlocal count
     rec=[profile,build,tag,cycle,state,locator,actual,expected,actual==expected]
     f.write(json.dumps(rec,ensure_ascii=False,separators=(',',':'))+'\n');count+=1
     if actual!=expected:errors.append(rec)
    def date():return page.evaluate("l=>new Intl.DateTimeFormat(l,{weekday:'short',month:'short',day:'numeric'}).format(new Date(2026,11,12))",'zh-HK' if tag=='yue' else tag)
    try:
     if profile=='notebook':
      page.goto('https://dockit.example.test');row=page.locator('[data-task-id="dentist"]').first;row.locator('.task-text').first.click()
      row.locator('.due-empty').click();row.locator('input[type=date]').fill('2026-12-12');row.get_by_role('button',name=t('Save date'),exact=True).click()
      check('saved-task','.deadline-badge',row.locator('.deadline-badge').first.text_content(),date())
      row.locator('.task-focus-action').click();overlay=page.locator('.tracking-overlay');overlay.get_by_role('button',name=t('Start focus'),exact=True).click()
      for mode in ['running','paused','resumed']:
       if mode!='running':overlay.locator('.focus-btn.secondary').click()
       for i,key in enumerate(['Ignition','Ascent','Heating','Staging','Orbit']):
        sel='.focus-phase-step > span:last-child';check('focus-'+mode,sel+' index '+str(i),overlay.locator(sel).nth(i).text_content(),t(key))
       if mode=='paused':
        expected=t('{0} paused').replace('{0}',t('Ignition'))
        check('focus-paused','pause indicator',overlay.get_by_text(expected,exact=True).text_content(),expected)
     else:
      for n in [0,1,3]:
       state='corrected-'+str(n);page.goto('https://dockit.example.test/?state='+state+'&language='+tag);page.locator('[data-badges]').wait_for()
       expected=[t(k).replace('{0}',str(n)) for k in (['{0} unfinished goal','{0} active routine'] if n==1 else ['{0} unfinished goals','{0} active routines'])]
       actual=page.locator('.goal-section-header > span').all_inner_texts()
       for i,value in enumerate(expected):check(state,'goal-section-header '+str(i),actual[i],value)
       expected=[date(),t('Today'),t('{0} day overdue').replace('{0}','1'),t('{0} days overdue').replace('{0}','2'),date()]
       actual=page.locator('[data-badges] .deadline-badge').all_inner_texts()
       for i,value in enumerate(expected):check(state,'deadline-badge '+str(i),actual[i],value)
    except Exception as exc:errors.append([profile,tag,cycle,str(exc)[:900]])
    ctx.close();f.flush()
  chrome.close()
 summary={'profile':profile,'buildSHA256':build,'languages':len(b.TAGS),'cycles':5,'observations':count,'failed':len(errors),'details':errors[:8]}
 (out/(profile+'.json')).write_text(json.dumps(summary,indent=2,ensure_ascii=False));print(profile,count,'failures',len(errors),errors[:1],flush=True)
 if errors:raise RuntimeError(profile+' checks failed')
if __name__=='__main__':
 import sys
 for selected in sys.argv[1:]:test(selected)
