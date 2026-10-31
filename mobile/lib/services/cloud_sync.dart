import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:crypto/crypto.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../models/models.dart';
import '../state/sticky_store.dart';

String canonicalJson(Object? value) {
  if (value is List) return '[${value.map(canonicalJson).join(',')}]';
  if (value is Map) {
    final keys = value.keys.cast<String>().toList()..sort();
    return '{${keys.map((key) => '${jsonEncode(key)}:${canonicalJson(value[key])}').join(',')}}';
  }
  return jsonEncode(value);
}

String syncOrigin(String value) {
  final uri = Uri.parse(value.trim());
  final local = ['localhost', '127.0.0.1', '::1'].contains(uri.host);
  if (!uri.hasAuthority ||
      uri.userInfo.isNotEmpty ||
      uri.hasQuery ||
      uri.hasFragment ||
      (uri.path.isNotEmpty && uri.path != '/') ||
      (uri.scheme != 'https' && !(uri.scheme == 'http' && local))) {
    throw const FormatException(
      'Enter the HTTPS service origin, such as https://sticky-sync.example.com.',
    );
  }
  return uri.origin;
}

class CloudFailure implements Exception {
  final int status;
  final String message;
  CloudFailure(this.status, this.message);
  @override
  String toString() => message;
}

class CloudTransport {
  final http.Client client;
  CloudTransport({http.Client? client}) : client = client ?? http.Client();
  Future<Map<String, dynamic>> request(
    Uri uri, {
    String method = 'GET',
    Map<String, dynamic>? body,
    Map<String, String>? form,
    String? token,
  }) async {
    final request = http.Request(method, uri)..followRedirects = false;
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    if (form != null) {
      request.bodyFields = form;
    } else if (body != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(body);
    }
    try {
      return await (() async {
        final response = await client.send(request);
        final bytes = <int>[];
        await for (final chunk in response.stream) {
          if (bytes.length + chunk.length > 16 * 1024 * 1024) {
            throw CloudFailure(
              413,
              'The service response is too large. No local notes were changed.',
            );
          }
          bytes.addAll(chunk);
        }
        Map<String, dynamic> data;
        try {
          data = object(jsonDecode(utf8.decode(bytes)));
        } catch (_) {
          throw CloudFailure(
            response.statusCode,
            'The service returned an unreadable response. Try again.',
          );
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          final detail = data['detail'];
          final message = response.statusCode == 409
              ? 'This note changed on another device. Sync again to review both versions.'
              : response.statusCode == 401
              ? 'Your account session expired. Sign in again.'
              : detail is String
              ? detail
              : 'The account request failed (${response.statusCode}). Try again.';
          throw CloudFailure(response.statusCode, message);
        }
        return data;
      })().timeout(const Duration(seconds: 25));
    } on TimeoutException {
      throw CloudFailure(
        408,
        'The account service took too long to respond. Your local notes are safe.',
      );
    } on http.ClientException {
      throw CloudFailure(
        0,
        'The account service is unreachable. Your notes remain available offline.',
      );
    }
  }

  void close() => client.close();
}

class SyncRecord {
  final String key;
  final int revision;
  final bool deleted;
  final Map<String, dynamic>? payload;
  final String mutationId;
  final String updatedAt;
  SyncRecord({
    required this.key,
    required this.revision,
    required this.deleted,
    required this.payload,
    required this.mutationId,
    required this.updatedAt,
  });
  factory SyncRecord.fromJson(Map<String, dynamic> j) {
    final key = j['key'];
    if (key is! String ||
        !RegExp(r'^(day:\d{4}-\d{2}-\d{2}|goals|focus:[A-Za-z0-9_-]{1,128})$')
            .hasMatch(key) ||
        j['revision'] is! int ||
        (j['revision'] as int) < 1 ||
        j['deleted'] is! bool ||
        (j['deleted'] == true ? j['payload'] != null : j['payload'] is! Map)) {
      throw const FormatException(
        'The service returned an invalid sync record.',
      );
    }
    if (key.startsWith('day:')) parseDate(key.substring(4));
    if (j['deleted'] != true) validateSyncPayload(key, object(j['payload']));
    return SyncRecord(
      key: key,
      revision: j['revision'] as int,
      deleted: j['deleted'] as bool,
      payload: j['payload'] == null ? null : object(j['payload']),
      mutationId: j['mutationId'] as String? ?? '',
      updatedAt: j['updatedAt'] as String? ?? '',
    );
  }
  Map<String, dynamic> toJson() => {
    'key': key,
    'revision': revision,
    'deleted': deleted,
    'payload': payload,
    'mutationId': mutationId,
    'updatedAt': updatedAt,
  };
  Map<String, dynamic> get baseline => {
    'revision': revision,
    'deleted': deleted,
    'payload': payload,
  };
}

/// Validate the entire download before any local record can be applied. Model
/// defaults are useful for local migrations but must not turn a partial remote
/// response into a request to erase a date or a goal list.
void validateSyncPayload(String key, Map<String, dynamic> payload) {
  Never invalid() => throw const FormatException(
    'The service returned an invalid note. No local data was changed.',
  );
  void fields(
    Map<String, dynamic> value,
    Set<String> required,
    Set<String> allowed,
  ) {
    if (!required.every(value.containsKey) ||
        value.keys.any((key) => !allowed.contains(key))) {
      invalid();
    }
  }

  bool id(Object? value) =>
      value is String && RegExp(r'^[A-Za-z0-9_-]{1,128}$').hasMatch(value);
  bool text(Object? value, {bool multiline = false, bool allowBlank = false}) =>
      value is String &&
      (allowBlank || value.trim().isNotEmpty) &&
      value.length <= 5000 &&
      (multiline || !RegExp(r'[\r\n]').hasMatch(value));
  void date(Object? value) {
    if (value is! String) invalid();
    parseDate(value);
  }

  if (utf8.encode(jsonEncode(payload)).length > 600000) invalid();
  if (key.startsWith('day:')) {
    fields(payload, {'date', 'tasks'}, {'date', 'tasks'});
    if (payload['date'] != key.substring(4)) invalid();
    date(payload['date']);
    final ids = <String>{};
    var count = 0;
    void tasks(Object? value, int depth) {
      if (value is! List || depth > 12) invalid();
      for (final raw in value) {
        final item = object(raw);
        fields(
          item,
          {'id', 'text', 'status', 'subtasks'},
          {
            'id',
            'text',
            'status',
            'subtasks',
            'finish',
            'goalId',
            'goalStepId',
          },
        );
        if (!id(item['id']) ||
            !ids.add(item['id'] as String) ||
            ++count > 2000 ||
            !text(item['text'], allowBlank: true, multiline: true) ||
            !TaskStatus.values.any((status) => status.name == item['status'])) {
          invalid();
        }
        if (item.containsKey('goalId') && !id(item['goalId'])) invalid();
        if (item.containsKey('goalStepId') &&
            (!id(item['goalStepId']) || !id(item['goalId']))) {
          invalid();
        }
        if (item['finish'] != null) {
          final finish = object(item['finish']);
          fields(finish, {}, {
            'doneWhen',
            'by',
            'originalBy',
            'deadlineChanges',
            'reviewReady',
          });
          if (finish.containsKey('doneWhen') &&
              (finish['doneWhen'] is! String ||
                  (finish['doneWhen'] as String).length > 5000)) {
            invalid();
          }
          for (final name in ['by', 'originalBy']) {
            if (finish.containsKey(name) && finish[name] != '') {
              date(finish[name]);
            }
          }
          if (finish.containsKey('reviewReady') &&
              finish['reviewReady'] is! bool) {
            invalid();
          }
          if (finish.containsKey('deadlineChanges')) {
            final changes = finish['deadlineChanges'];
            if (changes is! List || changes.length > 500) invalid();
            for (final rawChange in changes) {
              final change = object(rawChange);
              fields(change, {'from', 'to', 'at'}, {'from', 'to', 'at'});
              for (final name in ['from', 'to']) {
                if (change[name] != null) date(change[name]);
              }
              if (!text(change['at']) ||
                  (change['at'] as String).length > 100) {
                invalid();
              }
            }
          }
        }
        tasks(item['subtasks'], depth + 1);
      }
    }

    tasks(payload['tasks'], 0);
  } else if (key == 'goals') {
    fields(payload, {'targets', 'recurring'}, {'targets', 'recurring'});
    for (final name in ['targets', 'recurring']) {
      final items = payload[name];
      if (items is! List || items.length > 2000) invalid();
      final ids = <String>{};
      for (final raw in items) {
        final item = object(raw);
        fields(item, {'id', 'text', 'done'}, {'id', 'text', 'done', 'plan'});
        if (!id(item['id']) ||
            !ids.add(item['id'] as String) ||
            !text(item['text'], multiline: true) ||
            item['done'] is! bool) {
          invalid();
        }
        if (item.containsKey('plan')) {
          final plan = item['plan'];
          if (plan is! List || plan.length > 200) invalid();
          final stepIds = <String>{};
          for (final rawStep in plan) {
            final step = object(rawStep);
            fields(step, {'id', 'text'}, {'id', 'text'});
            if (!id(step['id']) ||
                !stepIds.add(step['id'] as String) ||
                !text(step['text'], multiline: true)) {
              invalid();
            }
          }
        }
      }
    }
  } else {
    const names = {
      'id',
      'taskId',
      'taskText',
      'durationMinutes',
      'completedAt',
      'vehicleCode',
      'orbitIndex',
      'orbitLabel',
    };
    fields(payload, names, names);
    if (!id(payload['id']) || payload['id'] != key.substring(6)) invalid();
    for (final name in ['taskId', 'taskText', 'vehicleCode', 'orbitLabel']) {
      if (!text(payload[name])) invalid();
    }
    for (final name in ['durationMinutes', 'completedAt', 'orbitIndex']) {
      final value = payload[name];
      if (value is! num ||
          !value.isFinite ||
          value < 0 ||
          value > 1000000000000000 ||
          value != value.roundToDouble()) {
        invalid();
      }
    }
  }
}

enum SyncKind { push, pull, ack, conflict }

class SyncAction {
  final String key;
  SyncKind kind;
  final Map<String, dynamic>? local;
  final SyncRecord? remote;
  SyncAction(this.key, this.kind, this.local, this.remote);
}

bool containsGoalMetadata(Object? value) {
  if (value is List) return value.any(containsGoalMetadata);
  if (value is! Map) return false;
  if (value.containsKey('goalId') ||
      value.containsKey('goalStepId') ||
      value.containsKey('plan')) {
    return true;
  }
  return value.values.any(containsGoalMetadata);
}

/// Restore fields a v1 client could never see, without overwriting its edits.
/// Equal revisions are essential: newer cloud edits still need normal conflict
/// review. Deleted items and fields the baseline already knew stay deleted.
({Map<String, dynamic>? local, Map<String, dynamic> baseline})?
migrateGoalMetadata(
  Map<String, dynamic>? local,
  SyncRecord remote,
  Map<String, dynamic>? baseline,
) {
  if (baseline == null ||
      baseline['payloadSchemaVersion'] == 2 ||
      baseline['revision'] != remote.revision ||
      baseline['deleted'] == true ||
      remote.deleted ||
      baseline['payload'] is! Map ||
      remote.payload == null) {
    return null;
  }
  final previous = object(baseline['payload']);
  Map<String, dynamic> restore(Map<String, dynamic> candidate) {
    final copy = object(jsonDecode(jsonEncode(candidate)));
    void restoreItems(
      List<dynamic> items,
      List<dynamic> cloud,
      List<dynamic> old, {
      required bool tasks,
    }) {
      Map<String, Map<String, dynamic>> index(List<dynamic> values) {
        final result = <String, Map<String, dynamic>>{};
        void visit(List<dynamic> list) {
          for (final item in list.whereType<Map>()) {
            if (item['id'] is String) {
              result[item['id'] as String] = object(item);
            }
            if (tasks && item['subtasks'] is List) {
              visit(item['subtasks'] as List);
            }
          }
        }

        visit(values);
        return result;
      }

      final cloudById = index(cloud), oldById = index(old);
      void visit(List<dynamic> list) {
        for (final raw in list.whereType<Map>()) {
          final source = cloudById[raw['id']], known = oldById[raw['id']];
          if (source != null && known != null) {
            for (final field in tasks ? ['goalId', 'goalStepId'] : ['plan']) {
              if (!raw.containsKey(field) &&
                  !known.containsKey(field) &&
                  source.containsKey(field) &&
                  (field != 'goalStepId' ||
                      raw['goalId'] == source['goalId'])) {
                raw[field] = jsonDecode(jsonEncode(source[field]));
              }
            }
          }
          if (tasks && raw['subtasks'] is List) visit(raw['subtasks'] as List);
        }
      }

      visit(items);
    }

    if (remote.key.startsWith('day:')) {
      restoreItems(
        copy['tasks'] as List,
        remote.payload!['tasks'] as List,
        previous['tasks'] as List,
        tasks: true,
      );
    } else if (remote.key == 'goals') {
      for (final category in ['targets', 'recurring']) {
        restoreItems(
          copy[category] as List,
          remote.payload![category] as List,
          previous[category] as List,
          tasks: false,
        );
      }
    }
    return copy;
  }

  return (
    local: local == null ? null : restore(local),
    baseline: {
      ...baseline,
      'payload': restore(previous),
      'payloadSchemaVersion': 2,
    },
  );
}

bool emptyRecord(String key, Map<String, dynamic>? payload) {
  if (payload == null) return true;
  if (key.startsWith('day:')) {
    return payload['tasks'] is List && (payload['tasks'] as List).isEmpty;
  }
  if (key == 'goals') {
    return payload['targets'] is List &&
        payload['recurring'] is List &&
        (payload['targets'] as List).isEmpty &&
        (payload['recurring'] as List).isEmpty;
  }
  return false;
}

List<SyncAction> reconcileRecords(
  Map<String, Map<String, dynamic>> local,
  List<SyncRecord> cloud,
  Map<String, dynamic> baseline,
) {
  final remote = {for (final record in cloud) record.key: record};
  final keys = {...local.keys, ...remote.keys, ...baseline.keys}.toList()
    ..sort();
  final actions = <SyncAction>[];
  for (final key in keys) {
    final left = local[key];
    final record = remote[key];
    final right = record?.deleted == true ? null : record?.payload;
    final base = baseline[key] == null ? null : object(baseline[key]);
    if (key.startsWith('focus:') &&
        left == null &&
        base != null &&
        canonicalJson(base['payload']) == canonicalJson(right)) {
      continue;
    }
    SyncKind kind;
    if (canonicalJson(left) == canonicalJson(right) ||
        (emptyRecord(key, left) && record?.deleted == true)) {
      kind = SyncKind.ack;
    } else if (base == null) {
      kind = emptyRecord(key, left) && record != null
          ? SyncKind.pull
          : record == null
          ? SyncKind.push
          : SyncKind.conflict;
    } else if (record == null && (base['revision'] as int) > 0) {
      kind = SyncKind.conflict;
    } else if (canonicalJson(left) ==
        canonicalJson(base['deleted'] == true ? null : base['payload'])) {
      kind = SyncKind.pull;
    } else if (record?.revision == base['revision']) {
      kind = SyncKind.push;
    } else {
      kind = SyncKind.conflict;
    }
    if (kind == SyncKind.ack && record == null) continue;
    actions.add(SyncAction(key, kind, left, record));
  }
  return actions;
}

class AccountSession {
  final String origin, projectId, apiKey, uid, email, idToken, refreshToken;
  final int expiresAt;
  AccountSession({
    required this.origin,
    required this.projectId,
    required this.apiKey,
    required this.uid,
    required this.email,
    required this.idToken,
    required this.refreshToken,
    required this.expiresAt,
  });
  factory AccountSession.fromJson(Map<String, dynamic> j) => AccountSession(
    origin: syncOrigin(j['origin'] as String),
    projectId: j['projectId'] as String,
    apiKey: j['apiKey'] as String,
    uid: j['uid'] as String,
    email: j['email'] as String,
    idToken: j['idToken'] as String,
    refreshToken: j['refreshToken'] as String,
    expiresAt: j['expiresAt'] as int,
  );
  Map<String, dynamic> toJson() => {
    'origin': origin,
    'projectId': projectId,
    'apiKey': apiKey,
    'uid': uid,
    'email': email,
    'idToken': idToken,
    'refreshToken': refreshToken,
    'expiresAt': expiresAt,
  };
  String get owner => '$projectId:$uid';
}

class CloudSyncProgress {
  final String stage;
  final String? detail;
  final int completed;
  final int? total;
  final DateTime startedAt, updatedAt;
  const CloudSyncProgress({
    required this.stage,
    this.detail,
    required this.completed,
    this.total,
    required this.startedAt,
    required this.updatedAt,
  });
}

String syncConflictFingerprint(SyncAction action) => canonicalJson({
  'key': action.key,
  'local': action.local,
  'remote': action.remote == null
      ? null
      : {
          'revision': action.remote!.revision,
          'deleted': action.remote!.deleted,
          'payload': action.remote!.payload,
        },
});

bool preserveSyncConflict(List<dynamic> copies, SyncAction action) {
  final fingerprint = syncConflictFingerprint(action);
  for (final raw in copies) {
    final copy = object(raw),
        remote = copy['remote'] == null ? null : object(copy['remote']);
    if (canonicalJson({
          'key': copy['key'],
          'local': copy['local'],
          'remote': remote == null
              ? null
              : {
                  'revision': remote['revision'],
                  'deleted': remote['deleted'],
                  'payload': remote['payload'],
                },
        }) ==
        fingerprint) {
      return false;
    }
  }
  copies.add(
    jsonDecode(
      jsonEncode({
        'key': action.key,
        'local': action.local,
        'remote': action.remote?.toJson(),
        'at': DateTime.now().toUtc().toIso8601String(),
      }),
    ),
  );
  return true;
}

class CloudSyncController extends ChangeNotifier {
  static const sessionKey = 'account-session-v1';
  final StickyStore store;
  final CloudTransport transport;
  final Future<bool> Function(Uri) openBrowser;
  final bool Function() isEditing;
  final Duration pollInterval;
  AccountSession? session;
  String server = '';
  String message = '';
  String? error;
  bool busy = false, signingIn = false, ready = false;
  CloudSyncProgress? progress;
  void _report(String stage, {String? detail, int? completed, int? total}) {
    final now = DateTime.now(), previous = progress;
    progress = CloudSyncProgress(
      stage: stage,
      detail: detail,
      completed: completed ?? previous?.completed ?? 0,
      total: total ?? previous?.total,
      startedAt: previous?.startedAt ?? now,
      updatedAt: now,
    );
    _notify();
  }

  void _advance() {
    final current = progress;
    if (current != null) {
      _report(
        current.stage,
        detail: current.detail,
        completed: current.completed + 1,
      );
    }
  }

  List<SyncAction> conflicts = [];
  String? lastSynced;
  String? _acknowledgedContent, _acknowledgedOwner;
  bool get upToDate =>
      enabled &&
      _acknowledgedOwner == session?.owner &&
      _acknowledgedContent != null &&
      _acknowledgedContent == canonicalJson(store.syncRecords()) &&
      store.saveError == null;
  Timer? _debounce, _poll;
  bool _disposed = false, _applying = false, _active = true, _needsSync = false;
  int _epoch = 0;
  String _lastObserved = '';
  Future<void> _credentialWrites = Future<void>.value();
  CloudSyncController({
    required this.store,
    required this.openBrowser,
    CloudTransport? transport,
    bool Function()? isEditing,
    this.pollInterval = const Duration(milliseconds: 1500),
  }) : transport = transport ?? CloudTransport(),
       isEditing = isEditing ?? (() => false);

  String get _metadataKey =>
      session == null ? '' : 'account:${session!.owner}:${session!.origin}';
  Map<String, dynamic> get _meta {
    final value = store.syncMetadata[_metadataKey];
    if (value == null) {
      return {
        'enabled': false,
        'baseline': <String, dynamic>{},
        'pending': <String, dynamic>{},
        'conflicts': <dynamic>[],
      };
    }
    final meta = object(value);
    if (meta['enabled'] is! bool ||
        meta['baseline'] is! Map ||
        meta['pending'] is! Map ||
        meta['conflicts'] is! List) {
      throw const FormatException(
        'Sync metadata needs recovery. Local notes have not changed.',
      );
    }
    for (final entry in object(meta['baseline']).values) {
      final base = object(entry);
      if (base['revision'] is! int || base['deleted'] is! bool) {
        throw const FormatException('Sync metadata needs recovery.');
      }
    }
    return meta;
  }

  bool get enabled {
    if (session == null) return false;
    try {
      return _meta['enabled'] == true;
    } catch (_) {
      return false;
    }
  }

  String exportRecovery() => const JsonEncoder.withIndent('  ').convert({
    'schemaVersion': 1,
    'account': session?.email,
    'conflicts': session == null ? [] : _meta['conflicts'],
  });
  void _notify() {
    if (!_disposed) notifyListeners();
  }

  Future<void> initialize() async {
    try {
      server =
          store.syncMetadata['serviceOrigin'] as String? ??
          const String.fromEnvironment('SYNC_SERVER_URL');
      if (server.isNotEmpty) server = syncOrigin(server);
      final raw = await store.credentials.read(sessionKey);
      if (raw != null && raw.isNotEmpty) {
        final restored = AccountSession.fromJson(object(jsonDecode(raw)));
        if (restored.origin == server) session = restored;
      }
      if (session != null) {
        _meta;
        message = enabled ? 'Sync ready.' : 'Sync is off.';
      }
    } catch (_) {
      session = null;
      error = 'The saved account state could not be read. Local notes remain available. Sign in again to reconnect.';
    }
    if (_disposed) return;
    _lastObserved = canonicalJson(store.syncRecords());
    store.addListener(_changed);
    _poll = Timer.periodic(const Duration(seconds: 60), (_) {
      if (_active) unawaited(synchronize());
    });
    ready = true;
    _schedule();
    _notify();
  }

  // Serialize secure-store writes. A cancelled request rolls back before the
  // next session is written, so its cleanup cannot erase a newer login.
  Future<bool> _persistSession(AccountSession? next, int epoch) {
    final result = _credentialWrites.then((_) async {
      if (_disposed || epoch != _epoch) return false;
      final previous = session;
      await store.credentials.write(
        sessionKey,
        next == null ? '' : jsonEncode(next.toJson()),
      );
      if (_disposed || epoch != _epoch) {
        await store.credentials.write(
          sessionKey,
          previous == null ? '' : jsonEncode(previous.toJson()),
        );
        return false;
      }
      session = next;
      return true;
    });
    _credentialWrites = result.then<void>(
      (_) {},
      onError: (Object _, StackTrace _) {},
    );
    return result;
  }

  void _changed() {
    if (_disposed || !store.ready) return;
    final next = canonicalJson(store.syncRecords());
    if (next == _lastObserved) return;
    _lastObserved = next;
    _notify();
    if (_applying) return;
    if (busy) {
      _needsSync = true;
      return;
    }
    _schedule();
  }

  void _schedule() {
    _debounce?.cancel();
    if (enabled && _active && ready) {
      _debounce = Timer(
        const Duration(milliseconds: 1800),
        () => unawaited(synchronize()),
      );
    }
  }

  void setActive(bool active) {
    _active = active;
    if (active) {
      _schedule();
    } else {
      _debounce?.cancel();
    }
  }

  Future<void> _saveMeta(Map<String, dynamic> meta) async {
    store.syncMetadata[_metadataKey] = meta;
    store.changed();
    await store.flush();
  }

  Future<void> configure(String value) async {
    if (busy || signingIn || session != null) {
      throw StateError('Sign out before changing the sync service.');
    }
    final origin = syncOrigin(value);
    busy = true;
    _notify();
    try {
      final config = await transport.request(Uri.parse('$origin/v1/config'));
      if (_disposed) return;
      final firebase = object(config['firebase']);
      if (config['schemaVersion'] != 1 ||
          ['apiKey', 'projectId', 'authDomain', 'appId'].any(
            (key) =>
                firebase[key] is! String || (firebase[key] as String).isEmpty,
          )) {
        throw StateError(
          'The service needs its Firebase web configuration before sign-in is available.',
        );
      }
      store.syncMetadata['serviceOrigin'] = origin;
      store.changed();
      await store.flush();
      server = origin;
      error = null;
      message = 'Service connected.';
    } finally {
      busy = false;
      _notify();
    }
  }

  String _randomCode() => base64UrlEncode(
    List<int>.generate(32, (_) => Random.secure().nextInt(256)),
  ).replaceAll('=', '');
  void cancelSignIn() {
    _epoch++;
    signingIn = false;
    message = 'Sign-in cancelled.';
    _notify();
  }

  Future<void> signIn() async {
    if (server.isEmpty || busy || signingIn) return;
    final epoch = ++_epoch;
    final origin = server;
    signingIn = true;
    error = null;
    message = 'Choose your Google account in the browser, then return here.';
    _notify();
    try {
      final config = await transport.request(Uri.parse('$origin/v1/config'));
      if (_disposed || epoch != _epoch) return;
      final firebase = object(config['firebase']);
      if (config['schemaVersion'] != 1 ||
          firebase['apiKey'] is! String ||
          firebase['projectId'] is! String) {
        throw StateError('The service has an invalid Firebase configuration.');
      }
      final verifier = _randomCode(), sessionId = _randomCode();
      final challenge = base64UrlEncode(
        sha256.convert(utf8.encode(verifier)).bytes,
      ).replaceAll('=', '');
      final fragment = Uri(
        queryParameters: {
          'sessionId': sessionId,
          'challenge': challenge,
          if (!const bool.fromEnvironment('STICKY_PREVIEW')) 'returnTo': 'app',
        },
      ).query;
      if (!await openBrowser(Uri.parse('$origin/signin#$fragment'))) {
        throw StateError('Could not open your browser. Try again.');
      }
      final until = DateTime.now().add(const Duration(minutes: 5));
      while (epoch == _epoch && !_disposed && DateTime.now().isBefore(until)) {
        await Future<void>.delayed(pollInterval);
        if (epoch != _epoch || _disposed) return;
        // Do not consume the one-time handoff while Android has backgrounded us.
        // The browser's return link resumes this activity and polling continues.
        if (!_active) continue;
        final exchange = await transport.request(
          Uri.parse('$origin/v1/auth/exchange'),
          method: 'POST',
          body: {'sessionId': sessionId, 'verifier': verifier},
        );
        if (epoch != _epoch || _disposed) return;
        if (exchange['customToken'] is! String) continue;
        final apiKey = firebase['apiKey'] as String;
        final auth = await transport.request(
          Uri.https(
            'identitytoolkit.googleapis.com',
            '/v1/accounts:signInWithCustomToken',
            {'key': apiKey},
          ),
          method: 'POST',
          body: {'token': exchange['customToken'], 'returnSecureToken': true},
        );
        if (epoch != _epoch || _disposed) return;
        final lookup = await transport.request(
          Uri.https('identitytoolkit.googleapis.com', '/v1/accounts:lookup', {
            'key': apiKey,
          }),
          method: 'POST',
          body: {'idToken': auth['idToken']},
        );
        if (epoch != _epoch || _disposed) return;
        final users = lookup['users'] as List;
        final user = object(users.single);
        if (user['localId'] is! String ||
            (user['localId'] as String).isEmpty ||
            user['email'] is! String ||
            user['emailVerified'] != true) {
          throw StateError('Use a verified Google account to sync.');
        }
        // Custom-token sign-in returns tokens only. The authenticated lookup
        // response supplies the UID and verified email for this ID token.
        final next = AccountSession(
          origin: origin,
          projectId: firebase['projectId'] as String,
          apiKey: apiKey,
          uid: user['localId'] as String,
          email: user['email'] as String,
          idToken: auth['idToken'] as String,
          refreshToken: auth['refreshToken'] as String,
          expiresAt:
              DateTime.now().millisecondsSinceEpoch +
              int.parse(auth['expiresIn'].toString()) * 1000,
        );
        final owner = store.syncMetadata['owner'];
        if (owner != null && owner != next.owner) {
          throw StateError(
            'This notebook belongs to another account. Sign in with that account to protect its notes.',
          );
        }
        if (!await _persistSession(next, epoch)) return;
        message = enabled ? 'Sync ready.' : 'Sync is off.';
        _schedule();
        return;
      }
      if (epoch == _epoch) {
        throw StateError('Sign-in expired. Try again from the app.');
      }
    } catch (cause) {
      if (epoch == _epoch) {
        error = cause.toString().replaceFirst('Bad state: ', '');
      }
    } finally {
      if (epoch == _epoch) {
        signingIn = false;
        _notify();
      }
    }
  }

  Future<String> _token() async {
    final current = session!, epoch = _epoch;
    if (current.expiresAt > DateTime.now().millisecondsSinceEpoch + 60_000) {
      return current.idToken;
    }
    final refreshed = await transport.request(
      Uri.https('securetoken.googleapis.com', '/v1/token', {
        'key': current.apiKey,
      }),
      method: 'POST',
      form: {
        'grant_type': 'refresh_token',
        'refresh_token': current.refreshToken,
      },
    );
    if (_disposed || epoch != _epoch || session?.owner != current.owner) {
      throw StateError('Account changed; session renewal stopped.');
    }
    // Secure Token's project_id is a project NUMBER, whereas Firebase config
    // uses the project ID slug. Google verifies API-key/project compatibility.
    if (refreshed['user_id'] != current.uid) {
      throw StateError(
        'The refreshed session belongs to a different account. Sign in again.',
      );
    }
    final next = AccountSession(
      origin: current.origin,
      projectId: current.projectId,
      apiKey: current.apiKey,
      uid: current.uid,
      email: current.email,
      idToken: refreshed['id_token'] as String,
      refreshToken:
          refreshed['refresh_token'] as String? ?? current.refreshToken,
      expiresAt:
          DateTime.now().millisecondsSinceEpoch +
          int.parse(refreshed['expires_in'].toString()) * 1000,
    );
    if (!await _persistSession(next, epoch)) {
      throw StateError('Account changed; session renewal stopped.');
    }
    return next.idToken;
  }

  Future<void> signOut() async {
    if (busy) return;
    final epoch = ++_epoch;
    signingIn = false;
    busy = true;
    _notify();
    try {
      if (session != null) {
        final meta = _meta;
        meta['enabled'] = false;
        await _saveMeta(meta);
      }
      if (!await _persistSession(null, epoch)) return;
      conflicts = [];
      error = null;
      message = 'Signed out. Local notes kept.';
    } finally {
      busy = false;
      _notify();
    }
  }

  Future<void> setEnabled(bool value) async {
    if (session == null || busy) return;
    final owner = store.syncMetadata['owner'];
    if (value && owner != null && owner != session!.owner) {
      throw StateError('These notes belong to another account.');
    }
    if (value) store.syncMetadata['owner'] = session!.owner;
    final meta = _meta;
    meta['enabled'] = value;
    await _saveMeta(meta);
    error = null;
    message = value
        ? 'Sync enabled.'
        : 'Sync paused. Local notes remain available.';
    _notify();
    if (value) _schedule();
  }

  Map<String, Map<String, dynamic>> _snapshot() =>
      object(jsonDecode(jsonEncode(store.syncRecords())))
          .map((key, value) => MapEntry(key, object(value)));
  Future<void> synchronize({
    String? resolveKey,
    bool useCloud = false,
    String? reviewedFingerprint,
  }) async {
    if (_disposed ||
        !ready ||
        !store.ready ||
        !enabled ||
        busy ||
        signingIn ||
        !_active) {
      return;
    }
    if (store.saveError != null || store.loadError != null) {
      message = 'Save your local changes before syncing.';
      _notify();
      return;
    }
    if (isEditing()) {
      message = 'Sync will resume after you finish editing.';
      _notify();
      return;
    }
    var expectedReview = reviewedFingerprint;
    if (resolveKey != null && expectedReview == null) {
      for (final conflict in conflicts) {
        if (conflict.key == resolveKey) {
          expectedReview = syncConflictFingerprint(conflict);
        }
      }
    }
    busy = true;
    _acknowledgedContent = null;
    _needsSync = false;
    error = null;
    progress = null;
    _report('Saving local edits');
    final epoch = _epoch, owner = session!.owner, origin = session!.origin;
    void ensureCurrent() {
      if (_disposed || epoch != _epoch || session?.owner != owner) {
        throw StateError('Account changed; sync stopped safely.');
      }
    }

    try {
      if (store.syncMetadata['owner'] != owner) {
        throw StateError('Enable sync to link these notes to this account.');
      }
      await store.flush();
      _report('Checking account');
      final token = await _token();
      ensureCurrent();
      _report('Reading local history');
      final local = _snapshot(), meta = _meta;
      final baseline = object(meta['baseline']),
          pending = object(meta['pending']);
      meta['baseline'] = baseline;
      meta['pending'] = pending;
      final config = await transport.request(Uri.parse('$origin/v1/config'));
      ensureCurrent();
      final versions = config['payloadSchemaVersions'];
      final supportsGoals =
          config['schemaVersion'] == 1 &&
          config['goalPlanning'] == true &&
          versions is List &&
          versions.contains(2);
      if (!supportsGoals &&
          (containsGoalMetadata(local) || containsGoalMetadata(baseline))) {
        throw StateError(
          'The sync service needs the goal-planning update. Your notebook is saved on this device; no cloud notes were replaced.',
        );
      }
      final records = <SyncRecord>[], keys = <String>{}, cursors = <String>{};
      String? cursor;
      var pageNumber = 0;
      do {
        _report('Reading cloud', detail: 'Page ${++pageNumber}');
        final uri = Uri.parse('$origin/v1/sync').replace(
          queryParameters: {
            'pageSize': '20',
            'after': ?cursor,
            if (supportsGoals) 'schemaVersion': '2',
          },
        );
        final page = await transport.request(uri, token: token);
        ensureCurrent();
        if (page['schemaVersion'] != 1 || page['records'] is! List) {
          throw const FormatException('Incompatible sync response.');
        }
        if (supportsGoals && page['payloadSchemaVersion'] != 2) {
          throw const FormatException(
            'The sync service did not return goal-aware notes. No local data was changed.',
          );
        }
        for (final value in page['records'] as List) {
          final record = SyncRecord.fromJson(object(value));
          if (!keys.add(record.key)) {
            throw const FormatException(
              'The service returned a duplicate record.',
            );
          }
          records.add(record);
        }
        cursor = page['nextCursor'] as String?;
        if (cursor != null && !cursors.add(cursor)) {
          throw const FormatException('The service returned a repeated page.');
        }
      } while (cursor != null);
      if (supportsGoals) {
        for (final record in records) {
          final original = local[record.key];
          final upgraded = migrateGoalMetadata(
            original,
            record,
            baseline[record.key] is Map ? object(baseline[record.key]) : null,
          );
          if (upgraded == null) continue;
          if (canonicalJson(upgraded.local) != canonicalJson(original)) {
            if (isEditing() ||
                canonicalJson(_snapshot()[record.key]) !=
                    canonicalJson(original)) {
              _needsSync = true;
              throw StateError(
                'You edited this note during sync. Your edits are safe; syncing will retry.',
              );
            }
            _applying = true;
            try {
              await store.applySyncRecord(
                record.key,
                upgraded.local,
                deleted: upgraded.local == null,
              );
            } finally {
              _applying = false;
            }
            ensureCurrent();
            if (upgraded.local == null) {
              local.remove(record.key);
            } else {
              local[record.key] = upgraded.local!;
            }
          }
          baseline[record.key] = upgraded.baseline;
        }
        await _saveMeta(meta);
        ensureCurrent();
      }
      _report('Comparing changes');
      final actions = reconcileRecords(local, records, baseline);
      // Upload unsynced missions before incoming history can prune the local
      // display. An interrupted cycle must not lose an unuploaded session.
      bool pulls(SyncAction action) =>
          action.kind == SyncKind.pull ||
          (action.kind == SyncKind.conflict &&
              action.key == resolveKey &&
              useCloud);
      actions.sort((a, b) {
        final order = (pulls(a) ? 1 : 0).compareTo(pulls(b) ? 1 : 0);
        return order != 0 ? order : a.key.compareTo(b.key);
      });
      final pendingConflicts = actions
          .where((action) => action.kind == SyncKind.conflict)
          .toList();
      var preserved = false;
      for (final action in pendingConflicts) {
        preserved =
            preserveSyncConflict(meta['conflicts'] as List, action) ||
            preserved;
      }
      if (preserved) {
        await _saveMeta(meta);
        ensureCurrent();
      }
      conflicts = pendingConflicts;
      if (resolveKey != null &&
          !pendingConflicts.any(
            (action) =>
                action.key == resolveKey &&
                syncConflictFingerprint(action) == expectedReview,
          )) {
        conflicts = pendingConflicts;
        throw StateError('Conflict changed. Review again.');
      }
      _report('Comparing changes', total: actions.length, completed: 0);
      final unresolved = <SyncAction>[];
      for (final action in actions) {
        ensureCurrent();
        final detail = action.key.startsWith('day:')
            ? action.key.substring(4)
            : action.key == 'goals'
            ? 'Goals and routines'
            : 'Focus session';
        _report('Checking changes', detail: detail);
        if (action.kind == SyncKind.conflict && resolveKey == action.key) {
          action.kind = useCloud ? SyncKind.pull : SyncKind.push;
        }
        if (action.kind == SyncKind.conflict) {
          unresolved.add(action);
          _advance();
          continue;
        }
        if (action.kind == SyncKind.ack) {
          if (action.remote != null) {
            baseline[action.key] = {
              ...action.remote!.baseline,
              'payloadSchemaVersion': supportsGoals ? 2 : 1,
            };
          }
          pending.remove(action.key);
          await _saveMeta(meta);
          _advance();
          continue;
        }
        if (action.kind == SyncKind.push) {
          _report('Uploading', detail: detail);
          final fingerprint = canonicalJson(action.local),
              revision = action.remote?.revision ?? 0;
          var mutation = pending[action.key] == null
              ? null
              : object(pending[action.key]);
          if (mutation == null ||
              mutation['fingerprint'] != fingerprint ||
              mutation['expectedRevision'] != revision) {
            mutation = {
              'mutationId': newId(),
              'fingerprint': fingerprint,
              'expectedRevision': revision,
            };
            pending[action.key] = mutation;
            await _saveMeta(meta);
            ensureCurrent();
          }
          final result = await transport.request(
            Uri.parse('$origin/v1/sync/${Uri.encodeComponent(action.key)}'),
            method: 'PUT',
            token: token,
            body: {
              if (supportsGoals) 'schemaVersion': 2,
              'expectedRevision': revision,
              'mutationId': mutation['mutationId'],
              'deleted': action.local == null,
              'payload': action.local,
            },
          );
          ensureCurrent();
          final record = SyncRecord.fromJson(result);
          if (record.key != action.key ||
              canonicalJson(record.payload) != fingerprint ||
              record.deleted != (action.local == null)) {
            throw const FormatException(
              'The sync acknowledgement did not match your note.',
            );
          }
          baseline[action.key] = {
            ...record.baseline,
            'payloadSchemaVersion': supportsGoals ? 2 : 1,
          };
          pending.remove(action.key);
          await _saveMeta(meta);
          _advance();
          continue;
        }
        // No await between the live-state comparison and synchronous model apply.
        if (isEditing()) {
          _needsSync = true;
          throw StateError(
            'You started editing. Incoming changes will wait until you finish.',
          );
        }
        if (canonicalJson(_snapshot()[action.key]) !=
            canonicalJson(action.local)) {
          _needsSync = true;
          throw StateError(
            'You edited this note during sync. Your edits are safe; syncing will retry.',
          );
        }
        _report('Applying downloads', detail: detail);
        _applying = true;
        try {
          await store.applySyncRecord(
            action.key,
            action.remote?.payload,
            deleted: action.remote == null || action.remote!.deleted,
          );
        } finally {
          _applying = false;
        }
        ensureCurrent();
        if (action.remote != null) {
          baseline[action.key] = {
            ...action.remote!.baseline,
            'payloadSchemaVersion': supportsGoals ? 2 : 1,
          };
        } else {
          baseline.remove(action.key);
        }
        await _saveMeta(meta);
        _advance();
      }
      conflicts = unresolved;
      if (unresolved.isEmpty && !_needsSync) {
        _acknowledgedContent = canonicalJson(store.syncRecords());
        _acknowledgedOwner = owner;
      }
      lastSynced = DateTime.now().toLocal().toIso8601String();
      message = unresolved.isEmpty
          ? 'Up to date across your devices.'
          : '${unresolved.length} notes need your choice. Both versions are preserved.';
    } catch (cause) {
      if (!_disposed) {
        final step = progress;
        error =
            '${step?.stage ?? 'Sync'}${step?.detail == null ? '' : ' (${step!.detail})'}: ${cause.toString().replaceFirst('Bad state: ', '')}';
        message = 'Sync stopped. Local notes are safe; retry when ready.';
      }
    } finally {
      busy = false;
      progress = null;
      _notify();
      if (_needsSync && !_disposed) _schedule();
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _epoch++;
    _debounce?.cancel();
    _poll?.cancel();
    store.removeListener(_changed);
    transport.close();
    super.dispose();
  }
}
