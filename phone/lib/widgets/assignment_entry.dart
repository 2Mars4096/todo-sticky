import 'package:flutter/widgets.dart';

import '../services/cloud_sync.dart';

class AssignmentEntry extends InheritedWidget {
  final void Function(String date, String id) open;
  final CloudSyncController account;
  const AssignmentEntry({
    super.key,
    required this.open,
    required this.account,
    required super.child,
  });
  static AssignmentEntry? of(BuildContext context) =>
      context.dependOnInheritedWidgetOfExactType<AssignmentEntry>();
  @override
  bool updateShouldNotify(AssignmentEntry previous) => previous.open != open;
}
