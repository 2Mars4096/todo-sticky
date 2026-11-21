import { ui } from './interfaceLocale'
import { createContext, useContext } from 'react';
import type { Workflow } from '@diane/plugin-sdk/client';
import { workflowLabel } from './taskExecutionState';

export type WorkflowStatuses = {byId: Record<string, Workflow | null>; unavailable: boolean; checkedAt?: string};
export const TaskWorkflowContext = createContext<WorkflowStatuses>({byId: {}, unavailable: false});

export function TaskWorkflowStatus({taskId}: {taskId: string}) {
  const {byId, unavailable, checkedAt} = useContext(TaskWorkflowContext);
  const workflow = byId[taskId];
  if (!workflow) return null;
  const state = workflow.state === 'running' ? 'Working' : workflowLabel(workflow.state);
  const label = unavailable ? ui("Status unavailable") : state;
  return <span className={`todo-workflow-badge ${unavailable ? 'is-unavailable' : ''}`}
    title={unavailable ? ui("Last known: {0}{1}", [state, checkedAt ? '. Checked ' + new Date(checkedAt).toLocaleTimeString() : '']) : ui("Diane · {0}", [state])}>{label}</span>;
}
