import '../interface_locale.dart';
import '../suite_destination_label.dart';

import 'package:flutter/material.dart';

import 'assignment_entry.dart';
import '../services/cloud_sync.dart';

import 'package:url_launcher/url_launcher.dart';

class MynitPassage extends StatelessWidget {
  final Object? meeting, revision;
  final Map evidence;
  const MynitPassage({
    super.key,
    required this.meeting,
    required this.revision,
    required this.evidence,
  });

  static Uri? link(Object? meeting, Object? revision, Object? segment) {
    final valid = RegExp(r'^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$');
    if (meeting is! String ||
        segment is! String ||
        !valid.hasMatch(meeting) ||
        !valid.hasMatch(segment) ||
        revision is! int ||
        revision < 1) {
      return null;
    }
    return Uri.https('mynit.pipedreams.work', '/', {
      'meeting': meeting,
      'revision': '$revision',
      'segment': segment,
    });
  }

  @override
  Widget build(BuildContext context) {
    final uri = link(meeting, revision, evidence['segment_id']);
    final start = evidence['start_ms'];
    final seconds = start is int && start >= 0 ? start ~/ 1000 : null;
    final time = seconds == null
        ? null
        : '${seconds ~/ 60}:${(seconds % 60).toString().padLeft(2, '0')}';
    return ListTile(
      title: Text(evidence['quote'] is String ? evidence['quote'] : ''),
      subtitle: uri == null
          ? null
          : Align(
              alignment: Alignment.centerLeft,
              child: TextButton(
                child: SuiteDestinationLabel(
                  product: 'mynit',
                  label: time == null
                      ? tr(context, "Open passage in Mynit")
                      : tr(context, "Open in Mynit at {0}", [time]),
                ),
                onPressed: () async {
                  try {
                    final app = Uri(
                      scheme: 'mynit',
                      host: 'meeting',
                      queryParameters: uri.queryParameters,
                    );
                    if (await launchUrl(
                      app,
                      mode: LaunchMode.externalApplication,
                    )) {
                      return;
                    }
                  } catch (_) {}
                  try {
                    if (await launchUrl(
                      uri,
                      mode: LaunchMode.externalApplication,
                    )) {
                      return;
                    }
                  } catch (_) {}
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(tr(context, "Could not open Mynit.")),
                      ),
                    );
                  }
                },
              ),
            ),
    );
  }
}

class MynitCitation extends StatelessWidget {
  final Map source;
  const MynitCitation({super.key, required this.source});
  @override
  Widget build(BuildContext context) {
    final entries = source['excerpts'];
    if (entries is! List) return const SizedBox.shrink();
    final passages = entries
        .whereType<Map>()
        .where(
          (e) =>
              e['quote'] is String &&
              MynitPassage.link(
                    source['meeting_id'],
                    source['transcript_revision'],
                    e['segment_id'],
                  ) !=
                  null,
        )
        .toList();
    if (passages.isEmpty) return const SizedBox.shrink();
    final title = source['title'];
    return ExpansionTile(
      title: Text(
        title is String && title.isNotEmpty
            ? tr(context, "Mynit source · {0}", [title])
            : tr(context, "Mynit source"),
      ),
      children: [
        for (final e in passages)
          MynitPassage(
            meeting: source['meeting_id'],
            revision: source['transcript_revision'],
            evidence: e,
          ),
      ],
    );
  }
}

class NotebookCitation extends StatelessWidget {
  final String taskId;
  const NotebookCitation({super.key, required this.taskId});
  @override
  Widget build(BuildContext context) {
    final account = AssignmentEntry.of(context)?.account;
    if (account == null) return const SizedBox.shrink();
    return ListenableBuilder(
      listenable: account,
      builder: (_, child) {
        final session = account.session;
        if (session == null || session.origin != dianeSharedOrigin) {
          return const SizedBox.shrink();
        }
        return _Lookup(
          key: ValueKey([session.owner, taskId].join(':')),
          account: account,
          taskId: taskId,
        );
      },
    );
  }
}

class _Lookup extends StatefulWidget {
  final CloudSyncController account;
  final String taskId;
  const _Lookup({super.key, required this.account, required this.taskId});
  @override
  State<_Lookup> createState() => _LookupState();
}

class _LookupState extends State<_Lookup> {
  late Future<Map?> source = widget.account.notebookCitation(widget.taskId);
  @override
  Widget build(BuildContext context) => FutureBuilder<Map?>(
    future: source,
    builder: (_, result) {
      if (result.hasError) {
        return TextButton(
          onPressed: () => setState(
            () => source = widget.account.notebookCitation(widget.taskId),
          ),
          child: Text(tr(context, "Retry source check")),
        );
      }
      final data = result.data;
      return data == null
          ? const SizedBox.shrink()
          : MynitCitation(source: data);
    },
  );
}
