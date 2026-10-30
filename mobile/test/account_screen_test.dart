// Optional capture: STICKY_SCREENSHOTS=/tmp/sticky-phone flutter test test/account_screen_test.dart
import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sticky_todo/app.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/screens/account_screen.dart';
import 'package:sticky_todo/services/cloud_sync.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

const serviceOrigin = 'https://sticky-sync.example.test';
const longEmail = 'research.notes.and.daily.planning@university.example';

/// Keep layout and callback tests independent of real Google sign-in, polling,
/// platform browser launching and native file-picker dialogs.
class ScreenAccount extends CloudSyncController {
  bool syncEnabled = false;
  int signInRequests = 0;
  final resolutions = <({String? key, bool useCloud})>[];

  ScreenAccount({required super.store, required super.transport})
    : super(openBrowser: (_) async => true) {
    ready = true;
  }

  @override
  bool get enabled => syncEnabled;

  @override
  Future<void> signIn() async {
    signInRequests++;
  }

  @override
  Future<void> synchronize({
    String? resolveKey,
    bool useCloud = false,
    String? reviewedFingerprint,
  }) async {
    resolutions.add((key: resolveKey, useCloud: useCloud));
  }
}

Future<ScreenAccount> makeAccount(List<Uri> requests) async {
  final store = StickyStore(
    persistence: MemoryPersistence(),
    credentials: MemoryCredentials(),
  );
  await store.initialize();
  return ScreenAccount(
    store: store,
    transport: CloudTransport(
      client: MockClient((request) async {
        requests.add(request.url);
        expect(request.url.toString(), '$serviceOrigin/v1/config');
        return http.Response(
          jsonEncode({
            'schemaVersion': 1,
            'firebase': {
              'apiKey': 'public-web-api-key',
              'projectId': 'sticky-project',
              'authDomain': 'sticky-project.firebaseapp.com',
              'appId': '1:123:web:abc',
            },
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }),
    ),
  );
}

Finder accountScrollable() => find
    .descendant(
      of: find.byType(AccountScreen),
      matching: find.byType(Scrollable),
    )
    .first;

Finder buttonWithLabel(String text) => find
    .ancestor(
      of: find.text(text),
      matching: find.byWidgetPredicate((widget) => widget is ButtonStyleButton),
    )
    .first;

Future<void> revealButton(WidgetTester tester, String label) async {
  await tester.scrollUntilVisible(
    find.text(label),
    180,
    scrollable: accountScrollable(),
    maxScrolls: 30,
  );
  await tester.ensureVisible(buttonWithLabel(label));
  await tester.pumpAndSettle();
  final rect = tester.getRect(buttonWithLabel(label));
  expect(rect.left, greaterThanOrEqualTo(0), reason: label);
  expect(rect.right, lessThanOrEqualTo(360), reason: label);
  expect(rect.top, greaterThanOrEqualTo(0), reason: label);
  expect(rect.bottom, lessThanOrEqualTo(740), reason: label);
  expect(tester.takeException(), isNull, reason: label);
}

Future<void> openAccount(
  WidgetTester tester,
  ScreenAccount account,
  GlobalKey boundary,
) async {
  tester.view.physicalSize = const Size(360, 740);
  tester.view.devicePixelRatio = 1;
  tester.platformDispatcher.textScaleFactorTestValue = 1.5;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);

  await tester.pumpWidget(
    RepaintBoundary(
      key: boundary,
      child: StickyApp(
        store: account.store,
        accountBuilder: (_) => AccountScreen(account: account),
      ),
    ),
  );
  await tester.pumpAndSettle();
  await tester.tap(find.byTooltip('Settings'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Account & sync'));
  await tester.pumpAndSettle();
  expect(find.byType(AccountScreen), findsOneWidget);
  expect(tester.takeException(), isNull);
}

Future<void> captureAccount(WidgetTester tester, GlobalKey key) async {
  final output = Platform.environment['STICKY_SCREENSHOTS'];
  if (output == null) return;
  final boundary =
      key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
  await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: 2);
    final data = await image.toByteData(format: ui.ImageByteFormat.png);
    await Directory(output).create(recursive: true);
    await File('$output/account.png').writeAsBytes(data!.buffer.asUint8List());
    image.dispose();
  });
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    // Use actual glyphs when the local review font is available. Tests remain
    // portable to hosts without this system font.
    final font = File('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');
    if (font.existsSync()) {
      final loader = FontLoader('Roboto')
        ..addFont(Future.value(ByteData.sublistView(font.readAsBytesSync())));
      await loader.load();
    }
    final icons = FontLoader('MaterialIcons')
      ..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'));
    await icons.load();
  });

  testWidgets('service setup works at 360px with 150% text', (tester) async {
    final requests = <Uri>[];
    final account = await makeAccount(requests);
    addTearDown(() {
      account.dispose();
      account.store.dispose();
    });
    await openAccount(tester, account, GlobalKey());

    await revealButton(tester, 'Continue with Google');
    expect(
      tester
          .widget<ButtonStyleButton>(buttonWithLabel('Continue with Google'))
          .onPressed,
      isNull,
    );

    final field = find.widgetWithText(TextField, 'Service URL');
    await tester.ensureVisible(field);
    await tester.enterText(field, 'http://unsafe.example.test');
    await revealButton(tester, 'Connect service');
    await tester.tap(buttonWithLabel('Connect service'));
    await tester.pumpAndSettle();
    expect(requests, isEmpty);
    expect(
      find.textContaining('Enter the HTTPS service origin'),
      findsOneWidget,
    );
    expect(tester.takeException(), isNull);

    await tester.ensureVisible(field);
    await tester.enterText(field, serviceOrigin);
    await revealButton(tester, 'Connect service');
    await tester.tap(buttonWithLabel('Connect service'));
    await tester.pumpAndSettle();
    expect(account.server, serviceOrigin);
    expect(requests.map((uri) => uri.toString()), ['$serviceOrigin/v1/config']);
    expect(find.textContaining('Enter the HTTPS service origin'), findsNothing);

    await revealButton(tester, 'Continue with Google');
    expect(
      tester
          .widget<ButtonStyleButton>(buttonWithLabel('Continue with Google'))
          .onPressed,
      isNotNull,
    );
    await tester.tap(buttonWithLabel('Continue with Google'));
    await tester.pumpAndSettle();
    expect(account.signInRequests, 1);
    expect(tester.takeException(), isNull);
    await tester.pumpWidget(const SizedBox());
  });

  testWidgets(
    'long account and conflict choices remain usable at 360px with 150% text',
    (tester) async {
      final account = await makeAccount(<Uri>[]);
      addTearDown(() {
        account.dispose();
        account.store.dispose();
      });
      account.server = serviceOrigin;
      account.syncEnabled = true;
      account.session = AccountSession(
        origin: serviceOrigin,
        projectId: 'sticky-project',
        apiKey: 'public-web-api-key',
        uid: 'review-user',
        email: longEmail,
        idToken: 'not-a-real-token',
        refreshToken: 'not-a-real-refresh-token',
        expiresAt: DateTime.now().millisecondsSinceEpoch + 3600000,
      );
      Map<String, dynamic> note(String text) => {
        'date': '2026-10-24',
        'tasks': [Task(id: 'research-task', text: text).toJson()],
      };
      account.message =
          '1 note needs your choice. Both versions are preserved.';
      account.lastSynced = '2026-10-24T10:30:00';
      account.conflicts = [
        SyncAction(
          'day:2026-10-24',
          SyncKind.conflict,
          note('Add the final research figures and send the draft to Mei'),
          SyncRecord(
            key: 'day:2026-10-24',
            revision: 2,
            deleted: false,
            payload: note(
              'Review the supporting evidence before sending the draft',
            ),
            mutationId: 'desktop-revision',
            updatedAt: '2026-10-24T10:30:00Z',
          ),
        ),
      ];

      final boundary = GlobalKey();
      await openAccount(tester, account, boundary);
      expect(find.text(longEmail), findsOneWidget);
      final emailRect = tester.getRect(find.text(longEmail));
      expect(emailRect.right, lessThanOrEqualTo(340));
      expect(emailRect.height, greaterThan(30));
      await captureAccount(tester, boundary);

      await revealButton(tester, 'Sync now');
      await tester.tap(buttonWithLabel('Sync now'));
      await tester.pumpAndSettle();
      expect(account.resolutions, [(key: null, useCloud: false)]);

      await revealButton(tester, 'Keep device version');
      await tester.tap(buttonWithLabel('Keep device version'));
      await tester.pumpAndSettle();
      expect(account.resolutions.last, (
        key: 'day:2026-10-24',
        useCloud: false,
      ));

      await revealButton(tester, 'Use account version');
      await tester.tap(buttonWithLabel('Use account version'));
      await tester.pumpAndSettle();
      expect(account.resolutions.last, (key: 'day:2026-10-24', useCloud: true));

      await revealButton(tester, 'Export conflict recovery copies');
      expect(
        tester
            .widget<ButtonStyleButton>(
              buttonWithLabel('Export conflict recovery copies'),
            )
            .onPressed,
        isNotNull,
      );
      await tester.pumpAndSettle();
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
