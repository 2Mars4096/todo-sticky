import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';

import '../models/models.dart';
import '../services/persistence.dart';

class StickyStore extends ChangeNotifier {
  final StatePersistence persistence;
  final CredentialStore credentials;
  Map<String, List<Task>> days = {};
  Goals goals = Goals();
  FocusState focus = FocusState();
  Preferences preferences = Preferences();
  Map<String, dynamic> syncMetadata = {};
  String selectedDate = dateKey(DateTime.now());
  String _today = dateKey(DateTime.now());
  String? saveError;
  String? loadError;
  String? notice;
  bool ready = false;
  int revision = 0;
  Future<void> _writing = Future.value();
  VoidCallback? _undo;
  String? undoLabel;
  bool _disposed = false;
  StickyStore({required this.persistence, required this.credentials});

  Future<void> initialize() async {
    try {
      final data = await persistence.load();
      if (data != null) _load(data);
      if (persistence is FilePersistence) {
        notice = (persistence as FilePersistence).recoveryNotice;
      }
      ready = true;
      loadError = null;
    } catch (_) {
      // An unreadable store is never treated as an empty notebook.
      loadError = 'Your saved notebook could not be read. Your files have not been replaced. Retry or restore an exported backup.';
    }
    _notify();
  }

  void _load(Map<String, dynamic> j) {
    if (j['schemaVersion'] != 1) {
      throw const FormatException('Unsupported notebook version');
    }
    final parsed = <String, List<Task>>{};
    for (final entry in object(j['days']).entries) {
      parseDate(entry.key);
      final value = entry.value;
      if (value is! List) throw const FormatException('Invalid date tasks');
      parsed[entry.key] = _parseTasks(value);
    }
    final parsedGoals = Goals.fromJson(object(j['goals'] ?? {}));
    final parsedFocus = FocusState.fromJson(object(j['focus'] ?? {}));
    final parsedPrefs = Preferences.fromJson(object(j['preferences'] ?? {}));
    final parsedSyncMetadata = object(j['syncMetadata'] ?? {});
    days = parsed;
    goals = parsedGoals;
    focus = parsedFocus;
    preferences = parsedPrefs;
    syncMetadata = parsedSyncMetadata;
  }

  List<Task> _parseTasks(List<dynamic> value) {
    final parsed = value.map((v) => Task.fromJson(object(v))).toList();
    final ids = <String>{};
    for (final task in parsed.expand((t) => t.flattened)) {
      if (!ids.add(task.id)) {
        throw const FormatException('Duplicate task IDs in a day');
      }
    }
    return parsed;
  }

  Map<String, dynamic> toJson({bool includeSyncMetadata = true}) => {
    'schemaVersion': 1,
    'days': days.map((k, v) => MapEntry(k, v.map((t) => t.toJson()).toList())),
    'goals': goals.toJson(),
    'focus': focus.toJson(),
    'preferences': preferences.toJson(),
    if (includeSyncMetadata) 'syncMetadata': syncMetadata,
  };
  String exportJson() =>
      const JsonEncoder.withIndent('  ')
          .convert(toJson(includeSyncMetadata: false));
  Future<void> importJson(String value) async {
    if (value.length > 20 * 1024 * 1024) {
      throw const FormatException('Backup exceeds 20 MB');
    }
    final j = object(jsonDecode(value));
    final old = toJson();
    _load(j);
    // Restore keeps this device's account baselines, never imported credentials.
    syncMetadata = object(old['syncMetadata'] ?? {});
    ready = true;
    loadError = null;
    _undo = null;
    undoLabel = null;
    changed();
    await flush();
  }

  void changed() {
    revision++;
    final snapshot = object(jsonDecode(jsonEncode(toJson())));
    _writing = _writing.then((_) async {
      try {
        await persistence.save(snapshot);
        saveError = null;
      } catch (_) {
        saveError = 'Changes are only on this screen. Retry saving before closing the app.';
      }
      _notify();
    });
    _notify();
  }

  Future<void> flush() async {
    await _writing;
    if (saveError != null) throw StateError(saveError!);
  }

  Future<void> retrySave() async {
    changed();
    await _writing;
  }

  void _notify() {
    if (!_disposed) notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  String get today => _today;
  void refreshClock([DateTime? now]) {
    final next = dateKey(now ?? DateTime.now());
    if (next != _today) {
      if (selectedDate == _today) selectedDate = next;
      _today = next;
      _notify();
    }
  }

  void selectDate(String value) {
    parseDate(value);
    selectedDate = value;
    _undo = null;
    undoLabel = null;
    _notify();
  }

  List<Task> tasksFor(String date) => days[date] ?? [];
  List<DatedTask> get selectedTasks =>
      tasksFor(selectedDate).map((t) => DatedTask(selectedDate, t)).toList();
  List<DatedTask> get earlierTasks {
    if (selectedDate != _today) return [];
    final keys = days.keys.where((d) => d.compareTo(_today) < 0).toList()
      ..sort((a, b) => b.compareTo(a));
    return [
      for (final d in keys)
        for (final t in days[d]!)
          if (!t.closed) DatedTask(d, t),
    ];
  }

  List<DatedTask> historicalSteps(String date, Task task) {
    final matches = <DatedTask>[];
    final normalized = task.text.trim().toLowerCase();
    for (final entry in days.entries) {
      if (entry.key.compareTo(date) >= 0) continue;
      for (final root in entry.value) {
        if (root.id == task.id ||
            root.text.trim().toLowerCase() == normalized) {
          matches.addAll(
            root.subtasks.map((step) => DatedTask(entry.key, step)),
          );
        }
      }
    }
    matches.sort((a, b) => b.date.compareTo(a.date));
    return matches;
  }

  List<DatedTask> get planningTasks =>
      [...selectedTasks, ...earlierTasks].where((t) => !t.task.closed).toList();
  Task? findTask(String date, String id) {
    for (final task in tasksFor(date)) {
      final found = task.find(id);
      if (found != null) return found;
    }
    return null;
  }

  List<Task>? _siblings(String date, String id) {
    List<Task>? search(List<Task> list) {
      if (list.any((t) => t.id == id)) return list;
      for (final t in list) {
        final found = search(t.subtasks);
        if (found != null) return found;
      }
      return null;
    }

    return search(tasksFor(date));
  }

  void _normalizeParents(List<Task> tasks) {
    for (final t in tasks) {
      _normalizeParents(t.subtasks);
      if (t.subtasks.isEmpty || t.status == TaskStatus.stopped) continue;
      if (t.subtasks.every((s) => s.status == TaskStatus.done)) {
        if (t.finish?.doneWhen?.trim().isNotEmpty == true &&
            t.status != TaskStatus.done) {
          t.status = TaskStatus.partial;
          t.finish!.reviewReady = true;
        } else {
          t.status = TaskStatus.done;
        }
      } else if (t.status == TaskStatus.done ||
          t.subtasks.any((s) => s.status == TaskStatus.done)) {
        t.status = TaskStatus.partial;
        t.finish?.reviewReady = false;
      }
    }
  }

  Task addTask(String text, {String? date, String? parentId}) {
    if (!ready) throw StateError('Notebook is loading');
    final normalized = text.trim();
    if (normalized.isEmpty) throw ArgumentError('Write a task first');
    final d = date ?? selectedDate;
    final task = Task(text: normalized);
    if (parentId == null) {
      (days[d] ??= []).add(task);
    } else {
      final parent = findTask(d, parentId);
      if (parent == null || parent.status == TaskStatus.stopped) {
        throw StateError('This task is no longer available');
      }
      parent.subtasks.add(task);
      if (parent.status == TaskStatus.done) parent.status = TaskStatus.partial;
      parent.finish?.reviewReady = false;
    }
    changed();
    return task;
  }

  void updateTask(
    String date,
    String id, {
    String? text,
    TaskStatus? status,
    String? outcome,
    String? due,
    bool updateFinish = false,
  }) {
    final task = findTask(date, id);
    if (task == null) return;
    if (text != null && text.trim().isNotEmpty) task.text = text.trim();
    if (status == TaskStatus.done) {
      task.completeTree();
      task.finish?.reviewReady = false;
    } else if (status != null) {
      task.status = status;
      if (status == TaskStatus.stopped) task.finish?.reviewReady = false;
    }
    if (updateFinish) {
      final f = task.finish ?? FinishPromise();
      if (due != null && due.isNotEmpty) parseDate(due);
      final newDue = due?.isEmpty == true ? null : due;
      if (newDue != f.by) {
        f.originalBy ??= f.by ?? newDue;
        f.deadlineChanges.add({
          'from': f.by,
          'to': newDue,
          'at': DateTime.now().toUtc().toIso8601String(),
        });
        f.by = newDue;
      }
      f.doneWhen = outcome?.trim().isEmpty == true ? null : outcome?.trim();
      task.finish = f;
    }
    _normalizeParents(tasksFor(date));
    changed();
  }

  void deleteTask(String date, String id) {
    final list = _siblings(date, id);
    if (list == null) return;
    final index = list.indexWhere((t) => t.id == id);
    final deleted = list.removeAt(index).clone();
    _undo = () {
      if (findTask(date, id) != null) return;
      // A parent may have been removed after this deletion; preserve by restoring as a root.
      final destination = _locateList(date, list) ? list : (days[date] ??= []);
      destination.insert(min(index, destination.length), deleted);
      _normalizeParents(tasksFor(date));
    };
    undoLabel = 'Task deleted';
    _normalizeParents(tasksFor(date));
    changed();
  }

  bool _locateList(String date, List<Task> candidate) {
    bool visit(List<Task> list) =>
        identical(list, candidate) || list.any((t) => visit(t.subtasks));
    return visit(tasksFor(date));
  }

  void undo() {
    final action = _undo;
    if (action == null) return;
    action();
    _undo = null;
    undoLabel = null;
    changed();
  }

  void reorder(String date, String? parentId, int oldIndex, int newIndex) {
    final list = parentId == null
        ? days[date]
        : findTask(date, parentId)?.subtasks;
    if (list == null || oldIndex < 0 || oldIndex >= list.length) return;
    if (newIndex > oldIndex) newIndex--;
    final task = list.removeAt(oldIndex);
    list.insert(newIndex.clamp(0, list.length), task);
    changed();
  }

  void moveTask(String fromDate, String id, String toDate) {
    parseDate(toDate);
    if (fromDate == toDate) return;
    final original = findTask(fromDate, id);
    final siblings = _siblings(fromDate, id);
    if (original == null || siblings == null) return;
    if (findTask(toDate, id) != null) {
      throw StateError('This task already exists on the destination date');
    }
    final destination = days[toDate] ??= [];
    Task? parent;
    for (final root in tasksFor(fromDate)) {
      for (final t in root.flattened) {
        if (t.subtasks.any((s) => s.id == id)) parent = t;
      }
    }
    final task = original.clone();
    // Copies retain identity across dates. A collision merges child moves instead of duplicating IDs.
    if (parent == null) {
      if (destination.any((t) => t.id == task.id)) {
        throw StateError('This task already exists on the destination date');
      }
      destination.add(task);
    } else {
      var target = destination
          .where((t) => t.id == parent!.id || t.text == parent.text)
          .firstOrNull;
      if (target == null) {
        target = Task(
          id: parent.id,
          text: parent.text,
          finish: parent.finish == null
              ? null
              : FinishPromise.fromJson(parent.finish!.toJson()),
        );
        destination.add(target);
      }
      if (!target.subtasks.any((t) => t.id == task.id)) {
        target.subtasks.add(task);
      }
      if (target.closed) target.status = TaskStatus.partial;
      target.finish?.reviewReady = false;
    }
    siblings.removeWhere((t) => t.id == id);
    _normalizeParents(tasksFor(fromDate));
    _undo = null;
    undoLabel = null;
    changed();
  }

  String carryDestination(String from) => from.compareTo(today) < 0
      ? today
      : dateKey(
          DateTime(
            parseDate(from).year,
            parseDate(from).month,
            parseDate(from).day + 1,
          ),
        );
  void addBreakdown(
    String date,
    String id,
    String fingerprint,
    List<String> steps,
  ) {
    final task = findTask(date, id);
    if (task == null ||
        task.closed ||
        jsonEncode(task.toJson()) != fingerprint) {
      throw StateError(
        'The task changed while the suggestion was being generated. Please try again.',
      );
    }
    for (final text in steps) {
      if (!task.subtasks.any((s) => s.text.trim() == text.trim())) {
        task.subtasks.add(Task(text: text.trim()));
      }
    }
    if (task.status == TaskStatus.done) task.status = TaskStatus.partial;
    task.finish?.reviewReady = false;
    changed();
  }

  void applyPlan(DayPlan plan) {
    if (plan.date != selectedDate ||
        plan.fingerprint != tasksFingerprint(planningTasks)) {
      throw StateError(
        'Tasks changed while this plan was open. Generate a fresh plan.',
      );
    }
    final prefix = 'plan_${plan.date}_';
    final removed = <String, List<({int index, Task task})>>{};
    final created = <String, String>{};
    for (final dated in planningTasks) {
      final parent = dated.task;
      final old = <({int index, Task task})>[
        for (var i = 0; i < parent.subtasks.length; i++)
          if (parent.subtasks[i].id.startsWith(prefix) &&
              !parent.subtasks[i].closed)
            (index: i, task: parent.subtasks[i].clone()),
      ];
      if (old.isNotEmpty) removed['${dated.date}/${parent.id}'] = old;
      parent.subtasks.removeWhere((t) => t.id.startsWith(prefix) && !t.closed);
      for (final block in plan.blocks.where(
        (b) => b.taskId == parent.id && b.sourceDate == dated.date,
      )) {
        final step = Task(
          id: '$prefix${newId()}',
          text:
              '${block.time}–${block.endTime} ${block.action}${block.assignedTo == 'human' ? '' : ' [${block.assignedTo}]'}',
        );
        parent.subtasks.add(step);
        created[step.id] = jsonEncode(step.toJson());
      }
      if (parent.subtasks.isNotEmpty) {
        parent.finish?.reviewReady = false;
        if (parent.status == TaskStatus.done) {
          parent.status = TaskStatus.partial;
        }
      }
    }
    _undo = () {
      for (final entry in days.entries) {
        for (final root in entry.value) {
          for (final parent in root.flattened.toList()) {
            parent.subtasks.removeWhere(
              (t) => created[t.id] == jsonEncode(t.toJson()),
            );
            if (!parent.closed) {
              for (final old
                  in removed['${entry.key}/${parent.id}'] ??
                      <({int index, Task task})>[]) {
                if (!parent.subtasks.any((t) => t.id == old.task.id)) {
                  parent.subtasks.insert(
                    min(old.index, parent.subtasks.length),
                    old.task.clone(),
                  );
                }
              }
            }
          }
        }
      }
    };
    undoLabel = 'Plan applied';
    changed();
  }

  void startFocus(Task task, int minutes) {
    if (focus.activeSession != null) {
      throw StateError('Finish the current focus session first');
    }
    final now = DateTime.now().millisecondsSinceEpoch;
    focus.sessionDurationMinutes = minutes.clamp(1, 240);
    focus.activeSession = FocusSession(
      taskId: task.id,
      taskText: task.text,
      durationMinutes: focus.sessionDurationMinutes,
      startedAt: now,
      endsAt: now + focus.sessionDurationMinutes * 60000,
    );
    changed();
  }

  void pauseFocus() {
    final s = focus.activeSession;
    if (s != null && s.pausedAt == null) {
      s.pausedAt = DateTime.now().millisecondsSinceEpoch;
      changed();
    }
  }

  void resumeFocus() {
    final s = focus.activeSession;
    if (s != null && s.pausedAt != null) {
      s.endsAt += DateTime.now().millisecondsSinceEpoch - s.pausedAt!;
      s.pausedAt = null;
      changed();
    }
  }

  void finishFocus() {
    final s = focus.activeSession;
    if (s == null) return;
    final maxHistory = focus.missionHistory.fold<int>(
      0,
      (n, m) => max(n, m.orbitIndex),
    );
    final index = max(focus.lastOrbitIndex, maxHistory) + 1;
    const stops = ['Moon', 'Venus', 'Mars', 'Saturn', 'Earth'];
    focus.missionHistory.insert(
      0,
      MissionRecord(
        id: newId(),
        taskId: s.taskId,
        taskText: s.taskText,
        durationMinutes: s.durationMinutes,
        completedAt: DateTime.now().millisecondsSinceEpoch,
        orbitIndex: index,
        vehicleCode: 'ST-${index.toString().padLeft(3, '0')}',
        orbitLabel: stops[(index - 1) % stops.length],
      ),
    );
    focus.lastOrbitIndex = index;
    focus.missionHistory = focus.missionHistory
        .take(focus.archiveRetentionLimit)
        .toList();
    focus.activeSession = null;
    changed();
  }

  void cancelFocus() {
    focus.activeSession = null;
    changed();
  }

  void setRetention(int value) {
    if (![6, 12, 24].contains(value)) return;
    focus.archiveRetentionLimit = value;
    focus.missionHistory = focus.missionHistory.take(value).toList();
    changed();
  }

  Map<String, Map<String, dynamic>> syncRecords() => {
    for (final e in days.entries)
      'day:${e.key}': {
        'date': e.key,
        'tasks': e.value.map((t) => t.toJson()).toList(),
      },
    'goals': goals.toJson(),
    for (final mission in focus.missionHistory)
      'focus:${mission.id}': mission.toJson(),
  };
  Future<void> applySyncRecord(
    String key,
    Map<String, dynamic>? payload, {
    bool deleted = false,
  }) async {
    if (key.startsWith('day:')) {
      final d = key.substring(4);
      parseDate(d);
      if (deleted) {
        days.remove(d);
      } else {
        if (payload?['date'] != d || payload?['tasks'] is! List) {
          throw const FormatException('Invalid synced day');
        }
        days[d] = _parseTasks(payload!['tasks'] as List);
      }
    } else if (key == 'goals') {
      goals = deleted ? Goals() : Goals.fromJson(payload!);
    } else if (key.startsWith('focus:')) {
      final id = key.substring(6);
      final mission = deleted ? null : MissionRecord.fromJson(payload!);
      if (mission != null && mission.id != id) {
        throw const FormatException('Invalid mission ID');
      }
      focus.missionHistory.removeWhere((m) => m.id == id);
      if (mission != null) focus.missionHistory.add(mission);
      focus.missionHistory.sort(
        (a, b) => b.completedAt.compareTo(a.completedAt),
      );
      focus.lastOrbitIndex = focus.missionHistory.fold(
        focus.lastOrbitIndex,
        (n, m) => max(n, m.orbitIndex),
      );
      focus.missionHistory = focus.missionHistory
          .take(focus.archiveRetentionLimit)
          .toList();
    } else {
      throw const FormatException('Unknown sync record');
    }
    _undo = null;
    undoLabel = null;
    changed();
    await flush();
  }
}
