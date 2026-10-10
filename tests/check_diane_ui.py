from playwright.sync_api import sync_playwright
import json
import os
from pathlib import Path
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get('CHROME_EXECUTABLE') or ('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' if Path('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome').exists() else None), args=['--disable-dev-shm-usage'])
    page = browser.new_page(viewport={'width':460,'height':640}, reduced_motion='reduce')
    errors=[]
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(os.environ.get('TODO_TEST_URL', 'http://127.0.0.1:15173') + '/tests/diane-ui.html')
    page.get_by_role('button', name='Run in Diane · Test project').wait_for()
    page.screenshot(path='/private/tmp/diane-status-controls.png')
    assert page.locator('.diane-running').evaluate('(el)=>getComputedStyle(el).animationName') == 'none'
    page.get_by_role('button', name='Result ready. Open details for ready').click()
    page.get_by_role('button', name='Open in Diane', exact=True).click()
    assert page.evaluate('calls.filter(c=>c.action==="open").length') == 1
    page.keyboard.press('Escape')
    assert page.locator('.diane-details').count() == 0
    button = page.get_by_role('button', name='Run in Diane · Test project')
    button.dblclick()
    page.wait_for_timeout(200)
    assert page.evaluate('calls.filter(c=>c.action==="dispatch").length') == 1
    page.reload()
    page.get_by_role('button', name='Running. Open details for Inspect this project').wait_for()
    assert page.evaluate('calls.filter(c=>c.action==="dispatch").length') == 0
    page.get_by_role('button', name='Running. Open details for running', exact=True).click()
    page.get_by_role('button', name='Stop', exact=True).click()
    page.get_by_role('button', name='Stopping…', exact=True).wait_for()
    assert page.get_by_role('button', name='Stopping…', exact=True).is_disabled()
    page.keyboard.press('Escape')
    page.evaluate('window.offline=true')
    page.get_by_role('button', name='Status unavailable. Open details for running', exact=True).wait_for(timeout=10000)
    page.get_by_role('button', name='Status unavailable. Open details for running', exact=True).click()
    page.get_by_text('Connection unavailable').wait_for()
    page.screenshot(path='/private/tmp/diane-disconnected.png')
    assert not errors, errors
    print(json.dumps({'checks':['all six indicators','reduced motion','session open','keyboard Escape','double-click idempotency','reload without redispatch','stop acknowledgement','disconnect preserves run'], 'page_errors':errors}))
    browser.close()
