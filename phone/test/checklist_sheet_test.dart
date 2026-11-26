import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/app.dart';
import 'package:sticky_todo/screens/settings_screen.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

void main() {
  testWidgets(
    'checklist import remains reachable with keyboard and large text',
    (tester) async {
      tester.view.physicalSize = const Size(320, 600);
      tester.view.devicePixelRatio = 1;
      tester.view.viewInsets = const FakeViewPadding(bottom: 280);
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.view.reset);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final store = StickyStore(
        persistence: MemoryPersistence(),
        credentials: MemoryCredentials(),
      );
      await store.initialize();
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => Scaffold(
              body: TextButton(
                onPressed: () => showNoteSheet<void>(
                  context,
                  ChecklistImporter(store: store),
                ),
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.enterText(
        find.byType(TextField),
        '- [ ] Review proposal\n  - [ ] Verify sources',
      );
      await tester.pumpAndSettle();
      await tester.ensureVisible(
        find.widgetWithText(FilledButton, 'Add tasks'),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Add tasks'));
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      expect(store.tasksFor(store.selectedDate).single.text, 'Review proposal');
      expect(
        store.tasksFor(store.selectedDate).single.subtasks.single.text,
        'Verify sources',
      );
      await tester.pumpWidget(const SizedBox());
      await store.flush();
      store.dispose();
    },
  );
}
