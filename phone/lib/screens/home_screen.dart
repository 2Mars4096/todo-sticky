import '../interface_locale.dart';
import '../widgets/notebook_date_picker.dart';
import '../widgets/notebook_refresh.dart';

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
import '../widgets/notebook_capture_field.dart';
import '../widgets/task_grip.dart';
import '../widgets/notebook_motion.dart';
import '../widgets/dockit_footer_mark.dart';
import 'plan_screen.dart';
import 'albums_screen.dart';

class HomeScreen extends StatefulWidget {
  final WidgetBuilder? meetingBuilder;
  final ValueChanged<bool>? openArchive;
  final WidgetBuilder? syncIndicator;
  final StickyStore store;
  final AiService ai;
  final VoidCallback openFocus;
  const HomeScreen({
    super.key,
    this.meetingBuilder,
    this.openArchive,
    this.syncIndicator,
    required this.store,
    required this.ai,
    required this.openFocus,
  });
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final capture = TextEditingController();
  final captureFocus = FocusNode();
  final _scroll = ScrollController();
  final _viewport = GlobalKey();
  Timer? _dragScroll;
  Offset? _dragPosition;
  _EarlierTaskDrag? _activeDrag;
  String? _freshId;
  int _turnDirection = 0;

  void _turnTo(String key) {
    final store = widget.store;
    if (key == store.selectedDate) return;
    NotebookHaptics.tick();
    setState(() => _turnDirection = key.compareTo(store.selectedDate).sign);
    store.selectDate(key);
  }

  @override
  void dispose() {
    _endEarlierDrag(rebuild: false);
    _scroll.dispose();
    captureFocus.dispose();
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
      hitTestBehavior: HitTestBehavior.opaque,
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
      childWhenDragging: TaskGrip(
        height: taskControlHeight(context),
        visible: false,
      ),
      child: Semantics(
        label: tr(context, "Move {0} to Today", [row.task.text]),
        customSemanticsActions: {
          CustomSemanticsAction(label: ui('Move to Today')): () =>
              _moveEarlier(data),
        },
        child: Tooltip(
          message: tr(context, "Drag to Today"),
          child: TaskGrip(height: taskControlHeight(context)),
        ),
      ),
    );
  }

  void add() {
    try {
      final task = widget.store.addTask(capture.text);
      NotebookHaptics.commit();
      setState(() => _freshId = task.id);
    } catch (error) {
      showError(context, error);
      return;
    }
    capture.clear();
    captureFocus.requestFocus();
  }

  @override
  Widget build(BuildContext context) {
    final store = widget.store;
    final date = parseDate(store.selectedDate);
    final keyboardOpen = View.of(context).viewInsets.bottom > 0;
    final tasks = store.selectedTasks;
    final visibleTasks = tasks
        .where((row) => store.preferences.showCompleted || !row.task.closed)
        .toList();
    final earlier = store.earlierTasks;
    final completed = tasks
        .where((t) => t.task.status == TaskStatus.done)
        .length;
    final dateButton = TextButton(
      key: const ValueKey('notebook-date'),
      style: TextButton.styleFrom(
        foregroundColor: ink,
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
      onPressed: () async {
        final picked = await showNotebookDatePicker(context, date);
        if (mounted &&
            picked != null &&
            dateKey(picked) != store.selectedDate) {
          _turnTo(dateKey(picked));
        }
      },
      child: Tooltip(
        message: tr(context, "Choose a date"),
        child: Semantics(
          label: DateFormat.yMMMMEEEEd().format(date),
          excludeSemantics: true,
          child: FittedBox(
            fit: BoxFit.scaleDown,
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _DateStamp(
                  date: date,
                  today: store.selectedDate == store.today,
                ),
                const SizedBox(width: 10),
                Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      store.selectedDate == store.today
                          ? tr(context, "Today")
                          : DateFormat.EEEE().format(date),
                      maxLines: 1,
                      style: const TextStyle(
                        fontSize: 22,
                        height: 1.15,
                        fontWeight: FontWeight.w600,
                        letterSpacing: -.2,
                        color: ink,
                      ),
                    ),
                    if (!keyboardOpen &&
                        (store.selectedDate == store.today ||
                            date.year != DateTime.now().year))
                      Text(
                        store.selectedDate == store.today
                            ? DateFormat.EEEE().format(date)
                            : DateFormat.y().format(date),
                        maxLines: 1,
                        style: const TextStyle(
                          fontSize: 13,
                          height: 1.3,
                          color: mutedInk,
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(8, 4, 8, 0),
          child: Row(
            children: [
              if (!keyboardOpen && widget.openArchive != null)
                IconButton(
                  tooltip: tr(context, 'Search tasks'),
                  icon: const Icon(Icons.search_rounded),
                  onPressed: () => widget.openArchive!(false),
                ),
              IconButton(
                tooltip: tr(context, "Previous day"),
                onPressed: () => _turnTo(
                  dateKey(DateTime(date.year, date.month, date.day - 1)),
                ),
                icon: const Icon(Icons.chevron_left_rounded),
              ),
              Expanded(
                child: _EarlierTaskDropTarget(
                  key: const ValueKey('today-drop-header'),
                  canAccept: _canMoveEarlier,
                  onAccept: (data, _) => _moveEarlier(
                    data,
                    beforeId: store.tasksFor(store.today).firstOrNull?.id,
                  ),
                  child: Center(child: dateButton),
                ),
              ),
              IconButton(
                tooltip: tr(context, "Next day"),
                onPressed: () => _turnTo(
                  dateKey(DateTime(date.year, date.month, date.day + 1)),
                ),
                icon: const Icon(Icons.chevron_right_rounded),
              ),
              if (!keyboardOpen && widget.openArchive != null)
                IconButton(
                  tooltip: tr(context, 'Progress'),
                  icon: const Icon(Icons.insights_rounded),
                  onPressed: () => widget.openArchive!(true),
                ),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 4),
          child: NotebookCaptureField(
            controller: capture,
            focusNode: captureFocus,
            hint: tr(context, "What needs doing?"),
            actionLabel: tr(context, "Add task"),
            icon: Icons.add_rounded,
            onAdd: add,
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 0, 8, 0),
          child: Row(
            children: [
              if (widget.syncIndicator != null) widget.syncIndicator!(context),
              Expanded(
                child: Padding(
                  padding: EdgeInsets.only(
                    left: widget.syncIndicator == null ? 8 : 0,
                  ),
                  child: _DayProgress(done: completed, total: tasks.length),
                ),
              ),
              if (store.selectedDate != store.today)
                TextButton(
                  onPressed: () => _turnTo(store.today),
                  child: Text(tr(context, "Today")),
                ),
              IconButton(
                tooltip: store.preferences.showCompleted
                    ? tr(context, "Hide completed tasks")
                    : tr(context, "Show completed tasks"),
                onPressed: () {
                  NotebookHaptics.tick();
                  store.preferences.showCompleted =
                      !store.preferences.showCompleted;
                  store.changed();
                },
                icon: Icon(
                  store.preferences.showCompleted
                      ? Icons.visibility_rounded
                      : Icons.visibility_off_rounded,
                ),
              ),
              TextButton.icon(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute<void>(
                    builder: (_) => PlanScreen(store: store, ai: widget.ai),
                  ),
                ),
                icon: const Icon(Icons.auto_awesome_rounded, size: 18),
                label: Text(tr(context, "Plan")),
              ),
              IconButton(
                tooltip: tr(context, "Music for this work"),
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute<void>(
                    builder: (_) => AlbumsScreen(store: store, ai: widget.ai),
                  ),
                ),
                icon: const Icon(Icons.headphones_rounded),
              ),
            ],
          ),
        ),
        Expanded(
          child: Stack(
            children: [
              SizedBox.expand(
                key: _viewport,
                child: NotebookRefresh(
                  store: store,
                  child: TweenAnimationBuilder<double>(
                    key: ValueKey('page-${store.selectedDate}'),
                    tween: Tween(begin: _turnDirection == 0 ? 1 : 0, end: 1),
                    duration: motion(context, motionState),
                    curve: easeOutQuart,
                    onEnd: () => _turnDirection = 0,
                    builder: (context, t, child) => Opacity(
                      opacity: .35 + .65 * t,
                      child: Transform.translate(
                        offset: Offset(_turnDirection * 28 * (1 - t), 0),
                        child: child,
                      ),
                    ),
                    child: CustomScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      key: PageStorageKey(store.selectedDate),
                      controller: _scroll,
                      slivers: [
                        if (store.selectedDate == store.today &&
                            widget.meetingBuilder != null)
                          SliverToBoxAdapter(
                            child: widget.meetingBuilder!(context),
                          ),
                        if (tasks.isEmpty)
                          SliverToBoxAdapter(
                            child: _EarlierTaskDropTarget(
                              key: const ValueKey('today-drop-empty'),
                              canAccept: _canMoveEarlier,
                              onAccept: (data, _) => _moveEarlier(data),
                              child: Padding(
                                padding: EdgeInsets.symmetric(
                                  horizontal: 36,
                                  vertical: 48,
                                ),
                                child: Column(
                                  children: [
                                    const ExcludeSemantics(
                                      child: DockitFooterMark(size: 56),
                                    ),
                                    const SizedBox(height: 14),
                                    Text(
                                      tr(context, "No tasks yet"),
                                      style: const TextStyle(
                                        fontSize: 18,
                                        fontWeight: FontWeight.w600,
                                        color: mutedInk,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        if (tasks.isNotEmpty && visibleTasks.isEmpty)
                          SliverToBoxAdapter(
                            child: Padding(
                              padding: const EdgeInsets.symmetric(
                                vertical: 24,
                                horizontal: 16,
                              ),
                              child: Column(
                                children: [
                                  Text(
                                    tr(context, "No open tasks on this day"),
                                  ),
                                  TextButton(
                                    onPressed: () {
                                      store.preferences.showCompleted = true;
                                      store.changed();
                                    },
                                    child: Text(
                                      tr(context, "Show finished tasks"),
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
                            return _EarlierTaskDropTarget(
                              key: ValueKey('${row.date}/${row.task.id}'),
                              split: true,
                              canAccept: _canMoveEarlier,
                              onAccept: (data, after) => _moveEarlier(
                                data,
                                beforeId: after
                                    ? _afterTask(row.task.id)
                                    : row.task.id,
                              ),
                              child: TaskTile(
                                fresh: row.task.id == _freshId,
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
                                  leading: const Icon(
                                    Icons.history_rounded,
                                    color: mutedInk,
                                  ),
                                  title: Text(
                                    tr(context, "Earlier tasks ({0})", [
                                      earlier.length,
                                    ]),
                                  ),
                                  trailing: AnimatedRotation(
                                    turns: store.preferences.showEarlier
                                        ? .5
                                        : 0,
                                    duration: motion(context, motionState),
                                    curve: easeOutQuart,
                                    child: const Icon(
                                      Icons.expand_more_rounded,
                                    ),
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
                        const SliverToBoxAdapter(child: SizedBox(height: 88)),
                      ],
                    ),
                  ),
                ),
              ),
              Positioned(
                left: 0,
                right: 0,
                bottom: 0,
                child: Center(
                  child: UndoReceipt(
                    label: store.undoLabel,
                    actionLabel: tr(context, "Undo"),
                    onAction: store.undo,
                  ),
                ),
              ),
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
                  Text(
                    tr(context, "Open focus"),
                    style: TextStyle(color: paper),
                  ),
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

class _DateStamp extends StatelessWidget {
  const _DateStamp({required this.date, required this.today});

  final DateTime date;
  final bool today;

  @override
  Widget build(BuildContext context) => AnimatedContainer(
    duration: motion(context, motionState),
    curve: easeOutQuart,
    width: 46,
    padding: const EdgeInsets.fromLTRB(4, 3, 4, 4),
    decoration: BoxDecoration(
      color: today ? const Color(0xfff3dc8a) : const Color(0xfff5edbe),
      borderRadius: BorderRadius.circular(11),
      border: Border.all(
        color: today ? const Color(0xffc4a44a) : const Color(0xffe8d9a0),
      ),
      boxShadow: const [
        BoxShadow(
          color: Color(0x1f3d3520),
          offset: Offset(0, 1.5),
          blurRadius: 0,
        ),
      ],
    ),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(
          DateFormat.MMM().format(date),
          maxLines: 1,
          style: TextStyle(
            fontSize: 11,
            height: 1.2,
            fontWeight: FontWeight.w600,
            color: today ? amber : mutedInk,
          ),
        ),
        Text(
          '${date.day}',
          maxLines: 1,
          style: const TextStyle(
            fontSize: 21,
            height: 1.05,
            fontWeight: FontWeight.w700,
            fontFeatures: [FontFeature.tabularFigures()],
            color: ink,
          ),
        ),
      ],
    ),
  );
}

/// A quiet ring and count for the selected day.
class _DayProgress extends StatelessWidget {
  const _DayProgress({required this.done, required this.total});

  final int done;
  final int total;

  @override
  Widget build(BuildContext context) {
    if (total == 0) return const SizedBox.shrink();
    return Row(
      children: [
        TweenAnimationBuilder<double>(
          tween: Tween(end: done / total),
          duration: motion(context, const Duration(milliseconds: 420)),
          curve: easeOutQuart,
          builder: (context, value, _) => SizedBox.square(
            dimension: 16,
            child: CircularProgressIndicator(
              value: value,
              strokeWidth: 2.4,
              color: amber,
              backgroundColor: const Color(0xffe8d9a0),
              strokeCap: StrokeCap.round,
            ),
          ),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            tr(context, "{0} of {1} complete", [done, total]),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: mutedInk),
          ),
        ),
      ],
    );
  }
}
