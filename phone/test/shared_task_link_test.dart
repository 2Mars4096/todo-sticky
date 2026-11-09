import 'package:flutter_test/flutter_test.dart';
import 'package:http/testing.dart';
import 'package:sticky_todo/services/cloud_sync.dart';
import 'package:sticky_todo/services/persistence.dart';
import 'package:sticky_todo/state/sticky_store.dart';

import 'cloud_sync_test.dart' as base;

class LinkController extends CloudSyncController {
  int syncs = 0;
  LinkController({required super.store, required super.transport})
    : super(openBrowser: (_) async => true);
  @override
  Future<void> synchronize({
    String? resolveKey,
    bool useCloud = false,
    String? reviewedFingerprint,
    Map<String, String>? choices,
    bool background = false,
  }) async {
    syncs++;
  }
}

void main() {
  test('canonical link resolves original occurrence then syncs without agent calls', () async {
    final store = StickyStore(
      persistence: MemoryPersistence(),
      credentials: MemoryCredentials(),
    );
    await store.initialize();
    var canonical = false;
    final controller = LinkController(
      store: store,
      transport: CloudTransport(
        client: MockClient((request) async {
          expect(request.method, 'GET');
          expect(request.headers['authorization'], startsWith('Bearer '));
          expect(
            request.url.path,
            '/api/plugins/todo/records/task/canonical-task',
          );
          return base.jsonResponse({
            'record_id': 'canonical-task',
            'plugin_id': 'todo',
            'record_type': 'task',
            'created_at': '2026-11-09T23:00:00Z',
            'extensions': canonical
                ? {'date': '2026-11-10'}
                : {
                    'date': '2026-11-10',
                    'source': {'app': 'todo-sticky', 'id': 'original-task'},
                  },
          });
        }),
      ),
    );
    addTearDown(controller.dispose);
    controller.session = AccountSession(
      origin: dianeSharedOrigin,
      projectId: 'dear-diane-202610',
      apiKey: 'public',
      uid: 'user',
      email: '',
      idToken: base.idToken(user: 'user', audience: 'dear-diane-202610'),
      refreshToken: 'private',
      expiresAt: DateTime.now().millisecondsSinceEpoch + 3600000,
    );
    store.syncMetadata['account:${controller.session!.owner}:$dianeSharedOrigin'] =
        {'enabled': true, 'baseline': {}, 'pending': {}, 'conflicts': []};
    expect(await controller.resolveSharedTask('canonical-task'), (
      date: '2026-11-10',
      taskId: 'original-task',
    ));
    canonical = true;
    expect(await controller.resolveSharedTask('canonical-task'), (
      date: '2026-11-10',
      taskId: 'canonical-task',
    ));
    expect(controller.syncs, 2);
  });
}
