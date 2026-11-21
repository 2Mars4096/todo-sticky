"""Supplemental read-only-on-product traversal of real task/goal/focus controls.
Each cycle uses an isolated browser context and the producer's synthetic native bridge.
"""
import argparse, datetime, gzip, hashlib, json, os, subprocess
from pathlib import Path
from urllib.parse import urlsplit
from playwright.sync_api import sync_playwright
import browser as b

def run(tags, cycles, photos=False):
    dist=b.ROOT/'dist'
    build=hashlib.sha256(next((dist/'assets').glob('index-*.js')).read_bytes()).hexdigest()[:16]
    seed=subprocess.check_output(['node','-p',"require('./tests/helpers/browser-fixture.cjs').seedBridge.toString()"],cwd=b.ROOT,text=True)
    reports=[];gaps=[];snapshots=0
    dataset='goal-focus' if len(tags)==10 and cycles==5 else 'goal-focus-visual' if photos else 'goal-focus-pilot'
    with sync_playwright() as pw,gzip.open(b.OUT/(dataset+'.jsonl.gz'),'wt') as log:
        chrome=pw.chromium.launch(executable_path=b.CHROME)
        for tag in tags:
            labels={} if tag=='en' else json.loads((b.ROOT/'phone/assets/interface'/(tag+'.json')).read_text());t=lambda s:labels.get(s,s)
            for cycle in range(1,cycles+1):
                ctx=chrome.new_context(viewport={'width':460,'height':740},locale='zh-HK' if tag=='yue' else tag,reduced_motion='reduce' if cycle==4 else 'no-preference')
                ctx.add_init_script("localStorage.setItem('pipedreams.displayLanguage',"+json.dumps(tag)+");("+seed+")();"+"""
                    window.__review.star={sidebarCollapsed:true,selectedTaskId:null,selectedTaskText:null,
                      sessionDurationMinutes:25,archiveRetentionLimit:50,activeSession:null,lastCompletedMissionId:null,
                      missionHistory:Array.from({length:9},(_,i)=>({id:'fixture-past-'+i,taskId:'fixture-'+i,taskText:'Fixture prior mission '+i,durationMinutes:10+i,completedAt:Date.now()-86400000*(i+1),vehicleCode:'LUNA',orbitIndex:i,orbitLabel:'Fixture orbit '+i}))}
                """)
                page=ctx.new_page();page.set_default_timeout(2300)
                page.clock.set_fixed_time(datetime.datetime(2026,11,21,12,tzinfo=datetime.timezone.utc))
                def route(r):
                    u=urlsplit(r.request.url);f=dist/(u.path.lstrip('/') or 'index.html')
                    if u.hostname=='dockit.example.test' and f.is_file():return r.fulfill(path=str(f))
                    return r.abort()
                ctx.route('**/*',route);pages={}
                def snap(name,scope):
                    b.capture(page,name,scope,pages)
                    if photos and (tag,name) in [('yue','focus-paused'),('yue','focus-full-archive'),('fr','reminder-editor-draft'),('fr','notebook-save-failed')]:
                        page.screenshot(path=str(b.OUT/(tag+'-'+name+'.png')))
                def observe(group,fn):
                    try:fn()
                    except Exception as e:
                        if dataset.endswith('pilot'):page.screenshot(path=str(b.OUT/('supplement-'+group+'.png')))
                        gaps.append([tag,cycle,group,list(pages)[-1] if pages else None,str(e)[:2400]])
                def reset():
                    page.goto('https://dockit.example.test');page.locator('[data-task-id="dentist"]').first.wait_for()
                    side=page.locator('#goals-panel:not(.collapsed) .sidebar-toggle');
                    if side.count() and side.is_visible():side.click();page.wait_for_timeout(200)
                def goals():
                    reset();page.locator('.compact-goals-entry').click()
                    group=page.locator('#goals-panel .goal-section')
                    for i,txt in [(0,'Fixture new goal'),(1,'Fixture new reminder')]:
                        field=group.nth(i).locator('.goal-composer-input');field.fill(txt);field.press('Enter');group.nth(i).get_by_text(txt,exact=True).wait_for()
                        snap('goal-created' if i==0 else 'routine-created','#goals-panel')
                    row=group.nth(1).locator('.goal-list > div').filter(has_text='Fixture new reminder')
                    row.locator('.goal-text').dblclick();edit=group.nth(1).locator('.goal-edit-input');edit.fill('Fixture cancelled reminder')
                    snap('reminder-editor-draft','#goals-panel');edit.press('Escape')
                    row.get_by_text('Fixture new reminder',exact=True).wait_for()
                    assert not page.get_by_text('Fixture cancelled reminder',exact=True).count()
                    snap('reminder-edit-cancelled','#goals-panel')
                    row.locator('.routine-options select').select_option('weekly');snap('reminder-weekly','#goals-panel')
                    row.locator('.routine-options button').first.click();snap('reminder-paused','#goals-panel')
                    row.locator('.routine-options button').first.click();snap('reminder-resumed','#goals-panel')
                def tasks():
                    reset();row=page.locator('[data-task-id="dentist"]').first;title=row.locator('.task-text').first
                    title.dblclick();edit=row.locator('.task-inline-edit');edit.fill('Fixture cancelled title');snap('task-title-draft','[data-task-id="dentist"]');edit.press('Escape')
                    assert 'Book a dentist appointment' in title.inner_text()
                    title.click();row.locator('.due-empty').click();date=row.locator('input[type=date]');date.fill('2026-12-12');snap('task-due-date-draft','[data-task-id="dentist"]')
                    row.get_by_role('button',name=t('Cancel'),exact=True).click();snap('task-due-date-cancelled','[data-task-id="dentist"]')
                    row.locator('.due-empty').click();row.locator('input[type=date]').fill('2026-12-12');row.get_by_role('button',name=t('Save date'),exact=True).click()
                    snap('task-due-date-saved','[data-task-id="dentist"]')
                    note=page.locator('[data-task-id="note"]').first;note.locator('.task-text').first.click();note.locator('.finish-review').wait_for()
                    snap('task-finish-review','[data-task-id="note"]')
                    note.get_by_role('button',name=t('Revise'),exact=True).click();snap('task-finish-revise','[data-task-id="note"]')
                    note.locator('.outcome-editor textarea').press('Escape');note.locator('.finish-review').wait_for()
                    note.get_by_role('button',name=t('Complete'),exact=True).click();snap('task-finished','.task-list')
                def retry():
                    reset();page.evaluate('window.__review.failSave=true')
                    quick=page.locator('#quick-add-task');quick.fill('Fixture retry capture');quick.press('Control+Enter')
                    panel=page.locator('.task-save-error');panel.wait_for(timeout=5500);snap('notebook-save-failed','.task-save-error')
                    page.evaluate('window.__review.failSave=false');panel.locator('button').first.click();panel.wait_for(state='detached',timeout=5500)
                    page.wait_for_function("window.__review.writes.some(w=>w.tasks?.some(t=>t.text==='Fixture retry capture'))")
                    snap('notebook-retry-committed','.task-list')
                def focus():
                    reset();row=page.locator('[data-task-id="dentist"]').first;row.locator('.task-text').first.click();row.locator('.task-focus-action').click()
                    overlay=page.locator('.tracking-overlay');overlay.wait_for()
                    snap('focus-armed','.tracking-focus-console')
                    overlay.get_by_role('button',name=t('Start focus'),exact=True).click()
                    overlay.locator('.focus-clock-block').wait_for();snap('focus-running','.tracking-focus-console')
                    overlay.locator('.focus-btn.secondary').click();snap('focus-paused','.tracking-focus-console')
                    overlay.locator('.focus-btn.secondary').click();snap('focus-resumed','.tracking-focus-console')
                    overlay.get_by_role('button',name=t('Finish session'),exact=True).click();overlay.locator('.focus-session.complete').wait_for()
                    snap('focus-completed','.tracking-focus-console');snap('focus-recent-archive','.tracking-archive-section')
                    full=overlay.locator('.tracking-history-toggle button').nth(1);full.click();assert full.get_attribute('aria-pressed')=='true'
                    snap('focus-full-archive','.tracking-archive-section')
                    reports.append([tag,cycle,len(overlay.locator('.tracking-history-task').all())])
                for name,fn in [('goals',goals),('task-edit-finish',tasks),('write-retry',retry),('focus',focus)]:observe(name,fn)
                for state,items in pages.items():
                    snapshots+=1
                    for item in items:log.write(json.dumps([dataset,build,tag,cycle,state,item],ensure_ascii=False,separators=(',',':'))+'\n')
                log.flush();ctx.close()
        chrome.close()
    (b.OUT/(dataset+'-gaps.json')).write_text(json.dumps(gaps,ensure_ascii=False,indent=2));(b.OUT/(dataset+'-history.json')).write_text(json.dumps(reports));print(dataset,snapshots,'state renders',len(reports),'full archives',len(gaps),'flow gaps',gaps[:5],flush=True)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--pilot',action='store_true');p.add_argument('--photos',action='store_true');opt=p.parse_args();run(['en'] if opt.pilot else ['yue','fr'] if opt.photos else b.TAGS,1 if opt.pilot or opt.photos else 5,opt.photos)
