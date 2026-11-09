import 'dart:async';

import 'package:flutter/material.dart';

import '../services/cloud_sync.dart';

class SyncProgressView extends StatefulWidget {
  final CloudSyncProgress progress;
  const SyncProgressView({super.key, required this.progress});
  @override
  State<SyncProgressView> createState() => _SyncProgressViewState();
}

class _SyncProgressViewState extends State<SyncProgressView> {
  late final Timer timer;
  @override
  void initState() {
    super.initState();
    timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final p = widget.progress;
    final now = DateTime.now();
    final seconds = now.difference(p.startedAt).inSeconds;
    final idle = now.difference(p.updatedAt).inSeconds;
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Semantics(
            liveRegion: true,
            child: Text(
              '${p.stage}${p.detail == null ? '' : ' · ${p.detail}'}',
            ),
          ),
          const SizedBox(height: 8),
          LinearProgressIndicator(
            semanticsLabel: 'Sync progress',
            value: p.total == null
                ? null
                : p.completed / (p.total! > 0 ? p.total! : 1),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                p.total == null ? 'Preparing' : '${p.completed} / ${p.total}',
              ),
              Text(
                seconds < 60
                    ? '${seconds}s'
                    : '${seconds ~/ 60}m ${seconds % 60}s',
              ),
            ],
          ),
          if (idle >= 15)
            Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                'Waiting for this step · ${idle}s',
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
        ],
      ),
    );
  }
}
