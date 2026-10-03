from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import Any

from database.supabase import SupabaseDatabase

class DocumentRepository:
    def __init__(self, db: SupabaseDatabase):
        self.db = db
        self._lock = threading.RLock()
        self._documents: dict[str, dict[str, Any]] = {}
        self._jobs: dict[str, dict[str, Any]] = {}

    @staticmethod
    def now() -> str:
        return datetime.now(timezone.utc).isoformat()

    def save_document(self, record: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            self._documents[record["id"]] = record
        if self.db.available:
            try:
                self.db.table_upsert("documents", self._document_row(record))
            except Exception:
                # Persistence failure should be observable without leaking database details to clients.
                import logging
                logging.getLogger("docusense.repository").exception("Document persistence failed")
        return record

    def get_document(self, document_id: str, user_id: str | None = None) -> dict[str, Any] | None:
        with self._lock:
            record = self._documents.get(document_id)
        if record and (not user_id or record.get("user_id") == user_id):
            return record
        if not self.db.available:
            return None
        row = self.db.table_get("documents", "id", document_id)
        if not row or (user_id and row.get("user_id") != user_id):
            return None
        record = self._inflate(row)
        with self._lock:
            self._documents[document_id] = record
        return record

    def list_documents(self, user_id: str | None = None, limit: int = 200) -> list[dict[str, Any]]:
        with self._lock:
            rows = list(self._documents.values())
        if self.db.available:
            try:
                remote = self.db.table_list("documents", user_id=user_id, limit=limit)
                for row in remote:
                    item = self._inflate(row)
                    self._documents[item["id"]] = item
                rows = [x for x in self._documents.values() if not user_id or x.get("user_id") == user_id]
            except Exception:
                pass
        rows.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return rows[:limit]

    def save_job(self, job: dict[str, Any]) -> dict[str, Any]:
        with self._lock:
            self._jobs[job["job_id"]] = job
        if self.db.available:
            try:
                self.db.table_upsert("analysis_jobs", job)
            except Exception:
                import logging
                logging.getLogger("docusense.repository").exception("Job persistence failed")
        return job

    def get_job(self, job_id: str, user_id: str | None = None) -> dict[str, Any] | None:
        with self._lock:
            job = self._jobs.get(job_id)
        if job and (not user_id or job.get("user_id") == user_id):
            return job
        if not self.db.available:
            return None
        row = self.db.table_get("analysis_jobs", "job_id", job_id)
        if not row or (user_id and row.get("user_id") != user_id):
            return None
        with self._lock:
            self._jobs[job_id] = row
        return row

    def _document_row(self, record: dict[str, Any]) -> dict[str, Any]:
        analysis = record.get("analysis", {})
        return {
            "id": record.get("id"),
            "user_id": record.get("user_id"),
            "filename": record.get("filename"),
            "original_filename": record.get("original_filename", record.get("filename")),
            "extension": record.get("extension"),
            "mime_type": record.get("mime_type"),
            "size_bytes": record.get("size_bytes", 0),
            "sha256": record.get("sha256"),
            "status": record.get("status", "completed"),
            "pages": analysis.get("pages", record.get("pages", 0)),
            "analysis": analysis,
            "created_at": record.get("created_at", self.now()),
            "updated_at": record.get("updated_at", self.now()),
        }

    @staticmethod
    def _inflate(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": row.get("id"),
            "user_id": row.get("user_id"),
            "filename": row.get("filename", "document"),
            "original_filename": row.get("original_filename", row.get("filename", "document")),
            "extension": row.get("extension"),
            "mime_type": row.get("mime_type"),
            "size_bytes": row.get("size_bytes", 0),
            "sha256": row.get("sha256"),
            "status": row.get("status", "completed"),
            "analysis": row.get("analysis") or {},
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
        }
