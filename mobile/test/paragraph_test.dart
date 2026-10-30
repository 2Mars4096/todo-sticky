import 'package:flutter/material.dart';
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
