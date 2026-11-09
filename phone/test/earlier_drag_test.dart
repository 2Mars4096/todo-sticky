import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/app.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

Future<StickyStore> notebook(
  WidgetTester tester, {
  MemoryPersistence? disk,
}) async {
  tester.view.physicalSize = const Size(390, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  final store = StickyStore(
    persistence: disk ?? MemoryPersistence(),
    credentials: MemoryCredentials(),
  );
  await store.initialize();
  store.preferences.showEarlier = true;
  return store;
}

String yesterday(StickyStore store) {
  final today = parseDate(store.today);
  return dateKey(DateTime(today.year, today.month, today.day - 1));
}

Future<void> showNotebook(WidgetTester tester, StickyStore store) async {
  await tester.pumpWidget(StickyApp(store: store));
  await tester.pumpAndSettle();
}

Future<void> dragTo(
  WidgetTester tester,
  Finder grip,
  Offset destination,
) async {
  final gesture = await tester.startGesture(tester.getCenter(grip));
  await gesture.moveBy(const Offset(0, -12));
  await tester.pump();
  await gesture.moveTo(destination);
  await tester.pump(const Duration(milliseconds: 100));
  await gesture.up();
  await tester.pumpAndSettle();
}

Future<void> closeNotebook(WidgetTester tester, StickyStore store) async {
  await tester.pumpWidget(const SizedBox());
  await store.flush();
  store.dispose();
}

void main() {
  testWidgets(
    'Earlier handle promotes a whole task into empty Today and persists',
    (tester) async {
      final disk = MemoryPersistence();
      final store = await notebook(tester, disk: disk);
      final past = yesterday(store);
      final task = store.addTask('Prepare a seminar', date: past);
      final child = store.addTask(
        'Write outline',
        date: past,
        parentId: task.id,
      );
      store.addTask('Gather references', date: past, parentId: child.id);
      store.updateTask(
        past,
        task.id,
        updateFinish: true,
        outcome: 'Send slides',
        due: store.today,
      );
      final original = task.toJson();
      await showNotebook(tester, store);
      final handle = find.byTooltip('Drag to Today');
      expect(handle, findsOneWidget);
      expect(
        tester.getCenter(handle).dx,
        lessThan(tester.getCenter(find.byTooltip('Complete task').first).dx),
      );
      await dragTo(
        tester,
        handle,
        tester.getCenter(find.byKey(const ValueKey('today-drop-empty'))),
      );
      expect(store.tasksFor(past), isEmpty);
      expect(store.tasksFor(store.today).single.toJson(), original);
      expect(find.byTooltip('Drag to Today'), findsNothing);
      expect(find.byTooltip('Drag to reorder'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await closeNotebook(tester, store);
      final restored = StickyStore(
        persistence: disk,
        credentials: MemoryCredentials(),
      );
      await restored.initialize();
      expect(restored.tasksFor(past), isEmpty);
      expect(restored.tasksFor(restored.today).single.toJson(), original);
      restored.dispose();
    },
  );

  testWidgets(
    'drop position inserts between daily roots without changing hidden completed rows',
    (tester) async {
      final store = await notebook(tester);
      store.addTask('First');
      final completed = store.addTask('Completed');
      store.updateTask(store.today, completed.id, status: TaskStatus.done);
      final last = store.addTask('Last');
      final past = yesterday(store);
      final earlier = store.addTask('Earlier', date: past);
      store.preferences.showCompleted = false;
      await showNotebook(tester, store);
      final target = find.byKey(ValueKey('${store.today}/${last.id}'));
      await dragTo(
        tester,
        find.byTooltip('Drag to Today'),
        tester.getTopLeft(target) + const Offset(110, 8),
      );
      expect(store.tasksFor(store.today).map((task) => task.text), [
        'First',
        'Completed',
        'Earlier',
        'Last',
      ]);
      expect(
        store.findTask(store.today, completed.id)!.status,
        TaskStatus.done,
      );
      expect(store.findTask(past, earlier.id), isNull);
      expect(tester.takeException(), isNull);
      await closeNotebook(tester, store);
    },
  );

  testWidgets('dropping onto Today header works when the list is hidden', (
    tester,
  ) async {
    final store = await notebook(tester);
    final done = store.addTask('Completed today');
    store.updateTask(store.today, done.id, status: TaskStatus.done);
    final task = store.addTask('Earlier', date: yesterday(store));
    store.preferences.showCompleted = false;
    await showNotebook(tester, store);
    await dragTo(
      tester,
      find.byTooltip('Drag to Today'),
      tester.getCenter(find.byKey(const ValueKey('today-drop-header'))),
    );
    expect(store.tasksFor(store.today).map((task) => task.id), [
      task.id,
      done.id,
    ]);
    expect(tester.takeException(), isNull);
    await closeNotebook(tester, store);
  });

  testWidgets(
    'dropping outside Today or pressing Escape preserves the original task',
    (tester) async {
      final store = await notebook(tester);
      final past = yesterday(store);
      final task = store.addTask('Keep here', date: past);
      await showNotebook(tester, store);
      final before = task.toJson();
      await dragTo(
        tester,
        find.byTooltip('Drag to Today'),
        tester.getCenter(find.text('Earlier tasks (1)')),
      );
      expect(store.tasksFor(store.today), isEmpty);
      expect(store.tasksFor(past).single.toJson(), before);
      final gesture = await tester.startGesture(
        tester.getCenter(find.byTooltip('Drag to Today')),
      );
      await gesture.moveBy(const Offset(0, -24));
      await tester.pump();
      await tester.sendKeyEvent(LogicalKeyboardKey.escape);
      await gesture.moveTo(
        tester.getCenter(find.byKey(const ValueKey('today-drop-header'))),
      );
      await gesture.up();
      await tester.pumpAndSettle();
      expect(store.tasksFor(store.today), isEmpty);
      expect(store.tasksFor(past).single.toJson(), before);
      expect(tester.takeException(), isNull);
      await closeNotebook(tester, store);
    },
  );

  testWidgets('dragging from a long backlog scrolls toward Today', (
    tester,
  ) async {
    final store = await notebook(tester);
    for (var i = 0; i < 14; i++) {
      store.addTask('Today $i');
    }
    store.addTask('Earlier', date: yesterday(store));
    await showNotebook(tester, store);
    await tester.scrollUntilVisible(
      find.byTooltip('Drag to Today'),
      250,
      scrollable: find
          .descendant(
            of: find.byType(CustomScrollView),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    await tester.pumpAndSettle();
    final scrollable = tester.state<ScrollableState>(
      find
          .descendant(
            of: find.byType(CustomScrollView),
            matching: find.byType(Scrollable),
          )
          .first,
    );
    final before = scrollable.position.pixels;
    expect(before, greaterThan(0));
    final viewport = tester.getRect(find.byType(CustomScrollView));
    final gesture = await tester.startGesture(
      tester.getCenter(find.byTooltip('Drag to Today')),
    );
    await gesture.moveBy(const Offset(0, -20));
    await tester.pump();
    await gesture.moveTo(Offset(viewport.center.dx, viewport.top + 8));
    await tester.pump(const Duration(milliseconds: 400));
    expect(scrollable.position.pixels, lessThan(before));
    await gesture.cancel();
    await tester.pumpAndSettle();
    expect(store.earlierTasks.single.task.text, 'Earlier');
    expect(tester.takeException(), isNull);
    await closeNotebook(tester, store);
  });
}
