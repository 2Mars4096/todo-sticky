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
  const ArchiveScreen({
    super.key,
    required this.store,
    required this.ai,
    required this.openFocus,
    this.progress = false,
    this.initialQuery = '',
  });
  @override
  State<ArchiveScreen> createState() => _ArchiveScreenState();
}

class _ArchiveScreenState extends State<ArchiveScreen> {
  late final query = TextEditingController(text: widget.initialQuery);
  late String selected = widget.store.selectedDate;
  String status = 'all';
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
      final rows = archiveRows(widget.store.days);
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
      final roots = range.where((row) => row.parents.isEmpty).toList();
      final done = roots
          .where((row) => row.task.status == TaskStatus.done)
          .length;
      final stopped = roots
          .where((row) => row.task.status == TaskStatus.stopped)
          .length;
      final steps = range.where((row) => row.parents.isNotEmpty).toList();
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
                            label: Text(DateFormat('d MMM y').format(date)),
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
                        ],
                      ),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: DropdownButton<String>(
                        value: status,
                        items: const [
                          DropdownMenuItem(
                            value: 'all',
                            child: Text('All states'),
                          ),
                          DropdownMenuItem(
                            value: 'open',
                            child: Text('Unfinished'),
                          ),
                          DropdownMenuItem(
                            value: 'done',
                            child: Text('Completed'),
                          ),
                          DropdownMenuItem(
                            value: 'stopped',
                            child: Text('Stopped'),
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
              ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
                  children: [
                    if (widget.progress) ...[
                      Text(
                        '${from == until ? from : '$from to $until'} · by task list date',
                        style: const TextStyle(color: mutedInk, fontSize: 12),
                      ),
                      const SizedBox(height: 12),
                      Text(
                        '$done completed · ${roots.length - done - stopped} unfinished · $stopped stopped',
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                      const SizedBox(height: 12),
                      LinearProgressIndicator(
                        value: roots.isEmpty ? 0 : done / roots.length,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        '${steps.where((row) => row.task.status == TaskStatus.done).length}/${steps.length} steps completed',
                      ),
                      Text(
                        '${sessions.length} focus sessions · ${sessions.fold<int>(0, (sum, session) => sum + session.durationMinutes)} planned minutes',
                      ),
                      const ExpansionTile(
                        tilePadding: EdgeInsets.zero,
                        title: Text(
                          'About these totals',
                          style: TextStyle(fontSize: 13, color: mutedInk),
                        ),
                        children: [
                          Text(
                            'Tasks are grouped by their list date, not when they were completed. Steps are separate. Focus totals include only retained sessions and planned duration.',
                          ),
                        ],
                      ),
                    ],
                    Text(
                      results.isEmpty
                          ? 'No matching tasks.'
                          : '${results.length} ${widget.progress ? 'tasks' : 'matches'}',
                      style: const TextStyle(color: mutedInk),
                    ),
                    for (final row in results.take(limit)) ...[
                      const Divider(),
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
