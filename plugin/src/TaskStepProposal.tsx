import { createContext, useContext } from 'react';
import type { StepProposal } from './stepProposal';

export const StepProposalContext = createContext<{
  proposal: StepProposal | null; stale: boolean; busy: boolean;
  edit: (index: number, text: string) => void; remove: (index: number) => void;
  apply: () => void; dismiss: () => void;
} | null>(null);

export function TaskStepProposal({taskId}: {taskId: string}) {
  const context = useContext(StepProposalContext);
  if (!context?.proposal || context.proposal.taskId !== taskId) return null;
  const {proposal, stale, busy} = context;
  return <section className="todo-step-proposal" aria-label="Suggested steps">
    <strong>Suggested steps</strong>
    <ol>{proposal.steps.map((text, index) => <li key={index}>
      <textarea aria-label={`Suggested step ${index + 1}`} rows={2} value={text} disabled={busy}
        onChange={event => context.edit(index, event.target.value)} />
      <button type="button" aria-label={`Remove suggested step ${index + 1}`} disabled={busy} onClick={() => context.remove(index)}>×</button>
    </li>)}</ol>
    {stale && <p role="status">Task changed. Generate new suggestions before adding steps.</p>}
    <div><button type="button" disabled={busy || stale || !proposal.steps.length || proposal.steps.some(text => !text.trim() || text.length > 5000)} onClick={context.apply}>Add steps</button>
      <button type="button" disabled={busy} onClick={context.dismiss}>Cancel</button></div>
  </section>;
}
