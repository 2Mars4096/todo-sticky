import '../date_labels.dart';
import '../interface_locale.dart';

import 'package:flutter/material.dart';

import '../app.dart';
import '../models/models.dart';
import '../services/ai_service.dart';
import '../state/sticky_store.dart';
import 'goal_plan_screen.dart';

class GoalsScreen extends StatefulWidget {
  final StickyStore store;
  final AiService ai;
  final VoidCallback openFocus;
  final ValueChanged<String> openDay;
  const GoalsScreen({
    super.key,
    required this.store,
    required this.ai,
    required this.openFocus,
    required this.openDay,
  });
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
        title: Text(
          routines ? tr(context, "Edit routine") : tr(context, "Edit goal"),
        ),
        content: TextField(
          controller: controller,
          autofocus: true,
          maxLines: null,
          onSubmitted: (text) => Navigator.pop(context, text),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text(tr(context, "Cancel")),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: Text(tr(context, "Save")),
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
          segments: [
            ButtonSegment(
              value: false,
              icon: Icon(Icons.flag_outlined),
              label: Text(tr(context, "Long-term")),
            ),
            ButtonSegment(
              value: true,
              icon: Icon(Icons.repeat_rounded),
              label: Text(tr(context, "Routines")),
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
            hintText: routines
                ? tr(context, "Add a routine")
                : tr(context, "Add a goal"),
            suffixIcon: IconButton(
              tooltip: routines
                  ? tr(context, "Add routine")
                  : tr(context, "Add goal"),
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
              Tooltip(
                message: tr(context, "Schedules run on this device."),
                child: Icon(Icons.info_outline, size: 18, color: mutedInk),
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
                  child: Text(tr(context, "Reset routines")),
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
                    routines
                        ? tr(context, "No routines yet")
                        : tr(context, "No goals yet"),
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
                  final progress = routines
                      ? null
                      : widget.store.goalProgress(item);
                  return ListTile(
                    key: ValueKey(item.id),
                    leading: !routines
                        ? Icon(
                            item.done
                                ? Icons.check_circle_outline
                                : Icons.flag_outlined,
                            color: item.done ? mutedInk : amber,
                          )
                        : scheduled
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
                        ? Text(
                            progress!.total == 0
                                ? tr(context, "Plan")
                                : tr(context, "{0}/{1} completed{2}", [
                                    progress.completed,
                                    progress.total,
                                    progress.scheduled > progress.completed
                                        ? ' · ${progress.scheduled - progress.completed} scheduled'
                                        : '',
                                  ]),
                            style: const TextStyle(
                              color: mutedInk,
                              fontSize: 12,
                            ),
                          )
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              DropdownButton<String>(
                                isExpanded: true,
                                value: schedule?.cadence ?? 'manual',
                                items: [
                                  DropdownMenuItem(
                                    value: 'manual',
                                    child: Text(tr(context, "Manual")),
                                  ),
                                  DropdownMenuItem(
                                    value: 'daily',
                                    child: Text(tr(context, "Daily")),
                                  ),
                                  DropdownMenuItem(
                                    value: 'weekdays',
                                    child: Text(tr(context, "Weekdays")),
                                  ),
                                  DropdownMenuItem(
                                    value: 'weekly',
                                    child: Text(tr(context, "Weekly")),
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
                                      ? tr(context, "Paused")
                                      : tr(context, "Next {0}", [
                                          dayLabel(schedule.next(widget.store.today)),
                                        ]),
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
                                        schedule.paused
                                            ? tr(context, "Resume")
                                            : tr(context, "Pause"),
                                      ),
                                    ),
                                    if (!schedule.paused)
                                      TextButton(
                                        onPressed: () =>
                                            widget.store.skipRoutine(item.id),
                                        child: Text(tr(context, "Skip next")),
                                      ),
                                  ],
                                ),
                              ],
                            ],
                          ),
                    onTap: () => routines
                        ? edit(item)
                        : Navigator.push(
                            context,
                            MaterialPageRoute<void>(
                              builder: (_) => GoalPlanScreen(
                                store: widget.store,
                                ai: widget.ai,
                                goalId: item.id,
                                openFocus: widget.openFocus,
                                openDay: widget.openDay,
                              ),
                            ),
                          ),
                    trailing: !routines
                        ? PopupMenuButton<String>(
                            tooltip: tr(context, "Goal actions"),
                            icon: const Icon(Icons.more_horiz),
                            onSelected: (value) async {
                              if (value == 'edit') {
                                await edit(item);
                                return;
                              }
                              if (value == 'done') {
                                item.done = !item.done;
                                widget.store.changed();
                              }
                              if (value == 'delete') {
                                final remove = await showDialog<bool>(
                                  context: context,
                                  builder: (context) => AlertDialog(
                                    title: Text(
                                      tr(context, "Delete this goal?"),
                                    ),
                                    content: Text(
                                      tr(
                                        context,
                                        "Its plan will be removed. Daily tasks will remain.",
                                      ),
                                    ),
                                    actions: [
                                      TextButton(
                                        onPressed: () =>
                                            Navigator.pop(context, false),
                                        child: Text(tr(context, "Keep")),
                                      ),
                                      TextButton(
                                        onPressed: () =>
                                            Navigator.pop(context, true),
                                        child: Text(tr(context, "Delete")),
                                      ),
                                    ],
                                  ),
                                );
                                if (remove == true) {
                                  widget.store.goals.targets.removeWhere(
                                    (goal) => goal.id == item.id,
                                  );
                                  widget.store.changed();
                                }
                              }
                            },
                            itemBuilder: (_) => [
                              PopupMenuItem(
                                value: 'edit',
                                child: Text(tr(context, "Edit goal")),
                              ),
                              PopupMenuItem(
                                value: 'done',
                                child: Text(
                                  item.done
                                      ? tr(context, "Reopen goal")
                                      : tr(context, "Mark goal complete"),
                                ),
                              ),
                              PopupMenuItem(
                                value: 'delete',
                                child: Text(tr(context, "Delete goal")),
                              ),
                            ],
                          )
                        : IconButton(
                            tooltip: tr(context, "Delete {0}", [
                              routines ? 'routine' : 'goal',
                            ]),
                            onPressed: () async {
                              final remove = await showDialog<bool>(
                                context: context,
                                builder: (context) => AlertDialog(
                                  title: Text(tr(context, "Delete this item?")),
                                  content: Text(item.text),
                                  actions: [
                                    TextButton(
                                      onPressed: () =>
                                          Navigator.pop(context, false),
                                      child: Text(tr(context, "Keep")),
                                    ),
                                    TextButton(
                                      onPressed: () =>
                                          Navigator.pop(context, true),
                                      child: Text(tr(context, "Delete")),
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
