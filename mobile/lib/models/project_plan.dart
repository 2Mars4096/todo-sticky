import 'models.dart';

class ProjectWindow {
  final String from, until;
  final int minutes;
  final bool weekdays;
  const ProjectWindow({
    required this.from,
    required this.until,
    required this.minutes,
    this.weekdays = false,
  });
  void validate() {
    final start = parseDate(from), end = parseDate(until);
    final span = DateTime.utc(
      end.year,
      end.month,
      end.day,
    ).difference(DateTime.utc(start.year, start.month, start.day)).inDays;
    if (span < 0 || span > 90 || minutes < 15 || minutes > 480) {
      throw ArgumentError('Choose up to 90 days and 15–480 minutes per day.');
    }
  }

  Map<String, dynamic> toJson() => {
    'from': from,
    'until': until,
    'minutesPerDay': minutes,
    'weekdaysOnly': weekdays,
  };
}

class ProjectAction {
  final String id;
  final String? stepId;
  String text, date;
  int minutes;
  ProjectAction({
    String? id,
    this.stepId,
    required this.text,
    required this.date,
    required this.minutes,
  }) : id = id ?? newId();
}

List<ProjectAction> validateProjectActions(
  List<ProjectAction> actions,
  GoalItem goal,
  Set<String> scheduled,
  ProjectWindow window,
) {
  window.validate();
  if (actions.isEmpty || actions.length > 30) {
    throw ArgumentError('Keep between 1 and 30 tasks in the proposal.');
  }
  final ids = <String>{}, texts = <String>{}, totals = <String, int>{};
  for (final action in actions) {
    parseDate(action.date);
    if (action.date.compareTo(window.from) < 0 ||
        action.date.compareTo(window.until) > 0 ||
        window.weekdays && parseDate(action.date).weekday > 5) {
      throw ArgumentError('Choose a permitted date within the plan range.');
    }
    if (action.text.trim().isEmpty ||
        action.text.length > 5000 ||
        action.minutes < 5 ||
        action.minutes > window.minutes) {
      throw ArgumentError(
        'Each task needs text and an estimate within the daily budget.',
      );
    }
    if (!ids.add(action.stepId ?? action.id) ||
        !texts.add(action.text.trim().toLowerCase())) {
      throw ArgumentError('Remove duplicate tasks from the proposal.');
    }
    if (action.stepId != null &&
        (!goal.plan.any((step) => step.id == action.stepId) ||
            scheduled.contains(action.stepId))) {
      throw StateError(
        'A step changed or is already scheduled. Generate a fresh proposal.',
      );
    }
    if (action.stepId == null &&
        goal.plan.any(
          (step) =>
              step.text.trim().toLowerCase() ==
              action.text.trim().toLowerCase(),
        )) {
      throw StateError(
        'Use the existing project step instead of duplicating it.',
      );
    }
    final total = (totals[action.date] ?? 0) + action.minutes;
    if (total > window.minutes) {
      throw ArgumentError('The project budget is exceeded on ${action.date}.');
    }
    totals[action.date] = total;
  }
  return actions;
}
