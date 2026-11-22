import '../interface_locale.dart';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app.dart';
import '../models/models.dart';
import '../services/ai_service.dart';
import '../services/files.dart';
import '../services/persistence.dart';
import '../state/sticky_store.dart';

class SettingsScreen extends StatelessWidget {
  final StickyStore store;
  final AiService ai;
  final WidgetBuilder? accountStatusBuilder;
  final WidgetBuilder? syncIndicatorBuilder;
  final Widget Function(StickyStore store)? accountBuilder;
  const SettingsScreen({
    super.key,
    required this.store,
    required this.ai,
    this.accountBuilder,
    this.accountStatusBuilder,
    this.syncIndicatorBuilder,
  });
  Future<void> restore(BuildContext context) async {
    try {
      final content = await NativeFiles.read();
      if (content == null || !context.mounted) return;
      // Validate before offering a destructive restore.
      final probe = StickyStore(
        persistence: MemoryPersistence(),
        credentials: MemoryCredentials(),
      );
      await probe.importJson(content);
      probe.dispose();
      if (!context.mounted) return;
      final yes = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(tr(context, "Restore this notebook?")),
          content: Text(
            tr(
              context,
              "This replaces the tasks, goals and focus history on this device. Export your current notebook first if you need to keep both. API keys and account credentials are not imported.",
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: Text(tr(context, "Cancel")),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text(tr(context, "Restore")),
            ),
          ],
        ),
      );
      if (yes == true) {
        await store.importJson(content);
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(tr(context, "Notebook restored"))),
          );
        }
      }
    } catch (e) {
      if (context.mounted) showError(context, e);
    }
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: store,
    builder: (context, _) => Scaffold(
      appBar: AppBar(title: Text(tr(context, "Settings"))),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 32),
        children: [
          if (accountBuilder != null) ...[
            _SettingsSection(tr(context, 'Personal account')),
            ListTile(
              leading: const Icon(Icons.account_circle_outlined),
              title: Text(tr(context, "Account & sync")),
              subtitle: accountStatusBuilder?.call(context),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute<void>(builder: (_) => accountBuilder!(store)),
              ),
            ),
            if (syncIndicatorBuilder != null)
              Align(
                alignment: AlignmentDirectional.centerStart,
                child: syncIndicatorBuilder!(context),
              ),
          ],
          _SettingsSection(tr(context, 'YOUR NOTEBOOK')),
          InterfaceLanguageButton(
            choice: store.preferences.interfaceLanguage,
            onChanged: (tag) {
              store.preferences.interfaceLanguage = tag;
              store.changed();
            },
            child: ListTile(
              leading: const Icon(Icons.language),
              title: Text(tr(context, 'Display language')),
              subtitle: Text(
                languageNames[store.preferences.interfaceLanguage] ??
                    tr(context, 'System default'),
              ),
              trailing: const Icon(Icons.expand_more),
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Text(
              tr(context, 'NOTE MATERIAL'),
              style: Theme.of(context).textTheme.labelMedium,
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                for (final value in ['paper', 'frosted', 'liquid'])
                  ChoiceChip(
                    label: Text(
                      {
                        'paper': tr(context, "Paper"),
                        'frosted': tr(context, "Frosted glass"),
                        'liquid': tr(context, "Liquid glass"),
                      }[value]!,
                    ),
                    selected: store.preferences.material == value,
                    onSelected: (_) {
                      store.preferences.material = value;
                      store.changed();
                    },
                  ),
              ],
            ),
          ),
          _SettingsSection(tr(context, 'Plan')),
          ListTile(
            leading: const Icon(Icons.auto_awesome_outlined),
            title: Text(tr(context, "AI assistance")),
            subtitle: Text(
              ai.usesShared(store.preferences)
                  ? tr(context, "pipedreams account")
                  : providerPresets[store.preferences.provider]?['name'] ??
                        store.preferences.provider,
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute<void>(
                builder: (_) => ProviderEditor(
                  store: store,
                  sharedRequest: ai.sharedRequest,
                ),
              ),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.computer_outlined),
            title: Text(tr(context, "Planning machines")),
            subtitle: Text(
              store.preferences.machines.isEmpty
                  ? tr(context, 'No machines added.')
                  : store.preferences.machines
                        .map((machine) => machine['name'])
                        .whereType<String>()
                        .join(', '),
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute<void>(
                builder: (_) => MachinesScreen(store: store),
              ),
            ),
          ),
          _SettingsSection(tr(context, 'Backups')),
          ListTile(
            leading: const Icon(Icons.save_alt_rounded),
            title: Text(tr(context, "Export a backup")),
            subtitle: Text(tr(context, "Excludes credentials")),
            onTap: () async {
              try {
                await NativeFiles.write(
                  'sticky-todo-${store.today}.json',
                  'application/json',
                  store.exportJson(),
                );
              } catch (e) {
                if (context.mounted) showError(context, e);
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.restore_rounded),
            title: Text(tr(context, "Restore a backup")),
            onTap: () => restore(context),
          ),
          ListTile(
            leading: const Icon(Icons.description_outlined),
            title: Text(tr(context, "Export this day as Markdown")),
            subtitle: Text(store.selectedDate),
            onTap: () async {
              try {
                await NativeFiles.write(
                  'sticky-todo-${store.selectedDate}.md',
                  'text/markdown',
                  markdownDay(
                    store.selectedDate,
                    store.tasksFor(store.selectedDate),
                  ),
                );
              } catch (e) {
                if (context.mounted) showError(context, e);
              }
            },
          ),
          ListTile(
            leading: const Icon(Icons.content_paste_rounded),
            title: Text(tr(context, "Import Markdown checklist")),
            onTap: () =>
                showNoteSheet<void>(context, ChecklistImporter(store: store)),
          ),
          const Divider(height: 20),
          const ListTile(
            leading: Image(
              image: AssetImage('assets/brand/dockit.png'),
              width: 32,
              height: 32,
              excludeFromSemantics: true,
            ),
            title: Text('Dockit'),
            subtitle: Text('2.1.23'),
          ),
        ],
      ),
    ),
  );
}

class _SettingsSection extends StatelessWidget {
  const _SettingsSection(this.label);
  final String label;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 18, 16, 4),
    child: Semantics(
      header: true,
      child: Text(
        label,
        style: Theme.of(context).textTheme.titleSmall?.copyWith(color: amber),
      ),
    ),
  );
}

class ProviderEditor extends StatefulWidget {
  final StickyStore store;
  final SharedAgentRequest? sharedRequest;
  const ProviderEditor({super.key, required this.store, this.sharedRequest});
  @override
  State<ProviderEditor> createState() => _ProviderEditorState();
}

class _ProviderEditorState extends State<ProviderEditor> {
  late Preferences draft = Preferences.fromJson(
    widget.store.preferences.toJson(),
  );
  late final TextEditingController base = TextEditingController(
    text: draft.profile().apiBase,
  );
  late final TextEditingController model = TextEditingController(
    text: draft.profile().model,
  );
  final key = TextEditingController();
  bool busy = false;
  bool loadingKey = true;
  bool keyLoadFailed = false;
  String? message;
  final keys = <String, String>{};
  @override
  void initState() {
    super.initState();
    loadKey();
  }

  bool get usesAccountKey => draft.usesDianeModelAccount;

  Future<void> loadKey() async {
    if (usesAccountKey) {
      setState(() {
        key.clear();
        loadingKey = false;
        keyLoadFailed = false;
      });
      return;
    }
    final provider = draft.provider;
    try {
      final value =
          keys[provider] ?? await widget.store.credentials.read(provider) ?? '';
      if (mounted && draft.provider == provider) {
        setState(() {
          key.text = value;
          loadingKey = false;
          keyLoadFailed = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          loadingKey = false;
          keyLoadFailed = true;
          message = ui(
            "Could not open secure key storage. Retry before saving a replacement.",
          );
        });
      }
    }
  }

  void capture() {
    if (usesAccountKey) return;
    draft.profiles[draft.provider] = ProviderProfile(
      apiBase: base.text.trim(),
      model: model.text.trim(),
    );
    keys[draft.provider] = key.text.trim();
  }

  @override
  void dispose() {
    base.dispose();
    model.dispose();
    key.dispose();
    super.dispose();
  }

  Future<void> test() async {
    capture();
    setState(() {
      busy = true;
      message = null;
    });
    final ephemeral = MemoryCredentials()
      ..values[draft.provider] = key.text.trim();
    final ai = AiService(ephemeral, sharedRequest: widget.sharedRequest);
    try {
      await ai.testConnection(draft);
      if (mounted) {
        setState(() => message = ui("Connected. Save to use this provider."));
      }
    } catch (e) {
      if (mounted) setState(() => message = e.toString());
    } finally {
      ai.dispose();
      if (mounted) setState(() => busy = false);
    }
  }

  Future<void> save() async {
    capture();
    setState(() {
      busy = true;
      message = null;
    });
    try {
      for (final entry in keys.entries) {
        await widget.store.credentials.write(entry.key, entry.value);
      }
      widget.store.preferences = draft;
      widget.store.changed();
      await widget.store.flush();
      if (mounted) Navigator.pop(context);
    } catch (_) {
      if (mounted) {
        setState(
          () => message = ui(
            "Settings could not be saved. Your edits remain here. Please retry.",
          ),
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr(context, "AI assistance"))),
    body: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Text(
          tr(context, "Suggestions send task text to this provider."),
          style: TextStyle(color: mutedInk),
        ),
        const SizedBox(height: 16),
        DropdownButtonFormField<String>(
          initialValue: draft.provider,
          isExpanded: true,
          decoration: InputDecoration(labelText: tr(context, "Provider")),
          items: [
            for (final entry in providerPresets.entries)
              DropdownMenuItem(
                value: entry.key,
                child: Text(entry.value['name']!),
              ),
          ],
          onChanged: busy || loadingKey || keyLoadFailed
              ? null
              : (value) {
                  if (value == null) return;
                  capture();
                  setState(() {
                    draft.provider = value;
                    draft.providerChosen = true;
                    base.text = draft.profile().apiBase;
                    model.text = draft.profile().model;
                    key.clear();
                    loadingKey = true;
                    message = null;
                  });
                  loadKey();
                },
        ),
        const SizedBox(height: 16),
        if (usesAccountKey)
          Text(
            tr(
              context,
              "Uses the OpenRouter key saved in your pipedreams account.",
            ),
          )
        else ...[
          TextField(
            controller: key,
            enabled: !loadingKey && !busy,
            obscureText: true,
            autocorrect: false,
            enableSuggestions: false,
            decoration: InputDecoration(labelText: tr(context, "API key")),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: model,
            enabled: !busy,
            autocorrect: false,
            decoration: InputDecoration(labelText: tr(context, "Model")),
          ),
          const SizedBox(height: 16),
          ExpansionTile(
            tilePadding: EdgeInsets.zero,
            title: Text(tr(context, "Connection details")),
            children: [
              TextField(
                controller: base,
                enabled: !busy,
                autocorrect: false,
                keyboardType: TextInputType.url,
                decoration: InputDecoration(
                  labelText: tr(context, "HTTPS API base URL"),
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ],
        if (message != null)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: SelectableText(message!),
          ),
        if (keyLoadFailed)
          TextButton(
            onPressed: () {
              setState(() => loadingKey = true);
              loadKey();
            },
            child: Text(tr(context, "Retry secure key storage")),
          ),
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: busy || loadingKey || keyLoadFailed ? null : test,
                child: Text(tr(context, "Test connection")),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton(
                onPressed: busy || loadingKey || keyLoadFailed ? null : save,
                child: busy
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : Text(tr(context, "Save")),
              ),
            ),
          ],
        ),
      ],
    ),
  );
}

class ChecklistImporter extends StatefulWidget {
  final StickyStore store;
  const ChecklistImporter({super.key, required this.store});
  @override
  State<ChecklistImporter> createState() => _ChecklistImporterState();
}

class _ChecklistImporterState extends State<ChecklistImporter> {
  final text = TextEditingController();
  String? error;
  @override
  void dispose() {
    text.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
    child: Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          tr(context, "Import to {0}", [widget.store.selectedDate]),
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 16),
        TextField(
          controller: text,
          minLines: 4,
          maxLines: 8,
          decoration: InputDecoration(
            hintText: tr(context, "- [ ] Task\n  - [ ] First step"),
          ),
        ),
        if (error != null)
          Text(
            error!,
            style: TextStyle(color: Theme.of(context).colorScheme.error),
          ),
        const SizedBox(height: 12),
        Row(
          children: [
            TextButton.icon(
              onPressed: () async {
                final value = await Clipboard.getData(Clipboard.kTextPlain);
                if (mounted && value?.text != null) text.text = value!.text!;
              },
              icon: const Icon(Icons.paste),
              label: Text(tr(context, "Paste")),
            ),
            const Spacer(),
            FilledButton(
              onPressed: () {
                try {
                  final tasks = parseMarkdownTasks(text.text);
                  if (tasks.isEmpty) {
                    throw FormatException(ui("No checklist tasks found"));
                  }
                  (widget.store.days[widget.store.selectedDate] ??= []).addAll(
                    tasks,
                  );
                  widget.store.changed();
                  Navigator.pop(context);
                } catch (e) {
                  setState(() => error = e.toString());
                }
              },
              child: Text(tr(context, "Add tasks")),
            ),
          ],
        ),
      ],
    ),
  );
}

class MachinesScreen extends StatefulWidget {
  final StickyStore store;
  const MachinesScreen({super.key, required this.store});
  @override
  State<MachinesScreen> createState() => _MachinesScreenState();
}

class _MachinesScreenState extends State<MachinesScreen> {
  Future<void> add() async {
    final name = TextEditingController();
    final type = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(tr(context, "Add a machine")),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: name,
              decoration: InputDecoration(labelText: tr(context, "Name")),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: type,
              decoration: InputDecoration(
                labelText: tr(context, "Type or capabilities"),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: Text(tr(context, "Cancel")),
          ),
          FilledButton(
            onPressed: () {
              if (name.text.trim().isNotEmpty &&
                  name.text.trim() != 'human' &&
                  !widget.store.preferences.machines.any(
                    (m) => m['name'] == name.text.trim(),
                  )) {
                Navigator.pop(context, true);
              }
            },
            child: Text(tr(context, "Add")),
          ),
        ],
      ),
    );
    if (result == true) {
      widget.store.preferences.machines.add({
        'name': name.text.trim(),
        'type': type.text.trim(),
      });
      widget.store.changed();
      if (mounted) setState(() {});
    }
    Future<void>.delayed(const Duration(milliseconds: 400), () {
      name.dispose();
      type.dispose();
    });
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr(context, "Planning machines"))),
    body: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        for (final machine in widget.store.preferences.machines)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.computer),
            title: Text(machine['name'] as String),
            subtitle: Text(machine['type'] as String? ?? ''),
            trailing: IconButton(
              tooltip: tr(context, "Remove machine"),
              onPressed: () {
                widget.store.preferences.machines.remove(machine);
                widget.store.changed();
                setState(() {});
              },
              icon: const Icon(Icons.close),
            ),
          ),
        const SizedBox(height: 16),
        FilledButton.icon(
          onPressed: add,
          icon: const Icon(Icons.add),
          label: Text(tr(context, "Add machine")),
        ),
      ],
    ),
  );
}
