"""kagent-workshop-scenarios — FastAPI app skeleton (FR-007).

This module is the reference baseline every UC's app variant forks from. The
identity is read from the APP_IDENTITY environment variable so a copied
variant only has to set its default at deploy time (or override the file).
"""

from __future__ import annotations

import os

from fastapi import FastAPI

APP_IDENTITY = os.environ.get("APP_IDENTITY", "_skeleton")

app = FastAPI(title=f"kagent-workshop · {APP_IDENTITY}", docs_url=None, redoc_url=None)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "identity": APP_IDENTITY}
