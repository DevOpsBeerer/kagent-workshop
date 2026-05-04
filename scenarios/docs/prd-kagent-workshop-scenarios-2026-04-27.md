# Product Requirements Document: kagent-workshop-scenarios

**Date:** 2026-04-27
**Author:** Quentin Rodic
**Version:** 1.0
**Project Type:** api
**Project Level:** 2
**Status:** Draft

---

## Document Overview

This Product Requirements Document (PRD) defines the functional and non-functional requirements for `kagent-workshop-scenarios`, a repository of pedagogical scenarios used in a Kubernetes-with-kagent workshop. It serves as the source of truth for what will be built and provides traceability from requirements through implementation.

**Related Documents:**

- Product Brief: [docs/product-brief-kagent-workshop-scenarios-2026-04-27.md](./product-brief-kagent-workshop-scenarios-2026-04-27.md)

**Reframes vs the Product Brief.** During PRD discovery the following details were tightened or updated relative to the brief:

- The tour JSON files are consumed by a bespoke **`workshop-tour` VS Code extension** (separate sibling project). Its draft-07 schema is supplied externally and vendored into this repo. The schema is not a deliverable of this project — conformance to it is.
- The workshop runtime is **per-participant vCluster on a shared AKS cluster, with per-participant VS Code server**, not per-participant local kind. The brief's "kind per participant" line is superseded; kind survives only as the **author local dev/test loop** (FR-004).
- `light-manager` is deployed as a **shared multi-tenant service** on the workshop cluster. UC4's custom MCP wraps its OpenAPI surface (`GET /api/bulbs?user=<login>`, `PUT /api/bulbs/{slot}?user=<login>`).
- Workshop-time delivery (CI image build, manifest application onto the workshop cluster, distribution of `tour.json` into each participant's VS Code server) is **out of repo scope** and tracked as an external dependency.
- Output language is **English** across the board (Switzerland audience).

---

## Executive Summary

`kagent-workshop-scenarios` is a source-of-artefacts repository for a hands-on workshop teaching ops teams how to diagnose Kubernetes incidents using kagent agents — including in a multi-agent (a2a) configuration. The repo delivers, for each of four use cases (UC1 → UC4), a self-contained scenario package: a deliberately broken Kubernetes application, the kagent `Agent` and `Tool` CRDs scoped to the diagnosis, a `tour.json` file consumed by the `workshop-tour` VS Code extension, and a per-UC README. UC4 additionally ships a custom MCP server (generated via KMCP Tools) that wraps the sibling `light-manager` API, so the multi-agent coordinator can broadcast its global diagnosis by changing the participant's bulb colors — the visible Artemis-themed payoff of the workshop.

Participants run the workshop inside a per-participant vCluster on a shared AKS cluster, with a per-participant VS Code server hosting their tour. They emerge with a concrete experience of a kagent agent solving four real Kubernetes diagnostic problems on their own cluster slice, plus reusable CRD configurations and a mental model of when an agent outperforms a kubectl-only workflow.

---

## Product Goals

### Business Objectives

1. **Workshop delivery on time** — four scenarios fully functional and deployable by 2026-05-20 (DevOpsDays workshop date, Switzerland).
2. **Autonomy of use** — a participant must be able to run any scenario end-to-end by following only the in-extension tour, without trainer assistance on the mechanics.
3. **Make the agent-vs-CLI value visible** — every scenario must make the gain over a manual `kubectl` workflow concrete and inarguable (speed, correlation, or cognitive-load reduction).
4. **Reusability** — the repo must be replayable for a subsequent workshop session without major rework.

### Success Metrics

- **Autonomy of use:** percentage of scenarios completed by participants without trainer intervention during the workshop.
- **Agent-vs-CLI value demonstrated:** post-workshop qualitative feedback ("did I see at least one case where the agent did better than `kubectl`?") plus participant ability to cite ≥ 1 production use case for kagent.

---

## Functional Requirements

Functional Requirements (FRs) define **what** the system does — specific features and behaviors. Each FR carries a unique ID, a MoSCoW priority, a description, testable acceptance criteria, and dependencies.

---

### FR-001: Repo structure — one folder per UC plus shared directories

**Priority:** Must Have

**Description:**
The repository is organised as one self-contained folder per use case (`uc1/`, `uc2/`, `uc3/`, `uc4/`) plus shared top-level directories: `apps/` (Python FastAPI applications shared across UCs, see FR-007), `infra/` (Prom/Grafana manifests for UC3 and any other shared infra), `schemas/` (vendored `workshop-tour` JSON schema), `docs/` (root documentation including this PRD), `mcp/` (UC4 custom MCP source), `scripts/` (author tooling).

**Acceptance Criteria:**
- [ ] Each `uc<N>/` contains: broken-state Kubernetes manifests under `manifests/`, kagent `Agent` and `Tool` CRDs under `agents/`, `tour.json`, `README.md`. Container images come from `apps/` per FR-007.
- [ ] No `uc<N>/` references files outside its own folder, except `schemas/` (tour schema), `infra/` (UC3 only), `apps/` (image references), and `mcp/` (UC4 only).
- [ ] Root `README.md` indexes the four UCs and the shared directories.

**Dependencies:** none

---

### FR-002: Tour JSON conforms to the workshop-tour schema

**Priority:** Must Have

**Description:**
Each UC ships exactly one `tour.json` that validates against the externally-supplied `workshop-tour` draft-07 JSON schema. Steps leverage the schema's `commands` (button-launchable shell commands) and `fileEdits` (`create` or `patch`) constructs where useful — typically `commands` for `kubectl`/kagent invocations and `fileEdits.create` to apply a manifest, `fileEdits.patch` for guided edits.

**Acceptance Criteria:**
- [ ] `schemas/workshop-tour.schema.json` is vendored from the workshop-tour extension repo and pinned to a known version.
- [ ] Each `uc<N>/tour.json` validates against that schema (verified locally via `make validate-tours` or equivalent).
- [ ] Each `tour.json`'s `id` is unique and stable across renames (e.g. `kagent-uc1-imagepullbackoff`).
- [ ] Each tour step's `commands` and `fileEdits` are self-contained (per NFR-010).

**Dependencies:** workshop-tour extension schema (external)

---

### FR-003: Root documentation

**Priority:** Must Have

**Description:**
A root `README.md` covers: workshop cluster prerequisites (vCluster on AKS, K8s ≥ 1.28), kagent v0.9.0 install reference, suggested UC ordering, Artemis lore index, and a short informational section on how tours are distributed to participants (tour distribution itself is out of scope per `Out of Scope`).

**Acceptance Criteria:**
- [ ] README sections present: Overview, Prerequisites, Install kagent, UC index (links to each `uc<N>/README.md`), Artemis lore index, Tour distribution (informational only), Local dev loop (authors only).
- [ ] All internal links resolve.
- [ ] Author-only sections are clearly marked.

**Dependencies:** none

---

### FR-004: Local dev/test loop for authors

**Priority:** Should Have

**Description:**
Authors (Clément and Quentin) can spin up a local kind cluster, install kagent v0.9.0, deploy any UC's manifests + CRDs, and exercise the tour end-to-end without leaving their laptop. The repo ships a kind config, a preflight script (Docker / kubectl / kind / kagent CRDs presence), and a per-UC Makefile target.

**Acceptance Criteria:**
- [ ] `scripts/preflight.sh` validates Docker, kubectl, kind, and kagent CRDs presence; exits non-zero with actionable messages on failure.
- [ ] `make uc<N>-up` deploys UC<N> on a local kind cluster end-to-end.
- [ ] `make uc<N>-down` tears UC<N> down cleanly.
- [ ] Documented in root README under "Local dev loop".

**Dependencies:** none

---

### FR-005: Artemis fil rouge applied to naming and tour narratives

**Priority:** Must Have

**Description:**
All Kubernetes resource names, namespace names, agent names, and tour titles follow the Artemis spatial narrative with continuity across UC1 → UC4. The lore arc is documented in the root README so a reader can follow the story across the four scenarios.

**Acceptance Criteria:**
- [ ] Every Kubernetes resource name in `uc<N>/` uses an Artemis-themed label (e.g. `artemis-mission-control`, `lunar-rover-telemetry`).
- [ ] Tour titles and `explanation` copy reference the lore arc.
- [ ] Root README has an "Artemis lore index" section explaining the cross-UC narrative.

**Dependencies:** none

---

### FR-006: Tour content convention — CLI baseline → agent walkthrough → contrast

**Priority:** Must Have

**Description:**
Each tour begins with a "the kubectl way" section — one or more steps with shell commands that the participant runs to feel manual diagnostic friction — then transitions to "the agent way" where the kagent agent performs the diagnosis, then closes with a step explicitly naming the contrast (time saved, correlation done, dashboard auto-generated, etc.). This convention is what makes business objective #3 (agent-vs-CLI value visible) measurable.

**Acceptance Criteria:**
- [ ] Each tour has a clearly-titled "CLI baseline" introductory step or step group.
- [ ] Each tour has a "Now ask the agent" transition step.
- [ ] Each tour ends with a "What did the agent do better?" recap step.

**Dependencies:** FR-002

---

### FR-007: Python FastAPI application convention (shared `apps/`)

**Priority:** Must Have

**Description:**
Each UC's broken-state Kubernetes Deployment runs (or attempts to run) a Python FastAPI application written in this repo, rather than a renamed public image. Apps follow a shared convention: Python 3.12, FastAPI + uvicorn, slim `Dockerfile`, an Artemis-themed identity, and a `/healthz` endpoint. UC3's variant additionally exposes a Prometheus-compatible `/metrics` endpoint (e.g. via `prometheus-fastapi-instrumentator`).

Apps live under shared top-level `apps/`:
- `apps/_skeleton/` — the reference template authors copy/derive from.
- `apps/<artemis-name>/` — the actual app variants. The same app variant may be reused across UCs when the breakage is purely manifest-side (e.g. a baseline mission-control app shared by UC1 ImagePullBackOff and UC2 Pending), while UC3 has a dedicated memory-leak variant. UC4 reuses image tags from UC1/UC2/UC3 builds.

The downstream CI/CD layer is responsible for building and publishing the images; the repo provides the source, `Dockerfile`, and a documented mapping from UC → app variant.

**Acceptance Criteria:**
- [ ] `apps/_skeleton/` exists with: `main.py` exposing `/healthz`, `Dockerfile`, `pyproject.toml` (or `requirements.txt`), and a one-line `README.md` explaining "copy this directory to start a new app".
- [ ] Each app variant required by the four UCs lives under `apps/<artemis-name>/`, derived from the skeleton.
- [ ] All apps target Python 3.12 and FastAPI ≥ 0.115; `uvicorn` is the ASGI server.
- [ ] Each `Dockerfile` produces an x86-64 image ≤ 200 MB compressed (multi-arch optional but x86-64 mandatory for AKS).
- [ ] UC3's variant exposes `/metrics` (Prometheus text format), wired so the UC3 Prom install scrapes it without extra config.
- [ ] `apps/README.md` documents the UC ↔ app-variant mapping and the build/publish flow.

**Dependencies:** FR-001, FR-005

---

### FR-008: UC1 — ImagePullBackOff scenario package

**Priority:** Must Have

**Description:**
A deterministic broken Kubernetes Deployment that runs the baseline Python FastAPI app (per FR-007) but references an intentionally non-existent image tag (e.g. `:v999` when only `:v1` was published), producing `ImagePullBackOff` on apply. Bundled with a minimal kagent `Agent` and `Tool` CRDs scoped to Kubernetes API access only (events, describe, get pod) and an Artemis-themed identity.

**Acceptance Criteria:**
- [ ] `kubectl apply -f uc1/manifests/` causes one or more pods to enter `ImagePullBackOff` within 60 s on a fresh kind cluster.
- [ ] The Deployment's image reference points at the FastAPI app from FR-007 with an unpublished tag.
- [ ] Reproduces on 3/3 cold deploys (per NFR-003).
- [ ] Agent CRD references the smallest tool set sufficient to diagnose the symptom.
- [ ] `uc1/README.md` describes the bug, the expected agent diagnosis, and the Artemis narrative wrapper.

**Dependencies:** FR-001, FR-005, FR-007, NFR-005

---

### FR-009: UC1 — tour

**Priority:** Must Have

**Description:**
`tour.json` that drives a participant from observing the broken state in their vCluster, through the CLI baseline (`kubectl describe pod`, `kubectl get events`), to invoking the kagent agent, to seeing the synthesised diagnosis, and finally to a contrast recap.

**Acceptance Criteria:**
- [ ] Validates against the `workshop-tour` schema.
- [ ] Implements the FR-006 convention.
- [ ] All `commands` are kubectl/kagent invocations runnable as-is in the VS Code server terminal.
- [ ] Includes at least one `fileEdits.create` step to apply the broken-state manifest.

**Dependencies:** FR-002, FR-006, FR-008

---

### FR-010: UC2 — Pod Pending / scheduling scenario package

**Priority:** Must Have

**Description:**
A broken Deployment that runs the baseline Python FastAPI app (per FR-007 — typically the same image variant as UC1) but with manifest-side scheduling constraints that no node can satisfy: taint mismatch, impossible resource requests, or `nodeSelector` mismatch. The kagent `Agent` is configured with multi-tool reach (pod, node, taint, events) so the agent can correlate across resources in a single synthesis.

**Acceptance Criteria:**
- [ ] `kubectl apply -f uc2/manifests/` produces a `Pending` pod within 60 s.
- [ ] The Deployment image reference points at a FastAPI app from FR-007 (image tag valid; only the scheduling constraints are unsatisfiable).
- [ ] Reproduces on 3/3 cold deploys.
- [ ] Agent CRD wires tools for: get/describe pod, get/describe node, list events.
- [ ] `uc2/README.md` documents the scheduling-failure root cause and Artemis narrative.

**Dependencies:** FR-001, FR-005, FR-007, NFR-005

---

### FR-011: UC2 — tour

**Priority:** Must Have

**Description:**
`tour.json` showing the multi-resource correlation surfaced by the agent in a single synthesis, vs the sequential CLI dance of `describe pod` → `describe node` → `get events`.

**Acceptance Criteria:**
- [ ] Validates against schema.
- [ ] Implements FR-006 convention.
- [ ] CLI baseline section contains ≥ 3 distinct kubectl commands so the friction is visible.

**Dependencies:** FR-002, FR-006, FR-010

---

### FR-012: UC3 — OOMKilled scenario package + Prometheus/Grafana manifests

**Priority:** Must Have

**Description:**
A dedicated **memory-leak FastAPI variant** (per FR-007) — for example a route or background task that appends to an unbounded data structure — deployed with a low memory limit so it deterministically triggers `OOMKilled`. Plus Prometheus and Grafana install manifests in `infra/observability/`. The UC3 `Agent` reuses kagent's pre-packaged Prometheus and Grafana agents — the brief's "no reinvention" constraint forbids inventing custom Prom/Graf agents. Prom scrapes the FastAPI variant's `/metrics` endpoint (per FR-007 AC).

**Acceptance Criteria:**
- [ ] `kubectl apply -f uc3/manifests/` triggers `OOMKilled` restarts within 60 s.
- [ ] The Deployment runs the memory-leak FastAPI variant from FR-007.
- [ ] `infra/observability/` deploys a working Prometheus + Grafana stack (Prom scrapes the app's `/metrics`; Grafana reachable in-cluster).
- [ ] kagent `Agent` CRD references kagent's pre-packaged Prometheus + Grafana agents (not custom).
- [ ] `uc3/README.md` documents the bug, the Prom/Graf prerequisite, the agent diagnostic flow, and the Artemis narrative.

**Dependencies:** FR-001, FR-005, FR-007, NFR-005

---

### FR-013: UC3 — tour with on-the-fly Grafana dashboard

**Priority:** Must Have

**Description:**
`tour.json` walks: observe restarts via CLI baseline → ask the agent for memory analysis → agent queries Prometheus and creates a Grafana dashboard live (kagent's native dashboard-creation capability). Final step surfaces the dashboard URL.

**Acceptance Criteria:**
- [ ] Validates against schema.
- [ ] Implements FR-006 convention.
- [ ] Includes a step that captures and renders the Grafana dashboard URL output by the agent.
- [ ] Documents the kagent native capability used.

**Dependencies:** FR-002, FR-006, FR-012

---

### FR-014: UC4 — Multi-agent coordinator scenario package

**Priority:** Must Have

**Description:**
A multi-symptom cluster bundling Deployments that simultaneously reproduce an ImagePullBackOff (UC1-style), a scheduling failure (UC2-style), and an `OOMKilled` (UC3-style). Deployments reuse the FastAPI app images from `apps/` (per FR-007) — UC4 ships **no new app source**, only the multi-symptom manifests, the coordinator, and the wiring. An a2a-capable coordinator `Agent` CRD is wired to the UC1, UC2, and UC3 sub-agents and to the custom MCP (FR-016).

**Acceptance Criteria:**
- [ ] `kubectl apply -f uc4/manifests/` produces all three symptoms simultaneously within 60 s.
- [ ] All three Deployments reference image tags built from `apps/` per FR-007 (no new app source under `uc4/`).
- [ ] Reproduces on 3/3 cold deploys.
- [ ] Coordinator agent CRD references UC1/UC2/UC3 sub-agents (a2a delegation).
- [ ] Coordinator agent CRD references the custom MCP server (FR-016).
- [ ] `uc4/README.md` documents the multi-symptom narrative and the coordination flow.

**Dependencies:** FR-001, FR-005, FR-007, FR-008, FR-010, FR-012, FR-016, NFR-005

---

### FR-015: UC4 — tour

**Priority:** Must Have

**Description:**
`tour.json` walks a single ask to the coordinator → observe a2a delegations to the sub-agents → consolidated diagnosis → bulbs change color via the custom MCP. Implements FR-006 with extra emphasis on multi-agent collaboration as the pedagogical climax.

**Acceptance Criteria:**
- [ ] Validates against schema.
- [ ] Implements FR-006 convention.
- [ ] Includes a step that demonstrates the bulb color change as the diagnosis output.
- [ ] References the participant's `?user=<login>` for tenancy (per NFR-012).

**Dependencies:** FR-002, FR-006, FR-014, FR-016, FR-017

---

### FR-016: Custom MCP wrapping light-manager bulbs API

**Priority:** Must Have

**Description:**
A custom MCP server, generated and packaged via KMCP Tools, that exposes two MCP tools wrapping the `light-manager` OpenAPI:
- `list_bulbs(user)` → `GET /api/bulbs?user=<login>` (returns the participant's three bulbs).
- `update_bulb(user, slot, r, g, b)` → `PUT /api/bulbs/{slot}?user=<login>` with body `{ r, g, b }`, RGB channels in `[0, 255]`.

Source lives in `mcp/`. Built via KMCP Tools so the wiring stays declarative.

**Acceptance Criteria:**
- [ ] `mcp/` contains the KMCP Tools-generated MCP server source and build instructions.
- [ ] The MCP exposes exactly two tools: `list_bulbs` and `update_bulb`.
- [ ] Tool input/output shapes match the `BulbRead` / `BulbUpdate` schemas in `light-manager`'s OpenAPI.
- [ ] The MCP propagates the participant's `?user=<login>` from session context (per NFR-012).

**Dependencies:** light-manager (internal), KMCP Tools (external)

---

### FR-017: Bulb-color-as-diagnosis convention

**Priority:** Must Have

**Description:**
The coordinator agent maps each sub-agent's verdict to one of the participant's three bulb slots (slot 1 = UC1 verdict, slot 2 = UC2 verdict, slot 3 = UC3 verdict) using a documented color code:
- **Green** (`0, 255, 0`) — sub-agent reports the symptom as healthy / not present.
- **Red** (`255, 0, 0`) — sub-agent reports an active anomaly.
- **Amber** (`255, 191, 0`) — sub-agent reports an inconclusive or partial finding.

The convention is documented in `uc4/README.md` and reflected in the coordinator agent's prompt/instructions so it calls `update_bulb` with the right color per verdict.

**Acceptance Criteria:**
- [ ] `uc4/README.md` documents the slot ↔ sub-agent mapping.
- [ ] `uc4/README.md` documents the color ↔ verdict semantic.
- [ ] Coordinator agent CRD's instructions encode the mapping such that the agent calls `update_bulb` with the correct color per verdict.
- [ ] Tour FR-015 makes the mapping visible to the participant.

**Dependencies:** FR-015, FR-016

---

## Non-Functional Requirements

Non-Functional Requirements (NFRs) define **how** the system performs — quality attributes and constraints. Each NFR carries a measurable target and a rationale.

---

### NFR-001: Performance — Time-to-symptom on cold deploy

**Priority:** Must Have

**Description:**
After `kubectl apply` of a UC's broken-state manifests, the diagnostic symptom (`ImagePullBackOff`, `Pending`, `OOMKilled`, etc.) is observable within **60 seconds** on a stock kind cluster (author dev loop) or on a participant's vCluster slice (workshop runtime).

**Acceptance Criteria:**
- [ ] Measured manually during dev: cold-deploy → symptom-observable elapsed time ≤ 60 s for each UC.

**Rationale:**
Participants must not stare at a `Pending` pod that has not yet failed; the workshop tempo depends on the broken state being immediately observable.

---

### NFR-002: Performance — Per-UC footprint inside a vCluster slice

**Priority:** Must Have

**Description:**
A single UC running standalone fits within **2 vCPU / 4 GiB RAM** aggregate (workload + Prom/Graf if applicable, excluding kagent runtime). UC4 (multi-symptom) fits within **4 vCPU / 8 GiB**.

**Acceptance Criteria:**
- [ ] `kubectl top` (or equivalent) on a deployed UC reports cumulative usage within budget.
- [ ] UC4 reports cumulative usage within its 4/8 budget.

**Rationale:**
Cost predictability and per-participant vCluster slice sizing on the shared AKS cluster.

---

### NFR-003: Reliability — Deterministic, race-free reproduction

**Priority:** Must Have

**Description:**
The broken state for each UC reproduces on **3/3** consecutive cold deploys on a fresh cluster. No probe-flap, no timing-dependent race condition, no external network dependency for the symptom itself.

**Acceptance Criteria:**
- [ ] Each UC has a documented reproduction test (script or manual checklist) that passes 3/3 cold deploys.
- [ ] Cross-tested by the other developer (Clément ↔ Quentin) before the M5 dry-run.

**Rationale:**
A workshop blocked by a non-deterministic bug is the worst-case failure mode (brief risk #4).

---

### NFR-004: Reliability — Idempotent re-apply

**Priority:** Should Have

**Description:**
Re-applying a UC's manifests on a cluster where they already exist completes without error and converges to the documented broken state.

**Acceptance Criteria:**
- [ ] `kubectl apply -f uc<N>/manifests/` succeeds when the resources already exist.

**Rationale:**
Authors and participants frequently re-run apply during demos; non-idempotent behavior creates spurious "is the workshop broken?" moments.

---

### NFR-005: Compatibility — kagent v0.9.0 pin

**Priority:** Must Have

**Description:**
All `Agent` and `Tool` CRDs target kagent **v0.9.0** exactly. CRD schemas vendored or pinned. No `latest` references in any kagent-related manifest.

**Acceptance Criteria:**
- [ ] Each agent/tool CRD declares `apiVersion` matching kagent v0.9.0.
- [ ] No image tags `:latest` in any kagent-related manifest.
- [ ] kagent install reference in root README pins v0.9.0.

**Rationale:**
Brief constraint — upstream kagent moves fast; pinning protects the workshop from breaking changes between now and 2026-05-20.

---

### NFR-006: Compatibility — Vanilla Kubernetes ≥ 1.28

**Priority:** Must Have

**Description:**
Manifests run on any conformant Kubernetes cluster ≥ 1.28 (kind, minikube, vCluster on AKS, k3s, managed clouds) without provider-specific resources.

**Acceptance Criteria:**
- [ ] No cloud-CSI, no managed-DB, no `LoadBalancer`-only services without a documented alternative.
- [ ] `kubectl apply --dry-run=client -f uc<N>/manifests/` succeeds on a vanilla cluster.

**Rationale:**
Workshop runtime is vCluster on AKS, but reusability for future workshops (objective #4) requires keeping the manifests portable.

---

### NFR-008: Maintainability — Per-UC ownership boundary (anti-collision)

**Priority:** Must Have

**Description:**
Files under `uc<N>/` are owned by exactly one developer. Shared directories (`apps/`, `infra/`, `schemas/`, `mcp/`, root `docs/`) require both-developer review on any change.

**Acceptance Criteria:**
- [ ] `CODEOWNERS` file present mapping `uc<N>/` to a single owner.
- [ ] Shared directories map to both Clément and Quentin in `CODEOWNERS`.

**Rationale:**
Brief risk #5 — collisions Clément ↔ Quentin on shared artefacts. Locking ownership at file boundary is the cheapest mitigation.

---

### NFR-009: Usability — Tour copy language consistency (English)

**Priority:** Must Have

**Description:**
All tour titles, explanations, command labels, and per-UC READMEs use **English** consistently across all four UCs.

**Acceptance Criteria:**
- [ ] Spot-check: no French (or other-language) text in any `tour.json` or `uc<N>/README.md`.

**Rationale:**
Workshop audience is Switzerland-based and the workshop operates in English.

---

### NFR-010: Usability — Self-contained tour steps

**Priority:** Must Have

**Description:**
Every tour step's `commands` and `fileEdits` are runnable as-is in the participant's VS Code server, assuming kubectl and kagent CLI are in `PATH` and the kubeconfig is pre-wired to the participant's vCluster (both provided by the downstream CI/CD layer).

**Acceptance Criteria:**
- [ ] No tour step requires the participant to "edit X first" or "set environment variable Y" without the step itself doing it via `fileEdits` or `commands`.

**Rationale:**
Business objective #2 — autonomy of use. Hidden prerequisites break the autonomy promise.

---

### NFR-011: Security — No secrets in repo

**Priority:** Must Have

**Description:**
No API keys, tokens, kubeconfigs, or credentials committed to the repo. LLM provider keys and any `light-manager` auth are injected by the downstream CI/CD layer at deploy time.

**Acceptance Criteria:**
- [ ] gitleaks (or equivalent secret scanner) clean on every PR.
- [ ] No `.env` or credential files committed.

**Rationale:**
Standard security hygiene; also unlocks safe open-sourcing of the repo for replay.

---

### NFR-012: Security — Per-participant tenancy in UC4 MCP

**Priority:** Must Have

**Description:**
The custom MCP must always pass the participant's `?user=<login>` (sourced from VS Code session context — never hard-coded) on every call to `light-manager`. Cross-participant bleed (one participant's bulbs lit by another's coordinator) is a defect.

**Acceptance Criteria:**
- [ ] MCP source has no hard-coded `user=` value.
- [ ] MCP propagates the user from the agent's session context.
- [ ] UC4 tour includes a step verifying that the right user is in scope.

**Rationale:**
Multi-tenancy correctness on the shared `light-manager` service.

---

## Epics

Epics are logical groupings of related functionality that will be broken down into user stories during sprint planning (Phase 4). Each epic maps to multiple functional requirements and will generate 2–10 stories. The epic structure mirrors the brief's milestone slicing (M1 foundation → M2 UC1+UC2 → M3 UC3 → M4 UC4) to maximise parallel work between the two developers.

---

### EPIC-001: Repo Foundation & Cross-cutting Conventions

**Description:**
Lock the shared contracts (repo layout, tour schema vendoring, naming conventions, tour content convention, root docs, author dev loop, FastAPI app skeleton) **before** parallel UC work begins. This epic is the M1 milestone deliverable.

**Functional Requirements:**
- FR-001 (Repo structure)
- FR-002 (Tour JSON schema conformance)
- FR-003 (Root docs)
- FR-004 (Local dev/test loop)
- FR-005 (Artemis fil rouge)
- FR-006 (Tour content convention)
- FR-007 (Python FastAPI application convention + `apps/_skeleton/`)

**Story Count Estimate:** 7–10

**Priority:** Must Have

**Business Value:**
Directly mitigates the brief's "collisions Clément ↔ Quentin" risk by locking conventions up front. Authors gain the local kind dev loop and a ready-to-fork FastAPI skeleton here — both compound throughout the project's velocity.

**Suggested Timing & Ownership:** M1 (~2026-05-01), both developers jointly.

---

### EPIC-002: UC1 + UC2 — Single-agent K8s diagnostics

**Description:**
The two lowest-complexity scenarios (single agent, single or few tools, simple symptom). They jointly deliver the first "agent > CLI" demonstration that proves the workshop's value proposition.

**Functional Requirements:**
- FR-008 (UC1 scenario package — ImagePullBackOff)
- FR-009 (UC1 tour)
- FR-010 (UC2 scenario package — Pod Pending / scheduling)
- FR-011 (UC2 tour)

**Story Count Estimate:** 4–6

**Priority:** Must Have

**Business Value:**
First "ah ok, je vois l'intérêt" moment for participants. Proves the agent-vs-CLI value with low integration risk.

**Suggested Timing & Ownership:** M2 (~2026-05-08), parallelised — one UC per developer.

---

### EPIC-003: UC3 — Observability-augmented diagnostics

**Description:**
A scenario where the agent must reach beyond Kube API into Prometheus and Grafana. Showcases kagent's pre-packaged Prom/Graf agents and its native ability to create dashboards on the fly.

**Functional Requirements:**
- FR-012 (UC3 scenario package + Prom/Graf manifests)
- FR-013 (UC3 tour with on-the-fly Grafana dashboard)

**Story Count Estimate:** 3–5

**Priority:** Must Have

**Business Value:**
Demonstrates a class of diagnostics the CLI cannot do without manual dashboard work — the strongest single argument for kagent in production.

**Suggested Timing & Ownership:** M3 (~2026-05-13), single owner; the other developer prepares UC4 in parallel.

---

### EPIC-004: UC4 — Multi-agent coordination + custom MCP

**Description:**
The pedagogical climax. Demonstrates a2a delegation (coordinator delegates to UC1/UC2/UC3 sub-agents on a multi-symptom cluster), custom MCP via KMCP Tools, and integration with the workshop's `light-manager` ecosystem — culminating in the visible "bulbs change color" payoff that anchors the Artemis fil rouge.

**Functional Requirements:**
- FR-014 (UC4 multi-agent coordinator scenario package)
- FR-015 (UC4 tour)
- FR-016 (Custom MCP wrapping light-manager bulbs API)
- FR-017 (Bulb-color-as-diagnosis convention)

**Story Count Estimate:** 5–7

**Priority:** Must Have

**Business Value:**
Demonstrates the full multi-agent + custom-MCP story end-to-end and provides the workshop's visual climax. Highest integration risk in the project (brief risk #1).

**Suggested Timing & Ownership:** M4 (~2026-05-17), both developers jointly.

---

## User Stories (High-Level)

Detailed user stories will be created during sprint planning (Phase 4 — `/bmad:sprint-planning`).

The PRD's FRs are already story-shaped (each FR maps to roughly one story given the per-UC repetitive structure), so high-level story drafting at this stage would duplicate the FR list without adding signal. Sprint planning will break each FR down into the actual implementation tasks (e.g. for FR-008: `write broken Deployment manifest pointing at unpublished tag of the FastAPI app from FR-007`, `write Agent CRD`, `write Tool CRD`, `write README`, `cross-test on kind`, `cross-test by other dev`).

---

## User Personas

### Primary — Workshop Participant (Ops in practice)

A working ops engineer (SRE, platform engineer, or DevOps) attending DevOpsDays Switzerland 2026. Comfortable with Kubernetes via `kubectl`. Limited to no prior experience with LLMs, AI agents, or multi-agent systems. Goals during the workshop:
- Diagnose recurring K8s problems faster, without orchestrating a sequence of `kubectl` commands by hand.
- Form a concrete view of when an agent (and a multi-agent setup) outperforms the CLI, and when it does not.
- Leave with reusable kagent CRD templates and a mental model of agentic debugging patterns applicable to their own cluster.

### Secondary — Workshop Trainer / Maintainer

Clément Raussin and Quentin Rodic, the two developers who will both build and animate the workshop, and will maintain it for future sessions. They are also the two primary repo authors; their needs include parallel development without collisions, a fast local dev loop, and a repo that can be replayed for a follow-up workshop with minimal rework.

---

## User Flows

### Flow A — Participant runs a single UC (UC1 / UC2 / UC3)

1. Participant opens their VS Code server (provisioned upstream by the downstream CI/CD layer).
2. The `workshop-tour` extension is installed and the relevant `tour.json` is open.
3. Participant clicks through the CLI baseline steps — `commands` runs in the integrated terminal, surfacing the broken state via raw `kubectl`.
4. Participant clicks the "Now ask the agent" transition step. The kagent agent is invoked (via the kagent CLI / UI surfaced by a `command` button).
5. Participant observes the agent's synthesised diagnosis in the kagent chat surface.
6. Participant reads the contrast recap step: what the agent did better than the CLI loop.

### Flow B — Participant runs UC4 (multi-agent climax)

Steps 1–3 as Flow A, but on a multi-symptom cluster.
4. Participant clicks "Ask the coordinator" — a single agent invocation.
5. Participant observes the coordinator delegating via a2a to the UC1/UC2/UC3 sub-agents.
6. The coordinator consolidates the three verdicts and calls `update_bulb` on each slot via the custom MCP.
7. Participant sees their three physical/virtual bulbs change color (slot 1/2/3 → red / green / amber per the FR-017 convention).
8. Participant reads the contrast recap: multi-agent collaboration as a single ask.

### Flow C — Author tests a UC locally (FR-004)

1. Author runs `scripts/preflight.sh` to validate Docker / kubectl / kind / kagent CRDs.
2. Author runs `make uc<N>-up` — kind cluster spins up, kagent installs, UC manifests apply, broken state reaches symptom within 60 s.
3. Author exercises the tour by hand (or via a local VS Code instance with the workshop-tour extension).
4. Author tears down via `make uc<N>-down`.

---

## Dependencies

### Internal Dependencies

- **`light-manager` (sibling project)** — UC4 requires the `light-manager` service deployed and reachable on the workshop cluster, exposing its OpenAPI surface (`GET /api/bulbs?user=`, `PUT /api/bulbs/{slot}?user=`). Out-of-scope for this repo to develop, in-scope to integrate against.
- **`workshop-tour` VS Code extension (sibling project)** — supplies the JSON schema (vendored into `schemas/`) that constrains every `tour.json`. Out-of-scope to develop here.
- **Workshop CI/CD layer** — builds container images from this repo, deploys manifests onto each participant's vCluster on AKS, distributes `tour.json` files into each participant's VS Code server, provisions kubeconfig, injects LLM provider credentials. Out-of-scope to develop here; in-scope to ship artefacts that this layer can consume cleanly.

### External Dependencies

- **kagent v0.9.0** (pinned) — `Agent` and `Tool` CRD APIs.
- **KMCP Tools** — used to generate the UC4 custom MCP server.
- **Prometheus and Grafana** (open-source upstream) — for UC3.
- **AKS** — the shared workshop runtime cluster (operationally; the repo stays cluster-agnostic per NFR-006).
- **vCluster** — per-participant cluster slicing on AKS (operationally; transparent to the manifests).
- **An LLM provider** — required by kagent at runtime; choice deferred to architecture phase (open question below).
- **kind** — author local dev loop only (FR-004).

---

## Assumptions

- Each participant arrives at the workshop with a per-participant vCluster on a shared AKS cluster and a per-participant VS Code server already provisioned (workshop CI/CD responsibility, out of repo scope).
- `light-manager` is deployed as a multi-tenant service on the workshop cluster and stable by 2026-05-15. Its OpenAPI surface (`GET /api/bulbs`, `PUT /api/bulbs/{slot}`) is frozen for the workshop window.
- The `workshop-tour` VS Code extension is installed on every participant's VS Code server and its JSON schema is stable for the workshop window.
- Each participant has a stable login (e.g. `participant-01`) used as the `?user=` query parameter for `light-manager`.
- kagent v0.9.0 remains backward-compatible (no breaking changes upstream) until 2026-05-20.
- Participants have access to a working LLM provider via kagent's configuration, injected at deploy time by the CI/CD layer.

---

## Out of Scope

Inherited from the brief, refined here with the AKS-vCluster reframe:

- **Workshop CI/CD layer** — image build, manifest deployment onto the workshop cluster, distribution of `tour.json` into each participant's VS Code server, provisioning of the VS Code server itself, and the vCluster slicing on AKS. The repo produces artefacts; an upstream layer ships them.
- **Workshop runner application** — no first-party UI that interprets `tour.json` and walks participants through it; the `workshop-tour` VS Code extension owns that role.
- **`light-manager` development** — sibling project; this repo only integrates against its API.
- **`workshop-tour` extension development** — sibling project; this repo only conforms to its schema.
- **Cluster provisioning at the participant level** — vCluster on AKS, kubeconfig wiring, namespace setup are handled by the CI/CD layer.
- **Identity/secrets management beyond the minimum** — LLM keys, `light-manager` auth (if any) are injected by the CI/CD layer at deploy time.
- **An "Evicted pods" scenario** — explicitly excluded by the brief.
- **Reinventing kagent's pre-packaged agents** (Prometheus, Grafana, dashboard creation) — reuse only.
- **A participant-facing local kind workflow** — kind only survives as the author dev loop.

---

## Open Questions

- **LLM provider choice** — to be decided in the architecture phase (`/bmad:architecture`). Affects kagent runtime configuration and any per-participant key injection by the CI/CD layer.
- **Exact vCluster slice size on AKS** — NFR-002 sets a 2 vCPU / 4 GiB target per UC (4/8 for UC4). Confirm against actual AKS sizing during architecture.
- **`light-manager` deployment timing on the workshop cluster** — needs a confirmed date ahead of M5 dry-run (2026-05-19) so UC4 integration can be exercised end-to-end.
- **Tour distribution mechanism** — out of repo scope, but the repo's authoring should be informed by how the CI/CD layer picks up tour files (pull from repo at build time? bundled as a VS Code extension companion file? assumed to be a flat-file copy of `uc<N>/tour.json`).
- **Exact workshop date** — the brief targets ~2026-05-20; confirmation needed for M5 freeze.

---

## Approval & Sign-off

### Stakeholders

- **Clément Raussin** (Co-creator, trainer, developer) — Influence: High. Designs, codes, animates.
- **Quentin Rodic** (Co-creator, trainer, developer) — Influence: High. Designs, codes, animates. Works in parallel with Clément on distinct UCs.
- **Workshop participants (DevOpsDays Switzerland 2026 ops audience)** — Influence: Medium. Their feedback defines pedagogical success.
- **`light-manager` project owner** — Influence: Medium. UC4 integration depends on its API and deployment readiness.
- **`workshop-tour` VS Code extension owner** — Influence: Medium. Schema and distribution model owner.
- **kagent upstream (kagent-dev/kagent)** — Influence: Low. Technical dependency; we follow their API at v0.9.0 without direct interaction.

### Approval Status

- [ ] Product Owner
- [ ] Engineering Lead
- [ ] Design Lead (n/a — no UI design surface in this repo)
- [ ] QA Lead

---

## Revision History

| Version | Date       | Author        | Changes      |
|---------|------------|---------------|--------------|
| 1.0     | 2026-04-27 | Quentin Rodic | Initial PRD. |

---

## Next Steps

### Phase 3: Architecture

Run `/bmad:architecture` to create the system architecture based on these requirements. The architecture will address:
- All functional requirements (FRs) — agent CRD shapes per UC, tool selection, sub-agent wiring, MCP scaffolding.
- All non-functional requirements (NFRs) — vCluster sizing, kagent v0.9.0 compatibility, tour schema vendoring, secret-injection boundaries.
- Technical stack decisions — LLM provider, KMCP Tools usage pattern, Prom/Graf install footprint.
- Data models and APIs — bulb-color convention, MCP tool surface, tour JSON conventions per UC.
- System components — repo layout details, build pipeline expectations, integration with the downstream CI/CD layer.

### Phase 4: Sprint Planning

After architecture is complete, run `/bmad:sprint-planning` to:
- Break epics into detailed user stories.
- Estimate story complexity.
- Plan sprint iterations against the M1 → M5 milestones.
- Begin implementation.

---

**This document was created using BMAD Method v6 — Phase 2 (Planning).**

*To continue: run `/bmad:workflow-status` to see your progress and next recommended workflow.*

---

## Appendix A: Requirements Traceability Matrix

| Epic ID  | Epic Name                                  | Functional Requirements                                | Story Count (Est.) |
|----------|--------------------------------------------|--------------------------------------------------------|--------------------|
| EPIC-001 | Repo Foundation & Cross-cutting            | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007 | 7–10               |
| EPIC-002 | UC1 + UC2 — Single-agent K8s diagnostics   | FR-008, FR-009, FR-010, FR-011                         | 4–6                |
| EPIC-003 | UC3 — Observability-augmented diagnostics  | FR-012, FR-013                                         | 3–5                |
| EPIC-004 | UC4 — Multi-agent + custom MCP             | FR-014, FR-015, FR-016, FR-017                         | 5–7                |

---

## Appendix B: Prioritization Details

### Functional Requirements

| Priority    | Count |
|-------------|------:|
| Must Have   | 16    |
| Should Have | 1     |
| Could Have  | 0     |
| Won't Have  | 0     |
| **Total**   | **17** |

The single Should-priority FR is FR-004 (local dev/test loop), which is an authoring convenience rather than a participant-facing capability — it can be deferred without affecting workshop delivery, but its absence would slow author iteration noticeably.

### Non-Functional Requirements

| Priority    | Count |
|-------------|------:|
| Must Have   | 10    |
| Should Have | 1     |
| Could Have  | 0     |
| Won't Have  | 0     |
| **Total**   | **11** |

The single Should-priority NFR is NFR-004 (idempotent re-apply), which is operational quality-of-life rather than a workshop-blocker.

### Story-count sizing note

Total estimated story count across all four epics is 19–28, which sits past the Level 2 nominal range (5–15). The structural complexity remains Level 2 (small team, short timeline, no formal architecture phase needed beyond kagent CRD design). The high count is an artefact of the natural FR-to-story 1:1 mapping for the repetitive per-UC structure (FastAPI app variant, manifests, CRDs, tour, README) — most stories will be small. Project level is therefore left at 2.
