import 'package:flutter/services.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/app.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

void main() {
  for (final reduced in [false, true]) {
    testWidgets(
      'disclosure reverses without delaying steps, reduced motion $reduced',
      (tester) async {
        tester.platformDispatcher.accessibilityFeaturesTestValue =
            FakeAccessibilityFeatures(disableAnimations: reduced);
        addTearDown(
          tester.platformDispatcher.clearAccessibilityFeaturesTestValue,
        );
        final store = StickyStore(
          persistence: MemoryPersistence(),
          credentials: MemoryCredentials(),
        );
        await store.initialize();
        final task = store.addTask('Review proposal');
        store.addTask('Confirm the budget', parentId: task.id);
        await tester.pumpWidget(StickyApp(store: store));
        await tester.pumpAndSettle();
        final button = find
            .byWidgetPredicate(
              (w) =>
                  w is IconButton &&
                  (w.tooltip ?? '').endsWith('task actions and steps'),
            )
            .first;
        final icon = find
            .descendant(of: button, matching: find.byIcon(Icons.chevron_right_rounded))
            .first;
        double turns() => tester
            .widget<RotationTransition>(
              find.descendant(
                of: button,
                matching: find.byType(RotationTransition),
              ),
            )
            .turns
            .value;
        final size = tester.getSize(button);
        int quarterTurns() => tester
            .widget<RotatedBox>(
              find.descendant(of: button, matching: find.byType(RotatedBox)),
            )
            .quarterTurns;
        Focus.of(tester.element(icon)).requestFocus();
        await tester.pump();
        for (final key in [
          LogicalKeyboardKey.enter,
          LogicalKeyboardKey.space,
        ]) {
          await tester.sendKeyEvent(key);
          await tester.pump();
          final open = key == LogicalKeyboardKey.enter;
          expect(
            tester.widget<IconButton>(button).tooltip,
            open
                ? 'Hide task actions and steps'
                : 'Show task actions and steps',
          );
          expect(
            find.byTooltip('Add a step'),
            open ? findsWidgets : findsNothing,
          );
          if (reduced) {
            expect(quarterTurns(), open ? 1 : 0);
          } else {
            expect(turns(), open ? .25 : 0);
            expect(
              tester
                  .widget<AnimatedRotation>(
                    find.descendant(
                      of: button,
                      matching: find.byType(AnimatedRotation),
                    ),
                  )
                  .duration,
              Duration.zero,
            );
          }
        }
        await tester.tap(button);
        await tester.pump();
        if (reduced) {
          expect(quarterTurns(), 1);
        } else {
          await tester.pump(const Duration(milliseconds: 40));
          expect(turns(), inExclusiveRange(0, .25));
        }
        await tester.tap(button);
        await tester.pump();
        if (reduced) {
          expect(quarterTurns(), 0);
        } else {
          expect(turns(), inExclusiveRange(0, .25));
        }
        await tester.pumpAndSettle();
        if (!reduced) expect(turns(), 0);
        expect(tester.getSize(button), size);
        await tester.pumpWidget(const SizedBox());
        store.dispose();
      },
    );
  }
  testWidgets(
    'a notebook day outside the default picker range can be reviewed',
    (tester) async {
      final store = StickyStore(
        persistence: MemoryPersistence(),
        credentials: MemoryCredentials(),
      );
      await store.initialize();
      store.selectDate('1969-11-03');
      store.addTask('Historical note');
      final removed = store.addTask('Restore me');
      store.deleteTask(store.selectedDate, removed.id);
      final undoBefore = store.undoLabel;
      expect(undoBefore, isNotNull);
      await tester.pumpWidget(StickyApp(store: store));
      await tester.pumpAndSettle();
      await tester.tap(find.byKey(const ValueKey('notebook-date')));
      expect(find.bySemanticsLabel('Monday, November 3, 1969'), findsOneWidget);
      await tester.pumpAndSettle();
      expect(
        tester
            .widget<DatePickerDialog>(find.byType(DatePickerDialog))
            .initialDate,
        DateTime(1969, 11, 3),
      );
      await tester.tap(find.text('OK'));
      await tester.pumpAndSettle();
      expect(store.undoLabel, undoBefore);
      expect(find.text('Historical note'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('notebook-date')));
      await tester.pumpAndSettle();
      await tester.tap(find.text('4').last);
      await tester.tap(find.text('OK'));
      await tester.pumpAndSettle();
      expect(store.selectedDate, '1969-11-04');
      expect(find.text('Historical note'), findsNothing);
      store.selectDate('2101-12-31');
      await tester.pumpAndSettle();
      expect(find.text('2101'), findsOneWidget);
      await tester.tap(find.byKey(const ValueKey('notebook-date')));
      await tester.pumpAndSettle();
      expect(
        tester.widget<DatePickerDialog>(find.byType(DatePickerDialog)).lastDate,
        DateTime(2101, 12, 31),
      );
      await tester.tap(find.text('Cancel'));
      await tester.pumpWidget(const SizedBox());
      store.dispose();
    },
  );
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
    await tester.pump();
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
    await tester.pump();
    await tester.tap(find.byTooltip('Add step'));
    await tester.pumpAndSettle();
    expect(
      store.tasksFor(store.selectedDate).single.subtasks.single.text,
      'Write the outline',
    );
    await tester.tap(find.byTooltip('Goals'));
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
    expect(find.text('Edit task'), findsOneWidget);
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
    await tester.tap(find.byTooltip('Focus'));
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
    await tester.tap(find.byTooltip('Focus'));
    await tester.pumpAndSettle();
    expect(tester.takeException(), isNull);
    await tester.scrollUntilVisible(find.byType(Slider), 300);
    await tester.pumpAndSettle();
    expect(tester.widget<Slider>(find.byType(Slider)).value, 240);
    await tester.pumpWidget(const SizedBox());
    store.dispose();
  });
}
