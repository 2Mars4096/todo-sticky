import 'dart:convert';
import 'dart:math';

String newId() {
  final r = Random.secure();
  final bytes = List<int>.generate(16, (_) => r.nextInt(256));
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  final h = bytes.map((b) => b.toRadixString(16).padLeft(2, '0')).join();
  return '${h.substring(0, 8)}-${h.substring(8, 12)}-${h.substring(12, 16)}-${h.substring(16, 20)}-${h.substring(20)}';
}

String dateKey(DateTime date) =>
    '${date.year.toString().padLeft(4, '0')}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
DateTime parseDate(String value) {
  if (!RegExp(r'^\d{4}-\d{2}-\d{2}$').hasMatch(value)) {
    throw const FormatException('Invalid date');
  }
  final d = DateTime.parse(value);
  if (dateKey(d) != value) throw const FormatException('Invalid date');
  return d;
}

Map<String, dynamic> object(Object? value) {
  if (value is! Map) throw const FormatException('Expected an object');
  return Map<String, dynamic>.from(value);
}

String textValue(Object? value, {int max = 20000}) {
  if (value is! String || value.length > max) {
    throw const FormatException('Invalid text');
  }
  return value;
}

int integerValue(Object? value) {
  if (value is! num || !value.isFinite || value != value.roundToDouble()) {
    throw const FormatException('Invalid whole number');
  }
  return value.toInt();
}

enum TaskStatus { todo, done, partial, question, stopped }

class FinishPromise {
  String? doneWhen;
  String? by;
  String? originalBy;
  bool? reviewReady;
  List<Map<String, dynamic>> deadlineChanges;
  FinishPromise({
    this.doneWhen,
    this.by,
    this.originalBy,
    this.reviewReady,
    List<Map<String, dynamic>>? deadlineChanges,
  }) : deadlineChanges = deadlineChanges ?? [];
  factory FinishPromise.fromJson(Map<String, dynamic> json) {
    final by = json['by'] == '' ? null : json['by'] as String?;
    final original = json['originalBy'] == ''
        ? null
        : json['originalBy'] as String?;
    if (by != null) parseDate(by);
    if (original != null) parseDate(original);
    return FinishPromise(
      doneWhen: json['doneWhen'] as String?,
      by: by,
      originalBy: original,
      reviewReady: json.containsKey('reviewReady')
          ? json['reviewReady'] == true
          : null,
      deadlineChanges: (json['deadlineChanges'] as List? ?? [])
          .map(object)
          .toList(),
    );
  }
  Map<String, dynamic> toJson() => {
    if (doneWhen != null) 'doneWhen': doneWhen,
    if (by != null) 'by': by,
    if (originalBy != null) 'originalBy': originalBy,
    if (reviewReady != null) 'reviewReady': reviewReady,
    if (deadlineChanges.isNotEmpty) 'deadlineChanges': deadlineChanges,
  };
}

class Task {
  final String id;
  String text;
  TaskStatus status;
  List<Task> subtasks;
  FinishPromise? finish;
  Task({
    String? id,
    required this.text,
    this.status = TaskStatus.todo,
    List<Task>? subtasks,
    this.finish,
  }) : id = id ?? newId(),
       subtasks = subtasks ?? [];
  bool get closed => status == TaskStatus.done || status == TaskStatus.stopped;
  factory Task.fromJson(Map<String, dynamic> json, [int depth = 0]) {
    if (depth > 32) throw const FormatException('Task nesting is too deep');
    final id = textValue(json['id'], max: 300);
    if (id.isEmpty) throw const FormatException('Task ID is required');
    final status = TaskStatus.values
        .where((s) => s.name == json['status'])
        .firstOrNull;
    if (status == null) throw const FormatException('Unknown task status');
    final children = json['subtasks'];
    if (children is! List || children.length > 10000) {
      throw const FormatException('Invalid task steps');
    }
    return Task(
      id: id,
      text: textValue(json['text']),
      status: status,
      subtasks: children
          .map((v) => Task.fromJson(object(v), depth + 1))
          .toList(),
      finish: json['finish'] == null
          ? null
          : FinishPromise.fromJson(object(json['finish'])),
    );
  }
  Map<String, dynamic> toJson() => {
    'id': id,
    'text': text,
    'status': status.name,
    'subtasks': subtasks.map((t) => t.toJson()).toList(),
    if (finish != null) 'finish': finish!.toJson(),
  };
  Task clone() => Task.fromJson(object(jsonDecode(jsonEncode(toJson()))));
  void completeTree() {
    status = TaskStatus.done;
    for (final child in subtasks) {
      child.completeTree();
    }
  }

  Task? find(String target) {
    if (id == target) return this;
    for (final child in subtasks) {
      final found = child.find(target);
      if (found != null) return found;
    }
    return null;
  }

  Iterable<Task> get flattened sync* {
    yield this;
    for (final child in subtasks) {
      yield* child.flattened;
    }
  }
}

class GoalItem {
  final String id;
  String text;
  bool done;
  GoalItem({String? id, required this.text, this.done = false})
    : id = id ?? newId();
  factory GoalItem.fromJson(Map<String, dynamic> j) => GoalItem(
    id: textValue(j['id'], max: 300),
    text: textValue(j['text']),
    done: j['done'] == true,
  );
  Map<String, dynamic> toJson() => {'id': id, 'text': text, 'done': done};
}

class Goals {
  List<GoalItem> targets;
  List<GoalItem> recurring;
  Goals({List<GoalItem>? targets, List<GoalItem>? recurring})
    : targets = targets ?? [],
      recurring = recurring ?? [];
  factory Goals.fromJson(Map<String, dynamic> j) => Goals(
    targets: (j['targets'] as List? ?? [])
        .map((v) => GoalItem.fromJson(object(v)))
        .toList(),
    recurring: (j['recurring'] as List? ?? [])
        .map((v) => GoalItem.fromJson(object(v)))
        .toList(),
  );
  Map<String, dynamic> toJson() => {
    'targets': targets.map((t) => t.toJson()).toList(),
    'recurring': recurring.map((t) => t.toJson()).toList(),
  };
}

class FocusSession {
  final String taskId;
  final String taskText;
  final int durationMinutes;
  final int startedAt;
  int endsAt;
  int? pausedAt;
  FocusSession({
    required this.taskId,
    required this.taskText,
    required this.durationMinutes,
    required this.startedAt,
    required this.endsAt,
    this.pausedAt,
  });
  factory FocusSession.fromJson(Map<String, dynamic> j) => FocusSession(
    taskId: textValue(j['taskId']),
    taskText: textValue(j['taskText']),
    durationMinutes: integerValue(j['durationMinutes']),
    startedAt: j['startedAt'] as int,
    endsAt: j['endsAt'] as int,
    pausedAt: j['pausedAt'] as int?,
  );
  Map<String, dynamic> toJson() => {
    'taskId': taskId,
    'taskText': taskText,
    'durationMinutes': durationMinutes,
    'startedAt': startedAt,
    'endsAt': endsAt,
    'pausedAt': pausedAt,
  };
  int remaining([DateTime? now]) => max(
    0,
    endsAt - (pausedAt ?? (now ?? DateTime.now()).millisecondsSinceEpoch),
  );
}

class MissionRecord {
  final String id;
  final String taskId;
  final String taskText;
  final int durationMinutes;
  final int completedAt;
  final int orbitIndex;
  final String vehicleCode;
  final String orbitLabel;
  MissionRecord({
    required this.id,
    required this.taskId,
    required this.taskText,
    required this.durationMinutes,
    required this.completedAt,
    required this.orbitIndex,
    required this.vehicleCode,
    required this.orbitLabel,
  });
  factory MissionRecord.fromJson(Map<String, dynamic> j) => MissionRecord(
    id: textValue(j['id']),
    taskId: textValue(j['taskId']),
    taskText: textValue(j['taskText']),
    durationMinutes: integerValue(j['durationMinutes']),
    completedAt: integerValue(j['completedAt']),
    orbitIndex: integerValue(j['orbitIndex']),
    vehicleCode: textValue(j['vehicleCode']),
    orbitLabel: textValue(j['orbitLabel']),
  );
  Map<String, dynamic> toJson() => {
    'id': id,
    'taskId': taskId,
    'taskText': taskText,
    'durationMinutes': durationMinutes,
    'completedAt': completedAt,
    'orbitIndex': orbitIndex,
    'vehicleCode': vehicleCode,
    'orbitLabel': orbitLabel,
  };
}

class FocusState {
  int sessionDurationMinutes;
  int archiveRetentionLimit;
  int lastOrbitIndex;
  FocusSession? activeSession;
  List<MissionRecord> missionHistory;
  FocusState({
    this.sessionDurationMinutes = 25,
    this.archiveRetentionLimit = 12,
    this.lastOrbitIndex = 0,
    this.activeSession,
    List<MissionRecord>? missionHistory,
  }) : missionHistory = missionHistory ?? [];
  factory FocusState.fromJson(Map<String, dynamic> j) => FocusState(
    sessionDurationMinutes: (j['sessionDurationMinutes'] as int? ?? 25).clamp(
      1,
      240,
    ),
    archiveRetentionLimit: [6, 12, 24].contains(j['archiveRetentionLimit'])
        ? j['archiveRetentionLimit'] as int
        : 12,
    lastOrbitIndex: j['lastOrbitIndex'] as int? ?? 0,
    activeSession: j['activeSession'] == null
        ? null
        : FocusSession.fromJson(object(j['activeSession'])),
    missionHistory: (j['missionHistory'] as List? ?? [])
        .map((v) => MissionRecord.fromJson(object(v)))
        .toList(),
  );
  Map<String, dynamic> toJson() => {
    'sessionDurationMinutes': sessionDurationMinutes,
    'archiveRetentionLimit': archiveRetentionLimit,
    'lastOrbitIndex': lastOrbitIndex,
    'activeSession': activeSession?.toJson(),
    'missionHistory': missionHistory.map((m) => m.toJson()).toList(),
  };
}

const providerPresets = <String, Map<String, String>>{
  'moonshot': {
    'name': 'Moonshot · Kimi',
    'base': 'https://api.moonshot.ai/v1',
    'model': 'kimi-k2.6',
  },
  'openrouter': {
    'name': 'OpenRouter',
    'base': 'https://openrouter.ai/api/v1',
    'model': 'openrouter/auto',
  },
  'openai': {
    'name': 'OpenAI',
    'base': 'https://api.openai.com/v1',
    'model': 'gpt-4o-mini',
  },
  'anthropic': {
    'name': 'Anthropic · Claude',
    'base': 'https://api.anthropic.com/v1',
    'model': 'claude-sonnet-4-20250514',
  },
  'gemini': {
    'name': 'Google · Gemini',
    'base': 'https://generativelanguage.googleapis.com/v1beta',
    'model': 'gemini-2.0-flash',
  },
  'custom': {'name': 'Custom OpenAI-compatible', 'base': '', 'model': ''},
};

class ProviderProfile {
  String apiBase;
  String model;
  ProviderProfile({required this.apiBase, required this.model});
  factory ProviderProfile.fromJson(Map<String, dynamic> j) => ProviderProfile(
    apiBase: j['apiBase'] as String? ?? '',
    model: j['model'] as String? ?? '',
  );
  Map<String, dynamic> toJson() => {'apiBase': apiBase, 'model': model};
}

class Preferences {
  String provider;
  Map<String, ProviderProfile> profiles;
  List<Map<String, dynamic>> machines;
  String material;
  bool showEarlier;
  bool showCompleted;
  Preferences({
    this.provider = 'moonshot',
    Map<String, ProviderProfile>? profiles,
    List<Map<String, dynamic>>? machines,
    this.material = 'paper',
    this.showEarlier = false,
    this.showCompleted = true,
  }) : profiles = profiles ?? {},
       machines = machines ?? [];
  ProviderProfile profile([String? name]) {
    final id = name ?? provider;
    final p = providerPresets[id] ?? providerPresets['custom']!;
    return profiles[id] ??
        ProviderProfile(apiBase: p['base']!, model: p['model']!);
  }

  factory Preferences.fromJson(Map<String, dynamic> j) => Preferences(
    provider: providerPresets.containsKey(j['provider'])
        ? j['provider'] as String
        : 'moonshot',
    profiles: object(j['profiles'] ?? {})
        .map((k, v) => MapEntry(k, ProviderProfile.fromJson(object(v)))),
    machines: (j['machines'] as List? ?? []).map(object).toList(),
    material: ['paper', 'frosted', 'liquid'].contains(j['material'])
        ? j['material'] as String
        : 'paper',
    showEarlier: j['showEarlier'] == true,
    showCompleted: j['showCompleted'] != false,
  );
  Map<String, dynamic> toJson() => {
    'provider': provider,
    'profiles': profiles.map((k, v) => MapEntry(k, v.toJson())),
    'machines': machines,
    'material': material,
    'showEarlier': showEarlier,
    'showCompleted': showCompleted,
  };
}

class DatedTask {
  final String date;
  final Task task;
  DatedTask(this.date, this.task);
}

class PlanBlock {
  final String sourceDate;
  final String taskId;
  final String time;
  final String endTime;
  final String action;
  final String assignedTo;
  PlanBlock({
    required this.sourceDate,
    required this.taskId,
    required this.time,
    required this.endTime,
    required this.action,
    required this.assignedTo,
  });
}

class DayPlan {
  final String summary;
  final List<PlanBlock> blocks;
  final String date;
  final String fingerprint;
  DayPlan({
    required this.summary,
    required this.blocks,
    required this.date,
    required this.fingerprint,
  });
}

int? minutesOfDay(String text) {
  if (!RegExp(r'^([01]\d|2[0-3]):[0-5]\d$').hasMatch(text)) return null;
  final p = text.split(':').map(int.parse).toList();
  return p[0] * 60 + p[1];
}

String tasksFingerprint(List<DatedTask> tasks) => jsonEncode(
  tasks.map((t) => {'date': t.date, 'task': t.task.toJson()}).toList(),
);
