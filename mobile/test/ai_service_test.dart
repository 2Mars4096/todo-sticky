import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/services/ai_service.dart';
import 'package:sticky_todo/services/persistence.dart';

void main() {
  test('provider error includes real reason but redacts credentials', () async {
    final creds = MemoryCredentials()..values['openai'] = 'my-secret-key';
    final service = AiService(
      creds,
      client: MockClient(
        (request) async => http.Response(
          jsonEncode({
            'error': {'message': 'invalid my-secret-key'},
          }),
          401,
        ),
      ),
    );
    await expectLater(
      service.testConnection(Preferences(provider: 'openai')),
      throwsA(
        isA<AiException>().having(
          (e) => e.message,
          'message',
          allOf(contains('HTTP 401'), isNot(contains('my-secret-key'))),
        ),
      ),
    );
  });
  test(
    'valid connection with malformed model JSON does not blame settings',
    () async {
      final creds = MemoryCredentials()..values['openai'] = 'key';
      final service = AiService(
        creds,
        client: MockClient(
          (_) async => http.Response(
            jsonEncode({
              'choices': [
                {
                  'message': {'content': 'I cannot return JSON'},
                },
              ],
            }),
            200,
          ),
        ),
      );
      await expectLater(
        service.testConnection(Preferences(provider: 'openai')),
        throwsA(
          isA<AiException>().having(
            (e) => e.message,
            'message',
            contains('connection worked'),
          ),
        ),
      );
    },
  );
  test(
    'plan parser orders blocks, rejects overlap and unselected machines',
    () {
      final tasks = [DatedTask('2026-10-24', Task(id: 'a', text: 'A'))];
      Map<String, dynamic> block(
        String start,
        String end, [
        String who = 'human',
      ]) => {
        'taskId': '2026-10-24/a',
        'time': start,
        'endTime': end,
        'action': 'Write',
        'assignedTo': who,
      };
      DayPlan parse(List<Map<String, dynamic>> blocks) =>
          AiService.validatePlan(
            {'schedule': blocks},
            tasks,
            '2026-10-24',
            '09:00',
            '12:00',
            [],
            'fingerprint',
          );
      final valid = parse([block('10:00', '11:00'), block('09:00', '10:00')]);
      expect(valid.blocks.first.time, '09:00');
      expect(
        () => parse([block('09:00', '10:30'), block('10:00', '11:00')]),
        throwsA(isA<AiException>()),
      );
      expect(
        () => parse([block('09:00', '10:00', 'unknown')]),
        throwsA(isA<AiException>()),
      );
      expect(
        () => parse([block('08:30', '10:00')]),
        throwsA(isA<AiException>()),
      );
    },
  );
}
