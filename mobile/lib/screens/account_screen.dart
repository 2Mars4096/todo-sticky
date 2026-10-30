import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../app.dart';
import '../widgets/sync_progress.dart';
import '../services/cloud_sync.dart';
import '../services/files.dart';
import '../state/sticky_store.dart';

/// Account support is an optional layer; creating the note never waits on cloud.
class AccountEnabledApp extends StatefulWidget {
  final StickyStore store;
  const AccountEnabledApp({super.key, required this.store});
  @override
  State<AccountEnabledApp> createState() => _AccountEnabledAppState();
}

class _AccountEnabledAppState extends State<AccountEnabledApp>
    with WidgetsBindingObserver {
  late final CloudSyncController account;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    account = CloudSyncController(
      store: widget.store,
      openBrowser: (uri) =>
          launchUrl(uri, mode: LaunchMode.externalApplication),
      isEditing: () {
        final context = FocusManager.instance.primaryFocus?.context;
        return context?.widget is EditableText ||
            context?.findAncestorWidgetOfExactType<EditableText>() != null;
      },
    );
    _initialize();
  }

  Future<void> _initialize() async {
    await widget.store.initialize();
    if (mounted) await account.initialize();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) =>
      account.setActive(state == AppLifecycleState.resumed);
  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    account.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => StickyApp(
    store: widget.store,
    accountBuilder: (_) => AccountScreen(account: account),
    syncIndicatorBuilder: (context) => ListenableBuilder(
      listenable: account,
      builder: (context, _) {
        final attention = account.error != null || account.conflicts.isNotEmpty;
        final local = !account.enabled;
        final label = attention
            ? 'Sync needs attention'
            : local
            ? 'Local only'
            : account.busy
            ? 'Syncing'
            : account.upToDate
            ? 'Synced with cloud'
            : 'Waiting to sync';
        final icon = attention
            ? Icons.error_outline
            : local
            ? Icons.cloud_off_outlined
            : account.busy
            ? Icons.sync
            : account.upToDate
            ? Icons.cloud_done_outlined
            : Icons.cloud_queue_outlined;
        return IconButton(
          tooltip: '$label. Open Account',
          icon: Icon(
            icon,
            size: 18,
            color: attention ? Theme.of(context).colorScheme.error : mutedInk,
          ),
          onPressed: () => Navigator.push(
            context,
            MaterialPageRoute<void>(
              builder: (_) => AccountScreen(account: account),
            ),
          ),
        );
      },
    ),
  );
}

class AccountScreen extends StatefulWidget {
  final CloudSyncController account;
  const AccountScreen({super.key, required this.account});
  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  late final TextEditingController endpoint;
  bool configuring = false;
  String? setupError;
  @override
  void initState() {
    super.initState();
    endpoint = TextEditingController(text: widget.account.server);
  }

  @override
  void dispose() {
    endpoint.dispose();
    super.dispose();
  }

  Future<void> run(Future<void> Function() action) async {
    FocusScope.of(context).unfocus();
    try {
      await action();
    } catch (cause) {
      if (mounted) showError(context, cause);
    }
  }

  Future<void> configure() async {
    FocusScope.of(context).unfocus();
    setState(() {
      configuring = true;
      setupError = null;
    });
    try {
      await widget.account.configure(endpoint.text);
    } catch (cause) {
      if (mounted) {
        setState(
          () => setupError = cause
              .toString()
              .replaceFirst('Bad state: ', '')
              .replaceFirst('FormatException: ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => configuring = false);
    }
  }

  String title(SyncAction action) => action.key.startsWith('day:')
      ? 'Notes · ${action.key.substring(4)}'
      : action.key == 'goals'
      ? 'Goals and routines'
      : 'Focus session';
  String preview(Map<String, dynamic>? payload) {
    if (payload == null) return 'Deleted on this device';
    final tasks = payload['tasks'];
    if (tasks is List) {
      return tasks.isEmpty
          ? 'No tasks'
          : tasks
                .take(5)
                .map((task) => '• ${(task as Map)['text']}')
                .join('\n');
    }
    if (payload['targets'] is List) {
      return '${(payload['targets'] as List).length} goals · ${(payload['recurring'] as List).length} routines';
    }
    return payload['taskText'] as String? ?? 'Saved work';
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.account,
    builder: (context, _) {
      final account = widget.account;
      final unavailable =
          configuring || account.busy || account.signingIn || !account.ready;
      return Scaffold(
        appBar: AppBar(title: const Text('Account & sync')),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 40),
          children: [
            if (account.session != null) ...[
              Text(
                account.session!.email,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 16),
            ],
            if (account.session == null) ...[
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                initiallyExpanded: account.server.isEmpty,
                title: const Text('Sync service'),
                subtitle: Text(
                  account.server.isEmpty
                      ? 'Connect your Google Cloud backend'
                      : account.server,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
                children: [
                  TextField(
                    controller: endpoint,
                    enabled: !unavailable,
                    keyboardType: TextInputType.url,
                    autocorrect: false,
                    decoration: const InputDecoration(
                      labelText: 'Service URL',
                      hintText: 'https://sticky-sync.example.com',
                    ),
                    onSubmitted: (_) {
                      if (!unavailable) configure();
                    },
                  ),
                  const SizedBox(height: 12),
                  if (setupError != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(
                        setupError!,
                        style: TextStyle(
                          color: Theme.of(context).colorScheme.error,
                        ),
                      ),
                    ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton.tonal(
                      onPressed: unavailable ? null : configure,
                      child: Text(
                        configuring ? 'Connecting…' : 'Connect service',
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: unavailable || account.server.isEmpty
                    ? null
                    : () => run(account.signIn),
                icon: const Icon(Icons.account_circle_outlined),
                label: const Text('Continue with Google'),
              ),
              if (account.signingIn)
                TextButton(
                  onPressed: account.cancelSignIn,
                  child: const Text('Cancel sign-in'),
                ),
            ] else ...[
              SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                title: const Text('Sync this notebook'),
                subtitle: Text(
                  account.enabled
                      ? 'Syncs while the app is open.'
                      : 'Upload tasks, goals and completed sessions.',
                ),
                value: account.enabled,
                onChanged: unavailable
                    ? null
                    : (value) => run(() => account.setEnabled(value)),
              ),
              const SizedBox(height: 12),
              Wrap(
                spacing: 10,
                runSpacing: 8,
                children: [
                  FilledButton.icon(
                    onPressed: unavailable || !account.enabled
                        ? null
                        : () => run(() => account.synchronize()),
                    icon: account.busy
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.sync),
                    label: Text(account.busy ? 'Syncing…' : 'Sync now'),
                  ),
                  OutlinedButton(
                    onPressed: unavailable ? null : () => run(account.signOut),
                    child: const Text('Sign out'),
                  ),
                  if (account.error != null)
                    TextButton(
                      onPressed: unavailable ? null : () => run(account.signIn),
                      child: const Text('Reconnect Google'),
                    ),
                ],
              ),
            ],
            if (account.busy && account.progress != null)
              SyncProgressView(progress: account.progress!),
            if (!account.busy && account.message.isNotEmpty) ...[
              const SizedBox(height: 16),
              Semantics(
                liveRegion: true,
                child: Text(
                  account.message,
                  style: const TextStyle(color: mutedInk, height: 1.4),
                ),
              ),
            ],
            if (account.error != null) ...[
              const SizedBox(height: 10),
              Semantics(
                liveRegion: true,
                child: Text(
                  account.error!,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.error,
                    height: 1.4,
                  ),
                ),
              ),
            ],
            if (account.lastSynced != null)
              Padding(
                padding: const EdgeInsets.only(top: 10),
                child: Text(
                  'Last sync: ${account.lastSynced!.substring(0, 16).replaceAll('T', ' ')}',
                  style: const TextStyle(color: mutedInk, fontSize: 12),
                ),
              ),
            if (account.conflicts.isNotEmpty) ...[
              const Divider(height: 36),
              Text('Conflicts', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              const Text('Both copies saved', style: TextStyle(height: 1.4)),
              for (final conflict in account.conflicts)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title(conflict),
                        style: const TextStyle(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 10),
                      const Text(
                        'ON THIS DEVICE',
                        style: TextStyle(
                          fontSize: 11,
                          color: mutedInk,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        preview(conflict.local),
                        maxLines: 7,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        'IN YOUR ACCOUNT',
                        style: TextStyle(
                          fontSize: 11,
                          color: mutedInk,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        preview(
                          conflict.remote?.deleted == true
                              ? null
                              : conflict.remote?.payload,
                        ),
                        maxLines: 7,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 10),
                      Wrap(
                        spacing: 10,
                        runSpacing: 8,
                        children: [
                          OutlinedButton(
                            onPressed: unavailable
                                ? null
                                : () => run(
                                    () => account.synchronize(
                                      resolveKey: conflict.key,
                                      reviewedFingerprint:
                                          syncConflictFingerprint(conflict),
                                    ),
                                  ),
                            child: const Text('Keep device version'),
                          ),
                          FilledButton.tonal(
                            onPressed: unavailable
                                ? null
                                : () => run(
                                    () => account.synchronize(
                                      resolveKey: conflict.key,
                                      reviewedFingerprint:
                                          syncConflictFingerprint(conflict),
                                      useCloud: true,
                                    ),
                                  ),
                            child: const Text('Use account version'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
            ],
            if (account.session != null)
              TextButton.icon(
                onPressed: unavailable
                    ? null
                    : () => run(
                        () => NativeFiles.write(
                          'sticky-todo-sync-recovery.json',
                          'application/json',
                          account.exportRecovery(),
                        ),
                      ),
                icon: const Icon(Icons.download_outlined),
                label: const Text('Export conflict recovery copies'),
              ),
          ],
        ),
      );
    },
  );
}
