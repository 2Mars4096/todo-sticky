import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/services/files.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

class FailingPersistence extends MemoryPersistence {
  bool fail = true;
  @override
  Future<void> save(Map<String, dynamic> value) async {
    if (fail) throw StateError('disk full');
    await super.save(value);
  }
}

Future<StickyStore> notebook({StatePersistence? persistence}) async {
  final store = StickyStore(
    persistence: persistence ?? MemoryPersistence(),
    credentials: MemoryCredentials(),
  );
  await store.initialize();
  return store;
}

void main() {
  test('nested tasks and finish metadata round trip with stable IDs', () async {
    final disk = MemoryPersistence();
    final store = await notebook(persistence: disk);
    final task = store.addTask('Deliver a paper');
    final step = store.addTask('Draft', parentId: task.id);
    store.addTask('Outline', parentId: step.id);
    store.updateTask(
      store.selectedDate,
      task.id,
      updateFinish: true,
      outcome: 'Submit to advisor',
      due: '2026-11-02',
    );
    await store.flush();
    final reload = await notebook(persistence: disk);
    expect(reload.tasksFor(store.selectedDate).single.toJson(), task.toJson());
    expect(task.finish!.originalBy, '2026-11-02');
  });
  test('failed writes retain latest edits and can be retried', () async {
    final disk = FailingPersistence();
    final store = await notebook(persistence: disk);
    final task = store.addTask('First');
    store.updateTask(store.selectedDate, task.id, text: 'Latest');
    await expectLater(store.flush(), throwsStateError);
    expect(store.saveError, isNotNull);
    expect(task.text, 'Latest');
    disk.fail = false;
    await store.retrySave();
    await store.flush();
    expect(store.saveError, isNull);
    final reload = await notebook(persistence: disk);
    expect(reload.tasksFor(store.selectedDate).single.text, 'Latest');
  });
  test(
    'malformed import never partially changes an existing notebook',
    () async {
      final store = await notebook();
      store.addTask('Keep this');
      final before = store.exportJson();
      final malformed = jsonDecode(before) as Map<String, dynamic>;
      malformed['days'] = {};
      malformed['syncMetadata'] = 'not an object';
      await expectLater(
        store.importJson(jsonEncode(malformed)),
        throwsFormatException,
      );
      expect(store.exportJson(), before);
    },
  );
  test(
    'completion cascades, reopening child reopens parent, stopped is not done',
    () async {
      final store = await notebook();
      final task = store.addTask('Parent');
      final step = store.addTask('Child', parentId: task.id);
      store.updateTask(store.selectedDate, task.id, status: TaskStatus.done);
      expect(step.status, TaskStatus.done);
      store.updateTask(store.selectedDate, step.id, status: TaskStatus.todo);
      expect(task.status, TaskStatus.partial);
      store.updateTask(store.selectedDate, step.id, status: TaskStatus.stopped);
      expect(task.status, isNot(TaskStatus.done));
    },
  );
  test('completed steps with an outcome require explicit review', () async {
    final store = await notebook();
    final task = store.addTask('Parent');
    final child = store.addTask('Child', parentId: task.id);
    store.updateTask(
      store.selectedDate,
      task.id,
      updateFinish: true,
      outcome: 'Demonstrate the result',
    );
    store.updateTask(store.selectedDate, child.id, status: TaskStatus.done);
    expect(task.status, TaskStatus.partial);
    expect(task.finish!.reviewReady, true);
  });
  test(
    'deletion undo preserves unrelated later edits and original position',
    () async {
      final store = await notebook();
      final first = store.addTask('First');
      final second = store.addTask('Second');
      store.deleteTask(store.selectedDate, first.id);
      store.updateTask(store.selectedDate, second.id, text: 'Edited second');
      store.undo();
      expect(store.tasksFor(store.selectedDate).map((t) => t.text), [
        'First',
        'Edited second',
      ]);
    },
  );
  test(
    'past tasks project into Today without copying and promotion preserves metadata',
    () async {
      final store = await notebook();
      store.refreshClock(DateTime(2026, 10, 24));
      store.selectDate('2026-10-24');
      final task = store.addTask('Earlier', date: '2026-10-20');
      store.updateTask(
        '2026-10-20',
        task.id,
        updateFinish: true,
        outcome: 'Finish',
        due: '2026-10-30',
      );
      expect(store.earlierTasks.single.task.id, task.id);
      expect(store.tasksFor('2026-10-24'), isEmpty);
      store.moveTask('2026-10-20', task.id, store.today);
      expect(store.tasksFor('2026-10-20'), isEmpty);
      expect(store.tasksFor(store.today).single.finish!.by, '2026-10-30');
    },
  );
  test(
    'individual step moves merge under parent and clear prior review readiness',
    () async {
      final store = await notebook();
      final parent = store.addTask('Root', date: '2026-10-20');
      final a = store.addTask('A', date: '2026-10-20', parentId: parent.id);
      final b = store.addTask('B', date: '2026-10-20', parentId: parent.id);
      store.moveTask('2026-10-20', a.id, '2026-10-24');
      final target = store.tasksFor('2026-10-24').single;
      target.finish = FinishPromise(doneWhen: 'Both', reviewReady: true);
      store.moveTask('2026-10-20', b.id, '2026-10-24');
      expect(store.tasksFor('2026-10-24'), hasLength(1));
      expect(target.subtasks, hasLength(2));
      expect(target.finish!.reviewReady, false);
    },
  );
  test('stale breakdown cannot mutate a closed or edited task', () async {
    final store = await notebook();
    final task = store.addTask('Research');
    final key = jsonEncode(task.toJson());
    store.updateTask(store.selectedDate, task.id, status: TaskStatus.done);
    expect(
      () => store.addBreakdown(store.selectedDate, task.id, key, ['New work']),
      throwsStateError,
    );
    expect(task.subtasks, isEmpty);
  });
  test(
    'plan replacement and undo retain completed and manual work and later edits',
    () async {
      final store = await notebook();
      final task = store.addTask('Paper');
      final date = store.selectedDate;
      final prior = Task(id: 'plan_${date}_old', text: 'Old generated');
      final completed = Task(
        id: 'plan_${date}_done',
        text: 'Done generated',
        status: TaskStatus.done,
      );
      final manual = Task(text: 'Manual');
      task.subtasks.addAll([prior, completed, manual]);
      final plan = DayPlan(
        summary: '',
        date: date,
        fingerprint: tasksFingerprint(store.planningTasks),
        blocks: [
          PlanBlock(
            sourceDate: date,
            taskId: task.id,
            time: '09:00',
            endTime: '10:00',
            action: 'New generated',
            assignedTo: 'human',
          ),
        ],
      );
      store.applyPlan(plan);
      expect(task.subtasks.any((t) => t.id == prior.id), false);
      expect(task.subtasks.any((t) => t.id == completed.id), true);
      final added = task.subtasks.last;
      store.updateTask(date, added.id, text: 'User edited plan step');
      store.undo();
      expect(
        task.subtasks.map((t) => t.text),
        containsAll([
          'Old generated',
          'Done generated',
          'Manual',
          'User edited plan step',
        ]),
      );
    },
  );
  test('stale plan rejected after task modification', () async {
    final store = await notebook();
    final task = store.addTask('One');
    final plan = DayPlan(
      summary: '',
      blocks: [],
      date: store.selectedDate,
      fingerprint: tasksFingerprint(store.planningTasks),
    );
    store.updateTask(store.selectedDate, task.id, text: 'Changed');
    expect(() => store.applyPlan(plan), throwsStateError);
  });
  test('focus restores, pauses and archives without completing task', () async {
    final disk = MemoryPersistence();
    final store = await notebook(persistence: disk);
    final task = store.addTask('Work');
    store.startFocus(task, 25);
    store.pauseFocus();
    await store.flush();
    final reload = await notebook(persistence: disk);
    expect(reload.focus.activeSession!.pausedAt, isNotNull);
    reload.resumeFocus();
    reload.finishFocus();
    expect(reload.focus.activeSession, isNull);
    expect(reload.focus.missionHistory.single.durationMinutes, 25);
    expect(reload.tasksFor(store.selectedDate).single.status, TaskStatus.todo);
    for (var i = 0; i < 15; i++) {
      reload.startFocus(task, 5);
      reload.finishFocus();
    }
    expect(reload.focus.missionHistory.length, 12);
    expect(reload.focus.lastOrbitIndex, 16);
  });
  test(
    'midnight follows Today while preserving an explicitly selected other date',
    () async {
      final store = await notebook();
      store.refreshClock(DateTime(2026, 10, 24));
      store.selectDate(store.today);
      store.refreshClock(DateTime(2026, 10, 25));
      expect(store.selectedDate, '2026-10-25');
      store.selectDate('2026-10-01');
      store.refreshClock(DateTime(2026, 10, 26));
      expect(store.selectedDate, '2026-10-01');
      expect(store.carryDestination('2026-11-01'), '2026-11-02');
    },
  );
  test('Markdown retains hierarchy, statuses and escaped finish metadata', () {
    final task = Task(
      text: 'Parent',
      status: TaskStatus.partial,
      finish: FinishPromise(doneWhen: 'Use it --> safely', by: '2026-11-02'),
      subtasks: [Task(text: 'Child', status: TaskStatus.stopped)],
    );
    final rendered = markdownDay('2026-10-24', [task]);
    final parsed = parseMarkdownTasks(rendered, keepIds: true);
    expect(parsed.single.toJson(), task.toJson());
  });
  test(
    'sync records omit API keys, local prefs, active timer and account metadata',
    () async {
      final store = await notebook();
      final task = store.addTask('A');
      store.startFocus(task, 20);
      store.syncMetadata = {'secret': 'not exported'};
      final records = store.syncRecords();
      expect(
        records.keys,
        everyElement(
          anyOf(startsWith('day:'), equals('goals'), startsWith('focus:')),
        ),
      );
      expect(jsonEncode(records), isNot(contains('activeSession')));
      expect(store.exportJson(), isNot(contains('secret')));
      final imported = {
        'date': '2026-10-24',
        'tasks': [task.toJson()],
      };
      await store.applySyncRecord('day:2026-10-24', imported);
      expect(store.tasksFor('2026-10-24').single.id, task.id);
    },
  );
  test('desktop absent reviewReady stays absent through task JSON', () {
    final t = Task.fromJson({
      'id': 'one',
      'text': 'Test',
      'status': 'todo',
      'subtasks': [],
      'finish': {'doneWhen': 'Enough'},
    });
    expect(t.toJson()['finish'], {'doneWhen': 'Enough'});
  });
}
