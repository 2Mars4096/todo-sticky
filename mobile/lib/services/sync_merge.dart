import 'dart:convert';

// Keep the policy identical to src/syncMerge.ts; shared JSON fixtures test both.
String canonicalJson(Object? value) {
  if (value is List) return '[${value.map(canonicalJson).join(',')}]';
  if (value is Map) {
    final keys = value.keys.cast<String>().toList()..sort();
    return '{${keys.map((key) => '${jsonEncode(key)}:${canonicalJson(value[key])}').join(',')}}';
  }
  return jsonEncode(value);
}

class MergeIssue {
  final String path, label;
  final Object? local, cloud;
  const MergeIssue(this.path, this.label, this.local, this.cloud);
  Map<String, dynamic> toJson() => {
    'path': path,
    'label': label,
    'local': local,
    'cloud': cloud,
  };
}

class MergeResult {
  final Map<String, dynamic>? payload;
  final List<MergeIssue> issues;
  const MergeResult(this.payload, this.issues);
}

final _missing = Object();
const _fields = {
  'text': 'Text',
  'status': 'Status',
  'done': 'Completed',
  'doneWhen': 'Outcome',
  'by': 'Due date',
  'originalBy': 'Original due date',
  'deadlineChanges': 'Deadline history',
  'goalId': 'Project',
  'goalStepId': 'Project step',
};
const _collections = {'tasks', 'subtasks', 'targets', 'recurring', 'plan'};
bool _same(dynamic a, dynamic b) =>
    identical(a, _missing) || identical(b, _missing)
    ? identical(a, b)
    : canonicalJson(a) == canonicalJson(b);
dynamic _copy(dynamic value) =>
    identical(value, _missing) ? _missing : jsonDecode(jsonEncode(value));
String _child(String path, String key) =>
    '$path/${key.replaceAll('~', '~0').replaceAll('/', '~1')}';

MergeResult mergeSyncPayload(
  String key,
  Map<String, dynamic>? ancestor,
  Map<String, dynamic>? local,
  Map<String, dynamic>? cloud,
  bool hasAncestor, {
  Map<String, String> choices = const {},
  bool atomicTasks = false,
}) {
  dynamic logical(dynamic value) =>
      value ??
      (key == 'goals'
          ? {'targets': [], 'recurring': []}
          : key.startsWith('day:')
          ? {'date': key.substring(4), 'tasks': []}
          : null);
  final issues = <MergeIssue>[];
  dynamic conflict(
    String path,
    String label,
    dynamic left,
    dynamic right, {
    dynamic displayLeft,
    dynamic displayRight,
    bool display = false,
  }) {
    final l = display ? displayLeft : left, r = display ? displayRight : right;
    issues.add(
      MergeIssue(
        path,
        label,
        identical(l, _missing) ? null : _copy(l),
        identical(r, _missing) ? null : _copy(r),
      ),
    );
    return _copy(choices[path] == 'cloud' ? right : left);
  }

  dynamic visit(
    dynamic base,
    dynamic left,
    dynamic right,
    String path,
    String label,
    String field,
  ) {
    if (_same(left, right)) return _copy(left);
    if (_same(left, base)) return _copy(right);
    if (_same(right, base)) return _copy(left);
    if (key.startsWith('focus:')) {
      return conflict(path, 'Focus session', left, right);
    }
    if (identical(left, _missing) ||
        identical(right, _missing) ||
        left == null ||
        right == null) {
      return conflict(path, label, left, right);
    }
    if (atomicTasks && RegExp(r'^/tasks/[^/]+$').hasMatch(path)) {
      return conflict(path, label, left, right);
    }
    if (left is List &&
        right is List &&
        _collections.contains(field) &&
        (identical(base, _missing) || base is List)) {
      final lists = <List<dynamic>>[
        identical(base, _missing) ? [] : base as List,
        left,
        right,
      ];
      if (lists.any(
        (list) =>
            list.any((item) => item is! Map || item['id'] is! String) ||
            list.map((item) => item['id']).toSet().length != list.length,
      )) {
        return conflict(path, label, left, right);
      }
      final maps = lists
          .map((list) => {for (final item in list) item['id'] as String: item})
          .toList();
      final ids =
          lists
              .expand((list) => list.map((item) => item['id'] as String))
              .toSet()
              .toList()
            ..sort();
      final merged = <String, dynamic>{};
      for (final id in ids) {
        final values = maps
            .map((map) => map.containsKey(id) ? map[id] : _missing)
            .toList();
        final item =
            values.firstWhere((value) => !identical(value, _missing)) as Map;
        final name = (item['text'] as String?)?.isNotEmpty == true
            ? item['text'] as String
            : (item['taskText'] as String?)?.isNotEmpty == true
            ? item['taskText'] as String
            : label;
        final value = visit(
          values[0],
          values[1],
          values[2],
          _child(path, id),
          name,
          'item',
        );
        if (!identical(value, _missing)) merged[id] = value;
      }
      final sequences = lists
          .map(
            (list) => list
                .map((item) => item['id'] as String)
                .where(merged.containsKey)
                .toList(),
          )
          .toList();
      final oldIds = sequences[0].toSet(), original = sequences[0];
      final l = sequences[1].where(oldIds.contains).toList(),
          r = sequences[2].where(oldIds.contains).toList();
      bool sameOrder(List<String> a, List<String> b) =>
          _same(a.where(b.contains).toList(), b.where(a.contains).toList());
      final leftMoved = !sameOrder(original, l),
          rightMoved = !sameOrder(original, r);
      final incompatible = leftMoved && rightMoved && !sameOrder(l, r);
      final skeleton = leftMoved
          ? l
          : rightMoved
          ? r
          : original;
      final edges = {
        for (final id in ids.where(merged.containsKey)) id: <String>{},
      };
      void edge(String a, String b) {
        if (a != b) edges[a]?.add(b);
      }

      for (var i = 1; i < skeleton.length; i++) {
        edge(skeleton[i - 1], skeleton[i]);
      }
      for (final seq in sequences.skip(1)) {
        for (var i = 1; i < seq.length; i++) {
          if (!oldIds.contains(seq[i - 1]) || !oldIds.contains(seq[i])) {
            edge(seq[i - 1], seq[i]);
          }
        }
      }
      final degree = {for (final id in edges.keys) id: 0};
      for (final after in edges.values) {
        for (final id in after) {
          degree[id] = degree[id]! + 1;
        }
      }
      final ready = degree.keys.where((id) => degree[id] == 0).toList()..sort();
      final order = <String>[];
      while (ready.isNotEmpty) {
        final id = ready.removeAt(0);
        order.add(id);
        for (final next in edges[id]!) {
          degree[next] = degree[next]! - 1;
          if (degree[next] == 0) {
            ready.add(next);
            ready.sort();
          }
        }
      }
      if (incompatible || order.length != merged.length) {
        List<String> fallback(List<String> preferred, List<String> other) {
          final result = [...preferred];
          for (final id in other) {
            if (result.contains(id)) continue;
            final position = other.indexOf(id),
                next = other
                    .skip(position + 1)
                    .where(result.contains)
                    .firstOrNull;
            if (next != null) {
              result.insert(result.indexOf(next), id);
            } else {
              result.add(id);
            }
          }
          return result;
        }

        final lo = fallback(sequences[1], sequences[2]),
            ro = fallback(sequences[2], sequences[1]);
        List<String> display(List<String> seq) =>
            seq.map((id) => merged[id]['text'] as String? ?? id).toList();
        final chosen = conflict(
          _child(path, r'$order'),
          '$label · Order',
          lo,
          ro,
          display: true,
          displayLeft: display(lo),
          displayRight: display(ro),
        ) as List;
        return chosen.map((id) => merged[id]).toList();
      }
      return order.map((id) => merged[id]).toList();
    }
    if (left is Map &&
        right is Map &&
        (identical(base, _missing) || base is Map)) {
      final result = <String, dynamic>{};
      final names = <String>{
        if (base is Map) ...base.keys.cast<String>(),
        ...left.keys.cast<String>(),
        ...right.keys.cast<String>(),
      }.toList()..sort();
      final taskLink = left['subtasks'] is List && right['subtasks'] is List;
      if (taskLink) {
        names.remove('goalId');
        names.remove('goalStepId');
      }
      for (final name in names) {
        dynamic at(dynamic value) =>
            value is Map && value.containsKey(name) ? value[name] : _missing;
        final value = visit(
          at(base),
          at(left),
          at(right),
          _child(path, name),
          _fields.containsKey(name) ? '$label · ${_fields[name]}' : label,
          name,
        );
        if (!identical(value, _missing)) result[name] = value;
      }
      if (taskLink) {
        dynamic link(dynamic value) => identical(value, _missing)
            ? _missing
            : <String, dynamic>{
                for (final name in ['goalId', 'goalStepId'])
                  if ((value as Map).containsKey(name)) name: value[name],
              };
        final b = link(base), l = link(left) as Map, r = link(right) as Map;
        final value = _same(l, r)
            ? l
            : _same(l, b)
            ? r
            : _same(r, b)
            ? l
            : identical(b, _missing) && (l.isEmpty || r.isEmpty)
            ? l.isNotEmpty
                  ? l
                  : r
            : conflict(_child(path, r'$project'), '$label · Project', l, r);
        result.addAll(Map<String, dynamic>.from(value as Map));
      }
      if (key.startsWith('day:') &&
          result['status'] == 'done' &&
          result['subtasks'] is List &&
          (result['subtasks'] as List).any(
            (task) => task['status'] != 'done',
          )) {
        result['status'] = 'todo';
        if (result['finish'] is Map &&
            result['finish']['reviewReady'] == true) {
          result['finish'] = {...result['finish'] as Map, 'reviewReady': false};
        }
      }
      return result;
    }
    return conflict(path, label, left, right);
  }

  final payload = visit(
    hasAncestor ? logical(ancestor) : _missing,
    logical(local),
    logical(cloud),
    '',
    key == 'goals'
        ? 'Goals and routines'
        : key.startsWith('day:')
        ? key.substring(4)
        : 'Focus session',
    'record',
  );
  return MergeResult(
    identical(payload, _missing) || payload == null
        ? null
        : Map<String, dynamic>.from(payload as Map),
    issues,
  );
}

String mergeValueText(Object? value) {
  if (value == null) return 'Deleted';
  if (value is bool) return value ? 'Complete' : 'Open';
  if (value is String || value is num) return '$value';
  if (value is List) {
    return value.isEmpty ? 'Empty' : value.map(mergeValueText).join('\n');
  }
  final item = value as Map;
  if (item['goalId'] != null) {
    return 'Project: ${item['goalId']}${item['goalStepId'] != null ? '\nProject step: ${item['goalStepId']}' : ''}';
  }
  if (item['text'] is String) {
    return [
      item['text'],
      if (item['subtasks'] is List)
        ...(item['subtasks'] as List).map(mergeValueText),
    ].join('\n');
  }
  return item.entries
      .where((entry) => !['id', 'goalId', 'goalStepId'].contains(entry.key))
      .map(
        (entry) => _fields.containsKey(entry.key)
            ? '${_fields[entry.key]}: ${mergeValueText(entry.value)}'
            : mergeValueText(entry.value),
      )
      .join('\n');
}
