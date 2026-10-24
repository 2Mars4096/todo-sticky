"""Exercise actual installed Firestore query construction without network credentials."""
import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from google.auth.credentials import AnonymousCredentials
from google.cloud.firestore_v1 import Client
from google.cloud.firestore_v1.query import Query
from app import FirestoreStore


class FirestoreQueryTests(unittest.TestCase):
    def test_page_cursor_is_a_document_reference_within_the_verified_users_collection(self):
        db = Client(project='test-project', credentials=AnonymousCredentials())
        with patch('firebase_admin.firestore.client', return_value=db):
            store = FirestoreStore()
        queries = []

        def stream(query):
            queries.append(query._to_protobuf())
            return iter([])

        with patch.object(Query, 'stream', stream):
            self.assertEqual(store.records('alice', 'day:2026-10-24', 200), ([], None))
        query = queries[0]
        self.assertEqual(query.order_by[0].field.field_path, '__name__')
        self.assertEqual(query.start_at.values[0].reference_value, 'projects/test-project/databases/(default)/documents/stickyUsers/alice/records/day:2026-10-24')
        self.assertFalse(query.start_at.before)
        self.assertEqual(query.limit, 201)


if __name__ == '__main__':
    unittest.main()
