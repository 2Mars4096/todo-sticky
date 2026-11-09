import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:sticky_todo/services/cloud_sync.dart';

void main() {
  test('task links carry only canonical identity on approved origins', () {
    expect(parseTodoTaskLink('todo-sticky://task/abc-123'), 'abc-123');
    expect(
      parseTodoTaskLink('$dianeSharedOrigin/apps/todo/tasks/abc-123'),
      'abc-123',
    );
    for (final bad in [
      'todo-sticky://account-return',
      'todo-sticky://task/a/b',
      'todo-sticky://task/a?token=secret',
      'https://other.example/apps/todo/tasks/a',
      'file:///etc/passwd',
    ]) {
      expect(parseTodoTaskLink(bad), isNull);
    }
  });

  const old = 'sticky-todo-20261028:old-user';
  const next = 'dear-diane-202610:new-user';
  const source = 'account:$old:https://old.example';
  const target = 'account:$next:$dianeSharedOrigin';
  Map<String, dynamic> identity() => {
    'owner': 'new-user',
    'appId': 'todo',
    'legacyAccounts': [
      {
        'appId': 'todo',
        'projectId': 'sticky-todo-20261028',
        'owner': 'old-user',
      },
    ],
  };
  Map<String, dynamic> metadata() => {
    'owner': old,
    source: {
      'enabled': true,
      'baseline': {
        'day:2026-11-09': {
          'revision': 73,
          'payload': {'date': '2026-11-09', 'tasks': []},
          'deleted': false,
        },
      },
      'pending': {
        'day:2026-11-09': {
          'id': 'stable-offline-mutation',
          'expectedRevision': 73,
        },
      },
      'conflicts': [
        {'saved': 'keep'},
      ],
    },
    'unrelated': 'retain',
  };
  Map<String, dynamic> migrate(
    Map<String, dynamic> value, {
    Map<String, dynamic>? proof,
    String origin = dianeSharedOrigin,
  }) => verifiedSharedOwnerMigration(
    value,
    origin: origin,
    projectId: 'dear-diane-202610',
    uid: 'new-user',
    identity: proof ?? identity(),
  );
  test('selects central config only for the known shared origin', () {
    expect(
      accountConfigurationUri(dianeSharedOrigin).path,
      '/api/connected-apps/config',
    );
    expect(
      accountConfigurationUri(dianeSharedOrigin).queryParameters['appId'],
      'todo',
    );
    expect(accountConfigurationUri('https://old.example').path, '/v1/config');
  });
  test('verified migration preserves acknowledged baselines, pending mutations and old keys', () {
    final before = metadata(), encoded = jsonEncode(metadata());
    final updates = migrate(before);
    expect(jsonEncode(before), encoded);
    expect(updates['owner'], next);
    expect(updates[target], before[source]);
    before.addAll(updates);
    expect(before[source], updates[target]);
    expect(before['unrelated'], 'retain');
    expect(migrate(before), isEmpty);
  });
  test('requires issuer-bound app aliases, not email or an unbound UID', () {
    for (final proof in [
      {
        'owner': 'new-user',
        'appId': 'todo',
        'legacyOwnerIds': ['old-user'],
      },
      {
        'owner': 'new-user',
        'appId': 'todo',
        'legacyAccounts': [
          {'appId': 'todo', 'projectId': 'different', 'owner': 'old-user'},
        ],
      },
      {
        'owner': 'wrong-user',
        'appId': 'todo',
        'legacyAccounts': identity()['legacyAccounts'],
      },
    ]) {
      expect(() => migrate(metadata(), proof: proof), throwsStateError);
    }
    expect(
      () => migrate(metadata(), origin: 'https://untrusted.example'),
      throwsStateError,
    );
  });
  test(
    'ambiguous histories or existing different target refuse without mutation',
    () {
      final ambiguous = metadata();
      ambiguous['account:$old:https://other.example'] = {
        'enabled': false,
        'baseline': {},
        'pending': {},
        'conflicts': [],
      };
      final before = jsonEncode(ambiguous);
      expect(() => migrate(ambiguous), throwsStateError);
      expect(jsonEncode(ambiguous), before);
      final different = metadata();
      different[target] = {
        'enabled': false,
        'baseline': {},
        'pending': {},
        'conflicts': [],
      };
      expect(() => migrate(different), throwsStateError);
    },
  );
}
