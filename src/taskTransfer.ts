export interface TransferTask {
  text: string
  subtasks: string[]
}

export function formatAgentPrompt(task: TransferTask) {
  const steps = task.subtasks
    .map(step => step.trim())
    .filter(Boolean)

  return [
    'Execute the following task completely.',
    '',
    'Objective',
    task.text.trim(),
    '',
    'Checklist',
    ...(steps.length
      ? steps.map(step => `- ${step}`)
      : ['- Determine the concrete steps needed to complete the objective.']),
    '',
    'Working rules',
    '- Inspect the relevant context before making changes.',
    '- Preserve existing work and avoid unrelated changes.',
    '- Complete the checklist, then verify the result in proportion to risk.',
    '- If blocked, report the exact blocker and the safest next action.',
    '',
    'Return',
    '- Outcome',
    '- Changes made',
    '- Verification performed',
    '- Remaining blockers or follow-ups',
  ].join('\n')
}
