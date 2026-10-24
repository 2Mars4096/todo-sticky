// Optional review captures: STICKY_SCREENSHOTS=/tmp/sticky-phone flutter test test/phone_preview_test.dart
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/app.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

void main() {
  final output = Platform.environment['STICKY_SCREENSHOTS'];
  testWidgets('review phone layouts', skip: output == null, (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final font = File('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');
    if (font.existsSync()) {
      final loader = FontLoader('Roboto')
        ..addFont(Future.value(ByteData.sublistView(font.readAsBytesSync())));
      await loader.load();
    }
    final iconLoader = FontLoader('MaterialIcons')
      ..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'));
    await iconLoader.load();
    final store = StickyStore(
      persistence: MemoryPersistence(),
      credentials: MemoryCredentials(),
    );
    await store.initialize();
    store.selectDate('2026-10-24');
    store.refreshClock(DateTime(2026, 10, 24));
    final first = store.addTask('Turn the research into a story');
    store.updateTask(
      store.selectedDate,
      first.id,
      updateFinish: true,
      outcome: 'A clear argument and three supporting figures',
      due: '2026-10-28',
    );
    store.addTask('Sketch the opening argument', parentId: first.id);
    store.addTask('Choose the figures', parentId: first.id);
    store.addTask('Reply to Mei about next week');
    store.addTask('Take a walk before dinner');
    store.addTask('Read the reviewer notes', date: '2026-10-22');
    store.goals.targets.add(GoalItem(text: 'Submit the paper this autumn'));
    store.goals.recurring.add(GoalItem(text: 'Read one paper with a pen'));
    final key = GlobalKey();
    await tester.pumpWidget(
      RepaintBoundary(
        key: key,
        child: StickyApp(store: store),
      ),
    );
    await tester.pumpAndSettle();
    Future<void> capture(String name) async {
      expect(tester.takeException(), isNull);
      final boundary =
          key.currentContext!.findRenderObject()! as RenderRepaintBoundary;
      await tester.runAsync(() async {
        final image = await boundary.toImage(pixelRatio: 2);
        final data = await image.toByteData(format: ui.ImageByteFormat.png);
        await Directory(output!).create(recursive: true);
        await File('$output/$name.png')
            .writeAsBytes(data!.buffer.asUint8List());
        image.dispose();
      });
    }

    await capture('notes');
    await tester.tap(find.byTooltip('Show task actions and steps').first);
    await tester.pumpAndSettle();
    await capture('task-actions');
    await tester.tap(find.text('Goals').last);
    await tester.pumpAndSettle();
    await capture('goals');
    store.startFocus(first, 25);
    await tester.tap(find.text('Focus').last);
    await tester.pumpAndSettle();
    await capture('focus');
    await tester.pumpWidget(const SizedBox());
    store.dispose();
  });
}
