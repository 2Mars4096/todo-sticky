import 'models.dart';

/// A plan step is completed only when every dated instance is completed.
/// Moving part of a task may leave the same parent identity on two dates.
class GoalStepProgress {
  final GoalPlanStep step;
  final List<DatedTask> tasks;
  GoalStepProgress(this.step, this.tasks);
  bool get scheduled => tasks.isNotEmpty;
  bool get done =>
      scheduled && tasks.every((t) => t.task.status == TaskStatus.done);
  bool get stopped => scheduled && !done && tasks.every((t) => t.task.closed);
}

class GoalProgress {
  final GoalItem goal;
  final List<GoalStepProgress> steps;
  GoalProgress(this.goal, this.steps);
  int get total => steps.length;
  int get completed => steps.where((step) => step.done).length;
  int get scheduled => steps.where((step) => step.scheduled).length;
  int get remaining => total - completed;
  double get fraction => total == 0 ? 0 : completed / total;
}
