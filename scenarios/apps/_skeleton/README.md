# `apps/_skeleton/`

Copy this directory to start a new app variant.

```bash
cp -r apps/_skeleton apps/<artemis-name>
# then:
#  - update [project].name in pyproject.toml
#  - update the default APP_IDENTITY in main.py and the Dockerfile ENV
#  - register the UC ↔ variant mapping in apps/README.md
```

## Local run (author dev)

```bash
cd apps/_skeleton
python -m venv .venv && source .venv/bin/activate
pip install -e .
uvicorn main:app --reload --port 8000
curl -s localhost:8000/healthz
# → {"status":"ok","identity":"_skeleton"}
```

## Container

Multi-stage, `python:3.12-slim` → `python:3.12-slim`, x86-64. Build:

```bash
docker build --platform linux/amd64 -t kagent-workshop-skeleton:dev apps/_skeleton
docker run --rm -p 8000:8000 kagent-workshop-skeleton:dev
```

Override identity at run time: `-e APP_IDENTITY=mission-control`. Final image is ≤ 200 MB compressed (FR-007 AC).
