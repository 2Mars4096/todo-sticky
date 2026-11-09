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
  late String selected = widget.store.selectedDate;
  String status = 'all';
  late String? goalId = widget.initialGoalId;
  bool week = false;
  int limit = 40;
  @override
  void dispose() {
    query.dispose();
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
      return Scaffold(
        appBar: AppBar(title: Text(widget.progress ? 'Progress' : 'Search')),
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
                        autofocus: true,
                        decoration: const InputDecoration(
                          hintText: 'Search tasks and steps',
                          prefixIcon: Icon(Icons.search),
                        ),
                        onChanged: (_) => setState(() => limit = 40),
                      )
                    else
                      Wrap(
                        spacing: 12,
                        crossAxisAlignment: WrapCrossAlignment.center,
                        children: [
                          OutlinedButton.icon(
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
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: date,
                                firstDate: DateTime(1970),
                                lastDate: DateTime(2100),
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
                            items: const [
                              DropdownMenuItem(
                                value: false,
                                child: Text('Day'),
                              ),
                              DropdownMenuItem(
                                value: true,
                                child: Text('Week'),
                              ),
                            ],
                            onChanged: (value) => setState(() {
                              week = value!;
                              limit = 40;
                            }),
                          ),
                          const Tooltip(
                            message: 'Tasks are grouped by their list date, not their completion date. Focus totals include retained sessions and planned duration.',
                            child: Icon(
                              Icons.info_outline,
                              size: 18,
                              color: mutedInk,
                            ),
                          ),
                        ],
                      ),
                    Row(
                      children: [
                        Expanded(
                          flex: 3,
                          child: Semantics(
                            label: 'Filter by goal',
                            child: DropdownButton<String>(
                              key: const ValueKey('goal-filter'),
                              isExpanded: true,
                              value: goalId ?? '',
                              items: [
                                const DropdownMenuItem(
                                  value: '',
                                  child: Text(
                                    'All goals',
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
                                    child: const Text(
                                      'Removed goal',
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                              ],
                              onChanged: (value) => setState(() {
                                goalId = value?.isEmpty == true ? null : value;
                                limit = 40;
                              }),
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          flex: 2,
                          child: DropdownButton<String>(
                            isExpanded: true,
                            value: status,
                            items: const [
                              DropdownMenuItem(
                                value: 'all',
                                child: Text(
                                  'All states',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              DropdownMenuItem(
                                value: 'open',
                                child: Text(
                                  'Unfinished',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              DropdownMenuItem(
                                value: 'done',
                                child: Text(
                                  'Completed',
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              DropdownMenuItem(
                                value: 'stopped',
                                child: Text(
                                  'Stopped',
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
                                'Goal plan · ${goalProgress.completed}/${goalProgress.total} completed',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                            const Tooltip(
                              message: 'Plan progress includes linked tasks across all dates. A stopped task is not completed.',
                              child: Icon(
                                Icons.info_outline,
                                size: 18,
                                color: mutedInk,
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
                          '$done completed · ${roots.length - done - stopped} unfinished · $stopped stopped',
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
                          '${steps.where((row) => row.task.status == TaskStatus.done).length}/${steps.length} steps completed',
                        ),
                      if (goalId == null && sessions.isNotEmpty)
                        Text(
                          '${sessions.length} focus sessions · ${sessions.fold<int>(0, (sum, session) => sum + session.durationMinutes)} planned minutes',
                        ),
                      if (roots.isNotEmpty ||
                          steps.isNotEmpty ||
                          (goalId == null && sessions.isNotEmpty))
                        const SizedBox(height: 20),
                    ],
                    Text(
                      results.isEmpty
                          ? 'No matching tasks.'
                          : '${results.length} ${widget.progress ? 'tasks' : 'matches'}',
                      style: const TextStyle(color: mutedInk),
                    ),
                    for (final row in results.take(limit)) ...[
                      const SizedBox(height: 8),
                      ListTile(
                        contentPadding: EdgeInsets.zero,
                        title: Text(
                          row.task.text.isEmpty
                              ? 'Untitled task'
                              : row.task.text,
                        ),
                        subtitle: Text(
                          '${row.parents.isEmpty ? '' : '${row.parents.join(' › ')}\n'}${row.date} · ${statusText(row.task.status)}${row.task.finish?.by == null ? '' : ' · Due ${row.task.finish!.by}'}',
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
                        child: Text('Show more (${results.length - limit})'),
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

String statusText(TaskStatus status) => switch (status) {
  TaskStatus.done => 'Completed',
  TaskStatus.todo => 'To do',
  TaskStatus.partial => 'In progress',
  TaskStatus.stopped => 'Stopped',
  TaskStatus.question => 'Needs a decision',
};

class TaskReviewScreen extends StatelessWidget {
  final StickyStore store;
  final AiService ai;
  final ArchiveRow row;
  final VoidCallback openFocus;
  const TaskReviewScreen({
    super.key,
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
        appBar: AppBar(title: Text('Task · ${row.date}')),
        body: SafeArea(
          child: ListView(
            children: [
              if (store.saveError != null)
                ListTile(
                  title: Text(store.saveError!),
                  trailing: TextButton(
                    onPressed: store.retrySave,
                    child: const Text('Retry save'),
                  ),
                ),
              if (task == null)
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: Text('This task has moved or been removed.'),
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
                ),
              if (store.undoLabel != null)
                TextButton(
                  onPressed: store.undo,
                  child: Text('Undo · ${store.undoLabel}'),
                ),
            ],
          ),
        ),
      );
    },
  );
}
