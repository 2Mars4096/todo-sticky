import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/app.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

void main() {
  testWidgets('capture, steps, review and goals work on a narrow phone', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 740);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final store = StickyStore(
      persistence: MemoryPersistence(),
      credentials: MemoryCredentials(),
    );
    await store.initialize();
    await tester.pumpWidget(StickyApp(store: store));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'Prepare the seminar');
    await tester.tap(find.byTooltip('Add task'));
    await tester.pumpAndSettle();
    expect(find.text('Prepare the seminar'), findsOneWidget);
    await tester.tap(find.byTooltip('Show task actions and steps').first);
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Add a step'));
    await tester.pumpAndSettle();
    await tester.enterText(
      find.widgetWithText(TextField, 'Add a step'),
      'Write the outline',
    );
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();
    expect(
      store.tasksFor(store.selectedDate).single.subtasks.single.text,
      'Write the outline',
    );
    await tester.tap(find.text('Goals').last);
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).first, 'Submit a paper');
    await tester.testTextInput.receiveAction(TextInputAction.done);
    await tester.pumpAndSettle();
    expect(store.goals.targets.single.text, 'Submit a paper');
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    store.dispose();
  });
  testWidgets('grip reorders tasks and preserves order after reload', (
    tester,
  ) async {
    final persistence = MemoryPersistence();
    final store = StickyStore(
      persistence: persistence,
      credentials: MemoryCredentials(),
    );
    await store.initialize();
    store.addTask('First task');
    store.addTask('Second task');
    store.addTask('Third task');
    await tester.pumpWidget(StickyApp(store: store));
    await tester.pumpAndSettle();
    final grip = find.byTooltip('Drag to reorder');
    expect(grip, findsNWidgets(3));
    await tester.drag(grip.first, const Offset(0, 220));
    await tester.pumpAndSettle();
    expect(store.tasksFor(store.selectedDate).map((t) => t.text), [
      'Second task',
      'Third task',
      'First task',
    ]);
    await tester.tap(find.byTooltip('Show task actions and steps').first);
    await tester.pumpAndSettle();
    expect(find.text('Step'), findsNothing);
    expect(find.text('Suggest'), findsNothing);
    expect(find.byTooltip('Suggest steps with AI'), findsOneWidget);
    await tester.tap(find.byTooltip('More task actions'));
    await tester.pumpAndSettle();
    expect(find.text('Edit title, outcome and due date'), findsOneWidget);
    expect(find.text('Delete task'), findsOneWidget);
    await tester.pumpWidget(const SizedBox());
    await store.flush();
    final restored = StickyStore(
      persistence: persistence,
      credentials: MemoryCredentials(),
    );
    await restored.initialize();
    expect(restored.tasksFor(store.selectedDate).map((t) => t.text), [
      'Second task',
      'Third task',
      'First task',
    ]);
    restored.dispose();
    store.dispose();
  });
  testWidgets('grip reorders visible tasks around hidden completed rows', (
    tester,
  ) async {
    final store = StickyStore(
      persistence: MemoryPersistence(),
      credentials: MemoryCredentials(),
    );
    await store.initialize();
    store.addTask('First');
    final done = store.addTask('Done');
    store.updateTask(store.selectedDate, done.id, status: TaskStatus.done);
    store.addTask('Last');
    store.preferences.showCompleted = false;
    await tester.pumpWidget(StickyApp(store: store));
    await tester.pumpAndSettle();
    final grips = find.byTooltip('Drag to reorder');
    expect(grips, findsNWidgets(2));
    await tester.timedDrag(
      grips.last,
      const Offset(0, -100),
      const Duration(milliseconds: 600),
    );
    await tester.pumpAndSettle();
    expect(store.tasksFor(store.selectedDate).map((t) => t.text), [
      'Last',
      'First',
      'Done',
    ]);
    expect(
      store.findTask(store.selectedDate, done.id)!.status,
      TaskStatus.done,
    );
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    store.dispose();
  });
  testWidgets('large text keeps phone navigation, capture and focus usable', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 740);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 1.5;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    final store = StickyStore(
      persistence: MemoryPersistence(),
      credentials: MemoryCredentials(),
    );
    await store.initialize();
    store.addTask(
      'A task with a long title that wraps naturally on a small phone',
    );
    await tester.pumpWidget(StickyApp(store: store));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.tap(find.byTooltip('Show task actions and steps').first);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('Focus').last);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    store.dispose();
  });
  testWidgets('restored long focus durations stay in the control range', (
    tester,
  ) async {
    final store = StickyStore(
      persistence: MemoryPersistence(),
      credentials: MemoryCredentials(),
    );
    await store.initialize();
    store.focus.sessionDurationMinutes = 240;
    await tester.pumpWidget(StickyApp(store: store));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Focus').last);
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.scrollUntilVisible(find.byType(Slider), 300);
    await tester.pumpAndSettle();
    expect(tester.widget<Slider>(find.byType(Slider)).value, 240);
    await tester.pumpWidget(const SizedBox());
    store.dispose();
  });
}
