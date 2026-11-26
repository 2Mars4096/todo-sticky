import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sticky_todo/services/cloud_sync.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';
import 'package:sticky_todo/widgets/workspace_assignments.dart';

void main() {
  for (final count in [0, 1, 2]) {
    testWidgets(
      'personal scope stays implicit with $count shared destinations',
      (tester) async {
        tester.view.devicePixelRatio = 1;
        tester.view.physicalSize = const Size(320, 740);
        addTearDown(tester.view.reset);
        final store = StickyStore(
          persistence: MemoryPersistence(),
          credentials: MemoryCredentials(),
        );
        await store.initialize();
        store.addTask('One personal task');
        var requests = 0;
        final account =
            CloudSyncController(
                store: store,
                openBrowser: (_) async => false,
                transport: CloudTransport(
                  client: MockClient((request) async {
                    requests++;
                    expect(request.method, 'GET');
                    return http.Response(
                      jsonEncode({
                        'workspaces': [
                          for (var i = 0; i < count; i++)
                            {
                              'id': 'shared$i',
                              'role': 'editor',
                              'name': 'A long shared project destination $i',
                            },
                        ],
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
                uid: 'alice',
                email: 'alice@example.test',
                idToken: 'fixture',
                refreshToken: 'fixture',
                expiresAt: DateTime.now().millisecondsSinceEpoch + 3600000,
              );
        await tester.pumpWidget(
          MaterialApp(
            home: Scaffold(
              body: ListenableBuilder(
                listenable: account,
                builder: (context, _) => ListView(
                  children: [
                    WorkspaceAssignments(
                      key: ValueKey(account.session!.owner),
                      account: account,
                    ),
                  ],
                ),
              ),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(
          requests,
          0,
        ); // Opening Account never discovers collaboration in the background.
        expect(account.selectedWorkspace, '');
        await tester.tap(
          find.widgetWithText(ExpansionTile, 'Assign in Shiprite'),
        );
        await tester.pumpAndSettle();
        expect(requests, 1);
        expect(
          account.selectedWorkspace,
          '',
        ); // Even one shared destination requires a choice.
        expect(
          find.byType(DropdownButton<String>),
          count == 0 ? findsNothing : findsOneWidget,
        );
        if (count > 0) {
          await tester.tap(find.text('Personal account'));
          await tester.pumpAndSettle();
          await tester.tap(
            find.text('A long shared project destination 0').last,
          );
          await tester.pumpAndSettle();
          expect(account.selectedWorkspace, 'shared0');
          expect(
            find.text('Task and steps'),
            findsNothing,
          ); // Exactly one local task.
          expect(find.text('One personal task'), findsOneWidget);
          expect(requests, 1); // Nothing sent until explicit Assign.
          await account.chooseWorkspace('');
          await tester.pumpAndSettle();
          expect(
            find.widgetWithText(FilledButton, 'Assign in Shiprite'),
            findsNothing,
          );
        }
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        account.dispose();
        await store.flush();
        store.dispose();
      },
    );
  }
}
