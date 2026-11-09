import 'models.dart';

// Matches desktop UTF-16 FNV text fingerprints, including non-ASCII tasks.
String planTextHash(String text) {
  var hash = 2166136261;
  for (final code in text.codeUnits) {
    hash = ((hash ^ code) * 16777619) & 0xffffffff;
  }
  return hash.toRadixString(36);
}

bool replaceablePlanStep(Task task, String date) {
  final hash = RegExp(r'_h([a-z0-9]+)$').firstMatch(task.id)?.group(1);
  return task.id.startsWith('plan_${date}_') &&
      task.status == TaskStatus.todo &&
      task.finish == null &&
      task.subtasks.isEmpty &&
      hash != null &&
      hash == planTextHash(task.text);
}

String routineTaskId(String id, String date) {
  final encoded = id.runes.map((code) => code.toRadixString(16)).join('-');
  final key = encoded.length <= 120
      ? encoded
      : '${planTextHash(id)}_${planTextHash(String.fromCharCodes(id.runes.toList().reversed))}_${id.length}';
  return 'routine_${key}_$date';
}

class RoutineSchedule {
  final String cadence;
  final String anchor;
  bool paused;
  String? handledThrough;
  RoutineSchedule({
    required this.cadence,
    required this.anchor,
    this.paused = false,
    this.handledThrough,
  });
  factory RoutineSchedule.fromJson(Map<String, dynamic> j) {
    if (!['manual', 'daily', 'weekdays', 'weekly'].contains(j['cadence']) ||
        j['paused'] is! bool) {
      throw const FormatException('Invalid routine schedule');
    }
    final anchor = j['anchor'] as String;
    parseDate(anchor);
    final handled = j['handledThrough'] as String?;
    if (handled != null) parseDate(handled);
    return RoutineSchedule(
      cadence: j['cadence'] as String,
      anchor: anchor,
      paused: j['paused'] as bool,
      handledThrough: handled,
    );
  }
  Map<String, dynamic> toJson() => {
    'cadence': cadence,
    'anchor': anchor,
    'paused': paused,
    if (handledThrough != null) 'handledThrough': handledThrough,
  };
  String? next(String today) {
    if (paused || cadence == 'manual') return null;
    var date = parseDate(today.compareTo(anchor) >= 0 ? today : anchor);
    if (handledThrough != null &&
        dateKey(date).compareTo(handledThrough!) <= 0) {
      final handled = parseDate(handledThrough!);
      date = DateTime(handled.year, handled.month, handled.day + 1);
    }
    final weekday = parseDate(anchor).weekday;
    for (var i = 0; i < 7; i++) {
      if (cadence == 'daily' ||
          cadence == 'weekdays' && date.weekday <= 5 ||
          cadence == 'weekly' && date.weekday == weekday) {
        return dateKey(date);
      }
      date = DateTime(date.year, date.month, date.day + 1);
    }
    return null;
  }
}

class ArchiveRow {
  final String date;
  final Task root;
  final Task task;
  final List<String> parents;
  ArchiveRow(this.date, this.root, this.task, this.parents);
}

List<ArchiveRow> archiveRows(Map<String, List<Task>> days) {
  final rows = <ArchiveRow>[];
  final dates = days.keys.toList()..sort((a, b) => b.compareTo(a));
  void visit(String date, Task root, Task task, List<String> parents) {
    rows.add(ArchiveRow(date, root, task, parents));
    for (final child in task.subtasks) {
      visit(date, root, child, [...parents, task.text]);
    }
  }

  for (final date in dates) {
    for (final task in days[date]!) {
      visit(date, task, task, []);
    }
  }
  return rows;
}

List<ArchiveRow> searchRows(
  List<ArchiveRow> rows,
  String query,
  String status,
) {
  final words = query
      .trim()
      .toLowerCase()
      .split(RegExp(r'\s+'))
      .where((word) => word.isNotEmpty);
  return rows
      .where(
        (row) =>
            (status == 'all' ||
                status == 'open' && !row.task.closed ||
                row.task.status.name == status) &&
            words.every(
              (word) => [
                row.task.text,
                row.task.finish?.doneWhen ?? '',
                ...row.parents,
              ].join(' ').toLowerCase().contains(word),
            ),
      )
      .toList();
}
