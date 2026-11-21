// Standalone regression for the actual daily notebook's saved date in both phone layouts.
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/intl.dart';
import 'package:sticky_todo/app.dart';
import 'package:sticky_todo/interface_locale.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

void main() {
  for (final platform in [TargetPlatform.android, TargetPlatform.iOS]) {
    testWidgets('Saved task deadline respects each language on $platform', (
      tester,
    ) async {
      final results = <Map<String, Object>>[];
      debugDefaultTargetPlatformOverride = platform;
      addTearDown(() => debugDefaultTargetPlatformOverride = null);
      for (final tag in languageNames.keys) {
        for (var cycle = 1; cycle <= 5; cycle++) {
          final store = StickyStore(
            persistence: MemoryPersistence(),
            credentials: MemoryCredentials(),
          );
          await store.initialize();
          store.preferences.interfaceLanguage = tag;
          final task = store.addTask('Fixture local date');
          task.finish = FinishPromise(by: '2026-12-12');
          await tester.pumpWidget(StickyApp(store: store));
          await tester.pump();
          await tester.pump(const Duration(milliseconds: 350));
          final context = tester.element(find.text('Fixture local date').first);
          final date = DateFormat.MMMd(materialLocale(tag).toString())
              .format(DateTime(2026, 12, 12));
          final expected = tr(context, 'Due {0}', [date]);
          expect(
            find.text(expected),
            findsOneWidget,
            reason: '$tag cycle $cycle',
          );
          results.add({
            'platform': platform.name,
            'locale': tag,
            'cycle': cycle,
            'scope': 'daily notebook task deadline',
            'actual': tester.widget<Text>(find.text(expected)).data!,
          });
          await tester.pumpWidget(const SizedBox());
          await tester.pump();
        }
      }
      debugDefaultTargetPlatformOverride = null;
      final dir = Platform.environment['DOCKIT_REVIEW_DIR'];
      if (dir != null) {
        File('$dir/flutter-${platform.name}.json')
            .writeAsStringSync(jsonEncode(results));
      }
    });
  }
}
