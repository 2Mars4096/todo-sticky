import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:flutter/foundation.dart';

import '../models/models.dart';
import '../models/goal_progress.dart';
import '../models/workflow.dart';
import '../services/persistence.dart';

class StickyStore extends ChangeNotifier {
  final StatePersistence persistence;
  final CredentialStore credentials;
  Map<String, List<Task>> days = {};
  Goals goals = Goals();
  Map<String, RoutineSchedule> routineSchedules = {};
  String? routineError;
  Object? _routineRaw;
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
      if (_materializeRoutines()) changed();
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
    final rawSchedules = j['routineSchedules'];
    final schedules = <String, RoutineSchedule>{};
    String? scheduleError;
    try {
      for (final entry in object(rawSchedules ?? {}).entries) {
        schedules[entry.key] = RoutineSchedule.fromJson(object(entry.value));
      }
    } catch (_) {
      scheduleError =
          'Routine schedules need recovery. Existing data has been kept.';
      schedules.clear();
    }
    _routineRaw = rawSchedules;
    routineError = scheduleError;
    routineSchedules = schedules;
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
    'routineSchedules': routineError != null
        ? _routineRaw
        : routineSchedules.map(
            (id, schedule) => MapEntry(id, schedule.toJson()),
          ),
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
    _materializeRoutines();
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
      if (_materializeRoutines()) changed();
      _notify();
    }
  }

  bool _materializeRoutines() {
    if (!ready || routineError != null) return false;
    var updated = false;
    for (final goal in goals.recurring) {
      final schedule = routineSchedules[goal.id];
      if (schedule == null || schedule.next(today) != today) continue;
      final id = routineTaskId(goal.id, today);
      if (!days.values
          .expand((list) => list)
          .expand((task) => task.flattened)
          .any((task) => task.id == id)) {
        (days[today] ??= []).add(Task(id: id, text: goal.text));
      }
      // Task and occurrence marker are saved atomically in the same notebook snapshot.
      schedule.handledThrough = today;
      updated = true;
    }
    return updated;
  }

  void configureRoutine(String id, String cadence) {
    if (routineError != null) throw StateError(routineError!);
    if (!['manual', 'daily', 'weekdays', 'weekly'].contains(cadence)) return;
    final handled = routineSchedules[id]?.handledThrough;
    routineSchedules[id] = RoutineSchedule(
      cadence: cadence,
      anchor: today,
      handledThrough: handled != null && handled.compareTo(today) > 0
          ? today
          : handled,
    );
    changed();
  }

  void pauseRoutine(String id) {
    final schedule = routineSchedules[id];
    if (schedule == null || routineError != null) return;
    schedule.paused = !schedule.paused;
    changed();
  }

  void skipRoutine(String id) {
    final schedule = routineSchedules[id];
    final next = schedule?.next(today);
    if (next == null || routineError != null) return;
    schedule!.handledThrough = next;
    changed();
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
    final goalId = goalIdForTask(task);
    for (final entry in days.entries) {
      if (entry.key.compareTo(date) >= 0) continue;
      for (final root in entry.value) {
        if (goalIdForTask(root) == goalId &&
            (root.id == task.id ||
                (root.goalStepId == task.goalStepId &&
                    root.text.trim().toLowerCase() == normalized))) {
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

  GoalItem? findGoal(String id) =>
      goals.targets.where((goal) => goal.id == id).firstOrNull;

  String? _ownGoalId(Task task) {
    if (task.goalId != null) return task.goalId;
    // The stable task ID also recovers provenance after a legacy client move.
    for (final goal in goals.targets) {
      if (goal.plan.any((step) => step.id == task.id)) return goal.id;
    }
    return null;
  }

  String? goalIdForTask(Task task) {
    final own = _ownGoalId(task);
    if (own != null) return own;
    String? visit(Task candidate, String? inherited) {
      final goalId = _ownGoalId(candidate) ?? inherited;
      if (identical(candidate, task) || candidate.id == task.id) return goalId;
      for (final child in candidate.subtasks) {
        final found = visit(child, goalId);
        if (found != null) return found;
      }
      return null;
    }

    for (final root in days.values.expand((list) => list)) {
      final found = visit(root, null);
      if (found != null) return found;
    }
    return null;
  }

  List<DatedTask> goalStepTasks(String goalId, String stepId) {
    final matches = <DatedTask>[];
    for (final entry in days.entries) {
      for (final task in entry.value.expand((root) => root.flattened)) {
        if ((task.goalId == goalId && task.goalStepId == stepId) ||
            (task.goalStepId == null &&
                task.id == stepId &&
                (task.goalId == null || task.goalId == goalId))) {
          matches.add(DatedTask(entry.key, task));
        }
      }
    }
    matches.sort((a, b) {
      final state = (a.task.closed ? 1 : 0).compareTo(b.task.closed ? 1 : 0);
      return state != 0 ? state : a.date.compareTo(b.date);
    });
    return matches;
  }

  GoalProgress goalProgress(GoalItem goal) {
    final byStep = {for (final step in goal.plan) step.id: <DatedTask>[]};
    // One archive pass per goal, even when the plan contains many steps.
    for (final entry in days.entries) {
      for (final task in entry.value.expand((root) => root.flattened)) {
        final matches = byStep[task.goalStepId ?? task.id];
        if (matches != null &&
            (task.goalId == goal.id ||
                (task.goalId == null && task.goalStepId == null))) {
          matches.add(DatedTask(entry.key, task));
        }
      }
    }
    return GoalProgress(
      goal,
      goal.plan
          .map((step) => GoalStepProgress(step, byStep[step.id]!))
          .toList(),
    );
  }

  List<DatedTask> tasksForGoal(String goalId, {String? from, String? until}) {
    final matches = <DatedTask>[];
    void visit(String date, Task task, String? parentGoal) {
      final linkedGoal = _ownGoalId(task) ?? parentGoal;
      // A root and its descendants are one unit of work for goal totals.
      if (linkedGoal == goalId && parentGoal != goalId) {
        matches.add(DatedTask(date, task));
      }
      for (final child in task.subtasks) {
        visit(date, child, linkedGoal);
      }
    }

    for (final entry in days.entries) {
      if (from != null && entry.key.compareTo(from) < 0) continue;
      if (until != null && entry.key.compareTo(until) > 0) continue;
      for (final root in entry.value) {
        visit(entry.key, root, null);
      }
    }
    matches.sort((a, b) => b.date.compareTo(a.date));
    return matches;
  }

  GoalItem _editableGoal(String id) {
    if (!ready) throw StateError('Notebook is loading');
    final goal = findGoal(id);
    if (goal == null) throw StateError('This goal was removed.');
    if (goal.done) {
      throw StateError('Reopen this goal before changing its plan.');
    }
    return goal;
  }

  void addGoalSteps(String goalId, List<String> texts, {String? fingerprint}) {
    final goal = _editableGoal(goalId);
    if (fingerprint != null && jsonEncode(goal.toJson()) != fingerprint) {
      throw StateError('This goal changed. Generate a fresh plan.');
    }
    final known = goal.plan.map((step) => step.text.trim()).toSet();
    final additions = <GoalPlanStep>[];
    for (final raw in texts) {
      final text = raw.trim();
      if (text.isEmpty || text.length > 5000) {
        throw ArgumentError('Steps must contain 1–5,000 characters.');
      }
      if (known.add(text)) additions.add(GoalPlanStep(text: text));
    }
    if (goal.plan.length + additions.length > 200) {
      throw StateError('A goal can contain up to 200 steps.');
    }
    if (additions.isEmpty) return;
    goal.plan.addAll(additions);
    changed();
  }

  void updateGoalStep(String goalId, String stepId, String text) {
    final goal = _editableGoal(goalId);
    final step = goal.plan.where((step) => step.id == stepId).firstOrNull;
    if (step == null) throw StateError('This step was removed.');
    if (goalStepTasks(goalId, stepId).isNotEmpty) {
      throw StateError('Edit this step in its daily task.');
    }
    if (text.trim().isEmpty || text.trim().length > 5000) {
      throw ArgumentError('Steps must contain 1–5,000 characters.');
    }
    step.text = text.trim();
    changed();
  }

  void removeGoalStep(String goalId, String stepId) {
    final goal = _editableGoal(goalId);
    if (!goal.plan.any((step) => step.id == stepId)) return;
    for (final dated in goalStepTasks(goalId, stepId)) {
      dated.task.goalId = goalId;
      dated.task.goalStepId = null;
    }
    goal.plan.removeWhere((step) => step.id == stepId);
    changed();
  }

  int scheduleGoalSteps(String goalId, Iterable<String> stepIds, String date) {
    final goal = _editableGoal(goalId);
    if (!RegExp(r'^[A-Za-z0-9_-]{1,128}$').hasMatch(goalId)) {
      throw StateError(
        'This older goal cannot be linked safely. Create a new goal before scheduling its steps.',
      );
    }
    parseDate(date);
    final selected = stepIds.toSet();
    if (!selected.every((id) => goal.plan.any((step) => step.id == id))) {
      throw StateError('The selected plan changed. Select the steps again.');
    }
    final additions = <Task>[];
    for (final step in goal.plan.where((step) => selected.contains(step.id))) {
      if (goalStepTasks(goalId, step.id).isNotEmpty) continue;
      if (days.values
          .expand((list) => list)
          .expand((root) => root.flattened)
          .any((task) => task.id == step.id)) {
        throw StateError(
          'A task with this identity already exists. No steps were scheduled.',
        );
      }
      additions.add(
        Task(id: step.id, text: step.text, goalId: goalId, goalStepId: step.id),
      );
    }
    if (additions.isEmpty) return 0;
    (days[date] ??= []).addAll(additions);
    // All selected tasks and their links share one atomic notebook snapshot.
    _undo = null;
    undoLabel = null;
    changed();
    return additions.length;
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
      task.goalId = goalIdForTask(parent);
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

  void moveTask(String fromDate, String id, String toDate, {String? beforeId}) {
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
    task.goalId ??= goalIdForTask(original);
    final destinationIds = destination
        .expand((root) => root.flattened)
        .map((item) => item.id)
        .toSet();
    if (task.flattened.any((item) => destinationIds.contains(item.id))) {
      throw StateError(
        'This task or one of its steps already exists on the destination date',
      );
    }
    // Copies retain identity across dates. A collision merges child moves instead of duplicating IDs.
    if (parent == null) {
      if (destination.any((t) => t.id == task.id)) {
        throw StateError('This task already exists on the destination date');
      }
      final index = beforeId == null
          ? -1
          : destination.indexWhere((item) => item.id == beforeId);
      if (index < 0) {
        destination.add(task);
      } else {
        destination.insert(index, task);
      }
    } else {
      var target = destination
          .where(
            (t) =>
                t.id == parent!.id ||
                (t.text == parent.text &&
                    goalIdForTask(parent) == null &&
                    goalIdForTask(t) == null),
          )
          .firstOrNull;
      if (target == null) {
        target = Task(
          id: parent.id,
          text: parent.text,
          finish: parent.finish == null
              ? null
              : FinishPromise.fromJson(parent.finish!.toJson()),
          goalId: goalIdForTask(parent),
          goalStepId: parent.goalStepId,
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
        task.subtasks.add(Task(text: text.trim(), goalId: goalIdForTask(task)));
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
          if (replaceablePlanStep(parent.subtasks[i], plan.date))
            (index: i, task: parent.subtasks[i].clone()),
      ];
      if (old.isNotEmpty) removed['${dated.date}/${parent.id}'] = old;
      parent.subtasks.removeWhere((t) => replaceablePlanStep(t, plan.date));
      for (final block in plan.blocks.where(
        (b) => b.taskId == parent.id && b.sourceDate == dated.date,
      )) {
        final text =
            '${block.time}–${block.endTime} ${block.action}${block.assignedTo == 'human' ? '' : ' [${block.assignedTo}]'}';
        if (parent.subtasks.any((step) => step.text == text)) continue;
        final step = Task(
          id: '$prefix${newId()}_h${planTextHash(text)}',
          text: text,
          goalId: goalIdForTask(parent),
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
