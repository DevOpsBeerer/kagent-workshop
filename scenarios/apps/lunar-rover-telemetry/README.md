# `apps/lunar-rover-telemetry/`

Artemis-themed FastAPI app used by **UC3** (`OOMKilled` + observability) and **UC4** (multi-symptom cluster + a2a coordinator). Forked from `apps/_skeleton/` and extended with two pedagogical features: a deterministic memory leak and a Prometheus `/metrics` endpoint.

## Endpoints

| Method | Path        | Body | Returns                                    | Purpose                                                                                  |
| ------ | ----------- | ---- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| GET    | `/healthz`  | —    | `{"status":"ok","identity":"lunar-rover-telemetry"}` | Liveness/readiness baseline (inherited from skeleton).                       |
| POST   | `/leak`     | —    | `{"size_mb": <n>}`                         | Appends 1 MiB to a module-global list per call (FR-012). Monotonic, participant-triggered. |
| GET    | `/metrics`  | —    | Prometheus text format                     | Wired via `prometheus-fastapi-instrumentator`; scraped by the UC3 Prom install via Service label `monitoring=prom`. |

## How the OOMKilled scenario lands

UC3 deploys this app under `resources.limits.memory: 64Mi`. The FastAPI baseline RSS sits in the low 50s MiB; once the participant's tour runs the curl loop (~70 calls to `/leak`), the kernel hits the cgroup limit, OOM-kills the container, and kubelet records `OOMKilled` in `kubectl describe pod` and events. Memory growth shows in Grafana via the instrumentator's process metrics (FR-013). See `uc3/README.md` (lands in STORY-021) for the full scenario.

UC4 reuses this image at the same `:v1` tag (`uc4/manifests/`, STORY-024) — no new app source is added for UC4.

## Determinism

The leak is **participant-triggered**, not background. There is no startup race or timer; nothing grows until `POST /leak` is hit. This keeps NFR-003 (race-free reproduction) satisfied — the 60 s clock for NFR-001 starts when the participant runs the curl loop, not when `kubectl apply` lands.

## Local run (author dev)

```bash
cd apps/lunar-rover-telemetry
python -m venv .venv && source .venv/bin/activate
pip install -e .
uvicorn main:app --reload --port 8000

# Smoke
curl -s localhost:8000/healthz
curl -s -X POST localhost:8000/leak    # → {"size_mb":1}
curl -s -X POST localhost:8000/leak    # → {"size_mb":2}
curl -s localhost:8000/metrics | head  # Prometheus text format
```

## Container

```bash
docker build --platform linux/amd64 -t kagent-workshop-lunar-rover-telemetry:dev apps/lunar-rover-telemetry
docker run --rm -p 8000:8000 kagent-workshop-lunar-rover-telemetry:dev
```

`workshop-infrastructure` builds and publishes the registry-tagged image; this repo only ships source + Dockerfile.

## Image-tag conventions

| UC  | Manifest image tag                                | Why it's broken                                                                |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------ |
| UC3 | `<registry>/lunar-rover-telemetry:v1`             | Image OK, but `resources.limits.memory: 64Mi` + 70× `/leak` → `OOMKilled` (FR-012). |
| UC4 | `<registry>/lunar-rover-telemetry:v1`             | Same image; UC4 deploys it side-by-side with UC1 + UC2 manifests (FR-014).      |
