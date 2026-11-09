import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/services/ai_service.dart';
import 'package:sticky_todo/services/persistence.dart';

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
