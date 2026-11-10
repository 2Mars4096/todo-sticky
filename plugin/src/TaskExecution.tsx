import { useEffect, useId, useRef, useState } from 'react';
import { isElectron } from '@diane/plugin-sdk/desktop';
import { useManagedPluginHost } from '@diane/plugin-sdk/host-context';
import { describeError, newId, pluginApi, pluginScope, type PluginRecord, type Project, type TaskPreparation, type Workflow } from '@diane/plugin-sdk/client';
import { recordsChanged } from '@diane/plugin-sdk/records';
import { activeWorkflow, executionProject, previousSessions, readProjectChoice, reviewableWorkflow, runRequestId, saveProjectChoice, sessionHref, unfinishedTask, workflowLabel, type ProjectChoice } from './taskExecutionState';

type Props = { task: PluginRecord; active: boolean; enabled: boolean; saving?: boolean };
const projectSignature = (projects: Project[]) => JSON.stringify(projects.map(project => [project.id, project.name, project.root]).sort((a, b) => a[0].localeCompare(b[0])));

/** Product-owned controls over the existing host workflow and result-version APIs. */
export function TaskExecution({ task, active, enabled, saving = false }: Props) {
  const host = useManagedPluginHost();
  const scope = task._scope || pluginScope();
  const version = `${scope}:${task.record_id}:${task.revision}`;
  const latest = useRef({ version, active, saving }); latest.current = { version, active, saving };
  const mounted = useRef(true), reads = useRef(0), operations = useRef(0), locked = useRef(false);
  const projectReads = useRef(0), projectSnapshot = useRef<Project[]>([]);
  const requestIds = useRef(new Map<string, string>());
  const [projects, setProjects] = useState<Project[]>([]);
  const [runs, setRuns] = useState<Workflow[]>([]);
  const [choice, setChoice] = useState<ProjectChoice | undefined>(() => readProjectChoice(task));
  const [preparation, setPreparation] = useState<TaskPreparation>();
  const [refreshCycle, setRefreshCycle] = useState(0), [preparationCycle, setPreparationCycle] = useState(0);
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false), [revising, setRevising] = useState(false), [feedback, setFeedback] = useState('');
  const [reviewSnapshot, setReviewSnapshot] = useState<Workflow>();
  const reviewTrigger = useRef<HTMLButtonElement>(null), options = useRef<HTMLDetailsElement>(null);
  const detailsId = useId();
  const workflow = runs[0];
  useEffect(() => {
    if (detailsOpen && reviewableWorkflow(workflow) && !reviewSnapshot) setReviewSnapshot(workflow);
  }, [detailsOpen, workflow?.workflow_id, workflow?.result_version, reviewSnapshot]);
  const current = () => mounted.current && latest.current.active && latest.current.version === version && pluginScope() === scope;
  const scopedWorkflow = (value: Workflow) => {
    if (value.task_id !== task.record_id || value._scope && value._scope !== scope) throw new Error('This run belongs to a different task or account. Refresh its status.');
    return { ...value, _scope: scope };
  };
  const receive = (value: Workflow) => {
    const next = scopedWorkflow(value);
    setRuns(previous => previous.some(item => item.workflow_id === next.workflow_id)
      ? previous.map(item => item.workflow_id === next.workflow_id ? next : item)
      : [next, ...previous]);
  };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; operations.current++; }; }, []);

  useEffect(() => {
    if (!active) return;
    const token = ++reads.current, projectToken = ++projectReads.current;
    operations.current++; locked.current = false; setBusy(false); setLoading(true); setError('');
    void Promise.all([pluginApi.projects(), pluginApi.workflows(task.record_id, scope)]).then(([list, result]) => {
      if (!current() || token !== reads.current) return;
      if (projectToken === projectReads.current) { projectSnapshot.current = list.projects; setProjects(list.projects); }
      setRuns(result.items.map(scopedWorkflow));
    }).catch(reason => { if (current() && token === reads.current) setError(describeError(reason)); })
      .finally(() => { if (current() && token === reads.current) setLoading(false); });
    return () => { reads.current++; operations.current++; locked.current = false; };
  // TaskDianeAction reloads this canonical object after saved subtree edits even
  // when the root revision is unchanged. Refresh the host's scope conflict too.
  }, [active, version, task, refreshCycle]);

  useEffect(() => {
    let disposed = false;
    const refreshProjects = () => {
      if (!active || pluginScope() !== scope) return;
      const token = ++projectReads.current;
      void pluginApi.projects().then(list => {
        if (disposed || token !== projectReads.current || !current()) return;
        if (projectSignature(list.projects) !== projectSignature(projectSnapshot.current)) {
          projectSnapshot.current = list.projects; setProjects(list.projects); setPreparation(undefined); setPreparationCycle(value => value + 1);
        }
      }).catch(() => { /* Explicit Refresh reports integration errors. */ });
    };
    window.addEventListener('diane:project-defaults-ready', refreshProjects);
    return () => { disposed = true; window.removeEventListener('diane:project-defaults-ready', refreshProjects); };
  }, [active, version]);

  useEffect(() => {
    if (!active || task.deleted) return;
    const controller = new AbortController(); let disposed = false, delay = 15000, refreshFailure: unknown;
    let timer: ReturnType<typeof setTimeout> | undefined, notifiedRevision: number | undefined;
    const valid = () => !disposed && current();
    setPreparation(previous => previous?.task_revision === task.revision ? previous : undefined);
    const poll = async () => {
      if (!valid()) return;
      try {
        const next = await pluginApi.preparation(task.record_id, scope, controller.signal);
        if (!valid()) return;
        if (next.fingerprint) refreshFailure = undefined;
        if (refreshFailure && next.state === 'pending' && !next.fingerprint) {
          setPreparation({ state: 'unavailable', reason: describeError(refreshFailure) });
          timer = setTimeout(poll, delay); delay = Math.min(60000, delay * 2); return;
        }
        setPreparation(next);
        const oldRevision = next.state === 'ready' && next.task_revision !== task.revision;
        if (oldRevision && next.task_revision !== notifiedRevision) { notifiedRevision = next.task_revision; recordsChanged('todo', scope); }
        if (next.state === 'pending' || next.state === 'stale' || oldRevision) { delay = 15000; timer = setTimeout(poll, 4000); }
        else if (next.state === 'unavailable') { timer = setTimeout(poll, delay); delay = Math.min(60000, delay * 2); }
      } catch (reason) {
        if (valid()) { setPreparation({ state: 'unavailable', reason: describeError(reason) }); timer = setTimeout(poll, delay); delay = Math.min(60000, delay * 2); }
      }
    };
    void pluginApi.refreshPreparations(scope, controller.signal).catch(reason => { refreshFailure = reason; }).then(() => { if (valid()) void poll(); });
    return () => { disposed = true; controller.abort(); if (timer) clearTimeout(timer); };
  }, [active, version, task.deleted, preparationCycle]);

  useEffect(() => {
    if (!active || !activeWorkflow(workflow)) return;
    let cancelled = false, inFlight = false;
    const tick = async () => {
      if (cancelled || inFlight || locked.current || document.hidden || !current()) return;
      const token = operations.current; inFlight = true;
      try {
        const next = await pluginApi.workflow(workflow!.workflow_id, scope);
        if (!cancelled && current() && token === operations.current) receive(next);
      } catch (reason) { if (!cancelled && current() && token === operations.current) setError(describeError(reason)); }
      finally { inFlight = false; }
    };
    const timer = setInterval(() => void tick(), 4000);
    window.addEventListener('focus', tick); document.addEventListener('visibilitychange', tick);
    return () => { cancelled = true; clearInterval(timer); window.removeEventListener('focus', tick); document.removeEventListener('visibilitychange', tick); };
  }, [active, version, workflow?.workflow_id, workflow?.state]);

  async function action(work: (valid: () => boolean) => Promise<void>) {
    if (locked.current || loading || latest.current.saving || !current()) return;
    locked.current = true; const token = ++operations.current;
    const valid = () => current() && token === operations.current;
    setBusy(true); setError(''); setNotice('');
    if (options.current) options.current.open = false;
    try { await work(valid); }
    catch (reason) { if (valid()) setError(describeError(reason)); }
    finally { if (token === operations.current) { locked.current = false; if (mounted.current) setBusy(false); } }
  }
  const project = executionProject(task, projects, choice, preparation);
  const fingerprint = choice === undefined && project ? preparation?.fingerprint : undefined;
  const canRun = enabled && unfinishedTask(task) && Boolean(project) && !loading && !busy && !saving;
  const terminal = Boolean(workflow && ['accepted', 'stopped', 'failed'].includes(workflow.state));
  const canRunAgain = terminal && unfinishedTask(task);
  const preparationLabel = choice !== undefined ? project ? '' : choice.project_id ? 'Project unavailable' : 'Choose project'
    : project ? '' : !preparation || preparation.state === 'pending' ? 'Preparing…'
      : preparation.state === 'stale' || preparation.state === 'ready' && preparation.task_revision !== task.revision ? 'Updating context…'
        : preparation.state === 'unavailable' ? 'Preparation unavailable' : 'Choose project';
  const chooseProject = (value: string) => {
    const item = projects.find(candidate => candidate.id === value);
    const next = value === '__automatic__' ? undefined : { project_id: item?.id || '', root: item?.root || '' };
    setChoice(next); saveProjectChoice(task, next);
  };
  const run = () => {
    if (!canRun || workflow && !canRunAgain) return;
    void action(async valid => {
      const next = await pluginApi.run(task, project!.id, runRequestId(task, project!.id, fingerprint, workflow), fingerprint);
      if (!valid()) return;
      if (next.project_id !== project!.id) throw new Error('Diane returned a different project. Refresh before continuing.');
      receive(next); setDetailsOpen(false);
      // Session creation and navigation are separate user actions.
    });
  };
  const reviewConflict = reviewableWorkflow(workflow) && workflow?.review_conflict;
  const canDiscardResult = workflow?.can_discard_result === true;
  const review = (decision: 'accept' | 'revise' | 'defer' | 'stop') => {
    const snapshot = decision === 'defer' ? workflow : reviewSnapshot;
    if (!snapshot || !reviewableWorkflow(workflow) || snapshot.workflow_id !== workflow?.workflow_id || snapshot.result_version !== workflow.result_version || decision === 'stop' && !canDiscardResult || reviewConflict && (decision === 'accept' || decision === 'revise') || decision === 'revise' && (!enabled || !feedback.trim())) return;
    const reviewFeedback = decision === 'revise' ? feedback : '';
    const key = JSON.stringify([snapshot.workflow_id, snapshot.result_version, decision, reviewFeedback]);
    const id = requestIds.current.get(key) || newId(); requestIds.current.set(key, id);
    void action(async valid => {
      const next = await pluginApi.review(snapshot, decision, reviewFeedback, id);
      if (!valid()) return;
      receive(next); recordsChanged('todo', scope);
      if (decision === 'revise') { setRevising(false); setFeedback(''); }
      if (decision === 'accept') setDetailsOpen(false);
      if (decision === 'stop') {
        setDetailsOpen(false); setReviewSnapshot(undefined); setRevising(false); setFeedback('');
        setNotice('Result discarded.');
      }
    });
  };
  const refresh = () => { if (!busy && !loading) { setRefreshCycle(value => value + 1); setPreparationCycle(value => value + 1); } };
  const closeDetails = () => { setDetailsOpen(false); reviewTrigger.current?.focus(); };
  const showDetails = () => {
    const stale = reviewSnapshot?.workflow_id !== workflow?.workflow_id || reviewSnapshot?.result_version !== workflow?.result_version;
    if (!detailsOpen || stale) { setReviewSnapshot(reviewableWorkflow(workflow) ? workflow : undefined); setDetailsOpen(true); }
    else setDetailsOpen(false);
  };
  const staleReview = Boolean(reviewSnapshot && (reviewSnapshot.workflow_id !== workflow?.workflow_id || reviewSnapshot.result_version !== workflow?.result_version));
  const displayed = reviewSnapshot && reviewableWorkflow(workflow) ? reviewSnapshot : workflow;
  const open = (value: Workflow, label = 'Open', title = 'Open Diane session') => value.session_id && (isElectron()
    ? <button type="button" disabled={busy || loading || saving} title={title} aria-label={title} onClick={() => void action(async () => { await pluginApi.openWorkflow(value); })}>{label}</button>
    : <a href={sessionHref(value)} title={title} aria-label={title} target="_blank" rel="noopener noreferrer" onClick={event => { if (!current() || value._scope && value._scope !== scope) event.preventDefault(); }}>{label}</a>);
  const bound = workflow ? projects.find(item => item.id === workflow.project_id) : project;
  const previous = previousSessions(runs);
  const origin = task.extensions.meeting_context as { meeting_id?: string; title?: string; transcript_revision?: number } | undefined;

  return <div className="todo-execution" aria-label="Diane task execution" aria-busy={busy || loading || saving}>
    <div className="todo-execution-row">
      {!workflow || canRunAgain ? <select aria-label="Diane project" title={project?.root || 'Choose a project for this task'} value={project?.id || ''} disabled={busy || saving} onChange={event => chooseProject(event.target.value)}>
        <option value="">Choose project</option>{(choice !== undefined || project) && <option value="__automatic__">Automatic</option>}{projects.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select> : bound ? <span className="todo-execution-project" title={bound.root}>{bound.name}</span> : null}
      <span className="todo-execution-state" role="status">{saving ? 'Saving…' : loading ? 'Loading…' : reviewConflict ? 'Task changed' : workflow ? workflowLabel(workflow.state) : preparationLabel}</span>
      {(!workflow || canRunAgain) && unfinishedTask(task) && <button type="button" className="todo-execution-primary" disabled={!canRun} onClick={run}>{workflow ? 'Run again' : 'Run'}</button>}
      {reviewableWorkflow(workflow) ? <button ref={reviewTrigger} type="button" className="todo-execution-primary" disabled={loading || saving} aria-expanded={detailsOpen} aria-controls={detailsId} onClick={showDetails}>Review</button> : workflow && open(workflow)}
      <details className="todo-execution-options" ref={options} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); options.current!.open = false; options.current?.querySelector('summary')?.focus(); } }}>
        <summary aria-label="More Diane actions" title="More Diane actions">···</summary>
        <div>
          <button type="button" disabled={busy || loading} onClick={() => { refresh(); if (options.current) options.current.open = false; }}>Refresh</button>
          <button type="button" onClick={() => { showDetails(); if (options.current) options.current.open = false; }} aria-expanded={detailsOpen} aria-controls={detailsId}>Run details</button>
          {workflow?.state === 'pending_dispatch' && <button type="button" disabled={busy || loading || saving || !enabled} onClick={() => void action(async valid => { const next = await pluginApi.run({ ...task, revision: workflow.task_revision }, workflow.project_id, workflow.request_id); if (valid()) receive(next); })}>Retry start</button>}
          {activeWorkflow(workflow) && <button type="button" disabled={busy || loading || saving} onClick={() => void action(async valid => { const next = await pluginApi.stop(workflow!); if (valid()) { receive(next); setNotice(next.state === 'stopped' ? 'Run stopped.' : 'Stop requested.'); } })}>Stop run</button>}
          {reviewableWorkflow(workflow) && <button type="button" disabled={busy || loading || saving} onClick={() => review('defer')}>Review later</button>}
        </div>
      </details>
    </div>
    {detailsOpen && <section id={detailsId} className="todo-execution-details" aria-label={reviewableWorkflow(workflow) ? 'Review Diane result' : 'Diane run details'}>
      <header><strong>{workflow ? workflowLabel(workflow.state) : 'Run details'}</strong><button type="button" onClick={closeDetails} aria-label="Close Diane run details">×</button></header>
      {displayed?.result?.summary && <p className="todo-execution-result">{displayed.result.summary}</p>}
      {staleReview && reviewableWorkflow(workflow) && <p role="status">A newer result is available. <button type="button" onClick={() => setReviewSnapshot(workflow)}>Review latest</button></p>}
      {reviewConflict && <p className="todo-execution-conflict" role="status">{reviewConflict}</p>}
      {bound && <p className="todo-execution-root">{bound.root}</p>}
      {!workflow && fingerprint && preparation?.context && <p>{preparation.context}</p>}
      {!workflow && !project && preparation?.reason && <p>{preparation.reason}</p>}
      {origin?.meeting_id && host && <button type="button" onClick={() => host.open('meeting', origin.meeting_id, origin.transcript_revision)}>{origin.title || 'Source meeting'}</button>}
      {workflow && open(workflow)}
      {reviewableWorkflow(workflow) && <div className="todo-execution-review-actions">
        <button type="button" className="todo-execution-primary" disabled={busy || loading || saving || staleReview || !reviewSnapshot || Boolean(reviewConflict)} onClick={() => review('accept')}>Accept & complete</button>
        <button type="button" disabled={busy || loading || saving || staleReview || !reviewSnapshot || !enabled || Boolean(reviewConflict)} aria-expanded={revising} onClick={() => setRevising(value => !value)}>Request changes</button>
        {canDiscardResult && <button type="button" disabled={busy || loading || saving || staleReview || !reviewSnapshot} onClick={() => review('stop')} title="Discard this result and keep the task unchanged">Discard result</button>}
      </div>}
      {reviewableWorkflow(workflow) && !canDiscardResult && <p>Update Diane to discard a result without closing its task.</p>}
      {revising && reviewableWorkflow(workflow) && <form className="todo-execution-revision" onSubmit={event => { event.preventDefault(); review('revise'); }}>
        <label>Changes requested<textarea autoFocus value={feedback} onChange={event => setFeedback(event.target.value)} placeholder="What needs to change?" disabled={busy}/></label>
        <div><button type="submit" disabled={busy || saving || staleReview || !enabled || !feedback.trim() || Boolean(reviewConflict)}>Send changes</button><button type="button" disabled={busy} onClick={() => setRevising(false)}>Cancel</button></div>
      </form>}
      {previous.length > 0 && <details className="todo-execution-history"><summary>Previous runs <span>{previous.length}</span></summary><ul>{previous.map((item, index) => <li key={item.key}><span>{item.label}</span>{open(item.workflow, 'Open', `Open previous Diane session ${index + 1}`)}</li>)}</ul></details>}
    </section>}
    {error && <p className="todo-execution-error" role="alert">{error}</p>}
    {notice && <p className="todo-execution-notice" role="status">{notice}</p>}
  </div>;
}
