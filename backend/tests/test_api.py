import base64
import hashlib
import sys
import unittest
from copy import deepcopy
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fastapi import HTTPException
from fastapi.testclient import TestClient
from app import create_app, make_record


class MemoryStore:
    def __init__(self):
        self.data = {}
        self.sessions = {}

    def records(self, uid, after, limit):
        records = sorted((v for (owner, key), v in self.data.items() if owner == uid and key > after), key=lambda v: v['key'])
        return deepcopy(records[:limit]), records[limit - 1]['key'] if len(records) > limit else None

    def mutate(self, uid, key, request):
        record = make_record(key, request, self.data.get((uid, key)))
        self.data[(uid, key)] = deepcopy(record)
        return record

    def complete(self, request, uid):
        if request.sessionId in self.sessions:
            raise HTTPException(409, 'already used')
        self.sessions[request.sessionId] = (uid, request.challenge, False)

    def exchange(self, request):
        session = self.sessions.get(request.sessionId)
        if not session:
            return None
        uid, challenge, consumed = session
        if consumed:
            raise HTTPException(410, 'consumed')
        proof = base64.urlsafe_b64encode(hashlib.sha256(request.verifier.encode()).digest()).decode().rstrip('=')
        if proof != challenge:
            raise HTTPException(403, 'proof')
        self.sessions[request.sessionId] = (uid, challenge, True)
        return uid


def verify(token):
    if token == 'expired':
        raise ValueError('expired')
    return {'uid': token, 'email_verified': token != 'unverified', 'email': token + '@example.com',
            'firebase': {'sign_in_provider': 'custom' if token == 'custom' else 'google.com'}}


class SyncApiTests(unittest.TestCase):
    def setUp(self):
        self.store = MemoryStore()
        self.client = TestClient(create_app(self.store, verify, lambda uid: 'custom-token-for-' + uid))
        self.task = {'id': 'task_a', 'text': 'Write paper', 'status': 'todo', 'subtasks': [],
                     'finish': {'doneWhen': 'The draft is ready', 'by': '2026-10-30', 'reviewReady': False}}

    def write(self, uid='alice', revision=0, mutation='mutation-000000000001', payload=None, key='day:2026-10-24', deleted=False, schema=1):
        return self.client.put('/v1/sync/' + key, headers={'Authorization': 'Bearer ' + uid}, json={
            'expectedRevision': revision, 'mutationId': mutation, 'deleted': deleted,
            'schemaVersion': schema,
            'payload': payload if payload is not None else None if deleted else {'date': '2026-10-24', 'tasks': [self.task]},
        })

    def test_goal_payload_negotiation_and_legacy_task_updates_preserve_links(self):
        self.task.update(goalId='goal_a', goalStepId='step_a')
        self.task['subtasks'] = [{'id': 'child_a', 'text': 'Check evidence', 'status': 'todo',
                                 'subtasks': [], 'goalId': 'goal_a'}]
        self.assertEqual(self.write(schema=2).status_code, 200)
        legacy = self.client.get('/v1/sync', headers={'Authorization': 'Bearer alice'}).json()
        self.assertEqual(legacy['payloadSchemaVersion'], 1)
        stripped = legacy['records'][0]['payload']
        self.assertNotIn('goalId', stripped['tasks'][0])
        self.assertNotIn('goalId', stripped['tasks'][0]['subtasks'][0])
        modern = self.client.get('/v1/sync?schemaVersion=2', headers={'Authorization': 'Bearer alice'}).json()
        self.assertEqual(modern['payloadSchemaVersion'], 2)
        self.assertEqual(modern['records'][0]['payload']['tasks'][0]['goalStepId'], 'step_a')
        stripped['tasks'][0]['text'] = 'Revised on an older app'
        stripped['tasks'][0]['subtasks'][0]['status'] = 'done'
        response = self.write(revision=1, mutation='legacy-mutation-0001', payload=stripped)
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('goalId', response.json()['payload']['tasks'][0])
        stored = self.store.data[('alice', 'day:2026-10-24')]['payload']['tasks'][0]
        self.assertEqual(stored['text'], 'Revised on an older app')
        self.assertEqual(stored['goalId'], 'goal_a')
        self.assertEqual(stored['goalStepId'], 'step_a')
        self.assertEqual(stored['subtasks'][0]['goalId'], 'goal_a')
        self.assertEqual(stored['subtasks'][0]['status'], 'done')
        retry = self.write(revision=1, mutation='legacy-mutation-0001', payload=stripped)
        self.assertEqual(response.json(), retry.json(), 'Legacy idempotence compares the retained metadata')
        stale = self.write(revision=1, mutation='stale-mutation-0001', payload=stripped)
        self.assertEqual(stale.status_code, 409)
        self.assertNotIn('goalId', stale.json()['current']['payload']['tasks'][0])
        removed = self.write(revision=2, mutation='modern-remove-00001', payload=stripped, schema=2)
        self.assertEqual(removed.status_code, 200)
        self.assertNotIn('goalId', self.store.data[('alice', 'day:2026-10-24')]['payload']['tasks'][0])

    def test_goal_plan_survives_legacy_edit_and_can_be_removed_by_v2(self):
        plan = [{'id': 'step_a', 'text': 'Read evidence\nWrite a short synthesis'}]
        payload = {'targets': [{'id': 'goal_a', 'text': 'Publish research', 'done': False, 'plan': plan}], 'recurring': []}
        saved = self.write(key='goals', payload=payload, schema=2)
        self.assertEqual(saved.status_code, 200)
        legacy = deepcopy(payload)
        legacy['targets'][0].pop('plan')
        legacy['targets'][0]['text'] = 'Publish the revised research'
        legacy['targets'][0]['done'] = True
        ack = self.write(key='goals', revision=1, mutation='legacy-goal-000001', payload=legacy)
        self.assertEqual(ack.status_code, 200)
        self.assertNotIn('plan', ack.json()['payload']['targets'][0])
        stored = self.store.data[('alice', 'goals')]['payload']['targets'][0]
        self.assertEqual(stored['plan'], plan)
        self.assertTrue(stored['done'])
        removed = self.write(key='goals', revision=2, mutation='modern-goal-000001', payload=legacy, schema=2)
        self.assertEqual(removed.status_code, 200)
        self.assertNotIn('plan', self.store.data[('alice', 'goals')]['payload']['targets'][0])

    def test_goal_links_and_plans_are_bounded_and_validated(self):
        config = self.client.get('/v1/config').json()
        self.assertEqual(config['schemaVersion'], 1)
        self.assertEqual(config['payloadSchemaVersions'], [1, 2])
        self.assertTrue(config['goalPlanning'])
        for extra in [{'goalStepId': 'step_a'}, {'goalId': ''}, {'goalId': 'a/b'}, {'goalId': 12},
                      {'goalId': 'goal_a', 'goalStepId': None}]:
            bad = {**self.task, **extra}
            with self.subTest(extra=extra):
                self.assertEqual(self.write(payload={'date': '2026-10-24', 'tasks': [bad]}, schema=2).status_code, 422)
        good = {'id': 'goal_a', 'text': 'Goal', 'done': False, 'plan': [{'id': 'step_a', 'text': 'One step'}]}
        self.assertEqual(self.write(key='goals', payload={'targets': [good], 'recurring': []}).status_code, 422)
        for plan in [None, [{'id': 'a', 'text': ''}], [{'id': 'a', 'text': 'x', 'apiKey': 'no'}],
                     [{'id': 'a', 'text': 'x'}, {'id': 'a', 'text': 'y'}],
                     [{'id': f'step_{i}', 'text': 'x'} for i in range(201)]]:
            with self.subTest(plan=plan):
                self.assertEqual(self.write(key='goals', payload={'targets': [{**good, 'plan': plan}], 'recurring': []}, schema=2).status_code, 422)
        task = {**self.task, 'goalId': 'goal_a', 'goalStepId': 'step_a', 'id': 'step_a'}
        self.assertEqual(self.write(payload={'date': '2026-10-24', 'tasks': [task]}, schema=2).status_code, 200)
        moved = self.write(key='day:2026-10-25', payload={'date': '2026-10-25', 'tasks': [task]}, schema=2)
        self.assertEqual(moved.status_code, 200)
        self.assertEqual(moved.json()['payload']['tasks'][0]['goalStepId'], 'step_a')

    def test_legacy_blank_checklist_titles_round_trip_without_dropping_children(self):
        self.task['text'] = ''
        self.task['subtasks'] = [{'id': 'blank_child', 'text': '  ', 'status': 'done', 'subtasks': []}]
        self.assertEqual(self.write().status_code, 200)
        saved = self.client.get('/v1/sync', headers={'Authorization': 'Bearer alice'}).json()['records'][0]
        self.assertEqual(saved['payload']['tasks'], [self.task])
        invalid = {'targets': [{'id': 'g', 'text': '', 'done': False}], 'recurring': []}
        self.assertEqual(self.write(key='goals', payload=invalid).status_code, 422)

    def test_authentication_and_verified_account_required(self):
        self.assertEqual(self.client.get('/v1/sync').status_code, 401)
        self.assertEqual(self.write('expired').status_code, 401)
        self.assertEqual(self.write('unverified').status_code, 403)

    def test_users_cannot_read_or_overwrite_each_other(self):
        self.assertEqual(self.write().status_code, 200)
        other = self.client.get('/v1/sync', headers={'Authorization': 'Bearer bob'}).json()
        self.assertEqual(other['records'], [])
        self.assertEqual(self.write('bob').status_code, 200)
        self.assertEqual(len(self.store.data), 2)

    def test_conflict_does_not_change_saved_data(self):
        self.assertEqual(self.write().json()['revision'], 1)
        stale = self.write(mutation='mutation-000000000002')
        self.assertEqual(stale.status_code, 409)
        self.assertEqual(stale.json()['error'], 'conflict')
        self.assertEqual(stale.json()['current']['revision'], 1)
        self.assertEqual(self.store.data[('alice', 'day:2026-10-24')]['payload']['tasks'][0]['text'], 'Write paper')

    def test_lost_response_retry_is_idempotent(self):
        first = self.write().json()
        second = self.write().json()
        self.assertEqual(first, second)
        changed = deepcopy(self.task); changed['text'] = 'Different payload'
        self.assertEqual(self.write(payload={'date': '2026-10-24', 'tasks': [changed]}).status_code, 409)

    def test_tombstone_prevents_stale_resurrection(self):
        self.write()
        self.assertEqual(self.write(revision=1, mutation='mutation-000000000002', deleted=True).json()['revision'], 2)
        self.assertEqual(self.write(revision=1, mutation='mutation-000000000003').status_code, 409)
        records = self.client.get('/v1/sync', headers={'Authorization': 'Bearer alice'}).json()['records']
        self.assertTrue(records[0]['deleted'])
        self.assertIsNone(records[0]['payload'])

    def test_secrets_and_unrecognized_fields_are_rejected(self):
        self.assertEqual(self.write(payload={'date': '2026-10-24', 'tasks': [], 'apiKey': 'never-sync'}).status_code, 422)
        self.assertEqual(self.write(payload={'targets': [], 'recurring': [], 'kbPath': '/private'}, key='goals').status_code, 422)
        self.assertEqual(self.write(key='settings').status_code, 422)
        bad = deepcopy(self.task); bad['text'] = 'x' * 5001
        self.assertEqual(self.write(payload={'date': '2026-10-24', 'tasks': [bad]}).status_code, 422)

    def test_date_task_ids_and_status_are_validated(self):
        self.assertEqual(self.write(payload={'date': '2026-02-31', 'tasks': []}, key='day:2026-02-31').status_code, 422)
        self.assertEqual(self.write(payload={'date': '2026-10-24', 'tasks': [self.task, self.task]}).status_code, 422)
        bad = deepcopy(self.task); bad['status'] = []
        self.assertEqual(self.write(payload={'date': '2026-10-24', 'tasks': [bad]}).status_code, 422)

    def test_allowlist_and_cors(self):
        with patch.dict('os.environ', {'ALLOWED_EMAILS': 'alice@example.com'}):
            self.assertEqual(self.write('bob').status_code, 403)
            self.assertEqual(self.write().status_code, 200)
        response = self.client.options('/v1/sync', headers={'Origin': 'https://evil.example', 'Access-Control-Request-Method': 'GET'})
        self.assertNotIn('access-control-allow-origin', response.headers)

    def test_pagination_preserves_all_records(self):
        self.write()
        self.write(key='goals', payload={'targets': [], 'recurring': []})
        page = self.client.get('/v1/sync?pageSize=1', headers={'Authorization': 'Bearer alice'}).json()
        self.assertEqual(len(page['records']), 1)
        self.assertIsNotNone(page['nextCursor'])
        last = self.client.get('/v1/sync?after=' + page['nextCursor'], headers={'Authorization': 'Bearer alice'}).json()
        self.assertEqual(len(last['records']), 1)
        self.assertIsNone(last['nextCursor'])

    def test_google_signin_handoff_is_proof_bound_and_one_time(self):
        verifier = 'a' * 43; session = 'b' * 43
        challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
        proof = {'sessionId': session, 'verifier': verifier}
        self.assertEqual(self.client.post('/v1/auth/exchange', json=proof).status_code, 202)
        self.assertEqual(self.client.post('/v1/auth/complete', headers={'Authorization': 'Bearer custom'}, json={'sessionId': session, 'challenge': challenge}).status_code, 403)
        done = self.client.post('/v1/auth/complete', headers={'Authorization': 'Bearer alice'}, json={'sessionId': session, 'challenge': challenge})
        self.assertEqual(done.status_code, 200)
        wrong = self.client.post('/v1/auth/exchange', json={**proof, 'verifier': 'c' * 43})
        self.assertEqual(wrong.status_code, 403)
        result = self.client.post('/v1/auth/exchange', json=proof)
        self.assertEqual(result.json()['customToken'], 'custom-token-for-alice')
        self.assertEqual(self.client.post('/v1/auth/exchange', json=proof).status_code, 410)
        self.assertEqual(result.headers['cache-control'], 'no-store')

    def test_large_request_is_rejected_before_parsing(self):
        response = self.client.put('/v1/sync/goals', headers={'Authorization': 'Bearer alice', 'Content-Type': 'application/json'}, content=b'x' * 700_001)
        self.assertEqual(response.status_code, 413)

    def test_falsy_outcome_values_are_not_mistaken_for_missing_fields(self):
        for field in ('doneWhen', 'by', 'originalBy'):
            for value in (0, False, [], {}):
                bad = deepcopy(self.task); bad['finish'] = {field: value}
                self.assertEqual(self.write(payload={'date': '2026-10-24', 'tasks': [bad]}).status_code, 422)

    def test_multiline_task_and_step_roundtrip(self):
        task = deepcopy(self.task)
        task['text'] = 'Research\n\n## 2026-11-01\n- [ ] prose'
        task['subtasks'] = [{**deepcopy(self.task), 'id': 'child', 'text': 'Step\nDetails', 'subtasks': []}]
        result = self.write(payload={'date': '2026-10-24', 'tasks': [task]})
        self.assertEqual(result.status_code, 200)

    def test_multiline_goals_remain_compatible_with_desktop(self):
        result = self.write(key='goals', payload={'targets': [{'id': 'g1', 'text': 'First line\nSecond line', 'done': False}], 'recurring': []})
        self.assertEqual(result.status_code, 200)


if __name__ == '__main__':
    unittest.main()
