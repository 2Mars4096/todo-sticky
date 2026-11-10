"""Frozen Sticky Todo v1/v2 wire validation, copied from backend/app.py at 909afeb.

Canonical product sync uses this contract. The old backend remains rollback-only.
"""
from __future__ import annotations
import json
import re
from copy import deepcopy
from datetime import date
from typing import Any
from fastapi import HTTPException
from pydantic import BaseModel, ConfigDict, Field
KEY = re.compile(r"^(?:day:\d{4}-\d{2}-\d{2}|goals|focus:[A-Za-z0-9_-]{1,128})$")
ID = re.compile(r"^[A-Za-z0-9_-]{1,128}$")
STATUS = {"todo", "done", "partial", "question", "stopped"}


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)

class Mutation(StrictModel):
    expectedRevision: int = Field(ge=0)
    mutationId: str = Field(min_length=16, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")
    deleted: bool = False
    payload: dict[str, Any] | None = None
    schemaVersion: int = Field(default=1, ge=1, le=2)

def fail(message: str) -> None:
    raise HTTPException(422, message)

def fields(value: Any, allowed: set[str], required: set[str]) -> dict:
    if not isinstance(value, dict) or not required.issubset(value) or set(value) - allowed:
        fail("Unexpected or missing record fields")
    return value

def text(value: Any, maximum: int = 5000, *, multiline: bool = False, allow_blank: bool = False) -> None:
    if not isinstance(value, str) or (not allow_blank and not value.strip()) or len(value) > maximum:
        fail("Invalid text")
    if not multiline and ("\n" in value or "\r" in value):
        fail("Text must fit on one line")

def iso_date(value: Any) -> None:
    try:
        if not isinstance(value, str) or date.fromisoformat(value).isoformat() != value:
            fail("Invalid date")
    except (ValueError, TypeError):
        fail("Invalid date")

def validate_payload(key: str, mutation: Mutation) -> None:
    if not KEY.fullmatch(key):
        fail("Invalid record key")
    if key.startswith("day:"):
        iso_date(key[4:])
    if mutation.deleted:
        if mutation.payload is not None:
            fail("A tombstone cannot contain a payload")
        return
    value = mutation.payload
    if not isinstance(value, dict) or len(json.dumps(value).encode()) > 600_000:
        fail("Payload must be an object under 600 KB")
    if key.startswith("day:"):
        fields(value, {"date", "tasks"}, {"date", "tasks"})
        if value["date"] != key[4:]:
            fail("Date does not match record key")
        ids: set[str] = set()
        count = [0]

        def tasks(items: Any, depth: int = 0) -> None:
            if not isinstance(items, list) or depth > 12:
                fail("Invalid task tree")
            for item in items:
                fields(item, {"id", "text", "status", "subtasks", "finish", "goalId", "goalStepId"}, {"id", "text", "status", "subtasks"})
                if not isinstance(item["id"], str) or not ID.fullmatch(item["id"]) or item["id"] in ids:
                    fail("Task IDs must be unique within a date")
                ids.add(item["id"])
                count[0] += 1
                if count[0] > 2000 or not isinstance(item["status"], str) or item["status"] not in STATUS:
                    fail("Invalid task count or status")
                text(item["text"], allow_blank=True, multiline=True)
                for name in ("goalId", "goalStepId"):
                    if name in item and (not isinstance(item[name], str) or not ID.fullmatch(item[name])):
                        fail("Invalid goal link")
                if "goalStepId" in item and "goalId" not in item:
                    fail("A goal step must name its goal")
                if mutation.schemaVersion < 2 and ("goalId" in item or "goalStepId" in item):
                    fail("Goal links require payload schema version 2")
                finish = item.get("finish")
                if finish is not None:
                    fields(finish, {"doneWhen", "by", "originalBy", "deadlineChanges", "reviewReady"}, set())
                    if "doneWhen" in finish:
                        if not isinstance(finish["doneWhen"], str) or len(finish["doneWhen"]) > 5000:
                            fail("Invalid outcome text")
                    for name in ("by", "originalBy"):
                        if name in finish:
                            if not isinstance(finish[name], str):
                                fail("Invalid deadline")
                            if finish[name]:
                                iso_date(finish[name])
                    if "reviewReady" in finish and not isinstance(finish["reviewReady"], bool):
                        fail("Invalid outcome review state")
                    changes = finish.get("deadlineChanges", [])
                    if not isinstance(changes, list) or len(changes) > 500:
                        fail("Invalid deadline history")
                    for change in changes:
                        fields(change, {"from", "to", "at"}, {"from", "to", "at"})
                        for name in ("from", "to"):
                            if change[name] is not None:
                                iso_date(change[name])
                        text(change["at"], 100)
                tasks(item["subtasks"], depth + 1)

        tasks(value["tasks"])
    elif key == "goals":
        fields(value, {"targets", "recurring"}, {"targets", "recurring"})
        for group in value.values():
            if not isinstance(group, list) or len(group) > 2000:
                fail("Invalid goals")
            ids = set()
            for item in group:
                fields(item, {"id", "text", "done", "plan"}, {"id", "text", "done"})
                if not isinstance(item["id"], str) or not ID.fullmatch(item["id"]) or item["id"] in ids or not isinstance(item["done"], bool):
                    fail("Invalid goal")
                ids.add(item["id"])
                text(item["text"], multiline=True)
                if "plan" in item:
                    if mutation.schemaVersion < 2:
                        fail("Goal plans require payload schema version 2")
                    if not isinstance(item["plan"], list) or len(item["plan"]) > 200:
                        fail("Invalid goal plan")
                    steps: set[str] = set()
                    for step in item["plan"]:
                        fields(step, {"id", "text"}, {"id", "text"})
                        if not isinstance(step["id"], str) or not ID.fullmatch(step["id"]) or step["id"] in steps:
                            fail("Invalid goal plan step")
                        steps.add(step["id"])
                        text(step["text"], multiline=True)
    else:
        fields(value, {"id", "taskId", "taskText", "durationMinutes", "completedAt", "vehicleCode", "orbitIndex", "orbitLabel"}, {"id", "taskId", "taskText", "durationMinutes", "completedAt", "vehicleCode", "orbitIndex", "orbitLabel"})
        if value["id"] != key[6:]:
            fail("Mission ID does not match record key")
        for name in ("taskId", "taskText", "vehicleCode", "orbitLabel"):
            text(value[name])
        for name in ("durationMinutes", "completedAt", "orbitIndex"):
            if type(value[name]) not in (int, float) or not 0 <= value[name] <= 10**15:
                fail("Invalid focus record")

def project_record(record: dict | None, schema_version: int) -> dict | None:
    """Keep older clients' strict readers compatible without changing storage."""
    if record is None or schema_version >= 2 or record["payload"] is None:
        return record
    result = deepcopy(record)
    payload = result["payload"]
    if record["key"].startswith("day:"):
        def strip(tasks: list[dict]) -> None:
            for task in tasks:
                task.pop("goalId", None)
                task.pop("goalStepId", None)
                strip(task["subtasks"])
        strip(payload["tasks"])
    elif record["key"] == "goals":
        for group in ("targets", "recurring"):
            for goal in payload[group]:
                goal.pop("plan", None)
    return result

def legacy_payload(key: str, payload: dict, previous: dict) -> dict:
    """A v1 edit cannot erase metadata its app was never able to read."""
    result = deepcopy(payload)
    if key.startswith("day:"):
        existing = {}
        def index(tasks: list[dict]) -> None:
            for task in tasks:
                existing[task["id"]] = task
                index(task["subtasks"])
        def restore(tasks: list[dict]) -> None:
            for task in tasks:
                old = existing.get(task["id"], {})
                for name in ("goalId", "goalStepId"):
                    if name in old and name not in task:
                        task[name] = old[name]
                restore(task["subtasks"])
        index(previous["tasks"])
        restore(result["tasks"])
    elif key == "goals":
        for group in ("targets", "recurring"):
            existing = {goal["id"]: goal for goal in previous[group]}
            for goal in result[group]:
                old = existing.get(goal["id"], {})
                if "plan" in old and "plan" not in goal:
                    goal["plan"] = deepcopy(old["plan"])
    return result
