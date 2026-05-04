# System Architecture: kagent-workshop-scenarios

**Date:** 2026-04-28
**Architect:** Quentin Rodic
**Version:** 1.0
**Project Type:** api
**Project Level:** 2
**Status:** Draft

---

## Document Overview

This document defines the system architecture for `kagent-workshop-scenarios` — a repository of pedagogical artefacts (broken FastAPI applications, kagent CRDs, tour JSON files, a custom MCP) that are consumed by the workshop's downstream CI/CD layer and run inside each participant's vCluster.

**Scope reminder.** The architecture stops at the artefacts this repo produces and the pieces that run inside a participant's vCluster slice. AKS, vCluster slicing, kubeconfig wiring, image registry, tour distribution, LLM provider co-tenancy, fleet sizing, HA, DR, and capacity planning all belong to `workshop-infrastructure` and are explicitly out of scope below. The runtime is treated as "any vanilla Kubernetes ≥ 1.28 cluster" (NFR-006).

**Related Documents:**
- Product Requirements Document: `docs/prd-kagent-workshop-scenarios-2026-04-27.md`
- Product Brief: `docs/product-brief-kagent-workshop-scenarios-2026-04-27.md`

---

## Executive Summary

`kagent-workshop-scenarios` is a convention-driven artefact monorepo. Four use-case folders (`uc1/` … `uc4/`) plus a small set of shared directories (`apps/`, `infra/`, `mcp/`, `schemas/`, `scripts/`, `docs/`) deliver, for every UC, a self-contained pedagogical package: a deliberately broken Kubernetes Deployment running a Python/FastAPI application, kagent `Agent` and `Tool` CRDs scoped to that diagnosis, a `tour.json` validated against the `workshop-tour` schema, and a per-UC README. UC4 additionally ships a custom MCP server (generated via KMCP Tools) that wraps the sibling `light-manager` API so the multi-agent coordinator can broadcast its global diagnosis by changing the participant's bulb colours.

The architecture's job is to make each broken state **deterministic** (NFR-003), each agent CRD **minimal but sufficient**, each tour **schema-conformant and self-contained** (FR-002, NFR-010), and the repo **collision-resistant for two parallel authors** (NFR-008). Everything else — provisioning, wiring, secrets, distribution — is `workshop-infrastructure`'s problem.

---

## Architectural Drivers

The five NFRs that shape this architecture (the rest are mechanical and addressed component-by-component):

1. **NFR-003 (Deterministic, race-free reproduction, 3/3 cold deploys).** Every broken state must be manifest-side: bad image tag, unsatisfiable scheduling constraint, leaking-on-startup memory app + low limit. No probe-flap, no timing race, no external dependency for the symptom itself. This drives the per-UC application design more than anything else.
2. **NFR-005 (kagent v0.9.0 pin).** All `Agent`, `Tool`, `ToolServer`, and `ModelConfig` CRDs target kagent v0.9.0 exactly; CRD schemas are vendored. No `:latest` anywhere kagent-related.
3. **NFR-010 (Self-contained tour steps).** Each tour step's `commands` and `fileEdits` run as-is in the participant's VS Code server with kubectl/kagent CLI on `PATH` and kubeconfig pre-wired. No "first set X" gotchas — the architecture forbids hidden state across steps.
4. **NFR-012 (Per-participant tenancy on the UC4 MCP).** The custom MCP must never let one participant's coordinator mutate another participant's bulbs. Architecture choice: deploy the MCP **per-vCluster** with the participant's login pinned at deploy time, and have the MCP reject calls whose `user=` does not match.
5. **NFR-008 (Per-UC ownership boundary, anti-collision).** Two authors, three weeks, one repo. The directory layout is the contract: `uc<N>/` belongs to exactly one developer; shared dirs (`apps/`, `infra/`, `schemas/`, `mcp/`, root `docs/`) require both-developer review via `CODEOWNERS`.

NFR-001 (≤ 60 s time-to-symptom), NFR-002 (footprint), NFR-004 (idempotent re-apply), NFR-006 (vanilla K8s ≥ 1.28), NFR-009 (English copy), and NFR-011 (no secrets) are baseline hygiene; their architectural impact is per-component and is documented in the NFR coverage section below.

---

## System Overview

### High-Level Architecture

`kagent-workshop-scenarios` ships **build-time artefacts**; their runtime composition happens inside each participant's vCluster, orchestrated by `workshop-infrastructure`.

The architecture has three planes:

1. **Repo plane (this project).** Source code (FastAPI apps), Kubernetes manifests, kagent CRDs, `tour.json` files, the custom MCP source, schemas, and author-only scripts. Validated locally via `make`/CI hooks.
2. **Build & distribution plane (out of scope, `workshop-infrastructure`).** Builds container images from `apps/` and `mcp/`, publishes them to a registry, copies `tour.json` files into each participant's VS Code server, and applies the appropriate manifests/CRDs onto each vCluster.
3. **Runtime plane (a participant's vCluster).** The broken Deployment(s), kagent control plane (v0.9.0), the agent topology for the active UC, the UC3 Prom+Graf bundle (UC3/UC4 only), and the per-vCluster MCP pod (UC4 only).

The repo plane is where this architecture document operates.

### Architecture Diagram

```
┌─────────────────────────── this repo (kagent-workshop-scenarios) ──────────────────────────┐
│                                                                                            │
│  schemas/             apps/                       uc1/  uc2/  uc3/  uc4/      infra/   mcp/│
│  (tour schema         (FastAPI variants:          (manifests +                (UC3     (UC4│
│   vendored)            mission-control,            kagent CRDs +               Prom+    KMCP│
│                        lunar-rover-telemetry,      tour.json +                 Graf)   MCP) │
│                        _skeleton)                  README per UC)                            │
└──────────────────┬─────────────────────────────────────────────────────────┬───────────────┘
                   │ author validates locally on kind (FR-004)                │
                   │ workshop-infrastructure builds + publishes               │
                   ▼                                                          ▼
       ┌──────────────────────────────── per-participant vCluster ───────────────────────────┐
       │                                                                                     │
       │   broken-state Deployment(s)        kagent (v0.9.0)         Prom + Grafana          │
       │   (FastAPI app, low limits,         ├ Agent CRDs            (UC3/UC4 only;          │
       │    bad image tag, taint mismatch,   ├ Tool / ToolServer       infra/observability/) │
       │    or leak endpoint)                ├ ModelConfig                                   │
       │                                                                                     │
       │                                          UC4 only ─────► custom MCP pod             │
       │                                                          (mcp-proxy + KMCP server,  │
       │                                                           pinned WORKSHOP_LOGIN)    │
       │                                                                  │                  │
       └──────────────────────────────────────────────────────────────────┼──────────────────┘
                                                                          │ HTTP
                                                                          ▼
                                                          shared light-manager service
                                                          (sibling project, out of scope)
```

### Architectural Pattern

**Pattern:** Convention-driven artefact monorepo with a per-UC scenario-package sub-pattern.

**Rationale:** The deliverable is not a service, it is a set of artefacts. The pattern that protects two parallel authors on a 3-week timeline is **boundary by directory + shared conventions in the root**. Each UC is a near-self-contained unit (one Deployment, one set of CRDs, one tour, one README) so a single developer can own it end-to-end without stepping on the other. Cross-cutting concerns — FastAPI skeleton, tour schema, Artemis naming — live in shared dirs with both-developer review.

There is no microservices-vs-monolith decision here: there is no "service" we deploy. The only first-party long-lived process this repo produces is the UC4 MCP, and it is deliberately a single small pod.

---

## Technology Stack

### Application Layer (broken-state apps)

**Choice:** Python 3.12 + FastAPI ≥ 0.115 + uvicorn (ASGI). UC3 variant additionally instrumented with `prometheus-fastapi-instrumentator` for `/metrics`.

**Rationale:** PRD constraint (FR-007). Python is fast to write the four small variants; FastAPI gives `/healthz` and OpenAPI docs trivially; the instrumentator wires Prometheus scraping with one line. All four UC apps fit comfortably in a slim multi-stage Docker image (≤ 200 MB compressed, x86-64 — the only mandatory architecture for the workshop runtime).

**Trade-off:** A renamed public image would have been faster (zero source code) but is forbidden by FR-007 — and rightly so, because UC3's leak endpoint is bespoke and UC1/UC2 benefit from shared baseline behaviour (`/healthz`, Artemis identity).

### Agent Layer

**Choice:** kagent v0.9.0 — `Agent`, `Tool`, `ToolServer`, and `ModelConfig` CRDs.

**Rationale:** PRD constraint (NFR-005). v0.9.0 is the line we pin; CRD schemas are vendored under `schemas/kagent/` alongside the tour schema. No `:latest` references anywhere kagent-related (NFR-005 AC).

**Trade-off:** A floating-tag install would track upstream improvements but would also surface every breaking change. Pinning is non-negotiable for a one-shot workshop.

### Multi-Agent / MCP Layer (UC4)

**Choice:** KMCP Tools to generate the custom MCP server source under `mcp/`. The MCP wraps two `light-manager` endpoints and is packaged as a small container. Transport: HTTP/SSE (the standard kagent-reachable MCP shape in v0.9.0). The MCP is deployed **per-vCluster** with `WORKSHOP_PARTICIPANT_LOGIN` injected as env at deploy time by `workshop-infrastructure`.

**Rationale:** PRD constraint (FR-016). KMCP Tools keeps the source declarative and idiomatic for the kagent ecosystem. Per-vCluster deployment is the cheapest way to honour NFR-012 (per-participant tenancy): cross-participant bleed becomes impossible by topology, not by prompt discipline.

**Trade-off:** A single shared MCP would scale better (one pod, N vClusters) but would require the agent prompt to always pass the correct `user=` and would carry a soft tenancy guarantee. Per-vCluster MCP costs ~50 Mi of RAM per slice and gives a hard guarantee.

### Observability Layer (UC3)

**Choice:** Vanilla upstream Prometheus + Grafana via plain manifests under `infra/observability/`. Scrape config targets the UC3 app's `/metrics` endpoint by Service label. No operators (`kube-prometheus-stack`, `prometheus-operator`) — keeps NFR-006 portability and keeps the participant's `kubectl get all` output legible.

**Rationale:** PRD scope ("install Prometheus/Grafana minimal pour UC3, manifest fourni dans le repo, simplicité d'usage prioritaire" — Brief). The agent uses kagent's pre-packaged Prometheus and Grafana agents (per FR-012 AC) which expect a reachable Prom HTTP API and a Grafana admin endpoint — both of which the plain manifests provide.

**Trade-off:** Helm/operator install would be production-shaped but adds tooling the participant has to learn just to follow the tour. Plain manifests win on pedagogical clarity at the cost of "this is not how you'd do it in prod" — and that disclaimer is explicit in `uc3/README.md`.

### Author Local Dev Loop (FR-004)

**Choice:** kind cluster + a per-UC `make uc<N>-up` / `make uc<N>-down` target + `scripts/preflight.sh`. Authors only — no participant-facing local workflow.

**Rationale:** Authors need a fast loop that does not depend on AKS access. kind + kagent v0.9.0 is the cheapest reproduction of the runtime modulo vCluster-specific quirks (none expected since manifests are vanilla K8s).

### LLM Provider

**Choice:** Defer to `workshop-infrastructure`. The repo ships a `ModelConfig` CRD per UC (or one shared) parameterised by env-injected provider URL and credentials — no provider name is hard-coded. The agent CRDs reference the `ModelConfig` by name only. Picking the actual provider (Azure OpenAI, Anthropic API, Ollama on-cluster fallback, etc.) is a runtime decision made at deploy time.

**Rationale:** PRD declares LLM provider an architecture-phase open question — but provider tenancy and credential flow are runtime concerns, not artefact concerns. The cleanest scoped answer is "the artefact treats the provider as a parameter".

### Development & CI Hooks (in-repo)

- `make validate-tours` — JSON-schema validate every `uc<N>/tour.json` against the vendored `schemas/workshop-tour.schema.json`.
- `make lint-manifests` — `kubectl apply --dry-run=client -f uc<N>/manifests/` on every UC (NFR-006 AC).
- `gitleaks` (or equivalent) on every PR (NFR-011 AC).
- `CODEOWNERS` enforcing the per-UC ownership boundary (NFR-008 AC).

GitHub Actions or equivalent runs these as PR gates; the actual CI provider is a `workshop-infrastructure` decision but the hooks themselves are repo-local Make targets so authors can run them on a laptop.

---

## System Components

### Component 1: Shared FastAPI app skeleton + variants (`apps/`)

**Purpose:** Provide a small set of FastAPI applications that the four UCs deploy. UC1 and UC2 reuse a single baseline; UC3 has a dedicated leak variant; UC4 reuses all three by image reference.

**Layout:**

```
apps/
├── _skeleton/                    # reference template authors fork from
│   ├── main.py                   # /healthz, FastAPI app, Artemis-themed identity placeholder
│   ├── Dockerfile                # python:3.12-slim, multi-stage, ≤ 200 MB
│   ├── pyproject.toml
│   └── README.md                 # "copy this dir to start a new app"
├── mission-control/              # baseline; used by UC1 (bad tag) and UC2 (bad scheduling)
│   ├── main.py                   # /healthz only — no business logic, just enough to "run"
│   └── (Dockerfile, pyproject.toml from skeleton)
├── lunar-rover-telemetry/        # UC3 variant: deterministic memory leak + /metrics
│   ├── main.py                   # /healthz, /metrics, /leak (appends to module-global list)
│   └── (Dockerfile, pyproject.toml from skeleton)
└── README.md                     # UC ↔ app-variant mapping; build/publish flow
```

**Responsibilities:**
- Boot fast (FastAPI + uvicorn, no DB, no migrations).
- Expose `/healthz` returning `{"status": "ok", "identity": "<artemis-name>"}`.
- For `lunar-rover-telemetry`: expose `/metrics` (Prom text format) and `/leak` (POST that appends ~1 MiB to a module-level list per call) so memory growth is participant-triggerable but happens fast enough to OOM under a 64 MiB container limit within 60 s of triggering.

**Interfaces:** HTTP, port 8000. K8s Service per UC binds to that port.

**FRs Addressed:** FR-007.

**Image-build hand-off:** `apps/README.md` documents `apps/<name>/` ↔ image-tag mapping; the actual `docker build` is triggered by `workshop-infrastructure` from this repo's source.

---

### Component 2: Per-UC scenario package (`uc1/`, `uc2/`, `uc3/`, `uc4/`)

**Purpose:** One self-contained unit per pedagogical scenario. Owned by exactly one developer (NFR-008).

**Per-UC layout:**

```
uc<N>/
├── manifests/                    # broken-state K8s resources
│   ├── namespace.yaml            # artemis-themed namespace
│   ├── deployment.yaml           # references apps/<variant> image
│   ├── service.yaml              # ClusterIP, port 8000
│   └── (UC2 only) constraints.yaml  # NetworkPolicy / nodeSelector / taints toleration tweaks
├── agents/                       # kagent CRDs scoped to this UC
│   ├── agent.yaml                # Agent CRD (refs Tool + ModelConfig)
│   ├── tools.yaml                # Tool CRD(s) — minimal set
│   └── modelconfig.yaml          # ModelConfig CRD (provider parameterised at deploy time)
├── tour.json                     # validates against schemas/workshop-tour.schema.json
└── README.md                     # bug, expected diagnosis, Artemis narrative
```

**Responsibilities (component-level):** Make the broken state observable within 60 s of `kubectl apply` (NFR-001), reproduce on 3/3 cold deploys (NFR-003), and be re-appliable without error (NFR-004).

**FRs Addressed:** FR-001, FR-008/9 (UC1), FR-010/11 (UC2), FR-012/13 (UC3), FR-014/15 (UC4).

The four UC packages are detailed below.

---

### Component 3: UC1 — ImagePullBackOff

**Application:** `apps/mission-control` baseline (just `/healthz`).

**Broken state:** Deployment manifest references `mission-control:v999` (an unpublished tag); only `:v1` is published. Kubelet pulls, fails, retries, ends in `ImagePullBackOff`.

**Why deterministic:** The symptom is reached without the pod ever starting — there is no race condition possible. Deterministic across kind, vCluster, vanilla K8s.

**Agent topology:** A single `Agent` CRD `artemis-mission-control-debugger` referencing one `Tool` CRD with the smallest set of K8s tools sufficient to read the symptom — `kubectl get pod`, `kubectl describe pod`, `kubectl get events`. No write tools, no namespace-spanning tools.

**Tour beats** (per FR-006 convention):
1. CLI baseline: `kubectl get pods -n <ns>`, `kubectl describe pod`, `kubectl get events`.
2. "Now ask the agent": one-shot agent invocation via the kagent CLI.
3. Recap: agent surfaced the unpublished-tag root cause in one synthesis instead of three commands and a manual events-correlation step.

**FRs Addressed:** FR-008, FR-009.

---

### Component 4: UC2 — Pod Pending / scheduling

**Application:** `apps/mission-control` (same image as UC1 — only the manifest differs, per FR-010 AC).

**Broken state choice:** **Taint mismatch** preferred over impossible resource requests or `nodeSelector` mismatch. Rationale: a synthetic taint on the only node + a pod that does not tolerate it produces a `0/1 nodes are available: untolerated taint` event whose root cause needs `describe node` to surface — **multi-resource correlation** is exactly the pedagogical point of UC2 (vs UC1's single-resource diagnosis). Resource-request impossibility is rejected because it scales with cluster size and can drift between kind and vCluster; taint mismatch is invariant.

The taint is applied by a small bootstrap `Job` in the UC2 manifests rather than assumed pre-existing on the node — this keeps the UC self-contained and re-applyable (NFR-004).

**Agent topology:** One `Agent` CRD with a `Tool` CRD wiring four read tools: `kubectl get/describe pod`, `kubectl get/describe node`, `kubectl get events`. Multi-tool reach, single agent (UC2 is still single-agent — the multi-agent climax is UC4).

**Tour beats:** CLI baseline includes ≥ 3 distinct kubectl commands (per FR-011 AC) so the manual correlation friction is visible before the agent shortcut.

**FRs Addressed:** FR-010, FR-011.

---

### Component 5: UC3 — OOMKilled + observability

**Application:** `apps/lunar-rover-telemetry`. Specifically:

```python
# apps/lunar-rover-telemetry/main.py (sketch)
LEAK = []  # module-global; survives requests

@app.post("/leak")
def leak():
    LEAK.append(b"\x00" * (1024 * 1024))  # 1 MiB per call
    return {"size_mb": len(LEAK)}

@app.get("/healthz")
def healthz(): return {"status": "ok"}

# /metrics is auto-wired by prometheus-fastapi-instrumentator
```

**Broken state:** Deployment with `resources.limits.memory: 64Mi`. The tour's CLI baseline step posts to `/leak` ~70 times via `curl` in a loop; the kernel OOM-kills the container before the loop completes, kubelet restarts the pod, and the CrashLoopBackOff with `OOMKilled` reason becomes visible in `describe pod` and in events. Memory growth shows in Prometheus thanks to the instrumentator's process-RSS metric.

**Why deterministic:** The leak is participant-triggered, not background. There is no race because the agent's analysis only starts after the participant runs the leak loop. The 1 MiB-per-call granularity gives a clear monotone curve in Grafana.

**Manifests under `infra/observability/`:**

```
infra/observability/
├── prometheus/
│   ├── deployment.yaml           # single-replica Prometheus, 256Mi RAM
│   ├── service.yaml              # ClusterIP :9090
│   └── configmap-scrape.yaml     # scrapes Services labeled monitoring=prom
├── grafana/
│   ├── deployment.yaml           # single-replica Grafana, anonymous-admin
│   ├── service.yaml              # ClusterIP :3000
│   └── configmap-datasource.yaml # Prom data source pre-wired
└── kustomization.yaml
```

The UC3 `Service` carries `monitoring=prom` so Prometheus auto-scrapes it without per-UC config edits.

**Agent topology:** kagent's **pre-packaged** Prometheus and Grafana agents (per FR-012 AC — "no reinvention" constraint from the brief). The UC3 `Agent` CRD wires both as a sub-agent ensemble plus a K8s read tool for `describe pod` and events. The on-the-fly Grafana dashboard is created by the agent's native dashboard-creation capability — the tour's final step captures and surfaces the dashboard URL the agent returns.

**FRs Addressed:** FR-012, FR-013.

---

### Component 6: UC4 — Multi-agent coordinator + custom MCP

**Application:** **No new app source.** UC4 references `mission-control:v999` (UC1-style ImagePullBackOff Deployment), `mission-control:v1` with the UC2 taint-mismatch overlay (UC2-style Pending Deployment), and `lunar-rover-telemetry:v1` with low memory limit (UC3-style OOMKilled Deployment) — all running side-by-side in a single namespace.

**Broken state:** All three symptoms reproduce simultaneously within 60 s of `kubectl apply -f uc4/manifests/`. The OOMKilled symptom reuses UC3's "participant triggers `/leak`" mechanism — keeps NFR-003 deterministic.

**Agent topology:**

```
artemis-mission-coordinator (Agent, a2a-capable)
├── delegates → uc1-imagepull-debugger     (Agent reused from uc1/agents/)
├── delegates → uc2-pending-debugger       (Agent reused from uc2/agents/)
├── delegates → uc3-oom-debugger           (Agent reused from uc3/agents/, includes Prom/Graf sub-agents)
└── tools     → bulb-mcp (ToolServer pointing at the per-vCluster MCP pod)
```

The coordinator's prompt encodes:
- Slot 1 → UC1 verdict, Slot 2 → UC2 verdict, Slot 3 → UC3 verdict (FR-017 mapping).
- Verdict → colour: green `(0,255,0)` if healthy, red `(255,0,0)` if active anomaly, amber `(255,191,0)` if inconclusive (FR-017 colour code).
- Always pass `user="${WORKSHOP_PARTICIPANT_LOGIN}"` (interpolated by `workshop-infrastructure` at deploy time) on every MCP call.

**Custom MCP (`mcp/`):**

```
mcp/
├── server.py                     # KMCP-Tools-generated; wraps light-manager OpenAPI
├── kmcp.yaml                     # KMCP Tools config (declarative wiring)
├── Dockerfile                    # python:3.12-slim
├── manifests/
│   ├── deployment.yaml           # per-vCluster MCP pod; env: WORKSHOP_PARTICIPANT_LOGIN, LIGHT_MANAGER_URL
│   ├── service.yaml              # ClusterIP, exposes MCP HTTP/SSE endpoint
│   └── toolserver.yaml           # kagent ToolServer CRD pointing at the Service
└── README.md
```

**MCP tool surface (per FR-016 AC):**

```
list_bulbs(user: str)
  → GET <LIGHT_MANAGER_URL>/api/bulbs?user=<user>
  → returns list[BulbRead]   # {slot, r, g, b, updated_at}

update_bulb(user: str, slot: int, r: int, g: int, b: int)
  → PUT <LIGHT_MANAGER_URL>/api/bulbs/<slot>?user=<user>
     body: {"r": r, "g": g, "b": b}
  → returns BulbRead
```

**Tenancy guard (NFR-012):** The MCP refuses every call where `user != $WORKSHOP_PARTICIPANT_LOGIN` and returns an MCP error. No hard-coded `user=` value (FR-016 AC). No way for a misprompted coordinator in vCluster A to mutate participant B's bulbs because the MCP in vCluster A does not know B's login and would reject the call anyway.

**FRs Addressed:** FR-014, FR-015, FR-016, FR-017.

---

### Component 7: Shared schemas (`schemas/`)

**Purpose:** Vendoring point for external schemas this repo must validate against.

**Contents:**
- `schemas/workshop-tour.schema.json` — copied verbatim from the `workshop-tour` extension repo (`/home/qrodic/workspace/intern/DevOpsDays/2026/workshop-vscode-ext/workshop-tour/.workshop-tour/tour.schema.json`), pinned to a known version recorded in `schemas/README.md`.
- `schemas/kagent/` — vendored kagent v0.9.0 CRD definitions (or the upstream Helm chart pin) used by `make lint-agents` to dry-run-validate the `Agent`/`Tool`/`ToolServer`/`ModelConfig` YAMLs.

**FRs Addressed:** FR-002 (AC: schema vendored and pinned).

---

### Component 8: Author dev loop (`scripts/`, root `Makefile`, kind config)

**Purpose:** Let Clément and Quentin exercise any UC end-to-end on a laptop (FR-004) without AKS access.

**Contents:**
- `scripts/preflight.sh` — checks Docker / kubectl / kind / kagent CRDs presence, exits non-zero with actionable messages.
- `scripts/kind-config.yaml` — single-node kind config sufficient for any single UC.
- Root `Makefile` targets:
  - `make uc<N>-up` — spin kind, install kagent v0.9.0, apply UC<N>.
  - `make uc<N>-down` — tear down.
  - `make validate-tours` — JSON-schema validation across every UC.
  - `make lint-manifests` — `kubectl apply --dry-run=client` across every UC.

**FRs Addressed:** FR-004.

---

### Component 9: Root documentation (`README.md`, `docs/`)

**Purpose:** The reader's entry point — covers prerequisites, kagent install reference, UC ordering, Artemis lore arc, tour distribution (informational only), and a clearly-marked author-only section for the local dev loop.

**FRs Addressed:** FR-003, FR-005 (Artemis lore index lives here).

---

## Data Architecture

### Tour JSON schema (vendored, draft-07)

The contract is owned by the `workshop-tour` extension. Authoring rules in this repo:

- Each `tour.json` has a unique stable `id` (e.g. `kagent-uc1-imagepullbackoff`, `kagent-uc4-coordinator`).
- A `title` and ordered `steps[]`.
- Each step has `title` and `explanation` (Markdown) and optionally `commands[]` (`{label, command}`) and/or `fileEdits[]` (`{type: "create" | "patch", path, ...}`).
- No additional properties — `additionalProperties: false` is set everywhere in the schema.

The FR-006 tour content convention layers on top: every tour has a CLI-baseline opening, a "Now ask the agent" transition, and a "What did the agent do better?" closing recap.

### kagent CRD shapes (v0.9.0)

Per UC under `uc<N>/agents/`:

- `Agent` — the diagnostic personality, system prompt, ModelConfig ref, and Tool/ToolServer refs. Coordinator (UC4) additionally references sub-Agents for a2a delegation.
- `Tool` — kubectl-shaped read tools, scoped to the smallest set sufficient. UC1: pod + events. UC2: pod + node + events. UC3: pod + events + Prom + Grafana sub-agents. UC4: union of all three plus the MCP `ToolServer`.
- `ToolServer` — points at the per-vCluster custom MCP Service (UC4 only). Wraps the MCP's HTTP/SSE endpoint so kagent treats it as a tool source.
- `ModelConfig` — provider URL and credential refs externalised via env injection (no provider name hard-coded in the YAML).

Schemas vendored under `schemas/kagent/` for offline lint.

### light-manager I/O shapes (consumed read-only)

From the live `light-manager` source:

```
BulbRead   = { slot: int, r: int, g: int, b: int, updated_at: datetime }
BulbUpdate = { r: int 0..255, g: int 0..255, b: int 0..255 }
```

Endpoints:
- `GET  /api/bulbs?user=<login>`           → `list[BulbRead]`
- `PUT  /api/bulbs/<slot>?user=<login>`    → `BulbRead`

The MCP's two tools (`list_bulbs`, `update_bulb`) shadow these shapes 1:1 (per FR-016 AC).

### FR-017 colour convention

| Slot | Sub-agent | Verdict semantic                  | Colour       | RGB              |
|------|-----------|-----------------------------------|--------------|------------------|
| 1    | UC1       | symptom present / absent          | red / green  | (255,0,0) / (0,255,0) |
| 2    | UC2       | symptom present / absent          | red / green  | (255,0,0) / (0,255,0) |
| 3    | UC3       | symptom present / absent          | red / green  | (255,0,0) / (0,255,0) |
| any  | any       | inconclusive / partial finding    | amber        | (255,191,0)      |

Documented in `uc4/README.md` and encoded in the coordinator agent's instructions.

### Data flow (UC4, the densest case)

```
participant clicks "Ask the coordinator" in tour.json (UC4)
  → kagent CLI invokes artemis-mission-coordinator Agent
    → coordinator fans out a2a → uc1-debugger, uc2-debugger, uc3-debugger
      → each sub-agent runs its kubectl/Prom/Graf tools on the multi-symptom cluster
      → each returns a verdict (present / absent / inconclusive)
    → coordinator maps verdicts to (slot, RGB) per FR-017
    → coordinator calls bulb-mcp.update_bulb(user=$LOGIN, slot=N, r,g,b) ×3
      → MCP validates user == $WORKSHOP_PARTICIPANT_LOGIN
      → MCP forwards PUT /api/bulbs/<slot>?user=<login> to light-manager
    → coordinator returns consolidated diagnosis to participant
participant sees the bulbs change colour → tour final step
```

---

## API Design

### Repo as artefact API

The repo's "external API" is the set of artefacts that `workshop-infrastructure` consumes:

| Path                          | Consumer                | Contract                                   |
|-------------------------------|-------------------------|--------------------------------------------|
| `apps/<variant>/`             | image build pipeline    | source + Dockerfile, image-tag mapping in `apps/README.md` |
| `uc<N>/manifests/`            | manifest apply step     | vanilla K8s ≥ 1.28 manifests, `kubectl apply -f` clean |
| `uc<N>/agents/`               | manifest apply step     | kagent v0.9.0 CRDs, applied after kagent control plane is ready |
| `uc<N>/tour.json`             | tour distribution step  | conforms to `schemas/workshop-tour.schema.json` |
| `infra/observability/`        | UC3/UC4 vClusters       | applied before UC3/UC4 manifests           |
| `mcp/manifests/`              | UC4 vClusters           | applied with `WORKSHOP_PARTICIPANT_LOGIN` env interpolated |

Hand-off contract: `workshop-infrastructure` reads these paths verbatim. Renaming a UC folder is a breaking change to that consumer and is gated by both-developer review (NFR-008).

### MCP tool surface (UC4)

The only first-party API this repo defines at runtime, exposed by the MCP pod over MCP HTTP/SSE on the vCluster's internal network:

```
list_bulbs(user: str) → list[BulbRead]
update_bulb(user: str, slot: int, r: int, g: int, b: int) → BulbRead
```

Authentication: none on the MCP itself — tenancy is enforced by env-pinned `WORKSHOP_PARTICIPANT_LOGIN` validation. light-manager itself is reached over plain HTTP from inside the cluster (`light-manager.<ns>.svc.cluster.local`); any auth on light-manager is `workshop-infrastructure`'s problem.

---

## Non-Functional Requirements Coverage

### NFR-001: Time-to-symptom on cold deploy

**Requirement:** Diagnostic symptom observable within 60 s of `kubectl apply` on stock kind / participant vCluster.

**Architecture solution:** Each UC's broken state is **manifest-side, no startup race**. UC1: image pull fails before container start. UC2: scheduling fails before pod creation completes. UC3: pod runs, but OOM is participant-triggered via `/leak` so the 60 s clock starts when the participant hits the leak loop, not when the manifest is applied. UC4: union of all three (and UC3's clock starts when the participant runs the UC4 multi-symptom leak step).

**Validation:** Manual stopwatch during dev (per NFR-001 AC).

---

### NFR-002: Per-UC footprint inside a vCluster slice

**Requirement:** Single UC fits in 2 vCPU / 4 GiB; UC4 fits in 4 vCPU / 8 GiB.

**Architecture solution:** All apps are tiny FastAPI single-replica Deployments (~64 Mi each). UC3 adds Prom (~256 Mi) + Grafana (~256 Mi) single-replica. UC4 adds the MCP (~64 Mi) plus the UC1/UC2/UC3 Deployments (~200 Mi total) on top of UC3's Prom+Graf. Aggregate UC4 ≈ 1 GiB plus kagent runtime — well under the 8 GiB budget.

**Validation:** `kubectl top` on a deployed UC during the M5 dry-run (per NFR-002 AC). Vendor-neutral pod resource requests/limits set in every manifest so the headroom claim is enforced.

---

### NFR-003: Deterministic, race-free reproduction

**Requirement:** 3/3 cold deploys reproduce the broken state.

**Architecture solution:** Symptom is structural (bad tag, bad scheduling) or participant-triggered (the leak endpoint). No timing-dependent failure mode anywhere. UC2's taint is applied by an in-manifest bootstrap Job, not assumed pre-existing — so the manifest stands alone.

**Validation:** Each UC has a documented reproduction checklist run 3× by the UC owner and once cross-tested by the other developer before M5 (per NFR-003 AC).

---

### NFR-004: Idempotent re-apply

**Requirement:** Re-applying a UC's manifests on a cluster where they already exist completes without error.

**Architecture solution:** Stateless manifests (Deployments, Services, kagent CRDs); no `Job` outside UC2's bootstrap (which is idempotent because it's `kubectl taint --overwrite`). No `generateName` resources. No PVCs (the apps are stateless; light-manager owns its own state out-of-cluster).

**Validation:** `kubectl apply -f uc<N>/manifests/` run twice in `make lint-manifests` CI.

---

### NFR-005: kagent v0.9.0 pin

**Requirement:** All kagent CRDs target v0.9.0 exactly; no `:latest`; CRD schemas vendored.

**Architecture solution:** `schemas/kagent/` vendors the v0.9.0 CRD bundle. Every `Agent`/`Tool`/`ToolServer`/`ModelConfig` YAML uses the exact `apiVersion` strings from that bundle. Root README's "Install kagent" section pins v0.9.0. `make lint-agents` validates apiVersion strings across all `uc<N>/agents/` against the vendored bundle.

**Validation:** Schema lint in CI; manual grep for `:latest` in CI.

---

### NFR-006: Vanilla Kubernetes ≥ 1.28

**Requirement:** No provider-specific resources.

**Architecture solution:** No `LoadBalancer` services (everything ClusterIP, the tour reaches services via `kubectl port-forward`); no cloud CSI, no managed-DB; no `ingress.<provider>` annotations. All Services use `clusterIP: None` or `ClusterIP`. UC3 Prom+Graf use `emptyDir` (the workshop is ephemeral, no metrics retention needed across pod restarts).

**Validation:** `kubectl apply --dry-run=client` succeeds on a vanilla 1.28 cluster (run via `make lint-manifests`).

---

### NFR-008: Per-UC ownership boundary (anti-collision)

**Requirement:** Files under `uc<N>/` owned by exactly one developer; shared dirs require both-developer review.

**Architecture solution:** `CODEOWNERS` at repo root:

```
/uc1/   @clement-raussin
/uc2/   @qrodic
/uc3/   @clement-raussin
/uc4/   @clement-raussin @qrodic
/apps/  @clement-raussin @qrodic
/infra/ @clement-raussin @qrodic
/mcp/   @clement-raussin @qrodic
/schemas/ @clement-raussin @qrodic
/docs/  @clement-raussin @qrodic
```

(Sample assignment — final mapping per the brief's "1 UC par dev" recommendation; the actual UC-to-owner mapping is locked in sprint planning.)

**Validation:** GitHub's `CODEOWNERS` enforcement on every PR.

---

### NFR-009: English copy

**Requirement:** All tour text and per-UC READMEs in English.

**Architecture solution:** No translation pipeline; English is the only language committed. Spot-check is part of PR review.

**Validation:** Manual review; optional `aspell` lint hook.

---

### NFR-010: Self-contained tour steps

**Requirement:** Every step's `commands` and `fileEdits` run as-is in the participant's VS Code server.

**Architecture solution:** No tour step references "edit X first" or "set env var Y" without doing it in-step via `fileEdits` or `commands`. Convention enforced by per-UC author review and called out in `docs/tour-content-conventions.md`. The kubeconfig and PATH are pre-wired by `workshop-infrastructure` and explicitly documented as preconditions in the root README's "Tour distribution (informational)" section.

**Validation:** Manual walkthrough per UC; the M5 dry-run is the final gate.

---

### NFR-011: No secrets in repo

**Requirement:** No keys, tokens, kubeconfigs.

**Architecture solution:** LLM provider credentials and any `light-manager` auth are env-injected by `workshop-infrastructure` at deploy time. `ModelConfig` CRDs reference Secret names but those Secrets are not committed. `.gitignore` excludes `.env*` and `kubeconfig*`.

**Validation:** `gitleaks` (or equivalent) clean on every PR.

---

### NFR-012: Per-participant tenancy in UC4 MCP

**Requirement:** MCP must always pass the right `user` and never enable cross-participant bleed.

**Architecture solution:** Per-vCluster MCP deployment with `WORKSHOP_PARTICIPANT_LOGIN` env injected at deploy time. The MCP rejects any tool call whose `user` parameter does not equal that env value. The coordinator agent's prompt interpolates the same login at deploy time and always passes it. Two independent layers (prompt + MCP guard) so a prompt drift cannot cause bleed.

**Validation:** UC4 tour includes a verification step (`list_bulbs` returns the participant's three slots with their previous state). MCP unit tests assert the rejection path.

---

## Security Architecture

**Authentication / authorisation between participants:** Per NFR-012, enforced by per-vCluster MCP topology. No identity is committed to the repo. There is no other multi-tenant component first-party to this repo.

**Secret handling:** Per NFR-011, zero secrets in the repo. Every credential reaches the runtime via Secrets injected by `workshop-infrastructure`. `ModelConfig` and the MCP Deployment reference Secret names but never their content.

**Encryption at rest / in transit:** Cluster-internal traffic between the coordinator, the MCP, and Prom/Graf is plain HTTP (vCluster network is the trust boundary). The MCP→light-manager link uses whatever scheme `LIGHT_MANAGER_URL` specifies — `workshop-infrastructure` injects a `https://...` URL when light-manager is deployed with TLS termination. No first-party crypto.

**Input validation:** The MCP validates `slot ∈ {1,2,3}` and `r,g,b ∈ [0,255]` in Pydantic models that mirror `light-manager`'s `BulbUpdate`, so malformed agent calls fail fast at the MCP boundary instead of at light-manager. FastAPI's standard error responses suffice.

**Out of scope (workshop-infrastructure):** TLS termination, image scanning, kagent CRD admission policies, network policies between vCluster slices.

---

## Reliability, Scaling, Availability

**Reliability:** Determinism (NFR-003) is the only reliability concern this repo owns. Cross-tested by both authors before M5; M5 dry-run is the final gate.

**Scaling, HA, DR, capacity planning:** Out of scope. Owned by `workshop-infrastructure` (per-participant vCluster slicing, cluster autoscaling, AKS region/AZ choices). The artefacts this repo produces are single-replica by design — they are pedagogical fixtures, not load-bearing services.

**Monitoring & alerting on the broken-state apps:** Out of scope. UC3's Prom+Graf monitor the leaking app for **the participant's eyes**, not for an SRE rotation.

---

## Development & Deployment

### Code organisation

```
kagent-workshop-scenarios/
├── apps/                  # FastAPI variants + skeleton (FR-007)
├── uc1/  uc2/  uc3/  uc4/ # per-UC scenario packages (FR-001)
├── infra/observability/   # Prom+Graf manifests (UC3/UC4)
├── mcp/                   # UC4 custom MCP source + manifests (FR-016)
├── schemas/               # vendored workshop-tour + kagent CRD schemas (FR-002)
├── scripts/               # author dev loop helpers (FR-004)
├── docs/                  # PRD, architecture, tour content conventions
├── Makefile               # uc<N>-up/down, validate-tours, lint-manifests
├── CODEOWNERS             # NFR-008 enforcement
└── README.md              # FR-003
```

### Testing strategy

- **Schema validation** — `make validate-tours` runs on every PR; blocks merge on schema violations.
- **Manifest lint** — `make lint-manifests` runs `kubectl apply --dry-run=client -f uc<N>/manifests/` on a stub cluster in CI.
- **CRD lint** — `make lint-agents` validates kagent CRDs against vendored v0.9.0 schemas.
- **Reproduction tests** — manual checklist per UC, run 3× by the UC owner and once cross-author before M5 (NFR-003).
- **Dry-run** — full M5 walkthrough by both authors using the actual `workshop-infrastructure` deploy path (~2026-05-19). This is the only end-to-end test of the full pipeline; intentional, given the 3-week timeline.

### CI/CD pipeline (in-repo)

GitHub Actions (or equivalent — provider chosen by `workshop-infrastructure`) runs on every PR:
1. `make lint-manifests`
2. `make lint-agents`
3. `make validate-tours`
4. `gitleaks` secret scan
5. (UC4 only) `mcp/` Python tests — Pydantic shape, tenancy guard.

Image build and deployment to the workshop cluster are owned by `workshop-infrastructure`; no first-party CD pipeline lives in this repo.

---

## Requirements Traceability

### Functional Requirements Coverage

| FR ID  | FR Name                                | Components                                              |
|--------|----------------------------------------|---------------------------------------------------------|
| FR-001 | Repo structure                         | C2 (per-UC scenario package), root layout               |
| FR-002 | Tour JSON schema conformance           | C7 (schemas/), `make validate-tours`                    |
| FR-003 | Root documentation                     | C9 (root README + docs/)                                |
| FR-004 | Local dev/test loop                    | C8 (scripts/, Makefile, kind config)                    |
| FR-005 | Artemis fil rouge                      | C1 (Artemis-themed app names), C2 (resource naming), C9 (lore index) |
| FR-006 | CLI baseline → agent → contrast        | C2 (per-UC tour.json), `docs/tour-content-conventions.md` |
| FR-007 | FastAPI app convention                 | C1 (`apps/_skeleton/` + variants)                       |
| FR-008 | UC1 scenario package                   | C3                                                      |
| FR-009 | UC1 tour                               | C3                                                      |
| FR-010 | UC2 scenario package                   | C4                                                      |
| FR-011 | UC2 tour                               | C4                                                      |
| FR-012 | UC3 scenario package + Prom/Graf       | C5, infra/observability                                 |
| FR-013 | UC3 tour with on-the-fly dashboard     | C5                                                      |
| FR-014 | UC4 multi-agent coordinator package    | C6                                                      |
| FR-015 | UC4 tour                               | C6                                                      |
| FR-016 | Custom MCP wrapping bulbs API          | C6 (mcp/ subcomponent)                                  |
| FR-017 | Bulb-colour-as-diagnosis convention    | C6 (coordinator prompt + uc4/README)                    |

### Non-Functional Requirements Coverage

| NFR ID  | NFR Name                                  | Solution                                                | Validation                            |
|---------|-------------------------------------------|---------------------------------------------------------|---------------------------------------|
| NFR-001 | Time-to-symptom ≤ 60 s                    | Manifest-side or participant-triggered breakage          | Manual stopwatch                      |
| NFR-002 | Per-UC footprint                          | Single-replica tiny pods, explicit resource requests     | `kubectl top` during M5               |
| NFR-003 | Deterministic reproduction                | Structural breakage, no race                             | Per-UC checklist 3× + cross-author   |
| NFR-004 | Idempotent re-apply                       | Stateless manifests, idempotent bootstrap Job (UC2)      | Double-apply in CI                    |
| NFR-005 | kagent v0.9.0 pin                         | Vendored CRD schemas, no `:latest`                       | `make lint-agents`, grep              |
| NFR-006 | Vanilla K8s ≥ 1.28                        | No provider-specific resources, ClusterIP only           | `kubectl apply --dry-run=client`     |
| NFR-008 | Per-UC ownership                          | `CODEOWNERS`                                             | GitHub enforcement                    |
| NFR-009 | English copy                              | Convention + PR review                                   | Spot-check                            |
| NFR-010 | Self-contained tour steps                 | Convention enforced by author review                     | M5 dry-run                            |
| NFR-011 | No secrets in repo                        | Env injection, `.gitignore`                              | `gitleaks` in CI                      |
| NFR-012 | Per-participant MCP tenancy               | Per-vCluster MCP + env-pinned login + reject-mismatch    | Tenancy unit test + UC4 tour step    |

---

## Trade-offs & Decision Log

**Decision: Per-vCluster MCP, not shared.**
- ✓ Hard tenancy by topology (NFR-012); no prompt-engineering safety required.
- ✗ ~50 Mi RAM cost per slice; one Deployment per participant.
- **Rationale:** Cross-participant bleed is the worst-case UX failure of the workshop. Topological isolation is cheaper to reason about than prompt discipline.

**Decision: UC2 uses taint mismatch, not impossible resource requests.**
- ✓ Invariant across kind/vCluster (no node-size dependency).
- ✓ Multi-resource correlation (pod + node + events) is the pedagogical point.
- ✗ Requires an in-manifest bootstrap Job to apply the taint.
- **Rationale:** Determinism (NFR-003) > manifest simplicity.

**Decision: UC3 OOM is participant-triggered via `/leak`, not a startup-time leak.**
- ✓ The 60 s clock for NFR-001 starts under participant control — no race possible.
- ✓ Prom shows a clean monotone curve when the leak loop runs, which is pedagogically clearer than a "memory always grows" Deployment.
- ✗ Adds one CLI step in the UC3 tour to start the leak.
- **Rationale:** Determinism + visualisation clarity > step count.

**Decision: Plain Prom/Graf manifests under `infra/observability/`, no operator.**
- ✓ Vanilla K8s portability (NFR-006).
- ✓ Participants don't have to learn Helm or operators to read the install.
- ✗ Not how Prom is run in production.
- **Rationale:** Pedagogical clarity > production fidelity. Disclaimer in `uc3/README.md`.

**Decision: LLM provider deferred, ModelConfig parameterised by env injection.**
- ✓ Architecture stays scoped to artefacts; provider is a runtime concern.
- ✓ The same artefacts run against Azure OpenAI, Anthropic, or Ollama-on-cluster.
- ✗ Final provider must be picked before M5 by `workshop-infrastructure`.
- **Rationale:** This repo's architecture should not depend on a runtime decision the sibling project owns.

**Decision: Single-replica everything.**
- ✓ Trivial NFR-002 footprint.
- ✓ Clear K8s objects in `kubectl get all` for participants.
- ✗ No HA story.
- **Rationale:** Out of scope. The workshop runs for 3 hours, not 3 nines.

---

## Open Issues & Risks

- **kagent v0.9.0 multi-agent (a2a) wiring shape.** The exact CRD shape for "Agent A delegates to Agents B, C, D" is the highest implementation risk. Mitigation: spike on UC4 coordinator wiring during M2 (in parallel with UC1/UC2 work) so the shape is known before M4.
- **kagent ↔ MCP `ToolServer` shape.** v0.9.0 may require a specific transport (stdio vs HTTP/SSE) for `ToolServer` CRDs. Confirmed-against-v0.9.0 example needed before the MCP work starts in M4.
- **light-manager deployment timing.** UC4 cannot be end-to-end-tested until light-manager is reachable on the workshop cluster. Cutoff: 2026-05-15. Fallback: a stub light-manager committed to the repo for local dev (NOT shipped to the workshop) so MCP work can proceed unblocked.
- **KMCP Tools API stability.** External tool; pin its version in `mcp/kmcp.yaml` to whatever is current at M4 start.

---

## Assumptions & Constraints

**Assumptions** (carried from the PRD):
- Each participant arrives with a per-vCluster slice already provisioned and a VS Code server with the `workshop-tour` extension installed and `tour.json` placed.
- light-manager is deployed and stable on the workshop cluster by 2026-05-15.
- kagent v0.9.0 has no breaking change between 2026-04-28 and 2026-05-20.
- Each participant has a stable login (e.g. `participant-01`) used as the `?user=` value.

**Constraints** (carried from the PRD):
- 3-week timeline (workshop ~ 2026-05-20).
- Two developers in parallel, anti-collision is a hard constraint (NFR-008).
- kagent v0.9.0 pinned (NFR-005).
- Vanilla K8s ≥ 1.28 portability (NFR-006).
- English-only copy (NFR-009).

---

## Future Considerations

- Additional UCs (DNS, HPA, probes, PVC, TLS expiry) — the per-UC scenario-package pattern is designed to be extended without reworking shared dirs.
- Tour translations — none planned for the first workshop.
- Logs/traces in the observability bundle — out of scope for the M1–M5 timeline; the Prom+Graf install is the floor.
- Sharing the broken-app library (`apps/`) with other kagent demos.

---

## Approval & Sign-off

**Review Status:**
- [ ] Technical Lead
- [ ] Product Owner
- [ ] DevOps Lead

---

## Revision History

| Version | Date       | Author        | Changes              |
|---------|------------|---------------|----------------------|
| 1.0     | 2026-04-28 | Quentin Rodic | Initial architecture |

---

## Next Steps

### Phase 4: Sprint Planning & Implementation

Run `/bmad:sprint-planning` to break the four epics into stories aligned with the M1 → M5 milestones.

**Key implementation principles:**
1. Follow the per-UC component boundaries — `uc<N>/` is one developer's island.
2. Lock `apps/_skeleton/`, `schemas/`, root README, and `docs/tour-content-conventions.md` in M1 before any per-UC parallel work begins.
3. Spike UC4 coordinator wiring (kagent a2a + ToolServer) during M2 — do not wait until M4.
4. Cross-author each UC reproduction before M5.

---

**This document was created using BMAD Method v6 — Phase 3 (Solutioning).**

*To continue: run `/bmad:workflow-status` to see your progress and next recommended workflow.*
