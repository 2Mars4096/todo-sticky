import 'package:flutter/material.dart';

import '../models/models.dart';
import '../models/project_plan.dart';
import '../services/ai_service.dart';
import '../state/sticky_store.dart';

class ProjectScheduleScreen extends StatefulWidget {
  final StickyStore store;
  final AiService ai;
  final String goalId;
  const ProjectScheduleScreen({
    super.key,
    required this.store,
    required this.ai,
    required this.goalId,
  });
  @override
  State<ProjectScheduleScreen> createState() => _ProjectScheduleScreenState();
}

class _ProjectScheduleScreenState extends State<ProjectScheduleScreen> {
  late String from = widget.store.today;
  late String until = dateKey(
    DateTime(
      parseDate(from).year,
      parseDate(from).month,
      parseDate(from).day + 6,
    ),
  );
  int budget = 60;
  bool weekdays = false, busy = false, applied = false;
  String? error, fingerprint;
  List<ProjectAction>? proposal;
  final scroll = ScrollController();
  final resultKey = GlobalKey();
  ProjectWindow get window => ProjectWindow(
    from: from,
    until: until,
    minutes: budget,
    weekdays: weekdays,
  );
  @override
  void dispose() {
    scroll.dispose();
    super.dispose();
  }

  Future<void> chooseRange() async {
    final range = await showDateRangePicker(
      context: context,
      firstDate: parseDate(widget.store.today),
      lastDate: DateTime(2100),
      initialDateRange: DateTimeRange(
        start: parseDate(from),
        end: parseDate(until),
      ),
    );
    if (mounted && range != null) {
      setState(() {
        from = dateKey(range.start);
        until = dateKey(range.end);
        proposal = null;
        error = null;
      });
    }
  }

  Future<void> generate() async {
    setState(() {
      busy = true;
      error = null;
      proposal = null;
      applied = false;
    });
    try {
      window.validate();
      final goal = widget.store.findGoal(widget.goalId);
      if (goal == null || goal.done) {
        throw StateError('Open an active project to plan its work.');
      }
      final key = widget.store.projectFingerprint(goal.id);
      final snapshot = GoalItem.fromJson(goal.toJson());
      final scheduled = widget.store
          .tasksForGoal(goal.id)
          .map((row) => DatedTask(row.date, row.task.clone()))
          .toList();
      final other = <DatedTask>[
        for (final entry in widget.store.days.entries)
          if (entry.key.compareTo(from) >= 0 && entry.key.compareTo(until) <= 0)
            for (final task in entry.value)
              if (!task.closed) DatedTask(entry.key, task.clone()),
      ];
      final result = await widget.ai.planProject(
        widget.store.preferences,
        snapshot,
        window,
        scheduled,
        other,
      );
      if (!mounted) return;
      if (widget.store.projectFingerprint(goal.id) != key) {
        throw StateError(
          'Project or daily work changed. Generate a fresh proposal.',
        );
      }
      setState(() {
        proposal = result;
        fingerprint = key;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted && resultKey.currentContext != null) {
          Scrollable.ensureVisible(resultKey.currentContext!);
        }
      });
    } catch (cause) {
      if (mounted) {
        setState(
          () => error = cause
              .toString()
              .replaceFirst('Bad state: ', '')
              .replaceFirst('Invalid argument(s): ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> edit(ProjectAction action) async {
    final text = TextEditingController(text: action.text),
        minutes = TextEditingController(text: action.minutes.toString());
    String selected = action.date;
    final accepted = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, update) => AlertDialog(
          title: const Text('Edit task'),
          scrollable: true,
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: text,
                minLines: 2,
                maxLines: 6,
                decoration: const InputDecoration(labelText: 'Task'),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: minutes,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'Minutes'),
              ),
              TextButton.icon(
                icon: const Icon(Icons.calendar_today_outlined, size: 18),
                label: Text(selected),
                onPressed: () async {
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: parseDate(selected),
                    firstDate: parseDate(from),
                    lastDate: parseDate(until),
                  );
                  if (picked != null && context.mounted) {
                    update(() => selected = dateKey(picked));
                  }
                },
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Save'),
            ),
          ],
        ),
      ),
    );
    if (accepted == true && mounted) {
      setState(() {
        action.text = text.text;
        action.minutes = int.tryParse(minutes.text) ?? 0;
        action.date = selected;
        error = null;
      });
    }
    Future<void>.delayed(const Duration(milliseconds: 400), () {
      text.dispose();
      minutes.dispose();
    });
  }

  Future<void> apply() async {
    if (busy || applied || proposal == null) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      widget.store.applyProjectPlan(
        widget.goalId,
        proposal!,
        window,
        fingerprint!,
      );
      // Mutation is complete even if storage fails. Retry saves, never reapplies the plan.
      setState(() => applied = true);
      await widget.store.flush();
      if (mounted) Navigator.pop(context, true);
    } catch (cause) {
      if (mounted) {
        setState(
          () => error = cause
              .toString()
              .replaceFirst('Bad state: ', '')
              .replaceFirst('Invalid argument(s): ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.store,
    builder: (context, _) {
      final goal = widget.store.findGoal(widget.goalId);
      final stale =
          fingerprint != null &&
          widget.store.projectFingerprint(widget.goalId) != fingerprint;
      String? validation;
      if (proposal != null && !applied && goal != null) {
        try {
          validateProjectActions(
            proposal!,
            goal,
            goal.plan
                .where(
                  (step) =>
                      widget.store.goalStepTasks(goal.id, step.id).isNotEmpty,
                )
                .map((step) => step.id)
                .toSet(),
            window,
          );
        } catch (cause) {
          validation = cause
              .toString()
              .replaceFirst('Bad state: ', '')
              .replaceFirst('Invalid argument(s): ', '');
        }
      }
      final actions = [...?proposal]..sort((a, b) => a.date.compareTo(b.date));
      return Scaffold(
        appBar: AppBar(title: const Text('Plan across days')),
        body: SafeArea(
          child: Column(
            children: [
              Expanded(
                child: ListView(
                  controller: scroll,
                  padding: const EdgeInsets.all(20),
                  children: [
                    Text(
                      goal?.text ?? 'Project removed',
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 12),
                    OutlinedButton.icon(
                      onPressed: busy || applied ? null : chooseRange,
                      icon: const Icon(Icons.date_range),
                      label: Text('$from → $until'),
                    ),
                    Wrap(
                      spacing: 12,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        const Text('Daily project budget'),
                        DropdownButton<int>(
                          value: budget,
                          items: [
                            for (final n in [
                              15,
                              30,
                              45,
                              60,
                              90,
                              120,
                              180,
                              240,
                              480,
                            ])
                              DropdownMenuItem(value: n, child: Text('$n min')),
                          ],
                          onChanged: busy || applied
                              ? null
                              : (value) => setState(() {
                                  budget = value!;
                                  proposal = null;
                                }),
                        ),
                        FilterChip(
                          label: const Text('Weekdays only'),
                          selected: weekdays,
                          onSelected: busy || applied
                              ? null
                              : (value) => setState(() {
                                  weekdays = value;
                                  proposal = null;
                                }),
                        ),
                      ],
                    ),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: FilledButton.icon(
                        onPressed: busy || applied || goal == null || goal.done
                            ? null
                            : generate,
                        icon: busy
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.auto_awesome_outlined),
                        label: Text(
                          busy
                              ? 'Working…'
                              : proposal == null
                              ? 'Generate proposal'
                              : 'Generate again',
                        ),
                      ),
                    ),
                    if (error != null)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Text(
                          error!,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                          ),
                        ),
                      ),
                    if (proposal != null) ...[
                      const SizedBox(height: 16),
                      Text(
                        applied
                            ? 'Tasks added'
                            : '${actions.length} proposed tasks',
                        key: resultKey,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      for (final action in actions) ...[
                        const Divider(),
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(action.text),
                          subtitle: Text(
                            '${action.date} · ${action.minutes} min',
                          ),
                          onTap: busy || applied ? null : () => edit(action),
                          trailing: applied
                              ? const Icon(Icons.check, size: 18)
                              : Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    IconButton(
                                      tooltip: 'Edit proposed task',
                                      icon: const Icon(
                                        Icons.edit_outlined,
                                        size: 18,
                                      ),
                                      onPressed: busy
                                          ? null
                                          : () => edit(action),
                                    ),
                                    IconButton(
                                      tooltip: 'Remove proposed task',
                                      icon: const Icon(Icons.close, size: 18),
                                      onPressed: busy
                                          ? null
                                          : () => setState(
                                              () => proposal!.remove(action),
                                            ),
                                    ),
                                  ],
                                ),
                        ),
                      ],
                      if (!applied && stale)
                        const Text(
                          'Project or daily work changed. Generate a fresh proposal.',
                        ),
                      if (validation != null)
                        Text(
                          validation,
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.error,
                          ),
                        ),
                    ],
                  ],
                ),
              ),
              if (proposal != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                  child: Wrap(
                    spacing: 12,
                    runSpacing: 8,
                    alignment: WrapAlignment.end,
                    children: [
                      TextButton(
                        onPressed: busy ? null : () => Navigator.pop(context),
                        child: Text(applied ? 'Done' : 'Discard'),
                      ),
                      if (applied && widget.store.saveError != null)
                        FilledButton(
                          onPressed: busy
                              ? null
                              : () async {
                                  await widget.store.retrySave();
                                  if (context.mounted &&
                                      widget.store.saveError == null) {
                                    Navigator.pop(context, true);
                                  }
                                },
                          child: const Text('Retry save'),
                        ),
                      if (!applied)
                        FilledButton(
                          onPressed: busy || stale || validation != null
                              ? null
                              : apply,
                          child: const Text('Add to daily tasks'),
                        ),
                    ],
                  ),
                ),
            ],
          ),
        ),
      );
    },
  );
}
