import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/app.dart';
import 'package:sticky_todo/widgets/dockit_footer_mark.dart';
import 'package:sticky_todo/interface_locale.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

void main() {
  tearDown(() => currentLanguage = 'en');
  test('resolves scripts, Cantonese and device fallback', () {
    expect(
      resolveLanguage('system', [
        const Locale.fromSubtags(
          languageCode: 'zh',
          scriptCode: 'Hans',
          countryCode: 'HK',
        ),
      ]),
      'zh-Hans',
    );
    expect(resolveLanguage('system', [const Locale('zh', 'TW')]), 'zh-Hant');
    expect(resolveLanguage('system', [const Locale('yue', 'HK')]), 'yue');
    expect(
      resolveLanguage('system', [const Locale('it'), const Locale('fr', 'CA')]),
      'fr',
    );
    expect(resolveLanguage('system', [const Locale('it')]), 'en');
  });
  testWidgets('globe switches every locale while retaining the notebook', (
    tester,
  ) async {
    tester.view.devicePixelRatio = 1;
    tester.view.physicalSize = const Size(390, 844);
    addTearDown(tester.view.reset);
    final persistence = MemoryPersistence();
    final store = StickyStore(
      persistence: persistence,
      credentials: MemoryCredentials(),
    );
    await store.initialize();
    store.addTask('Delete');
    await tester.pumpWidget(StickyApp(store: store));
    await tester.pumpAndSettle();
    for (final tag in languageNames.keys.where((n) => n != 'en')) {
      await tester.tap(
        find.ancestor(
          of: find.byType(DockitFooterMark),
          matching: find.byType(IconButton),
        ),
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text(ui('Settings')));
      await tester.pumpAndSettle();
      final globe = find.byType(InterfaceLanguageButton);
      expect(globe, findsOneWidget);
      await tester.tap(globe);
      await tester.pumpAndSettle();
      final option = find.byWidgetPredicate(
        (widget) =>
            widget is CheckedPopupMenuItem<String> && widget.value == tag,
      );
      await tester.ensureVisible(option);
      await tester.tap(option);
      await tester.pumpAndSettle();
      expect(store.preferences.interfaceLanguage, tag);
      expect(find.byTooltip(globeNames[tag]!), findsOneWidget);
      await tester.tap(find.byType(BackButton));
      await tester.pumpAndSettle();
      expect(find.text(translateLabel(tag, 'Notes', [])), findsWidgets);
      expect(store.tasksFor(store.today).single.text, 'Delete');
      expect(find.text('Delete'), findsOneWidget);
      expect(tester.takeException(), isNull, reason: tag);
    }
    await store.flush();
    await tester.pumpWidget(const SizedBox());
    final reopened = StickyStore(
      persistence: persistence,
      credentials: MemoryCredentials(),
    );
    await reopened.initialize();
    expect(reopened.preferences.interfaceLanguage, 'pt');
    expect(reopened.tasksFor(store.today).single.text, 'Delete');
    store.dispose();
    reopened.dispose();
  });
}
