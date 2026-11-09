/** Suggestions never authorize a run; ambiguous or incidental words stay blank. */
export interface Workspace {id:string;name:string;root:string}
const words=(value:string)=>value.normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim()
const generic=new Set(['project','workspace','default','general','personal','home','todo','tasks','test','work'])
export function suggestWorkspace(projects:Workspace[], context:string):Workspace|undefined {
 const normalized=' '+words(context.replace(/(?:^|\s)[`"']?\/[^\s]+/g,' '))+' '
 const candidates=projects.filter(p=>p.root.startsWith('/')&&p.root.length>1).map(project=>{
  const path=project.root.replace(/\/$/,'')
  const at=context.indexOf(path)
  const explicit=at>=0&&/^(?:$|[\s/`"\)\]])/.test(context.slice(at+path.length))
  const aliases=[project.name,path.split('/').pop()||''].map(words)
  const named=aliases.some(name=>name.length>=4&&!generic.has(name)&&normalized.includes(' '+name+' '))
  return {project,score:explicit?100:named?70:0}
 }).filter(x=>x.score).sort((a,b)=>b.score-a.score)
 return candidates.length&&(!candidates[1]||candidates[0].score>candidates[1].score)?candidates[0].project:undefined
}
