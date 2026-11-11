"""Bounded, owner-scoped material for Todo suggestion cells.

Record content is evidence, never an instruction or a tool grant. The caller's
source revisions and the selected task tree remain authoritative until delivery.
"""
from __future__ import annotations

import copy
import json

from .models import PluginError
from .registry import identifier
from .todo_actions import TodoActionService, parent_id


class TodoSuggestionContext:
    def __init__(self, plugins, owner, references):
        self.records = {}
        self.roots = {}
        self.generation = None
        self.project_ids = set()
        self.sources = []
        self.truncated = False
        if references is None:
            return  # Older standalone callers retain their supplied-context path.
        if not isinstance(references, list) or not 1 <= len(references) <= 40:
            raise PluginError(422, 'Select between one and 40 saved sources')
        selected = []
        seen = set()
        for ref in references:
            if not isinstance(ref, dict) or set(ref) != {'record_type', 'record_id', 'revision'}:
                raise PluginError(422, 'A suggestion source needs its saved identity and revision')
            kind, record_id, revision = ref['record_type'], ref['record_id'], ref['revision']
            if kind not in ('task', 'goal') or not isinstance(revision, int) or isinstance(revision, bool) or revision < 1:
                raise PluginError(422, 'Choose a saved Todo task or project')
            identifier(record_id)
            key = kind + ':' + record_id
            if key in seen:
                raise PluginError(422, 'Choose each source once')
            seen.add(key)
            record = plugins.get_record(owner, 'todo', kind, record_id)
            if record['revision'] != revision:
                raise PluginError(409, 'A selected source changed. Refresh before requesting suggestions.')
            selected.append(record)
            self.records[key] = record

        self.generation, tasks = TodoActionService(plugins)._snapshot(owner)
        related = []
        for record in selected:
            if record['record_type'] == 'task':
                ids = TodoActionService._subtree(tasks, record['record_id'])
                self.roots[record['record_id']] = ids
                related.extend(tasks[key] for key in sorted(ids) if key != record['record_id'])
                parent = parent_id(record)
                visited = set(ids)
                while parent and parent in tasks and parent not in visited and len(visited) < 100:
                    visited.add(parent)
                    related.append(tasks[parent])
                    parent = parent_id(tasks[parent])
                goal_id = record.get('extensions', {}).get('goal_id')
                if goal_id:
                    try:
                        related.append(plugins.get_record(owner, 'todo', 'goal', goal_id))
                    except PluginError as error:
                        if error.status != 404:
                            raise
            else:
                self.project_ids.add(record['record_id'])
                related.extend(row for row in tasks.values()
                               if row.get('extensions', {}).get('goal_id') == record['record_id'])

        for record in related:
            key = record['record_type'] + ':' + record['record_id']
            if key in self.records:
                continue
            if len(self.records) >= 40:
                self.truncated = True
                continue
            self.records[key] = record

        remaining = 40000
        for index, record in enumerate(self.records.values()):
            ext = record.get('extensions', {})
            details = {key: copy.deepcopy(ext[key]) for key in
                       ('outcome', 'due_date', 'source_due_date', 'assignee', 'date', 'goal_id', 'plan') if key in ext}
            # These passages were frozen by the explicit Meeting-to-Todo handoff.
            # Do not substitute a newer transcript or fetch arbitrary linked files.
            meeting = ext.get('meeting_context')
            if isinstance(meeting, dict):
                details['source_meeting'] = {key: copy.deepcopy(meeting[key]) for key in
                    ('meeting_id', 'transcript_revision', 'title', 'excerpts', 'surrounding_segments', 'context_note')
                    if key in meeting}
            content = json.dumps({'text': record.get('text') or record.get('title', ''),
                                  'status': record.get('status'), 'details': details}, ensure_ascii=False)
            available = min(8000, remaining)
            if available <= 0:
                self.truncated = True
                break
            excerpt = content[:available]
            clipped = len(content) > available
            self.truncated |= clipped
            self.sources.append({'source_id': f'todo_{index + 1}', 'title': record.get('title', '')[:300],
                'text': excerpt, 'provenance': {'plugin_id': 'todo', 'record_type': record['record_type'],
                    'record_id': record['record_id'], 'revision': record['revision'], 'truncated': clipped}})
            remaining -= len(excerpt)

    def check(self, state):
        """Run inside the same Todo transaction that admits/delivers the result."""
        for key, source in self.records.items():
            current = state['records'].get(key)
            if not current or current.get('deleted') or current['revision'] != source['revision']:
                raise PluginError(409, 'Task context changed. Generate a fresh suggestion; saved tasks are unchanged.')
        current_generation = state['settings'].get('generation:task', {'value': 0})['value']
        if self.generation is None or current_generation == self.generation:
            return
        if self.project_ids:
            # A newly created project step must not evade the selected snapshot.
            raise PluginError(409, 'Project work changed. Refresh before generating a new proposal.')
        tasks = {record['record_id']: record for record in state['records'].values()
                 if record['record_type'] == 'task' and not record.get('deleted')}
        for root, expected in self.roots.items():
            if TodoActionService._subtree(tasks, root) != expected:
                raise PluginError(409, 'The task steps changed. Generate a fresh suggestion.')

    def payload(self):
        if not self.sources:
            return {}
        return {'context_sources': copy.deepcopy(self.sources), 'context_truncated': self.truncated}
