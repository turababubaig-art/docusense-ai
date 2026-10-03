from __future__ import annotations

import logging
from typing import Any

from config import Settings

logger = logging.getLogger("docusense.database")

try:
    from supabase import Client, create_client
except ImportError:
    Client = Any
    create_client = None

class SupabaseDatabase:
    """Thin persistence adapter. All application code talks to this class rather than importing Supabase directly."""
    def __init__(self, settings: Settings):
        self.client: Client | None = None
        if create_client and settings.supabase_url and settings.supabase_key:
            try:
                self.client = create_client(settings.supabase_url, settings.supabase_key)
                logger.info("Supabase persistence enabled")
            except Exception:
                logger.exception("Supabase initialization failed")

    @property
    def available(self) -> bool:
        return self.client is not None

    def table_upsert(self, table: str, row: dict[str, Any]) -> list[dict[str, Any]]:
        if not self.client:
            return []
        result = self.client.table(table).upsert(row).execute()
        return result.data or []

    def table_insert_many(self, table: str, rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not self.client or not rows:
            return []
        result = self.client.table(table).insert(rows).execute()
        return result.data or []

    def table_get(self, table: str, column: str, value: str) -> dict[str, Any] | None:
        if not self.client:
            return None
        result = self.client.table(table).select("*").eq(column, value).limit(1).execute()
        rows = result.data or []
        return rows[0] if rows else None

    def table_list(self, table: str, user_id: str | None = None, limit: int = 200) -> list[dict[str, Any]]:
        if not self.client:
            return []
        query = self.client.table(table).select("*").limit(limit)
        if user_id:
            query = query.eq("user_id", user_id)
        result = query.execute()
        return result.data or []

    def table_delete(self, table: str, column: str, value: str) -> None:
        if self.client:
            self.client.table(table).delete().eq(column, value).execute()
