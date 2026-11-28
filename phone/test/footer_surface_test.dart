import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/app.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

void main() {
  for (final material in ['paper', 'frosted', 'liquid']) {
    testWidgets('the footer mark shows $material through its corners', (
      tester,
    ) async {
      final store = StickyStore(
        persistence: MemoryPersistence(),
        credentials: MemoryCredentials(),
      );
      await store.initialize();
      store.preferences.material = material;
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = const Size(390, 844);
      tester.view.padding = const FakeViewPadding(top: 24, bottom: 20);
      tester.view.viewPadding = const FakeViewPadding(top: 24, bottom: 20);
      try {
        final key = GlobalKey();
        await tester.pumpWidget(
          RepaintBoundary(
            key: key,
            child: StickyApp(store: store),
          ),
        );
        await tester.pumpAndSettle();
        final nav = find.byType(NavigationBar);
        final top = tester.getTopLeft(nav).dy.round();
        final center = tester.getCenter(find.byTooltip('Open navigation menu'));
        final surface = Theme.of(tester.element(nav)).scaffoldBackgroundColor
            .toARGB32();
        final boundary =
            key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
        final image = (await tester.runAsync(
          () => boundary.toImage(pixelRatio: 1),
        ))!;
        try {
          final data = (await tester.runAsync(
            () => image.toByteData(format: ui.ImageByteFormat.rawRgba),
          ))!;
          int color(int x, int y) {
            final i = 4 * (y * image.width + x);
            return Color.fromARGB(
              data.getUint8(i + 3),
              data.getUint8(i),
              data.getUint8(i + 1),
              data.getUint8(i + 2),
            ).toARGB32();
          }

          for (var x = 0; x < image.width; x++) {
            if (color(x, top + 2) != surface) {
              fail('The footer surface changed at x=$x.');
            }
          }
          for (final dx in [-11, 11]) {
            for (final dy in [-11, 11]) {
              expect(
                color(center.dx.round() + dx, center.dy.round() + dy),
                surface,
                reason: 'A launcher tile would cover the selected notebook material.',
              );
            }
          }
        } finally {
          image.dispose();
        }
      } finally {
        await tester.pumpWidget(const SizedBox());
        store.dispose();
        tester.view.reset();
      }
    });
  }
}
