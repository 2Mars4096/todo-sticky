import { loadSettings, type AppSettings } from './config'

interface LLMConfig {
  provider: string
  apiBase: string
  apiKey: string
  model: string
}

interface BreakdownInput {
  taskText: string
  existingSubtasks: string[]
}

interface ScheduleInput {
  tasks: any[]
  machines: any[]
}

function getConfig(): LLMConfig {
  const s = loadSettings()
  return { provider: s.provider, apiBase: s.apiBase, apiKey: s.apiKey, model: s.model }
}

async function openaiCompletion(apiBase: string, apiKey: string, model: string, messages: { role: string; content: string }[]): Promise<string> {
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
    throw new Error(`API error ${resp.status}: ${text}`)
  }
  const data: any = await resp.json()
  return data.choices?.[0]?.message?.content || ''
}

async function anthropicCompletion(apiBase: string, apiKey: string, model: string, messages: { role: string; content: string }[]): Promise<string> {
  const systemMsg = messages.find(m => m.role === 'system')
  const userMessages = messages.filter(m => m.role !== 'system')

  const resp = await fetch(`${apiBase}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      messages: userMessages.map(m => ({ role: m.role, content: m.content })),
    }),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`API error ${resp.status}: ${text}`)
  }
  const data: any = await resp.json()
  return data.content?.[0]?.text || ''
}

async function geminiCompletion(apiBase: string, apiKey: string, model: string, messages: { role: string; content: string }[]): Promise<string> {
  const systemMsg = messages.find(m => m.role === 'system')
  const userMessages = messages.filter(m => m.role !== 'system')

  const contents = userMessages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  const body: any = { contents, generationConfig: { temperature: 0.4 } }
  if (systemMsg) {
    body.systemInstruction = { parts: [{ text: systemMsg.content }] }
  }

  const resp = await fetch(`${apiBase}/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`API error ${resp.status}: ${text}`)
  }
  const data: any = await resp.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || ''
}

async function chatCompletion(messages: { role: string; content: string }[], configOverride?: LLMConfig): Promise<string> {
  const { provider, apiBase, apiKey, model } = configOverride || getConfig()
  if (!apiKey) throw new Error('API key not configured. Open Settings to add your key.')

  switch (provider) {
    case 'anthropic':
      return anthropicCompletion(apiBase, apiKey, model, messages)
    case 'gemini':
      return geminiCompletion(apiBase, apiKey, model, messages)
    default:
      return openaiCompletion(apiBase, apiKey, model, messages)
  }
}

export async function testConnection(config: LLMConfig): Promise<{ ok: boolean; message: string }> {
  try {
    const reply = await chatCompletion(
      [{ role: 'user', content: 'Reply with exactly one word: ok' }],
      config,
    )
    return { ok: true, message: reply.slice(0, 80) }
  } catch (e: any) {
    return { ok: false, message: e.message || 'Connection failed' }
  }
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
  const settings = loadSettings()
  if (settings.machines.length > 0) return settings.machines
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
