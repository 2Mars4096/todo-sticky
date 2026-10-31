import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../app.dart';
import '../models/goal_progress.dart';
import '../models/models.dart';
import '../models/workflow.dart';
import '../services/ai_service.dart';
import '../state/sticky_store.dart';
import 'archive_screen.dart';

class GoalPlanScreen extends StatefulWidget {
  final StickyStore store;
  final AiService ai;
  final String goalId;
  final VoidCallback openFocus;
  final ValueChanged<String>? openDay;

  const GoalPlanScreen({
    super.key,
    required this.store,
    required this.ai,
    required this.goalId,
    required this.openFocus,
    this.openDay,
  });

  @override
  State<GoalPlanScreen> createState() => _GoalPlanScreenState();
}

class _GoalPlanScreenState extends State<GoalPlanScreen> {
  final capture = TextEditingController();
  final selected = <String>{};
  late String date = widget.store.today;
  bool generating = false;

  @override
  void dispose() {
    capture.dispose();
    super.dispose();
  }

  String dayLabel(String value) => value == widget.store.today
      ? 'Today'
      : DateFormat('d MMM').format(parseDate(value));

  void addSteps(List<String> steps, {String? fingerprint}) {
    final before =
        widget.store
            .findGoal(widget.goalId)
            ?.plan
            .map((step) => step.id)
            .toSet() ??
        <String>{};
    widget.store.addGoalSteps(widget.goalId, steps, fingerprint: fingerprint);
    final goal = widget.store.findGoal(widget.goalId);
    setState(() {
      selected.addAll(
        goal?.plan
                .where((step) => !before.contains(step.id))
                .map((step) => step.id) ??
            <String>[],
      );
    });
  }

  void add() {
    if (capture.text.trim().isEmpty) return;
    try {
      addSteps([capture.text]);
      capture.clear();
    } catch (error) {
      showError(context, error);
    }
  }

  Future<void> generate(GoalItem goal) async {
    final snapshot = GoalItem.fromJson(goal.toJson());
    final fingerprint = jsonEncode(snapshot.toJson());
    setState(() => generating = true);
    try {
      final steps = await widget.ai.planGoal(
        widget.store.preferences,
        snapshot,
      );
      if (!mounted) return;
      final current = widget.store.findGoal(widget.goalId);
      if (current == null || jsonEncode(current.toJson()) != fingerprint) {
        throw StateError('This goal changed. Generate a fresh plan.');
      }
      setState(() => generating = false);
      final accepted = await showNoteSheet<List<String>>(
        context,
        _GoalPlanProposal(steps: steps),
      );
      if (!mounted || accepted == null || accepted.isEmpty) return;
      addSteps(accepted, fingerprint: fingerprint);
    } catch (error) {
      if (mounted) showError(context, error);
    } finally {
      if (mounted) setState(() => generating = false);
    }
  }

  Future<void> chooseDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: parseDate(date),
      firstDate: DateTime(1970),
      lastDate: DateTime(2100),
    );
    if (picked != null && mounted) setState(() => date = dateKey(picked));
  }

  void schedule() {
    try {
      final count = widget.store.scheduleGoalSteps(
        widget.goalId,
        selected,
        date,
      );
      setState(selected.clear);
      if (count == 0) return;
      final targetDate = date;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            '$count ${count == 1 ? 'task' : 'tasks'} added to ${dayLabel(targetDate)}',
          ),
          action: widget.openDay == null
              ? null
              : SnackBarAction(
                  label: 'Open',
                  onPressed: () => widget.openDay!(targetDate),
                ),
        ),
      );
    } catch (error) {
      showError(context, error);
    }
  }

  Future<void> editStep(GoalPlanStep step) async {
    final controller = TextEditingController(text: step.text);
    final text = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit step'),
        content: TextField(
          controller: controller,
          autofocus: true,
          minLines: 1,
          maxLines: 6,
          decoration: const InputDecoration(labelText: 'Step'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Save'),
          ),
        ],
      ),
    );
    Future<void>.delayed(const Duration(milliseconds: 400), controller.dispose);
    if (!mounted || text == null) return;
    try {
      widget.store.updateGoalStep(widget.goalId, step.id, text);
    } catch (error) {
      showError(context, error);
    }
  }

  Future<void> removeStep(GoalStepProgress progress) async {
    final remove = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Remove this step?'),
        content: Text(
          progress.scheduled
              ? 'The step leaves this plan. Its daily tasks stay linked to the goal.'
              : progress.step.text,
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Keep'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Remove'),
          ),
        ],
      ),
    );
    if (!mounted || remove != true) return;
    try {
      widget.store.removeGoalStep(widget.goalId, progress.step.id);
      setState(() => selected.remove(progress.step.id));
    } catch (error) {
      showError(context, error);
    }
  }

  Future<void> openStep(GoalStepProgress progress) async {
    final matches = widget.store.goalStepTasks(widget.goalId, progress.step.id);
    if (matches.isEmpty) return;
    DatedTask? dated = matches.first;
    if (matches.length > 1) {
      dated = await showNoteSheet<DatedTask>(
        context,
        ListView(
          shrinkWrap: true,
          padding: const EdgeInsets.fromLTRB(12, 0, 12, 24),
          children: [
            for (final match in matches)
              ListTile(
                title: Text(match.task.text),
                subtitle: Text(
                  '${dayLabel(match.date)} · ${statusText(match.task.status)}',
                ),
                trailing: const Icon(Icons.chevron_right),
                onTap: () => Navigator.pop(context, match),
              ),
          ],
        ),
      );
    }
    if (!mounted || dated == null) return;
    final row = archiveRows(widget.store.days)
        .where((row) => row.date == dated!.date && row.task.id == dated.task.id)
        .firstOrNull;
    if (row == null) return;
    await Navigator.push(
      context,
      MaterialPageRoute<void>(
        builder: (_) => TaskReviewScreen(
          store: widget.store,
          ai: widget.ai,
          row: row,
          openFocus: widget.openFocus,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.store,
    builder: (context, _) {
      final goal = widget.store.findGoal(widget.goalId);
      final progress = goal == null ? null : widget.store.goalProgress(goal);
      final available =
          progress?.steps
              .where((step) => !step.scheduled)
              .map((step) => step.step.id)
              .toSet() ??
          <String>{};
      selected.retainAll(available);
      final allSelected =
          available.isNotEmpty && selected.containsAll(available);
      return Scaffold(
        appBar: AppBar(
          title: const Text('Goal plan'),
          actions: [
            if (goal != null)
              IconButton(
                tooltip: 'Goal progress',
                icon: const Icon(Icons.bar_chart_outlined),
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute<void>(
                    builder: (_) => ArchiveScreen(
                      store: widget.store,
                      ai: widget.ai,
                      openFocus: widget.openFocus,
                      progress: true,
                      initialGoalId: goal.id,
                    ),
                  ),
                ),
              ),
          ],
        ),
        body: SafeArea(
          child: goal == null
              ? const Center(child: Text('This goal was removed.'))
              : Column(
                  children: [
                    if (widget.store.saveError != null)
                      MaterialBanner(
                        content: Text(widget.store.saveError!),
                        actions: [
                          TextButton(
                            onPressed: widget.store.retrySave,
                            child: const Text('Retry save'),
                          ),
                        ],
                      ),
                    Expanded(
                      child: ListView(
                        padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                        children: [
                          Text(
                            goal.text,
                            style: Theme.of(context).textTheme.headlineSmall
                                ?.copyWith(fontWeight: FontWeight.w700),
                          ),
                          if (progress!.total > 0) ...[
                            const SizedBox(height: 12),
                            Semantics(
                              label:
                                  '${progress.completed} of ${progress.total} plan steps completed',
                              child: LinearProgressIndicator(
                                value: progress.fraction,
                              ),
                            ),
                            const SizedBox(height: 8),
                          ],
                          Wrap(
                            alignment: WrapAlignment.spaceBetween,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 12,
                            runSpacing: 4,
                            children: [
                              if (goal.done || progress.total > 0)
                                Text(
                                  goal.done
                                      ? 'Goal complete'
                                      : progress.total == 0
                                      ? ''
                                      : '${progress.completed}/${progress.total} completed',
                                  style: const TextStyle(color: mutedInk),
                                ),
                              if (goal.done)
                                TextButton(
                                  onPressed: () {
                                    goal.done = false;
                                    widget.store.changed();
                                  },
                                  child: const Text('Reopen goal'),
                                )
                              else
                                TextButton.icon(
                                  onPressed: generating
                                      ? null
                                      : () => generate(goal),
                                  icon: generating
                                      ? const SizedBox(
                                          width: 18,
                                          height: 18,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2,
                                          ),
                                        )
                                      : const Icon(
                                          Icons.auto_awesome_outlined,
                                          size: 18,
                                        ),
                                  label: Text(
                                    generating
                                        ? 'Generating…'
                                        : 'Generate plan',
                                  ),
                                ),
                            ],
                          ),
                          if (!goal.done)
                            TextField(
                              controller: capture,
                              minLines: 1,
                              maxLines: 3,
                              textInputAction: TextInputAction.newline,
                              keyboardType: TextInputType.multiline,
                              decoration: InputDecoration(
                                labelText: 'Add a step',
                                suffixIcon: IconButton(
                                  tooltip: 'Add plan step',
                                  onPressed: add,
                                  icon: const Icon(Icons.add),
                                ),
                              ),
                            ),
                          if (available.length > 1 && !goal.done)
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: () => setState(() {
                                  if (allSelected) {
                                    selected.clear();
                                  } else {
                                    selected.addAll(available);
                                  }
                                }),
                                child: Text(
                                  allSelected
                                      ? 'Clear selection'
                                      : 'Select all',
                                ),
                              ),
                            )
                          else
                            const SizedBox(height: 12),
                          for (final step in progress.steps)
                            _stepRow(goal, step),
                        ],
                      ),
                    ),
                    if (!goal.done && available.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.fromLTRB(12, 8, 20, 12),
                        child: Row(
                          children: [
                            IconButton(
                              tooltip: 'Choose task date',
                              onPressed: chooseDate,
                              icon: const Icon(Icons.calendar_month_outlined),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: FilledButton.icon(
                                onPressed: selected.isEmpty ? null : schedule,
                                icon: const Icon(Icons.add_task, size: 18),
                                label: Text(
                                  'Add${selected.isEmpty ? '' : ' ${selected.length}'} to ${dayLabel(date)}',
                                  textAlign: TextAlign.center,
                                ),
                              ),
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

  Widget _stepRow(GoalItem goal, GoalStepProgress progress) {
    final step = progress.step;
    final dates = progress.tasks.map((task) => task.date).toSet();
    final state = progress.done
        ? 'Completed'
        : progress.stopped
        ? 'Stopped'
        : 'Scheduled';
    return ListTile(
      key: ValueKey('goal-step-${step.id}'),
      contentPadding: EdgeInsets.zero,
      leading: progress.scheduled
          ? Icon(
              progress.done
                  ? Icons.check_circle_outline
                  : progress.stopped
                  ? Icons.stop_circle_outlined
                  : Icons.event_outlined,
              color: progress.done ? amber : mutedInk,
            )
          : Checkbox(
              value: selected.contains(step.id),
              semanticLabel: 'Schedule ${step.text}',
              onChanged: goal.done
                  ? null
                  : (value) => setState(() {
                      value == true
                          ? selected.add(step.id)
                          : selected.remove(step.id);
                    }),
            ),
      title: Text(
        progress.tasks.length == 1
            ? progress.tasks.single.task.text
            : step.text,
      ),
      subtitle: progress.scheduled
          ? Text(
              '${dates.length == 1 ? dayLabel(dates.single) : '${dates.length} dates'} · $state',
              style: const TextStyle(color: mutedInk, fontSize: 12),
            )
          : null,
      onTap: progress.scheduled
          ? () => openStep(progress)
          : goal.done
          ? null
          : () => setState(() {
              selected.contains(step.id)
                  ? selected.remove(step.id)
                  : selected.add(step.id);
            }),
      trailing: goal.done
          ? (progress.scheduled
                ? const Icon(Icons.chevron_right, size: 18)
                : null)
          : PopupMenuButton<String>(
              tooltip: 'Plan step actions',
              icon: const Icon(Icons.more_horiz),
              onSelected: (action) {
                if (action == 'edit') editStep(step);
                if (action == 'open') openStep(progress);
                if (action == 'remove') removeStep(progress);
              },
              itemBuilder: (_) => [
                PopupMenuItem(
                  value: progress.scheduled ? 'open' : 'edit',
                  child: Text(
                    progress.scheduled ? 'Open daily task' : 'Edit step',
                  ),
                ),
                const PopupMenuItem(
                  value: 'remove',
                  child: Text('Remove from plan'),
                ),
              ],
            ),
    );
  }
}

class _GoalPlanProposal extends StatefulWidget {
  final List<String> steps;
  const _GoalPlanProposal({required this.steps});
  @override
  State<_GoalPlanProposal> createState() => _GoalPlanProposalState();
}

class _GoalPlanProposalState extends State<_GoalPlanProposal> {
  late final controllers = widget.steps
      .map((text) => TextEditingController(text: text))
      .toList();
  late final included = List<bool>.filled(widget.steps.length, true);

  @override
  void dispose() {
    for (final controller in controllers) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => SizedBox(
    height: MediaQuery.sizeOf(context).height * .8,
    child: Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 12),
          child: Align(
            alignment: Alignment.centerLeft,
            child: Text(
              'Review plan',
              style: Theme.of(context).textTheme.titleLarge,
            ),
          ),
        ),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            itemCount: controllers.length,
            itemBuilder: (context, index) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Checkbox(
                    value: included[index],
                    semanticLabel: 'Include step ${index + 1}',
                    onChanged: (value) =>
                        setState(() => included[index] = value!),
                  ),
                  Expanded(
                    child: TextField(
                      controller: controllers[index],
                      minLines: 1,
                      maxLines: 5,
                      decoration: InputDecoration(
                        labelText: 'Step ${index + 1}',
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 20),
          child: Wrap(
            alignment: WrapAlignment.end,
            spacing: 12,
            runSpacing: 8,
            children: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Discard'),
              ),
              FilledButton(
                onPressed: !included.any((value) => value)
                    ? null
                    : () {
                        final result = [
                          for (var i = 0; i < controllers.length; i++)
                            if (included[i] &&
                                controllers[i].text.trim().isNotEmpty)
                              controllers[i].text.trim(),
                        ];
                        if (result.isNotEmpty) Navigator.pop(context, result);
                      },
                child: const Text('Add steps'),
              ),
            ],
          ),
        ),
      ],
    ),
  );
}
