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
    for state, label in [('queued', 'Queued'), ('running', 'Running'), ('attention', 'Needs input'),
                         ('ready', 'Finished · Review'), ('stopped', 'Stopped'), ('failed', 'Failed')]:
        page.get_by_role('button', name=state, exact=True).click()
        page.get_by_role('button', name=f'{label}. Open details for {state}', exact=True).wait_for()
    page.get_by_role('button', name='running', exact=True).click()
    page.screenshot(path='/private/tmp/diane-status-controls.png')
    assert page.locator('.diane-running').evaluate('(el)=>getComputedStyle(el).animationName') == 'none'
    page.get_by_role('button', name='ready', exact=True).click()
    page.get_by_role('button', name='Finished · Review. Open details for ready').click()
    page.get_by_role('button', name='Open in Shiprite', exact=True).click()
    assert page.evaluate('calls.filter(c=>c.action==="open").length') == 1
    page.keyboard.press('Escape')
    assert page.locator('.diane-details').count() == 0
    page.get_by_role('button', name='Inspect this project', exact=True).click()
    page.get_by_role('button', name='Push to Shiprite · Choose workspace', exact=True).click()
    page.get_by_role('combobox', name='Shiprite workspace').select_option('project-a')
    page.get_by_role('button', name='Start', exact=True).dblclick()
    page.wait_for_timeout(200)
    assert page.evaluate('calls.filter(c=>c.action==="dispatch").length') == 1
    page.reload()
    page.get_by_role('button', name='Inspect this project', exact=True).click()
    page.get_by_role('button', name='Running. Open details for Inspect this project').wait_for()
    assert page.evaluate('calls.filter(c=>c.action==="dispatch").length') == 0
    page.get_by_role('button', name='running', exact=True).click()
    page.get_by_role('button', name='Running. Open details for running', exact=True).click()
    page.get_by_role('button', name='Stop', exact=True).click()
    page.get_by_role('button', name='Stopping…', exact=True).wait_for()
    assert page.get_by_role('button', name='Stopping…', exact=True).is_disabled()
    page.keyboard.press('Escape')
    page.evaluate('window.offline=true')
    page.get_by_role('button', name='Disconnected. Open details for running', exact=True).wait_for(timeout=10000)
    page.get_by_role('button', name='Disconnected. Open details for running', exact=True).click()
    page.get_by_text('Connection unavailable', exact=False).wait_for()
    page.screenshot(path='/private/tmp/diane-disconnected.png')
    assert not errors, errors
    print(json.dumps({'checks':['all six indicators','reduced motion','session open','keyboard Escape','double-click idempotency','reload without redispatch','stop acknowledgement','disconnect preserves run'], 'page_errors':errors}))
    for failure in ['offline', 'pending', 'malformed', 'corrupt', 'disabled']:
        isolated = browser.new_context(viewport={'width':460, 'height':640})
        check = isolated.new_page()
        check.on('pageerror', lambda error: errors.append(str(error)))
        check.goto(os.environ.get('TODO_TEST_URL', 'http://127.0.0.1:15173') + '/tests/diane-ui.html?failure=' + failure)
        if failure == 'disabled':
            assert check.locator('.diane-action').count() == 0
            assert check.evaluate('calls.length') == 0
        capture = check.get_by_role('textbox', name='New top-level task')
        capture.fill('Independent task')
        capture.press('Control+Enter')
        check.get_by_role('button', name='Independent task', exact=True).dblclick()
        editor = check.locator('.task-inline-edit')
        editor.fill('Edited without Shiprite')
        editor.press('Control+Enter')
        check.get_by_role('button', name='Edited without Shiprite. Status todo. Change status', exact=True).click()
        check.get_by_role('button', name='Edited without Shiprite. Status done. Change status', exact=True).wait_for()
        check.reload()
        check.get_by_role('button', name='Edited without Shiprite. Status done. Change status', exact=True).wait_for()
        check.get_by_role('button', name='Edited without Shiprite', exact=True).click()
        check.get_by_role('button', name='Delete Edited without Shiprite', exact=True).click()
        assert check.get_by_role('button', name='Edited without Shiprite', exact=True).count() == 0
        assert check.evaluate('calls.filter(c=>c.action==="dispatch").length') == 0
        if failure == 'corrupt':
            assert check.evaluate('localStorage.getItem("sticky-todo-diane-v1")') == '{broken'
            assert check.evaluate('calls.length') == 0
        isolated.close()
    assert not errors, errors
    print('Independent capture/edit/complete/delete/reload controls passed with absent, stalled, malformed, and corrupt Shiprite data (fixture task persistence).')
    browser.close()
