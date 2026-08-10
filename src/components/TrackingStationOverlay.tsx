import { Suspense, lazy, useState } from 'react'
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
  ignition: 'Clamp release',
  ascent: 'Outbound burn',
  heating: 'Peak focus',
  staging: 'Course correction',
  orbit: 'Arrival window',
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
        <span>From</span>
        <strong>{leg.origin.name}</strong>
      </div>
      <div className="solar-route-track" aria-label={`${leg.origin.name} to ${leg.destination.name}`}>
        <span className="solar-route-line" />
        <span
          className={`solar-route-craft ${arrived ? 'arrived' : ''}`}
          style={{ left: `${Math.max(4, Math.min(96, progress * 100))}%` }}
        />
      </div>
      <div className="solar-route-stop destination">
        <span>To</span>
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
    <div className="focus-phase-route" aria-label="Focus session phases">
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
  const nextLeg = getNextJourneyLeg(missionHistory)
  const completedLeg = latestCompletedMission
    ? getJourneyLeg(latestCompletedMission.orbitIndex)
    : null
  const displayLeg = completedLeg ?? nextLeg
  const routeProgress = activeSnapshot?.progress ?? (completedLeg ? 1 : 0)
  const stateLabel = activeSession
    ? activeSnapshot?.isPaused ? 'Paused' : liveLabel
    : completedLeg
      ? 'Arrived'
      : selectedTaskText
        ? 'Ready'
        : 'Choose task'

  return (
    <div className="tracking-overlay" onClick={onClose}>
      <div
        className={`tracking-station ${phaseTheme}`}
        onClick={event => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Star Focus Mode"
      >
        <header className="tracking-header">
          <div className="tracking-heading">
            <span className="mission-kicker">Star Focus · Solar Route</span>
            <strong>Focus Mode</strong>
            <span className="tracking-route-summary">
              {displayLeg.origin.name} → {displayLeg.destination.name} · Tour {displayLeg.tour}, leg {displayLeg.legNumber} of {displayLeg.legCount}
            </span>
          </div>
          <div className="tracking-header-actions">
            <span className={`tracking-live-chip ${activeSession ? activeSnapshot?.isPaused ? 'paused' : 'live' : completedLeg ? 'complete' : selectedTaskText ? 'armed' : 'idle'}`}>
              {stateLabel}
            </span>
            <button className="tracking-close-btn" onClick={onClose} aria-label="Close Focus Mode">×</button>
          </div>
        </header>

        <div className="tracking-scroll-area">
          <main className="tracking-main">
            <section className="tracking-map-surface" aria-label="Interactive solar route map">
              <div className="tracking-section-head">
                <span className="mission-section-label">Tracking Station</span>
                <span className="tracking-map-note">Drag to orbit · Scroll to zoom</span>
              </div>

              <Suspense
                fallback={(
                  <StarFocusOrbitalMap
                    variant="overlay"
                    className={`tracking-starmap-viewport ${phaseTheme}`}
                    liveLabel={liveLabel}
                    destinationLabel={displayLeg.destination.name}
                    missionHistory={missionHistory}
                    activeSession={activeSession}
                    activeSnapshot={activeSnapshot}
                  />
                )}
              >
                <TrackingStationOrbitalMap3D
                  className={`tracking-starmap-viewport ${phaseTheme}`}
                  liveLabel={liveLabel}
                  destinationLabel={displayLeg.destination.name}
                  missionHistory={missionHistory}
                  activeSession={activeSession}
                  activeSnapshot={activeSnapshot}
                />
              </Suspense>

              <div className="tracking-route-bar">
                <RouteReadout leg={displayLeg} progress={routeProgress} arrived={Boolean(completedLeg)} />
                <div className="tracking-route-meta">
                  <span>{displayLeg.destination.code}</span>
                  <strong>{activeSnapshot ? `${Math.round(activeSnapshot.progress * 100)}%` : completedLeg ? 'Arrived' : 'Next leg'}</strong>
                </div>
              </div>
            </section>

            <section className="tracking-focus-console" aria-label="Focus session controls">
              <div className="tracking-section-head">
                <span className="mission-section-label">Flight Deck</span>
                {restoredSession && activeSession && <span className="focus-recovered-chip">Recovered</span>}
              </div>

              {activeSession && activeSnapshot ? (
                <div className="focus-session active">
                  <div className="focus-task-block">
                    <span>Current task</span>
                    <h2>{activeSession.taskText}</h2>
                  </div>
                  <div className="focus-clock-block" aria-label={`${formatClock(activeSnapshot.remainingMs)} remaining`}>
                    <strong>{formatClock(activeSnapshot.remainingMs)}</strong>
                    <span>{activeSnapshot.isPaused ? `${liveLabel} paused` : phaseCopy[activeSnapshot.phase]}</span>
                  </div>
                  <div
                    className="focus-progress-shell"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(activeSnapshot.progress * 100)}
                  >
                    <div className="focus-progress-fill" style={{ width: `${Math.round(activeSnapshot.progress * 100)}%` }} />
                  </div>
                  <PhaseRoute activeSnapshot={activeSnapshot} />
                  <div className="focus-primary-actions">
                    <button className="focus-btn secondary" onClick={activeSnapshot.isPaused ? onResume : onPause}>
                      {activeSnapshot.isPaused ? 'Resume' : 'Pause'}
                    </button>
                    <button className="focus-btn primary" onClick={onComplete}>Complete leg</button>
                  </div>
                  <button className="focus-cancel-btn" onClick={onCancel}>Cancel session</button>
                </div>
              ) : latestCompletedMission && completedLeg ? (
                <div className="focus-session complete">
                  <div className="focus-arrival-mark" aria-hidden="true">✓</div>
                  <span className="focus-eyebrow">Arrived at</span>
                  <h2>{completedLeg.destination.name}</h2>
                  <p className="focus-complete-task">{latestCompletedMission.taskText}</p>
                  <div className="focus-complete-meta">
                    <span>{formatDuration(latestCompletedMission.durationMinutes)} focused</span>
                    <span>{formatCompletedAt(latestCompletedMission.completedAt)}</span>
                  </div>
                  <button className="focus-btn primary wide" onClick={onDismissCompletion}>Plan next leg</button>
                </div>
              ) : selectedTaskText ? (
                <div className="focus-session armed">
                  <div className="focus-task-block">
                    <span>Task for this leg</span>
                    <h2>{selectedTaskText}</h2>
                  </div>
                  <div className="focus-duration-field">
                    <span>Focus burn</span>
                    <div className="focus-duration-options" aria-label="Focus duration">
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
                  <button className="focus-btn primary wide" onClick={onLaunch}>
                    Launch to {displayLeg.destination.name}
                  </button>
                  <button className="focus-cancel-btn" onClick={onClearSelection}>Choose another task</button>
                </div>
              ) : (
                <div className="focus-session idle">
                  <div className="focus-idle-orbit" aria-hidden="true"><span /></div>
                  <span className="focus-eyebrow">Next destination</span>
                  <h2>{displayLeg.destination.name}</h2>
                  <p>Choose one of your {taskCount || 'sticky'} task{taskCount === 1 ? '' : 's'}, then start a focused leg.</p>
                  <button className="focus-btn primary wide" onClick={onClose}>Choose a task</button>
                </div>
              )}
            </section>
          </main>

          <div className="tracking-secondary">
            <section className="tracking-archive-section">
              <div className="tracking-section-head archive">
                <div>
                  <span className="mission-section-label">Travel Log</span>
                  <strong>{orbitCount} completed leg{orbitCount === 1 ? '' : 's'}</strong>
                </div>
                {canBrowseFullArchive && (
                  <div className="tracking-history-toggle">
                    <button className={effectiveArchiveView === 'recent' ? 'active' : ''} onClick={() => setArchiveView('recent')} aria-pressed={effectiveArchiveView === 'recent'}>Recent</button>
                    <button className={effectiveArchiveView === 'full' ? 'active' : ''} onClick={() => setArchiveView('full')} aria-pressed={effectiveArchiveView === 'full'}>Full</button>
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
                          <span className="tracking-history-burn">{formatDuration(mission.durationMinutes)}</span>
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
                <div className="tracking-archive-empty">Completed focus legs will appear here.</div>
              )}
            </section>

            <section className="tracking-settings-section">
              <div className="tracking-section-head">
                <span className="mission-section-label">Log Settings</span>
                <span className="tracking-map-note">On-device</span>
              </div>
              <div className="tracking-retention-row">
                <span>Keep latest</span>
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
                <button onClick={onClearHistory} disabled={!missionHistory.length}>Clear log</button>
                <button
                  onClick={onResetOrbitMap}
                  disabled={Boolean(activeSession) || (!missionHistory.length && !selectedTaskText && !latestCompletedMission)}
                  title={activeSession ? 'Route reset is disabled during an active focus session' : 'Reset local Star Focus route data'}
                >
                  Reset route
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
