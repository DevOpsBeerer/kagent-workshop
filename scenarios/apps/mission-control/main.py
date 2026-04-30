"""kagent-workshop-scenarios — `mission-control` app variant (FR-007).

UC1 + UC2 baseline. Identical behaviour to `_skeleton`: a single `/healthz`
endpoint reporting identity. UC1 deploys this with a non-existent image tag
(ImagePullBackOff); UC2 deploys it with an unsatisfiable taint (Pending).
The app itself is intentionally trivial — the diagnostic story is in the
manifest, not the runtime behaviour.
"""

from __future__ import annotations

import os

from fastapi import FastAPI

APP_IDENTITY = os.environ.get("APP_IDENTITY", "mission-control")

app = FastAPI(title=f"kagent-workshop · {APP_IDENTITY}", docs_url=None, redoc_url=None)


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "identity": APP_IDENTITY}
