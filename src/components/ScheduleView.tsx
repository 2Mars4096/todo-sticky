interface ScheduleItem {
  time: string
  task: string
  action?: string
  duration: string
  assignedTo: string
  reason?: string
}

interface MachineJob {
  machine: string
  task: string
  startTime: string
  duration: string
}

interface ScheduleResult {
  plan: string
  schedule?: ScheduleItem[]
  machineJobs?: MachineJob[]
}

interface Props {
  result: ScheduleResult
  onClose: () => void
}

export function ScheduleView({ result, onClose }: Props) {
  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="schedule-panel" onClick={e => e.stopPropagation()}>
        <div className="schedule-header">
          <h3>Daily Schedule</h3>
          <button className="schedule-close" onClick={onClose}>✕</button>
        </div>

        <div className="schedule-body">
          {result.plan && (
            <p className="schedule-summary">{result.plan}</p>
          )}

          {result.schedule && result.schedule.length > 0 && (
            <div className="schedule-section">
              <div className="schedule-section-title">Timeline</div>
              {result.schedule.map((item, i) => (
                <div key={i} className="schedule-row">
                  <div className="schedule-time">{item.time}</div>
                  <div className="schedule-dot" />
                  <div className="schedule-detail">
                    <div className="schedule-task-name">{item.task}</div>
                    {item.action && (
                      <div className="schedule-action">{item.action}</div>
                    )}
                    <div className="schedule-meta">
                      <span>{item.duration}</span>
                      <span className="schedule-assigned">{item.assignedTo}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.machineJobs && result.machineJobs.length > 0 && (
            <div className="schedule-section">
              <div className="schedule-section-title">Machine Jobs (parallel)</div>
              {result.machineJobs.map((job, i) => (
                <div key={i} className="schedule-row machine-row">
                  <div className="schedule-time">{job.startTime}</div>
                  <div className="schedule-dot machine-dot" />
                  <div className="schedule-detail">
                    <div className="schedule-task-name">{job.task}</div>
                    <div className="schedule-meta">
                      <span>{job.duration}</span>
                      <span className="schedule-assigned">{job.machine}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="btn-row">
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
