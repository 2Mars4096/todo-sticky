import { ui } from '../interfaceLocale'
import { createContext,useContext,useState,useEffect } from 'react'
import { type MynitExcerpt,type MynitSource,sourceTime,sourceLink } from '../mynitSource'
import { SuiteLink } from './SuiteLink'

export const CitationLookup = createContext<((id:string)=>Promise<MynitSource | undefined>) | undefined>(undefined)
export const TaskCitationContext = createContext<{taskId:string;source:MynitSource} | undefined>(undefined)

export function SourcePassage({meeting,revision,excerpt}:{meeting:string;revision:number;excerpt:MynitExcerpt}) {
  const url = sourceLink(meeting,revision,excerpt.segment_id)
  const time = sourceTime(excerpt.start_ms)
  return <blockquote className="mynit-passage"><p>{excerpt.quote}</p>
    {url && <SuiteLink destination="mynit" href={url}>{time ? ui("Open in Mynit at {0}", [time]) : ui("Open passage in Mynit")}</SuiteLink>}</blockquote>
}
export function TaskCitation({id,selected}:{id:string;selected:boolean}) {
  const current = useContext(TaskCitationContext)
  const lookup = useContext(CitationLookup)
  const [result,setResult] = useState<{id:string;lookup:typeof lookup;source?:MynitSource;failed?:boolean}>()
  const [attempt,setAttempt] = useState(0)
  const linked = current?.taskId === id ? current.source : undefined
  useEffect(() => {
    if (!selected || !lookup || linked) return
    let active = true
    lookup(id).then(source => {if(active)setResult({id,lookup,source})})
      .catch(() => {if(active)setResult({id,lookup,failed:true})})
    return () => {active=false}
  },[id,lookup,selected,linked,attempt])
  const saved = result?.lookup === lookup && result?.id === id ? result : undefined
  if (selected && !linked && saved?.failed) return <button type="button" className="task-text-action" onClick={() => setAttempt(n=>n+1)}>{ui("Retry source check")}</button>
  const source = linked ?? saved?.source
  if (!source) return null
  return <details className="task-citation"><summary>{ui("Mynit source{0}", [source.title ? ' · ' + source.title : ''])}</summary>
    {source.excerpts.map((e,i) => <SourcePassage key={i} meeting={source.meeting_id} revision={source.transcript_revision} excerpt={e}/>)}</details>
}
