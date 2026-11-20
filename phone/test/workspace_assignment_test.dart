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
                  if (writes.length == 1)
                    return http.Response('{"detail":"Try again."}', 503);
                  return http.Response(
                    jsonEncode({
                      'id': request.url.pathSegments.last,
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
      await tap(find.byTooltip('Add task'));
      await tap(find.byTooltip('Show task actions and steps').first);
      await tap(find.byTooltip('Add a step'));
      await tester.enterText(
        find.widgetWithText(TextField, 'Add a step'),
        'Estimate printing costs',
      );
      await tap(find.byTooltip('Add step'));
      await tap(find.byTooltip('Settings'));
      await tap(find.text('Account & sync'));
      await tap(find.text('Workspace assignments'));
      await tap(find.text('Personal account'));
      await tap(find.text('Studio').last);
      await tap(find.byType(DropdownButton<String>).last);
      await tap(find.textContaining(' · Review the studio proposal').last);
      await tester.enterText(
        find.widgetWithText(TextField, 'Assignee UID (optional)'),
        'studio-member',
      );
      await tap(find.text('Assign in Shiprite'));
      expect(find.textContaining('Try again.'), findsOneWidget);
      await tap(find.text('Assign in Shiprite'));
      expect(find.text('Assigned in Shiprite.'), findsOneWidget);
      expect(writes.length, 2);
      expect(writes.last.method, 'PUT');
      expect(writes.last.url, writes.first.url);
      expect(jsonDecode(writes.last.body), {
        'title': 'Review the studio proposal',
        'instructions': 'Review the studio proposal\n- Estimate printing costs',
        'assigneeUid': 'studio-member',
      });
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
      account.dispose();
      store.dispose();
      debugDefaultTargetPlatformOverride = null;
    });
  }
}
