const { spawnSync } = require('node:child_process')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const suites = [
  'workspace-matching', 'shared-account', 'shared-agent', 'conditional-sync', 'finish-dates', 'app-updates', 'app-updates-auto', 'update-persistence',
  'update-manifest', 'task-loading', 'task-rollover', 'task-completion',
  'calendar-rollover', 'task-save-recovery', 'task-history', 'day-planning',
  'ai-errors', 'review-reliability', 'cloud-sync', 'sync-merge', 'sync-merge-controller', 'sync-local-races', 'account-return', 'sync-progress', 'sync-conflicts', 'workflow-improvements', 'goal-linkage', 'sync-efficiency', 'sync-frequency', 'project-planning',
]

for (const suite of suites) {
  console.log(`\n${suite}`)
  const result = spawnSync(process.execPath, [path.join(root, 'tests', `${suite}.cjs`)], { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
console.log(`\nPassed all ${suites.length} Node regression suites`)
