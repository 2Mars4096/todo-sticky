import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../app.dart';
import '../models/models.dart';
import '../state/sticky_store.dart';
import '../services/ai_service.dart';
import '../widgets/task_tile.dart';
import 'plan_screen.dart';
import 'albums_screen.dart';

class HomeScreen extends StatefulWidget {
  final StickyStore store;
  final AiService ai;
  final VoidCallback openFocus;
  const HomeScreen({
    super.key,
    required this.store,
    required this.ai,
    required this.openFocus,
  });
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final capture = TextEditingController();
  @override
  void dispose() {
    capture.dispose();
    super.dispose();
  }

  void add() {
    if (capture.text.trim().isEmpty) return;
    widget.store.addTask(capture.text);
    capture.clear();
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final date = parseDate(store.selectedDate);
    final tasks = store.selectedTasks;
    final visibleTasks = tasks
        .where((row) => store.preferences.showCompleted || !row.task.closed)
        .toList();
    final earlier = store.earlierTasks;
    final completed = tasks
        .where((t) => t.task.status == TaskStatus.done)
        .length;
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: Row(
            children: [
              IconButton(
                tooltip: 'Previous day',
                onPressed: () => store.selectDate(
                  dateKey(DateTime(date.year, date.month, date.day - 1)),
                ),
                icon: const Icon(Icons.chevron_left),
              ),
              Expanded(
                child: TextButton(
                  onPressed: () async {
                    final picked = await showDatePicker(
                      context: context,
                      initialDate: date,
                      firstDate: DateTime(1970),
                      lastDate: DateTime(2100),
                    );
                    if (picked != null) store.selectDate(dateKey(picked));
                  },
                  child: Column(
                    children: [
                      Text(
                        store.selectedDate == store.today
                            ? 'Today'
                            : DateFormat('EEEE').format(date),
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w700,
                          color: ink,
                        ),
                      ),
                      Text(
                        DateFormat('d MMMM y').format(date),
                        style: const TextStyle(color: mutedInk),
                      ),
                    ],
                  ),
                ),
              ),
              IconButton(
                tooltip: 'Next day',
                onPressed: () => store.selectDate(
                  dateKey(DateTime(date.year, date.month, date.day + 1)),
                ),
                icon: const Icon(Icons.chevron_right),
              ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
          child: TextField(
            controller: capture,
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => add(),
            minLines: 1,
            maxLines: 4,
            decoration: InputDecoration(
              hintText: 'What needs doing?',
              suffixIcon: IconButton(
                tooltip: 'Add task',
                onPressed: add,
                icon: const Icon(Icons.add_rounded),
              ),
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  tasks.isEmpty ? '' : '$completed of ${tasks.length} complete',
                  style: const TextStyle(color: mutedInk),
                ),
              ),
              if (store.selectedDate != store.today)
                TextButton(
                  onPressed: () => store.selectDate(store.today),
                  child: const Text('Today'),
                ),
              IconButton(
                tooltip: store.preferences.showCompleted
                    ? 'Hide completed tasks'
                    : 'Show completed tasks',
                onPressed: () {
                  store.preferences.showCompleted =
                      !store.preferences.showCompleted;
                  store.changed();
                },
                icon: Icon(
                  store.preferences.showCompleted
                      ? Icons.visibility_outlined
                      : Icons.visibility_off_outlined,
                ),
              ),
              TextButton.icon(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute<void>(
                    builder: (_) => PlanScreen(store: store, ai: widget.ai),
                  ),
                ),
                icon: const Icon(Icons.auto_awesome_outlined, size: 18),
                label: const Text('Plan'),
              ),
              IconButton(
                tooltip: 'Music for this work',
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute<void>(
                    builder: (_) => AlbumsScreen(store: store, ai: widget.ai),
                  ),
                ),
                icon: const Icon(Icons.headphones_outlined),
              ),
            ],
          ),
        ),
        if (store.undoLabel != null)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            color: const Color(0xfff1e2a0),
            child: Row(
              children: [
                Expanded(child: Text(store.undoLabel!)),
                TextButton(onPressed: store.undo, child: const Text('Undo')),
              ],
            ),
          ),
        Expanded(
          child: CustomScrollView(
            key: PageStorageKey(store.selectedDate),
            slivers: [
              if (tasks.isEmpty)
                const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.symmetric(horizontal: 36, vertical: 48),
                    child: Column(
                      children: [
                        Icon(
                          Icons.edit_note_rounded,
                          size: 52,
                          color: mutedInk,
                        ),
                        SizedBox(height: 12),
                        Text(
                          'No tasks yet',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              SliverReorderableList(
                itemCount: visibleTasks.length,
                onReorderItem: (oldIndex, newIndex) {
                  final from = tasks.indexOf(visibleTasks[oldIndex]);
                  final to = tasks.indexOf(visibleTasks[newIndex]);
                  store.reorder(
                    store.selectedDate,
                    null,
                    from,
                    to > from ? to + 1 : to,
                  );
                },
                itemBuilder: (context, index) {
                  final row = visibleTasks[index];
                  return TaskTile(
                    key: ValueKey('${row.date}/${row.task.id}'),
                    reorderIndex: index,
                    store: store,
                    ai: widget.ai,
                    date: row.date,
                    task: row.task,
                    openFocus: widget.openFocus,
                  );
                },
              ),
              if (earlier.isNotEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: Column(
                      children: [
                        const Divider(),
                        ListTile(
                          leading: Badge(
                            isLabelVisible: !store.preferences.showEarlier,
                            child: const Icon(Icons.history_rounded),
                          ),
                          title: Text('Earlier tasks (${earlier.length})'),
                          trailing: Icon(
                            store.preferences.showEarlier
                                ? Icons.expand_less
                                : Icons.expand_more,
                          ),
                          onTap: () {
                            store.preferences.showEarlier =
                                !store.preferences.showEarlier;
                            store.changed();
                          },
                        ),
                      ],
                    ),
                  ),
                ),
              if (store.preferences.showEarlier)
                SliverList.builder(
                  itemCount: earlier.length,
                  itemBuilder: (context, index) => TaskTile(
                    key: ValueKey(
                      '${earlier[index].date}/${earlier[index].task.id}',
                    ),
                    store: store,
                    ai: widget.ai,
                    date: earlier[index].date,
                    task: earlier[index].task,
                    openFocus: widget.openFocus,
                    showDate: true,
                  ),
                ),
              const SliverToBoxAdapter(child: SizedBox(height: 24)),
            ],
          ),
        ),
        if (store.focus.activeSession != null)
          InkWell(
            onTap: widget.openFocus,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
              color: const Color(0xff3e321b),
              child: Row(
                children: [
                  const Icon(Icons.nightlight_round, color: paper, size: 20),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      store.focus.activeSession!.taskText,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(color: paper),
                    ),
                  ),
                  const Text('Open focus', style: TextStyle(color: paper)),
                ],
              ),
            ),
          ),
      ],
    );
  }
}
