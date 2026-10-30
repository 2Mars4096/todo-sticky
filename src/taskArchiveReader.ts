import { api } from './api'

const pending = new Map<string, ReturnType<typeof api.extractTaskApi>>()
/** Share only in-flight reads. A timeout/retry must not accumulate native archive workers. */
export async function readTaskArchive(folder: string) {
  let request = pending.get(folder)
  if (!request) {
    request = api.extractTaskApi({ all: true, skipUnavailable: true, canonicalDates: true })
    pending.set(folder, request)
    const clear = () => { if (pending.get(folder) === request) pending.delete(folder) }
    void request.then(clear, clear)
  }
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([request, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('History is taking too long. Try again.')), 8000)
    })])
  } finally { clearTimeout(timer) }
}
