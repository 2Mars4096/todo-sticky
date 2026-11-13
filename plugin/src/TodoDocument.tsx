import { useEffect, useRef, useState, type ReactNode, type ComponentType } from 'react';
import { pluginScope } from '@diane/plugin-sdk/client';
import { TaskDianeAction } from './TaskDianeAction';

export interface TodoDocumentEditorProps {
  documentId: string; content: string; readOnly: boolean; onChange(content: string): void; renderBlockActions?(markdown:string): ReactNode;
}
export interface TodoDocumentReviewProps { before: string; after: string; onAccept(content?: string): void; onReject(): void; }
export type Projection = { token: string; links: Record<string,string>; created: string[]; removed: string[]; initial: boolean; canonicalContent?: string };
export type Span = { id: string; line: number; task: { text: string; status: string } };
export type DocumentSnapshot = { path: string; document: string; content: string; normalized: string; revision: string; projection: Projection; tasks: Span[]; pending: boolean };
export type DocumentWrite = { path: string; document: string; content: string; revision: string; expected: string };
export interface TodoDocumentHost {
  list(): Promise<{documents: string[]}>;
  read(path: string): Promise<DocumentSnapshot>;
  preview(value: DocumentWrite): Promise<{content: string; projection: Projection; tasks: Span[]}>;
  save(value: DocumentWrite): Promise<unknown>;
  reviewAgain(value: {path:string;document:string;revision:string}): Promise<unknown>;
  recover(path: string, document: string): Promise<DocumentWrite>;
}
export function TodoDocument({scope,host,editor:Editor,review:Review,onClose,onSaved}: {
  scope:string;host?:TodoDocumentHost;editor?:ComponentType<TodoDocumentEditorProps>;review?:ComponentType<TodoDocumentReviewProps>;onClose():void;onSaved():Promise<void>;
}) {
  const [files,setFiles]=useState<string[]>([]),[snapshot,setSnapshot]=useState<DocumentSnapshot>(),[draft,setDraft]=useState('');
  const [preview,setPreview]=useState<Awaited<ReturnType<TodoDocumentHost['preview']>>>(),[accepted,setAccepted]=useState(false),[choice,setChoice]=useState(false);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[selected,setSelected]=useState<string>();
  const latest=useRef({snapshot,draft});latest.current={snapshot,draft};
  const alive=useRef(true),lock=useRef(false); const current=()=>alive.current&&pluginScope()===scope;
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
  const perform=async(work:()=>Promise<void>)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await work();}catch(e){if(current())setError(String(e));}finally{lock.current=false;if(current())setBusy(false);}};
  useEffect(()=>{if(host)void perform(async()=>{const result=await host.list();if(current())setFiles(result.documents);});},[host]);
  if(!host||!Editor)return <section><button onClick={onClose}>Back</button><p role="status">This host does not support KB document editing.</p></section>;
  const dirty=!!snapshot&&draft!==snapshot.content;
  const write=():DocumentWrite=>({path:snapshot!.path,document:snapshot!.document,revision:snapshot!.revision,expected:snapshot!.projection.token,content:draft});
  const open=async(path:string)=>{const value=await host.read(path);if(current()){setSnapshot(value);setDraft(value.content);setPreview(undefined);setSelected(undefined);setAccepted(false);}};
  const changed=(value:string)=>{if(!current()||lock.current||latest.current.snapshot!==snapshot||latest.current.draft!==draft)return;setDraft(value);setPreview(undefined);setAccepted(false);};
  return <section className="todo-document" aria-label="KB Todo document">
    <header><button disabled={busy||dirty||snapshot?.pending} onClick={onClose}>Back</button>
      <select aria-label="Weekly document" disabled={busy||dirty||snapshot?.pending} value={snapshot?.path??''} onChange={e=>void perform(()=>open(e.target.value))}>
        <option value="" disabled>Choose document</option>{files.map(path=><option key={path}>{path}</option>)}
      </select></header>
    {error&&<p role="alert">{error}</p>}
    {snapshot&&<>
      <Editor key={snapshot.document} documentId={`${scope}:${snapshot.document}`} content={draft} readOnly={busy||snapshot.pending} onChange={changed} renderBlockActions={markdown=>!dirty&&!preview&&!snapshot.pending&&!busy?snapshot.tasks.filter(span=>markdown.includes(`sticky-todo:id=${span.id} `)&&!snapshot.projection.created.includes(span.id)).map(span=><span key={span.id}><button onClick={()=>setSelected(span.id)} aria-label={`Task actions: ${span.task.text}`}>{span.task.status} · Task</button></span>):null}/>
      {snapshot.pending?<p role="alert">File saved; record reconciliation is pending. <button disabled={busy} onClick={()=>void perform(async()=>{const pending=await host.recover(snapshot.path,snapshot.document);if(!current())return;await host.save(pending);if(current()){await open(snapshot.path);await onSaved();}})}>Retry reconciliation</button> <button disabled={busy} onClick={()=>void perform(async()=>{const fresh=await host.read(snapshot.path);if(!current())return;await host.reviewAgain(fresh);if(current())await open(snapshot.path);})}>Review again</button></p>:<div>
        <button disabled={busy} onClick={()=>void perform(async()=>{const value=await host.preview(write());if(current()){setPreview(value);setAccepted(!Review);setChoice(!value.projection.canonicalContent||value.projection.canonicalContent===value.content);}})}>Preview reconciliation</button>
        <button disabled={busy||!dirty} onClick={()=>{setDraft(snapshot.content);setPreview(undefined);}}>Discard draft</button>
        <button disabled={busy||dirty} onClick={()=>void perform(()=>open(snapshot.path))}>Reload</button>
      </div>}
      {preview&&<section aria-label="Reconciliation preview">
        <p>{preview.projection.initial?'Initial linkage. ':''}{preview.projection.created.length} new tasks; {preview.projection.removed.length} removed. Removed tasks retain execution history; runs continue.</p>
        {preview.projection.canonicalContent&&preview.projection.canonicalContent!==preview.content&&<section><p>Saved task text or status differs. Choose which version to keep.</p><details><summary>Saved task version</summary><pre>{preview.projection.canonicalContent}</pre></details><button disabled={busy} onClick={()=>setChoice(true)}>Keep document task edits</button><button disabled={busy} onClick={()=>changed(preview.projection.canonicalContent!)}>Use saved task text and status</button></section>}
        {Review&&<Review before={snapshot.content} after={preview.content} onAccept={content=>{if(content!==undefined&&content!==preview.content){changed(content);}else setAccepted(true);}} onReject={()=>{setPreview(undefined);setAccepted(false);}}/>}
        {!Review&&<pre aria-label="Proposed Markdown">{preview.content}</pre>}
        <button disabled={busy||!accepted||!choice} onClick={()=>void perform(async()=>{try {await host.save({...write(),content:preview.content});} catch(error) {try {const fresh=await host.read(snapshot.path);if(current()&&fresh.pending)setSnapshot(fresh);} catch {} throw error;}if(current()){await open(snapshot.path);await onSaved();}})}>Save document and reconcile</button>
      </section>}
      <nav aria-label="Task lines">{snapshot.tasks.map(span=><button key={span.id} disabled={busy||dirty||snapshot.pending||!!preview} onClick={()=>setSelected(span.id)}>Line {span.line}: {span.task.text} · {span.task.status}</button>)}</nav>
      {selected&&!dirty&&!preview&&!snapshot.pending&&!snapshot.projection.created.includes(selected)&&snapshot.projection.links[selected]&&<TaskDianeAction id={snapshot.projection.links[selected]}/>}
    </>}
  </section>;
}
