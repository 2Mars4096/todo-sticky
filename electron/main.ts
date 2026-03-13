import { app, BrowserWindow, ipcMain, screen, Tray, Menu, globalShortcut, nativeImage, dialog } from 'electron'
import path from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, watch, FSWatcher } from 'fs'
import { parseWeeklyFile, serializeDateSection, getTasksForDate } from './markdown'
import { findWeeklyFile, writeBackSection, ensureDateSection, listWeeklyFiles, appendTasksToDate } from './fileSync'
import { callLLM, testConnection } from './llm'
import { loadSettings, saveSettings as persistSettings, type AppSettings } from './config'

function loadEnv() {
  const isDev = process.argv.includes('--dev')
  const envPath = isDev
    ? path.join(__dirname, '..', '.env')
    : path.join(app.getPath('userData'), '.env')

  if (!existsSync(envPath)) {
    if (!isDev) {
      const dir = path.dirname(envPath)
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
      const defaultKb = path.join(app.getPath('home'), 'Documents', 'Sticky Todo')
      writeFileSync(envPath, [
        '# Sticky Todo Configuration',
        '# See README for all options.',
        '',
        '# Where tasks are stored (content/to-do/ subdirectory)',
        `VITE_KB_PATH=${defaultKb}`,
        '',
        '# LLM API (optional — for AI breakdown & schedule)',
        '# VITE_LLM_API_BASE=https://api.openai.com/v1',
        '# VITE_LLM_API_KEY=your-key-here',
        '# VITE_LLM_MODEL=gpt-4o',
        '',
      ].join('\n'), 'utf-8')
    } else {
      return
    }
  }

  const content = readFileSync(envPath, 'utf-8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    const value = trimmed.slice(eqIndex + 1).trim()
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnv()

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false

function toggleWindow() {
  if (!mainWindow) {
    createWindow()
    return
  }
  if (mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    mainWindow.show()
    mainWindow.focus()
  }
}

function makeTrayIcon() {
  // Draw a 32x32 checklist icon (renders at 16pt @2x on Retina).
  // macOS template images: black pixels on transparent bg; the OS tints them.
  const sz = 32
  const buf = Buffer.alloc(sz * sz * 4, 0) // RGBA, all transparent

  function setPixel(x: number, y: number) {
    if (x < 0 || x >= sz || y < 0 || y >= sz) return
    const i = (y * sz + x) * 4
    buf[i] = 0; buf[i + 1] = 0; buf[i + 2] = 0; buf[i + 3] = 255
  }

  function hLine(x1: number, x2: number, y: number) {
    for (let x = x1; x <= x2; x++) { setPixel(x, y); setPixel(x, y + 1) }
  }

  function drawCheck(cx: number, cy: number) {
    // small 5x4 checkmark
    setPixel(cx, cy + 2); setPixel(cx + 1, cy + 3)
    setPixel(cx + 2, cy + 2); setPixel(cx + 3, cy + 1); setPixel(cx + 4, cy)
  }

  // Three rows of: checkbox + line
  for (let row = 0; row < 3; row++) {
    const y = 6 + row * 8
    // checkbox outline (6x6)
    for (let i = 0; i < 6; i++) {
      setPixel(4 + i, y); setPixel(4 + i, y + 5)
      setPixel(4, y + i); setPixel(9, y + i)
    }
    drawCheck(5, y + 1)
    hLine(13, 26, y + 2)
  }

  const img = nativeImage.createFromBuffer(buf, { width: sz, height: sz })
  img.setTemplateImage(true)
  return img
}

function createTray() {
  const icon = makeTrayIcon()
  if (icon.isEmpty()) {
    console.error('[Sticky Todo] Failed to create tray icon')
    return
  }

  tray = new Tray(icon)
  tray.setToolTip('Sticky Todo  (⌥⌘T)')

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Show / Hide   ⌥⌘T', click: toggleWindow },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit() } },
  ])

  tray.setContextMenu(contextMenu)
  tray.on('click', toggleWindow)
}

function createWindow() {
  const { width: screenWidth } = screen.getPrimaryDisplay().workAreaSize
  const winWidth = 380
  const winHeight = 560

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    x: screenWidth - winWidth - 24,
    y: 80,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    hasShadow: true,
    vibrancy: 'under-window',
    skipTaskbar: !isDev,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow?.hide()
    }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

const SHORTCUT = 'CommandOrControl+Alt+T'

app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock.hide()

  const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev')
  app.setLoginItemSettings({ openAtLogin: !isDev })

  createWindow()
  createTray()

  const registered = globalShortcut.register(SHORTCUT, toggleWindow)
  if (!registered) {
    console.warn(`[Sticky Todo] Failed to register global shortcut ${SHORTCUT} — it may be claimed by another app`)
  }
})

app.on('before-quit', () => { isQuitting = true })
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (!mainWindow) createWindow(); else mainWindow.show() })

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

const getKbPath = () => {
  const settings = loadSettings()
  if (settings.kbPath) return settings.kbPath
  if (process.env.VITE_KB_PATH) return process.env.VITE_KB_PATH
  const isDev = process.argv.includes('--dev')
  return isDev
    ? path.join(__dirname, '..')
    : path.join(app.getPath('home'), 'Documents', 'Sticky Todo')
}

let activeWatcher: FSWatcher | null = null
let lastOwnWrite = 0

function watchFile(filePath: string) {
  if (activeWatcher) { activeWatcher.close(); activeWatcher = null }
  if (!filePath || !existsSync(filePath)) return

  activeWatcher = watch(filePath, { persistent: false }, () => {
    if (Date.now() - lastOwnWrite < 500) return
    mainWindow?.webContents.send('file-changed')
  })
}

ipcMain.handle('get-tasks', async (_event, dateStr: string) => {
  const kbPath = getKbPath()
  const todoDir = path.join(kbPath, 'content', 'to-do')
  const result = findWeeklyFile(todoDir, dateStr)
  if (!result) return { tasks: [], aggregated: [] }

  const content = readFileSync(result.filePath, 'utf-8')
  const parsed = parseWeeklyFile(content)
  const aggregated = getTasksForDate(parsed, dateStr)
  watchFile(result.filePath)
  return { tasks: aggregated, filePath: result.filePath, weekStart: result.weekStart }
})

ipcMain.handle('save-tasks', async (_event, { filePath, dateStr, tasks }: { filePath: string, dateStr: string, tasks: any[] }) => {
  lastOwnWrite = Date.now()
  const section = serializeDateSection(dateStr, tasks)
  writeBackSection(filePath, dateStr, section)
  return { ok: true }
})

ipcMain.handle('create-date-section', async (_event, { dateStr, tasks }: { dateStr: string, tasks: any[] }) => {
  lastOwnWrite = Date.now()
  const kbPath = getKbPath()
  const todoDir = path.join(kbPath, 'content', 'to-do')
  const result = ensureDateSection(todoDir, dateStr, tasks)
  watchFile(result.filePath)
  return result
})

ipcMain.handle('append-tasks-to-date', async (_event, { dateStr, tasks }: { dateStr: string, tasks: any[] }) => {
  lastOwnWrite = Date.now()
  const kbPath = getKbPath()
  const todoDir = path.join(kbPath, 'content', 'to-do')
  return appendTasksToDate(todoDir, dateStr, tasks)
})

ipcMain.handle('push-task', async (_event, { fromDate, toDate, taskText, subtaskTexts }: {
  fromDate: string, toDate: string, taskText: string, subtaskTexts: string[]
}) => {
  const kbPath = getKbPath()
  const todoDir = path.join(kbPath, 'content', 'to-do')

  const task: any = {
    id: `push_${Date.now()}`, text: taskText, status: 'todo',
    subtasks: subtaskTexts.map((t: string, i: number) => ({ id: `push_sub_${Date.now()}_${i}`, text: t, status: 'todo', subtasks: [] }))
  }

  lastOwnWrite = Date.now()
  const result = appendTasksToDate(todoDir, toDate, [task])

  return { ok: true, filePath: result.filePath }
})

ipcMain.handle('list-weekly-files', async () => {
  const kbPath = getKbPath()
  const todoDir = path.join(kbPath, 'content', 'to-do')
  return listWeeklyFiles(todoDir)
})

ipcMain.handle('llm-breakdown', async (_event, { taskText, existingSubtasks }: { taskText: string, existingSubtasks: string[] }) => {
  return callLLM('breakdown', { taskText, existingSubtasks })
})

ipcMain.handle('llm-schedule', async (_event, { tasks, machines }: { tasks: any[], machines: any[] }) => {
  return callLLM('schedule', { tasks, machines })
})

ipcMain.handle('get-env', async () => {
  const settings = loadSettings()
  return {
    apiBase: settings.apiBase,
    model: settings.model,
    hasKey: !!settings.apiKey,
    machines: settings.machines,
  }
})

ipcMain.handle('get-settings', async () => {
  const settings = loadSettings()
  return { ...settings, apiKey: settings.apiKey }
})

ipcMain.handle('save-settings', async (_event, settings: AppSettings) => {
  persistSettings(settings)
  return { ok: true }
})

ipcMain.handle('test-connection', async (_event, settings: { provider: string; apiBase: string; apiKey: string; model: string }) => {
  return testConnection(settings)
})

ipcMain.handle('check-first-run', async () => {
  const settings = loadSettings()
  return !settings.apiKey
})

ipcMain.handle('select-folder', async () => {
  const win = mainWindow || BrowserWindow.getFocusedWindow()
  if (!win) return null
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
    title: 'Select Knowledge Base Folder',
  })
  if (result.canceled || !result.filePaths.length) return null
  return result.filePaths[0]
})
