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
    buffer.writeln(
      '${'  ' * depth}- [${marks[task.status]}] ${task.text.replaceAll('\n', ' ')}$metadata <!-- sticky-todo:id=${task.id} -->',
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
