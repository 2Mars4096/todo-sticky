"""Isolated final-review renders; never touches a live account or notebook."""
import importlib.util, json
from pathlib import Path
spec = importlib.util.spec_from_file_location('review', Path(__file__).with_name('browser.py'))
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)
review.OUT = review.ROOT / 'output/playwright/final-review'
review.OUT.mkdir(parents=True, exist_ok=True)
original = review.capture
issues = []
def capture(page, state, scope, rows):
    original(page, state, scope, rows)
    language = page.locator('html').get_attribute('lang')
    width = page.viewport_size['width']
    if language in ('en', 'de') and state in ('settings-tab-2', 'focus', 'day-plan'):
        page.screenshot(path=str(review.OUT / f'{width}-{language}-{state}.png'))
    overflow = page.evaluate('''()=>Array.from(document.querySelectorAll('button,input,select')).filter(e=>e.getClientRects().length).filter(e=>{const r=e.getBoundingClientRect();return r.left < -1 || r.right > innerWidth+1}).map(e=>({label:(e.innerText||e.getAttribute('aria-label')||e.title).slice(0,100),x:e.getBoundingClientRect().x,width:e.getBoundingClientRect().width}))''')
    if overflow: issues.append({'width':width,'language':language,'state':state,'controls':overflow})
review.capture = capture
for profile in ('web-wide', 'web-compact', 'mac-shared'):
    review.run(profile, 1)
(review.OUT / 'geometry.json').write_text(json.dumps(issues, indent=2))
print('Out-of-viewport control groups:', len(issues))
assert not issues
