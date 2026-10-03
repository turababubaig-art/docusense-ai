from __future__ import annotations

import os
from typing import Any, Dict, Optional
from urllib.parse import quote

import httpx


class SAPError(RuntimeError):
    pass


class SAPClient:
    def __init__(self, base_url: Optional[str] = None, access_token: Optional[str] = None):
        self.base_url = (base_url or os.getenv("SAP_BASE_URL", "")).rstrip("/")
        self.access_token = access_token or os.getenv("SAP_ACCESS_TOKEN")
        self.timeout = float(os.getenv("SAP_HTTP_TIMEOUT", "30"))

    def _headers(self) -> Dict[str, str]:
        headers = {"Accept": "application/json"}
        if self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers

    async def get(self, path: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        if not self.base_url:
            raise SAPError("SAP_BASE_URL is not configured.")
        url = f"{self.base_url}/{path.lstrip('/')}"
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=True) as client:
                response = await client.get(url, params=params, headers=self._headers())
        except httpx.RequestError as exc:
            raise SAPError(f"SAP connection unavailable: {exc}") from exc
        if response.status_code >= 400:
            detail = response.text[:500]
            raise SAPError(f"SAP API returned HTTP {response.status_code}: {detail}")
        try:
            return response.json()
        except ValueError as exc:
            raise SAPError("SAP API returned a non-JSON response.") from exc

    async def test_connection(self) -> Dict[str, bool]:
        # Metadata is a common OData capability. Customers can override it.
        metadata_path = os.getenv("SAP_METADATA_PATH", "$metadata")
        await self.get(metadata_path)
        return {"connection": True, "authentication": True, "api": True, "permissions": True, "metadata": True}

    async def query(self, entity: str, select: list[str] | None = None,
                   filters: str | None = None, orderby: str | None = None,
                   top: int = 100, skip: int = 0) -> Dict[str, Any]:
        params: Dict[str, Any] = {"$top": max(1, min(top, 1000)), "$skip": max(0, skip)}
        if select:
            params["$select"] = ",".join(select)
        if filters:
            params["$filter"] = filters
        if orderby:
            params["$orderby"] = orderby
        return await self.get(quote(entity.strip("/"), safe="/"), params=params)
