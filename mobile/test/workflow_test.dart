import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sticky_todo/screens/plan_screen.dart';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/app.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/models/workflow.dart';
import 'package:sticky_todo/services/ai_service.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

class FailedDisk extends MemoryPersistence {
  bool fail = false;
  @override
  Future<void> save(Map<String, dynamic> data) async {
    if (fail) throw StateError('full');
    return super.save(data);
  }
}

Future<StickyStore> notebook([StatePersistence? disk]) async {
  final store = StickyStore(
    persistence: disk ?? MemoryPersistence(),
    credentials: MemoryCredentials(),
  );
  await store.initialize();
  return store;
}

Future<void> loadReviewFonts() async {
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
  final element = find.byType(RepaintBoundary).evaluate().first;
  final boundary = element.renderObject! as RenderRepaintBoundary;
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    await Directory(output).create(recursive: true);
    await File('$output/$name.png').writeAsBytes(data!.buffer.asUint8List());
    image.dispose();
  });
}

void main() {
  test(
    'fingerprints and occurrence identities match desktop Unicode semantics',
    () {
      expect(planTextHash('Review 文稿 👋'), 'y6sszf');
      expect(
        routineTaskId('routine_中文', '2026-10-30'),
        'routine_72-6f-75-74-69-6e-65-5f-4e2d-6587_2026-10-30',
      );
      final original = Task(
        id: 'plan_2026-10-30_batch_h${planTextHash('Work')}',
        text: 'Work',
      );
      expect(replaceablePlanStep(original, '2026-10-30'), true);
      original.text = 'Edited';
      expect(replaceablePlanStep(original, '2026-10-30'), false);
      expect(
        replaceablePlanStep(
          Task(id: 'plan_2026-10-30_old', text: 'Legacy'),
          '2026-10-30',
        ),
        false,
      );
    },
  );
  test('routines save task and handled marker together and do not recreate on reload', () async {
    final disk = FailedDisk();
    final store = await notebook(disk);
    final date = store.today;
    store.goals.recurring.add(GoalItem(id: 'r1', text: 'Read'));
    store.changed();
    await store.flush();
    disk.fail = true;
    store.configureRoutine('r1', 'daily');
    await expectLater(store.flush(), throwsStateError);
    expect((disk.data!['days'] as Map)[date], isNull);
    disk.fail = false;
    await store.retrySave();
    await store.flush();
    expect(store.tasksFor(date), hasLength(1));
    final reloaded = await notebook(disk);
    await reloaded.flush();
    expect(reloaded.tasksFor(date), hasLength(1));
    reloaded.skipRoutine('r1');
    final next = reloaded.routineSchedules['r1']!.next(date)!;
    final today = parseDate(date);
    expect(next, dateKey(DateTime(today.year, today.month, today.day + 2)));
    reloaded.pauseRoutine('r1');
    expect(reloaded.routineSchedules['r1']!.next(date), isNull);
    expect(reloaded.syncRecords().containsKey('routineSchedules'), false);
    store.dispose();
    reloaded.dispose();
  });
  test('missed dates do not flood routines, corrupt schedules do not block capture', () async {
    final s = RoutineSchedule(cadence: 'weekly', anchor: '2026-10-30');
    expect(s.next('2026-11-01'), '2026-11-06');
    final weekdays = RoutineSchedule(cadence: 'weekdays', anchor: '2026-10-30');
    expect(weekdays.next('2026-10-31'), '2026-11-02');
    final disk = MemoryPersistence();
    final store = await notebook(disk);
    store.addTask('Keep');
    await store.flush();
    disk.data!['routineSchedules'] = {
      'r1': {'cadence': 'invalid'},
    };
    final loaded = await notebook(disk);
    expect(loaded.ready, true);
    expect(loaded.routineError, isNotNull);
    loaded.addTask('Still capture');
    await loaded.flush();
    expect(disk.data!['routineSchedules'], {
      'r1': {'cadence': 'invalid'},
    });
    expect(loaded.tasksFor(loaded.today), hasLength(2));
    store.dispose();
    loaded.dispose();
  });
  test('search includes nested context; edited and legacy plan work survives replanning', () async {
    final store = await notebook();
    final root = store.addTask('Paper');
    final step = store.addTask('Sources', parentId: root.id);
    expect(
      searchRows(
        archiveRows(store.days),
        'paper sources',
        'all',
      ).single.task.id,
      step.id,
    );
    root.subtasks.add(
      Task(id: 'plan_${store.today}_legacy', text: 'Older plan'),
    );
    DayPlan proposal() => DayPlan(
      summary: '',
      date: store.selectedDate,
      fingerprint: tasksFingerprint(store.planningTasks),
      blocks: [
        PlanBlock(
          sourceDate: store.today,
          taskId: root.id,
          time: '09:00',
          endTime: '09:30',
          action: 'Draft',
          assignedTo: 'human',
        ),
      ],
    );
    store.applyPlan(proposal());
    final generated = root.subtasks.last;
    store.updateTask(store.today, generated.id, text: 'My changed draft');
    store.applyPlan(proposal());
    expect(
      root.subtasks.map((t) => t.text),
      containsAll(['My changed draft', 'Older plan', 'Sources']),
    );
    await store.flush();
    store.dispose();
  });
  test('planning enforces excluded periods and total budgets', () {
    final tasks = [DatedTask('2026-10-30', Task(id: 'a', text: 'A'))];
    DayPlan parse(String a, String b) => AiService.validatePlan(
      {
        'schedule': [
          {'taskId': '2026-10-30/a', 'time': a, 'endTime': b, 'action': 'Work'},
        ],
      },
      tasks,
      '2026-10-30',
      '09:00',
      '17:00',
      [],
      'fixture',
      estimates: {'2026-10-30/a': 30},
      unavailable: [
        {'start': '12:00', 'end': '13:00'},
      ],
    );
    expect(parse('11:30', '12:00').blocks, hasLength(1));
    expect(() => parse('11:45', '12:15'), throwsA(isA<AiException>()));
    expect(() => parse('09:00', '10:00'), throwsA(isA<AiException>()));
    final prefs = Preferences(
      planningStart: '10:00',
      planningEnd: '16:00',
      planningMachines: ['Mini'],
    );
    expect(
      Preferences.fromJson(jsonDecode(jsonEncode(prefs.toJson())))
          .planningStart,
      '10:00',
    );
  });
  for (final scale in [1.0, 1.5]) {
    testWidgets(
      'phone search, progress, routine and focus review at scale $scale',
      (tester) async {
        tester.view.physicalSize = const Size(360, 800);
        tester.view.devicePixelRatio = 1;
        tester.platformDispatcher.textScaleFactorTestValue = scale;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        await loadReviewFonts();
        final store = await notebook();
        final task = store.addTask('Write research note');
        store.addTask('Inspect sources', parentId: task.id);
        final done = store.addTask('Send invoice');
        store.updateTask(store.today, done.id, status: TaskStatus.done);
        store.goals.recurring.add(GoalItem(id: 'r', text: 'Read a paper'));
        store.changed();
        await store.flush();
        await tester.pumpWidget(
          StickyApp(
            store: store,
            syncIndicatorBuilder: (_) => IconButton(
              tooltip: 'Local only',
              onPressed: () {},
              icon: const Icon(Icons.cloud_off_outlined, size: 18),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await captureReview(tester, 'notes-$scale');
        await tester.tap(find.byTooltip('Search tasks'));
        await tester.pumpAndSettle();
        await tester.enterText(
          find.widgetWithText(TextField, 'Search tasks and steps'),
          'sources',
        );
        await tester.pumpAndSettle();
        await captureReview(tester, 'search-$scale');
        await tester.tap(find.text('Inspect sources'));
        await tester.pumpAndSettle();
        expect(find.text('Write research note'), findsOneWidget);
        expect(find.text('Inspect sources'), findsOneWidget);
        await tester.pageBack();
        await tester.pumpAndSettle();
        await tester.pageBack();
        await tester.pumpAndSettle();
        await tester.tap(find.byTooltip('Progress'));
        await tester.pumpAndSettle();
        expect(find.textContaining('1 completed'), findsOneWidget);
        await captureReview(tester, 'progress-$scale');
        expect(tester.takeException(), isNull);
        await tester.pageBack();
        await tester.pumpAndSettle();
        await tester.tap(find.text('Goals').last);
        await tester.pumpAndSettle();
        await tester.tap(find.text('Routines').first);
        await tester.pumpAndSettle();
        await tester.tap(find.text('Manual'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Daily').last);
        await tester.pumpAndSettle();
        expect(
          store.tasksFor(store.today).where((t) => t.text == 'Read a paper'),
          hasLength(1),
        );
        expect(find.text('Skip next'), findsOneWidget);
        await captureReview(tester, 'routines-$scale');
        expect(tester.takeException(), isNull);
        store.startFocus(task, 25);
        await tester.tap(find.text('Focus').last);
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.text('Finish session'));
        await tester.tap(find.text('Finish session'));
        await tester.pumpAndSettle();
        await tester.ensureVisible(find.text('Review task'));
        await captureReview(tester, 'focus-review-$scale');
        await tester.tap(find.text('Review task'));
        await tester.pumpAndSettle();
        expect(find.text('Write research note'), findsOneWidget);
        expect(task.status, TaskStatus.todo);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        store.dispose();
      },
    );
  }
  testWidgets('plan setup and result remain reachable on phone', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 800);
    tester.view.devicePixelRatio = 1;
    tester.platformDispatcher.textScaleFactorTestValue = 1.5;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
    await loadReviewFonts();
    final store = await notebook();
    final task = store.addTask('Draft the research note');
    store.preferences.provider = 'openai';
    (store.credentials as MemoryCredentials).values['openai'] = 'fixture';
    final ai = AiService(
      store.credentials,
      client: MockClient(
        (request) async => http.Response(
          jsonEncode({
            'choices': [
              {
                'message': {
                  'content': jsonEncode({
                    'plan': 'A bounded work block.',
                    'schedule': [
                      {
                        'taskId': '${store.today}/${task.id}',
                        'time': '09:00',
                        'endTime': '09:30',
                        'action': 'Draft one paragraph',
                        'assignedTo': 'human',
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          200,
        ),
      ),
    );
    await tester.pumpWidget(
      MaterialApp(
        theme: ThemeData(
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(seedColor: amber, surface: paper),
        ),
        home: PlanScreen(store: store, ai: ai),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Adjust task time & breaks'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Auto'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('30 min').last);
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(find.text('Add break'), 160);
    await tester.tap(find.text('Add break'));
    await tester.pumpAndSettle();
    await captureReview(tester, 'planning-inputs');
    await tester.scrollUntilVisible(find.text('Generate plan'), 160);
    await tester.tap(find.text('Generate plan'));
    await tester.pumpAndSettle();
    expect(find.text('Draft one paragraph'), findsOneWidget);
    expect(tester.takeException(), isNull);
    await captureReview(tester, 'planning-proposal');
    await tester.scrollUntilVisible(find.text('Apply plan'), 160);
    await tester.tap(find.text('Apply plan'));
    await tester.pumpAndSettle();
    expect(task.subtasks.single.text, contains('Draft one paragraph'));
    await store.flush();
    expect(store.preferences.planningStart, '09:00');
    await tester.pumpWidget(const SizedBox());
    ai.dispose();
    store.dispose();
  });
}
