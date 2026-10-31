import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';
import 'package:flutter/services.dart';
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
  final _scroll = ScrollController();
  final _viewport = GlobalKey();
  Timer? _dragScroll;
  Offset? _dragPosition;
  _EarlierTaskDrag? _activeDrag;

  @override
  void dispose() {
    _endEarlierDrag(rebuild: false);
    _scroll.dispose();
    capture.dispose();
    super.dispose();
  }

  bool _canMoveEarlier(_EarlierTaskDrag data) {
    final store = widget.store;
    final task = store
        .tasksFor(data.date)
        .where((t) => t.id == data.id)
        .firstOrNull;
    return !data.cancelled &&
        store.selectedDate == store.today &&
        data.date.compareTo(store.today) < 0 &&
        task != null &&
        !task.closed &&
        store.findTask(store.today, data.id) == null;
  }

  void _moveEarlier(_EarlierTaskDrag data, {String? beforeId}) {
    if (!_canMoveEarlier(data)) return;
    try {
      widget.store.moveTask(
        data.date,
        data.id,
        widget.store.today,
        beforeId: beforeId,
      );
      _endEarlierDrag();
    } catch (error) {
      if (mounted) showError(context, error);
    }
  }

  String? _afterTask(String id) {
    final tasks = widget.store.tasksFor(widget.store.today);
    final index = tasks.indexWhere((task) => task.id == id);
    return index >= 0 && index + 1 < tasks.length ? tasks[index + 1].id : null;
  }

  void _startEarlierDrag(_EarlierTaskDrag data) {
    setState(() => _activeDrag = data);
    HardwareKeyboard.instance.addHandler(_onDragKey);
    _dragScroll = Timer.periodic(const Duration(milliseconds: 16), (_) {
      final box = _viewport.currentContext?.findRenderObject();
      final pointer = _dragPosition;
      if (box is! RenderBox || pointer == null || !_scroll.hasClients) return;
      final top = box.localToGlobal(Offset.zero).dy;
      final bottom = top + box.size.height;
      const edge = 64.0;
      final speed = pointer.dy < top + edge
          ? -((top + edge - pointer.dy) / edge).clamp(0.0, 1.0) * 12
          : pointer.dy > bottom - edge
          ? ((pointer.dy - bottom + edge) / edge).clamp(0.0, 1.0) * 12
          : 0.0;
      if (speed == 0) return;
      final position = _scroll.position;
      final next = (position.pixels + speed).clamp(
        position.minScrollExtent,
        position.maxScrollExtent,
      );
      if (next != position.pixels) _scroll.jumpTo(next);
    });
  }

  bool _onDragKey(KeyEvent event) {
    if (event is! KeyDownEvent ||
        event.logicalKey != LogicalKeyboardKey.escape) {
      return false;
    }
    _activeDrag?.cancelled = true;
    _endEarlierDrag();
    return true;
  }

  void _endEarlierDrag({bool rebuild = true}) {
    _dragScroll?.cancel();
    _dragScroll = null;
    _dragPosition = null;
    if (_activeDrag != null && rebuild && mounted) {
      setState(() => _activeDrag = null);
    } else {
      _activeDrag = null;
    }
    HardwareKeyboard.instance.removeHandler(_onDragKey);
  }

  Widget _earlierHandle(DatedTask row) {
    final data = _EarlierTaskDrag(row.date, row.task.id);
    return Draggable<_EarlierTaskDrag>(
      data: data,
      maxSimultaneousDrags: 1,
      onDragStarted: () => _startEarlierDrag(data),
      onDragUpdate: (details) => _dragPosition = details.globalPosition,
      onDragEnd: (_) => _endEarlierDrag(),
      feedback: Material(
        elevation: 6,
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(8),
        child: SizedBox(
          width: (MediaQuery.sizeOf(context).width - 48).clamp(160.0, 280.0),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
            child: Row(
              children: [
                const Icon(Icons.drag_indicator, size: 18, color: amber),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    row.task.text,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      childWhenDragging: const SizedBox(
        width: 44,
        height: 52,
        child: Icon(Icons.drag_indicator, size: 18, color: Colors.transparent),
      ),
      child: Semantics(
        label: 'Move ${row.task.text} to Today',
        customSemanticsActions: {
          const CustomSemanticsAction(label: 'Move to Today'): () =>
              _moveEarlier(data),
        },
        child: const Tooltip(
          message: 'Drag to Today',
          child: SizedBox(
            width: 44,
            height: 52,
            child: Icon(Icons.drag_indicator, size: 18, color: mutedInk),
          ),
        ),
      ),
    );
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
                child: _EarlierTaskDropTarget(
                  key: const ValueKey('today-drop-header'),
                  canAccept: _canMoveEarlier,
                  onAccept: (data, _) => _moveEarlier(
                    data,
                    beforeId: store.tasksFor(store.today).firstOrNull?.id,
                  ),
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
            textInputAction: TextInputAction.newline,
            keyboardType: TextInputType.multiline,
            minLines: 1,
            maxLines: View.of(context).viewInsets.bottom > 0 ? 3 : 6,
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
          child: SizedBox.expand(
            key: _viewport,
            child: CustomScrollView(
              key: PageStorageKey(store.selectedDate),
              controller: _scroll,
              slivers: [
                if (tasks.isEmpty)
                  SliverToBoxAdapter(
                    child: _EarlierTaskDropTarget(
                      key: const ValueKey('today-drop-empty'),
                      canAccept: _canMoveEarlier,
                      onAccept: (data, _) => _moveEarlier(data),
                      child: const Padding(
                        padding: EdgeInsets.symmetric(
                          horizontal: 36,
                          vertical: 48,
                        ),
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
                    return _EarlierTaskDropTarget(
                      key: ValueKey('${row.date}/${row.task.id}'),
                      split: true,
                      canAccept: _canMoveEarlier,
                      onAccept: (data, after) => _moveEarlier(
                        data,
                        beforeId: after ? _afterTask(row.task.id) : row.task.id,
                      ),
                      child: TaskTile(
                        reorderIndex: index,
                        store: store,
                        ai: widget.ai,
                        date: row.date,
                        task: row.task,
                        openFocus: widget.openFocus,
                      ),
                    );
                  },
                ),
                if (earlier.isNotEmpty)
                  SliverToBoxAdapter(
                    child: Column(
                      children: [
                        _EarlierTaskDropTarget(
                          key: const ValueKey('today-drop-end'),
                          canAccept: _canMoveEarlier,
                          onAccept: (data, _) => _moveEarlier(data),
                          child: const SizedBox(
                            height: 16,
                            width: double.infinity,
                          ),
                        ),
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
                if (store.preferences.showEarlier)
                  SliverList.builder(
                    itemCount: earlier.length,
                    itemBuilder: (context, index) => _KeepAliveDuringDrag(
                      key: ValueKey(
                        '${earlier[index].date}/${earlier[index].task.id}',
                      ),
                      active:
                          _activeDrag?.date == earlier[index].date &&
                          _activeDrag?.id == earlier[index].task.id,
                      child: TaskTile(
                        store: store,
                        ai: widget.ai,
                        date: earlier[index].date,
                        task: earlier[index].task,
                        openFocus: widget.openFocus,
                        showDate: true,
                        dragHandle: _earlierHandle(earlier[index]),
                      ),
                    ),
                  ),
                const SliverToBoxAdapter(child: SizedBox(height: 24)),
              ],
            ),
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

class _EarlierTaskDrag {
  final String date;
  final String id;
  bool cancelled = false;
  _EarlierTaskDrag(this.date, this.id);
}

class _KeepAliveDuringDrag extends StatefulWidget {
  final bool active;
  final Widget child;
  const _KeepAliveDuringDrag({
    super.key,
    required this.active,
    required this.child,
  });

  @override
  State<_KeepAliveDuringDrag> createState() => _KeepAliveDuringDragState();
}

class _KeepAliveDuringDragState extends State<_KeepAliveDuringDrag>
    with AutomaticKeepAliveClientMixin<_KeepAliveDuringDrag> {
  @override
  bool get wantKeepAlive => widget.active;

  @override
  void didUpdateWidget(_KeepAliveDuringDrag oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.active != widget.active) updateKeepAlive();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return widget.child;
  }
}

class _EarlierTaskDropTarget extends StatefulWidget {
  final Widget child;
  final bool split;
  final bool Function(_EarlierTaskDrag) canAccept;
  final void Function(_EarlierTaskDrag, bool after) onAccept;

  const _EarlierTaskDropTarget({
    super.key,
    required this.child,
    required this.canAccept,
    required this.onAccept,
    this.split = false,
  });

  @override
  State<_EarlierTaskDropTarget> createState() => _EarlierTaskDropTargetState();
}

class _EarlierTaskDropTargetState extends State<_EarlierTaskDropTarget> {
  bool _after = false;

  bool _isAfter(Offset offset) {
    if (!widget.split) return false;
    final box = context.findRenderObject();
    return box is RenderBox &&
        box.globalToLocal(offset).dy >= box.size.height / 2;
  }

  @override
  Widget build(BuildContext context) => DragTarget<_EarlierTaskDrag>(
    onWillAcceptWithDetails: (details) => widget.canAccept(details.data),
    onMove: (details) {
      final after = _isAfter(details.offset);
      if (after != _after) setState(() => _after = after);
    },
    onAcceptWithDetails: (details) {
      if (widget.canAccept(details.data)) {
        widget.onAccept(details.data, _isAfter(details.offset));
      }
    },
    builder: (context, candidates, rejected) => Stack(
      fit: StackFit.passthrough,
      children: [
        widget.child,
        if (candidates.any((data) => data != null && widget.canAccept(data)))
          Positioned(
            left: 20,
            right: 20,
            top: _after ? null : 0,
            bottom: _after ? 0 : null,
            child: const IgnorePointer(
              child: SizedBox(height: 3, child: ColoredBox(color: amber)),
            ),
          ),
      ],
    ),
  );
}
