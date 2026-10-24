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
  final Widget Function(StickyStore store)? accountBuilder;
  const SettingsScreen({
    super.key,
    required this.store,
    required this.ai,
    this.accountBuilder,
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
          title: const Text('Restore this notebook?'),
          content: const Text(
            'This replaces the tasks, goals and focus history on this device. Export your current notebook first if you need to keep both. API keys and account credentials are not imported.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Restore'),
            ),
          ],
        ),
      );
      if (yes == true) {
        await store.importJson(content);
        if (context.mounted) {
          ScaffoldMessenger.of(context)
              .showSnackBar(const SnackBar(content: Text('Notebook restored')));
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
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(12, 8, 12, 32),
        children: [
          if (accountBuilder != null)
            ListTile(
              leading: const Icon(Icons.account_circle_outlined),
              title: const Text('Account & sync'),
              subtitle: const Text('Keep your notebook with you'),
              trailing: const Icon(Icons.chevron_right),
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute<void>(builder: (_) => accountBuilder!(store)),
              ),
            ),
          ListTile(
            leading: const Icon(Icons.auto_awesome_outlined),
            title: const Text('AI assistance'),
            subtitle: Text(
              providerPresets[store.preferences.provider]?['name'] ??
                  store.preferences.provider,
            ),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute<void>(
                builder: (_) => ProviderEditor(store: store),
              ),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.computer_outlined),
            title: const Text('Planning machines'),
            subtitle: const Text('Optional resources for day planning'),
            trailing: const Icon(Icons.chevron_right),
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute<void>(
                builder: (_) => MachinesScreen(store: store),
              ),
            ),
          ),
          const Divider(height: 32),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'NOTE MATERIAL',
              style: TextStyle(
                fontSize: 12,
                letterSpacing: 1,
                color: mutedInk,
                fontWeight: FontWeight.w700,
              ),
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
                        'paper': 'Paper',
                        'frosted': 'Frosted glass',
                        'liquid': 'Liquid glass',
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
          const Divider(height: 20),
          const Padding(
            padding: EdgeInsets.symmetric(horizontal: 16),
            child: Text(
              'YOUR NOTEBOOK',
              style: TextStyle(
                fontSize: 12,
                letterSpacing: 1,
                color: mutedInk,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.save_alt_rounded),
            title: const Text('Export a backup'),
            subtitle: const Text(
              'Tasks, goals and focus history · no API keys',
            ),
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
            title: const Text('Restore a backup'),
            onTap: () => restore(context),
          ),
          ListTile(
            leading: const Icon(Icons.description_outlined),
            title: const Text('Export this day as Markdown'),
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
            title: const Text('Import a checklist'),
            subtitle: const Text('Paste Markdown tasks and nested steps'),
            onTap: () =>
                showNoteSheet<void>(context, ChecklistImporter(store: store)),
          ),
          const Divider(height: 20),
          ListTile(
            leading: const Icon(Icons.desktop_windows_outlined),
            title: const Text('Working with Dear Diane'),
            subtitle: const Text(
              'Open a task’s actions and copy its agent prompt to send it to Diane. Desktop-only local connections and Codex sessions stay on your computer.',
            ),
          ),
          const Divider(height: 20),
          const ListTile(
            leading: Icon(Icons.info_outline),
            title: Text('Sticky Todo for Android'),
            subtitle: Text('2.1.15 · A working note, wherever you are.'),
          ),
        ],
      ),
    ),
  );
}

class ProviderEditor extends StatefulWidget {
  final StickyStore store;
  const ProviderEditor({super.key, required this.store});
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

  Future<void> loadKey() async {
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
          message = 'Could not open secure key storage. Retry before saving a replacement.';
        });
      }
    }
  }

  void capture() {
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
    final ai = AiService(ephemeral);
    try {
      await ai.testConnection(draft);
      if (mounted) {
        setState(() => message = 'Connected. Save to use this provider.');
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
          () => message = 'Settings could not be saved. Your edits remain here. Please retry.',
        );
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('AI assistance')),
    body: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const Text(
          'Use your own provider',
          style: TextStyle(fontSize: 22, fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        const Text(
          'AI is optional. Task text is sent to the provider only when you request a suggestion. Keys are kept in Android’s secure storage.',
          style: TextStyle(color: mutedInk),
        ),
        const SizedBox(height: 24),
        DropdownButtonFormField<String>(
          initialValue: draft.provider,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Provider'),
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
        TextField(
          controller: key,
          enabled: !loadingKey && !busy,
          obscureText: true,
          autocorrect: false,
          enableSuggestions: false,
          decoration: const InputDecoration(labelText: 'API key'),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: model,
          enabled: !busy,
          autocorrect: false,
          decoration: const InputDecoration(labelText: 'Model'),
        ),
        const SizedBox(height: 16),
        ExpansionTile(
          tilePadding: EdgeInsets.zero,
          title: const Text('Connection details'),
          children: [
            TextField(
              controller: base,
              enabled: !busy,
              autocorrect: false,
              keyboardType: TextInputType.url,
              decoration: const InputDecoration(
                labelText: 'HTTPS API base URL',
              ),
            ),
            const SizedBox(height: 16),
          ],
        ),
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
            child: const Text('Retry secure key storage'),
          ),
        const SizedBox(height: 20),
        Row(
          children: [
            Expanded(
              child: OutlinedButton(
                onPressed: busy || loadingKey || keyLoadFailed ? null : test,
                child: const Text('Test connection'),
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
                    : const Text('Save'),
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
          'Import to ${widget.store.selectedDate}',
          style: Theme.of(context).textTheme.titleLarge,
        ),
        const SizedBox(height: 16),
        TextField(
          controller: text,
          minLines: 4,
          maxLines: 8,
          decoration: const InputDecoration(
            hintText: '- [ ] Task\n  - [ ] First step',
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
              label: const Text('Paste'),
            ),
            const Spacer(),
            FilledButton(
              onPressed: () {
                try {
                  final tasks = parseMarkdownTasks(text.text);
                  if (tasks.isEmpty) {
                    throw const FormatException('No checklist tasks found');
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
              child: const Text('Add tasks'),
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
        title: const Text('Add a machine'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: name,
              decoration: const InputDecoration(labelText: 'Name'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: type,
              decoration: const InputDecoration(
                labelText: 'Type or capabilities',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
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
            child: const Text('Add'),
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
    appBar: AppBar(title: const Text('Planning machines')),
    body: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        const Text(
          'Add resources you can actually use. Select them when you make a plan.',
          style: TextStyle(color: mutedInk),
        ),
        const SizedBox(height: 16),
        for (final machine in widget.store.preferences.machines)
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.computer),
            title: Text(machine['name'] as String),
            subtitle: Text(machine['type'] as String? ?? ''),
            trailing: IconButton(
              tooltip: 'Remove machine',
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
          label: const Text('Add machine'),
        ),
      ],
    ),
  );
}
