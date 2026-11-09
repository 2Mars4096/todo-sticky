import 'dart:convert';

import 'package:flutter_test/flutter_test.dart';

import 'cloud_sync_test.dart' as base;

void main() {
  test(
    'unchanged remote token reuses snapshot while local edits still upload',
    () async {
      var generation = List.filled(64, 'a').join(),
          fullReads = 0,
          conditional = 0,
          writes = 0;
      var task = base.record(base.dayKey, base.day('Original'));
      final goal = base.record('goals', base.goals());
      final rig = await base.fixture(
        (request) {
          if (request.method == 'PUT') {
            writes++;
            final body = jsonDecode(request.body) as Map<String, dynamic>;
            expect(body['expectedRevision'], task.revision);
            task = base.record(
              base.dayKey,
              body['payload'] as Map<String, dynamic>,
              revision: task.revision + 1,
            );
            generation = List.filled(64, 'b').join();
            return base.jsonResponse(task.toJson());
          }
          if (request.url.queryParameters['ifGeneration'] == generation) {
            conditional++;
            return base.jsonResponse({
              'schemaVersion': 1,
              'records': [],
              'nextCursor': null,
              'generation': generation,
              'notModified': true,
            });
          }
          fullReads++;
          return base.jsonResponse({
            'schemaVersion': 1,
            'records': [task.toJson(), goal.toJson()],
            'nextCursor': null,
            'generation': generation,
          });
        },
        local: {base.dayKey: base.day('Original')},
        baseline: {base.dayKey: task.baseline, 'goals': goal.baseline},
      );
      addTearDown(rig.dispose);
      await rig.sync.synchronize();
      expect(rig.sync.error, isNull);
      expect(fullReads, 1);
      await rig.sync.synchronize();
      expect(rig.sync.error, isNull);
      expect(conditional, 1);
      expect(fullReads, 1);
      rig.store.tasksFor(base.date).first.text = 'Offline edit';
      rig.store.changed();
      await rig.store.flush();
      await rig.sync.synchronize();
      expect(rig.sync.error, isNull);
      expect(writes, 1);
      await rig.sync.synchronize();
      expect(rig.sync.error, isNull);
      expect(fullReads, 2);
    },
  );
  test(
    'mixed generations across pages refuse before changing local notes',
    () async {
      var reads = 0;
      final rig = await base.fixture((request) {
        expect(request.method, 'GET');
        reads++;
        return base.jsonResponse({
          'schemaVersion': 1,
          'records': reads == 1
              ? [base.record(base.dayKey, base.day('Remote')).toJson()]
              : [base.record('goals', base.goals()).toJson()],
          'nextCursor': reads == 1 ? base.dayKey : null,
          'generation': List.filled(64, reads == 1 ? 'a' : 'b').join(),
        });
      }, local: {base.dayKey: base.day('Original')});
      addTearDown(rig.dispose);
      await rig.sync.synchronize();
      expect(rig.sync.error, contains('changed during paging'));
      expect(rig.store.tasksFor(base.date).first.text, 'Original');
    },
  );
}
