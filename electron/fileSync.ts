import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import { parseWeeklyFile, serializeDateSection, serializeTasks } from './markdown'
import type { Task } from './markdown'

export function listWeeklyFiles(todoDir: string): string[] {
  if (!existsSync(todoDir)) return []
  return readdirSync(todoDir)
    .filter(name => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .sort()
    .reverse()
}

export function findWeeklyFile(todoDir: string, dateStr: string): { filePath: string; weekStart: string } | null {
  const dirs = listWeeklyFiles(todoDir)
  if (dirs.length === 0) return null

  const targetDate = new Date(dateStr + 'T00:00:00')

  for (const dir of dirs) {
    const dirDate = new Date(dir + 'T00:00:00')
    if (dirDate <= targetDate) {
      const filePath = path.join(todoDir, dir, 'index.md')
      if (existsSync(filePath)) {
        return { filePath, weekStart: dir }
      }
    }
  }

  const filePath = path.join(todoDir, dirs[dirs.length - 1], 'index.md')
  if (existsSync(filePath)) {
    return { filePath, weekStart: dirs[dirs.length - 1] }
  }

  return null
}

export function writeBackSection(filePath: string, dateStr: string, newSection: string): void {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')

  const headingRe = new RegExp(`^##\\s+${dateStr}\\s*$`)
  let sectionStart = -1
  let sectionEnd = lines.length

  for (let i = 0; i < lines.length; i++) {
    if (headingRe.test(lines[i])) {
      sectionStart = i
      for (let j = i + 1; j < lines.length; j++) {
        if (/^##\s/.test(lines[j])) {
          sectionEnd = j
          break
        }
      }
      break
    }
  }

  let newContent: string
  if (sectionStart >= 0) {
    const before = lines.slice(0, sectionStart)
    const after = lines.slice(sectionEnd)
    newContent = [...before, newSection.trimEnd(), '', ...after].join('\n')
  } else {
    newContent = content.trimEnd() + '\n\n' + newSection.trimEnd() + '\n'
  }

  writeFileSync(filePath, newContent, 'utf-8')
}

export function ensureDateSection(
  todoDir: string,
  dateStr: string,
  tasks: Task[]
): { filePath: string; weekStart: string } {
  const existing = findWeeklyFile(todoDir, dateStr)

  if (existing) {
    const section = serializeDateSection(dateStr, tasks)
    writeBackSection(existing.filePath, dateStr, section)
    return existing
  }

  const targetDate = new Date(dateStr + 'T12:00:00')
  const day = targetDate.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const monday = new Date(targetDate)
  monday.setDate(monday.getDate() + mondayOffset)
  const weekStart = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`

  const weekDir = path.join(todoDir, weekStart)
  if (!existsSync(weekDir)) mkdirSync(weekDir, { recursive: true })

  const filePath = path.join(weekDir, 'index.md')
  const frontmatter = `---
title: Weekly Report ${weekStart}
subtitle: Weekly summary of progress and future plans.
abstract: What Have I done?
date: '${new Date().toISOString()}'
draft: false
author: Adam
---

`

  const section = serializeDateSection(dateStr, tasks)

  if (existsSync(filePath)) {
    writeBackSection(filePath, dateStr, section)
  } else {
    writeFileSync(filePath, frontmatter + section + '\n', 'utf-8')
  }

  return { filePath, weekStart }
}

export function appendTasksToDate(
  todoDir: string,
  dateStr: string,
  tasks: Task[]
): { filePath: string; weekStart: string } {
  const fileInfo = findWeeklyFile(todoDir, dateStr)
  const taskLines = serializeTasks(tasks)

  if (fileInfo) {
    const content = readFileSync(fileInfo.filePath, 'utf-8')
    const lines = content.split('\n')
    const headingRe = new RegExp(`^##\\s+${dateStr}\\s*$`)
    let sectionEnd = -1

    for (let i = 0; i < lines.length; i++) {
      if (headingRe.test(lines[i])) {
        sectionEnd = i + 1
        while (sectionEnd < lines.length && !/^##\s/.test(lines[sectionEnd])) {
          sectionEnd++
        }
        // Back up past trailing blank lines
        while (sectionEnd > i + 1 && lines[sectionEnd - 1].trim() === '') sectionEnd--
        break
      }
    }

    let newContent: string
    if (sectionEnd >= 0) {
      const before = lines.slice(0, sectionEnd)
      const after = lines.slice(sectionEnd)
      newContent = [...before, taskLines.trimEnd(), ...after].join('\n')
    } else {
      newContent = content.trimEnd() + `\n\n## ${dateStr}\n` + taskLines
    }
    writeFileSync(fileInfo.filePath, newContent, 'utf-8')
    return fileInfo
  }

  return ensureDateSection(todoDir, dateStr, tasks)
}
