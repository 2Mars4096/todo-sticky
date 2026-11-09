import 'package:flutter/material.dart';

import '../services/cloud_sync.dart';

class ConflictItems extends StatefulWidget {
  final CloudSyncController account;
  final SyncAction conflict;
  const ConflictItems({
    super.key,
    required this.account,
    required this.conflict,
  });
  @override
  State<ConflictItems> createState() => _ConflictItemsState();
}

class _ConflictItemsState extends State<ConflictItems>
    with AutomaticKeepAliveClientMixin<ConflictItems> {
  @override
  bool get wantKeepAlive => true;
  final picks = <String, ({String fingerprint, String choice})>{};
  @override
  Widget build(BuildContext context) {
    super.build(context);
    final conflict = widget.conflict;
    final issues =
        conflict.merge?.issues ??
        [
          MergeIssue(
            '',
            conflict.key.startsWith('day:')
                ? conflict.key.substring(4)
                : conflict.key == 'goals'
                ? 'Goals and routines'
                : 'Focus session',
            conflict.local,
            conflict.remote?.payload,
          ),
        ];
    final choices = <String, String>{
      for (final issue in issues)
        if (picks[issue.path]?.fingerprint == canonicalJson(issue.toJson()))
          issue.path: picks[issue.path]!.choice,
    };
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (conflict.mergeProblem != null)
            Text(
              conflict.mergeProblem!,
              style: TextStyle(color: Theme.of(context).colorScheme.error),
            ),
          Text('${issues.length - choices.length} remaining'),
          for (final issue in issues) ...[
            const SizedBox(height: 16),
            Text(
              issue.label,
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            RadioGroup<String>(
              groupValue: choices[issue.path],
              onChanged: (choice) {
                if (choice != null) {
                  setState(() {
                    picks[issue.path] = (
                      fingerprint: canonicalJson(issue.toJson()),
                      choice: choice,
                    );
                  });
                }
              },
              child: Column(
                children: [
                  for (final choice in ['local', 'cloud'])
                    RadioListTile<String>(
                      value: choice,
                      contentPadding: EdgeInsets.zero,
                      title: Text(choice == 'local' ? 'This device' : 'Cloud'),
                      subtitle: Text(
                        mergeValueText(
                          choice == 'local' ? issue.local : issue.cloud,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ],
          const SizedBox(height: 8),
          FilledButton.tonal(
            onPressed:
                widget.account.busy ||
                    issues.isEmpty ||
                    choices.length != issues.length
                ? null
                : () => widget.account.synchronize(
                    resolveKey: conflict.key,
                    choices: conflict.merge == null ? null : choices,
                    useCloud: choices[''] == 'cloud',
                    reviewedFingerprint: syncConflictFingerprint(conflict),
                  ),
            child: const Text('Apply choices'),
          ),
        ],
      ),
    );
  }
}
