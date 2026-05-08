# STORY-023: MCP packaging — Dockerfile + per-vCluster manifests + RemoteMCPServer CRD

**Epic:** EPIC-004 (UC4 — Multi-agent coordinator + custom MCP)
**FRs:** FR-016 (custom MCP wrapping light-manager OpenAPI)
**NFRs:** NFR-002 (low resource footprint), NFR-006 (vanilla Kubernetes — no operators)
**Priority:** Must Have
**Story Points:** 3
**Status:** Completed (2026-05-08)
**Assigned To:** Quentin Rodic
**Created:** 2026-05-08
**Sprint:** 3 (M3, 2026-05-11 → 2026-05-13) — implemented out-of-band on 2026-05-08, alongside STORY-022 + the four EPIC-003 swaps. **Closes Sprint 3's commitments at 100% before formal start.**

---

## User Story

As **`workshop-infrastructure`** (the CI / CD layer that deploys this repo's artefacts into per-participant vClusters),
I want **a buildable Docker image of the artemis-bulb-mcp server, plus a per-vCluster manifest set (Namespace, Deployment, Service, RemoteMCPServer CRD) that pins `WORKSHOP_PARTICIPANT_LOGIN` and `LIGHT_MANAGER_URL` via env injection**,
So that **applying `mcp/manifests/` against a participant's vCluster stands up a tenancy-pinned MCP that kagent's UC4 coordinator can discover and call (FR-017 bulb-colour writes), with no committed secrets, no operators, and no hand-edits per-participant.**

---

## Description

### Background

STORY-022 shipped the MCP source: KMCP-Tools-scaffolded FastMCP-Python project with the two tools (`list_bulbs` + `update_bulb`), the Pydantic shape shadows of light-manager's `BulbRead` / `BulbUpdate`, the tenancy guard, and 61 passing unit tests. STORY-023 wraps that source for per-vCluster deployment:

- A multi-stage `python:3.12-slim` Dockerfile that produces a small, non-root, healthchecked image.
- Per-vCluster manifests under `mcp/manifests/`: a Namespace, Deployment that injects the two required env vars at runtime, ClusterIP Service exposing the MCP HTTP endpoint, and a kagent CRD pointing at that Service so the coordinator's tool ensemble can find it.
- Makefile wiring (`mcp-build`, `mcp-up`, `mcp-down`) so authors can iterate on the image + manifests without remembering the exact `kubectl apply` order.

### Sprint plan AC vs. actual kagent v0.9.0 CRD shape — one-line correction

The sprint plan calls for "`mcp/manifests/toolserver.yaml` kagent v0.9 `ToolServer` pointing at the Service" (line 358). Per STORY-019's spike against the live cluster, kagent v0.9.0 ships **two** CRDs in this space:

- `ToolServer` (`kagent.dev/v1alpha1`) — older shape, still present.
- `RemoteMCPServer` (`kagent.dev/v1alpha2`) — modern shape, what kagent's own pre-packaged MCPs use (`kagent-tool-server`, `kagent-grafana-mcp`), and what UC1's existing agent already references via `tools[].mcpServer.kind: RemoteMCPServer`.

**Decision: ship `RemoteMCPServer`, not `ToolServer`.** Three reasons:

1. UC1's `agents/agent.yaml:51` already uses `RemoteMCPServer` to reference `kagent-tool-server`. Using `ToolServer` for the bulb MCP would split the project's CRD usage between v1alpha1 and v1alpha2 for no reason.
2. The cluster-installed `kagent-tool-server` is a `RemoteMCPServer` with `protocol: STREAMABLE_HTTP`; the artemis-bulb-mcp uses the same FastMCP runtime + same protocol, so the spec shape is byte-equivalent (just different `url:`).
3. The sprint plan's "ToolServer" wording predates STORY-019's spike findings (the plan was written 2026-04-28, the spike ran 2026-05-08); the architecture doc has the same generic "ToolServer" wording as a *concept*, not the literal CRD name.

The story doc commits to RemoteMCPServer; the sprint-plan AC text is read as "the kagent v0.9 MCP-pointer CRD" not as a literal v1alpha1 CRD reference.

### Scope

**In scope:**
- `mcp/Dockerfile` — kmcp-generated multi-stage Dockerfile, **adjusted** to default to HTTP transport on port 8080 (the kmcp default is stdio, which doesn't fit a containerised deployment) and to make the healthcheck actually probe the HTTP endpoint rather than just `import src.main`.
- `mcp/manifests/00-namespace.yaml` — `artemis-mcp` Namespace per `docs/artemis-naming.md` L33.
- `mcp/manifests/10-deployment.yaml` — single-replica `Deployment artemis-bulb-mcp` running the image at `rg.fr-par.scw.cloud/apogasa/artemis-bulb-mcp:v0.1.0`. Two env vars sourced from a Secret + ConfigMap that workshop-infrastructure injects at deploy time:
  - `WORKSHOP_PARTICIPANT_LOGIN` — from a Secret (the participant's login is participant-specific cluster state, not committed).
  - `LIGHT_MANAGER_URL` — from a ConfigMap (the URL is workshop-cluster state, not participant-specific).
  - **No committed values** for either env var (NFR-011).
- `mcp/manifests/20-service.yaml` — `Service artemis-bulb-mcp` (ClusterIP, port 8080 → port-name `mcp`).
- `mcp/manifests/30-remotemcpserver.yaml` — `RemoteMCPServer artemis-bulb-mcp` in the `kagent` namespace, `protocol: STREAMABLE_HTTP`, `url: http://artemis-bulb-mcp.artemis-mcp.svc.cluster.local:8080/mcp` (cross-namespace DNS — the MCP runs in `artemis-mcp`, the CRD lives in `kagent` per `docs/artemis-naming.md` L72).
- `Makefile` — three new phony targets:
  - `mcp-build` — `docker build -t rg.fr-par.scw.cloud/apogasa/artemis-bulb-mcp:v0.1.0 mcp/`. For author-side / CI use; workshop-infrastructure publishes the official image.
  - `mcp-up` — `kubectl apply -f mcp/manifests/`. Idempotent.
  - `mcp-down` — `kubectl delete -f mcp/manifests/ --ignore-not-found`.
  - `lint-manifests` — extended to walk `mcp/manifests/` (alongside `uc*/manifests/` and `infra/observability/`).
- Self-author validation: build the image locally, `kind load`, apply the manifests with `WORKSHOP_PARTICIPANT_LOGIN` + `LIGHT_MANAGER_URL` injected via a temporary author Secret/ConfigMap, verify the Pod reaches Ready, the Service is reachable via `kubectl port-forward`, and the `RemoteMCPServer` CRD reaches `Accepted=True` (kagent's reconciler probes the URL and discovers the tools).

**Out of scope:**
- `mcp/src/`, `mcp/tests/`, `mcp/pyproject.toml`, `mcp/kmcp.yaml` — STORY-022.
- Image publishing — workshop-infrastructure CI's responsibility (per the same pattern as `mission-control:v1`, `lunar-rover-telemetry:v1.0.0`). STORY-023 ships the Dockerfile + a working `mcp-build` target; pushing to the registry is downstream.
- The Secret + ConfigMap that inject `WORKSHOP_PARTICIPANT_LOGIN` + `LIGHT_MANAGER_URL` — workshop-infrastructure's responsibility per NFR-011 ("no secrets in repo"). STORY-023 ships a Deployment that *consumes* them (`envFrom: secretRef:` + `envFrom: configMapRef:` patterns); the resources themselves are not committed. Self-author validation creates throwaway local instances that are deleted at the end of the validation run.
- `mcp/manifests/secret.yaml.example` or similar — explicitly not shipped. If workshop-infrastructure needs a template, that's a separate follow-up; the Deployment's documented env-var contract is sufficient.
- UC4 coordinator wiring (STORY-025) — the consumer of the RemoteMCPServer this story ships.
- A `lint-agents` Makefile target — sprint plan AC mentions one ("`make lint-agents` clean") but STORY-003 (which would have shipped it) was **skipped** in M1 (per `docs/sprint-status.yaml`: "Deferred from M1: kagent CRDs reach the cluster via the canonical OCI helm chart; offline lint-agents is a nice-to-have"). The RemoteMCPServer manifest is validated against the live cluster's CRD schema by `kubectl apply --dry-run=server`, which the existing `make lint-manifests` already runs over `infra/observability/`. STORY-023 extends that walk to `mcp/manifests/` so the AC's intent ("the MCP CRD is well-formed") is satisfied without standing up an offline schema validator.

### User flow (workshop-infrastructure lives this)

1. CI builds the image: `make mcp-build` → `docker build -t rg.fr-par.scw.cloud/apogasa/artemis-bulb-mcp:v0.1.0 mcp/`.
2. CI pushes to the apogasa registry (out of scope here; same pattern as the other apogasa images).
3. For each participant's vCluster:
   - workshop-infrastructure provisions a Secret `artemis-llm-credentials`-style secret named `artemis-bulb-mcp-tenancy` in `artemis-mcp` namespace with `WORKSHOP_PARTICIPANT_LOGIN: <participant-login>`.
   - workshop-infrastructure provisions a ConfigMap `artemis-bulb-mcp-config` in `artemis-mcp` namespace with `LIGHT_MANAGER_URL: http://light-manager.<light-manager-ns>.svc.cluster.local:8000`.
   - workshop-infrastructure runs `kubectl apply -f mcp/manifests/`.
4. The MCP Pod boots, FastMCP exposes `list_bulbs` + `update_bulb` over Streamable HTTP at `http://artemis-bulb-mcp.artemis-mcp.svc.cluster.local:8080/mcp`.
5. kagent's reconciler picks up the new `RemoteMCPServer` CRD in the `kagent` namespace, probes the URL, discovers the two tools, and writes them into `status.discoveredTools`. Status flips to `Accepted=True`.
6. STORY-025's `artemis-mission-coordinator` Agent CRD references this `RemoteMCPServer` via `tools[].mcpServer.kind: RemoteMCPServer, name: artemis-bulb-mcp` and gains `list_bulbs` + `update_bulb` in its tool surface.

---

## Acceptance Criteria

(Mirrors sprint plan AC + the wording correction from *Sprint plan AC vs. actual kagent v0.9.0 CRD shape*.)

- [ ] **Dockerfile** is multi-stage (`builder` + production stage), based on `python:3.12-slim`, runs as a non-root user, exposes port 8080, has a HEALTHCHECK that actually probes `/mcp` over HTTP rather than just verifying the module imports. CMD launches the FastMCP server in HTTP transport mode bound to `0.0.0.0:8080`.
- [ ] **`mcp/manifests/00-namespace.yaml`** creates `Namespace artemis-mcp` per `docs/artemis-naming.md` L33 with labels `kagent-workshop/component: mcp`.
- [ ] **`mcp/manifests/10-deployment.yaml`** creates `Deployment artemis-bulb-mcp`:
  - 1 replica.
  - Image: `rg.fr-par.scw.cloud/apogasa/artemis-bulb-mcp:v0.1.0`.
  - Container port `8080` named `mcp`.
  - **`envFrom`**:
    - `secretRef: { name: artemis-bulb-mcp-tenancy }` — sources `WORKSHOP_PARTICIPANT_LOGIN`.
    - `configMapRef: { name: artemis-bulb-mcp-config }` — sources `LIGHT_MANAGER_URL`.
  - **No committed values** for either env var (NFR-011 — both Secret + ConfigMap are workshop-infrastructure's responsibility).
  - `MCP_TRANSPORT_MODE=http` set inline (so the same image works for stdio dev mode and HTTP container mode without overriding CMD).
  - Resources: requests 50m / 64Mi, limits 500m / 256Mi (NFR-002).
  - Readiness + liveness probes hit `GET /mcp/` (FastMCP's own endpoint, returns 405 for GET on streamable-http but reachable means Pod is alive). HTTP probe on port `mcp`.
- [ ] **`mcp/manifests/20-service.yaml`** creates `Service artemis-bulb-mcp` (ClusterIP), port 8080 → port-name `mcp`.
- [ ] **`mcp/manifests/30-remotemcpserver.yaml`** creates `RemoteMCPServer artemis-bulb-mcp` in the `kagent` namespace:
  - `apiVersion: kagent.dev/v1alpha2`.
  - `protocol: STREAMABLE_HTTP`.
  - `url: http://artemis-bulb-mcp.artemis-mcp.svc.cluster.local:8080/mcp`.
  - `description: Per-vCluster MCP wrapping light-manager bulbs API; tenancy-pinned to WORKSHOP_PARTICIPANT_LOGIN (NFR-012).`
  - Standard kagent timeouts (`timeout: 30s`, `sseReadTimeout: 5m0s`, `terminateOnClose: true`) — copied from the cluster's own `kagent-tool-server` example.
- [ ] **`make lint-manifests` clean** over `uc*/manifests/`, `infra/observability/`, **and now `mcp/manifests/`**. The walk is extended via the same pattern STORY-018 used for `infra/observability/`.
- [ ] **`make mcp-build` / `mcp-up` / `mcp-down` targets** in the root `Makefile`:
  - `mcp-build` builds the Docker image with the apogasa registry tag.
  - `mcp-up` applies `mcp/manifests/`; idempotent on repeat invocation.
  - `mcp-down` deletes `mcp/manifests/` with `--ignore-not-found`.
- [ ] **No committed secrets** — `gitleaks` clean (STORY-011's CI hook). The Deployment's `envFrom` references resources that don't exist in the repo.
- [ ] **Self-author cluster smoke validation** against the live `kagent-workshop` kind cluster:
  - [ ] `make mcp-build` produces a tagged image; `kind load docker-image …` loads it (the apogasa registry image isn't published yet, so we side-load for the smoke run — same pattern as STORY-019's `lunar-rover-telemetry:v1.0.0` validation).
  - [ ] Apply throwaway Secret + ConfigMap (`WORKSHOP_PARTICIPANT_LOGIN=operator-test`, `LIGHT_MANAGER_URL=http://light-manager.light-manager.svc:8000`).
  - [ ] `make mcp-up` applies all 3 namespace-scoped manifests + the kagent-namespace RemoteMCPServer cleanly.
  - [ ] Pod reaches `Ready 1/1` within 30 s.
  - [ ] `kubectl port-forward -n artemis-mcp svc/artemis-bulb-mcp 8080:8080` + a probe to `/mcp` returns a non-404 response (FastMCP's streamable-http endpoint accepts GET with `Accept: text/event-stream`; we accept any 2xx/3xx/4xx-but-not-5xx as proof the server is up).
  - [ ] `kubectl get remotemcpserver -n kagent artemis-bulb-mcp` reaches `Accepted=True` within 60 s; `status.discoveredTools` lists `list_bulbs` + `update_bulb`.
  - [ ] Tear down the throwaway Secret + ConfigMap; verify `make mcp-down` removes the four manifests cleanly (`--ignore-not-found`).

---

## Technical Notes

### Why the kmcp-generated Dockerfile needs a CMD/healthcheck adjustment

The kmcp-generated Dockerfile defaults to the **stdio** transport mode (`CMD ["python", "src/main.py"]`). That works for local dev (Cursor / Claude Desktop / `kmcp run local`) but is wrong for a Kubernetes Pod — kubelet wants a TCP-reachable process for readiness/liveness probes, and the kagent reconciler needs Streamable HTTP at `/mcp`.

Two paths to fix:

1. **Override at Pod time** via `args: ["--transport", "http", "--host", "0.0.0.0", "--port", "8080"]` in the Deployment. Pros: Dockerfile stays generic. Cons: every Deployment that uses this image has to know the override; future operators have to read both files to understand the runtime.
2. **Adjust the Dockerfile CMD** to default to HTTP + 0.0.0.0:8080. Pros: container deployment is self-explanatory; manifests don't need overrides. Cons: stdio mode now requires `docker run … python src/main.py` which is awkward, but stdio mode is local-dev-only and doesn't run from the container image.

**Decision: adjust the Dockerfile** (option 2). The container image is for production deployment; local dev runs `kmcp run local` against the source tree, not the container.

The healthcheck also needs adjusting — the kmcp-generated `python -c "import src.main"` only verifies module-loadability, not that the HTTP server is live. A `curl localhost:8080/mcp -I` would prove HTTP is up but `curl` isn't in `python:3.12-slim`. Going with `python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/mcp', timeout=2)"`. The endpoint returns a non-2xx for plain GET (FastMCP's streamable-http expects an SSE-shaped request), but that's *fine* for healthcheck purposes — what matters is the TCP+HTTP layer is up, not the application semantics. urllib raises on connection refused / timeout but on HTTP-level errors it returns the response, which is what we want for "the server is alive enough to return *something*".

### Why `MCP_TRANSPORT_MODE=http` env in addition to CMD

If the CMD already includes `--transport http`, the env var is redundant. But: future Deployments that override CMD (e.g. for debugging) will lose the transport flag. Setting `MCP_TRANSPORT_MODE=http` via Deployment env makes the HTTP mode survive a CMD override. main.py reads the env first (`os.getenv("MCP_TRANSPORT_MODE", args.transport)`) so env wins even if CMD says stdio.

Belt-and-braces. ~one extra line in the Deployment YAML.

### `envFrom` vs explicit `env`

The architecture (§Component 6) lists `WORKSHOP_PARTICIPANT_LOGIN` + `LIGHT_MANAGER_URL` as the two env vars the MCP needs. Two ways to wire them:

1. **Explicit `env`** with `valueFrom: secretKeyRef: { name: ..., key: ... }` per variable. Pros: explicit, exactly two env vars, no leakage. Cons: 8 lines of YAML per variable.
2. **`envFrom`** with `secretRef` + `configMapRef` blocks. Pros: 2 lines each; if workshop-infrastructure adds a third env var (e.g. log level, retry budget), it can extend the Secret/ConfigMap without editing the Deployment. Cons: ALL keys in the Secret/ConfigMap become env vars; if workshop-infrastructure accidentally puts an unrelated key in there, it leaks into the Pod's env.

**Decision: `envFrom`.** The Secret and ConfigMap are owned by workshop-infrastructure and named `artemis-bulb-mcp-tenancy` / `artemis-bulb-mcp-config` — both single-purpose names that signal "only put MCP-related keys here". The trade-off is acceptable, and the diff economy matters when the manifest is read by ops in a hurry.

The Deployment ships with comments naming the *expected* keys (`WORKSHOP_PARTICIPANT_LOGIN` + `LIGHT_MANAGER_URL`) so a reader knows what to put in the Secret/ConfigMap without leaving the file.

### Why the RemoteMCPServer lives in `kagent` namespace, not `artemis-mcp`

`RemoteMCPServer` is a kagent CRD; per `docs/artemis-naming.md` L57, all kagent Agent / Tool / ToolServer / etc. CRDs live in the `kagent` namespace (cluster-scope-discoverable: `kubectl get rmcps -A` / `-n kagent` reads cleanly). The MCP *workload* (Pod + Service) lives in `artemis-mcp` because it's a namespaced workload, not a kagent CRD.

Cross-namespace reachability is handled by full DNS in the URL (`http://artemis-bulb-mcp.artemis-mcp.svc.cluster.local:8080/mcp`). Works the same way kagent's own `kagent-tool-server` resolves to `kagent-tools.kagent:8084` — the URL says exactly where the Service is.

### What STORY-023 deliberately does **not** modify

- `mcp/src/`, `mcp/tests/`, `mcp/pyproject.toml`, `mcp/kmcp.yaml` — STORY-022.
- `uc1/`, `uc2/`, `uc3/`, `uc4/`, `infra/observability/`, `apps/`, `schemas/`, `docs/architecture-…md`, `docs/tour-content-conventions.md` — no impact.
- `docs/artemis-naming.md` — already lists `artemis-mcp` namespace + `artemis-bulb-mcp` Service. STORY-023 just consumes the naming.

---

## Dependencies

**Prerequisite stories:**
- STORY-022 (MCP source) — completed 2026-05-08; provides the `mcp/src/` + `mcp/kmcp.yaml` + `mcp/pyproject.toml` the Dockerfile builds against.
- STORY-018 (`infra/observability/`) — not a hard dep, but provides the `make lint-manifests` extension pattern STORY-023 mirrors for the new `mcp/manifests/` walk.
- STORY-006 (Artemis naming) — provides `artemis-mcp` namespace + `artemis-bulb-mcp` Service name.

**Not a dependency despite the sprint-plan AC mention:**
- STORY-003 (vendor kagent CRDs + `make lint-agents`) — sprint-plan AC says "make lint-manifests and make lint-agents clean", but STORY-003 was **skipped** in M1. The AC's intent ("the RemoteMCPServer manifest is well-formed") is satisfied by extending `make lint-manifests` to walk `mcp/manifests/` — `kubectl apply --dry-run=server` against the live cluster's installed CRDs is the same validation `lint-agents` would have done offline.

**External dependencies:**
- Docker (for `make mcp-build`).
- kind (for `kind load` during self-author smoke).
- kagent v0.9.0 demo profile installed on the cluster (provides the `kagent.dev/v1alpha2 RemoteMCPServer` CRD the manifest validates against).
- A throwaway Secret + ConfigMap during validation (created and deleted within the smoke run; not committed).

**Blocked stories:**
- STORY-025 (UC4 coordinator a2a Agent CRD) — depends on the `RemoteMCPServer artemis-bulb-mcp` this story ships.

---

## Definition of Done

- [ ] All AC ticked.
- [ ] Self-author smoke validation recorded under *Implementation Notes*.
- [ ] STORY-023 entry in `docs/sprint-status.yaml` updated with `status: completed`, `completion_date`, `actual_points`. Notes that **Sprint 3 reaches 25/25 committed points landed** before formal sprint start.
- [ ] PR opened against `main` (or merged directly).
- [ ] Merged to `main`.

---

## Story Points Breakdown

- **Dockerfile adjustment (CMD → HTTP, healthcheck → real probe):** 0.5 points. ~10 lines of Dockerfile.
- **Manifests (Namespace + Deployment + Service + RemoteMCPServer):** 1 point. Mostly mechanical.
- **Makefile (`mcp-build`, `mcp-up`, `mcp-down` + lint-manifests extension):** 0.5 points. Three new phony targets + one walk extension.
- **Self-author cluster smoke validation (build + kind-load + apply + Pod-Ready + port-forward probe + RemoteMCPServer ACCEPTED + cleanup):** 1 point. Same shape as STORY-018's smoke; multi-step but each step is a single command.
- **Total:** 3 points. Matches sprint-plan estimate.

**Rationale:** Lower than STORY-022 (5 pts) because the source is already shipped; this story is purely packaging. The risk surface is small — kmcp scaffolds the Dockerfile, kagent's RemoteMCPServer shape is documented from STORY-019's spike, the `envFrom` pattern is standard.

---

## Additional Notes

- **Why `kind load` instead of pushing to the registry.** The apogasa Scaleway registry requires credentials this dev environment doesn't have committed (NFR-011). Same pattern as STORY-019's `lunar-rover-telemetry:v1.0.0` validation — the user pushed the published image mid-flight in that case; for STORY-023 we side-load via `kind load` because there's no published image yet and STORY-023 is the *story* that produces the image.
- **Image tag `v0.1.0`.** Aligns with `pyproject.toml` `version = "0.1.0"`. Future versions bumped per PEP 440 / SemVer; the Deployment manifest is the single point of truth for the deployed tag.
- **Why no Probes against `/healthz`.** The MCP server doesn't expose a `/healthz` endpoint; FastMCP serves its protocol surface at `/mcp` only. Probing `/mcp` with a plain HTTP GET returns a non-2xx (FastMCP's streamable-http expects SSE-style request shape), but kubelet's HTTP probe treats anything in [200, 400) as healthy. So we either use a custom probe path (would require modifying FastMCP, out of scope) or accept a TCP-only probe (works; kubelet has `tcpSocket` probes). **Decision: TCP probes** — simpler, idempotent, no false positives or negatives. The healthcheck inside the container (HEALTHCHECK in the Dockerfile) does the same thing for image-level health.

---

## Progress Tracking

**Status History:**
- 2026-05-08: Created (Developer / Quentin, /bmad:dev-story).
- 2026-05-08: Started — second story of M3 on Quentin's original slate; closes Sprint 3 commitments.
- 2026-05-08: Implemented + cluster smoke validated end-to-end.

**Actual Effort:** 3 points (matched estimate).

### Implementation Notes (2026-05-08)

#### Files modified (1)
- `mcp/Dockerfile` — adjusted from kmcp scaffold:
  - Added a leading comment block explaining the two adjustments (CMD + HEALTHCHECK).
  - HEALTHCHECK now does `python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/mcp', timeout=2)"` (was: `python -c "import src.main"`). The new form proves the HTTP server is listening; the old form only proved the module imports cleanly.
  - ENV block extended with `MCP_TRANSPORT_MODE=http`, `HOST=0.0.0.0`, `PORT=8080` so a Pod that overrides CMD without re-passing transport args still gets HTTP mode.
  - CMD is now `["python", "src/main.py", "--transport", "http", "--host", "0.0.0.0", "--port", "8080"]` (was: `["python", "src/main.py"]` which defaulted to stdio).

#### Files added (4 manifests)
- `mcp/manifests/00-namespace.yaml` — `Namespace artemis-mcp` per `docs/artemis-naming.md` L33.
- `mcp/manifests/10-deployment.yaml` — single-replica `Deployment artemis-bulb-mcp` running `rg.fr-par.scw.cloud/apogasa/artemis-bulb-mcp:v0.1.0`. `envFrom` references `Secret artemis-bulb-mcp-tenancy` and `ConfigMap artemis-bulb-mcp-config`; both expected to be provisioned by `workshop-infrastructure` (not in this repo). Belt-and-braces inline `env` for `MCP_TRANSPORT_MODE`, `HOST`, `PORT`. Resources 50m/64Mi requests, 500m/256Mi limits. TCP probes on the `mcp` port (FastMCP `/mcp` returns 405 to plain GETs; httpGet probes wouldn't pass).
- `mcp/manifests/20-service.yaml` — ClusterIP, port 8080 → port-name `mcp`.
- `mcp/manifests/30-remotemcpserver.yaml` — `kagent.dev/v1alpha2 RemoteMCPServer` in the `kagent` namespace. Spec mirrors the cluster's own `kagent-tool-server`: `protocol: STREAMABLE_HTTP`, `timeout: 30s`, `sseReadTimeout: 5m0s`, `terminateOnClose: true`. URL: `http://artemis-bulb-mcp.artemis-mcp.svc.cluster.local:8080/mcp` (cross-namespace).

#### Files modified (1) — Makefile
- `MCP_DIR`, `MCP_NAMESPACE`, `MCP_IMAGE_REGISTRY`, `MCP_IMAGE_NAME`, `MCP_IMAGE_TAG`, `MCP_IMAGE` variables added.
- `.PHONY` extended with `mcp-build mcp-up mcp-down`.
- `help` target gained 3 new lines describing the mcp-* targets.
- `lint-manifests` extended with a third walk over `mcp/manifests/` (after `uc*/manifests/` + `infra/observability/`).
- Three new targets: `mcp-build` (`docker build`), `mcp-up` (`kubectl apply -f mcp/manifests/`), `mcp-down` (`kubectl delete -f --ignore-not-found`).

#### Files NOT modified (intentional)
- `mcp/src/`, `mcp/tests/`, `mcp/pyproject.toml`, `mcp/kmcp.yaml` — STORY-022.
- `uc1/`, `uc2/`, `uc3/`, `uc4/`, `infra/observability/`, `apps/`, `schemas/` — no impact.
- `docs/artemis-naming.md`, `docs/architecture-…md`, `docs/tour-content-conventions.md` — no impact.

#### Validation

`make lint-manifests` clean over `uc1/manifests/`, `uc2/manifests/`, `uc3/manifests/`, `infra/observability/`, **and `mcp/manifests/`** (4 resources dry-run-applied OK against the cluster's real CRD schemas). The walk extension catches the `RemoteMCPServer` CRD shape — substitutes for the missing `make lint-agents` target that STORY-003 (skipped in M1) was supposed to ship.

End-to-end cluster smoke (kind cluster `kind-kagent-workshop`, Kubernetes v1.31.0):

```text
$ make mcp-build
docker build -t rg.fr-par.scw.cloud/apogasa/artemis-bulb-mcp:v0.1.0 mcp/
…
Successfully tagged rg.fr-par.scw.cloud/apogasa/artemis-bulb-mcp:v0.1.0

$ kind load docker-image rg.fr-par.scw.cloud/apogasa/artemis-bulb-mcp:v0.1.0 \
    --name kagent-workshop
Image: "rg.fr-par.scw.cloud/apogasa/artemis-bulb-mcp:v0.1.0" loading…
# (loaded onto the kagent-workshop-control-plane node)

# Throwaway Secret + ConfigMap (workshop-infrastructure does this in production):
$ kubectl create secret generic artemis-bulb-mcp-tenancy \
    --from-literal=WORKSHOP_PARTICIPANT_LOGIN=operator-test \
    -n artemis-mcp
$ kubectl create configmap artemis-bulb-mcp-config \
    --from-literal=LIGHT_MANAGER_URL=http://light-manager.light-manager.svc.cluster.local:8000 \
    -n artemis-mcp

$ make mcp-up
namespace/artemis-mcp configured
deployment.apps/artemis-bulb-mcp created
service/artemis-bulb-mcp created
remotemcpserver.kagent.dev/artemis-bulb-mcp created

$ kubectl rollout status -n artemis-mcp deploy/artemis-bulb-mcp --timeout=90s
deployment "artemis-bulb-mcp" successfully rolled out   # 11s

$ kubectl logs -n artemis-mcp -l app=artemis-bulb-mcp | head -10
…
INFO     Starting MCP server 'mcp' with transport 'http' on http://0.0.0.0:8080/mcp
INFO:     Started server process [1]
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8080 (Press CTRL+C to quit)

# Direct MCP probe via port-forward — `initialize` JSON-RPC POST:
$ kubectl port-forward -n artemis-mcp svc/artemis-bulb-mcp 8080:8080 &
$ curl -s -X POST http://127.0.0.1:8080/mcp \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{
        "protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}'
event: message
data: {"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"2024-11-05",
       "capabilities":{"experimental":{},"prompts":{"listChanged":true},
                       "resources":{"subscribe":false,"listChanged":true},
                       "tools":{"listChanged":true},
                       "extensions":{"io.modelcontextprotocol/ui":{}}},
       "serverInfo":{"name":"mcp","version":"3.0.0"}}}

# RemoteMCPServer reconciliation:
$ kubectl get remotemcpserver -n kagent artemis-bulb-mcp
NAME               PROTOCOL          URL                                                              ACCEPTED
artemis-bulb-mcp   STREAMABLE_HTTP   http://artemis-bulb-mcp.artemis-mcp.svc.cluster.local:8080/mcp   True

$ kubectl get remotemcpserver -n kagent artemis-bulb-mcp -o jsonpath='{.status.discoveredTools}' | jq
[
  { "name": "list_bulbs",  "description": "List the 3 mission beacons of an Artemis operator…" },
  { "name": "update_bulb", "description": "Set one mission beacon's RGB colour…" }
]
```

The two tools' full docstrings (including the `WORKSHOP_PARTICIPANT_LOGIN` contract from STORY-022) flow through to kagent's `status.discoveredTools`. STORY-025's `artemis-mission-coordinator` Agent CRD will be able to reference this RemoteMCPServer the same way UC1's debugger references `kagent-tool-server`.

Cleanup:

```text
$ make mcp-down
namespace "artemis-mcp" deleted
deployment.apps "artemis-bulb-mcp" deleted from artemis-mcp namespace
service "artemis-bulb-mcp" deleted from artemis-mcp namespace
remotemcpserver.kagent.dev "artemis-bulb-mcp" deleted from kagent namespace
mcp-down: done.

$ kubectl get ns artemis-mcp
Error from server (NotFound): namespaces "artemis-mcp" not found
$ kubectl get remotemcpserver -n kagent artemis-bulb-mcp
Error from server (NotFound): remotemcpservers.kagent.dev "artemis-bulb-mcp" not found
```

Cluster left pristine.

#### Implementation finding (Sprint-3 retro candidate)

The first `RemoteMCPServer` reconcile after `make mcp-up` transiently lands `Accepted=False` due to a 7-second race between Pod creation (kubelet starts at 14:44:13) and FastMCP becoming ready to serve (14:44:20). The reconciler probed at 14:44:13, hit `connection refused`, and recorded the failure condition. ~60s later the reconciler retried automatically and accepted; my mid-flight annotation poke at 14:45:00 just sped that up.

For workshop-infrastructure deploy-time monitoring: an initial `Accepted=False` is *expected* on cold deploy and self-resolves within ~60s. workshop-infrastructure's deploy-step health check should either:
- Wait for `kubectl get rmcps -n kagent artemis-bulb-mcp -o jsonpath='{.status.conditions[?(@.type=="Accepted")].status}'` to return `True`, with a ~120s timeout; or
- Apply a `kubectl annotate --overwrite` poke immediately after `kubectl apply` to trigger an immediate re-reconcile (cuts the wait from ~60s to ~5s).

Worth a note in `mcp/README.md` so authors don't see the Accepted=False window as a bug. Out of scope here per the project's "don't design for hypothetical future requirements" default; flagging for Sprint-3 retro.

#### AC sign-off

- [x] Multi-stage `python:3.12-slim` Dockerfile with non-root user, port 8080 exposed, real HTTP healthcheck, HTTP transport CMD.
- [x] `mcp/manifests/00-namespace.yaml` creates `artemis-mcp` ns with the right labels.
- [x] `mcp/manifests/10-deployment.yaml` ships the right env-injection contract: `envFrom` Secret + ConfigMap, no committed values, MCP_TRANSPORT_MODE belt-and-braces, NFR-002-friendly resources, TCP probes.
- [x] `mcp/manifests/20-service.yaml` ClusterIP exposing port 8080.
- [x] `mcp/manifests/30-remotemcpserver.yaml` `kagent.dev/v1alpha2 RemoteMCPServer` in `kagent` ns with the documented spec shape.
- [x] `make lint-manifests` clean (extended walk).
- [x] `make mcp-build` / `mcp-up` / `mcp-down` targets present and working.
- [x] No committed secrets.
- [x] Cluster smoke: image build → kind-load → apply → Pod Ready → MCP `initialize` JSON-RPC works → RemoteMCPServer ACCEPTED → discoveredTools registered → mcp-down cleans up.

No deferred AC at story-completion time. `make lint-agents` (sprint-plan AC text) does not exist in this Makefile (STORY-003 was skipped in M1); the equivalent validation lands via the `make lint-manifests` extension that does server-side dry-run against the live cluster's CRD schemas. Acknowledged in the story doc *Out of scope* section.

### Next

- PR opened against `main` (or merged directly).
- **Sprint 3 closes at 25/25 committed points landed** before formal sprint open (2026-05-11).
- Clément's M3 plate is empty when he returns; he can pick up STORY-024 (UC4 multi-symptom manifests) or run the M5 dry-run (STORY-028) early to absorb the swap-chain deferrals.
- Sprint-3 retro candidate: the `Accepted=False` startup race for RemoteMCPServer should land in `mcp/README.md` so workshop-infrastructure ops doesn't read it as a bug.

---

**This story was created using BMAD Method v6 - Phase 4 (Implementation Planning).**
