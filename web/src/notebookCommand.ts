import { invoke as nativeInvoke, isTauri, type InvokeArgs } from '@tauri-apps/api/core'
import { browserCommand } from './browserNotebook'

export function invoke<T>(command: string, args?: InvokeArgs): Promise<T> {
  return isTauri()
    ? nativeInvoke<T>(command, args)
    : browserCommand(command, args as Record<string, unknown>) as Promise<T>
}
