import 'package:flutter/material.dart';

import '../app.dart';
import '../models/models.dart';
import '../state/sticky_store.dart';

class GoalsScreen extends StatefulWidget {
  final StickyStore store;
  const GoalsScreen({super.key, required this.store});
  @override
  State<GoalsScreen> createState() => _GoalsScreenState();
}

class _GoalsScreenState extends State<GoalsScreen> {
  bool routines = false;
  final capture = TextEditingController();
  @override
  void dispose() {
    capture.dispose();
    super.dispose();
  }

  List<GoalItem> get items =>
      routines ? widget.store.goals.recurring : widget.store.goals.targets;
  void add() {
    if (capture.text.trim().isEmpty) return;
    items.add(GoalItem(text: capture.text.trim()));
    capture.clear();
    widget.store.changed();
  }

  Future<void> edit(GoalItem item) async {
    final controller = TextEditingController(text: item.text);
    final text = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(routines ? 'Edit routine' : 'Edit goal'),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: null,
          onSubmitted: (text) => Navigator.pop(context, text),
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
    if (text?.trim().isNotEmpty == true) {
      item.text = text!.trim();
      widget.store.changed();
    }
    // The route transition can still read this controller for one frame.
    Future<void>.delayed(const Duration(milliseconds: 400), controller.dispose);
  }

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
        child: SegmentedButton<bool>(
          segments: const [
            ButtonSegment(
              value: false,
              icon: Icon(Icons.flag_outlined),
              label: Text('Long-term'),
            ),
            ButtonSegment(
              value: true,
              icon: Icon(Icons.repeat_rounded),
              label: Text('Routines'),
            ),
          ],
          selected: {routines},
          onSelectionChanged: (value) => setState(() => routines = value.first),
        ),
      ),
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: TextField(
          controller: capture,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => add(),
          decoration: InputDecoration(
            hintText: routines ? 'Add a routine' : 'Add a goal',
            suffixIcon: IconButton(
              tooltip: routines ? 'Add routine' : 'Add goal',
              onPressed: add,
              icon: const Icon(Icons.add),
            ),
          ),
        ),
      ),
      if (routines)
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 8, 12, 4),
          child: Wrap(
            spacing: 8,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              const Text(
                'Schedules run on this device.',
                style: TextStyle(fontSize: 12, color: mutedInk),
              ),
              if (items.any(
                (item) =>
                    item.done &&
                    (widget.store.routineSchedules[item.id]?.cadence ??
                            'manual') ==
                        'manual',
              ))
                TextButton(
                  onPressed: items.any((g) => g.done)
                      ? () {
                          for (final item in items) {
                            if (widget
                                        .store
                                        .routineSchedules[item.id]
                                        ?.cadence ==
                                    null ||
                                widget
                                        .store
                                        .routineSchedules[item.id]
                                        ?.cadence ==
                                    'manual') {
                              item.done = false;
                            }
                          }
                          widget.store.changed();
                        }
                      : null,
                  child: const Text('Reset routines'),
                ),
            ],
          ),
        ),
      if (routines && widget.store.routineError != null)
        Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            widget.store.routineError!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        ),
      Expanded(
        child: items.isEmpty
            ? Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Text(
                    routines ? 'No routines yet' : 'No goals yet',
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 18, color: mutedInk),
                  ),
                ),
              )
            : ReorderableListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: items.length,
                onReorderItem: (oldIndex, newIndex) {
                  final item = items.removeAt(oldIndex);
                  items.insert(newIndex, item);
                  widget.store.changed();
                },
                itemBuilder: (context, index) {
                  final item = items[index];
                  final schedule = routines
                      ? widget.store.routineSchedules[item.id]
                      : null;
                  final scheduled =
                      schedule != null && schedule.cadence != 'manual';
                  return ListTile(
                    key: ValueKey(item.id),
                    leading: scheduled
                        ? const Icon(Icons.repeat_rounded, color: mutedInk)
                        : Checkbox(
                            value: item.done,
                            onChanged: (value) {
                              item.done = value!;
                              widget.store.changed();
                            },
                          ),
                    title: Text(
                      item.text,
                      style: TextStyle(
                        decoration: item.done && !scheduled
                            ? TextDecoration.lineThrough
                            : null,
                        color: item.done && !scheduled ? mutedInk : ink,
                      ),
                    ),
                    subtitle: !routines
                        ? null
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              DropdownButton<String>(
                                isExpanded: true,
                                value: schedule?.cadence ?? 'manual',
                                items: const [
                                  DropdownMenuItem(
                                    value: 'manual',
                                    child: Text('Manual'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'daily',
                                    child: Text('Daily'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'weekdays',
                                    child: Text('Weekdays'),
                                  ),
                                  DropdownMenuItem(
                                    value: 'weekly',
                                    child: Text('Weekly'),
                                  ),
                                ],
                                onChanged: widget.store.routineError != null
                                    ? null
                                    : (value) => widget.store.configureRoutine(
                                        item.id,
                                        value!,
                                      ),
                              ),
                              if (scheduled) ...[
                                Text(
                                  schedule.paused
                                      ? 'Paused'
                                      : 'Next ${schedule.next(widget.store.today)}',
                                  style: const TextStyle(
                                    fontSize: 12,
                                    color: mutedInk,
                                  ),
                                ),
                                Wrap(
                                  spacing: 4,
                                  children: [
                                    TextButton(
                                      onPressed: () =>
                                          widget.store.pauseRoutine(item.id),
                                      child: Text(
                                        schedule.paused ? 'Resume' : 'Pause',
                                      ),
                                    ),
                                    if (!schedule.paused)
                                      TextButton(
                                        onPressed: () =>
                                            widget.store.skipRoutine(item.id),
                                        child: const Text('Skip next'),
                                      ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                    onTap: () => edit(item),
                    trailing: IconButton(
                      tooltip: 'Delete ${routines ? 'routine' : 'goal'}',
                      onPressed: () async {
                        final remove = await showDialog<bool>(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: const Text('Delete this item?'),
                            content: Text(item.text),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context, false),
                                child: const Text('Keep'),
                              ),
                              TextButton(
                                onPressed: () => Navigator.pop(context, true),
                                child: const Text('Delete'),
                              ),
                            ],
                          ),
                        );
                        if (remove == true) {
                          items.removeWhere((g) => g.id == item.id);
                          widget.store.changed();
                        }
                      },
                      icon: const Icon(Icons.close, size: 18),
                    ),
                  );
                },
              ),
      ),
    ],
  );
}
