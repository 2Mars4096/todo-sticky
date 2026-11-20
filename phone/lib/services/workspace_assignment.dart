import 'dart:convert';

import 'package:crypto/crypto.dart';

import '../models/models.dart';

final workspaceSlug = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_-]{0,95}$');

class WorkspaceAssignment {
  final String id, workspace;
  final Map<String, dynamic> body;
  WorkspaceAssignment(this.id, this.workspace, this.body);
  String get path => '/shiprite/workspaces/$workspace/assignments/$id';

  factory WorkspaceAssignment.fromTask(
    String uid,
    String workspace,
    DatedTask row,
    String assignee,
  ) {
    if (!workspaceSlug.hasMatch(workspace))
      throw StateError('Choose a workspace.');
    final lines = [row.task.text.trim()];
    void append(List<Task> steps, String indent) {
      for (final step in steps) {
        lines.add('$indent- ${step.text}');
        append(step.subtasks, '$indent  ');
      }
    }

    append(row.task.subtasks, '');
    final instructions = lines.join('\n');
    if (lines.first.isEmpty ||
        instructions.runes.length > 12000 ||
        assignee.runes.length > 128) {
      throw StateError(
        'Use a task with at most 12,000 characters including its steps and a valid member UID.',
      );
    }
    final identity = jsonEncode([
      'dockit-v1',
      uid,
      workspace,
      row.date,
      row.task.id,
      assignee,
    ]);
    final bytes = sha256.convert(utf8.encode(identity)).bytes.take(16).toList();
    bytes[6] = (bytes[6] & 15) | 128;
    bytes[8] = (bytes[8] & 63) | 128;
    final hex = bytes.map((n) => n.toRadixString(16).padLeft(2, '0')).join();
    final id = [
      hex.substring(0, 8),
      hex.substring(8, 12),
      hex.substring(12, 16),
      hex.substring(16, 20),
      hex.substring(20),
    ].join('-');
    return WorkspaceAssignment(id, workspace, {
      'title': String.fromCharCodes(lines.first.runes.take(200)),
      'instructions': instructions,
      'assigneeUid': assignee.isEmpty ? null : assignee,
    });
  }
}
