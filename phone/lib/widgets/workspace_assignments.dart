import '../interface_locale.dart';
import '../suite_destination_label.dart';

import 'package:flutter/material.dart';

import '../models/models.dart';
import '../models/workflow.dart';
import '../services/cloud_sync.dart';

class WorkspaceAssignments extends StatefulWidget {
  final CloudSyncController account;
  final String? initialTask;
  const WorkspaceAssignments({
    super.key,
    required this.account,
    this.initialTask,
  });
  @override
  State<WorkspaceAssignments> createState() => _WorkspaceAssignmentsState();
}

class _WorkspaceAssignmentsState extends State<WorkspaceAssignments> {
  final member = TextEditingController();
  Map<String, String> workspaces = {};
  String taskKey = '', notice = '';
  bool busy = false, loaded = false;
  ({String label, int revision, Uri url})? receipt;
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

  @override
  void initState() {
    super.initState();
    if (widget.initialTask != null) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) refresh();
      });
    }
  }

  Future<void> refresh() => run(() async {
    loaded = false;
    receipt = null;
    member.clear();
    taskKey = widget.initialTask ?? '';
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
        title: Text(tr(context, "Invalid workspace selection")),
        trailing: TextButton(
          onPressed: busy ? null : () => run(() => account.chooseWorkspace('')),
          child: Text(tr(context, "Clear selection")),
        ),
      );
    }
    final tasks = <String, DatedTask>{
      for (final item in archiveRows(account.store.days))
        '${item.date}:${item.task.id}': DatedTask(item.date, item.task),
    };
    final row = tasks[taskKey];
    Future<void> send(bool statusOnly) => run(() async {
      if (row == null) return;
      receipt = null;
      await account.store.flush();
      final result = await account.assignTask(
        row,
        member.text,
        statusOnly: statusOnly,
      );
      if (mounted && account.selectedWorkspace == selected) receipt = result;
    });
    return ExpansionTile(
      initiallyExpanded: widget.initialTask != null,
      title: Text(tr(context, "Workspace assignments")),
      subtitle: Text(
        workspaces[selected] ??
            (selected.isEmpty ? tr(context, "Personal notebook") : selected),
      ),
      childrenPadding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      expandedCrossAxisAlignment: CrossAxisAlignment.stretch,
      onExpansionChanged: (open) {
        if (open) refresh();
      },
      children: [
        DropdownButtonFormField<String>(
          decoration: InputDecoration(
            labelText: tr(context, "Workspace for assignments and AI usage"),
          ),
          isExpanded: true,
          initialValue: selected,
          items: [
            DropdownMenuItem(
              value: '',
              child: Text(tr(context, "Personal account")),
            ),
            if (selected.isNotEmpty && !workspaces.containsKey(selected))
              DropdownMenuItem(
                value: selected,
                enabled: false,
                child: Text(tr(context, "{0} (check access)", [selected])),
              ),
            for (final item in workspaces.entries)
              DropdownMenuItem(value: item.key, child: Text(item.value)),
          ],
          onChanged: busy
              ? null
              : (id) {
                  if (id != null) {
                    run(() async {
                      await account.chooseWorkspace(id);
                      member.clear();
                      taskKey = selected.isEmpty
                          ? widget.initialTask ?? ''
                          : '';
                      receipt = null;
                    });
                  }
                },
        ),
        if (loaded && workspaces.isEmpty)
          Text(
            tr(
              context,
              "You need editor access to a workspace to assign tasks.",
            ),
          ),
        if (loaded && workspaces.containsKey(selected) && tasks.isEmpty)
          Text(tr(context, "Add a task to your notebook to assign it.")),
        if (workspaces.containsKey(selected) && tasks.isNotEmpty) ...[
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            key: ValueKey(selected),
            decoration: InputDecoration(
              labelText: tr(context, "Task and steps"),
            ),
            isExpanded: true,
            initialValue: row == null ? null : taskKey,
            hint: Text(tr(context, "Choose task")),
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
                : (key) => setState(() {
                    taskKey = key ?? '';
                    receipt = null;
                    notice = '';
                  }),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: member,
            onChanged: (_) => setState(() {
              receipt = null;
              notice = '';
            }),
            enabled: !busy,
            maxLength: 128,
            decoration: InputDecoration(
              labelText: tr(context, "Assignee UID (optional)"),
            ),
          ),
          if (row != null) ...[
            Text(row.task.text),
            if (row.task.subtasks.isNotEmpty)
              ExpansionTile(
                title: Text(tr(context, "Included steps")),
                children: [
                  for (final item in archiveRows({row.date: row.task.subtasks}))
                    ListTile(dense: true, title: Text(item.task.text)),
                ],
              ),
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 8),
              child: Text(
                tr(context, "Visible to members of {0}. {1}", [
                  workspaces[selected],
                  member.text.trim().isEmpty
                      ? "Any editor can start this assignment."
                      : "The recipient needs editor access.",
                ]),
              ),
            ),
          ],
          Wrap(
            spacing: 8,
            children: [
              FilledButton(
                onPressed: busy || row == null ? null : () => send(false),
                child: Text(tr(context, "Assign in Shiprite")),
              ),
              TextButton(
                onPressed: busy || row == null ? null : () => send(true),
                child: Text(tr(context, "Check status")),
              ),
            ],
          ),
          if (receipt case final confirmed?) ...[
            Semantics(
              liveRegion: true,
              child: Text(
                tr(context, "{0} · Revision {1}", [
                  tr(context, confirmed.label),
                  confirmed.revision,
                ]),
              ),
            ),
            TextButton(
              onPressed: busy
                  ? null
                  : () => run(() async {
                      if (!await account.openBrowser(confirmed.url)) {
                        throw StateError(ui("Could not open Shiprite."));
                      }
                    }),
              child: SuiteDestinationLabel(
                product: 'shiprite',
                label: tr(context, "Open in Shiprite"),
              ),
            ),
          ],
        ],
        TextButton(
          onPressed: busy ? null : refresh,
          child: Text(tr(context, "Refresh workspaces")),
        ),
        if (notice.isNotEmpty) Semantics(liveRegion: true, child: Text(notice)),
      ],
    );
  }
}
