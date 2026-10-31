import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/services/ai_service.dart';
import 'package:sticky_todo/services/cloud_sync.dart';
import 'package:sticky_todo/services/files.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

class FailingGoalDisk extends MemoryPersistence {
  bool fail = false;
  @override
  Future<void> save(Map<String, dynamic> data) async {
    if (fail) throw StateError('Disk unavailable');
    await super.save(data);
  }
}

Future<StickyStore> makeStore([StatePersistence? disk]) async {
  final store = StickyStore(
    persistence: disk ?? MemoryPersistence(),
    credentials: MemoryCredentials(),
  );
  await store.initialize();
  return store;
}

GoalItem addGoal(StickyStore store, {String id = 'research'}) {
  final goal = GoalItem(id: id, text: 'Finish the paper');
  store.goals.targets.add(goal);
  store.changed();
  return goal;
}

void main() {
  test(
    'legacy notebooks load; goal plan and task links survive JSON and Markdown',
    () async {
      final store = await makeStore();
      addTearDown(store.dispose);
      final goal = addGoal(store);
      store.addGoalSteps(goal.id, [
        'Read sources\nRecord evidence',
        'Write a draft',
      ]);
      final step = goal.plan.first;
      store.scheduleGoalSteps(goal.id, [step.id], '2026-10-31');
      final task = store.tasksFor('2026-10-31').single;
      task.finish = FinishPromise(doneWhen: 'Notes saved', by: '2026-11-02');
      final restored = await makeStore();
      addTearDown(restored.dispose);
      await restored.importJson(store.exportJson());
      expect(
        restored.goals.targets.single.plan.map((s) => s.text),
        goal.plan.map((s) => s.text),
      );
      expect(restored.findTask('2026-10-31', step.id)!.goalId, goal.id);
      validateSyncPayload('goals', goalRecord(store));
      validateSyncPayload('day:2026-10-31', {
        'date': '2026-10-31',
        'tasks': [task.toJson()],
      });
      final markdown = markdownDay('2026-10-31', [task]);
      final decoded = parseMarkdownTasks(markdown, keepIds: true).single;
      expect(decoded.toJson(), task.toJson());
      final copy = parseMarkdownTasks(markdown).single;
      expect(copy.id, isNot(task.id));
      expect(copy.goalId, goal.id);
      expect(copy.goalStepId, isNull);
      expect(
        GoalItem.fromJson({'id': 'old', 'text': 'Legacy', 'done': false}).plan,
        isEmpty,
      );
    },
  );

  test('scheduling is selective, idempotent across dates, and follows actual completion', () async {
    final disk = MemoryPersistence();
    final store = await makeStore(disk);
    addTearDown(store.dispose);
    final goal = addGoal(store);
    store.addGoalSteps(goal.id, ['Read sources', 'Write a draft', 'Review']);
    final step = goal.plan.first;
    expect(store.scheduleGoalSteps(goal.id, [step.id], '2026-10-30'), 1);
    expect(store.scheduleGoalSteps(goal.id, [step.id], '2026-11-02'), 0);
    expect(store.tasksFor('2026-11-02'), isEmpty);
    final child = store.addTask(
      'Read methods',
      date: '2026-10-30',
      parentId: step.id,
    );
    expect(child.goalId, goal.id);
    expect(child.goalStepId, isNull);
    store.moveTask('2026-10-30', step.id, '2026-10-31');
    expect(store.tasksFor('2026-10-30'), isEmpty);
    expect(store.goalStepTasks(goal.id, step.id).single.date, '2026-10-31');
    expect(store.goalProgress(goal).scheduled, 1);
    expect(store.goalProgress(goal).completed, 0);
    store.updateTask('2026-10-31', step.id, status: TaskStatus.done);
    expect(store.goalProgress(goal).completed, 1);
    expect(store.goalProgress(goal).fraction, closeTo(1 / 3, .001));
    expect(goal.done, false);
    store.updateTask('2026-10-31', child.id, status: TaskStatus.todo);
    expect(store.goalProgress(goal).completed, 0);
    await store.flush();
    final reloaded = await makeStore(disk);
    addTearDown(reloaded.dispose);
    expect(reloaded.goalProgress(reloaded.findGoal(goal.id)!).scheduled, 1);
    expect(reloaded.tasksForGoal(goal.id), hasLength(1));
  });

  test(
    'partial moves retain plan identity and never merge two same-named goals',
    () async {
      final store = await makeStore();
      addTearDown(store.dispose);
      final goalA = addGoal(store, id: 'goal-a');
      final goalB = addGoal(store, id: 'goal-b');
      store.addGoalSteps(goalA.id, ['Draft']);
      store.addGoalSteps(goalB.id, ['Draft']);
      final a = goalA.plan.single.id, b = goalB.plan.single.id;
      store.scheduleGoalSteps(goalA.id, [a], '2026-10-30');
      store.scheduleGoalSteps(goalB.id, [b], '2026-10-31');
      final first = store.addTask(
        'Introduction',
        date: '2026-10-30',
        parentId: a,
      );
      final second = store.addTask('Results', date: '2026-10-30', parentId: a);
      store.updateTask('2026-10-30', first.id, status: TaskStatus.done);
      expect(
        store.historicalSteps('2026-10-31', store.findTask('2026-10-31', b)!),
        isEmpty,
      );
      store.moveTask('2026-10-30', second.id, '2026-10-31');
      expect(store.findTask('2026-10-31', b)!.subtasks, isEmpty);
      expect(store.findTask('2026-10-31', a)!.goalStepId, a);
      expect(store.findTask('2026-10-30', a)!.status, TaskStatus.done);
      expect(store.goalProgress(goalA).completed, 0);
      expect(store.goalProgress(goalA).scheduled, 1);
      store.updateTask('2026-10-31', second.id, status: TaskStatus.done);
      expect(store.goalProgress(goalA).completed, 1);
      expect(store.goalProgress(goalB).completed, 0);
    },
  );

  test(
    'removing a planned step retains daily work and its goal association',
    () async {
      final store = await makeStore();
      addTearDown(store.dispose);
      final goal = addGoal(store);
      store.addGoalSteps(goal.id, ['Read sources']);
      final id = goal.plan.single.id;
      store.scheduleGoalSteps(goal.id, [id], store.today);
      expect(
        () => store.updateGoalStep(goal.id, id, 'Changed'),
        throwsStateError,
      );
      store.removeGoalStep(goal.id, id);
      expect(goal.plan, isEmpty);
      final task = store.tasksFor(store.today).single;
      expect(task.goalId, goal.id);
      expect(task.goalStepId, isNull);
      expect(store.tasksForGoal(goal.id), hasLength(1));
    },
  );

  test(
    'validation and failed disk writes cannot half-schedule a goal plan',
    () async {
      final disk = FailingGoalDisk();
      final store = await makeStore(disk);
      addTearDown(store.dispose);
      final goal = addGoal(store);
      store.addGoalSteps(goal.id, ['One', 'Two']);
      final ids = goal.plan.map((s) => s.id).toList();
      await store.flush();
      expect(
        () => store.scheduleGoalSteps(goal.id, [
          ids.first,
          'missing',
        ], store.today),
        throwsStateError,
      );
      expect(store.tasksFor(store.today), isEmpty);
      disk.fail = true;
      expect(store.scheduleGoalSteps(goal.id, ids, store.today), 2);
      await expectLater(store.flush(), throwsStateError);
      expect((disk.data!['days'] as Map)[store.today], isNull);
      expect(store.scheduleGoalSteps(goal.id, ids, store.today), 0);
      disk.fail = false;
      await store.retrySave();
      final reloaded = await makeStore(disk);
      addTearDown(reloaded.dispose);
      expect(reloaded.tasksFor(store.today), hasLength(2));
      expect(reloaded.goalProgress(reloaded.findGoal(goal.id)!).scheduled, 2);
    },
  );

  test(
    'stale plan suggestions cannot overwrite edits or schedule anything',
    () async {
      final store = await makeStore();
      addTearDown(store.dispose);
      final goal = addGoal(store);
      final fingerprint = jsonEncode(goal.toJson());
      store.addGoalSteps(goal.id, ['Keep my step']);
      expect(
        () => store.addGoalSteps(goal.id, [
          'Stale suggestion',
        ], fingerprint: fingerprint),
        throwsStateError,
      );
      expect(goal.plan.single.text, 'Keep my step');
      expect(store.days, isEmpty);
      final fresh = jsonEncode(goal.toJson());
      store.addGoalSteps(goal.id, [
        'Keep my step',
        'New step',
      ], fingerprint: fresh);
      expect(goal.plan.map((s) => s.text), ['Keep my step', 'New step']);
      expect(store.days, isEmpty);
    },
  );

  test('goal AI is explicit, bounded and returns an editable plan without mutation', () async {
    final credentials = MemoryCredentials()..values['openai'] = 'test-key';
    final goal = GoalItem(
      id: 'goal',
      text: 'Submit a paper',
      plan: [GoalPlanStep(id: 's1', text: 'Outline')],
    );
    final before = jsonEncode(goal.toJson());
    final ai = AiService(
      credentials,
      client: MockClient((request) async {
        final data = jsonDecode(request.body) as Map;
        expect(data['messages'].last['content'], contains('Submit a paper'));
        return http.Response(
          jsonEncode({
            'choices': [
              {
                'message': {
                  'content': jsonEncode({
                    'steps': [
                      {'text': 'Outline'},
                      {'text': 'Write the methods section'},
                      {'text': 'Check the results'},
                    ],
                  }),
                },
              },
            ],
          }),
          200,
        );
      }),
    );
    addTearDown(ai.dispose);
    expect(await ai.planGoal(Preferences(provider: 'openai'), goal), [
      'Write the methods section',
      'Check the results',
    ]);
    expect(jsonEncode(goal.toJson()), before);
  });

  test(
    'goal sync validation rejects dangling links and duplicate plan IDs',
    () {
      final task = Task(id: 'task', text: 'Work').toJson()
        ..['goalStepId'] = 'step';
      expect(
        () => validateSyncPayload('day:2026-10-31', {
          'date': '2026-10-31',
          'tasks': [task],
        }),
        throwsFormatException,
      );
      expect(
        () => GoalItem.fromJson({
          'id': 'g',
          'text': 'Goal',
          'done': false,
          'plan': [
            {'id': 's', 'text': 'One'},
            {'id': 's', 'text': 'Two'},
          ],
        }),
        throwsFormatException,
      );
    },
  );

  test(
    'unsupported legacy goal IDs cannot create an unreadable notebook',
    () async {
      final disk = MemoryPersistence();
      final store = await makeStore(disk);
      addTearDown(store.dispose);
      final goal = addGoal(store, id: 'legacy goal id');
      store.addGoalSteps(goal.id, ['Keep this plan']);
      expect(
        () => store.scheduleGoalSteps(goal.id, [
          goal.plan.single.id,
        ], store.today),
        throwsStateError,
      );
      expect(store.days, isEmpty);
      await store.flush();
      final loaded = await makeStore(disk);
      addTearDown(loaded.dispose);
      expect(loaded.ready, true);
      expect(loaded.findGoal(goal.id)!.plan.single.text, 'Keep this plan');
    },
  );
}

Map<String, dynamic> goalRecord(StickyStore store) => store.goals.toJson();
