import 'package:intl/intl.dart';

import 'models/models.dart';

// Display formats for stored yyyy-MM-dd keys. Keys stay ISO in storage and
// sync; people read locale skeletons that omit the year when it is current.

DateTime? _parse(String? key) {
  if (key == null || key.isEmpty) return null;
  try {
    return parseDate(key);
  } on FormatException {
    return null;
  }
}

String dayLabel(String? key, {DateTime? now}) {
  final date = _parse(key);
  if (date == null) return key ?? '';
  return dayLabelOf(date, now: now);
}

String dayLabelOf(DateTime date, {DateTime? now}) {
  final year = (now ?? DateTime.now()).year;
  return (date.year == year ? DateFormat.MMMd() : DateFormat.yMMMd()).format(
    date,
  );
}

String weekdayDayLabel(String? key, {DateTime? now}) {
  final date = _parse(key);
  if (date == null) return key ?? '';
  final year = (now ?? DateTime.now()).year;
  return (date.year == year ? DateFormat.MMMEd() : DateFormat.yMMMEd()).format(
    date,
  );
}

String dayRangeLabel(String from, String until, {DateTime? now}) =>
    '${dayLabel(from, now: now)} – ${dayLabel(until, now: now)}';

String timestampLabel(String? iso) {
  if (iso == null || iso.isEmpty) return '';
  final stamp = DateTime.tryParse(iso);
  if (stamp == null) return iso;
  final local = stamp.toLocal();
  return '${dayLabelOf(local)} ${DateFormat.Hm().format(local)}';
}
