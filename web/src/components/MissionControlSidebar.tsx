import { formatLanguage } from '../interfaceLocale'
import { ui } from '../interfaceLocale'
import type { StarFocusMissionRecord, StarFocusSession } from '../types'
import { STAR_FOCUS_PHASES, type StarFocusSnapshot } from '../hooks/useStarFocus'
import { getJourneyLeg, getNextJourneyLeg } from '../starFocusJourney'
import { StarFocusOrbitalMap } from './StarFocusOrbitalMap'
import '../styles/focus-refinements.css'

interface Props {
  collapsed: boolean
  taskCount: number
  selectedTaskText: string | null
  sessionDurationMinutes: number
  activeSession: StarFocusSession | null
  activeSnapshot: StarFocusSnapshot | null
  missionHistory: StarFocusMissionRecord[]
  latestCompletedMission: StarFocusMissionRecord | null
  restoredSession: boolean
  onToggleCollapse: () => void
  onOpenOverlay: () => void
  onSelectDuration: (minutes: number) => void
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
const phaseCopy = {
  ignition: {
    get callSign(){ return ui("Clamp Release") },
  },
  ascent: {
    get callSign(){ return ui("Pitch Program") },
  },
  heating: {
    callSign: 'Max-Q',
  },
  staging: {
    get callSign(){ return ui("Stage Separation") },
  },
  orbit: {
    get callSign(){ return ui("Circularization") },
  },
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

export function MissionControlSidebar({
  collapsed,
  selectedTaskText,
  sessionDurationMinutes,
  activeSession,
  activeSnapshot,
  missionHistory,
  latestCompletedMission,
  restoredSession,
  onToggleCollapse,
  onOpenOverlay,
  onSelectDuration,
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
  const orbitCount = missionHistory.length
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
  const activePhaseCopy = activeSnapshot ? phaseCopy[activeSnapshot.phase] : null
  const hiddenHistoryCount = Math.max(0, missionHistory.length - 3)
  const nextLeg = getNextJourneyLeg(missionHistory)
  const completedLeg = latestCompletedMission
    ? getJourneyLeg(latestCompletedMission.orbitIndex)
    : null
  const displayLeg = completedLeg ?? nextLeg

  return (
    <aside className={`mission-sidebar focus-refined ${collapsed ? 'collapsed' : ''}`} aria-label={ui("Star Focus mission control")}>
      <div className="mission-top">
        {!collapsed && (
          <div className="mission-heading">
            <span className="mission-kicker">{ui("Star Focus")}</span>
            <strong>{ui("Mission Control")}</strong>
          </div>
        )}
        <button
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? ui("Expand Mission Control") : ui("Collapse Mission Control")}
          aria-label={collapsed ? ui("Open Mission Control") : ui("Close Mission Control")}
          aria-expanded={!collapsed}
        >
          {collapsed ? '‹' : '›'}
        </button>
      </div>

      {collapsed ? (
        <div className="mission-mini-stats">
          <span className="rail-name">{ui("Focus")}</span>
          <div className="mini-stat">
            <strong>{activeSession ? activeSnapshot?.isPaused ? ui("HOLD") : ui("LIVE") : orbitCount}</strong>
            <span>{activeSession ? ui("State") : ui("Orbit")}</span>
          </div>
          <div className="mini-stat">
            <strong>{displayLeg.destination.code}</strong>
            <span>{ui("Next")}</span>
          </div>
          <div className="mini-stat">
            <strong>{activeSnapshot ? formatClock(activeSnapshot.remainingMs) : formatDuration(sessionDurationMinutes)}</strong>
            <span>{activeSnapshot ? ui("Left") : ui("Timer")}</span>
          </div>
          <button
            className="mission-mini-open"
            onClick={onOpenOverlay}
            title={ui("Open Focus Mode")}
            aria-label={ui("Open Focus Mode")}
          ><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6m0 6 7-7"/>
            </svg></button>
        </div>
      ) : (
        <div className="mission-body">
          <section className="mission-panel mission-status-panel">
            <div className="mission-panel-head">
              <span className="mission-section-label">{ui("Flight Deck")}</span>
              <span className={`mission-state-chip ${activeSession ? activeSnapshot?.isPaused ? 'paused' : 'live' : selectedTaskText ? 'armed' : 'idle'}`}>
                {activeSession ? activeSnapshot?.isPaused ? ui("Paused") : liveLabel : selectedTaskText ? ui("Ready") : ui("Idle")}
              </span>
            </div>

            <div className="mission-route-readout">
              <span>{displayLeg.origin.code}</span>
              <i aria-hidden="true" />
              <strong>{displayLeg.destination.name}</strong>
              <small>{displayLeg.legNumber}/{displayLeg.legCount}</small>
            </div>

            {activeSession && activeSnapshot ? (
              <div className={`mission-status-card active ${phaseTheme}`}>
                <div className="mission-phase-banner">
                  <span>{activePhaseCopy?.callSign ?? ui("Flight Path")}</span>
                  <strong>{activeSnapshot.isPaused ? ui("Timer Held") : ui("Tracking")}</strong>
                </div>
                <div className="mission-task-title">{activeSession.taskText}</div>
                <div className="mission-flag-row">
                  {restoredSession && <span className="mission-flag">{ui("Reload Safe")}</span>}
                  <span className="mission-flag">{activeSnapshot.isPaused ? ui("Hold") : ui("Live Burn")}</span>
                  <span className="mission-flag">{formatDuration(activeSession.durationMinutes)}</span>
                </div>
                <div className="mission-time-row">
                  <div>
                    <span className="mission-metric-label">{activeSnapshot.isPaused ? ui("Time On Hold") : ui("Time Remaining")}</span>
                    <strong>{formatClock(activeSnapshot.remainingMs)}</strong>
                  </div>
                  <div>
                    <span className="mission-metric-label">{ui("Flight Phase")}</span>
                    <strong>{activeSnapshot.isPaused ? ui("{0} Hold", [liveLabel]) : liveLabel}</strong>
                  </div>
                </div>
                <div className="mission-progress-shell">
                  <div
                    className="mission-progress-fill"
                    style={{ width: `${Math.round(activeSnapshot.progress * 100)}%` }}
                  />
                </div>
                <div className="mission-action-row">
                  <button className="mission-btn subtle" onClick={activeSnapshot.isPaused ? onResume : onPause}>
                    {activeSnapshot.isPaused ? ui("Resume") : ui("Pause")}
                  </button>
                  <button className="mission-btn primary" onClick={onComplete}>{ui("Finish session")}</button>
                  <button className="mission-btn subtle danger" onClick={onCancel}>{ui("Cancel session")}</button>
                </div>
                <p className="focus-outcome-note">{ui("Record your focus session here. Review the task outcome in your task list.")}</p>
              </div>
            ) : latestCompletedMission ? (
              <div className="mission-status-card success">
                <div className="mission-panel-head compact">
                  <span className="mission-section-label">{ui("Session saved")}</span>
                  <span className="mission-success-tag">{latestCompletedMission.vehicleCode}</span>
                </div>
                <div className="mission-task-title">{latestCompletedMission.taskText}</div>
                <div className="mission-time-row">
                  <div>
                    <span className="mission-metric-label">{ui("Completed")}</span>
                    <strong>{formatCompletedAt(latestCompletedMission.completedAt)}</strong>
                  </div>
                  <div>
                    <span className="mission-metric-label">{ui("Planned duration")}</span>
                    <strong>{formatDuration(latestCompletedMission.durationMinutes)}</strong>
                  </div>
                </div>
                <div className="mission-action-row">
                  <button className="mission-btn primary" onClick={onDismissCompletion}>{ui("Another session")}</button>
                </div>
                <p className="focus-outcome-note">{ui("Review the task outcome in your task list when you are ready.")}</p>
                {onReviewTask && <button className="mission-btn primary" onClick={onReviewTask}>{ui("Review task")}</button>}
              </div>
            ) : selectedTaskText ? (
              <div className="mission-status-card armed">
                <div className="mission-task-title">{selectedTaskText}</div>
                <div className="duration-row" role="group" aria-label={ui("Focus duration")}>
                  {durationOptions.map(option => (
                    <button
                      key={option}
                      className={`duration-chip ${sessionDurationMinutes === option ? 'active' : ''}`}
                      onClick={() => onSelectDuration(option)}
                      aria-pressed={sessionDurationMinutes === option}
                    >
                      {formatDuration(option)}
                    </button>
                  ))}
                </div>
                <div className="mission-action-row">
                  <button className="mission-btn primary" onClick={onLaunch}>{ui("Start focus")}</button>
                  <button className="mission-btn subtle" onClick={onClearSelection}>{ui("Clear selection")}</button>
                </div>
              </div>
            ) : (
              <div className="mission-status-card idle">
                <div className="mission-task-title">{ui("Choose a task to focus on")}</div>
              </div>
            )}
          </section>

          <section className="mission-panel starmap-panel">
            <div className="mission-panel-head">
              <span className="mission-section-label">{ui("Orbital Map")}</span>
              <button className="mission-link-btn" onClick={onOpenOverlay}>{ui("Focus Mode")}</button>
            </div>

            <StarFocusOrbitalMap
              variant="sidebar"
              className={phaseTheme}
              liveLabel={liveLabel}
              destinationLabel={displayLeg.destination.name}
              missionHistory={missionHistory}
              activeSession={activeSession}
              activeSnapshot={activeSnapshot}
            />

            <div className="phase-strip">
              {STAR_FOCUS_PHASES.map(phase => {
                const currentIndex = activeSnapshot
                  ? STAR_FOCUS_PHASES.findIndex(item => item.id === activeSnapshot.phase)
                  : -1
                const phaseIndex = STAR_FOCUS_PHASES.findIndex(item => item.id === phase.id)

                return (
                  <div
                    key={phase.id}
                    className={`phase-pill ${
                      activeSnapshot && phaseIndex < currentIndex ? 'done' : ''
                    } ${
                      activeSnapshot?.phase === phase.id ? 'current' : ''
                    }`}
                  >
                    {phase.label}
                  </div>
                )
              })}
            </div>
          </section>

          <section className="mission-panel mission-history-panel">
            <div className="mission-panel-head">
              <span className="mission-section-label">{ui("Recent sessions")}</span>
            </div>

            {missionHistory.length ? (
              <div className="mission-history-list">
                {missionHistory.slice(0, 3).map(mission => (
                  <div key={mission.id} className="mission-history-row">
                    <div className="mission-history-code">
                      <strong>{mission.vehicleCode}</strong>
                      <span>{getJourneyLeg(mission.orbitIndex).destination.code}</span>
                    </div>
                    <div className="mission-history-copy">
                      <div className="mission-history-task">{mission.taskText}</div>
                      <div className="mission-history-meta">
                        <span>{ui("{0} planned", [formatDuration(mission.durationMinutes)])}</span>
                        <span>{formatCompletedAt(mission.completedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {hiddenHistoryCount > 0 && (
                  <div className="mission-history-overflow">{hiddenHistoryCount === 1 ? ui("+{0} archived mission", [hiddenHistoryCount]) : ui("+{0} archived missions", [hiddenHistoryCount])}</div>
                )}
              </div>
            ) : (
              <p className="mission-empty-copy">{ui("No completed sessions.")}</p>
            )}

            <div className="mission-maintenance-row">
              <button
                className="mission-maintenance-btn"
                onClick={onClearHistory}
                disabled={!missionHistory.length}
                title={missionHistory.length ? ui("Clear mission history but keep the current session shell") : ui("No mission history to clear")}
              >{ui("Clear History")}</button>
              <button
                className="mission-maintenance-btn"
                onClick={onResetOrbitMap}
                disabled={Boolean(activeSession) || (!missionHistory.length && !selectedTaskText && !latestCompletedMission)}
                title={activeSession ? ui("Orbit reset is disabled while a session is active") : ui("Reset the local Star Focus orbit map")}
              >{ui("Reset Orbit Map")}</button>
            </div>
            {activeSession && (
              <p className="mission-maintenance-note">{ui("Disabled during an active mission.")}</p>
            )}
          </section>
        </div>
      )}
    </aside>
  )
}
