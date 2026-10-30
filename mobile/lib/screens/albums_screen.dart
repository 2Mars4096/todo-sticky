import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../app.dart';
import '../services/ai_service.dart';
import '../state/sticky_store.dart';

class AlbumsScreen extends StatefulWidget {
  final StickyStore store;
  final AiService ai;
  const AlbumsScreen({super.key, required this.store, required this.ai});
  @override
  State<AlbumsScreen> createState() => _AlbumsScreenState();
}

class _AlbumsScreenState extends State<AlbumsScreen> {
  List<Map<String, dynamic>> albums = [];
  bool busy = false;
  String? error;
  Future<void> generate() async {
    setState(() {
      busy = true;
      error = null;
    });
    try {
      final result = await widget.ai.albums(
        widget.store.preferences,
        widget.store.planningTasks,
      );
      if (mounted) setState(() => albums = result);
    } catch (e) {
      if (mounted) setState(() => error = e.toString());
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Music for this work')),
    body: ListView(
      padding: const EdgeInsets.all(24),
      children: [
        FilledButton.icon(
          onPressed: busy ? null : generate,
          icon: busy
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.headphones_outlined),
          label: Text(albums.isEmpty ? 'Suggest albums' : 'Suggest more'),
        ),
        if (error != null)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16),
            child: Text(
              error!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          ),
        for (final album in albums)
          Padding(
            padding: const EdgeInsets.only(top: 24),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xffeadba5),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.album_outlined, color: amber),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        album['title'] as String,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      Text(
                        '${album['artist']}${album['year'] == null ? '' : ' · ${album['year']}'}',
                        style: const TextStyle(color: mutedInk),
                      ),
                      const SizedBox(height: 8),
                      Text(album['fit'] as String),
                      if (album['bestFor'] is String)
                        Text(
                          album['bestFor'] as String,
                          style: const TextStyle(fontSize: 12, color: amber),
                        ),
                      TextButton.icon(
                        onPressed: () => Clipboard.setData(
                          ClipboardData(
                            text: '${album['artist']} — ${album['title']}',
                          ),
                        ),
                        icon: const Icon(Icons.copy, size: 16),
                        label: const Text('Copy to search'),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
      ],
    ),
  );
}
