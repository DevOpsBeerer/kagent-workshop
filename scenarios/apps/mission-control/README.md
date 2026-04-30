# `apps/mission-control/`

Artemis-themed baseline FastAPI app used by **UC1** (`ImagePullBackOff`) and **UC2** (Pod Pending — taint mismatch).

The app is intentionally trivial: a `/healthz` endpoint reporting `{"status":"ok","identity":"mission-control"}`. The pedagogical story for UC1 and UC2 lives in the K8s manifest (bad image tag for UC1, untolerated taint for UC2), not in the app's runtime behaviour. Both UCs reference the same image — only the manifest differs (per FR-010 AC).

## Local run (author dev)

```bash
cd apps/mission-control
python -m venv .venv && source .venv/bin/activate
pip install -e .
uvicorn main:app --reload --port 8000
curl -s localhost:8000/healthz
# → {"status":"ok","identity":"mission-control"}
```

## Container

```bash
docker build --platform linux/amd64 -t kagent-workshop-mission-control:dev apps/mission-control
docker run --rm -p 8000:8000 kagent-workshop-mission-control:dev
```

`workshop-infrastructure` builds and publishes the registry-tagged image; this repo only ships source + Dockerfile.

## Image-tag conventions

| UC  | Manifest image tag                         | Why it's broken                                                         |
| --- | ------------------------------------------ | ----------------------------------------------------------------------- |
| UC1 | `<registry>/mission-control:v999`          | Tag never published → `ImagePullBackOff` (FR-008).                       |
| UC2 | `<registry>/mission-control:v1` (real)     | Image OK, but pod tolerations don't match the bootstrap-Job taint → `Pending` (FR-010). |

The tag for UC1 is deliberately **not** built or published; only `:v1` ships.
