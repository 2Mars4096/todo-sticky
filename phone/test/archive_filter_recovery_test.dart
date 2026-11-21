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
      final store = StickyStore(
        persistence: MemoryPersistence(),
        credentials: MemoryCredentials(),
      );
      await store.initialize();
      store.preferences.interfaceLanguage = 'de';
      store.addTask('Archived note');
      final nav = GlobalKey<NavigatorState>();
      await tester.pumpWidget(StickyApp(store: store, navigatorKey: nav));
      await tester.pumpAndSettle();
      await tester.tap(find.byTooltip(ui('Search tasks')));
      await tester.pumpAndSettle();
      expect(find.byKey(const ValueKey('goal-filter')), findsNothing);
      final field = find.byType(TextField).first;
      await tester.enterText(field, 'missing');
      await tester.pumpAndSettle();
      await tester.tap(find.byType(DropdownButton<String>).last);
      await tester.pumpAndSettle();
      await tester.tap(find.text(ui('Completed')).last);
      await tester.pumpAndSettle();
      await tester.tap(find.text(ui('Reset filters')));
      await tester.pumpAndSettle();
      expect(tester.widget<TextField>(field).controller!.text, isEmpty);
      expect(tester.widget<TextField>(field).focusNode!.hasFocus, isTrue);
      expect(find.text('Archived note'), findsOneWidget);
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
      await tester.tap(find.byType(DropdownButton<String>).last);
      await tester.pumpAndSettle();
      await tester.tap(find.text(ui('Completed')).last);
      await tester.pumpAndSettle();
      await tester.tap(find.text(ui('Reset filters')));
      await tester.pumpAndSettle();
      expect(initialDate?.hasFocus, isTrue);
      expect(find.text('Archived note'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      store.dispose();
      debugDefaultTargetPlatformOverride = null;
    });
  }
}
