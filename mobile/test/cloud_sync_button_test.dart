import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sticky_todo/services/cloud_sync.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';
import 'package:sticky_todo/widgets/cloud_sync_button.dart';

class ButtonAccount extends CloudSyncController {
  bool syncEnabled = true, finished = false, succeed = true;
  int requests = 0;
  Completer<void>? hold;
  String result = 'Up to date across your devices.';
  ButtonAccount(StickyStore store)
    : super(
        store: store,
        openBrowser: (_) async => false,
        transport: CloudTransport(
          client: MockClient((_) async => http.Response('{}', 200)),
        ),
      ) {
    ready = true;
  }
  @override
  bool get enabled => syncEnabled;
  @override
  bool get upToDate => finished;
  void refresh() => notifyListeners();
  @override
  Future<void> synchronize({
    String? resolveKey,
    bool useCloud = false,
    String? reviewedFingerprint,
    Map<String, String>? choices,
    bool background = false,
  }) async {
    if (busy) return;
    requests++;
    busy = true;
    notifyListeners();
    if (hold != null) await hold!.future;
    message = result;
    finished = succeed;
    busy = false;
    notifyListeners();
  }
}

class RouteCounter extends NavigatorObserver {
  int pushes = 0;
  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    pushes++;
  }
}

void main() {
  Future<ButtonAccount> fixture(
    WidgetTester tester,
    RouteCounter routes,
  ) async {
    final store = StickyStore(
      persistence: MemoryPersistence(),
      credentials: MemoryCredentials(),
    );
    await store.initialize();
    final account = ButtonAccount(store);
    addTearDown(() {
      account.dispose();
      store.dispose();
    });
    await tester.pumpWidget(
      MaterialApp(
        navigatorObservers: [routes],
        home: Scaffold(
          appBar: AppBar(actions: [CloudSyncButton(account: account)]),
          body: const Text('Notes remain open'),
        ),
      ),
    );
    return account;
  }

  testWidgets(
    'cloud tap syncs directly and never navigates, with busy and result feedback',
    (tester) async {
      final routes = RouteCounter();
      final account = await fixture(tester, routes);
      account.hold = Completer<void>();
      final button = find.byType(IconButton);
      await tester.tap(button);
      await tester.pump();
      expect(account.requests, 1);
      expect(tester.widget<IconButton>(button).onPressed, isNull);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      account.hold!.complete();
      await tester.pumpAndSettle();
      expect(find.text(account.result), findsOneWidget);
      expect(find.text('Notes remain open'), findsOneWidget);
      expect(routes.pushes, 1);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'sync-off control does not navigate or implicitly enable an account',
    (tester) async {
      final routes = RouteCounter();
      final account = await fixture(tester, routes);
      account.syncEnabled = false;
      account.refresh();
      await tester.pump();
      expect(
        tester.widget<IconButton>(find.byType(IconButton)).onPressed,
        isNull,
      );
      expect(
        find.byTooltip('Sync is off. Settings → Account & sync'),
        findsOneWidget,
      );
      expect(account.requests, 0);
      expect(account.enabled, isFalse);
      expect(routes.pushes, 1);
      await tester.pumpWidget(const SizedBox());
    },
  );

  testWidgets(
    'deferred sync keeps the controller message without claiming success',
    (tester) async {
      final routes = RouteCounter();
      final account = await fixture(tester, routes);
      account.result = 'Waiting for editing to finish';
      account.succeed = false;
      await tester.tap(find.byType(IconButton));
      await tester.pumpAndSettle();
      expect(account.requests, 1);
      expect(find.text('Waiting for editing to finish'), findsOneWidget);
      expect(find.text('Notes remain open'), findsOneWidget);
      expect(routes.pushes, 1, reason: 'Only the initial Notes route exists');
      await tester.pumpWidget(const SizedBox());
    },
  );
}
