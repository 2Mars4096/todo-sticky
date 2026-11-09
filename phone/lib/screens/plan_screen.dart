import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../app.dart';
import '../models/models.dart';
import '../services/ai_service.dart';
import '../state/sticky_store.dart';

class PlanScreen extends StatefulWidget {
  final StickyStore store;
  final AiService ai;
  const PlanScreen({super.key, required this.store, required this.ai});
  @override
  State<PlanScreen> createState() => _PlanScreenState();
}

class _PlanScreenState extends State<PlanScreen> {
  TimeOfDay start = const TimeOfDay(hour: 9, minute: 0);
  TimeOfDay end = const TimeOfDay(hour: 17, minute: 0);
  final selectedMachines = <String>{};
  final estimates = <String, int>{};
  final unavailable = <Map<String, String>>[];
  bool adjustmentsOpen = false;
  final proposalKey = GlobalKey();
  @override
  void initState() {
    super.initState();
    final prefs = widget.store.preferences;
    TimeOfDay parse(String value) {
      final minutes = minutesOfDay(value)!;
      return TimeOfDay(hour: minutes ~/ 60, minute: minutes % 60);
    }

    start = parse(prefs.planningStart);
    end = parse(prefs.planningEnd);
    selectedMachines.addAll(prefs.planningMachines);
  }

  bool busy = false;
  String? error;
  DayPlan? plan;
  String time(TimeOfDay t) =>
      '${t.hour.toString().padLeft(2, '0')}:${t.minute.toString().padLeft(2, '0')}';
  Future<void> generate() async {
    setState(() {
      busy = true;
      error = null;
      plan = null;
    });
    try {
      widget.store.preferences.planningStart = time(start);
      widget.store.preferences.planningEnd = time(end);
      widget.store.preferences.planningMachines = selectedMachines.toList();
      widget.store.changed();
      final proposal = await widget.ai.plan(
        widget.store.preferences,
        widget.store.planningTasks,
        widget.store.selectedDate,
        time(start),
        time(end),
        widget.store.preferences.machines
            .where((m) => selectedMachines.contains(m['name']))
            .toList(),
        estimates: Map.of(estimates),
        unavailable: unavailable
            .map((period) => Map<String, String>.of(period))
            .toList(),
      );
      if (mounted) {
        setState(() {
          plan = proposal;
          adjustmentsOpen = false;
        });
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted && proposalKey.currentContext != null) {
            Scrollable.ensureVisible(proposalKey.currentContext!);
          }
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final tasks = store.planningTasks;
    final proposal = plan;
    final unscheduled = proposal == null
        ? <DatedTask>[]
        : tasks
              .where(
                (t) => !proposal.blocks.any(
                  (b) => b.taskId == t.task.id && b.sourceDate == t.date,
                ),
              )
              .toList();
    return Scaffold(
      appBar: AppBar(title: const Text('Plan the day')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            Text(
              DateFormat('EEEE, d MMMM').format(parseDate(store.selectedDate)),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              'Unfinished: ${tasks.length}',
              style: const TextStyle(color: mutedInk),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: busy
                        ? null
                        : () async {
                            final value = await showTimePicker(
                              context: context,
                              initialTime: start,
                            );
                            if (mounted && value != null) {
                              setState(() {
                                start = value;
                                plan = null;
                              });
                            }
                          },
                    icon: const Icon(Icons.schedule, size: 18),
                    label: Text('From ${time(start)}'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: busy
                        ? null
                        : () async {
                            final value = await showTimePicker(
                              context: context,
                              initialTime: end,
                            );
                            if (mounted && value != null) {
                              setState(() {
                                end = value;
                                plan = null;
                              });
                            }
                          },
                    icon: const Icon(Icons.schedule, size: 18),
                    label: Text('Until ${time(end)}'),
                  ),
                ),
              ],
            ),
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Adjust task time & breaks'),
              trailing: Icon(
                adjustmentsOpen ? Icons.expand_less : Icons.expand_more,
              ),
              onTap: busy
                  ? null
                  : () => setState(() => adjustmentsOpen = !adjustmentsOpen),
            ),
            if (adjustmentsOpen) ...[
              const Text(
                'Time budget per task',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              const Text(
                'Auto lets AI estimate. List order guides priority.',
                style: TextStyle(color: mutedInk, fontSize: 12),
              ),
              for (final task in tasks)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 6),
                  child: Row(
                    children: [
                      Expanded(child: Text(task.task.text)),
                      const SizedBox(width: 8),
                      DropdownButton<int>(
                        value: estimates['${task.date}/${task.task.id}'] ?? 0,
                        items: [
                          const DropdownMenuItem(value: 0, child: Text('Auto')),
                          for (final n in [15, 30, 45, 60, 90, 120, 180, 240])
                            DropdownMenuItem(value: n, child: Text('$n min')),
                        ],
                        onChanged: busy
                            ? null
                            : (value) => setState(() {
                                final key = '${task.date}/${task.task.id}';
                                if (value == 0) {
                                  estimates.remove(key);
                                } else {
                                  estimates[key] = value!;
                                }
                                plan = null;
                              }),
                      ),
                    ],
                  ),
                ),
              const SizedBox(height: 12),
              const Text(
                'Unavailable time',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              for (var i = 0; i < unavailable.length; i++)
                Wrap(
                  spacing: 8,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    for (final field in ['start', 'end'])
                      TextButton(
                        onPressed: busy
                            ? null
                            : () async {
                                final minutes = minutesOfDay(
                                  unavailable[i][field]!,
                                )!;
                                final picked = await showTimePicker(
                                  context: context,
                                  initialTime: TimeOfDay(
                                    hour: minutes ~/ 60,
                                    minute: minutes % 60,
                                  ),
                                );
                                if (mounted && picked != null) {
                                  setState(() {
                                    unavailable[i][field] = time(picked);
                                    plan = null;
                                  });
                                }
                              },
                        child: Text(
                          '${field == 'start' ? 'From' : 'Until'} ${unavailable[i][field]}',
                        ),
                      ),
                    IconButton(
                      tooltip: 'Remove break ${i + 1}',
                      onPressed: busy
                          ? null
                          : () => setState(() {
                              unavailable.removeAt(i);
                              plan = null;
                            }),
                      icon: const Icon(Icons.close, size: 18),
                    ),
                  ],
                ),
              Align(
                alignment: Alignment.centerLeft,
                child: TextButton.icon(
                  onPressed: busy || unavailable.length >= 6
                      ? null
                      : () => setState(() {
                          unavailable.add({'start': '12:00', 'end': '13:00'});
                          plan = null;
                        }),
                  icon: const Icon(Icons.add, size: 18),
                  label: const Text('Add break'),
                ),
              ),
            ],
            if (store.preferences.machines.isNotEmpty) ...[
              const SizedBox(height: 16),
              const Text(
                'Available machines',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              Wrap(
                spacing: 8,
                children: [
                  for (final machine in store.preferences.machines)
                    FilterChip(
                      label: Text(machine['name'] as String),
                      selected: selectedMachines.contains(machine['name']),
                      onSelected: busy
                          ? null
                          : (selected) => setState(() {
                              selected
                                  ? selectedMachines.add(
                                      machine['name'] as String,
                                    )
                                  : selectedMachines.remove(machine['name']);
                              plan = null;
                            }),
                    ),
                ],
              ),
            ],
            const SizedBox(height: 20),
            FilledButton.icon(
              onPressed: busy || tasks.isEmpty ? null : generate,
              icon: busy
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.auto_awesome),
              label: Text(
                busy
                    ? 'Generating…'
                    : proposal == null
                    ? 'Generate plan'
                    : 'Generate another plan',
              ),
            ),
            if (error != null)
              Padding(
                padding: const EdgeInsets.only(top: 16),
                child: Text(
                  error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              ),
            if (proposal != null) ...[
              const SizedBox(height: 28),
              Text(
                'PROPOSED PLAN',
                key: proposalKey,
                style: TextStyle(
                  letterSpacing: 1.5,
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: mutedInk,
                ),
              ),
              if (proposal.summary.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Text(proposal.summary),
                ),
              for (final block in proposal.blocks)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      SizedBox(
                        width: 56,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              block.time,
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            Text(
                              block.endTime,
                              style: const TextStyle(
                                fontSize: 12,
                                color: mutedInk,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              block.action,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${store.findTask(block.sourceDate, block.taskId)?.text ?? 'Task'}${block.assignedTo == 'human' ? '' : ' · ${block.assignedTo}'}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: mutedInk,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              if (unscheduled.isNotEmpty) ...[
                const Divider(height: 28),
                const Text(
                  'Unscheduled',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                for (final task in unscheduled)
                  Padding(
                    padding: const EdgeInsets.only(top: 6),
                    child: Text(
                      '• ${task.task.text}',
                      style: const TextStyle(color: mutedInk),
                    ),
                  ),
              ],
              const SizedBox(height: 24),
              Wrap(
                spacing: 12,
                runSpacing: 8,
                alignment: WrapAlignment.end,
                children: [
                  TextButton(
                    onPressed: () => setState(() => plan = null),
                    child: const Text('Discard'),
                  ),
                  FilledButton(
                    onPressed: () {
                      try {
                        store.applyPlan(proposal);
                        Navigator.pop(context);
                      } catch (e) {
                        setState(() => error = e.toString());
                      }
                    },
                    child: const Text('Apply plan'),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              const Text(
                'Replaces untouched suggestions. Edited, started and older untracked steps stay. You can undo.',
                style: TextStyle(fontSize: 12, color: mutedInk),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
