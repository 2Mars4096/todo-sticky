"""Sticky Todo's optional account service. Local tasks never depend on this service."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import re
import threading
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, ConfigDict, Field

KEY = re.compile(r"^(?:day:\d{4}-\d{2}-\d{2}|goals|focus:[A-Za-z0-9_-]{1,128})$")
ID = re.compile(r"^[A-Za-z0-9_-]{1,128}$")
SESSION = re.compile(r"^[A-Za-z0-9_-]{43}$")
STATUS = {"todo", "done", "partial", "question", "stopped"}


class BodyLimitMiddleware:
    """Bound buffering before Starlette/FastAPI decode a chunked JSON body."""
    def __init__(self, app, limit: int = 700_000):
        self.app, self.limit = app, limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope["method"] not in ("POST", "PUT"):
            return await self.app(scope, receive, send)
        parts = []
        size = 0
        while True:
            message = await receive()
            if message["type"] == "http.disconnect":
                return
            part = message.get("body", b"")
            size += len(part)
            if size > self.limit:
                return await JSONResponse({"detail": "Request too large"}, status_code=413)(scope, receive, send)
            parts.append(part)
            if not message.get("more_body", False):
                break
        consumed = False

        async def bounded_receive():
            nonlocal consumed
            if consumed:
                return await receive()
            consumed = True
            return {"type": "http.request", "body": b"".join(parts), "more_body": False}

        return await self.app(scope, bounded_receive, send)


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


class Mutation(StrictModel):
    expectedRevision: int = Field(ge=0)
    mutationId: str = Field(min_length=16, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")
    deleted: bool = False
    payload: dict[str, Any] | None = None


class Completion(StrictModel):
    sessionId: str = Field(pattern=SESSION.pattern)
    challenge: str = Field(pattern=SESSION.pattern)


class Exchange(StrictModel):
    sessionId: str = Field(pattern=SESSION.pattern)
    verifier: str = Field(pattern=SESSION.pattern)


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
                fields(item, {"id", "text", "status", "subtasks", "finish"}, {"id", "text", "status", "subtasks"})
                if not isinstance(item["id"], str) or not ID.fullmatch(item["id"]) or item["id"] in ids:
                    fail("Task IDs must be unique within a date")
                ids.add(item["id"])
                count[0] += 1
                if count[0] > 2000 or not isinstance(item["status"], str) or item["status"] not in STATUS:
                    fail("Invalid task count or status")
                text(item["text"], allow_blank=True, multiline=True)
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
                fields(item, {"id", "text", "done"}, {"id", "text", "done"})
                if not isinstance(item["id"], str) or not ID.fullmatch(item["id"]) or item["id"] in ids or not isinstance(item["done"], bool):
                    fail("Invalid goal")
                ids.add(item["id"])
                text(item["text"], multiline=True)
    else:
        fields(value, {"id", "taskId", "taskText", "durationMinutes", "completedAt", "vehicleCode", "orbitIndex", "orbitLabel"}, {"id", "taskId", "taskText", "durationMinutes", "completedAt", "vehicleCode", "orbitIndex", "orbitLabel"})
        if value["id"] != key[6:]:
            fail("Mission ID does not match record key")
        for name in ("taskId", "taskText", "vehicleCode", "orbitLabel"):
            text(value[name])
        for name in ("durationMinutes", "completedAt", "orbitIndex"):
            if type(value[name]) not in (int, float) or not 0 <= value[name] <= 10**15:
                fail("Invalid focus record")


def make_record(key: str, request: Mutation, current: dict | None) -> dict:
    if current and current["mutationId"] == request.mutationId:
        # A reused mutation ID with different contents is not an idempotent retry.
        if current["payload"] != request.payload or current["deleted"] != request.deleted:
            raise HTTPException(409, "Mutation ID was reused with different contents")
        return current
    if request.expectedRevision != (current["revision"] if current else 0):
        raise HTTPException(409, {"error": "conflict", "current": current})
    return {
        "key": key, "revision": request.expectedRevision + 1,
        "deleted": request.deleted, "payload": request.payload,
        "updatedAt": datetime.now(timezone.utc).isoformat(), "mutationId": request.mutationId,
    }


class FirestoreStore:
    def __init__(self):
        from firebase_admin import firestore
        self.db = firestore.client()

    def records(self, uid: str, after: str, limit: int) -> tuple[list[dict], str | None]:
        from google.cloud.firestore_v1.field_path import FieldPath
        collection = self.db.collection("stickyUsers").document(uid).collection("records")
        query = collection.order_by(FieldPath.document_id())
        if after:
            query = query.start_after({"__name__": collection.document(after)})
        docs = list(query.limit(limit + 1).stream())
        return [doc.to_dict() for doc in docs[:limit]], docs[limit - 1].id if len(docs) > limit else None

    def mutate(self, uid: str, key: str, request: Mutation) -> dict:
        from google.cloud.firestore_v1 import transactional
        ref = self.db.collection("stickyUsers").document(uid).collection("records").document(key)

        @transactional
        def write(transaction):
            snapshot = ref.get(transaction=transaction)
            current = snapshot.to_dict() if snapshot.exists else None
            result = make_record(key, request, current)
            if result != current:
                transaction.set(ref, result)
            return result

        return write(self.db.transaction())

    def complete(self, session: Completion, uid: str) -> None:
        from google.api_core.exceptions import AlreadyExists
        try:
            self.db.collection("stickyLoginSessions").document(session.sessionId).create({
                "uid": uid, "challenge": session.challenge,
                "expiresAt": datetime.now(timezone.utc) + timedelta(minutes=5), "consumed": False,
            })
        except AlreadyExists:
            raise HTTPException(409, "This sign-in link has already been used. Start again in the app.")

    def exchange(self, request: Exchange) -> str | None:
        from google.cloud.firestore_v1 import transactional
        ref = self.db.collection("stickyLoginSessions").document(request.sessionId)

        @transactional
        def consume(transaction):
            snapshot = ref.get(transaction=transaction)
            if not snapshot.exists:
                return None
            value = snapshot.to_dict()
            if value["expiresAt"] <= datetime.now(timezone.utc) or value["consumed"]:
                raise HTTPException(410, "Sign-in expired or was already completed")
            challenge = base64.urlsafe_b64encode(hashlib.sha256(request.verifier.encode()).digest()).decode().rstrip("=")
            if not hmac.compare_digest(challenge, value["challenge"]):
                raise HTTPException(403, "Invalid sign-in proof")
            transaction.update(ref, {"consumed": True})
            return value["uid"]

        return consume(self.db.transaction())


def create_app(store=None, verifier: Callable | None = None, mint: Callable | None = None) -> FastAPI:
    app = FastAPI(title="Sticky Todo sync", docs_url=None, redoc_url=None)
    initialization_lock = threading.RLock()
    app.add_middleware(BodyLimitMiddleware)
    app.add_middleware(CORSMiddleware,
        allow_origins=os.getenv("ALLOWED_ORIGINS", "tauri://localhost,http://tauri.localhost,https://tauri.localhost,http://localhost:5173").split(","),
        allow_methods=["GET", "POST", "PUT"], allow_headers=["Authorization", "Content-Type"],
    )

    def services():
        nonlocal store, verifier, mint
        with initialization_lock:
            if store is None:
                import firebase_admin
                from firebase_admin import auth
                if not firebase_admin._apps:
                    options = {"projectId": os.environ["GOOGLE_CLOUD_PROJECT"]}
                    if os.getenv("FIREBASE_SERVICE_ACCOUNT_ID"):
                        options["serviceAccountId"] = os.environ["FIREBASE_SERVICE_ACCOUNT_ID"]
                    firebase_admin.initialize_app(options=options)
                store = FirestoreStore()
                verifier = lambda token: auth.verify_id_token(token, check_revoked=True)
                mint = lambda uid: auth.create_custom_token(uid).decode()
        return store, verifier, mint

    @app.exception_handler(HTTPException)
    async def api_error(_request, error):
        return JSONResponse(error.detail if isinstance(error.detail, dict) else {"detail": error.detail}, status_code=error.status_code)

    def identity(authorization: str | None = Header(default=None)) -> dict:
        if not authorization or not authorization.startswith("Bearer "):
            raise HTTPException(401, "Sign in to sync")
        _, verify, _ = services()
        try:
            claims = verify(authorization[7:])
        except Exception:
            raise HTTPException(401, "Your session expired. Sign in again.")
        uid = claims.get("uid", "")
        if not isinstance(uid, str) or not ID.fullmatch(uid) or claims.get("email_verified") is not True:
            raise HTTPException(403, "A verified Google account is required")
        allowed = {v.strip().lower() for v in os.getenv("ALLOWED_EMAILS", "").split(",") if v.strip()}
        if allowed and str(claims.get("email", "")).lower() not in allowed:
            raise HTTPException(403, "This account is not enabled for this service")
        return claims

    @app.middleware("http")
    async def secure_responses(request: Request, call_next):
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        return response

    @app.get("/v1/health")
    @app.get("/healthz")
    def health():
        return {"ok": True}

    @app.get("/v1/config")
    def config():
        # Firebase client configuration is public. Never return Admin credentials.
        return {"firebase": {
            "apiKey": os.getenv("FIREBASE_WEB_API_KEY", ""),
            "authDomain": os.getenv("FIREBASE_AUTH_DOMAIN", ""),
            "projectId": os.getenv("GOOGLE_CLOUD_PROJECT", ""),
            "appId": os.getenv("FIREBASE_WEB_APP_ID", ""),
        }, "schemaVersion": 1}

    @app.get("/signin")
    def signin():
        return FileResponse(Path(__file__).with_name("signin.html"))

    @app.get("/signin.js")
    def signin_script():
        return FileResponse(Path(__file__).with_name("signin.js"), media_type="text/javascript")

    @app.post("/v1/auth/complete")
    def complete(body: Completion, user: dict = Depends(identity)):
        if user.get("firebase", {}).get("sign_in_provider") != "google.com":
            raise HTTPException(403, "Use Google to confirm this connection")
        services()[0].complete(body, user["uid"])
        return {"ok": True}

    @app.post("/v1/auth/exchange")
    def exchange(body: Exchange):
        db, _, mint_token = services()
        uid = db.exchange(body)
        if uid is None:
            return JSONResponse({"pending": True}, status_code=202)
        return {"customToken": mint_token(uid)}

    @app.get("/v1/sync")
    def records(after: str = "", pageSize: int = Query(default=200, ge=1, le=250), user: dict = Depends(identity)):
        if after and not KEY.fullmatch(after):
            fail("Invalid cursor")
        records, cursor = services()[0].records(user["uid"], after, pageSize)
        return {"records": records, "nextCursor": cursor, "schemaVersion": 1}

    @app.put("/v1/sync/{key}")
    def mutate(key: str, body: Mutation, user: dict = Depends(identity)):
        validate_payload(key, body)
        return services()[0].mutate(user["uid"], key, body)

    return app


app = create_app()
