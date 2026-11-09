import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/services/cloud_sync.dart';
import 'package:sticky_todo/widgets/sync_progress.dart';

void main() {
  testWidgets(
    'progress fits narrow large-text screens and distinguishes unknown totals',
    (tester) async {
      tester.view.physicalSize = const Size(360, 740);
      tester.view.devicePixelRatio = 1;
      tester.platformDispatcher.textScaleFactorTestValue = 1.5;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      addTearDown(tester.platformDispatcher.clearTextScaleFactorTestValue);
      final now = DateTime.now();
      Future<void> show(CloudSyncProgress progress) => tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Padding(
              padding: const EdgeInsets.all(20),
              child: SyncProgressView(progress: progress),
            ),
          ),
        ),
      );
      await show(
        CloudSyncProgress(
          stage: 'Uploading',
          detail: '2026-10-30',
          completed: 42,
          total: 137,
          startedAt: now.subtract(const Duration(seconds: 65)),
          updatedAt: now.subtract(const Duration(seconds: 20)),
        ),
      );
      expect(find.text('42 / 137'), findsOneWidget);
      expect(find.textContaining('Waiting for this step'), findsOneWidget);
      expect(
        tester
            .widget<LinearProgressIndicator>(
              find.byType(LinearProgressIndicator),
            )
            .value,
        closeTo(42 / 137, .001),
      );
      expect(tester.takeException(), isNull);
      await show(
        CloudSyncProgress(
          stage: 'Reading local history',
          completed: 0,
          startedAt: now,
          updatedAt: now,
        ),
      );
      expect(
        tester
            .widget<LinearProgressIndicator>(
              find.byType(LinearProgressIndicator),
            )
            .value,
        isNull,
      );
      expect(find.textContaining('Waiting for this step'), findsNothing);
      expect(tester.takeException(), isNull);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
