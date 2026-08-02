import type { StarFocusMissionRecord, StarFocusSession } from '../types'
import { STAR_FOCUS_PHASES, type StarFocusSnapshot } from '../hooks/useStarFocus'
import { StarFocusOrbitalMap } from './StarFocusOrbitalMap'

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
  onDismissCompletion: () => void
  onClearHistory: () => void
  onResetOrbitMap: () => void
}

const durationOptions = [15, 25, 45]
const phaseCopy = {
  ignition: {
    callSign: 'Clamp Release',
  },
  ascent: {
    callSign: 'Pitch Program',
  },
  heating: {
    callSign: 'Max-Q',
  },
  staging: {
    callSign: 'Stage Separation',
  },
  orbit: {
    callSign: 'Circularization',
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
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function MissionControlSidebar({
  collapsed,
  taskCount,
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
  onDismissCompletion,
  onClearHistory,
  onResetOrbitMap,
}: Props) {
  const orbitCount = missionHistory.length
  const liveLabel = activeSnapshot
    ? STAR_FOCUS_PHASES.find(phase => phase.id === activeSnapshot.phase)?.label ?? 'Orbit'
    : 'Idle'
  const phaseTheme = activeSnapshot
    ? `phase-${activeSnapshot.phase}`
    : latestCompletedMission
      ? 'phase-orbit'
      : selectedTaskText
        ? 'phase-ignition'
        : 'phase-idle'
  const activePhaseCopy = activeSnapshot ? phaseCopy[activeSnapshot.phase] : null
  const hiddenHistoryCount = Math.max(0, missionHistory.length - 3)

  return (
    <aside className={`mission-sidebar ${collapsed ? 'collapsed' : ''}`} aria-label="Star Focus mission control">
      <div className="mission-top">
        {!collapsed && (
          <div className="mission-heading">
            <span className="mission-kicker">Star Focus</span>
            <strong>Mission Control</strong>
          </div>
        )}
        <button
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand Mission Control' : 'Collapse Mission Control'}
          aria-label={collapsed ? 'Open Mission Control' : 'Close Mission Control'}
          aria-expanded={!collapsed}
        >
          {collapsed ? '‹' : '›'}
        </button>
      </div>

      {collapsed ? (
        <div className="mission-mini-stats">
          <span className="rail-name">Focus</span>
          <div className="mini-stat">
            <strong>{activeSession ? activeSnapshot?.isPaused ? 'HOLD' : 'LIVE' : orbitCount}</strong>
            <span>{activeSession ? 'State' : 'Orbit'}</span>
          </div>
          <div className="mini-stat">
            <strong>{selectedTaskText ? 'SET' : taskCount}</strong>
            <span>{selectedTaskText ? 'Task' : 'Tasks'}</span>
          </div>
          <div className="mini-stat">
            <strong>{activeSnapshot ? formatClock(activeSnapshot.remainingMs) : formatDuration(sessionDurationMinutes)}</strong>
            <span>{activeSnapshot ? 'Left' : 'Timer'}</span>
          </div>
          <button
            className="mission-mini-open"
            onClick={onOpenOverlay}
            title="Open Tracking Station"
            aria-label="Open Tracking Station"
          >
            Map
          </button>
        </div>
      ) : (
        <div className="mission-body">
          <section className="mission-panel mission-status-panel">
            <div className="mission-panel-head">
              <span className="mission-section-label">Flight Deck</span>
              <span className={`mission-state-chip ${activeSession ? activeSnapshot?.isPaused ? 'paused' : 'live' : selectedTaskText ? 'armed' : 'idle'}`}>
                {activeSession ? activeSnapshot?.isPaused ? 'Paused' : liveLabel : selectedTaskText ? 'Armed' : 'Idle'}
              </span>
            </div>

            {activeSession && activeSnapshot ? (
              <div className={`mission-status-card active ${phaseTheme}`}>
                <div className="mission-phase-banner">
                  <span>{activePhaseCopy?.callSign ?? 'Flight Path'}</span>
                  <strong>{activeSnapshot.isPaused ? 'Timer Held' : 'Tracking'}</strong>
                </div>
                <div className="mission-task-title">{activeSession.taskText}</div>
                <div className="mission-flag-row">
                  {restoredSession && <span className="mission-flag">Reload Safe</span>}
                  <span className="mission-flag">{activeSnapshot.isPaused ? 'Hold' : 'Live Burn'}</span>
                  <span className="mission-flag">{formatDuration(activeSession.durationMinutes)}</span>
                </div>
                <div className="mission-time-row">
                  <div>
                    <span className="mission-metric-label">{activeSnapshot.isPaused ? 'Time On Hold' : 'Time Remaining'}</span>
                    <strong>{formatClock(activeSnapshot.remainingMs)}</strong>
                  </div>
                  <div>
                    <span className="mission-metric-label">Flight Phase</span>
                    <strong>{activeSnapshot.isPaused ? `${liveLabel} Hold` : liveLabel}</strong>
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
                    {activeSnapshot.isPaused ? 'Resume Burn' : 'Pause Burn'}
                  </button>
                  <button className="mission-btn primary" onClick={onComplete}>Complete Orbit</button>
                  <button className="mission-btn subtle danger" onClick={onCancel}>Cancel</button>
                </div>
              </div>
            ) : latestCompletedMission ? (
              <div className="mission-status-card success">
                <div className="mission-panel-head compact">
                  <span className="mission-section-label">Docked</span>
                  <span className="mission-success-tag">{latestCompletedMission.vehicleCode}</span>
                </div>
                <div className="mission-task-title">{latestCompletedMission.taskText}</div>
                <div className="mission-time-row">
                  <div>
                    <span className="mission-metric-label">Completed</span>
                    <strong>{formatCompletedAt(latestCompletedMission.completedAt)}</strong>
                  </div>
                  <div>
                    <span className="mission-metric-label">Focus Burn</span>
                    <strong>{formatDuration(latestCompletedMission.durationMinutes)}</strong>
                  </div>
                </div>
                <div className="mission-action-row">
                  <button className="mission-btn primary" onClick={onDismissCompletion}>Keep Flying</button>
                </div>
              </div>
            ) : selectedTaskText ? (
              <div className="mission-status-card armed">
                <div className="mission-task-title">{selectedTaskText}</div>
                <div className="duration-row">
                  {durationOptions.map(option => (
                    <button
                      key={option}
                      className={`duration-chip ${sessionDurationMinutes === option ? 'active' : ''}`}
                      onClick={() => onSelectDuration(option)}
                    >
                      {formatDuration(option)}
                    </button>
                  ))}
                </div>
                <div className="mission-action-row">
                  <button className="mission-btn primary" onClick={onLaunch}>Launch</button>
                  <button className="mission-btn subtle" onClick={onClearSelection}>Clear</button>
                </div>
              </div>
            ) : (
              <div className="mission-status-card idle">
                <div className="mission-task-title">No task armed</div>
              </div>
            )}
          </section>

          <section className="mission-panel starmap-panel">
            <div className="mission-panel-head">
              <span className="mission-section-label">Orbital Map</span>
              <button className="mission-link-btn" onClick={onOpenOverlay}>
                Tracking Station
              </button>
            </div>

            <StarFocusOrbitalMap
              variant="sidebar"
              className={phaseTheme}
              liveLabel={liveLabel}
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
              <span className="mission-section-label">Recent Orbits</span>
            </div>

            {missionHistory.length ? (
              <div className="mission-history-list">
                {missionHistory.slice(0, 3).map(mission => (
                  <div key={mission.id} className="mission-history-row">
                    <div className="mission-history-code">
                      <strong>{mission.vehicleCode}</strong>
                      <span>{mission.orbitLabel}</span>
                    </div>
                    <div className="mission-history-copy">
                      <div className="mission-history-task">{mission.taskText}</div>
                      <div className="mission-history-meta">
                        <span>{formatDuration(mission.durationMinutes)}</span>
                        <span>{formatCompletedAt(mission.completedAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {hiddenHistoryCount > 0 && (
                  <div className="mission-history-overflow">
                    +{hiddenHistoryCount} archived mission{hiddenHistoryCount === 1 ? '' : 's'}
                  </div>
                )}
              </div>
            ) : (
              <p className="mission-empty-copy">
                No completed sessions.
              </p>
            )}

            <div className="mission-maintenance-row">
              <button
                className="mission-maintenance-btn"
                onClick={onClearHistory}
                disabled={!missionHistory.length}
                title={missionHistory.length ? 'Clear mission history but keep the current session shell' : 'No mission history to clear'}
              >
                Clear History
              </button>
              <button
                className="mission-maintenance-btn"
                onClick={onResetOrbitMap}
                disabled={Boolean(activeSession) || (!missionHistory.length && !selectedTaskText && !latestCompletedMission)}
                title={activeSession ? 'Orbit reset is disabled while a session is active' : 'Reset the local Star Focus orbit map'}
              >
                Reset Orbit Map
              </button>
            </div>
            {activeSession && (
              <p className="mission-maintenance-note">
                Disabled during an active mission.
              </p>
            )}
          </section>
        </div>
      )}
    </aside>
  )
}
