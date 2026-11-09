import 'dart:convert';

import 'package:flutter/services.dart';

import '../models/models.dart';

class NativeFiles {
  static const channel = MethodChannel('sticky_todo/files');
  static Future<String?> read() => channel.invokeMethod<String>('read');
  static Future<void> write(String filename, String mime, String content) =>
      channel.invokeMethod<void>('write', {
        'filename': filename,
        'mime': mime,
        'content': content,
      });
}

String markdownDay(String date, List<Task> tasks) {
  final buffer = StringBuffer('## $date\n\n');
  void append(Task task, int depth) {
    const marks = {
      TaskStatus.todo: ' ',
      TaskStatus.done: 'x',
      TaskStatus.partial: '~',
      TaskStatus.question: '?',
      TaskStatus.stopped: '-',
    };
    final metadata = task.finish == null
        ? ''
        : ' <!-- sticky-todo:finish=${jsonEncode(task.finish!.toJson()).replaceAll('<', r'\u003c').replaceAll('>', r'\u003e')} -->';
    final goal = task.goalId == null
        ? ''
        : ' <!-- sticky-todo:goal=${jsonEncode({"goalId": task.goalId, if (task.goalStepId != null) "goalStepId": task.goalStepId}).replaceAll('<', r'\u003c').replaceAll('>', r'\u003e')} -->';
    final needsText =
        task.text.contains('\n') ||
        task.text.contains('\r') ||
        task.text.contains('<!--');
    final text = needsText
        ? '${task.text.split(RegExp(r"[\r\n]")).first.replaceAll("<!--", "&lt;!--")} <!-- sticky-todo:text=${jsonEncode(task.text).replaceAll('<', r'\u003c').replaceAll('>', r'\u003e')} -->'
        : task.text;
    buffer.writeln(
      '${'  ' * depth}- [${marks[task.status]}] $text$goal$metadata <!-- sticky-todo:id=${task.id} -->',
    );
    for (final child in task.subtasks) {
      append(child, depth + 1);
    }
  }

  for (final task in tasks) {
    append(task, 0);
  }
  return buffer.toString();
}

List<Task> parseMarkdownTasks(String markdown, {bool keepIds = false}) {
  if (markdown.length > 20 * 1024 * 1024) {
    throw const FormatException('Import exceeds 20 MB');
  }
  final roots = <Task>[];
  final stack = <({int indent, Task task})>[];
  final taskPattern = RegExp(r'^(\s*)[-*] (?:\[(.)\]\s+)?(.*)$');
  final idPattern = RegExp(
    r'\s*<!--\s*sticky-todo:id=([A-Za-z0-9_-]+)\s*-->\s*$',
  );
  final finishPattern = RegExp(r'\s*<!-- sticky-todo:finish=(.*?) -->\s*$');
  final goalPattern = RegExp(r'\s*<!-- sticky-todo:goal=(.*?) -->\s*$');
  final textPattern = RegExp(r'\s*<!-- sticky-todo:text=(.*?) -->\s*$');
  for (final line in markdown.split('\n')) {
    final match = taskPattern.firstMatch(line);
    if (match == null) continue;
    var text = match[3]!.trim();
    final id = idPattern.firstMatch(text)?[1];
    text = text.replaceFirst(idPattern, '');
    FinishPromise? finish;
    final metadata = finishPattern.firstMatch(text)?[1];
    if (metadata != null) {
      finish = FinishPromise.fromJson(object(jsonDecode(metadata)));
      text = text.replaceFirst(finishPattern, '');
    }
    String? goalId, goalStepId;
    final goalMetadata = goalPattern.firstMatch(text)?[1];
    if (goalMetadata != null) {
      final goal = object(jsonDecode(goalMetadata));
      goalId = goalLinkId(goal['goalId']);
      goalStepId = goalLinkId(goal['goalStepId']);
      if (goalId == null) throw const FormatException('Invalid goal link');
      text = text.replaceFirst(goalPattern, '');
    }
    final paragraph = textPattern.firstMatch(text)?[1];
    if (paragraph != null) {
      try {
        final decoded = jsonDecode(paragraph);
        if (decoded is String) text = decoded;
      } on FormatException {
        /* Preserve malformed text for recovery. */
      }
    }
    if (text.trim().isEmpty) continue;
    final indent = match[1]!.replaceAll('\t', '  ').length;
    while (stack.isNotEmpty && stack.last.indent >= indent) {
      stack.removeLast();
    }
    if (stack.length > 32) {
      throw const FormatException('Task nesting is too deep');
    }
    final task = Task(
      id: keepIds ? id : null,
      text: text.trim(),
      finish: finish,
      goalId: goalId,
      // A pasted copy is new work under the goal, not a second plan instance.
      goalStepId: keepIds ? goalStepId : null,
      status: switch (match[2]) {
        'x' || 'X' => TaskStatus.done,
        '~' => TaskStatus.partial,
        '?' => TaskStatus.question,
        '-' => TaskStatus.stopped,
        _ => TaskStatus.todo,
      },
    );
    (stack.isEmpty ? roots : stack.last.task.subtasks).add(task);
    stack.add((indent: indent, task: task));
  }
  return roots;
}
