import '../interface_locale.dart';

import 'dart:async';

import 'package:flutter/services.dart';

import '../services/ai_service.dart';
import '../models/workflow.dart';
import 'archive_screen.dart';

import 'package:flutter/material.dart';

import '../app.dart';
import '../widgets/meeting_followups.dart';
import '../widgets/workspace_assignments.dart';
import '../widgets/assignment_entry.dart';
import '../widgets/sync_progress.dart';
import '../widgets/conflict_items.dart';
import '../widgets/cloud_sync_button.dart';
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
  late final AiService linkAi;
  final navigator = GlobalKey<NavigatorState>();
  final focusRequests = ValueNotifier(0);
  static const links = MethodChannel('sticky_todo/links');
  bool openingLink = false, accountRouteOpen = false;
  String? lastLinkMessage;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    account = CloudSyncController(
      store: widget.store,
      openBrowser: (uri) async =>
          await links.invokeMethod<bool>('openExternal', {
            'url': uri.toString(),
          }) ??
          false,
      isEditing: () {
        final context = FocusManager.instance.primaryFocus?.context;
        final editor = context?.widget is EditableText
            ? context!.widget as EditableText
            : context?.findAncestorWidgetOfExactType<EditableText>();
        return editor != null && editor.controller.text.isNotEmpty;
      },
    );
    linkAi = AiService(
      widget.store.credentials,
      sharedRequest: account.requestAgent,
    );
    account.addListener(_retryPendingLink);
    links.setMethodCallHandler((call) async {
      if (call.method == 'available') await _takeTaskLink();
    });
    FocusManager.instance.addListener(_retryPendingLink);
    FocusManager.instance.addListener(account.editingFinished);
    _initialize();
  }

  Future<void> _initialize() async {
    await widget.store.initialize();
    if (mounted) await account.initialize();
    if (mounted) {
      await _takeTaskLink();
      WidgetsBinding.instance.addPostFrameCallback((_) => _retryPendingLink());
    }
  }

  Future<void> _takeTaskLink() async {
    try {
      final raw = await links.invokeMethod<String>('take');
      final id = raw == null ? null : parseTodoTaskLink(raw);
      if (id != null && mounted) {
        widget.store.syncMetadata['pendingSharedTaskLink'] = id;
        widget.store.changed();
        await widget.store.flush();
        lastLinkMessage = null;
        _retryPendingLink();
      }
    } on MissingPluginException {
      /* Widget/browser tests have no native link channel. */
    } catch (cause) {
      _linkMessage(cause.toString());
    }
  }

  void _retryPendingLink() {
    if (mounted) unawaited(_openPendingLink());
  }

  void _linkMessage(String text) {
    if (!mounted || lastLinkMessage == text) return;
    lastLinkMessage = text;
    final context = navigator.currentContext;
    if (context == null) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(text),
        action: SnackBarAction(
          label: tr(context, "Cancel link"),
          onPressed: () {
            widget.store.syncMetadata.remove('pendingSharedTaskLink');
            widget.store.changed();
            unawaited(widget.store.flush());
          },
        ),
      ),
    );
  }

  Future<void> _openPendingLink() async {
    final id = widget.store.syncMetadata['pendingSharedTaskLink'];
    if (!mounted ||
        !widget.store.ready ||
        id is! String ||
        openingLink ||
        account.busy ||
        account.signingIn ||
        account.isEditing() ||
        navigator.currentState == null) {
      return;
    }
    if (account.session == null ||
        account.server != dianeSharedOrigin ||
        (!account.enabled && datedNotebookTask(id) == null)) {
      if (!accountRouteOpen) {
        accountRouteOpen = true;
        unawaited(
          navigator.currentState!
              .push<void>(
                MaterialPageRoute(
                  builder: (_) => AccountScreen(account: account),
                ),
              )
              .whenComplete(() => accountRouteOpen = false),
        );
      }
      return;
    }
    openingLink = true;
    try {
      Map? source;
      final target = await account.resolveSharedTask(
        id,
        onSource: (value) => source = value,
      );
      if (!mounted ||
          widget.store.syncMetadata['pendingSharedTaskLink'] != id ||
          account.isEditing()) {
        return;
      }
      final matches = archiveRows(widget.store.days)
          .where(
            (row) => row.date == target.date && row.task.id == target.taskId,
          )
          .toList();
      if (matches.length != 1) {
        throw StateError(
          ui(
            "This shared task has not synced yet. Review sync in Account; the link is retained.",
          ),
        );
      }
      await widget.store.flush();
      if (!mounted) return;
      unawaited(
        navigator.currentState!.push<void>(
          MaterialPageRoute(
            builder: (_) => TaskReviewScreen(
              store: widget.store,
              ai: linkAi,
              row: matches.single,
              mynitSource: source,
              openFocus: () {
                focusRequests.value++;
              },
            ),
          ),
        ),
      );
      widget.store.syncMetadata.remove('pendingSharedTaskLink');
      widget.store.changed();
      await widget.store.flush();
      lastLinkMessage = null;
    } catch (cause) {
      _linkMessage(cause.toString().replaceFirst('Bad state: ', ''));
    } finally {
      openingLink = false;
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) =>
      account.setActive(state == AppLifecycleState.resumed);
  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    FocusManager.instance.removeListener(account.editingFinished);
    account.removeListener(_retryPendingLink);
    FocusManager.instance.removeListener(_retryPendingLink);
    links.setMethodCallHandler(null);
    focusRequests.dispose();
    linkAi.dispose();
    account.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => AssignmentEntry(
    account: account,
    open: (date, id) => navigator.currentState?.push<void>(
      MaterialPageRoute(
        builder: (_) =>
            AccountScreen(account: account, assignmentKey: '$date:$id'),
      ),
    ),
    child: StickyApp(
      store: widget.store,
      navigatorKey: navigator,
      externalFocusRequests: focusRequests,
      sharedAgent: account.requestAgent,
      meetingBuilder: (_) => ListenableBuilder(
        listenable: account,
        builder: (_, child) {
          final session = account.session;
          if (session == null || session.origin != dianeSharedOrigin) {
            return const SizedBox.shrink();
          }
          return MeetingFollowups(
            key: ValueKey(session.owner),
            request: (path, [body]) =>
                account.meetingRequest(session.owner, path, body),
            onAdded: () {
              if (account.enabled) {
                unawaited(account.synchronize(background: true));
              }
            },
          );
        },
      ),
      accountBuilder: (_) => AccountScreen(account: account),
      syncIndicatorBuilder: (context) => ListenableBuilder(
        listenable: account,
        builder: (_, _) => account.ready && account.session == null
            ? ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 106),
                child: TextButton(
                  onPressed: () => Navigator.push(
                    context,
                    MaterialPageRoute<void>(
                      builder: (_) => AccountScreen(account: account),
                    ),
                  ),
                  child: Text(
                    tr(context, "Sign in"),
                    textAlign: TextAlign.center,
                  ),
                ),
              )
            : CloudSyncButton(account: account),
      ),
    ),
  );
}

class AccountScreen extends StatefulWidget {
  final CloudSyncController account;
  final String? assignmentKey;
  const AccountScreen({super.key, required this.account, this.assignmentKey});
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

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: widget.account,
    builder: (context, _) {
      final account = widget.account;
      final unavailable =
          configuring || account.busy || account.signingIn || !account.ready;
      return Scaffold(
        appBar: AppBar(
          actions: [
            PopupMenuButton<String>(
              tooltip: tr(context, "Switch pipedreams app"),
              icon: const Icon(Icons.apps_outlined),
              itemBuilder: (_) => [
                for (final name in [
                  'Mynit',
                  'Dockit',
                  'Shiprite',
                  'Zilo',
                  'Zethea',
                ])
                  PopupMenuItem(
                    value: name,
                    enabled: name != 'Dockit',
                    child: Text(name),
                  ),
              ],
              onSelected: (name) async {
                try {
                  if (!await account.openBrowser(
                    Uri.https('${name.toLowerCase()}.pipedreams.work', '/'),
                  )) {
                    throw StateError(ui("Could not open {0}.", [name]));
                  }
                } catch (error) {
                  if (context.mounted) showError(context, error);
                }
              },
            ),
          ],
          title: Text(
            account.server == dianeSharedOrigin
                ? tr(context, "pipedreams account")
                : tr(context, "Account & sync"),
          ),
        ),
        body: ListView(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 40),
          children: [
            if (account.session != null) ...[
              Text(
                account.session!.email,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              if (account.session!.origin == dianeSharedOrigin)
                WorkspaceAssignments(
                  key: ValueKey(account.session!.owner),
                  initialTask: widget.assignmentKey,
                  account: account,
                ),
              const SizedBox(height: 16),
            ],
            if (account.session == null) ...[
              ExpansionTile(
                tilePadding: EdgeInsets.zero,
                initiallyExpanded: account.server.isEmpty,
                title: Text(tr(context, "Sync service")),
                subtitle: Text(
                  account.server.isEmpty
                      ? tr(context, "Connect your Google Cloud backend")
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
                    decoration: InputDecoration(
                      labelText: tr(context, "Service URL"),
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
                        configuring
                            ? tr(context, "Connecting…")
                            : tr(context, "Connect service"),
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
                label: Text(tr(context, "Continue with Google")),
              ),
              if (account.signingIn)
                TextButton(
                  onPressed: account.cancelSignIn,
                  child: Text(tr(context, "Cancel sign-in")),
                ),
            ] else ...[
              SwitchListTile.adaptive(
                contentPadding: EdgeInsets.zero,
                title: Text(tr(context, "Sync this notebook")),
                subtitle: Text(
                  account.enabled
                      ? tr(context, "Syncs while the app is open.")
                      : tr(
                          context,
                          "Upload tasks, goals and completed sessions.",
                        ),
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
                    icon: account.busy && !account.background
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.sync),
                    label: Text(
                      account.busy && !account.background
                          ? tr(context, "Syncing…")
                          : tr(context, "Sync now"),
                    ),
                  ),
                  OutlinedButton(
                    onPressed: unavailable ? null : () => run(account.signOut),
                    child: Text(tr(context, "Sign out")),
                  ),
                  if (account.error != null)
                    TextButton(
                      onPressed: unavailable ? null : () => run(account.signIn),
                      child: Text(tr(context, "Reconnect Google")),
                    ),
                ],
              ),
            ],
            if (account.busy && !account.background && account.progress != null)
              SyncProgressView(progress: account.progress!),
            if ((!account.busy || account.background) &&
                account.message.isNotEmpty) ...[
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
                  tr(context, "Last sync: {0}", [
                    account.lastSynced!.substring(0, 16).replaceAll('T', ' '),
                  ]),
                  style: const TextStyle(color: mutedInk, fontSize: 12),
                ),
              ),
            if (account.conflicts.isNotEmpty) ...[
              const Divider(height: 36),
              Text(
                tr(context, "Conflicts"),
                style: Theme.of(context).textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                tr(context, "Both copies saved"),
                style: TextStyle(height: 1.4),
              ),
              for (final conflict in account.conflicts)
                ConflictItems(
                  key: ValueKey(conflict.key),
                  account: account,
                  conflict: conflict,
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
                label: Text(tr(context, "Export conflict recovery copies")),
              ),
          ],
        ),
      );
    },
  );
}
