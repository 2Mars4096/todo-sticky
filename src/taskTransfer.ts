export interface TransferTask {
  text: string
  subtasks: string[]
}

const LIST_PREFIX = /^\s*(?:(?:[-*+])|(?:\d+[.)]))\s+(?:\[[ xX~?]\]\s*)?/
const TASK_LABEL = /^\s*(?:task|objective)\s*:\s*/i
const SECTION_LABEL = /^\s*(?:steps|subtasks|checklist)\s*:?\s*$/i

function cleanTaskLine(line: string) {
  return line
    .replace(LIST_PREFIX, '')
    .replace(TASK_LABEL, '')
    .trim()
}

export function formatTaskChecklist(task: TransferTask) {
  return [
    `- [ ] ${task.text.trim()}`,
    ...task.subtasks
      .map(step => step.trim())
      .filter(Boolean)
      .map(step => `  - [ ] ${step}`),
  ].join('\n')
}

export function parseTaskChecklist(raw: string): TransferTask | null {
  const lines = raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .filter(line => line.trim())

  const taskLineIndex = lines.findIndex(line => !SECTION_LABEL.test(line))
  if (taskLineIndex < 0) return null

  const text = cleanTaskLine(lines[taskLineIndex])
  if (!text) return null

  const subtasks = lines
    .slice(taskLineIndex + 1)
    .filter(line => !SECTION_LABEL.test(line))
    .map(cleanTaskLine)
    .filter(Boolean)

  return { text, subtasks }
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
