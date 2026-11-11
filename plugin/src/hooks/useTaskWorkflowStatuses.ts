import { useEffect, useMemo, useState } from 'react';
import { pluginScope } from '@diane/plugin-sdk/client';
import { subscribeToPluginChanges } from '@diane/plugin-sdk/records';
import { createTodoApi } from '../api';
import type { AggregatedTask, Task } from '../types';
import type { WorkflowStatuses } from '../TaskWorkflowStatus';

const emptyStatus: WorkflowStatuses = {byId: {}, unavailable: false};

export function executionTaskIds(tasks: AggregatedTask[]) {
  const ids = new Set<string>();
  const add = (task: Task) => { ids.add(task.id); task.subtasks.forEach(add); };
  for (const task of tasks) { ids.add(task.originalId ?? task.id); task.todaySubtasks.forEach(add); }
  return [...ids].sort();
}

/** One coalesced polling lifetime for the visible task surface, in bounded batches. */
export function useTaskWorkflowStatuses(scope: string, tasks: AggregatedTask[], active: boolean): WorkflowStatuses {
  const api = useMemo(() => createTodoApi(scope), [scope]);
  const signature = JSON.stringify(executionTaskIds(tasks));
  const [snapshot, setSnapshot] = useState<{scope: string; status: WorkflowStatuses}>(() => ({scope, status: emptyStatus}));
  useEffect(() => {
    let disposed = false, inFlight = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController(), ids: string[] = JSON.parse(signature);
    setSnapshot(previous => ({scope, status: active && ids.length && previous.scope === scope
      ? {...previous.status, byId: Object.fromEntries(Object.entries(previous.status.byId).filter(([id]) => ids.includes(id)))}
      : emptyStatus}));
    if (!active || !ids.length) return;
    const tick = async () => {
      if (disposed || inFlight || document.hidden || pluginScope() !== scope) return;
      if (timer) clearTimeout(timer);
      inFlight = true;
      let delay = 15000;
      try {
        const byId: WorkflowStatuses['byId'] = {};
        for (let start = 0; start < ids.length; start += 100) {
          Object.assign(byId, await api.workflowStatuses(ids.slice(start, start + 100), controller.signal));
          if (disposed || pluginScope() !== scope) return;
        }
        if (Object.values(byId).some(workflow => workflow && ['pending_dispatch', 'queued', 'running', 'attention'].includes(workflow.state))) delay = 4000;
        setSnapshot({scope, status: {byId, unavailable: false, checkedAt: new Date().toISOString()}});
      } catch {
        if (!disposed && pluginScope() === scope) setSnapshot(previous => ({scope,
          status: {...(previous.scope === scope ? previous.status : emptyStatus), unavailable: true}}));
      } finally {
        inFlight = false;
        if (!disposed && pluginScope() === scope) timer = setTimeout(tick, delay);
      }
    };
    void tick();
    const refresh = () => { void tick(); };
    const workflowChanged = (event: Event) => { if ((event as CustomEvent<{scope?:string}>).detail?.scope === scope) refresh(); };
    const unsubscribe = subscribeToPluginChanges('todo', refresh, scope);
    window.addEventListener('diane:todo-workflows-changed', workflowChanged);
    window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh);
    return () => { disposed = true; controller.abort(); if (timer) clearTimeout(timer); unsubscribe(); window.removeEventListener('diane:todo-workflows-changed', workflowChanged); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, [scope, signature, active, api]);
  // Effects run after rendering: never expose another account's snapshot for even
  // one frame when imported task IDs overlap across accounts.
  return active && snapshot.scope === scope && pluginScope() === scope ? snapshot.status : emptyStatus;
}
