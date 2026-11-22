import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/app.dart';
import 'package:sticky_todo/interface_locale.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

void main() {
  for (final platform in [TargetPlatform.android, TargetPlatform.iOS]) {
    testWidgets('archive filter recovery keeps the date on ${platform.name}', (
      tester,
    ) async {
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = platform == TargetPlatform.iOS
          ? const Size(390, 844)
          : const Size(360, 740);
      addTearDown(tester.view.reset);
      debugDefaultTargetPlatformOverride = platform;
      addTearDown(() => debugDefaultTargetPlatformOverride = null);
      final disk = MemoryPersistence();
      final store = StickyStore(
        persistence: disk,
        credentials: MemoryCredentials(),
      );
      await store.initialize();
      store.preferences.interfaceLanguage = 'de';
      store.addTask('Archived note');
      store.addTask('A first note');
      final nav = GlobalKey<NavigatorState>();
      await tester.pumpWidget(StickyApp(store: store, navigatorKey: nav));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip(ui('Search tasks')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('goal-filter')), findsNothing);
      await tester.tap(find.byKey(const Key('archive-sort')));
      await tester.pumpAndSettle();
      await tester.tap(find.text(ui('Task title')));
      await tester.pumpAndSettle();
      expect(
        tester.getTopLeft(find.text('A first note')).dy,
        lessThan(tester.getTopLeft(find.text('Archived note')).dy),
      );
      final field = find.byType(TextField).first;
      await tester.enterText(field, 'missing');
      await tester.pumpAndSettle();
      final completed = find.byKey(const ValueKey('status-done'));
      await tester.ensureVisible(completed);
      await tester.tap(completed);
      await tester.pumpAndSettle();
      final fieldController = tester.widget<TextField>(field).controller!;
      fieldController.selection = const TextSelection.collapsed(offset: 3);
      await tester.tap(find.byKey(const Key('archive-sort')));
      await tester.pumpAndSettle();
      await tester.tap(find.text(ui('Task title')));
      await tester.pumpAndSettle();
      // A different writer committed this date before the pull.
      (disk.data!['days'][store.today] as List).first['text'] =
          'Refreshed note';
      await tester.drag(find.byType(ListView).last, const Offset(0, 420));
      await tester.pumpAndSettle();
      expect(
        store.selectedTasks.map((row) => row.task.text),
        contains('Refreshed note'),
      );
      expect(fieldController.text, 'missing');
      expect(fieldController.selection.baseOffset, 3);
      expect(tester.widget<ChoiceChip>(completed).selected, isTrue);
      await tester.tap(find.text(ui('Reset filters')));
      await tester.pumpAndSettle();
      expect(tester.widget<TextField>(field).controller!.text, isEmpty);
      expect(tester.widget<TextField>(field).focusNode!.hasFocus, isTrue);
      expect(find.text('Refreshed note'), findsOneWidget);
      expect(find.text(ui('Reset filters')), findsNothing);
      nav.currentState!.pop();
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip(ui('Progress')));
      await tester.pumpAndSettle();
      final dateButton = find.byType(OutlinedButton).first;
      final initialDate = tester.widget<OutlinedButton>(dateButton).focusNode;
      final info = find.widgetWithIcon(IconButton, Icons.info_outline).first;
      expect(tester.getSize(info), const Size(48, 48));
      await tester.tap(info);
      await tester.pump(const Duration(milliseconds: 200));
      expect(
        find.text(
          ui(
            'Tasks are grouped by their list date, not their completion date. Focus totals include retained sessions and planned duration.',
          ),
        ),
        findsOneWidget,
      );
      await tester.ensureVisible(completed);
      await tester.tap(completed);
      await tester.pumpAndSettle();
      await tester.tap(find.text(ui('Reset filters')));
      await tester.pumpAndSettle();
      expect(initialDate?.hasFocus, isTrue);
      expect(find.text('Refreshed note'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      store.dispose();
      debugDefaultTargetPlatformOverride = null;
    });
  }
}
