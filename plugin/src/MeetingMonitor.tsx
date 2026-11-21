import { ui } from './interfaceLocale'
import { DeleteAction } from './components/DeleteAction';
import './meeting-monitor.css';
import { useEffect, useRef, useState } from 'react';

export type ReviewRequest = <T>(path: string, body?: unknown) => Promise<T>;
type Review = { sequence?: number; cleared?: boolean; meeting_id: string; analysis_id: string; title: string; indices: number[]; count: number; reviewed_at: string };
type Page = { head?: number; reviews: Review[]; before: number | null };
type Action = { text: string; todo_text?: string; owner?: string; due_date?: string; evidence: {quote: string}[]; pushed: boolean };
type Preview = { todo_indices?: number[]; analysis_id: string; analysis_fingerprint: string; transcript_revision: number; actions: Action[] };
const root = '/api/plugins/todo/meeting-monitor';

function MeetingDrafts({review, request, onAdded}: {review: Review; request: ReviewRequest; onAdded: () => void}) {
  const [preview, setPreview] = useState<Preview>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [retry, setRetry] = useState(0);
  const locked = useRef(false);
  const [chosen, setChosen] = useState<number[]>([]);
  const path = root + '/meetings/' + encodeURIComponent(review.meeting_id) + '/todo-push';
  useEffect(() => {
    let alive = true;
    setPreview(undefined); setError('');
    request<Preview>(path).then(value => {
      if (value.analysis_id !== review.analysis_id) throw Error(ui("Meeting analysis changed. Refresh the review list."));
      if (alive) setPreview(value);
    }).catch(e => { if (alive) setError(String(e.message || e)); });
    return () => { alive = false; };
  }, [path, request, review.analysis_id, retry]);
  async function add(indices: number[]) {
    if (!preview || locked.current || !indices.length || indices.length > 40) return;
    locked.current = true; setBusy(true); setError('');
    const now = new Date();
    const day = [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
    try {
      await request(path, {request_id: crypto.randomUUID(), kind: 'tasks', task_date: day,
        transcript_revision: preview.transcript_revision, analysis_fingerprint: preview.analysis_fingerprint,
        actions: indices.map(index => {
          const action = preview.actions[index];
          return {index, text: action.todo_text || action.text, due_date: /^\d{4}-\d{2}-\d{2}$/.test(action.due_date || '') ? action.due_date : null};
        })});
      setPreview({...preview, actions: preview.actions.map((a,i) => indices.includes(i) ? {...a, pushed:true} : a)});
      setChosen([]);
      onAdded();
    } catch(e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { locked.current = false; setBusy(false); }
  }
  const indices = preview?.todo_indices ?? review.indices;
  const available = indices.filter(i => preview?.actions[i] && !preview.actions[i].pushed);
  const single = available.length === 1;
  const selected = single ? available : available.filter(i => chosen.includes(i));
  return <div className="meeting-drafts">{error && <p role="alert">{error} <button onClick={() => setRetry(n => n+1)}>{ui("Reload")}</button></p>}
    {!preview && !error && <p role="status">{ui("Loading suggestions…")}</p>}
    {preview && <ul>{indices.map(index => {
      const action = preview.actions[index];
      if (!action) return null;
      const title = action.todo_text || action.text;
      return <li key={index}>
        {action.pushed || single ? <div>{title}</div> : <label className="meeting-choice">
          <input type="checkbox" checked={chosen.includes(index)} disabled={busy}
            onChange={e => setChosen(e.target.checked ? [...chosen,index] : chosen.filter(i => i !== index))}/>
          <span>{title}</span>
        </label>}
        {(action.owner || action.due_date) && <span className="meeting-meta">{[action.owner, action.due_date].filter(Boolean).join(' · ')}</span>}
        <div className="meeting-actions"><details><summary>{ui("Transcript")}</summary>{action.evidence.map((e,i) => <blockquote key={i}>{e.quote}</blockquote>)}</details>
          {action.pushed && <span className="meeting-meta">{ui("Added to Todo")}</span>}
        </div>
      </li>;
    })}</ul>}
    {!!selected.length && <div className="meeting-commit">
      {selected.length > 40 && <span role="status">{ui("Choose up to 40 at a time.")}</span>}
      <button disabled={busy || selected.length > 40} onClick={() => void add(selected)}>
        {busy ? ui("Adding…") : single ? ui("Add to today") : ui("Add {0} to today", [selected.length])}
      </button>
    </div>}
  </div>;
}

export function MeetingMonitor({request, onAdded}: {request: ReviewRequest; onAdded: () => void}) {
  const [page, setPage] = useState<Page>();
  const [depth, setDepth] = useState(1);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const loaded = useRef<{depth:number; page:Page} | undefined>(undefined);
  const [expanded, setExpanded] = useState<Map<string, boolean>>(() => new Map());
  const [confirm, setConfirm] = useState<number>();
  const [clearing, setClearing] = useState(false);
  const version = useRef(0);
  const clearLock = useRef(false);
  function toggle(key: string) {
    setExpanded(current => {
      const next = new Map(current);
      next.set(key, !next.get(key));
      return next;
    });
  }
  async function clear(through: number, meeting_id?: string) {
    if (clearLock.current) return;
    clearLock.current = true; setClearing(true);
    try {
      await request(root + '/todo-reviews/clear', {through, meeting_id});
      version.current++;
      loaded.current = undefined;
      setPage(current => current && ({...current, reviews:current.reviews.filter(r =>
        (r.sequence ?? Infinity) > through || (meeting_id && r.meeting_id !== meeting_id))}));
      setConfirm(undefined); setError('');
    } catch(e) { setError(e instanceof Error ? e.message : String(e)); }
    finally { clearLock.current = false; setClearing(false); }
  }
  function bulkClearControl(through: number) {
    if (confirm !== undefined) return <div className="meeting-clear-confirm" role="group" aria-label={ui("Confirm clearing suggestions")}>
      <span>{ui("Clear suggestions from all reviewed meetings?")}</span>
      <button disabled={clearing} onClick={() => setConfirm(undefined)}>{ui("Cancel")}</button>
      <button disabled={clearing} onClick={() => void clear(confirm)}>{ui("Clear suggestions")}</button>
    </div>;
    return <button className="meeting-clear" disabled={clearing} onClick={() => setConfirm(through)}>{ui("Clear all suggestions")}</button>;
  }
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let alive = true, loading = false;
    async function load(extend = false) {
      if (loading || document.visibilityState === 'hidden') return;
      loading = true;
      const generation = version.current;
      const previous = extend && loaded.current?.depth === depth - 1 ? loaded.current : undefined;
      if (previous) setLoadingOlder(true);
      try {
        let next = previous?.page ?? await request<Page>(root + '/todo-reviews/refresh', {});
        for (let n = previous?.depth ?? 1; n < depth && next.before; n++) {
          const older = await request<Page>(root + '/todo-reviews?before=' + next.before);
          const ids = new Set(next.reviews.map(r => r.meeting_id));
          next = {...next, before:older.before, reviews:[...next.reviews, ...older.reviews.filter(r => !ids.has(r.meeting_id))]};
        }
        if (alive && generation === version.current) {
          next = {...next, reviews:next.reviews.filter(r => !r.cleared)};
          loaded.current = {depth, page:next};
          setPage(next); setError('');
        }
      } catch(e) { if (alive) setError(e instanceof Error ? e.message : String(e)); }
      finally { loading = false; if (alive) setLoadingOlder(false); }
    }
    void load(true);
    const poll = () => void load();
    const timer = window.setInterval(poll, 60000);
    document.addEventListener('visibilitychange', poll);
    return () => { alive = false; clearInterval(timer); document.removeEventListener('visibilitychange', poll); };
  }, [request, depth, refresh]);
  const dayLabel = (stamp: string) => stamp ? new Date(stamp).toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'}) : '';
  return <details className="meeting-monitor"><summary className="meeting-heading">
    <span>{ui("Meeting follow-ups")}</span><span className="meeting-total">{page?.reviews.length ? ui("{0} suggested", [page.reviews.reduce((n,r) => n+r.count,0)]) : ''}</span>
  </summary><div className="meeting-scroll">
    {error && <p role="status">{error} <button onClick={() => setRefresh(n => n+1)}>{ui("Retry")}</button></p>}
    {!error && !page && <p role="status">{ui("Checking meetings…")}</p>}
    {page && !page.reviews.length && <p>{ui("No current meeting reviews on this page.")}</p>}
    {page?.reviews.map((r,index) => <div key={r.meeting_id + r.analysis_id} className="meeting-item">
      {(!index || dayLabel(r.reviewed_at) !== dayLabel(page.reviews[index-1].reviewed_at)) && <div className="meeting-list-tools">
        {r.reviewed_at && <span className="meeting-day">{ui("Reviewed") + " "}<time dateTime={r.reviewed_at}>{dayLabel(r.reviewed_at)}</time></span>}
        {!index && !!page.head && (page.reviews.some(row => row.count) || page.before) &&
          bulkClearControl(page.head)}
      </div>}
      <div className="meeting-row">
      <button className="meeting-trigger" disabled={!r.count} aria-label={r.title + (r.cleared ? ', cleared' : ', ' + r.count + ' suggested')}
        aria-expanded={!!r.count && expanded.get(r.analysis_id)} onClick={() => toggle(r.analysis_id)}>
        <span>{r.title}</span><span className="meeting-count">{r.cleared ? ui("Cleared") : r.count || ui("Reviewed · no follow-ups")}</span>
      </button>
      {!!r.sequence && <DeleteAction label={ui("Dismiss follow-ups: ") + r.title} disabled={clearing}
        onClick={() => void clear(r.sequence!, r.meeting_id)}/>}
      </div>
      {expanded.has(r.analysis_id) && !!r.count && <div hidden={!expanded.get(r.analysis_id)}>
        <MeetingDrafts review={r} request={request} onAdded={onAdded}/>
      </div>}
    </div>)}
    {!page?.reviews.length && !!page?.head && page.before && bulkClearControl(page.head)}
    {page?.before && <button disabled={loadingOlder} onClick={() => setDepth(depth + 1)}>{loadingOlder ? ui("Loading older reviews…") : ui("Older reviews")}</button>}
  </div></details>;
}
