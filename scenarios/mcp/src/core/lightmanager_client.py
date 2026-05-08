"""Thin httpx client for light-manager's bulbs API.

Light-manager runs as a workshop-cluster-shared multi-tenant service; this MCP
proxies its bulbs endpoints (GET /api/bulbs?user=, PUT /api/bulbs/{slot}?user=).
The URL is read from LIGHT_MANAGER_URL at call time so workshop-infrastructure
can change it without rebuilding the image.

The client is intentionally minimal — it does no caching, no retry, no
auth header management. Tenancy is enforced one layer up (src/core/tenancy.py),
not here, so this client trusts its caller.
"""

from __future__ import annotations

import os
from typing import Any

import httpx

LIGHT_MANAGER_URL_ENV = "LIGHT_MANAGER_URL"
DEFAULT_TIMEOUT = httpx.Timeout(5.0, connect=2.0)


def _base_url() -> str:
    url = os.environ.get(LIGHT_MANAGER_URL_ENV, "").strip()
    if not url:
        raise RuntimeError(
            f"{LIGHT_MANAGER_URL_ENV} not set; the MCP cannot reach light-manager. "
            "Inject the in-cluster Service URL via Deployment env."
        )
    return url.rstrip("/")


def get_bulbs(user: str) -> list[dict[str, Any]]:
    """GET <LIGHT_MANAGER_URL>/api/bulbs?user=<user> → list of bulb JSON objects."""
    response = httpx.get(
        f"{_base_url()}/api/bulbs",
        params={"user": user},
        timeout=DEFAULT_TIMEOUT,
    )
    response.raise_for_status()
    return response.json()


def put_bulb(user: str, slot: int, payload: dict[str, int]) -> dict[str, Any]:
    """PUT <LIGHT_MANAGER_URL>/api/bulbs/{slot}?user=<user> → updated bulb JSON."""
    response = httpx.put(
        f"{_base_url()}/api/bulbs/{slot}",
        params={"user": user},
        json=payload,
        timeout=DEFAULT_TIMEOUT,
    )
    response.raise_for_status()
    return response.json()
