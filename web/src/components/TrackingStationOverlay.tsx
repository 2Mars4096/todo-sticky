import { formatLanguage } from '../interfaceLocale'
import { ui } from '../interfaceLocale'
import { Component, Suspense, lazy, useRef, useState, type ReactNode } from 'react'
import type { StarFocusMissionRecord, StarFocusSession } from '../types'
import {
  STAR_FOCUS_ARCHIVE_LIMIT_OPTIONS,
  STAR_FOCUS_PHASES,
  type StarFocusSnapshot,
} from '../hooks/useStarFocus'
import {
  getJourneyLeg,
  getNextJourneyLeg,
  type StarFocusJourneyLeg,
} from '../starFocusJourney'
import { StarFocusOrbitalMap } from './StarFocusOrbitalMap'
import { useDialogFocus } from '../hooks/useDialogFocus'
import '../styles/focus-refinements.css'

const TrackingStationOrbitalMap3D = lazy(async () => {
  const module = await import('./StarFocusOrbitalMap3D')
  return { default: module.StarFocusOrbitalMap3D }
})

// Isolate graphics and chunk-loading failures from the running focus session.
class FocusMapBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() { return { failed: true } }

  componentDidCatch(error: unknown) {
    console.warn('Focus map unavailable; using the simplified map.', error)
  }

  render() { return this.state.failed ? this.props.fallback : this.props.children }
}

interface Props {
  collapsed: boolean
  taskCount: number
  selectedTaskText: string | null
  sessionDurationMinutes: number
  archiveRetentionLimit: number
  activeSession: StarFocusSession | null
  activeSnapshot: StarFocusSnapshot | null
  missionHistory: StarFocusMissionRecord[]
  latestCompletedMission: StarFocusMissionRecord | null
  restoredSession: boolean
  onClose: () => void
  onSelectDuration: (minutes: number) => void
  onSelectArchiveRetentionLimit: (limit: number) => void
  onLaunch: () => void
  onPause: () => void
  onResume: () => void
  onCancel: () => void
  onComplete: () => void
  onClearSelection: () => void
  onReviewTask?: () => void
  onDismissCompletion: () => void
  onClearHistory: () => void
  onResetOrbitMap: () => void
}

const durationOptions = [15, 25, 45]
const RECENT_ARCHIVE_MISSION_COUNT = 6
const phaseCopy = {
  get ignition(){ return ui("Clamp release") },
  get ascent(){ return ui("Outbound burn") },
  get heating(){ return ui("Peak focus") },
  get staging(){ return ui("Course correction") },
  get orbit(){ return ui("Arrival window") },
} as const

function formatClock(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function formatDuration(minutes: number) {
  return `${minutes}m`
}

function formatCompletedAt(timestamp: number) {
  return new Date(timestamp).toLocaleString(formatLanguage(), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function RouteReadout({
  leg,
  progress,
  arrived = false,
}: {
  leg: StarFocusJourneyLeg
  progress: number
  arrived?: boolean
}) {
  return (
    <div className="solar-route-readout">
      <div className="solar-route-stop origin">
        <span>{ui("From")}</span>
        <strong>{leg.origin.name}</strong>
      </div>
      <div className="solar-route-track" aria-label={ui("{0} to {1}", [leg.origin.name, leg.destination.name])}>
        <span className="solar-route-line" />
        <span
          className={`solar-route-craft ${arrived ? 'arrived' : ''}`}
          style={{ left: `${Math.max(4, Math.min(96, progress * 100))}%` }}
        />
      </div>
      <div className="solar-route-stop destination">
        <span>{ui("To")}</span>
        <strong>{leg.destination.name}</strong>
      </div>
    </div>
  )
}

function PhaseRoute({ activeSnapshot }: { activeSnapshot: StarFocusSnapshot | null }) {
  const currentIndex = activeSnapshot
    ? STAR_FOCUS_PHASES.findIndex(phase => phase.id === activeSnapshot.phase)
    : -1

  return (
    <div className="focus-phase-route" aria-label={ui("Focus session phases")}>
      {STAR_FOCUS_PHASES.map((phase, index) => (
        <div
          key={phase.id}
          className={`focus-phase-step ${index < currentIndex ? 'done' : ''} ${index === currentIndex ? 'current' : ''}`}
          aria-current={index === currentIndex ? 'step' : undefined}
        >
          <span className="focus-phase-node" />
          <span>{phase.label}</span>
        </div>
      ))}
    </div>
  )
}

export function TrackingStationOverlay({
  taskCount,
  selectedTaskText,
  sessionDurationMinutes,
  archiveRetentionLimit,
  activeSession,
  activeSnapshot,
  missionHistory,
  latestCompletedMission,
  restoredSession,
  onClose,
  onSelectDuration,
  onSelectArchiveRetentionLimit,
  onLaunch,
  onPause,
  onResume,
  onCancel,
  onComplete,
  onClearSelection,
  onReviewTask,
  onDismissCompletion,
  onClearHistory,
  onResetOrbitMap,
}: Props) {
  const [archiveView, setArchiveView] = useState<'recent' | 'full'>('recent')
  const [mapUnavailable, setMapUnavailable] = useState(false)
  const [mapAttempt, setMapAttempt] = useState(0)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useDialogFocus(onClose, {
    initialFocusRef: closeButtonRef,
    // The selected task's contextual Focus action disappears when the modal opens.
    // Its stable title is the nearest meaningful place to resume keyboard work.
    returnFocus: () => document.querySelector<HTMLElement>('.task-item.selected-for-focus .task-text[role="button"]'),
  })
  const orbitCount = missionHistory.length
  const canBrowseFullArchive = missionHistory.length > RECENT_ARCHIVE_MISSION_COUNT
  const effectiveArchiveView = canBrowseFullArchive ? archiveView : 'recent'
  const visibleArchiveMissions = effectiveArchiveView === 'recent'
    ? missionHistory.slice(0, RECENT_ARCHIVE_MISSION_COUNT)
    : missionHistory
  const liveLabel = activeSnapshot
    ? STAR_FOCUS_PHASES.find(phase => phase.id === activeSnapshot.phase)?.label ?? ui("Orbit")
    : ui("Idle")
  const phaseTheme = activeSnapshot
    ? `phase-${activeSnapshot.phase}`
    : latestCompletedMission
      ? 'phase-orbit'
      : selectedTaskText
        ? 'phase-ignition'
        : 'phase-idle'
  const nextLeg = getNextJourneyLeg(missionHistory)
  const completedLeg = latestCompletedMission
    ? getJourneyLeg(latestCompletedMission.orbitIndex)
    : null
  const displayLeg = completedLeg ?? nextLeg
  const routeProgress = activeSnapshot?.progress ?? (completedLeg ? 1 : 0)
  const stateLabel = activeSession
    ? activeSnapshot?.isPaused ? ui("Paused") : liveLabel
    : completedLeg
      ? ui("Arrived")
      : selectedTaskText
        ? ui("Ready")
        : ui("Choose task")

  const projectedMap = (
    <StarFocusOrbitalMap
      variant="overlay"
      className={`tracking-starmap-viewport ${phaseTheme}`}
      liveLabel={liveLabel}
      destinationLabel={displayLeg.destination.name}
      missionHistory={missionHistory}
      activeSession={activeSession}
      activeSnapshot={activeSnapshot}
    />
  )
  const graphicsFallback = (
    <div className="focus-map-fallback">
      <div className="focus-map-notice" role="status">
        <p>{ui("Showing the simplified map. Focus controls remain available.")}</p>
        <button type="button" onClick={() => { setMapUnavailable(false); setMapAttempt(attempt => attempt + 1) }}>{ui("Try 3D again")}</button>
      </div>
      {projectedMap}
    </div>
  )

  return (
    <div className="tracking-overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        className={`tracking-station focus-refined ${phaseTheme}`}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ui("Star Focus Mode")}
        tabIndex={-1}
      >
        <header className="tracking-header">
          <div className="tracking-heading">
            <span className="mission-kicker">{ui("Star Focus · Solar Route")}</span>
            <strong>{ui("Focus Mode")}</strong>
            <span className="tracking-route-summary">{ui("{0} → {1} · Tour {2}, leg {3} of {4}", [displayLeg.origin.name, displayLeg.destination.name, displayLeg.tour, displayLeg.legNumber, displayLeg.legCount])}</span>
          </div>
          <div className="tracking-header-actions">
            <span className={`tracking-live-chip ${activeSession ? activeSnapshot?.isPaused ? 'paused' : 'live' : completedLeg ? 'complete' : selectedTaskText ? 'armed' : 'idle'}`}>
              {stateLabel}
            </span>
            <button ref={closeButtonRef} className="tracking-close-btn" onClick={onClose} aria-label={ui("Close Focus Mode")}>×</button>
          </div>
        </header>

        <div className="tracking-scroll-area">
          <main className="tracking-main">
            <section className="tracking-map-surface" aria-label={ui("Interactive solar route map")}>
              <div className="tracking-section-head">
                <span className="mission-section-label">{ui("Tracking Station")}</span>
                <span className="tracking-map-note">{ui("Drag to orbit · Scroll to zoom")}</span>
              </div>

              <FocusMapBoundary key={mapAttempt} fallback={graphicsFallback}>
                {mapUnavailable ? graphicsFallback : (
                  <Suspense fallback={projectedMap}>
                    <TrackingStationOrbitalMap3D
                      className={`tracking-starmap-viewport ${phaseTheme}`}
                      liveLabel={liveLabel}
                      destinationLabel={displayLeg.destination.name}
                      missionHistory={missionHistory}
                      activeSession={activeSession}
                      activeSnapshot={activeSnapshot}
                      onUnavailable={() => setMapUnavailable(true)}
                    />
                  </Suspense>
                )}
              </FocusMapBoundary>

              <div className="tracking-route-bar">
                <RouteReadout leg={displayLeg} progress={routeProgress} arrived={Boolean(completedLeg)} />
                <div className="tracking-route-meta">
                  <span>{displayLeg.destination.code}</span>
                  <strong>{activeSnapshot ? `${Math.round(activeSnapshot.progress * 100)}%` : completedLeg ? ui("Arrived") : ui("Next leg")}</strong>
                </div>
              </div>
            </section>

            <section className="tracking-focus-console" aria-label={ui("Focus session controls")}>
              <div className="tracking-section-head">
                <span className="mission-section-label">{ui("Focus session")}</span>
                {restoredSession && activeSession && <span className="focus-recovered-chip">{ui("Recovered")}</span>}
              </div>

              {activeSession && activeSnapshot ? (
                <div className="focus-session active">
                  <div className="focus-task-block">
                    <span>{ui("Current task")}</span>
                    <h2>{activeSession.taskText}</h2>
                  </div>
                  <div className="focus-clock-block" aria-label={ui("{0} remaining", [formatClock(activeSnapshot.remainingMs)])}>
                    <strong>{formatClock(activeSnapshot.remainingMs)}</strong>
                    <span>{activeSnapshot.isPaused ? ui("{0} paused", [liveLabel]) : phaseCopy[activeSnapshot.phase]}</span>
                  </div>
                  <div
                    className="focus-progress-shell"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(activeSnapshot.progress * 100)}
                    aria-label={ui("Focus session progress")}
                  >
                    <div className="focus-progress-fill" style={{ width: `${Math.round(activeSnapshot.progress * 100)}%` }} />
                  </div>
                  <PhaseRoute activeSnapshot={activeSnapshot} />
                  <div className="focus-primary-actions">
                    <button className="focus-btn secondary" onClick={activeSnapshot.isPaused ? onResume : onPause}>
                      {activeSnapshot.isPaused ? ui("Resume") : ui("Pause")}
                    </button>
                    <button className="focus-btn primary" onClick={onComplete}>{ui("Finish session")}</button>
                  </div>
                  <p className="focus-outcome-note">{ui("Record your focus session here. Review the task outcome in your task list.")}</p>
                  <button className="focus-cancel-btn" onClick={onCancel}>{ui("Cancel session")}</button>
                </div>
              ) : latestCompletedMission && completedLeg ? (
                <div className="focus-session complete">
                  <div className="focus-arrival-mark" aria-hidden="true">✓</div>
                  <span className="focus-eyebrow">{ui("Session saved · Arrived at")}</span>
                  <h2>{completedLeg.destination.name}</h2>
                  <p className="focus-complete-task">{latestCompletedMission.taskText}</p>
                  <div className="focus-complete-meta">
                    <span>{ui("{0} planned", [formatDuration(latestCompletedMission.durationMinutes)])}</span>
                    <span>{formatCompletedAt(latestCompletedMission.completedAt)}</span>
                  </div>
                  <p className="focus-outcome-note">{ui("Review the task outcome in your task list when you are ready.")}</p>
                  {onReviewTask && <button className="focus-btn primary wide" onClick={onReviewTask}>{ui("Review task")}</button>}
                  <button className="focus-cancel-btn" onClick={onClose}>{ui("Back to tasks")}</button>
                  <button className="focus-cancel-btn" onClick={onDismissCompletion}>{ui("Another session")}</button>
                </div>
              ) : selectedTaskText ? (
                <div className="focus-session armed">
                  <div className="focus-task-block">
                    <span>{ui("Task for this session")}</span>
                    <h2>{selectedTaskText}</h2>
                  </div>
                  <div className="focus-duration-field">
                    <span>{ui("Duration")}</span>
                    <div className="focus-duration-options" role="group" aria-label={ui("Focus duration")}>
                      {durationOptions.map(option => (
                        <button
                          key={option}
                          className={sessionDurationMinutes === option ? 'active' : ''}
                          onClick={() => onSelectDuration(option)}
                          aria-pressed={sessionDurationMinutes === option}
                        >
                          {formatDuration(option)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button className="focus-btn primary wide" onClick={onLaunch}>{ui("Start focus")}</button>
                  <button className="focus-cancel-btn" onClick={onClearSelection}>{ui("Choose another task")}</button>
                </div>
              ) : (
                <div className="focus-session idle">
                  <div className="focus-idle-orbit" aria-hidden="true"><span /></div>
                  <span className="focus-eyebrow">{ui("Next destination")}</span>
                  <h2>{displayLeg.destination.name}</h2>
                  <p>{taskCount === 1 ? ui("Choose one of your {0} task, then start a focus session.", [taskCount || ui("sticky")]) : ui("Choose one of your {0} tasks, then start a focus session.", [taskCount || ui("sticky")])}</p>
                  <button className="focus-btn primary wide" onClick={onClose}>{ui("Choose a task")}</button>
                </div>
              )}
            </section>
          </main>

          <div className="tracking-secondary">
            <section className="tracking-archive-section">
              <div className="tracking-section-head archive">
                <div>
                  <span className="mission-section-label">{ui("Travel Log")}</span>
                  <strong>{orbitCount === 1 ? ui("{0} saved session", [orbitCount]) : ui("{0} saved sessions", [orbitCount])}</strong>
                </div>
                {canBrowseFullArchive && (
                  <div className="tracking-history-toggle">
                    <button className={effectiveArchiveView === 'recent' ? 'active' : ''} onClick={() => setArchiveView('recent')} aria-pressed={effectiveArchiveView === 'recent'}>{ui("Recent")}</button>
                    <button className={effectiveArchiveView === 'full' ? 'active' : ''} onClick={() => setArchiveView('full')} aria-pressed={effectiveArchiveView === 'full'}>{ui("Full")}</button>
                  </div>
                )}
              </div>

              {visibleArchiveMissions.length ? (
                <div className="tracking-history-list">
                  {visibleArchiveMissions.map(mission => {
                    const leg = getJourneyLeg(mission.orbitIndex)
                    return (
                      <article key={mission.id} className="tracking-history-card">
                        <div className="tracking-history-top">
                          <div className="tracking-history-code">
                            <strong>{leg.destination.name}</strong>
                            <span>{mission.vehicleCode}</span>
                          </div>
                          <span className="tracking-history-burn">{ui("{0} planned", [formatDuration(mission.durationMinutes)])}</span>
                        </div>
                        <div className="tracking-history-task">{mission.taskText}</div>
                        <div className="tracking-history-meta">
                          <span>{leg.origin.code} → {leg.destination.code}</span>
                          <span>{formatCompletedAt(mission.completedAt)}</span>
                        </div>
                      </article>
                    )
                  })}
                </div>
              ) : (
                <div className="tracking-archive-empty">{ui("Saved focus sessions will appear here.")}</div>
              )}
            </section>

            <section className="tracking-settings-section">
              <div className="tracking-section-head">
                <span className="mission-section-label">{ui("Log Settings")}</span>
                <span className="tracking-map-note">{ui("On-device")}</span>
              </div>
              <div className="tracking-retention-row">
                <span>{ui("Keep latest")}</span>
                <div className="tracking-retention-controls">
                  {STAR_FOCUS_ARCHIVE_LIMIT_OPTIONS.map(limit => (
                    <button
                      key={limit}
                      className={archiveRetentionLimit === limit ? 'active' : ''}
                      onClick={() => onSelectArchiveRetentionLimit(limit)}
                      aria-pressed={archiveRetentionLimit === limit}
                    >
                      {limit}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tracking-maintenance-row">
                <button onClick={onClearHistory} disabled={!missionHistory.length}>{ui("Clear log")}</button>
                <button
                  onClick={onResetOrbitMap}
                  disabled={Boolean(activeSession) || (!missionHistory.length && !selectedTaskText && !latestCompletedMission)}
                  title={activeSession ? ui("Route reset is disabled during an active focus session") : ui("Reset local Star Focus route data")}
                >{ui("Reset route")}</button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
