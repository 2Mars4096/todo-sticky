const assert = require('node:assert/strict')
const load = require('./helpers/load-typescript.cjs')
const { flattenTasks, carriedTasks, moveCarriedToToday, mergeCarriedSection } = load('src/taskRollover.ts')
const { applyPlanWithUndo } = load('src/taskHistory.ts')
const { validateRecords, hasGoalPlanningMetadata, goalPlanningSupported, migrateGoalMetadata, reconcile } = load('src/cloudSync.ts')
const { conflictRows } = load('src/syncConflicts.ts')
const plain = value => JSON.parse(JSON.stringify(value))
const task = {
  id: 'step_a', text: 'Prepare the first experiment', status: 'todo', goalId: 'goal_a', goalStepId: 'step_a',
  finish: { doneWhen: 'The result can be reproduced' },
  subtasks: [{ id: 'detail_a', text: 'Check inputs', status: 'partial', subtasks: [], goalId: 'goal_a' }],
}
const section = { date: '2026-10-30', tasks: [task], filePath: '/fixture', weekStart: '2026-10-26', revision: '1' }
const carried = carriedTasks([section], '2026-10-31')
assert.deepEqual(plain(flattenTasks(carried)[0]), task)
const moved = moveCarriedToToday(carried, carried[0].id, () => 'unused')
assert.deepEqual(plain(flattenTasks(moved)[0]), task, 'Promoting a full tree retains its goal and plan identity')
assert.equal(moved[0].sourceDate, undefined)
assert.deepEqual(plain(mergeCarriedSection(section, new Set([carried[0].id]), moved)), [])
const plan = applyPlanWithUndo(moved, '2026-10-31', [{ taskId: 'step_a', time: '09:00', endTime: '10:00', assignedTo: 'human', action: 'Run the baseline' }], 'test')
const newStep = plan.tasks[0].todaySubtasks.at(-1)
assert.equal(newStep.goalId, 'goal_a', 'Day-plan breakdown inherits the goal')
assert.equal(newStep.goalStepId, undefined, 'A detail is not another completed goal-plan step')
const record = (key, payload) => ({ key, payload, revision: 1, deleted: false, mutationId: 'mutation_test', updatedAt: '' })
const day = { date: '2026-10-31', tasks: [task] }
const goals = { targets: [{ id: 'goal_a', text: 'Publish research', done: false, plan: [{ id: 'step_a', text: 'Prepare the first experiment\nRecord the method' }] }], recurring: [] }
assert.equal(validateRecords([record('day:2026-10-31', day), record('goals', goals)]).length, 2)
assert.equal(hasGoalPlanningMetadata(day), true)
assert.equal(hasGoalPlanningMetadata(goals), true)
assert.equal(hasGoalPlanningMetadata({ date: day.date, tasks: [{ id: 'root', text: '', status: 'todo', subtasks: [task] }] }), true)
assert.equal(hasGoalPlanningMetadata({ tasks: [], targets: [], recurring: [] }), false)
assert.equal(goalPlanningSupported({ schemaVersion: 1, goalPlanning: true, payloadSchemaVersions: [1, 2] }), true)
assert.equal(goalPlanningSupported({ schemaVersion: 1 }), false)
assert.equal(goalPlanningSupported({ schemaVersion: 1, goalPlanning: true, payloadSchemaVersions: [1] }), false)
for (const change of [{ goalId: undefined }, { goalId: '' }, { goalId: 'invalid/id' }, { goalStepId: 12 }]) {
  assert.throws(() => validateRecords([record('day:2026-10-31', { ...day, tasks: [{ ...task, ...change }] })]))
}
for (const invalid of [null, [{ id: 's', text: '' }], [{ id: 's', text: 'x' }, { id: 's', text: 'y' }],
  [{ id: 's', text: 'x', apiKey: 'not metadata' }], Array.from({ length: 201 }, (_, i) => ({ id: 's_' + i, text: 'x' }))]) {
  assert.throws(() => validateRecords([record('goals', { ...goals, targets: [{ ...goals.targets[0], plan: invalid }] })]))
}
const rows = conflictRows('goals', goals)
assert.equal(rows.length, 2, 'Conflict review exposes changed plan steps, not just a hidden fingerprint')
assert.equal(rows[1].text, goals.targets[0].plan[0].text)
assert.equal(rows[1].depth, 1)

const legacyDay = plain(day)
delete legacyDay.tasks[0].goalId; delete legacyDay.tasks[0].goalStepId
delete legacyDay.tasks[0].subtasks[0].goalId
const editedLegacyDay = plain(legacyDay)
editedLegacyDay.tasks[0].text = 'Edited before upgrading'
const prior = { revision: 1, deleted: false, payload: legacyDay }
const upgraded = migrateGoalMetadata(editedLegacyDay, record('day:2026-10-31', day), prior)
assert.equal(upgraded.local.tasks[0].text, 'Edited before upgrading')
assert.equal(upgraded.local.tasks[0].goalId, 'goal_a')
assert.equal(upgraded.local.tasks[0].subtasks[0].goalId, 'goal_a')
assert.equal(upgraded.baseline.payloadSchemaVersion, 2)
assert.equal(upgraded.baseline.payload.tasks[0].text, task.text)
assert.equal(reconcile({ 'day:2026-10-31': upgraded.local }, [record('day:2026-10-31', day)], { 'day:2026-10-31': upgraded.baseline })[0].kind, 'push')
assert.equal(legacyDay.tasks[0].goalId, undefined, 'Migration does not mutate captured snapshots')
const intentional = migrateGoalMetadata(editedLegacyDay, record('day:2026-10-31', day), { revision: 1, deleted: false, payload: day })
assert.equal(intentional.local.tasks[0].goalId, undefined, 'A field the baseline already knew was deliberately removed')
const relinked = plain(editedLegacyDay); relinked.tasks[0].goalId = 'another_goal'
const kept = migrateGoalMetadata(relinked, record('day:2026-10-31', day), prior)
assert.equal(kept.local.tasks[0].goalId, 'another_goal')
assert.equal(kept.local.tasks[0].goalStepId, undefined, 'An old step cannot overwrite a new goal association')
const deleted = migrateGoalMetadata({ date: day.date, tasks: [] }, record('day:2026-10-31', day), prior)
assert.equal(deleted.local.tasks.length, 0, 'Upgrade does not resurrect deleted tasks')
const newer = migrateGoalMetadata(editedLegacyDay, { ...record('day:2026-10-31', day), revision: 2 }, prior)
assert.equal(newer.local, editedLegacyDay, 'A later remote revision retains normal conflict handling')
const legacyGoals = plain(goals); delete legacyGoals.targets[0].plan
const editedGoals = plain(legacyGoals); editedGoals.targets[0].text = 'Revised objective'
const goalUpgrade = migrateGoalMetadata(editedGoals, record('goals', goals), { revision: 1, deleted: false, payload: legacyGoals })
assert.equal(goalUpgrade.local.targets[0].text, 'Revised objective')
assert.deepEqual(plain(goalUpgrade.local.targets[0].plan), goals.targets[0].plan)
assert.deepEqual(plain(migrateGoalMetadata({ targets: [], recurring: [] }, record('goals', goals), { revision: 1, deleted: false, payload: legacyGoals }).local.targets), [])
console.log('Passed goal links through promotion, plan inheritance, schema negotiation and bounded goal-plan sync validation')
