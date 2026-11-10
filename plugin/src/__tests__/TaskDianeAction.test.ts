// @vitest-environment happy-dom
import { act, createElement as h, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import * as client from '@diane/plugin-sdk/client';
import type { PluginRecord } from '@diane/plugin-sdk/client';
const { taskRecord } = vi.hoisted(() => ({ taskRecord: vi.fn() }));
vi.mock('../api', () => ({ createTodoApi: () => ({ taskRecord }) }));
vi.mock('../TaskExecution', () => ({ TaskExecution: ({ task, saving }: { task: PluginRecord; saving: boolean }) => {
  const [draft, setDraft] = useState('');
  return h('section', { 'data-revision': task.revision, 'data-saving': String(saving) }, h('input', { value: draft, onChange: (event: React.ChangeEvent<HTMLInputElement>) => setDraft(event.target.value) }));
} }));
import { TaskDianeAction } from '../TaskDianeAction';
import { TodoPortContext } from '../TodoPortContext';

const record = (revision = 1): PluginRecord => ({ plugin_id: 'todo', record_type: 'task', record_id: 'task-a', revision,
  schema_version: 1, title: 'Task', text: 'Task text', status: 'todo', tags: [], relationships: [], attachments: [], extensions: {}, created_at: 'now', updated_at: 'now' });
function deferred() { let resolve!: () => void; return { promise: new Promise<void>(done => { resolve = done; }), resolve }; }
let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
beforeEach(() => { Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true }); vi.spyOn(client, 'pluginScope').mockReturnValue('owner-a'); taskRecord.mockReset().mockResolvedValue(record()); host = document.createElement('div'); document.body.append(host); root = createRoot(host); });
afterEach(() => { act(() => root.unmount()); host.remove(); vi.restoreAllMocks(); });
const render = async (flush: () => Promise<void>, taskKey = 'draft-1', scope = 'owner-a') => {
  await act(async () => root.render(h(TodoPortContext.Provider, { value: { scope, taskKey, flush, active: true, enabled: true } }, h(TaskDianeAction, { id: 'task-a' }))));
};

it('waits for saved canonical content and preserves the execution input through task revisions and retryable save failure', async () => {
  const first = deferred(), flush = vi.fn(() => first.promise);
  await render(flush); expect(taskRecord).not.toHaveBeenCalled(); expect(host.textContent).toContain('Saving task…');
  await act(async () => first.resolve()); expect(taskRecord).toHaveBeenCalledOnce();
  const input = host.querySelector<HTMLInputElement>('input')!;
  act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'Keep my revision draft'); input.dispatchEvent(new Event('input', { bubbles: true })); });
  const saving = deferred(); flush.mockReturnValueOnce(saving.promise); taskRecord.mockResolvedValue(record(2));
  await render(flush, 'draft-2'); expect(host.querySelector('[data-saving]')?.getAttribute('data-saving')).toBe('true');
  expect(host.querySelector('input')).toBe(input);
  await act(async () => saving.resolve());
  expect(host.querySelector('[data-revision]')?.getAttribute('data-revision')).toBe('2'); expect(input.value).toBe('Keep my revision draft');
  flush.mockRejectedValueOnce(new Error('Save unavailable'));
  await render(flush, 'draft-3'); expect(host.querySelector('[role="alert"]')?.textContent).toContain('Save unavailable');
  expect(host.querySelector('[data-saving]')?.getAttribute('data-saving')).toBe('true');
  await act(async () => host.querySelector<HTMLButtonElement>('[role="alert"] button')!.click());
  expect(host.querySelector('[role="alert"]')).toBeNull(); expect(host.querySelector('[data-saving]')?.getAttribute('data-saving')).toBe('false');
  expect(host.querySelector('input')).toBe(input); expect(input.value).toBe('Keep my revision draft');
});

it('does not display or request a stale account task after an in-flight save', async () => {
  const first = deferred(); await render(() => first.promise);
  vi.mocked(client.pluginScope).mockReturnValue('owner-b');
  await render(async () => {}, 'other-draft', 'owner-b');
  await act(async () => first.resolve());
  expect(taskRecord).toHaveBeenCalledOnce(); expect(host.querySelector('[data-revision]')).toBeTruthy();
});
