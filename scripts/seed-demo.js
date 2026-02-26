#!/usr/bin/env node
/**
 * Seeds the knowledge base with demo tasks for showcase recording.
 * Run: npm run seed-demo  (or: node scripts/seed-demo.js)
 * Uses: VITE_KB_PATH from .env (resolved from project root), or ../my-knowledge-base
 */

const fs = require('fs')
const path = require('path')

const projectRoot = path.join(__dirname, '..')

// Load .env
const envPath = path.join(projectRoot, '.env')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const m = line.trim().match(/^([^#=]+)=(.*)$/)
    if (m) {
      const val = m[2].trim().replace(/^["']|["']$/g, '')
      process.env[m[1].trim()] = val
    }
  })
}

// Resolve KB path: support relative paths from project root
function resolveKbPath() {
  let raw = process.env.VITE_KB_PATH || ''
  raw = raw.trim().replace(/^["']|["']$/g, '')
  if (!raw) return path.join(projectRoot, '..', 'my-knowledge-base')
  const resolved = path.isAbsolute(raw) ? raw : path.resolve(projectRoot, raw)
  const todoDir = path.join(resolved, 'content', 'to-do')
  if (fs.existsSync(todoDir) || !fs.existsSync(path.join(projectRoot, '..', 'my-knowledge-base', 'content', 'to-do'))) {
    return resolved
  }
  // Fallback: use my-knowledge-base if resolved path doesn't have to-do
  return path.join(projectRoot, '..', 'my-knowledge-base')
}

const kbPath = resolveKbPath()
const todoDir = path.join(kbPath, 'content', 'to-do')

function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getWeekStart(d) {
  const day = d.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(d)
  monday.setDate(monday.getDate() + mondayOffset)
  return toDateStr(monday)
}

function serializeTasks(tasks, indent = 0) {
  const pad = '  '.repeat(indent)
  let result = ''
  for (const t of tasks) {
    const c = { todo: ' ', done: 'x', partial: '~', question: '?' }[t.status] || ' '
    result += `${pad}- [${c}] ${t.text}\n`
    if (t.subtasks?.length) result += serializeTasks(t.subtasks, indent + 1)
  }
  return result
}

function serializeSection(date, tasks) {
  return `## ${date}\n` + serializeTasks(tasks)
}

// Unique pseudo tasks per day index (0 = oldest, N = today, N+1 = future)
const PAST_TASKS = [
  [{ text: 'Refactor auth module', status: 'done', subtasks: [] }, { text: 'Fix login redirect bug', status: 'done', subtasks: [] }],
  [{ text: 'Team standup', status: 'done', subtasks: [{ text: 'Share blockers', status: 'done', subtasks: [] }] }, { text: 'Sprint planning', status: 'done', subtasks: [] }],
  [{ text: 'Code review PR #142', status: 'done', subtasks: [] }, { text: 'Merge feature branch', status: 'done', subtasks: [] }],
  [{ text: 'Documentation update', status: 'partial', subtasks: [{ text: 'API docs', status: 'done', subtasks: [] }, { text: 'Changelog', status: 'todo', subtasks: [] }] }],
  [{ text: 'Research spike: caching', status: 'done', subtasks: [] }, { text: 'Draft tech spec', status: 'done', subtasks: [] }],
  [{ text: 'Meeting with PM', status: 'done', subtasks: [] }, { text: 'Update Jira tickets', status: 'done', subtasks: [] }],
  [{ text: 'Fix CI pipeline', status: 'done', subtasks: [] }, { text: 'Add E2E tests', status: 'partial', subtasks: [] }],
]
// Today's tasks — concrete, actionable; showcase Schedule → machine distribution
const TODAY_TASKS = [
  { text: 'Merge Panjiva 2024 Q1–Q3 exports by HS code', status: 'todo', subtasks: [] },
  { text: 'Scrape Amazon/Wayfair prices for 12 furniture SKUs', status: 'todo', subtasks: [] },
  { text: 'Run GNN ablation: 3-layer vs 5-layer, 10 epochs each', status: 'todo', subtasks: [] },
  { text: 'Write supply chain transparency lit review (draft 2 pages)', status: 'todo', subtasks: [] },
  { text: 'Code review: PR #89 — Orbis name-matching module', status: 'todo', subtasks: [] },
  { text: 'Download USMCA bill-of-lading data for March 2024', status: 'todo', subtasks: [] },
  { text: 'Draft methodology section for trade credit paper', status: 'todo', subtasks: [] },
  { text: 'Fix CI: update pytest to 8.x, resolve deprecation warnings', status: 'todo', subtasks: [] },
]
const FUTURE_TASKS = [
  [{ text: 'Deploy to staging', status: 'todo', subtasks: [] }, { text: 'Smoke tests', status: 'todo', subtasks: [] }],
  [{ text: 'User testing session', status: 'todo', subtasks: [] }, { text: 'Collect feedback', status: 'todo', subtasks: [] }],
  [{ text: 'Write release notes', status: 'todo', subtasks: [] }, { text: 'Tag v1.0.0', status: 'todo', subtasks: [] }],
  [{ text: 'Backup database', status: 'todo', subtasks: [] }, { text: 'Archive old branches', status: 'todo', subtasks: [] }],
  [{ text: 'Retrospective meeting', status: 'todo', subtasks: [] }, { text: 'Plan next sprint', status: 'todo', subtasks: [] }],
]

function getTasksForDate(dateStr, todayStr, dateIndex, todayIndex) {
  if (dateStr === todayStr) return TODAY_TASKS
  if (dateIndex < todayIndex) return PAST_TASKS[dateIndex % PAST_TASKS.length]
  return FUTURE_TASKS[(dateIndex - todayIndex - 1) % FUTURE_TASKS.length]
}

// Build date range: 7 days ago through 4 days ahead
const today = new Date()
const todayStr = toDateStr(today)
const dates = []
for (let i = -7; i <= 4; i++) {
  const d = new Date(today)
  d.setDate(d.getDate() + i)
  dates.push(toDateStr(d))
}

// Group dates by week (weekStart -> [dateStr, ...])
const weekToDates = new Map()
for (const dateStr of dates) {
  const weekStart = getWeekStart(new Date(dateStr + 'T12:00:00'))
  if (!weekToDates.has(weekStart)) weekToDates.set(weekStart, [])
  weekToDates.get(weekStart).push(dateStr)
}

// Sort dates within each week
for (const arr of weekToDates.values()) arr.sort()

fs.mkdirSync(todoDir, { recursive: true })

const written = []
for (const [weekStart, dateStrs] of weekToDates) {
  const weekDir = path.join(todoDir, weekStart)
  const filePath = path.join(weekDir, 'index.md')
  fs.mkdirSync(weekDir, { recursive: true })

  const sections = []
  for (const dateStr of dateStrs) {
    const dateIndex = dates.indexOf(dateStr)
    const todayIndex = dates.indexOf(todayStr)
    const tasks = getTasksForDate(dateStr, todayStr, dateIndex, todayIndex)
    sections.push(serializeSection(dateStr, tasks))
  }

  const frontmatter = `---
title: Weekly Report ${weekStart}
subtitle: Demo for showcase
date: '${new Date().toISOString()}'
draft: false
---

`
  const content = frontmatter + sections.join('\n\n') + '\n'
  fs.writeFileSync(filePath, content, 'utf-8')
  written.push(filePath)
}

console.log('Demo data written to:')
written.forEach((p) => console.log('  ', p))
console.log('\nDates covered:', dates[0], '→', dates[dates.length - 1])
console.log('Today:', todayStr)
console.log('\nStart the app with: npm start')
console.log('Ensure .env VITE_KB_PATH points to your knowledge base (e.g. ../my-knowledge-base)')
