import 'dart:async';
import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:sticky_todo/models/models.dart';
import 'package:sticky_todo/services/cloud_sync.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

const origin = 'https://sync.example.test';
const project = 'sticky-project';
const uid = 'google-user';
const date = '2026-10-24';
const dayKey = 'day:$date';
const metadataKey = 'account:$project:$uid:$origin';

String idToken({
  String user = uid,
  String audience = project,
  String tag = 'old',
}) {
  String encode(Object value) =>
      base64UrlEncode(utf8.encode(jsonEncode(value))).replaceAll('=', '');
  return '${encode({'alg': 'RS256', 'typ': 'JWT'})}.${encode({'aud': audience, 'iss': 'https://securetoken.google.com/$audience', 'sub': user, 'user_id': user, 'email': 'person@example.test', 'email_verified': true, 'exp': DateTime.now().millisecondsSinceEpoch ~/ 1000 + 3600, 'tag': tag})}.test-signature';
}

AccountSession account({bool expired = false}) => AccountSession(
  origin: origin,
  projectId: project,
  apiKey: 'firebase-web-api-key',
  uid: uid,
  email: 'person@example.test',
  idToken: idToken(),
  refreshToken: 'private-refresh-token',
  expiresAt:
      DateTime.now().millisecondsSinceEpoch + (expired ? -1000 : 3600000),
);

Map<String, dynamic> day(String text, {String id = 'task-1'}) => {
  'date': date,
  'tasks': [Task(id: id, text: text).toJson()],
};

Map<String, dynamic> goals([String? text]) => {
  'targets': text == null ? [] : [GoalItem(id: 'goal-1', text: text).toJson()],
  'recurring': <dynamic>[],
};

SyncRecord record(
  String key,
  Map<String, dynamic>? payload, {
  int revision = 1,
}) => SyncRecord(
  key: key,
  revision: revision,
  deleted: payload == null,
  payload: payload,
  mutationId: 'server-mutation-$revision',
  updatedAt: '2026-10-24T10:00:00Z',
);

http.Response jsonResponse(Object value, {int status = 200}) => http.Response(
  jsonEncode(value),
  status,
  headers: {'content-type': 'application/json'},
);

http.Response page(List<SyncRecord> records, {String? cursor}) => jsonResponse({
  'schemaVersion': 1,
  'records': records.map((r) => r.toJson()).toList(),
  'nextCursor': cursor,
});

Map<String, dynamic> config() => {
  'schemaVersion': 1,
  'firebase': {
    'apiKey': 'firebase-web-api-key',
    'projectId': project,
    'authDomain': '$project.firebaseapp.com',
    'appId': '1:1234567890:web:abc',
  },
};

http.Response firebaseResponse(
  http.Request request, {
  bool omitLocalId = true,
}) {
  if (request.url.path == '/v1/config') return jsonResponse(config());
  if (request.url.path == '/v1/auth/exchange') {
    return jsonResponse({'customToken': 'one-use-custom-token'});
  }
  if (request.url.path.endsWith('accounts:signInWithCustomToken')) {
    // Google's documented response does not contain a localId field.
    return jsonResponse({
      'idToken': idToken(tag: 'signin'),
      'refreshToken': 'private-new-refresh-token',
      'expiresIn': '3600',
      'isNewUser': false,
      if (!omitLocalId) 'localId': uid,
    });
  }
  if (request.url.path.endsWith('accounts:lookup')) {
    return jsonResponse({
      'users': [
        {
          'localId': uid,
          'email': 'person@example.test',
          'emailVerified': true,
          'providerUserInfo': [
            {'providerId': 'google.com'},
          ],
        },
      ],
    });
  }
  throw StateError('Unexpected request ${request.method} ${request.url}');
}

class Rig {
  final StickyStore store;
  final CloudSyncController sync;
  final CredentialStore credentials;
  Rig(this.store, this.sync, this.credentials);
  Map<String, dynamic> get meta => object(store.syncMetadata[metadataKey]);
  void dispose() {
    sync.dispose();
    store.dispose();
  }
}

class HeldCredentials extends MemoryCredentials {
  final started = Completer<void>();
  final release = Completer<void>();
  bool holdNext = true;
  @override
  Future<void> write(String provider, String value) async {
    if (holdNext &&
        provider == CloudSyncController.sessionKey &&
        value.isNotEmpty) {
      holdNext = false;
      started.complete();
      await release.future;
    }
    await super.write(provider, value);
  }
}

Future<Rig> fixture(
  FutureOr<http.Response> Function(http.Request) respond, {
  bool signedIn = true,
  bool expired = false,
  String? owner = '$project:$uid',
  Map<String, Map<String, dynamic>> local = const {},
  Map<String, dynamic> baseline = const {},
  CredentialStore? credentials,
  Future<bool> Function(Uri)? openBrowser,
  bool Function()? isEditing,
  Map<String, dynamic>? serviceConfig,
}) async {
  final secure = credentials ?? MemoryCredentials();
  if (signedIn) {
    await secure.write(
      CloudSyncController.sessionKey,
      jsonEncode(account(expired: expired).toJson()),
    );
  }
  final store = StickyStore(
    persistence: MemoryPersistence(),
    credentials: secure,
  );
  await store.initialize();
  for (final entry in local.entries) {
    await store.applySyncRecord(entry.key, entry.value);
  }
  store.syncMetadata = {
    'serviceOrigin': origin,
    'owner': ?owner,
    metadataKey: {
      'enabled': signedIn,
      'baseline': baseline,
      'pending': <String, dynamic>{},
      'conflicts': <dynamic>[],
    },
  };
  store.changed();
  await store.flush();
  final sync = CloudSyncController(
    store: store,
    transport: CloudTransport(
      client: MockClient((request) async {
        if (signedIn && request.url.path == '/v1/config') {
          return jsonResponse(serviceConfig ?? config());
        }
        return await respond(request);
      }),
    ),
    openBrowser: openBrowser ?? (_) async => true,
    isEditing: isEditing,
    pollInterval: Duration.zero,
  );
  await sync.initialize();
  return Rig(store, sync, secure);
}

void main() {
  test('legacy sync upgrade preserves pending edits and previously hidden goal metadata', () async {
    final oldGoal = goals('Original goal');
    final localGoal = goals('My edited goal');
    final remoteGoal = goals('Original goal');
    (remoteGoal['targets'] as List).single['plan'] = [
      {'id': 'task-1', 'text': 'Original work'},
    ];
    final oldDay = day('Original work');
    final remoteDay = day('Original work');
    (remoteDay['tasks'] as List).single.addAll({
      'goalId': 'goal-1',
      'goalStepId': 'task-1',
    });
    final pushed = <String, Map<String, dynamic>>{};
    final rig = await fixture(
      (request) async {
        if (request.method == 'GET') {
          return jsonResponse({
            'schemaVersion': 1,
            'payloadSchemaVersion': 2,
            'records': [
              record('goals', remoteGoal).toJson(),
              record(dayKey, remoteDay).toJson(),
            ],
            'nextCursor': null,
          });
        }
        final body = object(jsonDecode(request.body));
        final key = Uri.decodeComponent(request.url.pathSegments.last);
        pushed[key] = object(body['payload']);
        return jsonResponse(
          record(key, object(body['payload']), revision: 2).toJson(),
        );
      },
      local: {'goals': localGoal, dayKey: day('My edited work')},
      baseline: {
        'goals': record('goals', oldGoal).baseline,
        dayKey: record(dayKey, oldDay).baseline,
      },
      serviceConfig: {
        ...config(),
        'goalPlanning': true,
        'payloadSchemaVersions': [1, 2],
      },
    );
    addTearDown(rig.dispose);
    await rig.sync.synchronize();
    expect(rig.sync.error, isNull);
    expect(rig.store.goals.targets.single.text, 'My edited goal');
    expect(rig.store.goals.targets.single.plan.single.id, 'task-1');
    expect(rig.store.tasksFor(date).single.text, 'My edited work');
    expect(rig.store.tasksFor(date).single.goalId, 'goal-1');
    expect((pushed[dayKey]!['tasks'] as List).single['goalStepId'], 'task-1');
    expect(object(rig.meta['baseline'])['goals']['payloadSchemaVersion'], 2);
  });

  test('metadata upgrade respects deletions, known removals and newer cloud revisions', () {
    final remote = day('Old');
    (remote['tasks'] as List).single['goalId'] = 'goal-1';
    final original = day('Old');
    final knownBase = record(dayKey, remote).baseline;
    final removed = migrateGoalMetadata(
      day('Edited'),
      record(dayKey, remote),
      knownBase,
    )!;
    expect(
      (removed.local!['tasks'] as List).single.containsKey('goalId'),
      false,
    );
    final gone = migrateGoalMetadata(
      {'date': date, 'tasks': []},
      record(dayKey, remote),
      record(dayKey, original).baseline,
    )!;
    expect(gone.local!['tasks'], isEmpty);
    expect(
      migrateGoalMetadata(
        day('Edited'),
        record(dayKey, remote, revision: 2),
        record(dayKey, original).baseline,
      ),
      isNull,
    );
    final v2Base = {...knownBase, 'payloadSchemaVersion': 2};
    expect(
      migrateGoalMetadata(day('Edited'), record(dayKey, remote), v2Base),
      isNull,
    );
  });

  test('old services cannot strip a local goal plan or its baseline', () async {
    final linked = goals('Research')
      ..['targets'][0]['plan'] = [
        {'id': 'step-1', 'text': 'Read one paper'},
      ];
    var syncRequests = 0;
    final rig = await fixture((request) async {
      syncRequests++;
      return page([]);
    }, local: {'goals': linked});
    addTearDown(rig.dispose);
    await rig.sync.synchronize();
    expect(rig.sync.error, contains('goal-planning update'));
    expect(syncRequests, 0);
    expect(rig.store.goals.targets.single.plan.single.id, 'step-1');
    expect(rig.store.saveError, isNull);
  });

  test(
    'goal-aware sync negotiates reads and acknowledges complete metadata',
    () async {
      final linked = goals('Research')
        ..['targets'][0]['plan'] = [
          {'id': 'step-1', 'text': 'Read one paper'},
        ];
      final dated = day('Read one paper', id: 'step-1');
      (dated['tasks'] as List).single.addAll({
        'goalId': 'goal-1',
        'goalStepId': 'step-1',
      });
      final pushed = <String>{};
      final rig = await fixture(
        (request) async {
          if (request.method == 'GET') {
            expect(request.url.queryParameters['schemaVersion'], '2');
            return jsonResponse({
              'schemaVersion': 1,
              'payloadSchemaVersion': 2,
              'records': <dynamic>[],
              'nextCursor': null,
            });
          }
          final body = object(jsonDecode(request.body));
          expect(body['schemaVersion'], 2);
          final key = Uri.decodeComponent(request.url.pathSegments.last);
          pushed.add(key);
          return jsonResponse(record(key, object(body['payload'])).toJson());
        },
        local: {'goals': linked, dayKey: dated},
        serviceConfig: {
          ...config(),
          'goalPlanning': true,
          'payloadSchemaVersions': [1, 2],
        },
      );
      addTearDown(rig.dispose);
      await rig.sync.synchronize();
      expect(rig.sync.error, isNull);
      expect(pushed, {'goals', dayKey});
      expect(rig.sync.upToDate, true);
      expect(rig.store.tasksFor(date).single.goalStepId, 'step-1');
    },
  );

  test(
    'downgraded goal-aware response is rejected before local replacement',
    () async {
      final rig = await fixture(
        (request) async => page([record(dayKey, day('Cloud'))]),
        local: {dayKey: day('Keep local')},
        serviceConfig: {
          ...config(),
          'payloadSchemaVersions': [1, 2],
          'goalPlanning': true,
        },
      );
      addTearDown(rig.dispose);
      await rig.sync.synchronize();
      expect(rig.sync.error, contains('goal-aware'));
      expect(rig.store.tasksFor(date).single.text, 'Keep local');
    },
  );

  test(
    'progress waits for upload acknowledgement and clears after completion',
    () async {
      final gate = Completer<void>();
      var first = true;
      final rig = await fixture((request) async {
        if (request.method == 'GET') return page([]);
        final body = object(jsonDecode(request.body));
        if (first) {
          first = false;
          await gate.future;
        }
        final key = Uri.decodeComponent(request.url.pathSegments.last);
        return jsonResponse(record(key, object(body['payload'])).toJson());
      }, local: {dayKey: day('')});
      final seen = <CloudSyncProgress>[];
      rig.sync.addListener(() {
        if (rig.sync.progress != null) seen.add(rig.sync.progress!);
      });
      final work = rig.sync.synchronize();
      await Future<void>.delayed(const Duration(milliseconds: 30));
      expect(rig.sync.progress?.stage, 'Uploading');
      expect(rig.sync.progress?.detail, date);
      expect(rig.sync.progress?.completed, 0);
      expect(rig.sync.progress?.total, 2);
      gate.complete();
      await work;
      expect(seen.map((p) => p.completed), containsAll([0, 1, 2]));
      expect(rig.sync.error, isNull);
      expect(rig.sync.progress, isNull);
      expect(rig.sync.busy, isFalse);
      expect(rig.sync.upToDate, isTrue);
      rig.store.addTask('New local edit');
      expect(rig.sync.upToDate, isFalse);
      await rig.store.flush();
      rig.sync.dispose();
      rig.store.dispose();
    },
  );
  test(
    'blank legacy titles survive download validation and application',
    () async {
      final rig = await fixture((request) {
        if (request.method == 'GET') return page([record(dayKey, day(''))]);
        final body = object(jsonDecode(request.body));
        return jsonResponse(record('goals', object(body['payload'])).toJson());
      });
      await rig.sync.synchronize();
      expect(rig.sync.error, isNull);
      expect(rig.store.tasksFor(date).single.text, '');
      rig.sync.dispose();
      rig.store.dispose();
    },
  );
  test(
    'failed upload reports its stage and date without counting it complete',
    () async {
      final rig = await fixture(
        (request) => request.method == 'GET'
            ? page([])
            : jsonResponse({'detail': 'Fixture rejected'}, status: 422),
        local: {dayKey: day('Local')},
      );
      final seen = <CloudSyncProgress>[];
      rig.sync.addListener(() {
        if (rig.sync.progress != null) seen.add(rig.sync.progress!);
      });
      await rig.sync.synchronize();
      expect(rig.sync.error, contains('Uploading ($date)'));
      expect(seen.every((p) => p.completed == 0), isTrue);
      expect(rig.sync.progress, isNull);
      rig.sync.dispose();
      rig.store.dispose();
    },
  );

  test('browser return resumes the same pending sign-in before consuming its handoff', () async {
    late Rig rig;
    Uri? opened;
    var exchanges = 0;
    rig = await fixture(
      (request) {
        if (request.url.path == '/v1/auth/exchange') exchanges++;
        return firebaseResponse(request);
      },
      signedIn: false,
      owner: null,
      openBrowser: (uri) async {
        opened = uri;
        rig.sync.setActive(false);
        return true;
      },
    );
    final pending = rig.sync.signIn();
    await Future<void>.delayed(const Duration(milliseconds: 30));
    expect(opened, isNotNull);
    expect(Uri.splitQueryString(opened!.fragment)['returnTo'], 'app');
    expect(exchanges, 0);
    expect(rig.sync.signingIn, isTrue);
    rig.sync.setActive(true);
    await pending;
    expect(exchanges, 1);
    expect(rig.sync.session?.uid, uid);
    expect(rig.sync.error, isNull);
    rig.sync.dispose();
    rig.store.dispose();
  });

  test('conflicts are saved once on detection and stale choices cannot replace notes', () async {
    var remote = record(dayKey, day('Cloud version'), revision: 2);
    final rig = await fixture(
      (request) {
        expect(request.method, 'GET');
        return page([remote, record('goals', goals())]);
      },
      local: {dayKey: day('Local version')},
      baseline: {dayKey: record(dayKey, day('Original')).baseline},
    );
    addTearDown(rig.dispose);
    await rig.sync.synchronize();
    final reviewed = syncConflictFingerprint(rig.sync.conflicts.single);
    expect((rig.meta['conflicts'] as List).length, 1);
    await rig.sync.synchronize();
    expect((rig.meta['conflicts'] as List).length, 1);
    remote = record(dayKey, day('Newer cloud edit'), revision: 3);
    await rig.sync.synchronize(
      resolveKey: dayKey,
      useCloud: true,
      reviewedFingerprint: reviewed,
    );
    expect(rig.sync.error, contains('Conflict changed'));
    expect(rig.store.tasksFor(date).single.text, 'Local version');
    expect((rig.meta['conflicts'] as List).length, 2);
    expect(rig.sync.conflicts.single.remote!.revision, 3);
  });

  group('three-way reconciliation', () {
    test(
      'first link preserves two independently edited versions as a conflict',
      () {
        final actions = reconcileRecords(
          {dayKey: day('Phone edit')},
          [record(dayKey, day('Desktop edit'))],
          {},
        );
        expect(actions.single.kind, SyncKind.conflict);
        expect(actions.single.local, day('Phone edit'));
        expect(actions.single.remote!.payload, day('Desktop edit'));
      },
    );

    test(
      'unchanged local pulls, unchanged remote pushes, and two edits conflict',
      () {
        final base = record(dayKey, day('Original'));
        expect(
          reconcileRecords(
            {dayKey: day('Original')},
            [record(dayKey, day('Remote'), revision: 2)],
            {dayKey: base.baseline},
          ).single.kind,
          SyncKind.pull,
        );
        expect(
          reconcileRecords({dayKey: day('Local')}, [base], {
            dayKey: base.baseline,
          }).single.kind,
          SyncKind.push,
        );
        expect(
          reconcileRecords(
            {dayKey: day('Local')},
            [record(dayKey, day('Remote'), revision: 2)],
            {dayKey: base.baseline},
          ).single.kind,
          SyncKind.conflict,
        );
      },
    );

    test(
      'empty day and tombstone agree without resurrecting an empty record',
      () {
        final actions = reconcileRecords(
          {
            dayKey: {'date': date, 'tasks': <dynamic>[]},
          },
          [record(dayKey, null, revision: 2)],
          {dayKey: record(dayKey, day('Original')).baseline},
        );
        expect(actions.single.kind, SyncKind.ack);
      },
    );

    test(
      'retained cloud focus records are not deleted by local archive pruning',
      () {
        final mission = <String, dynamic>{
          'id': 'mission-1',
          'taskText': 'Archived',
        };
        final cloud = record('focus:mission-1', mission, revision: 3);
        expect(
          reconcileRecords({}, [cloud], {'focus:mission-1': cloud.baseline}),
          isEmpty,
        );
        expect(
          reconcileRecords({}, [], {'focus:mission-1': cloud.baseline}),
          isEmpty,
        );
      },
    );
  });

  group('account and transport', () {
    test(
      'allows only service origins and never redirects bearer requests',
      () async {
        expect(syncOrigin('https://sync.example.test/'), origin);
        for (final invalid in [
          'http://remote.example.test',
          '$origin/path',
          '$origin?token=secret',
          'https://user:pass@sync.example.test',
          '$origin#section',
        ]) {
          expect(() => syncOrigin(invalid), throwsFormatException);
        }
        var sent = false;
        final transport = CloudTransport(
          client: MockClient((request) async {
            sent = true;
            expect(request.followRedirects, isFalse);
            expect(request.headers['authorization'], 'Bearer session-token');
            return jsonResponse({
              'detail': 'Redirect is not an authenticated API response',
            }, status: 302);
          }),
        );
        addTearDown(transport.close);
        await expectLater(
          transport.request(
            Uri.parse('$origin/v1/sync'),
            token: 'session-token',
          ),
          throwsA(isA<CloudFailure>()),
        );
        expect(sent, isTrue);
      },
    );

    test(
      'uses lookup UID when Google custom-token response omits localId',
      () async {
        Uri? browser;
        final rig = await fixture(
          (request) async => firebaseResponse(request),
          signedIn: false,
          owner: null,
          openBrowser: (uri) async {
            browser = uri;
            return true;
          },
        );
        addTearDown(rig.dispose);
        await rig.sync.signIn();
        expect(rig.sync.error, isNull);
        expect(rig.sync.session?.uid, uid);
        expect(rig.sync.enabled, isFalse);
        expect(browser?.origin, origin);
        expect(browser?.path, '/signin');
        expect(browser?.fragment, contains('challenge='));
        expect(browser.toString(), isNot(contains('private-')));
        expect(rig.store.exportJson(), isNot(contains('refreshToken')));
        expect(
          rig.store.toJson().toString(),
          isNot(contains('private-new-refresh-token')),
        );
        final saved = await rig.credentials.read(
          CloudSyncController.sessionKey,
        );
        expect(object(jsonDecode(saved!))['uid'], uid);
      },
    );

    test(
      'cancelling a pending config request does not open a stale sign-in tab',
      () async {
        final response = Completer<http.Response>();
        final requested = Completer<void>();
        var opened = 0;
        final rig = await fixture(
          (request) {
            requested.complete();
            return response.future;
          },
          signedIn: false,
          owner: null,
          openBrowser: (_) async {
            opened++;
            return true;
          },
        );
        addTearDown(rig.dispose);
        final signingIn = rig.sync.signIn();
        await requested.future;
        rig.sync.cancelSignIn();
        response.complete(jsonResponse(config()));
        await signingIn;
        expect(opened, 0);
        expect(rig.sync.session, isNull);
        expect(
          await rig.credentials.read(CloudSyncController.sessionKey),
          isNull,
        );
      },
    );

    test('refresh accepts Google numeric project_id and persists rotated credentials', () async {
      final calls = <String>[];
      final refreshedToken = idToken(tag: 'refreshed');
      final rig = await fixture((request) async {
        calls.add(request.url.host);
        if (request.url.host == 'securetoken.googleapis.com') {
          expect(request.bodyFields, {
            'grant_type': 'refresh_token',
            'refresh_token': 'private-refresh-token',
          });
          return jsonResponse({
            'user_id': uid,
            'project_id': '1234567890',
            'id_token': refreshedToken,
            'refresh_token': 'private-rotated-refresh-token',
            'expires_in': '3600',
            'token_type': 'Bearer',
          });
        }
        expect(request.headers['authorization'], 'Bearer $refreshedToken');
        return page([record('goals', goals())]);
      }, expired: true);
      addTearDown(rig.dispose);
      await rig.sync.synchronize();
      expect(rig.sync.error, isNull);
      expect(calls, ['securetoken.googleapis.com', 'sync.example.test']);
      final saved = object(
        jsonDecode(
          (await rig.credentials.read(CloudSyncController.sessionKey))!,
        ),
      );
      expect(saved['refreshToken'], 'private-rotated-refresh-token');
      expect(
        rig.store.exportJson(),
        isNot(contains('private-rotated-refresh-token')),
      );
    });

    test(
      'a refreshed UID mismatch cannot upload notes or replace credentials',
      () async {
        var calls = 0;
        final rig = await fixture((request) async {
          calls++;
          expect(request.url.host, 'securetoken.googleapis.com');
          return jsonResponse({
            'user_id': 'someone-else',
            'project_id': project,
            'id_token': idToken(user: 'someone-else'),
            'refresh_token': 'wrong-account-token',
            'expires_in': '3600',
          });
        }, expired: true);
        addTearDown(rig.dispose);
        final before = await rig.credentials.read(
          CloudSyncController.sessionKey,
        );
        await rig.sync.synchronize();
        expect(rig.sync.error, isNotNull);
        expect(calls, 1);
        expect(
          await rig.credentials.read(CloudSyncController.sessionKey),
          before,
        );
      },
    );

    test(
      'a notebook bound to another owner sends no authenticated sync requests',
      () async {
        var calls = 0;
        final rig = await fixture(
          (request) async {
            calls++;
            return page([]);
          },
          owner: 'other-project:other-user',
          local: {dayKey: day('Private note')},
        );
        addTearDown(rig.dispose);
        await rig.sync.synchronize();
        expect(rig.sync.error, isNotNull);
        expect(calls, 0);
        expect(rig.store.tasksFor(date).single.text, 'Private note');
        await expectLater(rig.sync.setEnabled(true), throwsStateError);
      },
    );

    test(
      'disposing during refresh does not persist a late replacement session',
      () async {
        final response = Completer<http.Response>();
        final started = Completer<void>();
        final rig = await fixture((request) {
          started.complete();
          return response.future;
        }, expired: true);
        final before = await rig.credentials.read(
          CloudSyncController.sessionKey,
        );
        final syncing = rig.sync.synchronize();
        await started.future;
        rig.sync.dispose();
        response.complete(
          jsonResponse({
            'user_id': uid,
            'project_id': project,
            'id_token': idToken(tag: 'late'),
            'refresh_token': 'late-refresh-token',
            'expires_in': '3600',
          }),
        );
        await syncing;
        expect(
          await rig.credentials.read(CloudSyncController.sessionKey),
          before,
        );
        rig.store.dispose();
      },
    );

    test(
      'cancelled credential writes cannot erase a newer completed sign-in',
      () async {
        final secure = HeldCredentials();
        final secondLookup = Completer<void>();
        var attempt = 0;
        final rig = await fixture(
          (request) async {
            if (request.url.path.endsWith('accounts:signInWithCustomToken')) {
              attempt++;
              return jsonResponse({
                'idToken': idToken(tag: 'attempt-$attempt'),
                'refreshToken': 'private-refresh-attempt-$attempt',
                'expiresIn': '3600',
              });
            }
            if (request.url.path.endsWith('accounts:lookup') && attempt == 2) {
              secondLookup.complete();
            }
            return firebaseResponse(request);
          },
          signedIn: false,
          owner: null,
          credentials: secure,
        );
        addTearDown(rig.dispose);
        final first = rig.sync.signIn();
        await secure.started.future;
        rig.sync.cancelSignIn();
        final second = rig.sync.signIn();
        await secondLookup.future;
        // Let the newer attempt reach secure storage while the earlier write is held.
        await Future<void>.delayed(Duration.zero);
        secure.release.complete();
        await Future.wait([first, second]);
        expect(rig.sync.error, isNull);
        expect(rig.sync.session?.refreshToken, 'private-refresh-attempt-2');
        final saved = object(
          jsonDecode((await secure.read(CloudSyncController.sessionKey))!),
        );
        expect(saved['refreshToken'], 'private-refresh-attempt-2');
        expect(rig.sync.signingIn, isFalse);
      },
    );
  });

  group('durable sync and incoming updates', () {
    test(
      'offline push keeps a durable mutation ID and reuses it on retry',
      () async {
        final mutations = <String>[];
        var fail = true;
        final rig = await fixture((request) async {
          if (request.method == 'GET') return page([record('goals', goals())]);
          final body = object(jsonDecode(request.body));
          mutations.add(body['mutationId'] as String);
          if (fail) throw http.ClientException('offline');
          return jsonResponse({
            ...record(dayKey, object(body['payload'])).toJson(),
            'mutationId': body['mutationId'],
          });
        }, local: {dayKey: day('Offline draft')});
        addTearDown(rig.dispose);
        await rig.sync.synchronize();
        expect(rig.sync.error, isNotNull);
        expect(object(rig.meta['pending']).containsKey(dayKey), isTrue);
        expect(object(rig.meta['baseline']).containsKey(dayKey), isFalse);
        expect(rig.store.tasksFor(date).single.text, 'Offline draft');
        fail = false;
        await rig.sync.synchronize();
        expect(rig.sync.error, isNull);
        expect(mutations.length, 2);
        expect(mutations[0], mutations[1]);
        expect(object(rig.meta['pending']).containsKey(dayKey), isFalse);
        expect(object(rig.meta['baseline'])[dayKey]['revision'], 1);
      },
    );

    test('conflict resolution preserves both versions before replacing a local day', () async {
      final remote = record(dayKey, day('Desktop changes'), revision: 2);
      final rig = await fixture(
        (request) async {
          expect(request.method, 'GET');
          return page([remote, record('goals', goals())]);
        },
        local: {dayKey: day('Phone changes')},
        baseline: {dayKey: record(dayKey, day('Original')).baseline},
      );
      addTearDown(rig.dispose);
      await rig.sync.synchronize();
      expect(rig.sync.conflicts.map((c) => c.key), [dayKey]);
      expect(rig.store.tasksFor(date).single.text, 'Phone changes');
      await rig.sync.synchronize(resolveKey: dayKey, useCloud: true);
      expect(rig.sync.error, isNull);
      expect(rig.store.tasksFor(date).single.text, 'Desktop changes');
      final saved = object((rig.meta['conflicts'] as List).single);
      expect(saved['local'], day('Phone changes'));
      expect(saved['remote'], remote.toJson());
      expect(rig.sync.exportRecovery(), contains('Phone changes'));
      expect(rig.sync.exportRecovery(), contains('Desktop changes'));
      expect(rig.sync.exportRecovery(), isNot(contains('refreshToken')));
    });

    test(
      'remote tombstone deletes an unchanged day and is not uploaded again',
      () async {
        var puts = 0;
        final original = record(dayKey, day('Remove remotely'));
        final rig = await fixture(
          (request) async {
            if (request.method == 'PUT') puts++;
            return page([
              record(dayKey, null, revision: 2),
              record('goals', goals()),
            ]);
          },
          local: {dayKey: original.payload!},
          baseline: {dayKey: original.baseline},
        );
        addTearDown(rig.dispose);
        await rig.sync.synchronize();
        expect(rig.sync.error, isNull);
        expect(rig.store.days.containsKey(date), isFalse);
        await rig.sync.synchronize();
        expect(puts, 0);
        expect(object(rig.meta['baseline'])[dayKey]['deleted'], isTrue);
      },
    );

    test(
      'malformed remote goals are rejected before clearing valid local goals',
      () async {
        final original = record('goals', goals('Keep this goal'));
        final rig = await fixture(
          (request) async => page([record('goals', {}, revision: 2)]),
          local: {'goals': original.payload!},
          baseline: {'goals': original.baseline},
        );
        addTearDown(rig.dispose);
        await rig.sync.synchronize();
        expect(rig.sync.error, isNotNull);
        expect(rig.store.goals.targets.single.text, 'Keep this goal');
        expect(object(rig.meta['baseline'])['goals']['revision'], 1);
      },
    );

    test('valid earlier records are not applied when a later downloaded record is invalid', () async {
      final rig = await fixture(
        (request) async => page([
          record(dayKey, day('This would be a valid incoming note')),
          record('goals', {'targets': <dynamic>[]}),
        ]),
      );
      addTearDown(rig.dispose);
      await rig.sync.synchronize();
      expect(rig.sync.error, isNotNull);
      expect(rig.store.tasksFor(date), isEmpty);
      expect(object(rig.meta['baseline']), isEmpty);
    });

    test(
      'an edit made while the download is pending survives the incoming day',
      () async {
        final started = Completer<void>();
        final response = Completer<http.Response>();
        final original = record(dayKey, day('Original'));
        final rig = await fixture(
          (request) {
            started.complete();
            return response.future;
          },
          local: {dayKey: original.payload!},
          baseline: {dayKey: original.baseline},
        );
        addTearDown(rig.dispose);
        final syncing = rig.sync.synchronize();
        await started.future;
        rig.store.addTask('Captured during sync', date: date);
        response.complete(
          page([
            record(dayKey, day('Remote change'), revision: 2),
            record('goals', goals()),
          ]),
        );
        await syncing;
        expect(rig.sync.error, isNotNull);
        expect(rig.store.tasksFor(date).map((t) => t.text), [
          'Original',
          'Captured during sync',
        ]);
        expect(object(rig.meta['baseline'])[dayKey]['revision'], 1);
      },
    );

    test(
      'active text editing defers the entire sync without network access',
      () async {
        var calls = 0;
        final rig = await fixture((request) async {
          calls++;
          return page([]);
        }, isEditing: () => true);
        addTearDown(rig.dispose);
        await rig.sync.synchronize();
        expect(calls, 0);
        expect(rig.sync.message, contains('editing'));
      },
    );

    test(
      'duplicate page records abort before any remote data is applied',
      () async {
        final remote = record(dayKey, day('Cloud note'));
        final rig = await fixture((request) async => page([remote, remote]));
        addTearDown(rig.dispose);
        await rig.sync.synchronize();
        expect(rig.sync.error, contains('duplicate'));
        expect(rig.store.tasksFor(date), isEmpty);
        expect(object(rig.meta['baseline']), isEmpty);
      },
    );
  });
}
