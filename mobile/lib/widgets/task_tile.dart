import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/semantics.dart';
import 'package:intl/intl.dart';

import '../app.dart';
import '../models/models.dart';
import '../state/sticky_store.dart';
import '../services/ai_service.dart';
import '../screens/goal_plan_screen.dart';

class TaskTile extends StatefulWidget {
  final StickyStore store;
  final AiService ai;
  final String date;
  final Task task;
  final VoidCallback openFocus;
  final bool showDate;
  final int depth;
  final String? parentId;
  final int? reorderIndex;
  final Widget? dragHandle;
  final String? revealId;
  const TaskTile({
    super.key,
    required this.store,
    required this.ai,
    required this.date,
    required this.task,
    required this.openFocus,
    this.showDate = false,
    this.depth = 0,
    this.parentId,
    this.reorderIndex,
    this.dragHandle,
    this.revealId,
  });
  @override
  State<TaskTile> createState() => _TaskTileState();
}

class _TaskTileState extends State<TaskTile> {
  bool expanded = false;
  @override
  void initState() {
    super.initState();
    expanded =
        widget.revealId != null && widget.task.find(widget.revealId!) != null;
  }

  bool adding = false;
  bool busy = false;
  final step = TextEditingController();
  @override
  void dispose() {
    step.dispose();
    super.dispose();
  }

  Future<void> suggest() async {
    final original = widget.task.clone();
    final fingerprint = jsonEncode(original.toJson());
    setState(() => busy = true);
    try {
      final result = await widget.ai.breakdown(
        widget.store.preferences,
        original,
      );
      if (!mounted) return;
      final accept = await showNoteSheet<bool>(
        context,
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Suggested steps',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              const SizedBox(height: 16),
              for (final text in result.steps)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(Icons.check_box_outline_blank, size: 20),
                      const SizedBox(width: 12),
                      Expanded(child: Text(text)),
                    ],
                  ),
                ),
              const SizedBox(height: 12),
              Row(
                children: [
                  TextButton(
                    onPressed: () => Navigator.pop(context, false),
                    child: const Text('Discard'),
                  ),
                  const Spacer(),
                  FilledButton(
                    onPressed: () => Navigator.pop(context, true),
                    child: const Text('Add steps'),
                  ),
                ],
              ),
            ],
          ),
        ),
      );
      if (accept == true) {
        widget.store.addBreakdown(
          widget.date,
          original.id,
          fingerprint,
          result.steps,
        );
        if (mounted) setState(() => expanded = true);
      }
    } catch (e) {
      if (mounted) showError(context, e);
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> finish() async {
    final task = widget.task;
    if (task.closed) {
      widget.store.updateTask(widget.date, task.id, status: TaskStatus.todo);
      return;
    }
    if (task.finish?.doneWhen?.trim().isNotEmpty != true) {
      widget.store.updateTask(widget.date, task.id, status: TaskStatus.done);
      return;
    }
    final choice = await showNoteSheet<String>(
      context,
      Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'What happened?',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Text(task.finish!.doneWhen!, style: const TextStyle(fontSize: 18)),
            const SizedBox(height: 20),
            ListTile(
              leading: const Icon(Icons.check_circle_outline),
              title: const Text('Complete'),
              subtitle: const Text('The outcome is reached.'),
              onTap: () => Navigator.pop(context, 'done'),
            ),
            ListTile(
              leading: const Icon(Icons.edit_outlined),
              title: const Text('Revise'),
              subtitle: const Text('Keep working, adjust the outcome.'),
              onTap: () => Navigator.pop(context, 'revise'),
            ),
            ListTile(
              leading: const Icon(Icons.stop_circle_outlined),
              title: const Text('Stop'),
              subtitle: const Text(
                'Close deliberately without marking it achieved.',
              ),
              onTap: () => Navigator.pop(context, 'stopped'),
            ),
          ],
        ),
      ),
    );
    if (!mounted || choice == null) return;
    if (choice == 'revise') {
      await editTask(context, widget.store, widget.ai, widget.date, task);
    } else {
      widget.store.updateTask(
        widget.date,
        task.id,
        status: choice == 'done' ? TaskStatus.done : TaskStatus.stopped,
      );
    }
  }

  void addStep() {
    if (step.text.trim().isEmpty) return;
    try {
      widget.store.addTask(
        step.text,
        date: widget.date,
        parentId: widget.task.id,
      );
      step.clear();
    } catch (e) {
      showError(context, e);
    }
  }

  Future<void> move() async {
    final destination = widget.store.carryDestination(widget.date);
    final selected = await showNoteSheet<String>(
      context,
      Padding(
        padding: const EdgeInsets.fromLTRB(12, 0, 12, 20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.arrow_forward_rounded),
              title: Text(
                destination == widget.store.today
                    ? 'Move to today'
                    : 'Move to ${DateFormat('EEE, d MMM').format(parseDate(destination))}',
              ),
              onTap: () => Navigator.pop(context, destination),
            ),
            ListTile(
              leading: const Icon(Icons.calendar_month_outlined),
              title: const Text('Choose another date'),
              onTap: () async {
                final picked = await showDatePicker(
                  context: context,
                  initialDate: parseDate(destination),
                  firstDate: DateTime(1970),
                  lastDate: DateTime(2100),
                );
                if (mounted && picked != null) {
                  Navigator.pop(context, dateKey(picked));
                }
              },
            ),
          ],
        ),
      ),
    );
    if (selected != null) {
      try {
        widget.store.moveTask(widget.date, widget.task.id, selected);
      } catch (e) {
        if (mounted) showError(context, e);
      }
    }
  }

  String agentPrompt() {
    final task = widget.task;
    return 'Execute the following task completely.\n\nObjective\n${task.text}\n${task.finish?.doneWhen == null ? '' : 'Done when: ${task.finish!.doneWhen}\n'}${task.finish?.by == null ? '' : 'Committed deadline: ${task.finish!.by}\n'}\nChecklist\n${task.subtasks.isEmpty ? '- Determine the concrete steps needed to complete the objective.' : task.subtasks.map((s) => '- ${s.text}').join('\n')}\n\nWorking rules\n- Inspect relevant context before changing anything.\n- Preserve existing work and avoid unrelated changes.\n- Complete the checklist and verify the result.\n- Report exact blockers and remaining follow-ups.\n';
  }

  @override
  Widget build(BuildContext context) {
    final task = widget.task;
    final goalId = widget.store.goalIdForTask(task);
    final goal = goalId == null ? null : widget.store.findGoal(goalId);
    final storedIndex = widget.store
        .tasksFor(widget.date)
        .indexWhere((row) => row.id == task.id);
    final unfinished = task.subtasks.where((s) => !s.closed).length;
    final history = widget.depth == 0
        ? widget.store.historicalSteps(widget.date, task)
        : <DatedTask>[];
    return Material(
      color: expanded
          ? Colors.white.withValues(alpha: .30)
          : Colors.transparent,
      child: Padding(
        padding: EdgeInsets.only(
          left: widget.depth == 0 ? 12 : 12,
          right: widget.depth == 0 ? 12 : 0,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (widget.dragHandle != null)
                  widget.dragHandle!
                else if (widget.reorderIndex != null)
                  ReorderableDragStartListener(
                    index: widget.reorderIndex!,
                    child: Semantics(
                      label: 'Reorder ${task.text}',
                      customSemanticsActions: {
                        const CustomSemanticsAction(label: 'Move up'): () =>
                            widget.store.reorder(
                              widget.date,
                              null,
                              storedIndex,
                              storedIndex - 1,
                            ),
                        const CustomSemanticsAction(label: 'Move down'): () =>
                            widget.store.reorder(
                              widget.date,
                              null,
                              storedIndex,
                              storedIndex + 2,
                            ),
                      },
                      child: const Tooltip(
                        message: 'Drag to reorder',
                        child: SizedBox(
                          width: 44,
                          height: 52,
                          child: Icon(
                            Icons.drag_indicator,
                            size: 18,
                            color: mutedInk,
                          ),
                        ),
                      ),
                    ),
                  ),
                SizedBox(
                  width: 44,
                  height: 52,
                  child: IconButton(
                    tooltip: task.closed ? 'Reopen task' : 'Complete task',
                    onPressed: finish,
                    icon: Icon(
                      task.status == TaskStatus.done
                          ? Icons.check_box_rounded
                          : task.status == TaskStatus.stopped
                          ? Icons.stop_circle_outlined
                          : task.status == TaskStatus.partial
                          ? Icons.indeterminate_check_box_outlined
                          : task.status == TaskStatus.question
                          ? Icons.help_outline
                          : Icons.check_box_outline_blank,
                      color: task.closed ? mutedInk : amber,
                    ),
                  ),
                ),
                Expanded(
                  child: InkWell(
                    onTap: () => setState(() => expanded = !expanded),
                    onDoubleTap: () => editTask(
                      context,
                      widget.store,
                      widget.ai,
                      widget.date,
                      task,
                    ),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            task.text,
                            style: TextStyle(
                              fontSize: widget.depth == 0 ? 16 : 15,
                              fontWeight:
                                  widget.depth == 0 &&
                                      task.text.length <= 160 &&
                                      !task.text.contains('\n')
                                  ? FontWeight.w600
                                  : FontWeight.w400,
                              color: task.closed ? mutedInk : ink,
                              decoration: task.status == TaskStatus.done
                                  ? TextDecoration.lineThrough
                                  : null,
                            ),
                          ),
                          if (task.finish?.doneWhen?.isNotEmpty == true)
                            Padding(
                              padding: const EdgeInsets.only(top: 5),
                              child: Text(
                                'Outcome · ${task.finish!.doneWhen}',
                                style: const TextStyle(
                                  color: mutedInk,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                          if (task.finish?.by != null ||
                              widget.showDate ||
                              (widget.depth == 0 && goal != null) ||
                              task.status == TaskStatus.stopped ||
                              task.finish?.reviewReady == true)
                            Padding(
                              padding: const EdgeInsets.only(top: 6),
                              child: Wrap(
                                spacing: 12,
                                runSpacing: 4,
                                children: [
                                  if (widget.depth == 0 && goal != null)
                                    Semantics(
                                      button: true,
                                      label: 'Open goal ${goal.text}',
                                      child: Tooltip(
                                        message: 'Open goal plan',
                                        child: InkWell(
                                          onTap: () => Navigator.push(
                                            context,
                                            MaterialPageRoute<void>(
                                              builder: (_) => GoalPlanScreen(
                                                store: widget.store,
                                                ai: widget.ai,
                                                goalId: goal.id,
                                                openFocus: widget.openFocus,
                                              ),
                                            ),
                                          ),
                                          child: Padding(
                                            padding: const EdgeInsets.symmetric(
                                              vertical: 4,
                                            ),
                                            child: Row(
                                              mainAxisSize: MainAxisSize.min,
                                              children: [
                                                const Icon(
                                                  Icons.flag_outlined,
                                                  size: 14,
                                                  color: mutedInk,
                                                ),
                                                const SizedBox(width: 4),
                                                Flexible(
                                                  child: Text(
                                                    goal.text,
                                                    maxLines: 1,
                                                    overflow:
                                                        TextOverflow.ellipsis,
                                                    style: const TextStyle(
                                                      color: mutedInk,
                                                      fontSize: 12,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ),
                                    ),
                                  if (task.finish?.by != null)
                                    Text(
                                      'Due ${DateFormat('d MMM').format(parseDate(task.finish!.by!))}',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color:
                                            task.finish!.by!.compareTo(
                                                      widget.store.today,
                                                    ) <
                                                    0 &&
                                                !task.closed
                                            ? const Color(0xffa64230)
                                            : mutedInk,
                                      ),
                                    ),
                                  if (widget.showDate)
                                    Text(
                                      DateFormat('d MMM')
                                          .format(parseDate(widget.date)),
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: mutedInk,
                                      ),
                                    ),
                                  if (task.status == TaskStatus.stopped)
                                    const Text(
                                      'Stopped',
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: mutedInk,
                                      ),
                                    ),
                                  if (task.finish?.reviewReady == true)
                                    const Text(
                                      'Ready for outcome review',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: amber,
                                      ),
                                    ),
                                ],
                              ),
                            ),
                          if (!expanded && task.subtasks.isNotEmpty)
                            Padding(
                              padding: const EdgeInsets.only(top: 7),
                              child: Text(
                                '$unfinished steps left${unfinished == 0 ? '' : ' · ${task.subtasks.firstWhere((s) => !s.closed).text}'}',
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: mutedInk,
                                  fontSize: 12,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
                IconButton(
                  tooltip: expanded
                      ? 'Hide task actions and steps'
                      : 'Show task actions and steps',
                  onPressed: () => setState(() => expanded = !expanded),
                  icon: Icon(expanded ? Icons.expand_less : Icons.expand_more),
                ),
              ],
            ),
            if (expanded) ...[
              Padding(
                padding: const EdgeInsets.only(left: 44),
                child: Wrap(
                  spacing: 4,
                  runSpacing: 2,
                  children: [
                    IconButton(
                      tooltip: 'Focus on task',
                      onPressed: widget.store.focus.activeSession != null
                          ? null
                          : () {
                              widget.store.startFocus(
                                task,
                                widget.store.focus.sessionDurationMinutes,
                              );
                              widget.openFocus();
                            },
                      icon: const Icon(Icons.nightlight_outlined, size: 18),
                    ),
                    if (!task.closed)
                      IconButton(
                        tooltip: 'Add a step',
                        onPressed: () => setState(() => adding = !adding),
                        icon: const Icon(Icons.add, size: 18),
                      ),
                    if (!task.closed)
                      IconButton(
                        tooltip: busy
                            ? 'Preparing suggested steps'
                            : 'Suggest steps with AI',
                        onPressed: busy ? null : suggest,
                        icon: busy
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.auto_awesome_outlined, size: 18),
                      ),
                    IconButton(
                      tooltip: 'Move task · due date stays unchanged',
                      onPressed: move,
                      icon: const Icon(Icons.arrow_forward, size: 20),
                    ),
                    PopupMenuButton<String>(
                      tooltip: 'More task actions',
                      icon: const Icon(Icons.more_horiz, size: 20),
                      onSelected: (action) async {
                        if (action == 'edit') {
                          await editTask(
                            context,
                            widget.store,
                            widget.ai,
                            widget.date,
                            task,
                          );
                        }
                        if (action == 'delete') {
                          widget.store.deleteTask(widget.date, task.id);
                        }
                        if (action == 'copy') {
                          await Clipboard.setData(
                            ClipboardData(text: agentPrompt()),
                          );
                          if (context.mounted) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Agent prompt copied'),
                              ),
                            );
                          }
                        }
                        if (action == 'question') {
                          widget.store.updateTask(
                            widget.date,
                            task.id,
                            status: TaskStatus.question,
                          );
                        }
                        if (action == 'partial') {
                          widget.store.updateTask(
                            widget.date,
                            task.id,
                            status: TaskStatus.partial,
                          );
                        }
                        if (action == 'stop') {
                          widget.store.updateTask(
                            widget.date,
                            task.id,
                            status: TaskStatus.stopped,
                          );
                        }
                      },
                      itemBuilder: (_) => [
                        const PopupMenuItem(
                          value: 'edit',
                          child: Text('Edit task'),
                        ),
                        const PopupMenuItem(
                          value: 'copy',
                          child: Text('Copy as agent prompt'),
                        ),
                        if (!task.closed) ...[
                          const PopupMenuItem(
                            value: 'question',
                            child: Text('Mark as question'),
                          ),
                          const PopupMenuItem(
                            value: 'partial',
                            child: Text('Mark partly done'),
                          ),
                          const PopupMenuItem(
                            value: 'stop',
                            child: Text('Stop task'),
                          ),
                        ],
                        const PopupMenuItem(
                          value: 'delete',
                          child: Text('Delete task'),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (adding)
                Padding(
                  padding: const EdgeInsets.fromLTRB(44, 4, 8, 12),
                  child: TextField(
                    controller: step,
                    autofocus: true,
                    textInputAction: TextInputAction.newline,
                    keyboardType: TextInputType.multiline,
                    minLines: 1,
                    maxLines: View.of(context).viewInsets.bottom > 0 ? 3 : 6,
                    decoration: InputDecoration(
                      hintText: 'Add a step',
                      suffixIcon: IconButton(
                        tooltip: 'Add step',
                        onPressed: addStep,
                        icon: const Icon(Icons.add),
                      ),
                    ),
                  ),
                ),
              for (var i = 0; i < task.subtasks.length; i++)
                if (widget.store.preferences.showCompleted ||
                    !task.subtasks[i].closed)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: TaskTile(
                          key: ValueKey(task.subtasks[i].id),
                          store: widget.store,
                          ai: widget.ai,
                          date: widget.date,
                          task: task.subtasks[i],
                          openFocus: widget.openFocus,
                          depth: widget.depth + 1,
                          parentId: task.id,
                          revealId: widget.revealId,
                        ),
                      ),
                      if (task.subtasks.length > 1)
                        SizedBox(
                          width: 32,
                          child: Column(
                            children: [
                              IconButton(
                                tooltip: 'Move step up',
                                padding: EdgeInsets.zero,
                                onPressed: i == 0
                                    ? null
                                    : () => widget.store.reorder(
                                        widget.date,
                                        task.id,
                                        i,
                                        i - 1,
                                      ),
                                icon: const Icon(
                                  Icons.keyboard_arrow_up,
                                  size: 20,
                                ),
                              ),
                              IconButton(
                                tooltip: 'Move step down',
                                padding: EdgeInsets.zero,
                                onPressed: i == task.subtasks.length - 1
                                    ? null
                                    : () => widget.store.reorder(
                                        widget.date,
                                        task.id,
                                        i,
                                        i + 2,
                                      ),
                                icon: const Icon(
                                  Icons.keyboard_arrow_down,
                                  size: 20,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
            ],
            if (expanded && history.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(left: 44),
                child: ExpansionTile(
                  tilePadding: EdgeInsets.zero,
                  title: Text(
                    'Earlier steps (${history.length})',
                    style: const TextStyle(fontSize: 13, color: mutedInk),
                  ),
                  children: [
                    for (final old in history)
                      ListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        leading: Icon(
                          old.task.status == TaskStatus.done
                              ? Icons.check
                              : old.task.status == TaskStatus.stopped
                              ? Icons.stop_circle_outlined
                              : Icons.history,
                          size: 18,
                        ),
                        title: Text(
                          old.task.text,
                          style: const TextStyle(fontSize: 13),
                        ),
                        subtitle: Text('${old.date} · ${old.task.status.name}'),
                      ),
                  ],
                ),
              ),
            if (widget.depth == 0) const Divider(height: 1, indent: 44),
          ],
        ),
      ),
    );
  }
}

Future<void> editTask(
  BuildContext context,
  StickyStore store,
  AiService ai,
  String date,
  Task task,
) async {
  await showNoteSheet<void>(
    context,
    TaskEditor(store: store, ai: ai, date: date, task: task),
  );
}

class TaskEditor extends StatefulWidget {
  final StickyStore store;
  final AiService ai;
  final String date;
  final Task task;
  const TaskEditor({
    super.key,
    required this.store,
    required this.ai,
    required this.date,
    required this.task,
  });
  @override
  State<TaskEditor> createState() => _TaskEditorState();
}

class _TaskEditorState extends State<TaskEditor> {
  late final TextEditingController title = TextEditingController(
    text: widget.task.text,
  );
  late final TextEditingController outcome = TextEditingController(
    text: widget.task.finish?.doneWhen ?? '',
  );
  late String? due = widget.task.finish?.by;
  String? suggestion;
  bool busy = false;
  @override
  void dispose() {
    title.dispose();
    outcome.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ConstrainedBox(
    constraints: BoxConstraints(
      maxHeight: MediaQuery.sizeOf(context).height * .8,
    ),
    child: SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Edit task', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 20),
          TextField(
            controller: title,
            maxLines: null,
            decoration: const InputDecoration(labelText: 'Task'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: outcome,
            maxLines: null,
            decoration: const InputDecoration(labelText: 'Done when…'),
          ),
          const SizedBox(height: 4),
          TextButton.icon(
            onPressed: busy
                ? null
                : () async {
                    setState(() => busy = true);
                    try {
                      final draft = widget.task.clone()..text = title.text;
                      final response = await widget.ai.breakdown(
                        widget.store.preferences,
                        draft,
                        outcomeOnly: true,
                      );
                      if (mounted) {
                        setState(() => suggestion = response.outcome);
                      }
                    } catch (e) {
                      if (context.mounted) showError(context, e);
                    } finally {
                      if (mounted) setState(() => busy = false);
                    }
                  },
            icon: busy
                ? const SizedBox(
                    width: 16,
                    height: 16,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.auto_awesome_outlined, size: 18),
            label: const Text('Suggest outcome'),
          ),
          if (suggestion?.isNotEmpty == true)
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xfff1e2a0),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Unsaved suggestion',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  Text(suggestion!),
                  TextButton(
                    onPressed: () => setState(() {
                      outcome.text = suggestion!;
                      suggestion = null;
                    }),
                    child: const Text('Use suggestion'),
                  ),
                ],
              ),
            ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.event_outlined),
            title: Text(
              due == null
                  ? 'No due date'
                  : DateFormat('EEE, d MMM y').format(parseDate(due!)),
            ),
            onTap: () async {
              final date = await showDatePicker(
                context: context,
                initialDate: due == null ? DateTime.now() : parseDate(due!),
                firstDate: DateTime(1970),
                lastDate: DateTime(2100),
              );
              if (date != null && mounted) setState(() => due = dateKey(date));
            },
            trailing: due == null
                ? null
                : IconButton(
                    tooltip: 'Clear due date',
                    onPressed: () => setState(() => due = null),
                    icon: const Icon(Icons.close),
                  ),
          ),
          if (widget.task.finish?.deadlineChanges.isNotEmpty == true)
            ExpansionTile(
              title: const Text('Deadline history'),
              tilePadding: EdgeInsets.zero,
              children: [
                for (final change in widget.task.finish!.deadlineChanges)
                  ListTile(
                    dense: true,
                    title: Text(
                      '${change['from'] ?? 'No date'} → ${change['to'] ?? 'No date'}',
                    ),
                    subtitle: Text(change['at'] as String? ?? ''),
                  ),
              ],
            ),
          const SizedBox(height: 16),
          Row(
            children: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Cancel'),
              ),
              const Spacer(),
              FilledButton(
                onPressed: () {
                  if (title.text.trim().isEmpty) return;
                  widget.store.updateTask(
                    widget.date,
                    widget.task.id,
                    text: title.text,
                    outcome: outcome.text,
                    due: due,
                    updateFinish: true,
                  );
                  Navigator.pop(context);
                },
                child: const Text('Save'),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}
