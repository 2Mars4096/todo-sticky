import type { AggregatedTask, Task } from './types';
import type { TaskUndo } from './taskHistory';

export type StepProposal = { taskId: string; date: string; taskKey: string; title: string; steps: string[] };

export function proposedSteps(value: unknown, existing: string[]): string[] {
  if (!Array.isArray(value) || value.length > 8) throw Error('Ask for up to eight concise steps. Your task is unchanged.');
  const seen = new Set(existing.map(text => text.trim().toLocaleLowerCase()));
  return value.flatMap(item => {
    if (!item || typeof item !== 'object' || typeof item.text !== 'string' || !item.text.trim() || item.text.length > 5000) {
      throw Error('A suggested step is incomplete. Your task is unchanged.');
    }
    const text = item.text.trim(), key = text.toLocaleLowerCase();
    if (seen.has(key)) return [];
    seen.add(key); return [text];
  });
}

export function applyStepsWithUndo(tasks: AggregatedTask[], date: string, taskId: string, texts: string[], newId: () => string) {
  const before = tasks.find(task => task.id === taskId);
  if (!before || ['done', 'stopped'].includes(before.status)) return null;
  const steps = proposedSteps(texts.map(text => ({text})), before.todaySubtasks.map(step => step.text));
  if (!steps.length) return null;
  const additions: Task[] = steps.map(text => ({id: newId(), text, status: 'todo', subtasks: [], ...(before.goalId ? {goalId: before.goalId} : {})}));
  const after = {...before, finish: before.finish ? {...before.finish, reviewReady: false} : undefined, todaySubtasks: [...before.todaySubtasks, ...additions]};
  const undo: TaskUndo = {kind: 'plan', date, label: 'Suggested steps added', before: [before], after: [after]};
  return {tasks: tasks.map(task => task.id === taskId ? after : task), undo};
}
