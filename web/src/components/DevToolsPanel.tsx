interface Props {
  taskCount: number
  missionActive: boolean
  missionTimeScale: number
  missionTimeScaleOptions: number[]
  onAddSampleTask: () => void
  onAddTaskPack: () => void
  onClearDay: () => void
  onReload: () => void
  onSetMissionTimeScale: (value: number) => void
}

export function DevToolsPanel({
  taskCount,
  missionActive,
  missionTimeScale,
  missionTimeScaleOptions,
  onAddSampleTask,
  onAddTaskPack,
  onClearDay,
  onReload,
  onSetMissionTimeScale,
}: Props) {
  return (
    <div className="dev-tools-panel">
      <div className="dev-tools-row">
        <div className="dev-tools-head">
          <div className="dev-tools-title">
            <span>Dev Mode</span>
            <strong>{taskCount} task{taskCount === 1 ? '' : 's'}</strong>
          </div>
          <span className="dev-tools-badge">local</span>
        </div>

        <div className="dev-tools-actions">
          <button onClick={onAddSampleTask}>Sample</button>
          <button onClick={onAddTaskPack}>Pack</button>
          <button onClick={onClearDay} disabled={!taskCount}>Clear Day</button>
          <button onClick={onReload}>Reload</button>
        </div>
      </div>

      <div className="dev-tools-row mission">
        <div className="dev-tools-head">
          <div className="dev-tools-title">
            <span>Mission Time</span>
            <strong>{missionTimeScale}x {missionActive ? 'live' : 'next launch'}</strong>
          </div>
        </div>

        <div className="dev-tools-actions speed">
          {missionTimeScaleOptions.map(option => (
            <button
              key={option}
              className={missionTimeScale === option ? 'active' : ''}
              onClick={() => onSetMissionTimeScale(option)}
            >
              {option}x
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
