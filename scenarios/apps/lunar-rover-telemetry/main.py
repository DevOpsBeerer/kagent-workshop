"""kagent-workshop-scenarios — `lunar-rover-telemetry` app variant (FR-007).

UC3 + UC4 source app. Adds two endpoints to the skeleton baseline:

- `POST /leak` — appends 1 MiB to a module-global list per call. Used by the
  UC3 tour to drive the container into `OOMKilled` under a 64 Mi K8s limit
  (FR-012). Deterministic, monotonic, participant-triggered (no startup race
  → NFR-003).
- `/metrics` — Prometheus text format, wired via `prometheus-fastapi-instrumentator`.
  UC3's Prometheus install scrapes this Service via the `monitoring=prom` label
  (FR-012 AC).

`/healthz` is preserved from the skeleton.
"""

from __future__ import annotations

import os

from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

APP_IDENTITY = os.environ.get("APP_IDENTITY", "lunar-rover-telemetry")

app = FastAPI(title=f"kagent-workshop · {APP_IDENTITY}", docs_url=None, redoc_url=None)

# Module-global; intentional. Each /leak call appends a fresh 1 MiB block of
# random bytes (os.urandom, not zeros) — random data is unique-per-page so
# the kernel can't fold it into the zero-page or merge it via KSM. The
# resident set grows by ~1 MiB per call deterministically. The earlier
# `b"\x00" * (1024*1024)` form was virtually 1 MiB but on some kernels
# stayed backed by a shared zero page, so RSS stayed flat across hundreds
# of calls and the cgroup memory limit never tripped — observed on AKS
# nodes during workshop dry-run.
LEAK: list[bytes] = []


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "identity": APP_IDENTITY}


@app.post("/leak")
def leak() -> dict[str, int]:
    LEAK.append(os.urandom(1024 * 1024))
    return {"size_mb": len(LEAK)}


# Mount /metrics. expose() defaults to GET /metrics, no auth — this app runs
# inside a per-participant vCluster so the metrics endpoint is workshop-internal.
Instrumentator().instrument(app).expose(app)
