import 'package:flutter/material.dart';

import '../models/models.dart';
import '../services/cloud_sync.dart';

class WorkspaceAssignments extends StatefulWidget {
  final CloudSyncController account;
  const WorkspaceAssignments({super.key, required this.account});
  @override
  State<WorkspaceAssignments> createState() => _WorkspaceAssignmentsState();
}

class _WorkspaceAssignmentsState extends State<WorkspaceAssignments> {
  final member = TextEditingController();
  Map<String, String> workspaces = {};
  String taskKey = '', notice = '';
  bool busy = false, loaded = false;
  @override
  void dispose() {
    member.dispose();
    super.dispose();
  }

  Future<void> run(Future<void> Function() action) async {
    if (busy) return;
    setState(() {
      busy = true;
      notice = '';
    });
    try {
      await action();
    } catch (e) {
      if (mounted) notice = e is StateError ? e.message : e.toString();
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> refresh() => run(() async {
    loaded = false;
    taskKey = '';
    workspaces = {};
    workspaces = await widget.account.editorWorkspaces();
    loaded = true;
  });

  @override
  Widget build(BuildContext context) {
    final account = widget.account;
    String selected;
    try {
      selected = account.selectedWorkspace;
    } on StateError {
      return ListTile(
        title: const Text('Invalid workspace selection'),
        trailing: TextButton(
          onPressed: busy ? null : () => run(() => account.chooseWorkspace('')),
          child: const Text('Clear selection'),
        ),
      );
    }
    final tasks = <String, DatedTask>{
      for (final day in account.store.days.entries)
        for (final task in day.value)
          '${day.key}:${task.id}': DatedTask(day.key, task),
    };
    final row = tasks[taskKey];
    return ExpansionTile(
      title: const Text('Workspace assignments'),
      childrenPadding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      expandedCrossAxisAlignment: CrossAxisAlignment.stretch,
      onExpansionChanged: (open) {
        if (open) refresh();
      },
      children: [
        DropdownButtonFormField<String>(
          decoration: const InputDecoration(
            labelText: 'Workspace for assignments and AI usage',
          ),
          isExpanded: true,
          initialValue: selected,
          items: [
            const DropdownMenuItem(value: '', child: Text('Personal account')),
            if (selected.isNotEmpty && !workspaces.containsKey(selected))
              DropdownMenuItem(
                value: selected,
                enabled: false,
                child: Text('$selected (check access)'),
              ),
            for (final item in workspaces.entries)
              DropdownMenuItem(value: item.key, child: Text(item.value)),
          ],
          onChanged: busy
              ? null
              : (id) {
                  if (id != null)
                    run(() async {
                      await account.chooseWorkspace(id);
                      member.clear();
                    });
                },
        ),
        if (loaded && workspaces.isEmpty)
          const Text('You need editor access to a workspace to assign tasks.'),
        if (loaded && workspaces.containsKey(selected) && tasks.isEmpty)
          const Text('Add a task to your notebook to assign it.'),
        if (workspaces.containsKey(selected) && tasks.isNotEmpty) ...[
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            decoration: const InputDecoration(labelText: 'Task and steps'),
            isExpanded: true,
            initialValue: row == null ? null : taskKey,
            hint: const Text('Choose task'),
            items: [
              for (final item in tasks.entries)
                DropdownMenuItem(
                  value: item.key,
                  child: Text(
                    '${item.value.date} · ${item.value.task.text}',
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
            ],
            onChanged: busy
                ? null
                : (key) => setState(() => taskKey = key ?? ''),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: member,
            enabled: !busy,
            maxLength: 128,
            decoration: const InputDecoration(
              labelText: 'Assignee UID (optional)',
            ),
          ),
          FilledButton(
            onPressed: busy || row == null
                ? null
                : () => run(() async {
                    await account.assignTask(row, member.text);
                    notice = 'Assigned in Shiprite.';
                  }),
            child: const Text('Assign in Shiprite'),
          ),
        ],
        TextButton(
          onPressed: busy ? null : refresh,
          child: const Text('Refresh workspaces'),
        ),
        if (notice.isNotEmpty) Semantics(liveRegion: true, child: Text(notice)),
      ],
    );
  }
}
