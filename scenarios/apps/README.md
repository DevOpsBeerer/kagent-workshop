# `apps/` — broken-state FastAPI variants

Source for the FastAPI applications each UC's broken Deployment runs. All variants share the convention from FR-007: Python 3.12, FastAPI ≥ 0.115, `uvicorn[standard]` as ASGI server, multi-stage Dockerfile producing an x86-64 image ≤ 200 MB compressed, an Artemis-themed identity, and a `/healthz` endpoint.

## UC ↔ variant mapping

| Variant                                             | Used by  | Purpose                                                                  |
| --------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| [`_skeleton/`](_skeleton/README.md)                 | (none)   | Reference template authors fork from — never deployed.                   |
| [`mission-control/`](mission-control/README.md)     | UC1, UC2 | Baseline `/healthz` only. Deployed broken via image-tag (UC1) and scheduling (UC2). |
| `lunar-rover-telemetry/`                            | UC3, UC4 | Adds `/leak` (memory leak endpoint) and `/metrics` (Prometheus). *Lands in STORY-010.* |

## Image build and publish

This repo ships **source + Dockerfile**. Container image build, registry push, and image-tag pinning are owned by `workshop-infrastructure`. The hand-off contract:

- Each `apps/<name>/Dockerfile` builds standalone with build context `apps/<name>` (`docker build apps/<name>`).
- Tag convention: `<registry>/kagent-workshop/<name>:<version>`. UC1 deliberately references a tag that is not published (`mission-control:v999`) to produce `ImagePullBackOff` (FR-008); UC2/3/4 reference real published tags.
- Architecture: `linux/amd64` is mandatory (AKS workshop runtime); multi-arch is optional.
- No `:latest` anywhere (NFR-005).

## Author dev loop

`make uc<N>-up` (see root README) deploys a UC end-to-end on local kind. Building images locally for that loop is not yet wired — `workshop-infrastructure` owns the publish step, so the local kind loop expects images to already exist in a reachable registry, or for the participant's tour to proceed up to the agent invocation step (which doesn't depend on the broken image actually running).

For per-app iteration, use the local-run snippet in each variant's `README.md`.
