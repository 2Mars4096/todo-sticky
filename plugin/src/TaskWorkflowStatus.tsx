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
  const label = unavailable ? 'Status unavailable' : state;
  return <span className={`todo-workflow-badge ${unavailable ? 'is-unavailable' : ''}`}
    title={unavailable ? `Last known: ${state}${checkedAt ? '. Checked ' + new Date(checkedAt).toLocaleTimeString() : ''}` : 'Diane · ' + state}>{label}</span>;
}
