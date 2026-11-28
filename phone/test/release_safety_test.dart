import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/app.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';
import 'package:sticky_todo/widgets/task_tile.dart';

Future<StickyStore> notebook([MemoryPersistence? persistence]) async {
  final store = StickyStore(
    persistence: persistence ?? MemoryPersistence(),
    credentials: MemoryCredentials(),
  );
  await store.initialize();
  return store;
}

void main() {
  test('an unreadable notebook is never overwritten by defaults', () async {
    final unreadable = {
      'schemaVersion': 1,
      'days': {'2026-11-28': 'not a list'},
    };
    final persistence = MemoryPersistence()..data = unreadable;
    final store = await notebook(persistence);
    expect(store.loadError, isNotNull);
    store.preferences.showCompleted = !store.preferences.showCompleted;
    store.changed();
    await store.flush();
    expect(jsonEncode(persistence.data), jsonEncode(unreadable));
    store.dispose();
  });

  test('task text and step depth stay within the sync contract', () async {
    final store = await notebook();
    expect(
      () => store.addTask('x' * (maxTaskTextLength + 1)),
      throwsArgumentError,
    );
    var parent = store.addTask('Root');
    for (var depth = 1; depth <= maxStepDepth; depth++) {
      parent = store.addTask('Step $depth', parentId: parent.id);
    }
    expect(
      () => store.addTask('Too deep', parentId: parent.id),
      throwsStateError,
    );
    final task = store.tasksFor(store.selectedDate).first;
    expect(
      () => store.updateTask(
        store.selectedDate,
        task.id,
        text: 'y' * (maxTaskTextLength + 1),
      ),
      throwsArgumentError,
    );
    expect(task.text, 'Root');
    store.dispose();
  });

  test('focus history labels are single line for sync', () async {
    final store = await notebook();
    final task = store.addTask('First line\n\nSecond line');
    store.startFocus(task, 25);
    expect(store.focus.activeSession!.taskText, 'First line Second line');
    expect(focusTaskLabel(' \n '), '(Blank task)');
    store.dispose();
  });

  test('completing a parent can be undone step by step', () async {
    final store = await notebook();
    final date = store.selectedDate;
    final parent = store.addTask('Parent');
    final done = store.addTask('Done step', parentId: parent.id);
    final open = store.addTask('Open step', parentId: parent.id);
    store.updateTask(date, done.id, status: TaskStatus.done);
    store.updateTask(date, parent.id, status: TaskStatus.done);
    expect(store.findTask(date, open.id)!.status, TaskStatus.done);
    expect(store.undoLabel, 'Task completed');
    store.undo();
    expect(store.findTask(date, parent.id)!.status, TaskStatus.partial);
    expect(store.findTask(date, done.id)!.status, TaskStatus.done);
    expect(store.findTask(date, open.id)!.status, TaskStatus.todo);
    store.dispose();
  });

  test('reopening a finished parent reopens its latest step', () async {
    final store = await notebook();
    final date = store.selectedDate;
    final parent = store.addTask('Parent');
    final first = store.addTask('First', parentId: parent.id);
    final last = store.addTask('Last', parentId: parent.id);
    store.updateTask(date, parent.id, status: TaskStatus.done);
    store.updateTask(date, parent.id, status: TaskStatus.todo);
    expect(store.findTask(date, parent.id)!.closed, false);
    expect(store.findTask(date, first.id)!.status, TaskStatus.done);
    expect(store.findTask(date, last.id)!.status, TaskStatus.todo);
    store.dispose();
  });

  test(
    'restoring a backup clears sync baselines instead of deleting',
    () async {
      final store = await notebook();
      store.addTask('Backed up');
      final backup = store.exportJson();
      store.syncMetadata['account:owner:https://example.test'] = {
        'enabled': true,
        'baseline': {
          'day:2026-01-01': {'revision': 3, 'deleted': false, 'payload': {}},
        },
        'pending': {'day:2026-01-01': {}},
        'conflicts': [],
      };
      await store.importJson(backup);
      final meta =
          store.syncMetadata['account:owner:https://example.test'] as Map;
      expect(meta['enabled'], true);
      expect(meta['baseline'], isEmpty);
      expect(meta['pending'], isEmpty);
      store.dispose();
    },
  );

  testWidgets('dismissing an edited task asks before discarding', (
    tester,
  ) async {
    final store = await notebook();
    final task = store.addTask('Draft the note');
    await tester.pumpWidget(StickyApp(store: store));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Show task actions and steps').first);
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Edit task').first);
    await tester.pumpAndSettle();
    expect(find.byType(TaskEditor), findsOneWidget);
    await tester.enterText(
      find
          .descendant(
            of: find.byType(TaskEditor),
            matching: find.byType(TextField),
          )
          .first,
      'Draft the whole note',
    );
    await tester.pump();
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(find.text('Discard your changes?'), findsOneWidget);
    await tester.tap(find.text('Keep editing'));
    await tester.pumpAndSettle();
    expect(find.byType(TaskEditor), findsOneWidget);
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(find.byType(TaskEditor), findsNothing);
    expect(
      store.findTask(store.selectedDate, task.id)!.text,
      'Draft the whole note',
    );
    await tester.pumpWidget(const SizedBox());
    store.dispose();
  });

  testWidgets('completion shows an undo receipt that restores the task', (
    tester,
  ) async {
    final store = await notebook();
    final task = store.addTask('Send invoice');
    await tester.pumpWidget(StickyApp(store: store));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Complete task'));
    await tester.pumpAndSettle();
    expect(find.text('Task completed'), findsOneWidget);
    await tester.tap(find.text('Undo'));
    await tester.pumpAndSettle();
    expect(store.findTask(store.selectedDate, task.id)!.closed, false);
    await tester.pumpWidget(const SizedBox());
    store.dispose();
  });
}
