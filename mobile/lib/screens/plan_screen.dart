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
      final proposal = await widget.ai.plan(
        widget.store.preferences,
        widget.store.planningTasks,
        widget.store.selectedDate,
        time(start),
        time(end),
        widget.store.preferences.machines
            .where((m) => selectedMachines.contains(m['name']))
            .toList(),
      );
      if (mounted) setState(() => plan = proposal);
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
              '${tasks.length} unfinished tasks · You choose what to apply.',
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
                    ? 'Making room for the work…'
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
              const Text(
                'PROPOSED PLAN',
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
                      Container(
                        width: 3,
                        height: 48,
                        margin: const EdgeInsets.symmetric(horizontal: 12),
                        decoration: BoxDecoration(
                          color: const Color(0xffc4a44a),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
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
                  'Left for another time',
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
              Row(
                children: [
                  TextButton(
                    onPressed: () => setState(() => plan = null),
                    child: const Text('Discard'),
                  ),
                  const Spacer(),
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
                'Only unfinished blocks generated for this date are replaced. Manual steps and completed work stay intact. Undo is available on your note.',
                style: TextStyle(fontSize: 12, color: mutedInk),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
