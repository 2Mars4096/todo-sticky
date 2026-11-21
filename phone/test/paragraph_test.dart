import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/app.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/services/files.dart';
import 'package:sticky_todo/services/cloud_sync.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

const paragraph =
    'Research revision\n\n## 2026-11-01\n- [ ] This is prose\n中文 <!-- sticky-todo:id=fake -->';
void main() {
  test('repeat capture preserves an existing v1 notebook on disk', () async {
    final directory = await Directory.systemTemp.createTemp('dockit-capture-');
    addTearDown(() => directory.delete(recursive: true));
    final day = dateKey(DateTime.now());
    final legacy = {
      'id': 'legacy-root',
      'text': 'Previously saved notebook',
      'status': 'partial',
      'subtasks': [
        {
          'id': 'legacy-step',
          'text': 'Previously checked step',
          'status': 'done',
          'subtasks': [],
        },
      ],
    };
    final file = File('${directory.path}/sticky-todo.json');
    await file.writeAsString(
      jsonEncode({
        'schemaVersion': 1,
        'days': {
          day: [legacy],
        },
      }),
      flush: true,
    );
    StickyStore open() => StickyStore(
      persistence: FilePersistence(directory),
      credentials: MemoryCredentials(),
    );
    final first = open();
    await first.initialize();
    final before = first.tasksFor(day).single.toJson();
    expect(before['id'], 'legacy-root');
    expect(first.tasksFor(day).single.subtasks.single.status, TaskStatus.done);
    first.addTask('New capture', date: day);
    await first.flush();
    first.dispose();
    final reopened = open();
    await reopened.initialize();
    expect(reopened.tasksFor(day).first.toJson(), before);
    expect(reopened.tasksFor(day).last.text, 'New capture');
    reopened.dispose();
  });
  for (final platform in [TargetPlatform.android, TargetPlatform.iOS]) {
    testWidgets(
      'manual step capture keeps focus and composition on ${platform.name}',
      (tester) async {
        debugDefaultTargetPlatformOverride = platform;
        addTearDown(() => debugDefaultTargetPlatformOverride = null);
        tester.view.physicalSize = platform == TargetPlatform.android
            ? const Size(360, 740)
            : const Size(390, 844);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final store = StickyStore(
          persistence: MemoryPersistence(),
          credentials: MemoryCredentials(),
        );
        await store.initialize();
        store.addTask('Parent');
        await tester.pumpWidget(StickyApp(store: store));
        await tester.pumpAndSettle();
        await tester.tap(find.byTooltip('Show task actions and steps').first);
        await tester.pumpAndSettle();
        await tester.tap(find.byTooltip('Add a step'));
        await tester.pumpAndSettle();
        final field = find.widgetWithText(TextField, 'Add a step');
        final button = find.byTooltip('Add step');
        bool enabled() =>
            tester
                .widget<IconButton>(
                  find
                      .ancestor(of: button, matching: find.byType(IconButton))
                      .first,
                )
                .onPressed !=
            null;
        expect(enabled(), isFalse);
        await tester.tap(field);
        tester.testTextInput.updateEditingValue(
          const TextEditingValue(
            text: '資料',
            selection: TextSelection.collapsed(offset: 2),
            composing: TextRange(start: 0, end: 2),
          ),
        );
        await tester.pump();
        expect(enabled(), isFalse);
        final modifier = platform == TargetPlatform.iOS
            ? LogicalKeyboardKey.metaLeft
            : LogicalKeyboardKey.controlLeft;
        Future<void> shortcut() async {
          await tester.sendKeyDownEvent(modifier);
          await tester.sendKeyEvent(LogicalKeyboardKey.enter);
          await tester.sendKeyUpEvent(modifier);
          await tester.pump();
        }

        await shortcut();
        expect(store.selectedTasks.single.task.subtasks, isEmpty);
        await tester.enterText(field, '資料\n\nCheck totals');
        await tester.pump();
        expect(enabled(), isTrue);
        await tester.tap(button);
        await tester.pumpAndSettle();
        expect(tester.widget<TextField>(field).focusNode!.hasFocus, isTrue);
        expect(enabled(), isFalse);
        await tester.enterText(field, 'Second step');
        await shortcut();
        await shortcut();
        expect(
          store.selectedTasks.single.task.subtasks.map((task) => task.text),
          ['資料\n\nCheck totals', 'Second step'],
        );
        expect(tester.widget<TextField>(field).focusNode!.hasFocus, isTrue);
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        store.dispose();
        debugDefaultTargetPlatformOverride = null;
      },
    );
    testWidgets('repeat capture respects focus and IME on ${platform.name}', (
      tester,
    ) async {
      debugDefaultTargetPlatformOverride = platform;
      addTearDown(() => debugDefaultTargetPlatformOverride = null);
      final store = StickyStore(
        persistence: MemoryPersistence(),
        credentials: MemoryCredentials(),
      );
      await store.initialize();
      await tester.pumpWidget(StickyApp(store: store));
      await tester.pumpAndSettle();
      final field = find.byType(TextField).first;
      final button = find.widgetWithIcon(IconButton, Icons.add_rounded).first;
      bool enabled() => tester.widget<IconButton>(button).onPressed != null;
      expect(enabled(), isFalse);
      await tester.enterText(field, '  ');
      await tester.pump();
      expect(enabled(), isFalse);
      await tester.tap(field);
      tester.testTextInput.updateEditingValue(
        const TextEditingValue(
          text: '会議',
          selection: TextSelection.collapsed(offset: 2),
          composing: TextRange(start: 0, end: 2),
        ),
      );
      await tester.pump();
      expect(enabled(), isFalse);
      expect(store.selectedTasks, isEmpty);
      await tester.enterText(field, '会議\n\nFollow up');
      await tester.pump();
      expect(enabled(), isTrue);
      await tester.tap(button);
      await tester.pumpAndSettle();
      expect(store.selectedTasks.single.task.text, '会議\n\nFollow up');
      expect(tester.widget<TextField>(field).focusNode!.hasFocus, isTrue);
      expect(enabled(), isFalse);
      await tester.enterText(field, 'Next task');
      final modifier = platform == TargetPlatform.iOS
          ? LogicalKeyboardKey.metaLeft
          : LogicalKeyboardKey.controlLeft;
      await tester.sendKeyDownEvent(modifier);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.sendKeyUpEvent(modifier);
      await tester.pumpAndSettle();
      expect(store.selectedTasks.map((row) => row.task.text), [
        '会議\n\nFollow up',
        'Next task',
      ]);
      expect(tester.widget<TextField>(field).focusNode!.hasFocus, isTrue);
      await tester.pumpWidget(const SizedBox());
      store.dispose();
      debugDefaultTargetPlatformOverride = null;
    });
  }
  testWidgets(
    'long phone draft remains usable with keyboard and enlarged text',
    (tester) async {
      tester.view.physicalSize = const Size(360, 740);
      tester.view.devicePixelRatio = 1;
      tester.view.viewInsets = const FakeViewPadding(bottom: 300);
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.view.resetViewInsets);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final store = StickyStore(
        persistence: MemoryPersistence(),
        credentials: MemoryCredentials(),
      );
      await store.initialize();
      await tester.pumpWidget(StickyApp(store: store));
      await tester.pumpAndSettle();
      await tester.enterText(
        find.byType(TextField).first,
        List.filled(20, paragraph).join('\n'),
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.tap(find.byTooltip('Add task'));
      await tester.pumpAndSettle();
      expect(store.selectedTasks.length, 1);
      await tester.pumpWidget(const SizedBox());
      store.dispose();
    },
  );
  test('paragraph Markdown preserves nested tasks and metadata', () {
    final task = Task(
      id: 'parent',
      text: paragraph,
      subtasks: [Task(id: 'child', text: 'Step\nDetails')],
    );
    final parsed = parseMarkdownTasks(
      markdownDay('2026-10-31', [task]),
      keepIds: true,
    );
    expect(parsed.single.toJson(), task.toJson());
    validateSyncPayload('day:2026-10-31', {
      'date': '2026-10-31',
      'tasks': [task.toJson()],
    });
  });
  testWidgets('phone paragraphs capture, edit and reload without overflow', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(360, 740);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final persistence = MemoryPersistence();
    final store = StickyStore(
      persistence: persistence,
      credentials: MemoryCredentials(),
    );
    await store.initialize();
    await tester.pumpWidget(StickyApp(store: store));
    await tester.pumpAndSettle();
    final field = find.byType(TextField).first;
    expect(
      tester.widget<TextField>(field).textInputAction,
      TextInputAction.newline,
    );
    await tester.enterText(field, paragraph);
    await tester.pumpAndSettle();
    expect(store.selectedTasks, isEmpty);
    await tester.tap(find.byTooltip('Add task'));
    await tester.pumpAndSettle();
    expect(store.selectedTasks.single.task.text, paragraph);
    await tester.tap(find.byTooltip('Show task actions and steps').first);
    await tester.pumpAndSettle();
    await tester.tap(find.byTooltip('More task actions').first);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Edit task').last);
    await tester.pumpAndSettle();
    final editor = find.widgetWithText(TextField, 'Task');
    await tester.enterText(editor, '$paragraph\nAn extra thought');
    await tester.ensureVisible(find.text('Save'));
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();
    expect(
      store.selectedTasks.single.task.text,
      '$paragraph\nAn extra thought',
    );
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
    store.dispose();
    final restored = StickyStore(
      persistence: persistence,
      credentials: MemoryCredentials(),
    );
    await restored.initialize();
    expect(
      restored.selectedTasks.single.task.text,
      '$paragraph\nAn extra thought',
    );
    restored.dispose();
  });
}
