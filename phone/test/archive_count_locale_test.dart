import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/app.dart';
import 'package:sticky_todo/interface_locale.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

void main() {
  for (final platform in [TargetPlatform.android, TargetPlatform.iOS]) {
    testWidgets(
      'search and progress render the correct localized result counts on $platform',
      (tester) async {
        final dir = Platform.environment['DOCKIT_COUNTER_REVIEW_DIR'];
        final out = dir == null
            ? null
            : File('$dir/counter-${platform.name}.raw.jsonl')
                  .openSync(mode: FileMode.write);
        void checked(String tag, int cycle, String state, String expected) {
          final item = find.text(expected);
          expect(item, findsOneWidget);
          if (out == null) return;
          final box = tester.getRect(item);
          final role = tester.widget(item).runtimeType.toString();
          out.writeStringSync(
            jsonEncode([
                  platform.name,
                  tag,
                  cycle,
                  state,
                  [
                    {
                      'locator': state + '/result-count',
                      'kind': 'text',
                      'text': expected,
                      'widgetType': role,
                      'bounds': [
                        box.left.round(),
                        box.top.round(),
                        box.width.round(),
                        box.height.round(),
                      ],
                      'inView': true,
                      'emptyBox': box.isEmpty,
                    },
                  ],
                ]) +
                '\n',
          );
        }

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
            store.addTask('Fixture count one');
            store.addTask('Fixture count two');
            final nav = GlobalKey<NavigatorState>();
            await tester.pumpWidget(StickyApp(store: store, navigatorKey: nav));
            await tester.pumpAndSettle();
            await tester.tap(find.byTooltip(ui('Search tasks')));
            await tester.pumpAndSettle();
            expect(
              find.text(ui('{0} matches', [2])),
              findsOneWidget,
              reason: '$tag $cycle plural search',
            );
            checked(tag, cycle, 'search-plural', ui('{0} matches', [2]));
            await tester.enterText(
              find.byType(TextField).first,
              'Fixture count one',
            );
            await tester.pumpAndSettle();
            expect(
              find.text(ui('{0} match', [1])),
              findsOneWidget,
              reason: '$tag $cycle singular search',
            );
            checked(tag, cycle, 'search-singular', ui('{0} match', [1]));
            nav.currentState!.pop();
            await tester.pumpAndSettle();
            await tester.tap(find.byTooltip(ui('Progress')));
            await tester.pumpAndSettle();
            expect(
              find.text(ui('{0} tasks', [2])),
              findsOneWidget,
              reason: '$tag $cycle plural progress',
            );
            checked(tag, cycle, 'progress-plural', ui('{0} tasks', [2]));
            store.deleteTask(store.today, store.tasksFor(store.today).last.id);
            await tester.pumpAndSettle();
            expect(
              find.text(ui('{0} task', [1])),
              findsOneWidget,
              reason: '$tag $cycle singular progress',
            );
            checked(tag, cycle, 'progress-singular', ui('{0} task', [1]));
            await tester.pumpWidget(const SizedBox());
            store.dispose();
          }
        }
        out?.closeSync();
        debugDefaultTargetPlatformOverride = null;
      },
    );
  }
}
