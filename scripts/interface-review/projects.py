from pathlib import Path
import gzip,json,hashlib,concurrent.futures
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
import browser as b
def run(profile):
 out=b.OUT;folder=out/profile;build=hashlib.sha256((folder/'index.js').read_bytes()).hexdigest()[:16];gaps=[];total=0
 with sync_playwright()as pl,gzip.open(out/(profile+'.jsonl.gz'),'wt')as g:
  chrome=pl.chromium.launch(executable_path=b.CHROME)
  for tag in b.TAGS:
   cat={} if tag=='en'else json.loads((b.ROOT/'phone/assets/interface'/(tag+'.json')).read_text());t=lambda k:cat.get(k,k)
   for cycle in range(1,6):
    ctx=chrome.new_context(viewport={'width':600,'height':680},reduced_motion='reduce'if cycle==4 else 'no-preference')
    ctx.add_init_script('localStorage.setItem("pipedreams.displayLanguage",'+json.dumps(tag)+')')
    def route(r):
     u=urlsplit(r.request.url);file=folder/(u.path.lstrip('/') or 'index.html')
     if u.netloc=='dockit.example.test' and file.is_file():return r.fulfill(path=str(file))
     return r.abort()
    ctx.route('**/*',route);p=ctx.new_page();p.set_default_timeout(1800);pages={}
    def snap(name):b.capture(p,name,'#review-ready',pages)
    for state in ('project','closed-project','missing-project','search','search-many','progress','progress-many','plan','albums','albums-loading','albums-empty'):
     try:
      p.goto('https://dockit.example.test/?state='+state+'&language='+tag+'&host='+profile);p.locator('#review-ready').wait_for();snap(state)
      if state=='project':
       p.locator('[data-project-edit="description"]').click();snap('project-description-editor')
       p.get_by_role('button',name=t('Cancel'),exact=True).last.click()
       p.locator('[data-project-edit="step:fixture-step"]').click();snap('project-step-editor');p.get_by_role('button',name=t('Cancel'),exact=True).last.click()
       p.get_by_title(t('Remove step'),exact=True).click();snap('project-remove-confirmation');p.get_by_role('button',name=t('Keep'),exact=True).click()
       p.locator('.project-step-line input[type=checkbox]').first.check();snap('project-schedule-selected')
       p.get_by_role('button',name=t('Plan across days'),exact=True).click();snap('project-planning-window')
       p.get_by_role('button',name=t('Generate proposal'),exact=True).click();p.wait_for_timeout(70);snap('project-proposal-response')
      elif state in ('search','search-many','progress','progress-many'):
       count=2 if state.endswith('-many') else 1
       key=('{0} match' if count==1 else '{0} matches') if state.startswith('search') else ('{0} task' if count==1 else '{0} tasks')
       expected=t(key).replace('{0}',str(count));p.get_by_text(expected,exact=True).first.wait_for();snap(state+'-localized-count')
      if state=='search':
       p.locator('input[type=search]').fill('no such fixture');snap('archive-search-empty')
      elif state=='progress':
       p.locator('.progress-period select').select_option('week');snap('archive-progress-week')
     except Exception as e:gaps.append([tag,cycle,state,list(pages)[-1]if pages else '',str(e).splitlines()[0]])
    for state,items in pages.items():
     total+=1
     for r in items:g.write(json.dumps([profile,build,tag,cycle,state,r],ensure_ascii=False,separators=(',',':'))+'\n')
    g.flush();ctx.close()
  chrome.close()
 (out/(profile+'-gaps.json')).write_text(json.dumps(gaps,indent=2));print(profile,total,'renders',len(gaps),'gaps',gaps[:1],flush=True)
if __name__=='__main__':
 for profile in ('web-components','embedded-components'):run(profile)
