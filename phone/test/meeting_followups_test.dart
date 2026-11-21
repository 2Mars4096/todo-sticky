import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/widgets/meeting_followups.dart';

void main() {
  testWidgets(
    'keeps selections when older reviews append and submits the selected steps',
    (tester) async {
      final row = {
        'meeting_id': 'm',
        'analysis_id': 'a',
        'title': 'Planning',
        'count': 3,
        'indices': [0, 1, 2],
        'sequence': 2,
      };
      final calls = <Map<String, dynamic>>[];
      Future<Map<String, dynamic>> request(
        String path, [
        Map<String, dynamic>? body,
      ]) async {
        if (path.endsWith('/refresh')) {
          return {
            'head': 2,
            'before': 2,
            'reviews': [row],
          };
        }
        if (path.contains('before=')) {
          return {
            'before': null,
            'reviews': [
              {
                ...row,
                'meeting_id': 'old',
                'title': 'Older meeting',
                'analysis_id': 'b',
              },
            ],
          };
        }
        if (body != null) {
          calls.add(body);
          return {
            'source_revision': 1,
            'records': [
              {'record_type': 'task', 'record_id': 'canonical'},
            ],
          };
        }
        return {
          'analysis_id': 'a',
          'analysis_fingerprint': 'digest',
          'transcript_revision': 1,
          'actions': [
            for (final text in ['First step', 'Second step', 'Third step'])
              {
                'text': text,
                'evidence': [
                  {'quote': 'Source passage'},
                ],
              },
          ],
        };
      }

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: SingleChildScrollView(
              child: MeetingFollowups(request: request, onAdded: () {}),
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();
      Future<void> tap(String text) async {
        final target = find.text(text).last;
        await tester.ensureVisible(target);
        await tester.tap(target);
        await tester.pumpAndSettle();
      }

      await tap('Meeting follow-ups');
      await tap('Planning');
      await tap('First step');
      await tap('Third step');
      await tap('Older reviews');
      expect(find.text('Older meeting'), findsOneWidget);
      await tap('Add 2 to today');
      expect((calls.single['actions'] as List).map((v) => v['index']), [0, 2]);
      await tap('Clear all suggestions');
      await tap('Cancel');
      expect(calls, hasLength(1));
      final trash = find.byTooltip('Dismiss follow-ups: Planning');
      await tester.ensureVisible(trash);
      await tester.tap(trash);
      await tester.pumpAndSettle();
      expect(calls.last, {'through': 2, 'meeting_id': 'm'});
      expect(find.text('Planning'), findsNothing);
      expect(find.text('Older meeting'), findsOneWidget);
      await tap('Clear all suggestions');
      await tap('Clear suggestions');
      expect(calls.last, {'through': 2});
      expect(find.text('Planning'), findsNothing);
      expect(find.text('Older meeting'), findsNothing);
      await tester.pumpWidget(const SizedBox());
    },
  );
}
