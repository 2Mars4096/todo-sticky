import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/screens/albums_screen.dart';
import 'package:sticky_todo/services/ai_service.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

void main() {
  test('shared provider uses the account callback, not a direct provider or API key', () async {
    final calls = <String>[];
    final ai = AiService(
      MemoryCredentials(),
      client: MockClient((_) async {
        fail('Direct HTTP must not run');
      }),
      sharedRequest: (action, input) async {
        calls.add(action);
        if (action == 'breakdown') {
          return {
            'finishSuggestion': 'Reviewed',
            'subtasks': [
              {'text': 'Read the source'},
            ],
          };
        }
        if (action == 'project') {
          return {
            'steps': ['Read evidence', 'Write findings'],
          };
        }
        if (action == 'albums') {
          return {
            'summary': 'Quiet',
            'albums': [
              {
                'title': 'Album',
                'artist': 'Artist',
                'fit': 'Sparse',
                'bestFor': 'Reading',
              },
            ],
          };
        }
        throw StateError('Unexpected action');
      },
    );
    final prefs = Preferences(provider: 'diane');
    final result = await ai.breakdown(
      prefs,
      Task(id: 'task', text: 'Write a note'),
    );
    expect(result.steps, ['Read the source']);
    final goal = await ai.planGoal(
      prefs,
      GoalItem(id: 'goal', text: 'Finish research'),
    );
    expect(goal, ['Read evidence', 'Write findings']);
    final albums = await ai.albums(prefs, [
      DatedTask('2026-11-10', Task(id: 'task', text: 'Read')),
    ]);
    expect(albums.single['title'], 'Album');
    expect(calls, ['breakdown', 'project', 'albums']);
    ai.dispose();
  });
  test(
    'album retries send recent picks and discard repeat artists or albums',
    () async {
      final recent = [
        {'artist': 'Artist A', 'title': 'First'},
      ];
      Map<String, dynamic> album(String artist, String title) => {
        'artist': artist,
        'title': title,
        'fit': 'Sparse piano',
        'bestFor': 'Quiet focus',
      };
      final repeated = album(' artist  a ', 'FIRST');
      final fresh = album('Artist B', 'Second');
      var candidates = [repeated, fresh, album('artist b', 'Third')];
      final ai = AiService(
        MemoryCredentials(),
        sharedRequest: (action, input) async {
          expect(action, 'albums');
          expect(input['excludeAlbums'], recent);
          expect(input['curation'], contains('four distinct artists'));
          expect(input['tasks'], [
            {
              'text': 'Read',
              'status': 'todo',
              'steps': [
                {'text': 'Review appendix', 'status': 'todo'},
              ],
            },
          ]);
          return {'albums': candidates};
        },
      );
      addTearDown(ai.dispose);
      final prefs = Preferences(provider: 'diane');
      final tasks = [
        DatedTask(
          '2026-11-10',
          Task(
            text: 'Read',
            subtasks: [
              Task(text: 'Review appendix'),
              Task(text: 'Find appendix', status: TaskStatus.done),
            ],
          ),
        ),
      ];
      expect(await ai.albums(prefs, tasks, excludeAlbums: recent), [fresh]);
      candidates = [repeated];
      await expectLater(
        ai.albums(prefs, tasks, excludeAlbums: recent),
        throwsA(isA<AiException>()),
      );
    },
  );

  for (final platform in [TargetPlatform.android, TargetPlatform.iOS]) {
    testWidgets('Music keeps the previous album after a repeat on $platform', (
      tester,
    ) async {
      final credentials = MemoryCredentials();
      final store = StickyStore(
        persistence: MemoryPersistence(),
        credentials: credentials,
      );
      await store.initialize();
      store.preferences = Preferences(provider: 'diane');
      store.addTask('Read the proposal');
      final requests = <Map<String, dynamic>>[];
      final ai = AiService(
        credentials,
        sharedRequest: (_, input) async {
          final excluded = List.of(input['excludeAlbums'] as List);
          requests.add({...input, 'excludeAlbums': excluded});
          return {
            'albums': [
              {
                'title': requests.length < 3 ? 'First album' : 'Second album',
                'artist': 'Artist',
                'fit': 'Sparse piano',
                'bestFor': 'Quiet focus',
              },
            ],
          };
        },
      );
      addTearDown(ai.dispose);
      addTearDown(store.dispose);
      await tester.pumpWidget(
        MaterialApp(
          theme: ThemeData(platform: platform),
          home: AlbumsScreen(store: store, ai: ai),
        ),
      );
      await tester.tap(find.text('Suggest albums'));
      await tester.pumpAndSettle();
      expect(find.text('First album'), findsOneWidget);
      await tester.tap(find.text('Suggest more'));
      await tester.pumpAndSettle();
      expect(
        find.text('The AI provider returned no album recommendations'),
        findsOneWidget,
      );
      expect(find.text('First album'), findsOneWidget);
      await tester.tap(find.text('Suggest more'));
      await tester.pumpAndSettle();
      expect(find.text('First album'), findsNothing);
      expect(find.text('Second album'), findsOneWidget);
      expect(requests[0]['excludeAlbums'], isEmpty);
      expect(requests[1]['excludeAlbums'], [
        {'artist': 'Artist', 'title': 'First album'},
      ]);
      expect(requests[2]['excludeAlbums'], requests[1]['excludeAlbums']);
    });
  }

  test('a disconnected OpenRouter profile uses the account callback even with an old device key', () async {
    final ai = AiService(
      MemoryCredentials()..values['openrouter'] = 'fixture-old',
      client: MockClient(
        (_) async => fail('Device credential must not be used'),
      ),
      sharedRequest: (action, input) async => {
        'subtasks': [
          {'text': 'Account result'},
        ],
      },
    );
    final result = await ai.breakdown(
      Preferences(provider: 'openrouter'),
      Task(id: 'one', text: 'Synthetic task'),
    );
    expect(result.steps, ['Account result']);
    ai.dispose();
  });
  test('legacy provider preferences remain explicit; fresh profiles can choose shared default', () {
    expect(
      Preferences.fromJson({'provider': 'openrouter'}).providerChosen,
      true,
    );
    expect(Preferences().providerChosen, false);
    expect(Preferences.fromJson(Preferences().toJson()).providerChosen, false);
  });
  test(
    'shared mode never silently falls back when account bridge is absent',
    () async {
      final ai = AiService(
        MemoryCredentials(),
        client: MockClient((_) async {
          fail('No fallback');
        }),
      );
      await expectLater(
        ai.testConnection(Preferences(provider: 'diane')),
        throwsA(isA<AiException>()),
      );
      ai.dispose();
    },
  );
}
