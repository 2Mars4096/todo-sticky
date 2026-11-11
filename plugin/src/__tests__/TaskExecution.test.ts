// @vitest-environment happy-dom
import { act, createElement as h } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as client from '@diane/plugin-sdk/client';
import * as desktop from '@diane/plugin-sdk/desktop';
import { type PluginRecord, type Workflow } from '@diane/plugin-sdk/client';
import { TaskExecution } from '../TaskExecution';

const projects = [{ id: 'research', name: 'Research', root: '/work/research' }, { id: 'writing', name: 'Writing', root: '/work/writing' }];
const task = (patch: Partial<PluginRecord> = {}): PluginRecord => ({
  _scope: 'owner-a', plugin_id: 'todo', record_type: 'task', record_id: 'task-a', revision: 1,
  schema_version: 1, title: 'Review notes', text: 'Review the existing notes.', status: 'todo', tags: [], relationships: [], attachments: [], extensions: {}, created_at: 'now', updated_at: 'now', ...patch,
});
const prepared = { state: 'ready' as const, task_revision: 1, project_id: 'research', workspace_root: '/work/research', fingerprint: 'prepared-1', context: 'Read the existing research notes.', _scope: 'owner-a' };
const run: Workflow = { workflow_id: 'attempt-1', task_id: 'task-a', task_revision: 1, project_id: 'research', dispatch_id: 'dispatch-1', request_id: 'request-1', session_id: 'session-1', state: 'running', _scope: 'owner-a' };
const result: Workflow = { ...run, state: 'awaiting_review', result_version: 'result-1', result: { summary: 'Notes reviewed.' }, can_discard_result: true };
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  vi.spyOn(client, 'pluginScope').mockReturnValue('owner-a');
  vi.spyOn(desktop, 'isElectron').mockReturnValue(true);
  vi.spyOn(client.pluginApi, 'projects').mockResolvedValue({ projects, active_project_id: 'writing' });
  vi.spyOn(client.pluginApi, 'workflows').mockResolvedValue({ items: [] });
  vi.spyOn(client.pluginApi, 'workflow').mockResolvedValue(run);
  vi.spyOn(client.pluginApi, 'refreshPreparations').mockResolvedValue({ queued: 1, scope: 'owner-a' });
  vi.spyOn(client.pluginApi, 'preparation').mockResolvedValue(prepared);
  vi.spyOn(client.pluginApi, 'run').mockResolvedValue(run);
  vi.spyOn(client.pluginApi, 'openWorkflow').mockResolvedValue({});
  vi.spyOn(client.pluginApi, 'review').mockResolvedValue({ ...result, state: 'accepted' });
  vi.spyOn(client.pluginApi, 'stop').mockResolvedValue({ ...run, state: 'stopped' });
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
});
afterEach(() => { act(() => root.unmount()); host.remove(); localStorage.clear(); vi.restoreAllMocks(); vi.useRealTimers(); });
const render = async (record = task(), props: Partial<Parameters<typeof TaskExecution>[0]> = {}) => {
  await act(async () => root.render(h(TaskExecution, { task: record, active: true, enabled: true, ...props })));
};
const button = (text: string) => [...host.querySelectorAll<HTMLButtonElement>('button')].find(item => item.textContent === text)!;
async function click(text: string) { expect(button(text), text).toBeTruthy(); await act(async () => button(text).click()); }
async function choose(project: string) { await act(async () => { const select = host.querySelector<HTMLSelectElement>('select[aria-label="Diane project"]')!; select.value = project; select.dispatchEvent(new Event('change', { bubbles: true })); }); }
function deferred<T>() { let resolve!: (value: T) => void; return { promise: new Promise<T>(done => { resolve = done; }), resolve }; }

it('prepares quietly and dispatches once without navigating; Open uses the returned session', async () => {
  await render();
  expect(host.querySelector<HTMLSelectElement>('select')!.value).toBe('research');
  expect(client.pluginApi.run).not.toHaveBeenCalled();
  expect(host.querySelector('.todo-execution-details')).toBeNull();
  await act(async () => { button('Run').click(); button('Run').click(); });
  expect(client.pluginApi.run).toHaveBeenCalledOnce();
  expect(client.pluginApi.run).toHaveBeenCalledWith(expect.objectContaining({ record_id: 'task-a', revision: 1 }), 'research', expect.any(String), 'prepared-1');
  expect(client.pluginApi.openWorkflow).not.toHaveBeenCalled();
  expect(host.textContent).toContain('Running');
  await click('Open');
  expect(client.pluginApi.openWorkflow).toHaveBeenCalledWith(run);
});

it('reloads saved workflow sessions and offers earlier returned attempts without a local session cache', async () => {
  const old = { ...run, workflow_id: 'attempt-old', dispatch_id: 'dispatch-old', session_id: 'session-old', state: 'stopped' };
  vi.mocked(client.pluginApi.workflows).mockResolvedValue({ items: [run, old] });
  await render(); await click('Run details');
  expect(host.textContent).toContain('Previous runs');
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Open previous Diane session 1"]')!.click());
  expect(client.pluginApi.openWorkflow).toHaveBeenCalledWith(old);
  await act(async () => root.render(null));
  localStorage.clear();
  await render(); await click('Open');
  expect(client.pluginApi.openWorkflow).toHaveBeenLastCalledWith(run);
  expect(client.pluginApi.run).not.toHaveBeenCalled();
});

it('reopens validated inline attempt history from the server after remount without enabling old-result mutations', async () => {
  const previous = { attempt: 1, dispatch_id: '2ae72590-c028-5db4-98f8-18e9e5d49945', session_id: 'prior-session', result_version: 'old-result', result: { summary: 'Older work.' } };
  const withHistory = { ...run, attempt: 4, history_count: 3, history: [
    previous,
    { ...previous, attempt: 2, dispatch_id: 'invalid-dispatch' },
    { ...previous, attempt: 3, task_id: 'another-task' },
    { ...previous, attempt: 4 },
    { ...previous, attempt: 0 },
  ] };
  vi.mocked(client.pluginApi.workflows).mockResolvedValue({ items: [withHistory] });
  await render(); await act(async () => root.render(null)); localStorage.clear(); await render();
  await click('Run details');
  expect(host.querySelectorAll('.todo-execution-history li')).toHaveLength(1);
  expect(host.querySelector('.todo-execution-history')?.textContent).toContain('Run 1');
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Open previous Diane session 1"]')!.click());
  expect(client.pluginApi.openWorkflow).toHaveBeenCalledWith(expect.objectContaining({
    task_id: 'task-a', project_id: 'research', _scope: 'owner-a', dispatch_id: previous.dispatch_id, session_id: 'prior-session',
  }));
  expect(button('Accept & complete')).toBeUndefined(); expect(client.pluginApi.review).not.toHaveBeenCalled();
});

it('uses the workflow project in browser session links even after changing the next-run project', async () => {
  vi.mocked(desktop.isElectron).mockReturnValue(false);
  vi.mocked(client.pluginApi.workflows).mockResolvedValue({ items: [{ ...run, state: 'failed' }] });
  await render(); await choose('writing');
  const link = host.querySelector<HTMLAnchorElement>('[aria-label="Open Diane session"]')!;
  expect(link.getAttribute('href')).toBe('/?session=session-1&workflow=research#workspace');
  expect(link.target).toBe('_blank');
  expect(client.pluginApi.openWorkflow).not.toHaveBeenCalled();
});

it('keeps explicit project choice ahead of late preparation and remembers it across remounts', async () => {
  const pending = deferred<typeof prepared>(); vi.mocked(client.pluginApi.preparation).mockReturnValue(pending.promise);
  vi.mocked(client.pluginApi.run).mockResolvedValue({ ...run, project_id: 'writing' });
  await render(); await choose('writing'); await act(async () => pending.resolve(prepared));
  expect(host.querySelector<HTMLSelectElement>('select')!.value).toBe('writing');
  await act(async () => root.render(null)); await render();
  expect(host.querySelector<HTMLSelectElement>('select')!.value).toBe('writing');
  await click('Run');
  expect(client.pluginApi.run).toHaveBeenCalledWith(expect.anything(), 'writing', expect.any(String), undefined);
});

it('does not guess a destination for unmatched, stale, foreign or changed remembered projects', async () => {
  vi.mocked(client.pluginApi.preparation).mockResolvedValue({ state: 'unmatched', reason: 'No clear match' });
  await render(); expect(button('Run').disabled).toBe(true);
  vi.mocked(client.pluginApi.preparation).mockResolvedValue({ ...prepared, task_revision: 1 });
  await render(task({ revision: 2 })); expect(button('Run').disabled).toBe(true);
  vi.mocked(client.pluginApi.preparation).mockResolvedValue({ ...prepared, task_revision: 3, _scope: 'another-account' });
  await render(task({ revision: 3 })); expect(button('Run').disabled).toBe(true);
  await choose('writing');
  vi.mocked(client.pluginApi.projects).mockResolvedValue({ projects: [projects[0], { ...projects[1], root: '/changed/writing' }], active_project_id: 'research' });
  await act(async () => root.render(null)); await render();
  expect(host.querySelector<HTMLSelectElement>('select')!.value).toBe(''); expect(button('Run').disabled).toBe(true);
  expect(host.textContent).toContain('Project unavailable'); expect(client.pluginApi.run).not.toHaveBeenCalled();
});

it('reuses a failed dispatch request identity after reopening the task', async () => {
  vi.mocked(client.pluginApi.run).mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValue(run);
  await render(); await click('Run');
  const id = vi.mocked(client.pluginApi.run).mock.calls[0][2];
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Connection interrupted');
  await act(async () => root.render(null)); await render(); await click('Run');
  expect(vi.mocked(client.pluginApi.run).mock.calls[1][2]).toBe(id);
  expect(client.pluginApi.openWorkflow).not.toHaveBeenCalled();
});

it('offers explicit result review and never describes acceptance as a code merge', async () => {
  vi.mocked(client.pluginApi.workflows).mockResolvedValue({ items: [result] });
  await render();
  expect(button('Review')).toBeTruthy(); expect(button('Accept & complete')).toBeUndefined();
  expect(client.pluginApi.review).not.toHaveBeenCalled();
  await click('Review'); expect(host.textContent).toContain('Notes reviewed.');
  await click('Accept & complete');
  expect(client.pluginApi.review).toHaveBeenCalledWith(expect.objectContaining({ workflow_id: 'attempt-1', result_version: 'result-1' }), 'accept', '', expect.any(String));
  expect(host.textContent).toContain('Accepted'); expect(host.textContent).not.toMatch(/merge|worktree/i);
});

it('pins the displayed result until the user explicitly opens a newer version', async () => {
  vi.mocked(client.pluginApi.workflows).mockResolvedValue({ items: [result] });
  await render(); await click('Review');
  vi.mocked(client.pluginApi.workflows).mockResolvedValue({ items: [{ ...result, result_version: 'result-2', result: { summary: 'New result.' } }] });
  await click('Refresh');
  expect(host.textContent).toContain('Notes reviewed.'); expect(host.textContent).not.toContain('New result.');
  expect(button('Accept & complete').disabled).toBe(true);
  expect(button('Discard result').disabled).toBe(true);
  await click('Accept & complete'); expect(client.pluginApi.review).not.toHaveBeenCalled();
  await click('Review latest'); expect(host.textContent).toContain('New result.');
  await click('Accept & complete');
  expect(vi.mocked(client.pluginApi.review).mock.calls[0][0].result_version).toBe('result-2');
});

it('discards a changed task result and runs its saved edits without reverting or completing the task', async () => {
  const changed = task({ revision: 2, text: 'Review the notes and the appendix.', extensions: { outcome: 'Include appendix references.' } });
  vi.mocked(client.pluginApi.workflows).mockResolvedValue({ items: [{ ...result,
    review_conflict: 'This task changed after the run. Discard this result, then run the updated task.',
  }] });
  vi.mocked(client.pluginApi.preparation).mockResolvedValue({ ...prepared, task_revision: 2, fingerprint: 'prepared-2' });
  vi.mocked(client.pluginApi.review).mockResolvedValue({ ...result, state: 'stopped' });
  await render(changed); await click('Review');
  expect(host.textContent).toContain('This task changed after the run.');
  expect(button('Accept & complete').disabled).toBe(true);
  expect(button('Request changes').disabled).toBe(true);
  expect(button('Discard result').disabled).toBe(false);
  await click('Accept & complete'); expect(client.pluginApi.review).not.toHaveBeenCalled();
  await click('Discard result');
  expect(client.pluginApi.review).toHaveBeenCalledWith(expect.objectContaining({ result_version: 'result-1' }), 'stop', '', expect.any(String));
  expect(client.pluginApi.stop).not.toHaveBeenCalled();
  expect(host.textContent).toContain('Result discarded.');
  expect(host.querySelector('.todo-execution-details')).toBeNull();
  expect(button('Run again').closest('details')).toBeNull();
  await click('Run again');
  expect(client.pluginApi.run).toHaveBeenCalledWith(changed, 'research', expect.any(String), 'prepared-2');
});

it('blocks a drafted revision when the host reports a changed parent or step, while allowing result discard', async () => {
  vi.mocked(client.pluginApi.workflows).mockResolvedValue({ items: [result] });
  await render(); await click('Review'); await click('Request changes');
  const input = host.querySelector<HTMLTextAreaElement>('textarea')!;
  act(() => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, 'Check the appendix.'); input.dispatchEvent(new Event('input', { bubbles: true })); });
  vi.mocked(client.pluginApi.workflows).mockResolvedValue({ items: [{ ...result, review_conflict: 'The task steps changed. Discard this result, then run again.' }] });
  // A saved child/parent edit reloads the root record without changing its revision.
  await render(task());
  expect(input.value).toBe('Check the appendix.');
  expect(button('Send changes').disabled).toBe(true);
  expect(button('Discard result').disabled).toBe(false);
  await click('Send changes'); expect(client.pluginApi.review).not.toHaveBeenCalled();
  await click('Discard result');
  expect(client.pluginApi.review).toHaveBeenCalledWith(expect.anything(), 'stop', '', expect.any(String));
});

it('keeps discard available on unflagged results and retries an interrupted discard with the same request identity', async () => {
  vi.mocked(client.pluginApi.workflows).mockResolvedValue({ items: [result] });
  vi.mocked(client.pluginApi.review).mockRejectedValueOnce(new Error('Connection interrupted')).mockResolvedValue({ ...result, state: 'stopped' });
  await render(); await click('Review'); await click('Discard result');
  expect(host.querySelector('[role="alert"]')?.textContent).toContain('Connection interrupted');
  expect(button('Discard result').disabled).toBe(false);
  await click('Discard result');
  const calls = vi.mocked(client.pluginApi.review).mock.calls;
  expect(calls[0][3]).toBe(calls[1][3]);
  expect(button('Run again')).toBeTruthy();
});

it('never labels the older host task-stop operation as result discard', async () => {
  vi.mocked(client.pluginApi.workflows).mockResolvedValue({ items: [{ ...result, can_discard_result: undefined }] });
  await render(); await click('Review');
  expect(button('Discard result')).toBeUndefined();
  expect(host.textContent).toContain('Update Diane to discard a result without closing its task.');
  expect(client.pluginApi.review).not.toHaveBeenCalled();
  expect(client.pluginApi.stop).not.toHaveBeenCalled();
});

it('preserves a requested-change draft while the same task record revision refreshes', async () => {
  vi.mocked(client.pluginApi.workflows).mockResolvedValue({ items: [result] });
  vi.mocked(client.pluginApi.review).mockResolvedValue({ ...run, state: 'queued' });
  await render(); await click('Review'); await click('Request changes');
  const input = host.querySelector<HTMLTextAreaElement>('textarea')!;
  act(() => { Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!.call(input, 'Check the cited source.'); input.dispatchEvent(new Event('input', { bubbles: true })); });
  await render(task({ revision: 2 }));
  expect(host.querySelector('textarea')).toBe(input); expect(input.value).toBe('Check the cited source.');
  await click('Send changes');
  expect(client.pluginApi.review).toHaveBeenCalledWith(expect.objectContaining({ result_version: 'result-1' }), 'revise', 'Check the cited source.', expect.any(String));
});

it('does not dispatch an unsaved, closed or disabled task', async () => {
  await render(task(), { saving: true }); expect(button('Run').disabled).toBe(true);
  await render(task(), { enabled: false }); expect(button('Run').disabled).toBe(true);
  await render(task({ status: 'done' })); expect(button('Run')).toBeUndefined();
  expect(client.pluginApi.run).not.toHaveBeenCalled();
});

it('stops only the active run through its stop endpoint without accepting or stopping the Todo task', async () => {
  vi.mocked(client.pluginApi.workflows).mockResolvedValue({ items: [run] });
  await render(); await click('Stop run');
  expect(client.pluginApi.stop).toHaveBeenCalledWith(run); expect(client.pluginApi.review).not.toHaveBeenCalled();
  expect(host.textContent).toContain('Run stopped.'); expect(button('Run again')).toBeTruthy();
  expect(button('Run again').closest('details')).toBeNull();
});

it.each(['stopped', 'attention'])('can stop an attention workflow without a run ID and honors the %s acknowledgment', async state => {
  const interrupted = { ...run, state: 'attention' };
  vi.mocked(client.pluginApi.workflows).mockResolvedValue({ items: [interrupted] });
  vi.mocked(client.pluginApi.stop).mockResolvedValue({ ...interrupted, state });
  await render();
  expect(host.textContent).toContain('Needs input');
  await click('Stop run');
  expect(client.pluginApi.stop).toHaveBeenCalledWith(interrupted);
  expect(client.pluginApi.review).not.toHaveBeenCalled();
  if (state === 'stopped') {
    expect(host.textContent).toContain('Run stopped.'); expect(button('Run again')).toBeTruthy();
  } else {
    expect(host.textContent).toContain('Stop requested.'); expect(host.textContent).toContain('Needs input');
    expect(button('Run again')).toBeUndefined(); expect(button('Stop run')).toBeTruthy();
  }
});

it.each(['failed', 'stopped'])('shows Run again directly for a %s run and keeps Open pointed at the previous session', async state => {
  vi.mocked(client.pluginApi.workflows).mockResolvedValue({ items: [{ ...run, state }] });
  await render();
  const retry = button('Run again');
  expect(retry.closest('.todo-execution-row')).toBeTruthy();
  expect(retry.closest('details')).toBeNull();
  expect(retry.disabled).toBe(false);
  expect([...host.querySelectorAll('button')].filter(item => item.textContent === 'Run again')).toHaveLength(1);
  await click('Open');
  expect(client.pluginApi.openWorkflow).toHaveBeenCalledWith(expect.objectContaining({ session_id: 'session-1', project_id: 'research' }));
  await click('Run again'); expect(client.pluginApi.run).toHaveBeenCalledOnce();
});

it('keeps closed tasks closed after a stopped run without offering Run again', async () => {
  vi.mocked(client.pluginApi.workflows).mockResolvedValue({ items: [{ ...run, state: 'stopped' }] });
  await render(task({ status: 'done' }));
  expect(button('Run again')).toBeUndefined(); expect(button('Open')).toBeTruthy();
  expect(client.pluginApi.run).not.toHaveBeenCalled();
});

it('ignores late execution responses after task scope changes or the view becomes inactive', async () => {
  const pending = deferred<Workflow>(); vi.mocked(client.pluginApi.run).mockReturnValue(pending.promise);
  await render(); await click('Run');
  vi.mocked(client.pluginScope).mockReturnValue('owner-b');
  await act(async () => pending.resolve(run));
  expect(host.textContent).not.toContain('Running'); expect(client.pluginApi.openWorkflow).not.toHaveBeenCalled();
  await render(task(), { active: false });
});

it('refreshes an active run once when focus and visibility return together and stops when inactive', async () => {
  vi.useFakeTimers(); vi.mocked(client.pluginApi.workflows).mockResolvedValue({ items: [run] });
  const pending = deferred<Workflow>(); vi.mocked(client.pluginApi.workflow).mockReturnValue(pending.promise);
  await render();
  await act(async () => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
  expect(client.pluginApi.workflow).toHaveBeenCalledOnce();
  await act(async () => pending.resolve(result)); expect(button('Review')).toBeTruthy();
  await render(task(), { active: false });
  await act(async () => vi.advanceTimersByTimeAsync(12000));
  expect(client.pluginApi.workflow).toHaveBeenCalledOnce();
});
