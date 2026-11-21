import '../interface_locale.dart';
import '../widgets/notebook_date_picker.dart';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../app.dart';
import '../models/models.dart';
import '../models/workflow.dart';
import '../state/sticky_store.dart';
import '../services/ai_service.dart';
import '../widgets/task_tile.dart';

class ArchiveScreen extends StatefulWidget {
  final StickyStore store;
  final AiService ai;
  final VoidCallback openFocus;
  final bool progress;
  final String initialQuery;
  final String? initialGoalId;
  const ArchiveScreen({
    super.key,
    required this.store,
    required this.ai,
    required this.openFocus,
    this.progress = false,
    this.initialQuery = '',
    this.initialGoalId,
  });
  @override
  State<ArchiveScreen> createState() => _ArchiveScreenState();
}

class _ArchiveScreenState extends State<ArchiveScreen> {
  late final query = TextEditingController(text: widget.initialQuery);
  final searchFocus = FocusNode();
  final dateFocus = FocusNode();
  late String selected = widget.store.selectedDate;
  String status = 'all';
  late String? goalId = widget.initialGoalId;
  bool week = false;
  int limit = 40;
  @override
  void dispose() {
    query.dispose();
    searchFocus.dispose();
    dateFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.store,
    builder: (context, _) {
      final allRows = archiveRows(widget.store.days);
      final rows = goalId == null
          ? allRows
          : allRows
                .where((row) => widget.store.goalIdForTask(row.task) == goalId)
                .toList();
      final goal = goalId == null ? null : widget.store.findGoal(goalId!);
      final goalProgress = goal == null
          ? null
          : widget.store.goalProgress(goal);
      final date = parseDate(selected);
      final start = week
          ? DateTime(date.year, date.month, date.day - date.weekday + 1)
          : date;
      final from = dateKey(start),
          until = dateKey(
            week ? DateTime(start.year, start.month, start.day + 6) : start,
          );
      final range = rows
          .where(
            (row) =>
                row.date.compareTo(from) >= 0 && row.date.compareTo(until) <= 0,
          )
          .toList();
      final linkedRoots = goalId == null
          ? null
          : widget.store
                .tasksForGoal(goalId!, from: from, until: until)
                .map((row) => '${row.date}/${row.task.id}')
                .toSet();
      final roots = range
          .where(
            (row) => linkedRoots == null
                ? row.parents.isEmpty
                : linkedRoots.contains('${row.date}/${row.task.id}'),
          )
          .toList();
      final done = roots
          .where((row) => row.task.status == TaskStatus.done)
          .length;
      final stopped = roots
          .where((row) => row.task.status == TaskStatus.stopped)
          .length;
      final steps = range
          .where(
            (row) => linkedRoots == null
                ? row.parents.isNotEmpty
                : !linkedRoots.contains('${row.date}/${row.task.id}'),
          )
          .toList();
      final sessions = widget.store.focus.missionHistory.where((session) {
        final day = dateKey(
          DateTime.fromMillisecondsSinceEpoch(session.completedAt),
        );
        return day.compareTo(from) >= 0 && day.compareTo(until) <= 0;
      }).toList();
      final results = searchRows(
        widget.progress ? roots : rows,
        widget.progress ? '' : query.text,
        status,
      );
      final hasFilters =
          goalId != null ||
          status != 'all' ||
          (!widget.progress && query.text.trim().isNotEmpty);
      return Scaffold(
        appBar: AppBar(
          title: Text(
            widget.progress ? tr(context, "Progress") : tr(context, "Search"),
          ),
        ),
        body: SafeArea(
          child: Column(
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
                child: Column(
                  children: [
                    if (!widget.progress)
                      TextField(
                        controller: query,
                        focusNode: searchFocus,
                        autofocus: true,
                        decoration: InputDecoration(
                          hintText: tr(context, "Search tasks and steps"),
                          prefixIcon: Icon(Icons.search),
                        ),
                        onChanged: (_) => setState(() => limit = 40),
                      )
                    else
                      Wrap(
                        spacing: 12,
                        runSpacing: 8,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          OutlinedButton.icon(
                            focusNode: dateFocus,
                            icon: const Icon(
                              Icons.calendar_today_outlined,
                              size: 18,
                            ),
                            label: Text(
                              week
                                  ? '${DateFormat('d MMM').format(start)} – ${DateFormat('d MMM y').format(parseDate(until))}'
                                  : DateFormat('d MMM y').format(date),
                            ),
                            onPressed: () async {
                              final picked = await showNotebookDatePicker(
                                context,
                                date,
                              );
                              if (picked != null && mounted) {
                                setState(() {
                                  selected = dateKey(picked);
                                  limit = 40;
                                });
                              }
                            },
                          ),
                          DropdownButton<bool>(
                            value: week,
                            items: [
                              DropdownMenuItem(
                                value: false,
                                child: Text(tr(context, "Day")),
                              ),
                              DropdownMenuItem(
                                value: true,
                                child: Text(tr(context, "Week")),
                              ),
                            ],
                            onChanged: (value) => setState(() {
                              week = value!;
                              limit = 40;
                            }),
                          ),
                          _ProgressInfo(
                            message: tr(
                              context,
                              "Tasks are grouped by their list date, not their completion date. Focus totals include retained sessions and planned duration.",
                            ),
                          ),
                        ],
                      ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        if (widget.store.goals.targets.isNotEmpty ||
                            goalId != null) ...[
                          Expanded(
                            flex: 3,
                            child: Semantics(
                              label: tr(context, "Filter by goal"),
                              child: DropdownButton<String>(
                                key: const ValueKey('goal-filter'),
                                isExpanded: true,
                                value: goalId ?? '',
                                items: [
                                  DropdownMenuItem(
                                    value: '',
                                    child: Text(
                                      tr(context, "All goals"),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                  for (final item in widget.store.goals.targets)
                                    DropdownMenuItem(
                                      value: item.id,
                                      child: Text(
                                        item.text,
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                  if (goalId != null && goal == null)
                                    DropdownMenuItem(
                                      value: goalId,
                                      child: Text(
                                        tr(context, "Removed goal"),
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                ],
                                onChanged: (value) => setState(() {
                                  goalId = value?.isEmpty == true
                                      ? null
                                      : value;
                                  limit = 40;
                                }),
                              ),
                            ),
                          ),
                          const SizedBox(width: 16),
                        ],
                        Expanded(
                          flex: 2,
                          child: DropdownButton<String>(
                            isExpanded: true,
                            value: status,
                            items: [
                              DropdownMenuItem(
                                value: 'all',
                                child: Text(
                                  tr(context, "All states"),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              DropdownMenuItem(
                                value: 'open',
                                child: Text(
                                  tr(context, "Unfinished"),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              DropdownMenuItem(
                                value: 'done',
                                child: Text(
                                  tr(context, "Completed"),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              DropdownMenuItem(
                                value: 'stopped',
                                child: Text(
                                  tr(context, "Stopped"),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            ],
                            onChanged: (value) => setState(() {
                              status = value!;
                              limit = 40;
                            }),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                  children: [
                    if (widget.progress) ...[
                      if (goalProgress != null && goalProgress.total > 0) ...[
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                tr(context, "Goal plan · {0}/{1} completed", [
                                  goalProgress.completed,
                                  goalProgress.total,
                                ]),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            _ProgressInfo(
                              message: tr(
                                context,
                                "Plan progress includes linked tasks across all dates. A stopped task is not completed.",
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        LinearProgressIndicator(value: goalProgress.fraction),
                        const SizedBox(height: 24),
                      ],
                      if (roots.isNotEmpty) ...[
                        Text(
                          tr(
                            context,
                            "{0} completed · {1} unfinished · {2} stopped",
                            [done, roots.length - done - stopped, stopped],
                          ),
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(height: 12),
                        LinearProgressIndicator(
                          value: roots.isEmpty ? 0 : done / roots.length,
                        ),
                        const SizedBox(height: 12),
                      ],
                      if (steps.isNotEmpty)
                        Text(
                          tr(context, "{0}/{1} steps completed", [
                            steps
                                .where(
                                  (row) => row.task.status == TaskStatus.done,
                                )
                                .length,
                            steps.length,
                          ]),
                        ),
                      if (goalId == null && sessions.isNotEmpty)
                        Text(
                          tr(
                            context,
                            "{0} focus sessions · {1} planned minutes",
                            [
                              sessions.length,
                              sessions.fold<int>(
                                0,
                                (sum, session) => sum + session.durationMinutes,
                              ),
                            ],
                          ),
                        ),
                      if (roots.isNotEmpty ||
                          steps.isNotEmpty ||
                          (goalId == null && sessions.isNotEmpty))
                        const SizedBox(height: 20),
                    ],
                    if (results.isEmpty)
                      Wrap(
                        spacing: 12,
                        runSpacing: 8,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          Text(
                            widget.progress && !hasFilters
                                ? tr(context, "No tasks on these dates.")
                                : tr(context, "No matching tasks."),
                            style: const TextStyle(color: mutedInk),
                          ),
                          if (hasFilters)
                            TextButton(
                              onPressed: () {
                                setState(() {
                                  query.clear();
                                  status = 'all';
                                  goalId = null;
                                  limit = 40;
                                });
                                (widget.progress ? dateFocus : searchFocus)
                                    .requestFocus();
                              },
                              child: Text(tr(context, "Reset filters")),
                            ),
                        ],
                      )
                    else
                      Text(
                        widget.progress
                            ? (results.length == 1
                                  ? tr(context, "{0} task", [1])
                                  : tr(context, "{0} tasks", [results.length]))
                            : (results.length == 1
                                  ? tr(context, "{0} match", [1])
                                  : tr(context, "{0} matches", [
                                      results.length,
                                    ])),
                        style: const TextStyle(color: mutedInk),
                      ),
                    for (final row in results.take(limit)) ...[
                      const SizedBox(height: 8),
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          row.task.text.isEmpty
                              ? tr(context, "Untitled task")
                              : row.task.text,
                        ),
                        subtitle: Text(
                          '${row.parents.isEmpty ? '' : '${row.parents.join(' › ')}\n'}${row.date} · ${tr(context, statusText(row.task.status))}${row.task.finish?.by == null ? '' : ' · ${tr(context, "Due {0}", [row.task.finish!.by])}'}',
                        ),
                        trailing: const Icon(Icons.chevron_right, size: 18),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute<void>(
                            builder: (_) => TaskReviewScreen(
                              store: widget.store,
                              ai: widget.ai,
                              row: row,
                              openFocus: widget.openFocus,
                            ),
                          ),
                        ),
                      ),
                    ],
                    if (results.length > limit)
                      TextButton(
                        onPressed: () => setState(() => limit += 40),
                        child: Text(
                          tr(context, "Show more ({0})", [
                            results.length - limit,
                          ]),
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
}

class _ProgressInfo extends StatelessWidget {
  const _ProgressInfo({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Tooltip(
    message: message,
    child: Builder(
      builder: (buttonContext) => IconButton(
        constraints: const BoxConstraints.tightFor(width: 48, height: 48),
        onPressed: () => buttonContext
            .findAncestorStateOfType<TooltipState>()
            ?.ensureTooltipVisible(),
        icon: const Icon(Icons.info_outline, size: 18, color: mutedInk),
      ),
    ),
  );
}

String statusText(TaskStatus status) => switch (status) {
  TaskStatus.done => 'Completed',
  TaskStatus.todo => 'To do',
  TaskStatus.partial => 'In progress',
  TaskStatus.stopped => 'Stopped',
  TaskStatus.question => 'Needs a decision',
};

class TaskReviewScreen extends StatelessWidget {
  final Map? mynitSource;
  final StickyStore store;
  final AiService ai;
  final ArchiveRow row;
  final VoidCallback openFocus;
  const TaskReviewScreen({
    super.key,
    this.mynitSource,
    required this.store,
    required this.ai,
    required this.row,
    required this.openFocus,
  });
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: store,
    builder: (context, _) {
      final task = store.findTask(row.date, row.root.id);
      return Scaffold(
        appBar: AppBar(title: Text(tr(context, "Task · {0}", [row.date]))),
        body: SafeArea(
          child: ListView(
            children: [
              if (store.saveError != null)
                ListTile(
                  title: Text(store.saveError!),
                  trailing: TextButton(
                    onPressed: store.retrySave,
                    child: Text(tr(context, "Retry save")),
                  ),
                ),
              if (task == null)
                Padding(
                  padding: EdgeInsets.all(24),
                  child: Text(
                    tr(context, "This task has moved or been removed."),
                  ),
                )
              else
                TaskTile(
                  key: ValueKey('${row.date}/${task.id}'),
                  store: store,
                  ai: ai,
                  date: row.date,
                  task: task,
                  openFocus: openFocus,
                  revealId: row.task.id,
                  linkedCitation: mynitSource,
                ),
              if (store.undoLabel != null)
                TextButton(
                  onPressed: store.undo,
                  child: Text(tr(context, "Undo · {0}", [store.undoLabel])),
                ),
            ],
          ),
        ),
      );
    },
  );
}
