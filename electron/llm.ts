const getConfig = () => ({
  apiBase: process.env.VITE_LLM_API_BASE || 'https://api.vectorengine.ai/v1',
  apiKey: process.env.VITE_LLM_API_KEY || '',
  model: process.env.VITE_LLM_MODEL || 'claude-sonnet-4-20250514',
})

interface BreakdownInput {
  taskText: string
  existingSubtasks: string[]
}

interface ScheduleInput {
  tasks: any[]
  machines: any[]
}

async function chatCompletion(messages: { role: string; content: string }[]): Promise<string> {
  const { apiBase, apiKey, model } = getConfig()
  if (!apiKey) throw new Error('LLM API key not configured. Set VITE_LLM_API_KEY in .env')

  const resp = await fetch(`${apiBase}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.4 }),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`LLM API error ${resp.status}: ${text}`)
  }

  const data: any = await resp.json()
  return data.choices?.[0]?.message?.content || ''
}

async function breakdown(input: BreakdownInput): Promise<{ subtasks: { text: string; estimatedMinutes?: number; machineTask?: boolean }[] }> {
  const existingContext = input.existingSubtasks.length > 0
    ? `\nExisting subtasks:\n${input.existingSubtasks.map(s => `- ${s}`).join('\n')}`
    : ''

  const messages = [
    {
      role: 'system',
      content: `You are a task planning assistant. Break down tasks into actionable subtasks.
Return ONLY valid JSON with this structure:
{"subtasks": [{"text": "subtask description", "estimatedMinutes": 30, "machineTask": false}]}
Keep subtasks concrete and actionable. Estimate time realistically. Mark machineTask=true for tasks that can run unattended on a computer (data processing, downloads, builds, scraping, etc).`,
    },
    {
      role: 'user',
      content: `Break down this task into subtasks:\n"${input.taskText}"${existingContext}`,
    },
  ]

  const content = await chatCompletion(messages)
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { subtasks: [] }

  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    return { subtasks: [] }
  }
}

function getMachines(overrides: any[]): any[] {
  if (overrides.length > 0) return overrides
  const raw = process.env.VITE_MACHINES
  if (raw) {
    try { return JSON.parse(raw) } catch { /* fall through */ }
  }
  return [
    { name: 'mini', type: 'server', specs: '18-core CPU, 64GB RAM, Ubuntu', capabilities: ['data processing', 'model training', 'long-running jobs'] },
    { name: 'mac', type: 'workstation', specs: 'Apple M4 Pro, 48GB RAM, macOS', capabilities: ['coding', 'writing', 'analysis', 'web browsing'] },
  ]
}

async function schedule(input: ScheduleInput): Promise<any> {
  const machines = getMachines(input.machines)
  const machineDesc = `\nAvailable machines:\n${machines.map((m: any) => {
    const specs = m.specs ? ` — ${m.specs}` : ''
    const caps = (m.capabilities || []).join(', ')
    return `- ${m.name} (${m.type}${specs}): ${caps}`
  }).join('\n')}`

  const taskList = input.tasks
    .map((t: any) => {
      const deadline = t.deadline ? ` [deadline: ${t.deadline}]` : ''
      const est = t.estimatedMinutes ? ` [~${t.estimatedMinutes}min]` : ''
      const todaySubs = (t.todaySubtasks || t.subtasks || [])
      const subs = todaySubs.length ? `\n  Subtasks: ${todaySubs.map((s: any) => s.text).join(', ')}` : ''
      return `- ${t.text}${deadline}${est}${subs}`
    })
    .join('\n')

  const today = new Date()
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })

  const messages = [
    {
      role: 'system',
      content: `You are an intelligent scheduling optimizer for a researcher/PhD student.
Create an efficient daily plan that maximizes productivity.

Key principles:
- Minimize context-switching friction (group similar tasks together)
- Maximize machine utilization (keep servers busy with automated/long-running tasks in parallel)
- Prioritize deadline-sensitive tasks
- Reserve human time for highest-value non-automatable work (thinking, writing, analysis)
- Account for startup/switching costs between different types of work
- Schedule deep-focus research work in prime morning hours
- Put routine/mechanical tasks in afternoon

Return ONLY valid JSON with this exact structure (no markdown, no explanation outside JSON):
{
  "plan": "2-3 sentence summary of the daily strategy",
  "schedule": [
    {"time": "09:00", "endTime": "09:45", "parentTask": "exact main task text from the list", "action": "specific subtask action to take", "assignedTo": "human or machine name"}
  ]
}

IMPORTANT:
- "parentTask" MUST exactly match one of the main task texts from the input list (verbatim, case-sensitive).
- Each schedule entry becomes a subtask under its parentTask. Write "action" as a clear, actionable step.
- A single parentTask can have multiple schedule entries at different times.
- Cover ALL input tasks. Include machine-parallelized work as entries with assignedTo set to the machine name.`,
    },
    {
      role: 'user',
      content: `Create an optimal schedule for today (${dayName}).\nAssuming 8 productive hours (9am-5pm) for human work, machines can run 24/7.\n\nTasks:\n${taskList}${machineDesc}`,
    },
  ]

  const content = await chatCompletion(messages)
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { plan: content, schedule: [] }

  try {
    return JSON.parse(jsonMatch[0])
  } catch {
    return { plan: content, schedule: [] }
  }
}

export async function callLLM(action: 'breakdown' | 'schedule', input: any): Promise<any> {
  if (action === 'breakdown') return breakdown(input)
  if (action === 'schedule') return schedule(input)
  throw new Error(`Unknown LLM action: ${action}`)
}
