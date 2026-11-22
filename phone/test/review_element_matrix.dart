// Run explicitly with DOCKIT_REVIEW_DIR set to a disposable evidence directory.
import 'dart:convert';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/app.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/interface_locale.dart';
import 'package:sticky_todo/services/cloud_sync.dart';
import 'package:sticky_todo/services/ai_service.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';
import 'package:sticky_todo/screens/account_screen.dart';
import 'package:sticky_todo/screens/albums_screen.dart';
import 'package:sticky_todo/screens/archive_screen.dart';
import 'package:sticky_todo/screens/focus_screen.dart';
import 'package:sticky_todo/screens/goal_plan_screen.dart';
import 'package:sticky_todo/screens/goals_screen.dart';
import 'package:sticky_todo/screens/plan_screen.dart';
import 'package:sticky_todo/screens/project_schedule_screen.dart';
import 'package:sticky_todo/screens/settings_screen.dart';

void main() {
  final dir = Platform.environment['DOCKIT_REVIEW_DIR']!;
  for (final platform in [TargetPlatform.android, TargetPlatform.iOS]) {
    testWidgets('per-element five-cycle host render on $platform', (
      tester,
    ) async {
      final tagName = platform.name;
      final output = File('$dir/flutter-$tagName.raw.jsonl')
          .openSync(mode: FileMode.write);
      final failures = <List<Object?>>[];
      final semanticsHandle = tester.ensureSemantics();

      debugDefaultTargetPlatformOverride = platform;
      addTearDown(() => debugDefaultTargetPlatformOverride = null);
      tester.view.devicePixelRatio = 1;
      tester.view.physicalSize = platform == TargetPlatform.iOS
          ? const Size(390, 844)
          : const Size(360, 740);
      addTearDown(tester.view.reset);
      await tester.runAsync(() async {
        final bytes = ByteData.sublistView(
          File('/System/Library/Fonts/Supplemental/Arial Unicode.ttf')
              .readAsBytesSync(),
        );
        for (final family in [
          'Roboto',
          'CupertinoSystemText',
          'CupertinoSystemDisplay',
          '.SF UI Text',
          '.SF UI Display',
        ]) {
          await (FontLoader(family)..addFont(Future.value(bytes))).load();
        }
        await (FontLoader(
          'MaterialIcons',
        )..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
      });
      Future<void> settle() async {
        await tester.pump();
        await tester.pump(const Duration(milliseconds: 350));
        await tester.pump();
      }

      for (final locale in languageNames.keys) {
        for (var cycle = 1; cycle <= 5; cycle++) {
          tester.platformDispatcher.accessibilityFeaturesTestValue =
              FakeAccessibilityFeatures(disableAnimations: cycle == 4);
          File('$dir/flutter-$tagName-progress.txt')
              .writeAsStringSync('$locale $cycle initializing');
          final store = StickyStore(
            persistence: MemoryPersistence(),
            credentials: MemoryCredentials(),
          );
          await store.initialize();
          store.preferences.interfaceLanguage = locale;
          final root = store.addTask('Fixture note · 草稿');
          store.addTask('Fixture step', parentId: root.id);
          final goal = GoalItem(id: 'fixture-goal', text: 'Fixture project');
          store.goals.targets.add(goal);
          final ai = AiService(store.credentials);
          final account = CloudSyncController(
            store: store,
            openBrowser: (_) async => false,
          )..ready = true;
          final linked =
              CloudSyncController(
                  store: store,
                  openBrowser: (_) async => false,
                  transport: CloudTransport(
                    client: MockClient((r) async {
                      if (r.url.path == '/api/connected-apps/workspaces') {
                        return http.Response(
                          jsonEncode({
                            'workspaces': [
                              {
                                'id': 'review',
                                'role': 'editor',
                                'name': 'Fixture workspace',
                              },
                            ],
                          }),
                          200,
                        );
                      }
                      return http.Response(
                        jsonEncode({'detail': 'Synthetic offline response'}),
                        503,
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
                  uid: 'reviewer',
                  email: 'reviewer@example.test',
                  idToken: 'fixture',
                  refreshToken: 'fixture',
                  expiresAt: DateTime.now().millisecondsSinceEpoch + 3600000,
                );
          final nav = GlobalKey<NavigatorState>();
          await tester.pumpWidget(StickyApp(store: store, navigatorKey: nav));
          await settle();
          void snap(String state) {
            File('$dir/flutter-$tagName-progress.txt')
                .writeAsStringSync('$locale $cycle $state');
            final elements = find
                .byWidgetPredicate(
                  (w) =>
                      w is RichText ||
                      w is Tooltip ||
                      w is Semantics ||
                      w is EditableText,
                )
                .evaluate();
            final items = <Map<String, Object?>>[];
            final occurrences = <String, int>{};
            for (final el in elements) {
              final w = el.widget, r = el.renderObject;
              if (r is! RenderBox || !r.attached || !r.hasSize) continue;
              String? value;
              String kind;
              if (w is RichText) {
                value = w.text.toPlainText();
                kind = 'text';
              } else if (w is Tooltip) {
                value = w.message ?? w.richMessage?.toPlainText();
                kind = 'tooltip';
              } else if (w is Semantics) {
                value = w.properties.label;
                kind = 'semantics-label';
              } else if (w is EditableText) {
                value = w.controller.text;
                kind = 'input';
              } else {
                continue;
              }
              if (value == null || value.trim().isEmpty) continue;
              final ancestors = <String>[];
              el.visitAncestorElements((a) {
                final type = a.widget.runtimeType.toString();
                if (!type.startsWith('_') &&
                    (type.endsWith('Screen') ||
                        [
                          'IconButton',
                          'TextButton',
                          'FilledButton',
                          'ListTile',
                          'AppBar',
                          'TaskTile',
                          'NavigationBar',
                          'NavigationDestination',
                          'DropdownButton',
                          'Semantics',
                          'PopupMenuItem',
                          'ExpansionTile',
                          'AlertDialog',
                          'TextField',
                          'Chip',
                        ].contains(type))) {
                  ancestors.add(type);
                }
                return ancestors.length < 6;
              });
              if (kind == 'text' &&
                  value.runes.every((n) => n >= 0xE000 && n <= 0xF8FF)) {
                kind = 'icon-glyph';
              }
              final key = '$kind/${ancestors.reversed.join('/')}';
              final index = occurrences.update(
                key,
                (v) => v + 1,
                ifAbsent: () => 0,
              );
              final rect = MatrixUtils.transformRect(
                r.getTransformTo(null),
                Offset.zero & r.size,
              );
              final offset = rect.topLeft, size = rect.size;
              items.add({
                'locator': '$key[$index]',
                'kind': kind,
                'text': value,
                'bounds': [
                  offset.dx.round(),
                  offset.dy.round(),
                  size.width.round(),
                  size.height.round(),
                ],
                'inView':
                    offset.dy + size.height > 0 &&
                    offset.dy < tester.view.physicalSize.height &&
                    offset.dx + size.width > 0 &&
                    offset.dx < tester.view.physicalSize.width,
                'viewportOverflow':
                    offset.dx < -2 ||
                    offset.dx + size.width > tester.view.physicalSize.width + 2,
                'emptyBox': size.isEmpty,
                'clipped': r is RenderParagraph && r.didExceedMaxLines,
                'ellipsis':
                    w is RichText && w.overflow == TextOverflow.ellipsis,
              });
            }
            final sem = tester
                .binding
                .renderViews
                .first
                .owner
                ?.semanticsOwner
                ?.rootSemanticsNode;
            if (sem != null) {
              void visit(dynamic node, String path) {
                final value = node.getSemanticsData();
                final label = value.label as String;
                if (label.isNotEmpty) {
                  items.add({
                    'kind': 'accessibility-label',
                    'locator': path,
                    'text': label,
                    'bounds': [
                      node.rect.left.round(),
                      node.rect.top.round(),
                      node.rect.width.round(),
                      node.rect.height.round(),
                    ],
                    'coordinateSpace': 'semantic-node-local',
                    'inView': null,
                    'emptyBox': node.rect.isEmpty,
                  });
                }
                int i = 0;
                node.visitChildren((dynamic child) {
                  visit(child, '$path/${i++}');
                  return true;
                });
              }

              visit(sem, 'semantics');
            }
            output.writeStringSync(
              '${jsonEncode([tagName, locale, cycle, state, items])}\n',
            );
          }

          try {
            snap('notebook');
            await tester.tap(
              find.byTooltip(ui('Show task actions and steps')).first,
            );
            await settle();
            snap('expanded-task');
            nav.currentState!.push(MaterialPageRoute<void>(builder: (_) => SettingsScreen(store: store, ai: ai)));
            await settle();
            await tester.tap(find.byType(InterfaceLanguageButton));
            await settle();
            snap('language-menu');
            nav.currentState!.pop();
            await settle();
            nav.currentState!.pop();
            await settle();
            final routes = <String, Widget Function()>{
              'settings': () => SettingsScreen(
                store: store,
                ai: ai,
                accountBuilder: (_) => AccountScreen(account: account),
              ),
              'provider': () => ProviderEditor(store: store),
              'account-signed-out': () => AccountScreen(account: account),
              'account-fixture-editor': () => AccountScreen(account: linked),
              'checklist-import': () => ChecklistImporter(store: store),
              'machines': () => MachinesScreen(store: store),
              'search': () =>
                  ArchiveScreen(store: store, ai: ai, openFocus: () {}),
              'progress': () => ArchiveScreen(
                store: store,
                ai: ai,
                openFocus: () {},
                progress: true,
              ),
              'goals': () => GoalsScreen(
                store: store,
                ai: ai,
                openFocus: () {},
                openDay: (_) {},
              ),
              'focus': () => FocusScreen(store: store),
              'plan': () => PlanScreen(store: store, ai: ai),
              'project': () => GoalPlanScreen(
                store: store,
                ai: ai,
                goalId: goal.id,
                openFocus: () {},
              ),
              'project-schedule': () =>
                  ProjectScheduleScreen(store: store, ai: ai, goalId: goal.id),
              'albums': () => AlbumsScreen(store: store, ai: ai),
            };
            for (final entry in routes.entries) {
              try {
                nav.currentState!.push<void>(
                  PageRouteBuilder(
                    pageBuilder: (_, _, _) =>
                        Scaffold(body: SafeArea(child: entry.value())),
                    transitionDuration: Duration.zero,
                    reverseTransitionDuration: Duration.zero,
                  ),
                );
                await tester.pump();
                await tester.pump(const Duration(milliseconds: 250));
                snap(entry.key);
                final scrolling = find
                    .byType(Scrollable)
                    .evaluate()
                    .whereType<StatefulElement>()
                    .map((e) => e.state)
                    .whereType<ScrollableState>();
                var moved = false;
                for (final scroll in scrolling) {
                  final pos = scroll.position;
                  if (pos.hasContentDimensions &&
                      axisDirectionToAxis(pos.axisDirection) == Axis.vertical &&
                      pos.maxScrollExtent > 2) {
                    pos.jumpTo(pos.maxScrollExtent);
                    moved = true;
                  }
                }
                if (moved) {
                  await tester.pump();
                  snap('${entry.key}/end');
                }
                nav.currentState!.pop();
                await tester.pump();
                await tester.pump(const Duration(milliseconds: 250));
              } catch (e) {
                failures.add([locale, cycle, entry.key, e.toString()]);
                break;
              }
            }
          } catch (e) {
            failures.add([locale, cycle, 'root', e.toString()]);
          }
          final err = tester.takeException();
          if (err != null) {
            failures.add([locale, cycle, 'framework', err.toString()]);
          }
          await tester.pumpWidget(const SizedBox());
          account.dispose();
          linked.dispose();
          ai.dispose();
          store.dispose();
        }
      }
      output.closeSync();
      File('$dir/flutter-$tagName-gaps.json')
          .writeAsStringSync(jsonEncode(failures));
      debugDefaultTargetPlatformOverride = null;
      tester.platformDispatcher.clearAccessibilityFeaturesTestValue();
      semanticsHandle.dispose();
    }, timeout: const Timeout(Duration(minutes: 20)));
  }
}
