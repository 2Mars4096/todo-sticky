import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getTasks: (dateStr: string) => ipcRenderer.invoke('get-tasks', dateStr),
  saveTasks: (data: { filePath: string; dateStr: string; tasks: any[] }) =>
    ipcRenderer.invoke('save-tasks', data),
  createDateSection: (data: { dateStr: string; tasks: any[] }) =>
    ipcRenderer.invoke('create-date-section', data),
  appendTasksToDate: (data: { dateStr: string; tasks: any[] }) =>
    ipcRenderer.invoke('append-tasks-to-date', data),
  pushTask: (data: { fromDate: string; toDate: string; taskText: string; subtaskTexts: string[] }) =>
    ipcRenderer.invoke('push-task', data),
  listWeeklyFiles: () => ipcRenderer.invoke('list-weekly-files'),
  llmBreakdown: (data: { taskText: string; existingSubtasks: string[] }) =>
    ipcRenderer.invoke('llm-breakdown', data),
  llmSchedule: (data: { tasks: any[]; machines: any[] }) =>
    ipcRenderer.invoke('llm-schedule', data),
  getEnv: () => ipcRenderer.invoke('get-env'),
  onFileChanged: (cb: () => void) => {
    const listener = () => cb()
    ipcRenderer.on('file-changed', listener)
    return () => { ipcRenderer.removeListener('file-changed', listener) }
  },
})
