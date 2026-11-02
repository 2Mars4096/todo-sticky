import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/models/project_plan.dart';
import 'package:sticky_todo/services/ai_service.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';
import 'package:sticky_todo/screens/project_schedule_screen.dart';
import 'package:sticky_todo/app.dart';

class Disk extends MemoryPersistence {
  bool fail = false;
  @override
  Future<void> save(Map<String, dynamic> data) async {
    if (fail) throw StateError('Full');
    await super.save(data);
  }
}

Future<StickyStore> store([StatePersistence? disk]) async {
  final value = StickyStore(
    persistence: disk ?? MemoryPersistence(),
    credentials: MemoryCredentials(),
  );
  await value.initialize();
  return value;
}

const window = ProjectWindow(
  from: '2026-11-02',
  until: '2026-11-06',
  minutes: 60,
  weekdays: true,
);
ProjectAction action(
  String text, {
  String? id,
  String? stepId,
  String date = '2026-11-02',
  int minutes = 30,
}) => ProjectAction(
  id: id,
  stepId: stepId,
  text: text,
  date: date,
  minutes: minutes,
);

class ProjectAi extends AiService {
  final Future<List<ProjectAction>> Function() reply;
  ProjectAi(this.reply) : super(MemoryCredentials());
  @override
  Future<List<ProjectAction>> planProject(
    Preferences prefs,
    GoalItem goal,
    ProjectWindow window,
    List<DatedTask> scheduled,
    List<DatedTask> otherWork,
  ) => reply();
}

Future<void> reviewFonts() async {
  if (Platform.environment['STICKY_SCREENSHOTS'] == null) return;
  final font = File('/System/Library/Fonts/Supplemental/Arial.ttf');
  if (font.existsSync()) {
    await (FontLoader('Roboto')
          ..addFont(Future.value(ByteData.sublistView(font.readAsBytesSync()))))
        .load();
  }
  await (FontLoader(
    'MaterialIcons',
  )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
}

Future<void> captureReview(WidgetTester tester, String name) async {
  final output = Platform.environment['STICKY_SCREENSHOTS'];
  if (output == null) return;
  expect(tester.takeException(), isNull);
  final boundary =
      find.byType(RepaintBoundary).evaluate().first.renderObject!
          as RenderRepaintBoundary;
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(data!.buffer.asUint8List());
    image.dispose();
  });
}

void main() {
  test('project assignment preserves dates states nested work and unrelated child projects', () async {
    final s = await store();
    s.goals.targets.addAll([
      GoalItem(id: 'a', text: 'A'),
      GoalItem(id: 'b', text: 'B'),
    ]);
    final root = s.addTask('Existing work');
    final child = s.addTask('Child', parentId: root.id);
    final other = s.addTask('Other project', parentId: root.id);
    other.goalId = 'b';
    s.assignProject(s.today, root.id, 'a');
    expect(root.goalId, 'a');
    expect(child.goalId, 'a');
    expect(other.goalId, 'b');
    expect(root.status, TaskStatus.todo);
    expect(s.tasksForGoal('a').single.task.id, root.id);
    await s.flush();
    s.dispose();
  });
  test(
    'manual existing steps and new AI tasks save across days with one project',
    () async {
      final disk = MemoryPersistence();
      final s = await store(disk);
      final goal = GoalItem(
        id: 'project',
        text: 'Paper',
        plan: [GoalPlanStep(id: 'outline', text: 'Outline')],
      );
      s.goals.targets.add(goal);
      final plan = [
        action('Polish outline', stepId: 'outline'),
        action('Draft section', id: 'draft', date: '2026-11-03'),
      ];
      final key = s.projectFingerprint(goal.id);
      expect(s.applyProjectPlan(goal.id, plan, window, key), 2);
      await s.flush();
      expect(goal.plan, hasLength(2));
      expect(s.tasksFor('2026-11-03').single.goalStepId, 'draft');
      expect(s.tasksFor('2026-11-02').single.text, 'Polish outline');
      expect(goal.done, false);
      expect(
        () => s.applyProjectPlan(goal.id, plan, window, key),
        throwsStateError,
      );
      final loaded = await store(disk);
      expect(loaded.tasksForGoal(goal.id), hasLength(2));
      expect(loaded.goals.targets.single.plan, hasLength(2));
      s.dispose();
      loaded.dispose();
    },
  );
  test(
    'invalid capacity weekdays duplicate and stale batches mutate nothing',
    () async {
      final s = await store();
      final goal = GoalItem(id: 'g', text: 'Project');
      s.goals.targets.add(goal);
      final before = s.exportJson();
      final key = s.projectFingerprint('g');
      for (final list in [
        [action('A', minutes: 45), action('B', minutes: 45)],
        [action('Weekend', date: '2026-11-07')],
        [action('Same'), action('Same')],
        [action('Bad', stepId: 'missing')],
      ]) {
        expect(
          () => s.applyProjectPlan('g', list, window, key),
          throwsA(anything),
        );
        expect(s.exportJson(), before);
      }
      s.addTask('Concurrent edit');
      final changed = s.exportJson();
      expect(
        () => s.applyProjectPlan('g', [action('A')], window, key),
        throwsStateError,
      );
      expect(s.exportJson(), changed);
      await s.flush();
      s.dispose();
    },
  );
  test(
    'save retry persists existing mutation without duplicating tasks',
    () async {
      final disk = Disk();
      final s = await store(disk);
      s.goals.targets.add(GoalItem(id: 'g', text: 'Project'));
      s.changed();
      await s.flush();
      disk.fail = true;
      s.applyProjectPlan(
        'g',
        [action('A', id: 'a'), action('B', id: 'b', date: '2026-11-03')],
        window,
        s.projectFingerprint('g'),
      );
      await expectLater(s.flush(), throwsStateError);
      expect((disk.data!['days'] as Map), isEmpty);
      disk.fail = false;
      await s.retrySave();
      await s.flush();
      final loaded = await store(disk);
      expect(loaded.tasksForGoal('g'), hasLength(2));
      s.dispose();
      loaded.dispose();
    },
  );
  test('already scheduled IDs and task collisions are rejected without replacing work', () async {
    final s = await store();
    final goal = GoalItem(
      id: 'g',
      text: 'Project',
      plan: [GoalPlanStep(id: 'existing', text: 'Existing')],
    );
    s.goals.targets.add(goal);
    s.scheduleGoalSteps('g', ['existing'], '2026-11-02');
    final before = s.exportJson();
    expect(
      () => s.applyProjectPlan(
        'g',
        [action('Existing', stepId: 'existing')],
        window,
        s.projectFingerprint('g'),
      ),
      throwsStateError,
    );
    expect(s.exportJson(), before);
    await s.flush();
    s.dispose();
  });
  for (final scale in [1.0, 1.5]) {
    testWidgets('review edit discard and apply multi-day plan at $scale', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(360, 800);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = scale;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      await reviewFonts();
      final s = await store();
      s.goals.targets.add(GoalItem(id: 'g', text: 'Write research paper'));
      final tomorrow = parseDate(s.today).add(const Duration(days: 1));
      final ai = ProjectAi(
        () async => [
          action('Outline argument', id: 'one', date: s.today),
          action('Draft introduction', id: 'two', date: dateKey(tomorrow)),
        ],
      );
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(
            useMaterial3: true,
            colorScheme: ColorScheme.fromSeed(seedColor: amber, surface: paper),
          ),
          home: ProjectScheduleScreen(store: s, ai: ai, goalId: 'g'),
        ),
      );
      await tester.pumpAndSettle();
      await captureReview(tester, 'project-inputs-$scale');
      await tester.tap(find.text('Generate proposal'));
      await tester.pumpAndSettle();
      await captureReview(tester, 'project-proposal-$scale');
      expect(s.days, isEmpty);
      expect(s.goals.targets.single.plan, isEmpty);
      await tester.scrollUntilVisible(find.text('Outline argument'), 100);
      await tester.tap(find.byTooltip('Edit proposed task').first);
      await tester.pumpAndSettle();
      await tester.enterText(
        find.widgetWithText(TextField, 'Task'),
        'Edited outline',
      );
      await captureReview(tester, 'project-edit-$scale');
      await tester.tap(find.text('Save'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Add to daily tasks'));
      await tester.pumpAndSettle();
      expect(s.tasksForGoal('g'), hasLength(2));
      expect(s.tasksFor(s.today).single.text, 'Edited outline');
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      ai.dispose();
      s.dispose();
    });
  }
  testWidgets('stale AI response never schedules or overwrites work', (
    tester,
  ) async {
    final s = await store();
    s.goals.targets.add(GoalItem(id: 'g', text: 'Project'));
    final gate = Completer<List<ProjectAction>>();
    final ai = ProjectAi(() => gate.future);
    await tester.pumpWidget(
      MaterialApp(
        home: ProjectScheduleScreen(store: s, ai: ai, goalId: 'g'),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Generate proposal'));
    await tester.pump();
    s.addTask('New daily work');
    gate.complete([action('Late suggestion', date: s.today)]);
    await tester.pumpAndSettle();
    expect(find.textContaining('Generate a fresh proposal'), findsOneWidget);
    expect(s.goals.targets.single.plan, isEmpty);
    expect(s.tasksFor(s.today), hasLength(1));
    await tester.pumpWidget(const SizedBox());
    ai.dispose();
    s.dispose();
  });
  test('assigned work is not duplicated as a new AI project step', () async {
    final s = await store();
    s.goals.targets.add(GoalItem(id: 'g', text: 'Project'));
    final task = s.addTask('Existing deliverable');
    s.assignProject(s.today, task.id, 'g');
    final before = s.exportJson();
    expect(
      () => s.applyProjectPlan(
        'g',
        [action('Existing deliverable')],
        window,
        s.projectFingerprint('g'),
      ),
      throwsStateError,
    );
    expect(s.exportJson(), before);
    await s.flush();
    s.dispose();
  });
  test(
    'provider request includes project constraints and existing workload',
    () async {
      final credentials = MemoryCredentials()..values['openai'] = 'fixture';
      final goal = GoalItem(
        id: 'g',
        text: 'Research',
        plan: [GoalPlanStep(id: 'outline', text: 'Outline')],
      );
      String requestBody = '';
      final ai = AiService(
        credentials,
        client: MockClient((request) async {
          requestBody = request.body;
          return http.Response(
            jsonEncode({
              'choices': [
                {
                  'message': {
                    'content': jsonEncode({
                      'steps': [
                        {
                          'stepId': 'outline',
                          'text': 'Outline argument',
                          'date': '2026-11-02',
                          'minutes': 30,
                        },
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
      final result = await ai.planProject(
        Preferences(provider: 'openai'),
        goal,
        window,
        [],
        [DatedTask('2026-11-02', Task(text: 'Existing commitment'))],
      );
      expect(result.single.stepId, 'outline');
      expect(requestBody, contains('Existing commitment'));
      expect(requestBody, contains('minutesPerDay'));
      ai.dispose();
    },
  );
  testWidgets('existing task assignment is reachable through its normal menu', (
    tester,
  ) async {
    final s = await store();
    final task = s.addTask('Existing task');
    s.goals.targets.add(GoalItem(id: 'g', text: 'Research project'));
    s.changed();
    await s.flush();
    await tester.pumpWidget(StickyApp(store: s));
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('Show task actions and steps').first);
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('More task actions').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Assign to project'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Research project'));
    await tester.pumpAndSettle();
    expect(task.goalId, 'g');
    expect(find.byTooltip('Open goal plan'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    s.dispose();
  });
}
