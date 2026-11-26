import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sticky_todo/app.dart';
import 'package:sticky_todo/screens/account_screen.dart';
import 'package:sticky_todo/services/cloud_sync.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

void main() {
  for (final platform in [TargetPlatform.android, TargetPlatform.iOS]) {
    testWidgets('assign a proposal with a step on ${platform.name}', (
      tester,
    ) async {
      debugDefaultTargetPlatformOverride = platform;
      addTearDown(() => debugDefaultTargetPlatformOverride = null);
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = platform == TargetPlatform.iOS
          ? const Size(390, 844)
          : const Size(360, 740);
      addTearDown(tester.view.reset);
      final store = StickyStore(
        persistence: MemoryPersistence(),
        credentials: MemoryCredentials(),
      );
      await store.initialize();
      final writes = <http.Request>[];
      final account =
          CloudSyncController(
              store: store,
              openBrowser: (_) async => false,
              transport: CloudTransport(
                client: MockClient((request) async {
                  if (request.url.path == '/api/connected-apps/workspaces') {
                    return http.Response(
                      jsonEncode({
                        'workspaces': [
                          {'id': 'studio', 'role': 'editor', 'name': 'Studio'},
                        ],
                      }),
                      200,
                    );
                  }
                  writes.add(request);
                  if (writes.length == 1) {
                    return http.Response('{"detail":"Try again."}', 503);
                  }
                  return http.Response(
                    jsonEncode({
                      'id': request.method == 'POST'
                          ? jsonDecode(request.body)['id']
                          : request.url.pathSegments[request
                                    .url
                                    .pathSegments
                                    .length -
                                2],
                      'state': request.method == 'POST' ? 'ready' : 'review',
                      'revision': request.method == 'POST' ? 1 : 3,
                      'workspaceId': 'studio',
                    }),
                    200,
                  );
                }),
              ),
            )
            ..ready = true
            ..server = dianeSharedOrigin
            ..session = AccountSession(
              origin: dianeSharedOrigin,
              projectId: 'dear-diane-202610',
              apiKey: 'fixture',
              uid: 'editor',
              email: 'editor@example.test',
              idToken: 'fixture',
              refreshToken: 'fixture',
              expiresAt: DateTime.now().millisecondsSinceEpoch + 3600000,
            );
      Future<void> tap(Finder finder) async {
        await tester.ensureVisible(finder);
        await tester.tap(finder);
        await tester.pumpAndSettle();
      }

      await tester.pumpWidget(
        StickyApp(
          store: store,
          accountBuilder: (_) => AccountScreen(account: account),
        ),
      );
      await tester.pumpAndSettle();
      expect(find.text('No tasks yet'), findsOneWidget);
      await tester.enterText(
        find.byType(TextField).first,
        'Review the studio proposal',
      );
      await tester.pump();
      await tap(find.byTooltip('Add task'));
      await tap(find.byTooltip('Show task actions and steps').first);
      await tap(find.byTooltip('Add a step'));
      await tester.enterText(
        find.widgetWithText(TextField, 'Add a step'),
        'Estimate printing costs',
      );
      await tester.pump();
      await tap(find.byTooltip('Add step'));
      await tap(find.byTooltip('Open navigation menu'));
      await tap(find.text('Settings'));
      await tap(find.text('Account & sync'));
      await tap(find.widgetWithText(ExpansionTile, 'Assign in Shiprite'));
      await tap(find.text('Personal account'));
      await tap(find.text('Studio').last);
      await tap(find.byType(DropdownButton<String>).last);
      await tap(find.textContaining(' · Review the studio proposal').last);
      await tester.enterText(
        find.widgetWithText(TextField, 'Assignee UID (optional)'),
        'studio-member',
      );
      await tap(find.widgetWithText(FilledButton, 'Assign in Shiprite'));
      expect(find.textContaining('Try again.'), findsOneWidget);
      await tap(find.widgetWithText(FilledButton, 'Assign in Shiprite'));
      expect(find.text('Ready to start · Revision 1'), findsOneWidget);
      expect(writes.length, 2);
      expect(writes.last.method, 'POST');
      expect(writes.last.body, writes.first.body);
      expect(
        writes.last.url.path,
        '/api/connected-apps/workspaces/studio/shiprite/assignments',
      );
      expect(writes.last.url, writes.first.url);
      expect(jsonDecode(writes.last.body), {
        'id': jsonDecode(writes.first.body)['id'],
        'source': {
          'app': 'dockit',
          'workspaceId': 'studio',
          'date': store.today,
          'taskId': store.days[store.today]!.first.id,
        },
        'title': 'Review the studio proposal',
        'instructions': 'Review the studio proposal\n- Estimate printing costs',
        'assigneeUid': 'studio-member',
      });
      await tap(find.text('Check status'));
      expect(writes.last.method, 'GET');
      expect(find.text('Awaiting review · Revision 3'), findsOneWidget);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      account.dispose();
      store.dispose();
      debugDefaultTargetPlatformOverride = null;
    });
  }
}
