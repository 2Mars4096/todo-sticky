import { ui } from '../interfaceLocale'
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
            <span>{ui("Dev Mode")}</span>
            <strong>{taskCount === 1 ? ui("{0} task", [taskCount]) : ui("{0} tasks", [taskCount])}</strong>
          </div>
          <span className="dev-tools-badge">{ui("local")}</span>
        </div>

        <div className="dev-tools-actions">
          <button onClick={onAddSampleTask}>{ui("Sample")}</button>
          <button onClick={onAddTaskPack}>{ui("Pack")}</button>
          <button onClick={onClearDay} disabled={!taskCount}>{ui("Clear Day")}</button>
          <button onClick={onReload}>{ui("Reload")}</button>
        </div>
      </div>

      <div className="dev-tools-row mission">
        <div className="dev-tools-head">
          <div className="dev-tools-title">
            <span>{ui("Mission Time")}</span>
            <strong>{missionTimeScale}x {missionActive ? ui("live") : ui("next launch")}</strong>
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
