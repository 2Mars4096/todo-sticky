import '../interface_locale.dart';

import 'dart:convert';

import 'assignment_entry.dart';
import 'mynit_citation.dart';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter/semantics.dart';
import 'package:intl/intl.dart';

import '../app.dart';
import 'task_grip.dart';
import 'notebook_capture_field.dart';
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
  final double leadingInset;
  final String? parentId;
  final int? reorderIndex;
  final Widget? dragHandle;
  final String? revealId;
  final Map? linkedCitation;
  const TaskTile({
    super.key,
    required this.store,
    required this.ai,
    required this.date,
    required this.task,
    required this.openFocus,
    this.showDate = false,
    this.depth = 0,
    this.leadingInset = 12,
    this.parentId,
    this.reorderIndex,
    this.dragHandle,
    this.revealId,
    this.linkedCitation,
  });
  @override
  State<TaskTile> createState() => _TaskTileState();
}

class _TaskTileState extends State<TaskTile> {
  bool expanded = false;
  bool animateDisclosure = false;

  void toggleDisclosure() {
    final pressed = HardwareKeyboard.instance.logicalKeysPressed;
    final keyboardActivation =
        pressed.contains(LogicalKeyboardKey.enter) ||
        pressed.contains(LogicalKeyboardKey.numpadEnter) ||
        pressed.contains(LogicalKeyboardKey.space);
    setState(() {
      animateDisclosure = !keyboardActivation;
      expanded = !expanded;
    });
  }

  @override
  void initState() {
    super.initState();
    expanded =
        widget.revealId != null && widget.task.find(widget.revealId!) != null;
  }

  bool adding = false;
  bool busy = false;
  final step = TextEditingController();
  final stepFocus = FocusNode();
  @override
  void dispose() {
    stepFocus.dispose();
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
                tr(context, "Suggested steps"),
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
                    child: Text(tr(context, "Discard")),
                  ),
                  const Spacer(),
                  FilledButton(
                    onPressed: () => Navigator.pop(context, true),
                    child: Text(tr(context, "Add steps")),
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
        if (mounted) {
          setState(() {
            animateDisclosure = false;
            expanded = true;
          });
        }
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
              tr(context, "What happened?"),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Text(task.finish!.doneWhen!, style: const TextStyle(fontSize: 18)),
            const SizedBox(height: 20),
            ListTile(
              leading: const Icon(Icons.check_circle_outline),
              title: Text(tr(context, "Complete")),
              subtitle: Text(tr(context, "The outcome is reached.")),
              onTap: () => Navigator.pop(context, 'done'),
            ),
            ListTile(
              leading: const Icon(Icons.edit_outlined),
              title: Text(tr(context, "Revise")),
              subtitle: Text(tr(context, "Keep working, adjust the outcome.")),
              onTap: () => Navigator.pop(context, 'revise'),
            ),
            ListTile(
              leading: const Icon(Icons.stop_circle_outlined),
              title: Text(tr(context, "Stop")),
              subtitle: Text(
                tr(context, "Close deliberately without marking it achieved."),
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
    try {
      widget.store.addTask(
        step.text,
        date: widget.date,
        parentId: widget.task.id,
      );
      step.clear();
      stepFocus.requestFocus();
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
                    ? tr(context, "Move to today")
                    : tr(context, "Move to {0}", [
                        DateFormat('EEE, d MMM').format(parseDate(destination)),
                      ]),
              ),
              onTap: () => Navigator.pop(context, destination),
            ),
            ListTile(
              leading: const Icon(Icons.calendar_month_outlined),
              title: Text(tr(context, "Choose another date")),
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

  Future<void> assignProject() async {
    final goals = widget.store.goals.targets
        .where((goal) => !goal.done)
        .toList();
    if (goals.isEmpty) {
      showError(context, 'Add a project under Goals first.');
      return;
    }
    final id = await showNoteSheet<String>(
      context,
      SizedBox(
        height: MediaQuery.sizeOf(context).height * .55,
        child: ListView(
          children: [
            ListTile(title: Text(tr(context, "Assign to project"))),
            for (final goal in goals)
              ListTile(
                title: Text(goal.text),
                trailing: widget.store.goalIdForTask(widget.task) == goal.id
                    ? const Icon(Icons.check)
                    : null,
                onTap: () => Navigator.pop(context, goal.id),
              ),
          ],
        ),
      ),
    );
    if (id != null && mounted) {
      try {
        widget.store.assignProject(widget.date, widget.task.id, id);
      } catch (cause) {
        showError(context, cause);
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
    final controlHeight = taskControlHeight(context, depth: widget.depth);
    final hasHandle = widget.dragHandle != null || widget.reorderIndex != null;
    final contentInset = (hasHandle ? 64.0 : 40.0) + 2;
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
          left: widget.depth == 0 && hasHandle ? 0 : widget.leadingInset,
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
                      label: tr(context, "Reorder {0}", [task.text]),
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
                      child: Tooltip(
                        message: tr(context, "Drag to reorder"),
                        child: TaskGrip(height: controlHeight),
                      ),
                    ),
                  ),
                SizedBox(
                  width: 40,
                  height: controlHeight,
                  child: IconButton(
                    padding: EdgeInsets.zero,
                    iconSize: 24,
                    tooltip: task.closed
                        ? tr(context, "Reopen task")
                        : tr(context, "Complete task"),
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
                    onTap: toggleDisclosure,
                    onDoubleTap: () => editTask(
                      context,
                      widget.store,
                      widget.ai,
                      widget.date,
                      task,
                    ),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(2, 14, 0, 14),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            task.text,
                            style: TextStyle(
                              fontSize: widget.depth == 0 ? 16 : 15,
                              height: 1.4,
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
                                tr(context, "Outcome · {0}", [
                                  task.finish!.doneWhen,
                                ]),
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
                                      label: tr(context, "Open goal {0}", [
                                        goal.text,
                                      ]),
                                      child: Tooltip(
                                        message: tr(context, "Open goal plan"),
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
                                      tr(context, "Due {0}", [
                                        DateFormat.MMMd().format(
                                          parseDate(task.finish!.by!),
                                        ),
                                      ]),
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
                                    Text(
                                      tr(context, "Stopped"),
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: mutedInk,
                                      ),
                                    ),
                                  if (task.finish?.reviewReady == true)
                                    Text(
                                      tr(context, "Ready for outcome review"),
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
                                tr(context, "{0} steps left{1}", [
                                  unfinished,
                                  unfinished == 0
                                      ? ''
                                      : ' · ${task.subtasks.firstWhere((s) => !s.closed).text}',
                                ]),
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
                Semantics(
                  expanded: expanded,
                  child: IconButton(
                    tooltip: expanded
                        ? tr(context, "Hide task actions and steps")
                        : tr(context, "Show task actions and steps"),
                    onPressed: toggleDisclosure,
                    icon: MediaQuery.disableAnimationsOf(context)
                        ? RotatedBox(
                            quarterTurns: expanded ? 1 : 0,
                            child: const Icon(Icons.chevron_right),
                          )
                        : AnimatedRotation(
                            turns: expanded ? .25 : 0,
                            duration: animateDisclosure
                                ? const Duration(milliseconds: 150)
                                : Duration.zero,
                            curve: const Cubic(.23, 1, .32, 1),
                            child: const Icon(Icons.chevron_right),
                          ),
                  ),
                ),
              ],
            ),
            if (expanded) ...[
              if (widget.revealId == task.id && widget.linkedCitation != null)
                MynitCitation(source: widget.linkedCitation!)
              else
                NotebookCitation(taskId: task.id),
              Padding(
                padding: EdgeInsets.only(left: contentInset),
                child: Wrap(
                  spacing: 4,
                  runSpacing: 2,
                  children: [
                    IconButton(
                      tooltip: tr(context, "Focus on task"),
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
                        tooltip: tr(context, "Add a step"),
                        onPressed: () => setState(() => adding = !adding),
                        icon: const Icon(Icons.add, size: 18),
                      ),
                    if (!task.closed)
                      IconButton(
                        tooltip: busy
                            ? tr(context, "Preparing suggested steps")
                            : tr(context, "Suggest steps with AI"),
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
                      tooltip: tr(
                        context,
                        "Move task · due date stays unchanged",
                      ),
                      onPressed: move,
                      icon: const Icon(Icons.arrow_forward, size: 20),
                    ),
                    PopupMenuButton<String>(
                      tooltip: tr(context, "More task actions"),
                      icon: const Icon(Icons.more_horiz, size: 20),
                      onSelected: (action) async {
                        if (action == 'shiprite') {
                          AssignmentEntry.of(context)
                              ?.open(widget.date, widget.task.id);
                          return;
                        }
                        if (action == 'project') {
                          await assignProject();
                          return;
                        }
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
                              SnackBar(
                                content: Text(
                                  tr(context, "Agent prompt copied"),
                                ),
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
                        if (AssignmentEntry.of(context) != null)
                          PopupMenuItem(
                            value: 'shiprite',
                            child: Text(tr(context, "Assign in Shiprite")),
                          ),
                        PopupMenuItem(
                          value: 'project',
                          child: Text(tr(context, "Assign to project")),
                        ),
                        PopupMenuItem(
                          value: 'edit',
                          child: Text(tr(context, "Edit task")),
                        ),
                        PopupMenuItem(
                          value: 'copy',
                          child: Text(tr(context, "Copy as agent prompt")),
                        ),
                        if (!task.closed) ...[
                          PopupMenuItem(
                            value: 'question',
                            child: Text(tr(context, "Mark as question")),
                          ),
                          PopupMenuItem(
                            value: 'partial',
                            child: Text(tr(context, "Mark partly done")),
                          ),
                          PopupMenuItem(
                            value: 'stop',
                            child: Text(tr(context, "Stop task")),
                          ),
                        ],
                        PopupMenuItem(
                          value: 'delete',
                          child: Text(tr(context, "Delete task")),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (adding)
                Padding(
                  padding: const EdgeInsets.fromLTRB(44, 4, 8, 12),
                  child: NotebookCaptureField(
                    controller: step,
                    focusNode: stepFocus,
                    autofocus: true,
                    hint: tr(context, "Add a step"),
                    actionLabel: tr(context, "Add step"),
                    icon: Icons.add,
                    onAdd: addStep,
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
                          leadingInset: hasHandle ? 36 : 12,
                          parentId: task.id,
                          revealId: widget.revealId,
                          linkedCitation: widget.linkedCitation,
                        ),
                      ),
                      if (task.subtasks.length > 1)
                        SizedBox(
                          width: 32,
                          child: Column(
                            children: [
                              IconButton(
                                tooltip: tr(context, "Move step up"),
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
                                tooltip: tr(context, "Move step down"),
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
                padding: EdgeInsets.only(left: contentInset),
                child: ExpansionTile(
                  tilePadding: EdgeInsets.zero,
                  title: Text(
                    tr(context, "Earlier steps ({0})", [history.length]),
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
                        subtitle: Text(
                          '${old.date} · ${tr(context, const {TaskStatus.todo: "To do", TaskStatus.done: "Completed", TaskStatus.partial: "In progress", TaskStatus.question: "Needs a decision", TaskStatus.stopped: "Stopped"}[old.task.status]!)}',
                        ),
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
          Text(
            tr(context, "Edit task"),
            style: Theme.of(context).textTheme.titleLarge,
          ),
          const SizedBox(height: 20),
          TextField(
            controller: title,
            maxLines: null,
            decoration: InputDecoration(labelText: tr(context, "Task")),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: outcome,
            maxLines: null,
            decoration: InputDecoration(labelText: tr(context, "Done when…")),
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
            label: Text(tr(context, "Suggest outcome")),
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
                  Text(
                    tr(context, "Unsaved suggestion"),
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                  Text(suggestion!),
                  TextButton(
                    onPressed: () => setState(() {
                      outcome.text = suggestion!;
                      suggestion = null;
                    }),
                    child: Text(tr(context, "Use suggestion")),
                  ),
                ],
              ),
            ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.event_outlined),
            title: Text(
              due == null
                  ? tr(context, "No due date")
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
                    tooltip: tr(context, "Clear due date"),
                    onPressed: () => setState(() => due = null),
                    icon: const Icon(Icons.close),
                  ),
          ),
          if (widget.task.finish?.deadlineChanges.isNotEmpty == true)
            ExpansionTile(
              title: Text(tr(context, "Deadline history")),
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
                child: Text(tr(context, "Cancel")),
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
                child: Text(tr(context, "Save")),
              ),
            ],
          ),
        ],
      ),
    ),
  );
}
