import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/screens/account_screen.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

void main() {
  for (final platform in [TargetPlatform.android, TargetPlatform.iOS]) {
    testWidgets(
      'account-enabled notebook launch and drawer preserve all tabs on ${platform.name}',
      (tester) async {
        debugDefaultTargetPlatformOverride = platform;
        addTearDown(() => debugDefaultTargetPlatformOverride = null);
        tester.view.physicalSize = const Size(320, 740);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        tester.platformDispatcher.textScaleFactorTestValue = 1.4;
        addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
        final store = StickyStore(
          persistence: MemoryPersistence(),
          credentials: MemoryCredentials(),
        );
        await tester.pumpWidget(AccountEnabledApp(store: store));
        await tester.pumpAndSettle();
        final destinations = find.descendant(
          of: find.byType(NavigationBar),
          matching: find.byType(NavigationDestination),
        );
        expect(
          tester
              .widgetList<NavigationDestination>(destinations)
              .map((d) => d.label),
          ['Notes', 'Goals', 'Focus'],
        );
        expect(find.byType(AppBar), findsNothing);
        expect(find.text('Sign in'), findsNothing);
        await tester.enterText(find.byType(TextField).first, 'Meeting review draft');
        await tester.tap(find.byTooltip('Open navigation menu'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Settings'));
        await tester.pumpAndSettle();
        expect(find.text('Signed out'), findsOneWidget);
        expect(find.text('System default'), findsOneWidget);
        await tester.tap(find.text('Account & sync'));
        await tester.pumpAndSettle();
        expect(find.text('Continue with Google'), findsOneWidget);
        await tester.pageBack();
        await tester.pumpAndSettle();
        await tester.pageBack();
        await tester.pumpAndSettle();
        expect(find.text('Meeting review draft'), findsOneWidget);
        await tester.tap(find.widgetWithText(NavigationDestination, 'Goals'));
        await tester.pumpAndSettle();
        await tester.tap(find.byTooltip('Open navigation menu'));
        await tester.pumpAndSettle();
        await tester.tap(find.text('Settings'));
        await tester.pumpAndSettle();
        expect(find.text('Account & sync'), findsOneWidget);
        await tester.pageBack();
        await tester.pumpAndSettle();
        expect(
          tester
              .widget<NavigationBar>(find.byType(NavigationBar))
              .selectedIndex,
          1,
        );
        await tester.tap(find.widgetWithText(NavigationDestination, 'Focus'));
        await tester.pumpAndSettle();
        expect(
          tester
              .widget<NavigationBar>(find.byType(NavigationBar))
              .selectedIndex,
          2,
        );
        expect(tester.takeException(), isNull);
        await tester.pumpWidget(const SizedBox());
        debugDefaultTargetPlatformOverride = null;
        store.dispose();
      },
    );
  }
}
