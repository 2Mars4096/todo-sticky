export interface MynitExcerpt { segment_id?: string; quote: string; start_ms?: number | null }
export interface MynitSource { meeting_id:string; transcript_revision:number; title?:string; excerpts:MynitExcerpt[] }

export function sourceLink(meeting: string, revision: number, segment?: string) {
  const valid = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$/
  if (!segment || !valid.test(segment) || !valid.test(meeting) || !Number.isSafeInteger(revision) || revision < 1) return undefined
  return 'https://mynit.pipedreams.work/?' + new URLSearchParams({meeting,revision:String(revision),segment})
}
export function sourceTime(ms?:number | null) {
  if (ms == null || !Number.isSafeInteger(ms) || ms < 0) return ''
  const seconds = Math.floor(ms/1000)
  return Math.floor(seconds/60) + ':' + String(seconds%60).padStart(2,'0')
}
export function readMynitSource(raw: any): MynitSource | undefined {
  if (!raw || typeof raw.meeting_id !== 'string' || !Number.isSafeInteger(raw.transcript_revision) ||
      !Array.isArray(raw.excerpts)) return undefined
  const excerpts = raw.excerpts.filter((e:any) => e && typeof e.quote === 'string' && sourceLink(raw.meeting_id,raw.transcript_revision,e.segment_id))
  if (!excerpts.length) return undefined
  return {meeting_id:raw.meeting_id,transcript_revision:raw.transcript_revision,title:typeof raw.title === 'string' ? raw.title : undefined,excerpts}
}
