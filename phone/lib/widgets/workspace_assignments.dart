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
  bool busy = false;
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
      if (mounted) notice = e.toString();
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> refresh() => run(() async {
    workspaces = {};
    workspaces = await widget.account.editorWorkspaces();
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
      onExpansionChanged: (open) {
        if (open) refresh();
      },
      children: [
        const Text('Workspace for assignments and AI usage'),
        DropdownButton<String>(
          isExpanded: true,
          value: selected,
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
                  if (id != null) run(() => account.chooseWorkspace(id));
                },
        ),
        if (workspaces.containsKey(selected)) ...[
          DropdownButton<String>(
            isExpanded: true,
            value: row == null ? null : taskKey,
            hint: const Text('Choose task and steps'),
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
        if (notice.isNotEmpty) Text(notice),
      ],
    );
  }
}
