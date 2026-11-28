import '../interface_locale.dart';

import 'dart:async';
import 'dart:convert';

import 'mynit_citation.dart';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../models/models.dart';
import '../app.dart' show errorText;

typedef MeetingRequest = Future<Map<String, dynamic>> Function(
  String path, [
  Map<String, dynamic>? body,
]);

class MeetingFollowups extends StatefulWidget {
  final MeetingRequest request;
  final VoidCallback onAdded;
  const MeetingFollowups({
    super.key,
    required this.request,
    required this.onAdded,
  });
  @override
  State<MeetingFollowups> createState() => _MeetingFollowupsState();
}

class _MeetingFollowupsState extends State<MeetingFollowups>
    with WidgetsBindingObserver {
  List<Map<String, dynamic>> reviews = [];
  int? before, head;
  int depth = 1;
  bool loading = false, open = false;
  String? error;
  Timer? timer;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    load();
    timer = Timer.periodic(const Duration(minutes: 1), (_) {
      if (WidgetsBinding.instance.lifecycleState == AppLifecycleState.resumed) {
        load();
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) load();
  }

  @override
  void dispose() {
    timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<void> load({bool older = false}) async {
    if (loading || (older && before == null)) return;
    setState(() {
      loading = true;
      error = null;
    });
    try {
      final rows = older ? [...reviews] : <Map<String, dynamic>>[];
      var cursor = older ? before : null;
      var newest = head;
      var pages = older ? depth : 0;
      final target = older ? depth + 1 : depth;
      do {
        final packet = cursor == null
            ? await widget.request('todo-reviews/refresh', {})
            : await widget.request('todo-reviews?before=$cursor');
        if (!mounted) return;
        if (cursor == null) newest = packet['head'] as int?;
        final seen = rows.map((r) => r['meeting_id']).toSet();
        for (final value in packet['reviews'] as List) {
          final row = object(value);
          if (row['cleared'] != true && seen.add(row['meeting_id'])) {
            rows.add(row);
          }
        }
        cursor = packet['before'] as int?;
        pages++;
      } while (cursor != null && pages < target);
      setState(() {
        reviews = rows;
        head = newest;
        before = cursor;
        depth = pages;
      });
    } catch (e) {
      if (mounted) setState(() => error = errorText(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> clear(Map<String, dynamic>? row) async {
    final through = row == null ? head : row['sequence'] as int?;
    if (through == null || loading) return;
    setState(() => loading = true);
    if (row == null) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: Text(tr(context, "Clear all suggestions?")),
          content: Text(
            tr(context, "Your meetings and tasks already added will stay."),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: Text(tr(context, "Cancel")),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: Text(tr(context, "Clear suggestions")),
            ),
          ],
        ),
      );
      if (!mounted) return;
      if (ok != true) {
        setState(() => loading = false);
        return;
      }
    }
    try {
      await widget.request('todo-reviews/clear', {
        'through': through,
        if (row != null) 'meeting_id': row['meeting_id'],
      });
      if (!mounted) return;
      setState(
        () => reviews.removeWhere(
          (r) =>
              (r['sequence'] as int) <= through &&
              (row == null || r['meeting_id'] == row['meeting_id']),
        ),
      );
    } catch (e) {
      if (mounted) setState(() => error = errorText(e));
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final total = reviews.fold<int>(0, (n, r) => n + (r['count'] as int));
    return Column(
      children: [
        ListTile(
          title: Text(tr(context, "Meeting follow-ups")),
          trailing: Text(tr(context, "{0} suggested", [total])),
          leading: Icon(open ? Icons.expand_less : Icons.expand_more),
          onTap: () => setState(() => open = !open),
        ),
        Offstage(
          offstage: !open,
          child: Column(
            children: [
              if (error != null)
                ListTile(
                  title: Text(error!),
                  trailing: TextButton(
                    onPressed: () => load(),
                    child: Text(tr(context, "Retry")),
                  ),
                ),
              if (loading && reviews.isEmpty) const LinearProgressIndicator(),
              if (!loading && error == null && reviews.isEmpty)
                ListTile(title: Text(tr(context, "No meeting reviews yet"))),
              if (head != null && (total > 0 || before != null))
                Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: loading ? null : () => clear(null),
                    child: Text(tr(context, "Clear all suggestions")),
                  ),
                ),
              for (final r in reviews)
                _Review(
                  key: ValueKey(
                    [r['meeting_id'], r['analysis_id'], r['cleared']].join('/'),
                  ),
                  row: r,
                  request: widget.request,
                  onAdded: widget.onAdded,
                  onClear: loading ? null : () => clear(r),
                ),
              if (before != null)
                TextButton(
                  onPressed: loading ? null : () => load(older: true),
                  child: Text(
                    loading
                        ? tr(context, "Loading…")
                        : tr(context, "Older reviews"),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _Review extends StatefulWidget {
  final Map<String, dynamic> row;
  final MeetingRequest request;
  final VoidCallback onAdded;
  final VoidCallback? onClear;
  const _Review({
    super.key,
    required this.row,
    required this.request,
    required this.onAdded,
    required this.onClear,
  });
  @override
  State<_Review> createState() => _ReviewState();
}

class _ReviewState extends State<_Review> {
  Map<String, dynamic>? preview;
  final selected = <int>{};
  final requestIds = <String, String>{};
  bool open = false, busy = false;
  String? error;
  String get path =>
      'meetings/${Uri.encodeComponent(widget.row['meeting_id'] as String)}/todo-push';
  Future<void> fetch() async {
    if (busy) return;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final value = await widget.request(path);
      if (value['analysis_id'] != widget.row['analysis_id']) {
        throw StateError(ui("The meeting analysis changed. Refresh the list."));
      }
      if (mounted) {
        setState(() {
          preview = value;
          selected.clear();
        });
      }
    } catch (e) {
      if (mounted) setState(() => error = errorText(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> add(List<int> indices) async {
    if (busy || indices.isEmpty || indices.length > 40) return;
    final data = preview!;
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final actions = data['actions'] as List;
      final body = {
        'kind': 'tasks',
        'task_date': dateKey(DateTime.now()),
        'transcript_revision': data['transcript_revision'],
        'analysis_fingerprint': data['analysis_fingerprint'],
        'actions': [
          for (final i in indices)
            {
              'index': i,
              'text': actions[i]['todo_text'] ?? actions[i]['text'],
              'due_date':
                  RegExp(r'^\d{4}-\d{2}-\d{2}$')
                      .hasMatch(actions[i]['due_date']?.toString() ?? '')
                  ? actions[i]['due_date']
                  : null,
            },
        ],
      };
      final requestId = requestIds.putIfAbsent(jsonEncode(body), newId);
      final receipt = await widget.request(path, {
        ...body,
        'request_id': requestId,
      });
      final records = receipt['records'];
      if (receipt['source_revision'] != data['transcript_revision'] ||
          records is! List ||
          !records.whereType<Map>().any(
            (row) =>
                row['record_type'] == 'task' &&
                row['record_id'] is String &&
                RegExp(r'^[A-Za-z0-9][A-Za-z0-9_.:-]{0,159}$')
                    .hasMatch(row['record_id']),
          )) {
        throw StateError(
          ui("Dockit did not confirm these tasks. Reload or retry."),
        );
      }
      if (!mounted) return;
      setState(() {
        for (final i in indices) {
          actions[i]['pushed'] = true;
        }
        selected.clear();
      });
      widget.onAdded();
    } catch (e) {
      if (mounted) setState(() => error = errorText(e));
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = widget.row;
    final indices = List<int>.from(preview?['todo_indices'] ?? r['indices']);
    final actions = preview?['actions'] as List? ?? [];
    final available = indices
        .where(
          (i) => i >= 0 && i < actions.length && actions[i]['pushed'] != true,
        )
        .toList();
    final picks = available.length == 1
        ? available
        : available.where(selected.contains).toList();
    final stamp = DateTime.tryParse(r['reviewed_at']?.toString() ?? '');
    return Column(
      children: [
        ListTile(
          title: Text(r['title'] as String),
          subtitle: stamp == null
              ? null
              : Text(
                  tr(context, "Reviewed {0}", [
                    DateFormat.yMMMd().format(stamp.toLocal()),
                  ]),
                ),
          trailing: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('${r['count']}'),
              IconButton(
                tooltip: tr(context, "Dismiss follow-ups: {0}", [r['title']]),
                onPressed: busy ? null : widget.onClear,
                icon: const Icon(Icons.delete_outline),
              ),
            ],
          ),
          onTap: r['count'] == 0
              ? null
              : () {
                  setState(() => open = !open);
                  if (open && preview == null) fetch();
                },
        ),
        if (open)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              children: [
                if (busy) const LinearProgressIndicator(),
                if (error != null)
                  ListTile(
                    title: Text(error!),
                    trailing: TextButton(
                      onPressed: busy ? null : fetch,
                      child: Text(tr(context, "Reload")),
                    ),
                  ),
                for (final i in indices.where(
                  (i) => i >= 0 && i < actions.length,
                )) ...[
                  if (actions[i]['pushed'] == true || available.length == 1)
                    ListTile(
                      title: Text(
                        actions[i]['todo_text'] ?? actions[i]['text'],
                      ),
                      subtitle: actions[i]['pushed'] == true
                          ? Text(tr(context, "Added to your Dockit notebook"))
                          : null,
                    )
                  else
                    CheckboxListTile(
                      contentPadding: EdgeInsets.zero,
                      controlAffinity: ListTileControlAffinity.leading,
                      title: Text(
                        actions[i]['todo_text'] ?? actions[i]['text'],
                      ),
                      value: selected.contains(i),
                      onChanged: busy
                          ? null
                          : (v) => setState(() {
                              if (v == true) {
                                selected.add(i);
                              } else {
                                selected.remove(i);
                              }
                            }),
                    ),
                  if (actions[i]['owner'] != null ||
                      actions[i]['due_date'] != null)
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        [
                          actions[i]['owner'],
                          actions[i]['due_date'],
                        ].whereType<String>().join(' · '),
                      ),
                    ),
                  ExpansionTile(
                    key: PageStorageKey('$path/$i'),
                    dense: true,
                    title: Text(tr(context, "Transcript")),
                    children: [
                      for (final e in actions[i]['evidence'])
                        MynitPassage(
                          meeting: r['meeting_id'],
                          revision: preview?['transcript_revision'],
                          evidence: e,
                        ),
                    ],
                  ),
                ],
                if (picks.length > 40)
                  Text(tr(context, "Choose up to 40 suggestions at a time.")),
                if (picks.isNotEmpty)
                  Align(
                    alignment: Alignment.centerRight,
                    child: Text(tr(context, "Your Dockit notebook · Today")),
                  ),
                if (picks.isNotEmpty)
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton(
                      onPressed: busy || picks.length > 40
                          ? null
                          : () => add(picks),
                      child: Text(
                        available.length == 1
                            ? tr(context, "Add to today")
                            : tr(context, "Add {0} to today", [picks.length]),
                      ),
                    ),
                  ),
              ],
            ),
          ),
      ],
    );
  }
}
