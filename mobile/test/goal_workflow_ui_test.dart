import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/app.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/screens/goal_plan_screen.dart';
import 'package:sticky_todo/services/ai_service.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

class GoalAi extends AiService {
  final Future<List<String>> Function() reply;
  GoalAi(this.reply) : super(MemoryCredentials());
  @override
  Future<List<String>> planGoal(Preferences preferences, GoalItem goal) =>
      reply();
}

Future<StickyStore> makeStore() async {
  final store = StickyStore(
    persistence: MemoryPersistence(),
    credentials: MemoryCredentials(),
  );
  await store.initialize();
  return store;
}

Future<void> fonts() async {
  if (Platform.environment['STICKY_SCREENSHOTS'] == null) return;
  final font = File('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');
  if (font.existsSync()) {
    final loader = FontLoader('Roboto')
      ..addFont(Future.value(ByteData.sublistView(font.readAsBytesSync())));
    await loader.load();
  }
  await (FontLoader(
    'MaterialIcons',
  )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
}

Future<void> capture(WidgetTester tester, GlobalKey key, String name) async {
  final output = Platform.environment['STICKY_SCREENSHOTS'];
  if (output == null) return;
  final boundary =
      key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(data!.buffer.asUint8List());
    image.dispose();
  });
}

void main() {
  for (final scale in [1.0, 1.5]) {
    testWidgets(
      'goal plan schedules, opens, completes and tracks moved tasks at text scale $scale',
      (tester) async {
        tester.view.physicalSize = const Size(360, 800);
        tester.view.devicePixelRatio = 1;
        tester.platformDispatcher.textScaleFactorTestValue = scale;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        await fonts();
        final store = await makeStore();
        final goal = GoalItem(text: 'Submit the research paper');
        store.goals.targets.add(goal);
        store.addGoalSteps(goal.id, [
          'Write the opening argument',
          'Review the evidence',
          'Send a draft to the coauthors',
        ]);
        final step = goal.plan.first;
        final key = GlobalKey();
        await tester.pumpWidget(
          RepaintBoundary(
            key: key,
            child: StickyApp(store: store),
          ),
        );
        await tester.pumpAndSettle();
        await tester.tap(find.text('Goals').last);
        await tester.pumpAndSettle();
        await capture(
          tester,
          key,
          'goals-list-${scale == 1 ? 'normal' : 'large'}',
        );
        await tester.tap(find.text(goal.text));
        await tester.pumpAndSettle();
        expect(find.text('Generate plan'), findsOneWidget);
        final row = find.byKey(ValueKey('goal-step-${step.id}'));
        await tester.ensureVisible(row);
        await tester.tap(
          find.descendant(of: row, matching: find.byType(Checkbox)),
        );
        await tester.pumpAndSettle();
        await capture(
          tester,
          key,
          'goal-plan-${scale == 1 ? 'normal' : 'large'}',
        );
        await tester.tap(find.text('Add 1 to Today'));
        await tester.pumpAndSettle();
        expect(store.tasksFor(store.today).single.goalId, goal.id);
        expect(store.tasksFor(store.today).single.goalStepId, step.id);
        expect(store.goalProgress(goal).scheduled, 1);
        await tester.ensureVisible(row);
        await tester.tap(row);
        await tester.pumpAndSettle();
        expect(find.text('Task · ${store.today}'), findsOneWidget);
        expect(find.byTooltip('Open goal plan'), findsOneWidget);
        ScaffoldMessenger.of(tester.element(find.text('Task · ${store.today}')))
            .hideCurrentSnackBar();
        await tester.pumpAndSettle();
        await capture(
          tester,
          key,
          'linked-task-${scale == 1 ? 'normal' : 'large'}',
        );
        await tester.tap(find.byTooltip('Complete task').first);
        await tester.pumpAndSettle();
        expect(store.goalProgress(goal).completed, 1);
        await tester.pageBack();
        await tester.pumpAndSettle();
        await tester.scrollUntilVisible(
          find.text('1/3 completed'),
          -120,
          scrollable: find
              .descendant(
                of: find.byType(ListView).first,
                matching: find.byType(Scrollable),
              )
              .first,
        );
        expect(find.text('1/3 completed'), findsOneWidget);
        final now = parseDate(store.today);
        final next = dateKey(DateTime(now.year, now.month, now.day + 1));
        store.moveTask(store.today, step.id, next);
        await tester.pumpAndSettle();
        expect(store.goalProgress(goal).scheduled, 1);
        expect(store.goalProgress(goal).completed, 1);
        await tester.ensureVisible(row);
        await tester.tap(row);
        await tester.pumpAndSettle();
        expect(find.text('Task · $next'), findsOneWidget);
        await tester.pageBack();
        await tester.pumpAndSettle();
        await tester.tap(find.byTooltip('Goal progress'));
        await tester.pumpAndSettle();
        expect(find.text('Goal plan · 1/3 completed'), findsOneWidget);
        expect(find.textContaining('planned minutes'), findsNothing);
        expect(tester.takeException(), isNull);
        await capture(
          tester,
          key,
          'goal-progress-${scale == 1 ? 'normal' : 'large'}',
        );
        await tester.pageBack();
        await tester.pumpAndSettle();
        store.goals.targets.clear();
        store.changed();
        await tester.pumpAndSettle();
        expect(find.text('This goal was removed.'), findsOneWidget);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        await store.flush();
        store.dispose();
      },
    );
  }

  testWidgets(
    'AI plan is editable and creates no daily tasks before scheduling',
    (tester) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetViewInsets);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await fonts();
      final store = await makeStore();
      final goal = GoalItem(text: 'Launch the app');
      store.goals.targets.add(goal);
      final ai = GoalAi(() async => ['Build a prototype', 'Invite testers']);
      await tester.pumpWidget(StickyApp(store: store));
      await tester.pumpAndSettle();
      final theme = tester.widget<MaterialApp>(find.byType(MaterialApp)).theme;
      final key = GlobalKey();
      await tester.pumpWidget(
        RepaintBoundary(
          key: key,
          child: MaterialApp(
            theme: theme,
            debugShowCheckedModeBanner: false,
            home: GoalPlanScreen(
              store: store,
              ai: ai,
              goalId: goal.id,
              openFocus: () {},
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextField, 'Add a step'),
        'Choose the first users',
      );
      await tester.tap(find.byTooltip('Add plan step'));
      await tester.pumpAndSettle();
      expect(goal.plan.single.text, 'Choose the first users');
      await tester.tap(find.text('Generate plan'));
      await tester.pumpAndSettle();
      expect(find.text('Review plan'), findsOneWidget);
      expect(goal.plan.single.text, 'Choose the first users');
      expect(store.tasksFor(store.today), isEmpty);
      await tester.enterText(
        find.widgetWithText(TextField, 'Step 1'),
        'Test the key workflow',
      );
      tester.view.viewInsets = const FakeViewPadding(bottom: 280);
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await capture(tester, key, 'goal-ai-preview-keyboard-large');
      await tester.ensureVisible(find.byType(Checkbox).last);
      await tester.tap(find.byType(Checkbox).last);
      await tester.tap(find.text('Add steps'));
      await tester.pumpAndSettle();
      tester.view.viewInsets = const FakeViewPadding();
      await tester.pumpAndSettle();
      expect(goal.plan.map((step) => step.text), [
        'Choose the first users',
        'Test the key workflow',
      ]);
      expect(store.tasksFor(store.today), isEmpty);
      await tester.tap(find.text('Add 2 to Today'));
      await tester.pumpAndSettle();
      expect(store.tasksFor(store.today).map((task) => task.text), [
        'Choose the first users',
        'Test the key workflow',
      ]);
      expect(
        store.tasksFor(store.today).map((task) => task.goalId),
        everyElement(goal.id),
      );
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      await store.flush();
      ai.dispose();
      store.dispose();
    },
  );

  testWidgets(
    'a changed goal rejects the arriving AI proposal without overwriting manual work',
    (tester) async {
      final store = await makeStore();
      final goal = GoalItem(text: 'Prepare for the job market');
      store.goals.targets.add(goal);
      final response = Completer<List<String>>();
      final ai = GoalAi(() => response.future);
      await tester.pumpWidget(
        MaterialApp(
          home: GoalPlanScreen(
            store: store,
            ai: ai,
            goalId: goal.id,
            openFocus: () {},
          ),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Generate plan'));
      await tester.pump();
      store.addGoalSteps(goal.id, ['Ask an advisor']);
      response.complete(['An obsolete suggestion']);
      await tester.pumpAndSettle();
      expect(find.text('Review plan'), findsNothing);
      expect(goal.plan.map((step) => step.text), ['Ask an advisor']);
      expect(
        find.text('This goal changed. Generate a fresh plan.'),
        findsOneWidget,
      );
      expect(store.tasksFor(store.today), isEmpty);
      await tester.pumpWidget(const SizedBox());
      await store.flush();
      ai.dispose();
      store.dispose();
    },
  );
}
