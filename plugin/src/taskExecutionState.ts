import { newId, type PluginRecord, type Project, type TaskPreparation, type Workflow } from '@diane/plugin-sdk/client';

export type ProjectChoice = { project_id: string; root: string };
const choices = new Map<string, ProjectChoice | null>();
const requests = new Map<string, { signature: string; requestId: string }>();
const rootKey = (root: string) => root.replace(/[\\/]+$/, '');
export const taskScopeKey = (task: PluginRecord) => task._scope ? `${encodeURIComponent(task._scope)}:${encodeURIComponent(task.record_id)}` : '';
const choiceKey = (task: PluginRecord) => `diane:todo-workspace:v1:${taskScopeKey(task)}`;

/** Keep existing local overrides, including an intentionally cleared choice. */
export function readProjectChoice(task: PluginRecord): ProjectChoice | undefined {
  if (!taskScopeKey(task)) return;
  const key = choiceKey(task);
  if (choices.has(key)) return choices.get(key) || undefined;
  let raw: string | null;
  try { raw = localStorage.getItem(key); } catch { return; }
  if (raw === null) return;
  try {
    const value = JSON.parse(raw) as Partial<ProjectChoice>;
    if (value && typeof value.project_id === 'string' && typeof value.root === 'string') return { project_id: value.project_id, root: value.root };
  } catch { /* A corrupt saved override must not silently choose another project. */ }
  return { project_id: '', root: '' };
}

export function saveProjectChoice(task: PluginRecord, value: ProjectChoice | undefined) {
  if (!taskScopeKey(task)) return;
  const key = choiceKey(task);
  try {
    if (value) localStorage.setItem(key, JSON.stringify(value)); else localStorage.removeItem(key);
    choices.delete(key);
  } catch { choices.set(key, value || null); }
}

export function executionProject(task: PluginRecord, projects: Project[], choice: ProjectChoice | undefined, preparation?: TaskPreparation) {
  if (choice !== undefined) return projects.find(project => project.id === choice.project_id && Boolean(project.root) && Boolean(choice.root) && rootKey(project.root) === rootKey(choice.root));
  if (preparation?.state !== 'ready' || preparation.task_revision !== task.revision || !preparation.fingerprint || !preparation.workspace_root) return;
  if (task._scope && preparation._scope && task._scope !== preparation._scope) return;
  // Canonical server roots may resolve a registered symlink differently.
  return projects.find(project => project.id === preparation.project_id && Boolean(project.root));
}

/** Only request identity is retained locally; workflow/session truth stays on the server. */
export function runRequestId(task: PluginRecord, project: string, fingerprint: string | undefined, previous?: Workflow) {
  const key = `todo-diane-run-request:v1:${taskScopeKey(task)}`;
  const signature = JSON.stringify([task.revision, project, fingerprint || '', previous?.workflow_id || '']);
  let remembered = requests.get(key);
  if (!remembered) {
    try { remembered = JSON.parse(localStorage.getItem(key) || 'null'); } catch { /* Memory still protects retries in this view. */ }
  }
  if (remembered?.signature === signature && typeof remembered.requestId === 'string' && remembered.requestId) return remembered.requestId;
  const next = { signature, requestId: newId() };
  requests.set(key, next);
  try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* Retain the in-memory identity. */ }
  return next.requestId;
}

export const unfinishedTask = (task: PluginRecord) => !task.deleted && !['done', 'stopped', 'completed', 'cancelled', 'canceled', 'archived'].includes(task.status) && task.extensions.archived !== true;
export const activeWorkflow = (workflow?: Workflow) => Boolean(workflow && ['pending_dispatch', 'queued', 'running', 'attention'].includes(workflow.state));
export const reviewableWorkflow = (workflow?: Workflow) => Boolean(workflow?.result_version && ['awaiting_review', 'deferred'].includes(workflow.state));
export const workflowLabel = (state: string) => ({ pending_dispatch: 'Starting…', queued: 'Queued', running: 'Running', attention: 'Needs input', awaiting_review: 'Ready to review', deferred: 'Review later', accepted: 'Accepted', stopped: 'Stopped', failed: 'Failed' }[state] || state.replaceAll('_', ' '));
export const sessionHref = (workflow: Workflow) => workflow.session_id ? `/?${new URLSearchParams({ session: workflow.session_id, workflow: workflow.project_id })}#workspace` : undefined;

type PreviousSession = { key: string; label: string; workflow: Workflow };
const dispatchId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** The host currently includes at most five prior attempts on its active workflow. */
export function previousSessions(runs: Workflow[]): PreviousSession[] {
  const result: PreviousSession[] = [], seen = new Set<string>();
  if (runs[0]?.session_id) seen.add(`${runs[0].dispatch_id}:${runs[0].session_id}`);
  const add = (workflow: Workflow, label: string) => {
    if (!workflow.session_id) return;
    const key = `${workflow.dispatch_id}:${workflow.session_id}`;
    if (!seen.has(key)) { seen.add(key); result.push({ key, label, workflow }); }
  };
  for (const [index, workflow] of runs.entries()) {
    if (index) add(workflow, workflowLabel(workflow.state));
    // These existing backend fields are intentionally validated at the boundary:
    // the public SDK type does not yet promise historical workflow records.
    const payload = workflow as Workflow & { attempt?: unknown; history?: unknown };
    if (!Number.isSafeInteger(payload.attempt) || !Array.isArray(payload.history)) continue;
    for (const raw of [...payload.history].reverse()) {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
      const item = raw as Record<string, unknown>;
      if (!Number.isSafeInteger(item.attempt) || (item.attempt as number) < 1 || (item.attempt as number) >= (payload.attempt as number)
        || typeof item.dispatch_id !== 'string' || !dispatchId.test(item.dispatch_id)
        || typeof item.session_id !== 'string' || !item.session_id.trim()
        || item.task_id !== undefined && item.task_id !== workflow.task_id
        || item.project_id !== undefined && item.project_id !== workflow.project_id
        || item._scope !== undefined && item._scope !== workflow._scope) continue;
      // Only Open receives this read-only reference. Never review or stop history.
      add({ workflow_id: workflow.workflow_id, task_id: workflow.task_id, task_revision: workflow.task_revision,
        project_id: workflow.project_id, request_id: workflow.request_id, dispatch_id: item.dispatch_id,
        session_id: item.session_id, state: 'previous', _scope: workflow._scope }, `Run ${item.attempt}`);
    }
  }
  return result;
}
