import { Suspense, lazy, useState } from 'react'
import type { StarFocusMissionRecord, StarFocusSession } from '../types'
import {
  STAR_FOCUS_ARCHIVE_LIMIT_OPTIONS,
  STAR_FOCUS_PHASES,
  type StarFocusSnapshot,
} from '../hooks/useStarFocus'
import { StarFocusOrbitalMap } from './StarFocusOrbitalMap'

const TrackingStationOrbitalMap3D = lazy(async () => {
  const module = await import('./StarFocusOrbitalMap3D')
  return { default: module.StarFocusOrbitalMap3D }
})

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
  onDismissCompletion: () => void
  onClearHistory: () => void
  onResetOrbitMap: () => void
}

const durationOptions = [15, 25, 45]
const RECENT_ARCHIVE_MISSION_COUNT = 6
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

export function TrackingStationOverlay({
  collapsed,
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
  onDismissCompletion,
  onClearHistory,
  onResetOrbitMap,
}: Props) {
  const [archiveView, setArchiveView] = useState<'recent' | 'full'>('recent')
  const orbitCount = missionHistory.length
  const canBrowseFullArchive = missionHistory.length > RECENT_ARCHIVE_MISSION_COUNT
  const effectiveArchiveView = canBrowseFullArchive ? archiveView : 'recent'
  const visibleArchiveMissions = effectiveArchiveView === 'recent'
    ? missionHistory.slice(0, RECENT_ARCHIVE_MISSION_COUNT)
    : missionHistory
  const hiddenArchiveCount = Math.max(0, missionHistory.length - visibleArchiveMissions.length)
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
  const statusBanner = activeSession && restoredSession
    ? {
        tone: 'restored' as const,
        label: 'Recovered',
        body: null,
        actionLabel: null,
        onAction: null,
      }
    : latestCompletedMission
      ? {
          tone: 'complete' as const,
          label: 'Archived',
          body: null,
          actionLabel: 'Clear',
          onAction: onDismissCompletion,
        }
      : selectedTaskText
        ? {
          tone: 'armed' as const,
          label: 'Task Armed',
          body: null,
            actionLabel: 'Launch',
            onAction: onLaunch,
          }
        : null

  return (
    <div className="tracking-overlay" onClick={onClose}>
      <div className={`tracking-station ${phaseTheme}`} onClick={event => event.stopPropagation()}>
        <div className="tracking-header">
          <div className="tracking-heading">
            <span className="mission-kicker">Star Focus</span>
            <strong>Tracking Station</strong>
          </div>
          <div className="tracking-header-actions">
            <div className="tracking-header-stats">
              <div className="tracking-header-stat">
                <span>Rail</span>
                <strong>{collapsed ? 'Collapsed' : 'Expanded'}</strong>
              </div>
              <div className="tracking-header-stat">
                <span>State</span>
                <strong>
                  {activeSession ? activeSnapshot?.isPaused ? 'Paused' : liveLabel : selectedTaskText ? 'Armed' : 'Idle'}
                </strong>
              </div>
              <div className="tracking-header-stat">
                <span>Archive</span>
                <strong>{orbitCount}/{archiveRetentionLimit}</strong>
              </div>
            </div>
            <button className="tracking-close-btn" onClick={onClose}>Close</button>
          </div>
        </div>

        {statusBanner && (
          <div className={`tracking-status-banner ${statusBanner.tone}`}>
            <div className="tracking-status-copy">
              <span className="tracking-status-label">{statusBanner.label}</span>
              {statusBanner.body && <p>{statusBanner.body}</p>}
            </div>
            {statusBanner.actionLabel && statusBanner.onAction && (
              <button className="tracking-status-action" onClick={statusBanner.onAction}>
                {statusBanner.actionLabel}
              </button>
            )}
          </div>
        )}

        <div className="tracking-grid">
          <section className="mission-panel tracking-orbit-panel">
            <div className="mission-panel-head">
              <span className="mission-section-label">Orbital Map</span>
            </div>

            <Suspense
              fallback={(
                <StarFocusOrbitalMap
                  variant="overlay"
                  className={`tracking-starmap-viewport ${phaseTheme}`}
                  liveLabel={liveLabel}
                  missionHistory={missionHistory}
                  activeSession={activeSession}
                  activeSnapshot={activeSnapshot}
                />
              )}
            >
              <TrackingStationOrbitalMap3D
                className={`tracking-starmap-viewport ${phaseTheme}`}
                liveLabel={liveLabel}
                missionHistory={missionHistory}
                activeSession={activeSession}
                activeSnapshot={activeSnapshot}
              />
            </Suspense>

            <div className="tracking-orbit-metrics">
              <div className="tracking-orbit-metric">
                <span>Mission Archive</span>
                <strong>{orbitCount} retained</strong>
              </div>
              <div className="tracking-orbit-metric">
                <span>Current Burn</span>
                <strong>{activeSession ? formatDuration(activeSession.durationMinutes) : formatDuration(sessionDurationMinutes)}</strong>
              </div>
              <div className="tracking-orbit-metric">
                <span>Task Feed</span>
                <strong>{taskCount} sticky task{taskCount === 1 ? '' : 's'}</strong>
              </div>
            </div>

            <div className="phase-strip tracking-phase-strip">
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

          <section className="mission-panel tracking-flight-panel">
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
                  <button className="mission-btn primary" onClick={onDismissCompletion}>Clear</button>
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

          <section className="mission-panel tracking-history-panel">
            <div className="mission-panel-head tracking-history-head">
              <span className="mission-section-label">Mission Archive</span>
              <div className="tracking-history-controls">
                <span className="mission-meta-text">
                  {effectiveArchiveView === 'recent'
                    ? `${visibleArchiveMissions.length} recent`
                    : `${missionHistory.length} retained`}
                </span>
                {canBrowseFullArchive && (
                  <div className="tracking-history-toggle">
                    <button
                      className={`tracking-history-chip ${effectiveArchiveView === 'recent' ? 'active' : ''}`}
                      onClick={() => setArchiveView('recent')}
                    >
                      Recent
                    </button>
                    <button
                      className={`tracking-history-chip ${effectiveArchiveView === 'full' ? 'active' : ''}`}
                      onClick={() => setArchiveView('full')}
                    >
                      Full
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="tracking-history-summary">
              <div className="tracking-history-summary-copy">
                <strong>Last {archiveRetentionLimit} kept on-device</strong>
                {hiddenArchiveCount > 0 && (
                  <small>+{hiddenArchiveCount} older in Full</small>
                )}
              </div>
            </div>

            {missionHistory.length ? (
              <div className="tracking-history-list">
                {visibleArchiveMissions.map(mission => (
                  <div key={mission.id} className="tracking-history-card">
                    <div className="tracking-history-top">
                      <div className="tracking-history-code">
                        <strong>{mission.vehicleCode}</strong>
                        <span>{mission.orbitLabel}</span>
                      </div>
                      <span className="tracking-history-burn">{formatDuration(mission.durationMinutes)}</span>
                    </div>
                    <div className="tracking-history-task">{mission.taskText}</div>
                    <div className="tracking-history-meta">
                      <span>Orbit {mission.orbitIndex + 1}</span>
                      <span>{formatCompletedAt(mission.completedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mission-empty-copy">
                No completed sessions.
              </p>
            )}
          </section>

          <section className="mission-panel tracking-logistics-panel">
            <div className="mission-panel-head">
              <span className="mission-section-label">Controls</span>
            </div>

            <div className="tracking-retention-card">
              <div className="tracking-retention-copy">
                <span>Archive Cap</span>
                <strong>Keep last {archiveRetentionLimit}</strong>
              </div>
              <div className="tracking-retention-controls">
                {STAR_FOCUS_ARCHIVE_LIMIT_OPTIONS.map(limit => (
                  <button
                    key={limit}
                    className={`tracking-history-chip ${archiveRetentionLimit === limit ? 'active' : ''}`}
                    onClick={() => onSelectArchiveRetentionLimit(limit)}
                  >
                    {limit}
                  </button>
                ))}
              </div>
            </div>

            <div className="mission-maintenance-row tracking-maintenance-row">
              <button
                className="mission-maintenance-btn"
                onClick={onClearHistory}
                disabled={!missionHistory.length}
                title={missionHistory.length ? 'Clear mission history but keep current selection and session defaults' : 'No mission history to clear'}
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
      </div>
    </div>
  )
}
