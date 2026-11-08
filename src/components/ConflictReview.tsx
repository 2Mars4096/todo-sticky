import { useEffect, useRef, useState } from 'react'
import type { CloudAccount } from './AccountPanel'
import { conflictFingerprint, conflictRows, rowDifference, visibleConflictRows, type SyncRecoveryEntry } from '../syncConflicts'
import type { SyncAction, SyncPayload } from '../cloudSync'
import { syncRecordLabel } from '../syncProgress'
import { SyncProgressView } from './SyncProgressView'
import { canonical, mergeValueText } from '../syncMerge'

type Entry = Pick<SyncAction, 'key' | 'local' | 'remote' | 'merge' | 'mergeProblem'> & { id: string; at?: string }
function Version({ title, recordKey, payload, other, differences, emptyLabel, choice, onChoose, disabled }: {
  title: string; recordKey: string; payload: SyncPayload; other: SyncPayload; differences: boolean; emptyLabel: string;
  choice?: boolean; onChoose?: () => void; disabled: boolean;
}) {
  const all = conflictRows(recordKey, payload), opposite = conflictRows(recordKey, other)
  const rows = visibleConflictRows(all, opposite, differences)
  return <section className={`cloud-version${choice ? ' is-selected' : ''}`} aria-label={title}>
    <header>{onChoose ? <label><input type="radio" name="conflict-version" checked={choice} onChange={onChoose} disabled={disabled} />{title}</label> : <strong>{title}</strong>}<span>{all.length}</span></header>
    <div className="cloud-version-rows">
      {!payload ? <p className="cloud-version-empty">{emptyLabel}</p> : !all.length ? <p className="cloud-version-empty">Empty</p> : !rows.length ? <p className="cloud-version-empty">No differences here</p> : rows.map((row, index) => <div key={`${row.group}:${row.id}`}>
        {row.group && row.group !== rows[index - 1]?.group && <h5>{row.group}</h5>}
        <div className="cloud-version-row" style={{ paddingLeft: Math.min(row.depth, 6) * 9 }}>
          <div className="cloud-version-title"><span aria-label={row.status} title={row.status}>{({ done: '☑', partial: '◧', stopped: '−', question: '?' } as Record<string, string>)[row.status] ?? '□'}</span><span>{row.text || '(Blank task)'}</span></div>
          {rowDifference(row, opposite) && <small className="cloud-diff-label">{rowDifference(row, opposite)}</small>}
          {row.details.map((detail, i) => <small className="cloud-version-detail" key={i}>{detail}</small>)}
        </div>
      </div>)}
    </div>
  </section>
}
function Inspector({ entry, history, account, onBack }: { entry: Entry; history: boolean; account: CloudAccount; onBack: () => void }) {
  const [choice, setChoice] = useState<'local' | 'cloud' | null>(null)
  const [differences, setDifferences] = useState(true)
  const cloud = entry.remote?.deleted ? null : entry.remote?.payload ?? null
  return <>
    <div className="cloud-review-options"><label><input type="checkbox" checked={differences} onChange={e => setDifferences(e.target.checked)} />Differences only</label><span className="cloud-saved-label">Both copies saved</span></div>
    {entry.at && <time className="cloud-copy-time">{new Date(entry.at).toLocaleString()}</time>}
    <div className="cloud-compare">
      <Version title="This Mac" recordKey={entry.key} payload={entry.local} other={cloud} differences={differences} emptyLabel="Not on this Mac" choice={choice === 'local'} onChoose={history ? undefined : () => setChoice('local')} disabled={account.busy} />
      <Version title="Cloud" recordKey={entry.key} payload={cloud} other={entry.local} differences={differences} emptyLabel={entry.remote?.deleted ? 'Deleted' : 'Not in cloud'} choice={choice === 'cloud'} onChoose={history ? undefined : () => setChoice('cloud')} disabled={account.busy} />
    </div>
    <div className="cloud-review-footer">
      <button type="button" className="cloud-quiet" onClick={() => account.exportRecovery({ key: entry.key, at: entry.at })}>Export copies</button>
      {!history && <><button type="button" className="cloud-quiet" onClick={onBack}>Later</button><button type="button" className="cloud-primary" disabled={!choice || account.busy} onClick={() => { if (choice) void account.resolve(entry.key, choice, conflictFingerprint(entry)) }}>Apply choice</button></>}
    </div>
  </>
}
function ItemInspector({ entry, account, onBack }: { entry: Entry; account: CloudAccount; onBack: () => void }) {
  const [picks, setPicks] = useState<Record<string, { fingerprint: string; choice: 'local' | 'cloud' }>>({})
  const issues = entry.merge?.issues ?? [{ path: '', label: syncRecordLabel(entry.key), local: entry.local, cloud: entry.remote?.deleted ? null : entry.remote?.payload ?? null }]
  const selected = Object.fromEntries(issues.filter(issue => picks[issue.path]?.fingerprint === canonical(issue)).map(issue => [issue.path, picks[issue.path].choice]))
  return <>
    {entry.mergeProblem && <p role="alert" className="settings-error">{entry.mergeProblem}</p>}
    <div className="cloud-review-options"><span>{issues.length - Object.keys(selected).length} remaining</span><span className="cloud-saved-label">Both copies saved</span></div>
    <div className="cloud-item-conflicts">{issues.map(issue => <fieldset key={issue.path} className="cloud-item-conflict">
      <legend>{issue.label}</legend>
      <div className="cloud-item-versions">{(['local', 'cloud'] as const).map(choice => <label key={choice} className={selected[issue.path] === choice ? 'is-selected' : ''}>
        <span><input type="radio" name={`merge:${issue.path}`} checked={selected[issue.path] === choice} onChange={() => setPicks(previous => ({ ...previous, [issue.path]: { fingerprint: canonical(issue), choice } }))} />{choice === 'local' ? 'This Mac' : 'Cloud'}</span>
        <span className="cloud-item-value">{mergeValueText(issue[choice])}</span>
      </label>)}</div>
    </fieldset>)}</div>
    <div className="cloud-review-footer">
      <button type="button" className="cloud-quiet" onClick={() => account.exportRecovery({ key: entry.key })}>Export copies</button>
      <button type="button" className="cloud-quiet" onClick={onBack}>Later</button>
      <button type="button" className="cloud-primary" disabled={!issues.length || Object.keys(selected).length !== issues.length || account.busy} onClick={() => {
        if (entry.merge) void account.resolveItems(entry.key, selected, conflictFingerprint(entry))
        else void account.resolve(entry.key, selected[''], conflictFingerprint(entry))
      }}>Apply choices</button>
    </div>
  </>
}
export function ConflictReview({ account, initialHistory, onBack }: { account: CloudAccount; initialHistory: boolean; onBack: () => void }) {
  const [history, setHistory] = useState(initialHistory)
  const [selected, setSelected] = useState('')
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => { heading.current?.focus() }, [])
  const entries: Entry[] = history
    ? account.recovery.map((copy: SyncRecoveryEntry, index) => ({ ...copy, id: `${copy.key}:${copy.at}:${index}` })).reverse()
    : account.conflicts.map(conflict => ({ ...conflict, id: conflict.key }))
  const entry = entries.find(item => item.id === selected) ?? entries[0]
  return <section className="cloud-account cloud-review" onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onBack() } }} aria-labelledby="conflict-heading">
    <div className="cloud-review-heading"><button type="button" className="cloud-quiet" onClick={onBack}>← Account</button><h3 ref={heading} tabIndex={-1} id="conflict-heading">Conflicts & recovery</h3></div>
    <div className="cloud-review-tabs" role="group" aria-label="Review type"><button type="button" aria-pressed={!history} onClick={() => { setHistory(false); setSelected('') }}>Needs review {account.conflicts.length}</button><button type="button" aria-pressed={history} onClick={() => { setHistory(true); setSelected('') }}>Saved copies {account.recovery.length}</button></div>
    {entry ? <>
      <label className="cloud-review-select">{history ? 'Local recovery' : 'Conflict'}<select aria-label={history ? 'Saved conflict' : 'Conflict'} value={entry.id} onChange={e => setSelected(e.target.value)}>{entries.map(item => <option key={item.id} value={item.id}>{syncRecordLabel(item.key)}{item.at ? ` · ${new Date(item.at).toLocaleString()}` : ''}</option>)}</select></label>
      {history ? <Inspector key={entry.id} entry={entry} history account={account} onBack={onBack} /> : <ItemInspector key={entry.id} entry={entry} account={account} onBack={onBack} />}
    </> : <p className="cloud-review-empty">{history ? 'No saved copies' : 'No conflicts'}</p>}
    {account.progress && !account.background && <SyncProgressView progress={account.progress} />}
    {account.error && <p role="alert" className="settings-error">{account.error}</p>}
  </section>
}
