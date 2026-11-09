import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/services/cloud_sync.dart';

void main() {
  final cases = jsonDecode(
    File('../tests/fixtures/sync-merge.json').readAsStringSync(),
  ) as List;
  for (final raw in cases) {
    final c = Map<String, dynamic>.from(raw as Map);
    test(c['name'] as String, () {
      final before = canonicalJson(c);
      final result = mergeSyncPayload(
        c['key'] as String,
        c['ancestor'] as Map<String, dynamic>?,
        c['local'] as Map<String, dynamic>?,
        c['cloud'] as Map<String, dynamic>?,
        c['hasAncestor'] as bool,
        choices: (c['choices'] as Map?)?.cast<String, String>() ?? {},
      );
      expect(canonicalJson(result.payload), canonicalJson(c['expected']));
      expect(
        result.issues.map((issue) => issue.path).toList(),
        c['issuePaths'],
      );
      if (result.payload != null) {
        validateSyncPayload(c['key'] as String, result.payload!);
      }
      if (result.issues.isEmpty) {
        final reverse = mergeSyncPayload(
          c['key'] as String,
          c['ancestor'] as Map<String, dynamic>?,
          c['cloud'] as Map<String, dynamic>?,
          c['local'] as Map<String, dynamic>?,
          c['hasAncestor'] as bool,
        );
        expect(canonicalJson(reverse.payload), canonicalJson(result.payload));
      }
      expect(canonicalJson(c), before);
    });
  }
}
