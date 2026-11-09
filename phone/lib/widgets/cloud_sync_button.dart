import 'package:flutter/material.dart';

import '../app.dart';
import '../services/cloud_sync.dart';

/// A sync command; account configuration remains in Settings.
class CloudSyncButton extends StatelessWidget {
  final CloudSyncController account;
  const CloudSyncButton({super.key, required this.account});

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: account,
    builder: (context, _) {
      final attention = account.error != null || account.conflicts.isNotEmpty;
      final local = !account.enabled;
      final foreground = account.busy && !account.background;
      final label = attention
          ? 'Sync needs attention'
          : local
          ? 'Sync is off'
          : foreground
          ? 'Syncing'
          : account.upToDate
          ? 'Synced with cloud'
          : 'Waiting to sync';
      final icon = attention
          ? Icons.error_outline
          : local
          ? Icons.cloud_off_outlined
          : account.upToDate
          ? Icons.cloud_done_outlined
          : Icons.cloud_queue_outlined;
      final color = attention ? Theme.of(context).colorScheme.error : mutedInk;
      return IconButton(
        tooltip: local
            ? 'Sync is off. Settings → Account & sync'
            : '$label. Sync now',
        icon: foreground
            ? SizedBox(
                width: 18,
                height: 18,
                child: CircularProgressIndicator(strokeWidth: 2, color: color),
              )
            : Icon(icon, size: 18, color: color),
        onPressed:
            !account.ready ||
                !account.store.ready ||
                local ||
                account.busy ||
                account.signingIn
            ? null
            : () async {
                if (account.busy) return;
                await account.synchronize();
                if (!context.mounted) return;
                final messenger = ScaffoldMessenger.of(context);
                messenger.hideCurrentSnackBar();
                messenger.showSnackBar(
                  SnackBar(
                    content: Text(
                      account.message.isEmpty
                          ? 'Sync requested'
                          : account.message,
                    ),
                    duration: const Duration(seconds: 3),
                  ),
                );
              },
      );
    },
  );
}
