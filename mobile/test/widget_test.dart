import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/app.dart';
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
    await tester.tap(find.text('Step'));
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
