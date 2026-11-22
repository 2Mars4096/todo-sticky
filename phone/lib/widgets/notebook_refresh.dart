import 'package:flutter/material.dart';

import '../state/sticky_store.dart';

/// All routes opened by the account-enabled notebook share its opt-in sync.
class NotebookSyncScope extends InheritedWidget {
  const NotebookSyncScope({
    super.key,
    required this.refresh,
    required super.child,
  });
  final Future<void> Function() refresh;

  @override
  bool updateShouldNotify(NotebookSyncScope oldWidget) =>
      refresh != oldWidget.refresh;
}

class NotebookRefresh extends StatelessWidget {
  const NotebookRefresh({super.key, required this.store, required this.child});
  final StickyStore store;
  final Widget child;

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: () async {
      final sync = context.getInheritedWidgetOfExactType<NotebookSyncScope>();
      try {
        await (sync?.refresh ?? store.refreshNotebook)();
      } catch (error) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(error.toString().replaceFirst('Bad state: ', '')),
            ),
          );
        }
      }
    },
    child: child,
  );
}
