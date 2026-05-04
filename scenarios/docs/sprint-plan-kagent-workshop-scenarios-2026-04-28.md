# Sprint Plan: kagent-workshop-scenarios

**Date:** 2026-04-28
**Scrum Master:** Quentin Rodic
**Project Level:** 2
**Total Stories:** 29
**Total Points:** 89
**Planned Sprints:** 5 (milestone-aligned, M1 → M5)
**Workshop date:** 2026-05-20

---

## Executive Summary

Five short milestone-aligned sprints (M1 → M5) take the repo from empty to dry-run-ready over the 22 calendar days between 2026-04-28 and 2026-05-19. Sprints map 1:1 to the milestones already locked in the product brief and PRD, so this plan is a refinement of that schedule — not a new one. The structure deliberately front-loads shared conventions in M1 to remove every collision opportunity before parallel work starts (NFR-008).

**Key Metrics:**
- Total Stories: 29
- Total Points: 89
- Sprints: 5
- Aggregate Team Capacity: ~111 points across all five sprints (80% utilization)
- Target Completion: 2026-05-19 (M5 freeze) — workshop 2026-05-20

---

## Team & Capacity Model

**Team:**
- Clément Raussin (senior) — default UC ownership: UC1, UC3 (per brief)
- Quentin Rodic (senior) — default UC ownership: UC2, UC4 prep (per brief)
- M1, M4, M5 are joint by both developers.

**Productivity assumptions:** 6 productive hours/day per developer, senior calibration of 2 hours per story point.

**Per-sprint capacity:** computed in each sprint section below from `developers × workdays × 6h ÷ 2h-per-pt`.

---

## Story Inventory

> Stories are grouped by sprint/milestone. Acceptance criteria below are the **story-level** AC; the canonical FR-level AC stays in the PRD. Owners are the brief's default and can be re-assigned in standup without rewriting the plan.

---

### Sprint 1 / M1 — Repo Foundation & Cross-cutting Conventions

#### STORY-001: Initialize repo skeleton (UC folders + shared dirs)

**Epic:** EPIC-001 · **FR:** FR-001 · **Priority:** Must · **Points:** 1 · **Owner:** joint

**User story:** As a workshop author, I want the empty UC folders and shared directories in place so my next commit lands in the right shape.

**AC:**
- [ ] `uc1/`, `uc2/`, `uc3/`, `uc4/`, `apps/`, `infra/`, `mcp/`, `schemas/`, `scripts/`, `docs/` exist with `.gitkeep` placeholders.
- [ ] `.gitignore` covers `.env*`, `kubeconfig*`, `__pycache__/`, `*.pyc`, `node_modules/`, `*.tsbuildinfo`.
- [ ] No code in any UC folder yet.

**Deps:** none.

---

#### STORY-002: Vendor `workshop-tour` schema + `make validate-tours`

**Epic:** EPIC-001 · **FR:** FR-002 · **NFR:** NFR-005 · **Priority:** Must · **Points:** 2 · **Owner:** joint

**AC:**
- [ ] `schemas/workshop-tour.schema.json` copied verbatim from the sibling `workshop-tour` extension repo, with the source commit hash recorded in `schemas/README.md`.
- [ ] `make validate-tours` runs `ajv-cli` (or equivalent) over every `uc<N>/tour.json`; exits non-zero on schema violations.
- [ ] Target wired into a draft GitHub Actions workflow (CI hook stub).

**Deps:** STORY-001.

---

#### STORY-003: Vendor kagent v0.9.0 CRDs + `make lint-agents`

**Epic:** EPIC-001 · **NFR:** NFR-005 · **Priority:** Must · **Points:** 2 · **Owner:** joint

**AC:**
- [ ] `schemas/kagent/` contains the v0.9.0 CRD bundle (or a pinned reference resolved at lint time).
- [ ] `make lint-agents` validates every `uc<N>/agents/*.yaml` against the vendored bundle.
- [ ] Target wired into the CI hook stub.

**Deps:** STORY-001.

---

#### STORY-004: Root `README.md` (overview, prereqs, kagent install, UC index, lore index, distribution note, author dev-loop section)

**Epic:** EPIC-001 · **FR:** FR-003 · **Priority:** Must · **Points:** 3 · **Owner:** joint

**AC:** all FR-003 AC met; internal links resolve; author-only sections clearly marked.

**Deps:** STORY-001.

---

#### STORY-005: Author dev loop (`scripts/preflight.sh`, kind config, per-UC `make uc<N>-up`/`down`)

**Epic:** EPIC-001 · **FR:** FR-004 · **Priority:** Should · **Points:** 5 · **Owner:** joint

**AC:** all FR-004 AC met.

**Deps:** STORY-003 (needs the kagent CRDs available locally).

---

#### STORY-006: Artemis fil rouge — naming convention doc + lore index

**Epic:** EPIC-001 · **FR:** FR-005 · **Priority:** Must · **Points:** 2 · **Owner:** joint

**AC:**
- [ ] Root README "Artemis lore index" section drafted.
- [ ] `docs/artemis-naming.md` lists the canonical resource-name vocabulary (e.g. `mission-control`, `lunar-rover-telemetry`, `mission-coordinator`) and the per-UC narrative beat.

**Deps:** STORY-004.

---

#### STORY-007: Tour content convention doc (CLI baseline → agent → contrast)

**Epic:** EPIC-001 · **FR:** FR-006 · **Priority:** Must · **Points:** 1 · **Owner:** joint

**AC:**
- [ ] `docs/tour-content-conventions.md` documents the 3-beat structure with one example step per beat.
- [ ] Convention referenced from each UC's tour story AC.

**Deps:** STORY-004.

---

#### STORY-008: `apps/_skeleton/` (FastAPI 3.12 + uvicorn + slim Dockerfile + pyproject)

**Epic:** EPIC-001 · **FR:** FR-007 · **Priority:** Must · **Points:** 3 · **Owner:** joint

**AC:**
- [ ] `apps/_skeleton/main.py` exposes `/healthz`.
- [ ] Multi-stage `Dockerfile` produces an x86-64 image ≤ 200 MB compressed.
- [ ] `pyproject.toml` pins Python 3.12 and FastAPI ≥ 0.115.
- [ ] `apps/_skeleton/README.md` says "copy this directory to start a new app".

**Deps:** STORY-001.

---

#### STORY-009: `apps/mission-control/` variant (UC1 + UC2 baseline)

**Epic:** EPIC-001 · **FR:** FR-007 · **Priority:** Must · **Points:** 1 · **Owner:** joint

**AC:**
- [ ] Forked from `_skeleton/`, identity set to `mission-control`.
- [ ] `apps/README.md` updated with UC ↔ variant mapping (UC1, UC2 → `mission-control`).

**Deps:** STORY-008.

---

#### STORY-010: `apps/lunar-rover-telemetry/` variant (UC3 + UC4 OOM source) with `/leak` and `/metrics`

**Epic:** EPIC-001 · **FR:** FR-007 · **Priority:** Must · **Points:** 3 · **Owner:** joint

**AC:**
- [ ] `/leak` (POST) appends 1 MiB to a module-global list per call and returns the new size.
- [ ] `/metrics` exposes the Prometheus text format via `prometheus-fastapi-instrumentator`.
- [ ] Local sanity test: ~70 calls to `/leak` push RSS over 64 MiB.
- [ ] `apps/README.md` updated with UC ↔ variant mapping (UC3, UC4 → `lunar-rover-telemetry`).

**Deps:** STORY-008.

---

#### STORY-011: `CODEOWNERS` + secret-scan + manifest-lint CI hooks

**Epic:** EPIC-001 · **NFR:** NFR-008, NFR-006, NFR-011 · **Priority:** Must · **Points:** 3 · **Owner:** joint

**AC:**
- [ ] Root `CODEOWNERS`: `uc<N>/` → single owner per the agreed UC assignment; shared dirs → both authors.
- [ ] `gitleaks` (or equivalent) wired into the CI hook stub.
- [ ] `make lint-manifests` runs `kubectl apply --dry-run=client -f uc<N>/manifests/` across UCs.

**Deps:** STORY-001.

---

**M1 totals:** 11 stories · 26 points · capacity 30 (2 devs × 5 d × 6 h ÷ 2 h/pt).

**Sprint 1 goal:** "Lock the conventions before parallel UC work starts: schemas vendored, FastAPI skeleton + variants ready, author dev loop functional, root docs and CODEOWNERS in place."

**Risks:** STORY-005 (author dev loop) is the single 5-pt story this sprint and the only one with infrastructure risk (kagent v0.9 install on kind). Mitigation: do it day 1–2 so any kagent-on-kind surprises surface early.

---

### Sprint 2 / M2 — UC1 + UC2 in Parallel

#### STORY-012: UC1 broken-state manifests + agent CRDs

**Epic:** EPIC-002 · **FR:** FR-008 · **NFR:** NFR-001, NFR-003, NFR-005, NFR-006 · **Priority:** Must · **Points:** 5 · **Owner:** Clément

**AC:**
- [ ] `uc1/manifests/` — namespace, Deployment referencing `mission-control:v999` (unpublished tag), Service. `kubectl apply` produces ImagePullBackOff in ≤ 60 s on kind.
- [ ] `uc1/agents/` — `Agent` + `Tool` + `ModelConfig` CRDs at kagent v0.9.0; tool set scoped to `kubectl get/describe pod` and `get events` only.
- [ ] All resource names follow Artemis naming.
- [ ] `make lint-manifests` and `make lint-agents` clean.

**Deps:** STORY-009 (mission-control variant), STORY-006 (Artemis naming).

---

#### STORY-013: UC1 `tour.json` (CLI baseline → agent → contrast)

**Epic:** EPIC-002 · **FR:** FR-009 · **NFR:** NFR-009, NFR-010 · **Priority:** Must · **Points:** 3 · **Owner:** Clément

**AC:**
- [ ] Validates against `schemas/workshop-tour.schema.json` (`make validate-tours` clean).
- [ ] Implements the FR-006 3-beat structure.
- [ ] Includes at least one `fileEdits.create` step that writes `uc1/manifests/deployment.yaml`.
- [ ] `id`: `kagent-uc1-imagepullbackoff`.

**Deps:** STORY-007, STORY-012.

---

#### STORY-014: UC1 README + cross-author repro

**Epic:** EPIC-002 · **FR:** FR-008 · **NFR:** NFR-003 · **Priority:** Must · **Points:** 2 · **Owner:** Clément

**AC:**
- [ ] `uc1/README.md` describes the bug, the expected agent diagnosis, and the Artemis narrative wrapper.
- [ ] Quentin runs the UC1 reproduction checklist 1× on a fresh kind and signs off in the PR description.

**Deps:** STORY-012, STORY-013.

---

#### STORY-015: UC2 broken-state manifests (Deployment + bootstrap taint Job + Service) + agent CRDs

**Epic:** EPIC-002 · **FR:** FR-010 · **NFR:** NFR-001, NFR-003, NFR-004, NFR-005, NFR-006 · **Priority:** Must · **Points:** 5 · **Owner:** Quentin

**AC:**
- [ ] `uc2/manifests/` produces a `Pending` pod in ≤ 60 s on kind, with the `0/1 nodes are available: untolerated taint` event.
- [ ] Bootstrap `Job` applies the synthetic taint via `kubectl taint --overwrite` (idempotent).
- [ ] `uc2/agents/` — Agent + Tool with multi-tool reach (pod, node, taints, events).
- [ ] `make lint-manifests`, `make lint-agents` clean; double-apply succeeds.

**Deps:** STORY-009 (mission-control variant), STORY-006.

---

#### STORY-016: UC2 `tour.json` (≥ 3 distinct kubectl commands in CLI baseline)

**Epic:** EPIC-002 · **FR:** FR-011 · **Priority:** Must · **Points:** 3 · **Owner:** Quentin

**AC:**
- [ ] Validates against schema.
- [ ] Implements the FR-006 convention.
- [ ] CLI baseline section contains ≥ 3 distinct kubectl commands (per FR-011 AC).
- [ ] `id`: `kagent-uc2-pod-pending`.

**Deps:** STORY-007, STORY-015.

---

#### STORY-017: UC2 README + cross-author repro

**Epic:** EPIC-002 · **FR:** FR-010 · **NFR:** NFR-003 · **Priority:** Must · **Points:** 2 · **Owner:** Quentin

**AC:**
- [ ] `uc2/README.md` documents the scheduling-failure root cause and Artemis narrative.
- [ ] Clément runs the UC2 reproduction checklist 1× on a fresh kind and signs off in the PR description.

**Deps:** STORY-015, STORY-016.

---

**M2 totals:** 6 stories · 20 points · capacity 30 (2 devs × 5 d × 6 h ÷ 2 h/pt) — 67% utilization, leaves comfortable buffer for kagent CRD shape surprises on first real use.

**Sprint 2 goal:** "Deliver UC1 and UC2 in parallel — first two reproducible scenarios + tours + cross-author signed reproductions."

**Risks:** First time touching kagent v0.9.0 `Agent`/`Tool` CRD shapes for real. Mitigation: deliberate buffer (10 pts unused capacity); if CRD shape needs research, that lives inside STORY-012/STORY-015.

---

### Sprint 3 / M3 — UC3 (Observability) + UC4 Preparation in Parallel

#### STORY-018: `infra/observability/` Prom + Graf manifest bundle

**Epic:** EPIC-003 · **FR:** FR-012 · **NFR:** NFR-002, NFR-006 · **Priority:** Must · **Points:** 5 · **Owner:** Clément

**AC:**
- [ ] Prometheus single-replica Deployment + ClusterIP Service (port 9090) + scrape config picking up Services labelled `monitoring=prom`.
- [ ] Grafana single-replica Deployment + ClusterIP Service (port 3000) + pre-wired Prom data source via ConfigMap.
- [ ] `infra/observability/kustomization.yaml` aggregates the manifests.
- [ ] `kubectl top` after deploy: stack < 1 GiB on kind.
- [ ] `make lint-manifests` clean.

**Deps:** STORY-001, STORY-006.

---

#### STORY-019: UC3 broken-state manifests + agent CRDs

**Epic:** EPIC-003 · **FR:** FR-012 · **NFR:** NFR-001, NFR-003 · **Priority:** Must · **Points:** 5 · **Owner:** Clément

**AC:**
- [ ] `uc3/manifests/` — Deployment runs `lunar-rover-telemetry` with `resources.limits.memory: 64Mi`. Service labelled `monitoring=prom` so Prom auto-scrapes.
- [ ] After deploy + ~70 calls to `/leak`, kubelet reports `OOMKilled` in ≤ 60 s.
- [ ] `uc3/agents/` — Agent CRD wires kagent's pre-packaged Prometheus + Grafana agents and a K8s read tool. **No custom Prom/Graf agent.**

**Deps:** STORY-010 (lunar-rover-telemetry app), STORY-018, STORY-006.

---

#### STORY-020: UC3 `tour.json` (leak loop, agent dashboard creation, dashboard URL surfacing)

**Epic:** EPIC-003 · **FR:** FR-013 · **Priority:** Must · **Points:** 3 · **Owner:** Clément

**AC:**
- [ ] Validates against schema.
- [ ] Implements the FR-006 convention.
- [ ] Includes the `/leak` loop step that triggers the OOM (curl/`kubectl exec` loop).
- [ ] Captures and surfaces the Grafana dashboard URL returned by the agent (per FR-013 AC).
- [ ] `id`: `kagent-uc3-oom-killed`.

**Deps:** STORY-007, STORY-019.

---

#### STORY-021: UC3 README + cross-author repro

**Epic:** EPIC-003 · **FR:** FR-012 · **NFR:** NFR-003 · **Priority:** Must · **Points:** 2 · **Owner:** Clément

**AC:**
- [ ] `uc3/README.md` documents the bug, the Prom/Graf prerequisite, the agent diagnostic flow, the Artemis narrative, and the "this is not how you'd run Prom in production" disclaimer.
- [ ] Quentin runs UC3 reproduction once on fresh kind and signs off.

**Deps:** STORY-019, STORY-020.

---

#### STORY-022: KMCP-Tools-generated MCP source + tenancy guard + Pydantic shape tests

**Epic:** EPIC-004 · **FR:** FR-016 · **NFR:** NFR-012 · **Priority:** Must · **Points:** 5 · **Owner:** Quentin (UC4 prep, runs in parallel with Clément on UC3)

**AC:**
- [ ] `mcp/` contains the KMCP-Tools-generated server source with `kmcp.yaml` declarative config.
- [ ] Tools `list_bulbs(user)` and `update_bulb(user, slot, r, g, b)` shadow `BulbRead`/`BulbUpdate` shapes from `light-manager`.
- [ ] Tenancy guard: rejects every call where `user != $WORKSHOP_PARTICIPANT_LOGIN`; no hard-coded `user=`.
- [ ] Unit tests cover happy path, slot validation (1–3), RGB validation (0–255), tenancy mismatch.

**Deps:** STORY-001.

---

#### STORY-023: MCP packaging — Dockerfile + per-vCluster manifests + `ToolServer` CRD

**Epic:** EPIC-004 · **FR:** FR-016 · **NFR:** NFR-002, NFR-006 · **Priority:** Must · **Points:** 3 · **Owner:** Quentin (UC4 prep, parallel with UC3)

**AC:**
- [ ] `mcp/Dockerfile` (`python:3.12-slim`, multi-stage).
- [ ] `mcp/manifests/deployment.yaml` reads `WORKSHOP_PARTICIPANT_LOGIN` and `LIGHT_MANAGER_URL` from env (Secret/ConfigMap refs, no committed values).
- [ ] `mcp/manifests/service.yaml` ClusterIP exposing the MCP HTTP/SSE port.
- [ ] `mcp/manifests/toolserver.yaml` kagent v0.9 `ToolServer` pointing at the Service.
- [ ] `make lint-manifests` and `make lint-agents` clean.

**Deps:** STORY-022, STORY-003.

---

**M3 totals:** 6 stories · 23 points · capacity 30 (2 devs × 5 d × 6 h ÷ 2 h/pt; effectively split — Clément 15 pts on UC3, Quentin 8 pts on UC4 prep).

**Sprint 3 goal:** "Deliver UC3 with on-the-fly Grafana dashboard, and unblock UC4 by completing the MCP source and packaging in parallel."

**Risks:** Two — (a) kagent's pre-packaged Prom/Graf agents may have a different CRD shape than vanilla `Agent` references; (b) KMCP Tools quirks. Mitigation: STORY-018 lands first on Clément's side and STORY-022 first on Quentin's side, both day 1–2.

---

### Sprint 4 / M4 — UC4 Multi-Agent Coordination

#### STORY-024: UC4 multi-symptom manifests (3 Deployments, single namespace)

**Epic:** EPIC-004 · **FR:** FR-014 · **NFR:** NFR-001, NFR-002, NFR-003 · **Priority:** Must · **Points:** 3 · **Owner:** joint

**AC:**
- [ ] `uc4/manifests/` deploys an ImagePullBackOff Deployment (`mission-control:v999`), a Pending Deployment (`mission-control:v1` + UC2 taint overlay), and an OOM-prone Deployment (`lunar-rover-telemetry:v1` + 64Mi limit) in a single namespace.
- [ ] All three symptoms reproduce simultaneously in ≤ 60 s on a fresh kind (with the leak loop triggered by the tour for the OOM one).
- [ ] No new app source under `uc4/` (per FR-014 AC).

**Deps:** STORY-012, STORY-015, STORY-019 (image-tag references).

---

#### STORY-025: UC4 coordinator `Agent` CRD with a2a delegation

**Epic:** EPIC-004 · **FR:** FR-014, FR-017 · **NFR:** NFR-005 · **Priority:** Must · **Points:** 5 · **Owner:** joint (highest implementation risk)

**AC:**
- [ ] Coordinator `Agent` CRD `artemis-mission-coordinator` references the UC1, UC2, UC3 sub-Agents for a2a delegation.
- [ ] Coordinator references the MCP `ToolServer` from STORY-023.
- [ ] Coordinator system prompt encodes:
  - Slot 1 ↔ UC1 verdict, Slot 2 ↔ UC2, Slot 3 ↔ UC3.
  - Verdict → colour code: green `(0,255,0)`, red `(255,0,0)`, amber `(255,191,0)`.
  - Always pass `user="${WORKSHOP_PARTICIPANT_LOGIN}"` to MCP calls.
- [ ] `make lint-agents` clean.

**Deps:** STORY-012, STORY-015, STORY-019, STORY-023.

---

#### STORY-026: UC4 `tour.json` (single coordinator ask → a2a → bulbs change)

**Epic:** EPIC-004 · **FR:** FR-015 · **NFR:** NFR-009, NFR-010, NFR-012 · **Priority:** Must · **Points:** 3 · **Owner:** joint

**AC:**
- [ ] Validates against schema.
- [ ] Implements the FR-006 convention.
- [ ] Single "Ask the coordinator" step is the climax (one agent invocation triggers a2a fan-out).
- [ ] Includes a step that demonstrates the bulb colour change as the diagnosis output.
- [ ] References the participant's `?user=<login>` in copy (per FR-015 AC) so the tenancy guarantee is visible.
- [ ] `id`: `kagent-uc4-coordinator`.

**Deps:** STORY-007, STORY-024, STORY-025.

---

#### STORY-027: UC4 README (slot/colour mapping, coordination flow) + cross-author repro

**Epic:** EPIC-004 · **FR:** FR-014, FR-017 · **NFR:** NFR-003 · **Priority:** Must · **Points:** 3 · **Owner:** joint

**AC:**
- [ ] `uc4/README.md` documents the slot ↔ sub-agent mapping and the colour ↔ verdict semantic.
- [ ] Coordination flow diagram or text walkthrough included.
- [ ] Both Clément and Quentin run the UC4 reproduction once on fresh kind and sign off.

**Deps:** STORY-024, STORY-025, STORY-026.

---

**M4 totals:** 4 stories · 14 points · capacity 24 (2 devs × 4 d × 6 h ÷ 2 h/pt) — 58% utilization. The deliberate buffer is for kagent a2a wiring iteration (architecture flagged this as the highest implementation risk) and for the live light-manager integration test.

**Sprint 4 goal:** "Deliver UC4 — multi-symptom cluster, a2a coordinator, custom MCP integrated end-to-end, bulbs visibly change colour."

**Risks:** A2A delegation in kagent v0.9.0 has the highest unknown content. Mitigation: M3 already burned down most of the MCP risk in STORY-022/023; the architectural open issue "kagent v0.9.0 multi-agent (a2a) wiring shape" should be closed in this sprint by STORY-025. If the wiring proves harder than 5 pts, the brief's documented fallback ("version dégradée avec moins de sous-agents si serré") applies — drop one sub-agent rather than slip the workshop.

---

### Sprint 5 / M5 — Dry-Run + Freeze

#### STORY-028: Full dry-run end-to-end on a workshop-shaped cluster

**Priority:** Must · **NFR:** NFR-003, NFR-010 · **Points:** 3 · **Owner:** joint

**AC:**
- [ ] Both authors run the four tours end-to-end on a single shared cluster (kind acceptable if `workshop-infrastructure` cannot provide a vCluster slice in time).
- [ ] All 4 reproduction checklists pass; results recorded in `docs/dry-run-2026-05-19.md`.
- [ ] Any blocker → triggers STORY-029.

**Deps:** STORY-014, STORY-017, STORY-021, STORY-027.

---

#### STORY-029: M5 corrections + freeze

**Priority:** Must · **Points:** 3 (buffer) · **Owner:** joint

**AC:**
- [ ] Any blocker found in STORY-028 patched.
- [ ] No commits to UC manifests, CRDs, or tours after the freeze (only docs typo fixes).
- [ ] `git tag workshop-2026-05-20-freeze`.

**Deps:** STORY-028.

---

**M5 totals:** 2 stories · 6 points · capacity 12 (2 devs × 2 d × 6 h ÷ 2 h/pt) — deliberate 50% buffer for last-minute corrections.

**Sprint 5 goal:** "Lock the artefacts: end-to-end dry-run signed off by both authors, blockers patched, repo tagged for the workshop."

---

## Epic Traceability

| Epic ID  | Epic Name                                | Stories                                         | Points | Sprint(s) |
|----------|------------------------------------------|-------------------------------------------------|-------:|-----------|
| EPIC-001 | Repo Foundation & Cross-cutting          | STORY-001 → STORY-011                           | 26     | 1         |
| EPIC-002 | UC1 + UC2 Single-agent K8s Diagnostics   | STORY-012 → STORY-017                           | 20     | 2         |
| EPIC-003 | UC3 Observability-augmented Diagnostics  | STORY-018 → STORY-021                           | 15     | 3         |
| EPIC-004 | UC4 Multi-agent + Custom MCP             | STORY-022, STORY-023 (M3) + STORY-024 → 027 (M4)| 22     | 3 → 4     |
| —        | Dry-run + Freeze                         | STORY-028, STORY-029                            | 6      | 5         |
|          | **Total**                                |                                                 | **89** |           |

---

## Functional Requirements Coverage

| FR ID  | FR Name                                      | Story / Stories            | Sprint |
|--------|----------------------------------------------|----------------------------|-------:|
| FR-001 | Repo structure                               | STORY-001                  | 1      |
| FR-002 | Tour JSON schema conformance                 | STORY-002, all UC tours    | 1, 2–4 |
| FR-003 | Root documentation                           | STORY-004, STORY-006       | 1      |
| FR-004 | Local dev/test loop                          | STORY-005                  | 1      |
| FR-005 | Artemis fil rouge                            | STORY-006, all UC stories  | 1, 2–4 |
| FR-006 | Tour content convention                      | STORY-007, all UC tours    | 1, 2–4 |
| FR-007 | FastAPI app convention                       | STORY-008, 009, 010        | 1      |
| FR-008 | UC1 scenario package                         | STORY-012, STORY-014       | 2      |
| FR-009 | UC1 tour                                     | STORY-013                  | 2      |
| FR-010 | UC2 scenario package                         | STORY-015, STORY-017       | 2      |
| FR-011 | UC2 tour                                     | STORY-016                  | 2      |
| FR-012 | UC3 scenario package + Prom/Graf             | STORY-018, STORY-019, 021  | 3      |
| FR-013 | UC3 tour with on-the-fly dashboard           | STORY-020                  | 3      |
| FR-014 | UC4 multi-agent coordinator package          | STORY-024, STORY-025, 027  | 4      |
| FR-015 | UC4 tour                                     | STORY-026                  | 4      |
| FR-016 | Custom MCP wrapping bulbs API                | STORY-022, STORY-023       | 3      |
| FR-017 | Bulb-colour-as-diagnosis convention          | STORY-025, STORY-027       | 4      |

All 17 FRs covered. NFR coverage verified in the architecture document; this plan adds NFR-003 cross-author reproduction sign-off as an explicit AC on every UC README story.

---

## Risks & Mitigation

**High:**
- **kagent v0.9.0 a2a wiring shape unknown** — STORY-025 carries the spike. Mitigation: STORY-022/023 in M3 already exercise the kagent CRD surface so M4 starts informed; brief's "drop one sub-agent" fallback ready if 5 pts is short.
- **light-manager not deployed in time for end-to-end UC4 test** — UC4 cannot dry-run without it. Mitigation: confirm light-manager workshop-cluster deployment date by 2026-05-15; if slipped, M4 adds a stub light-manager (committed only on a non-shipped branch) so MCP wiring can be exercised; documented in architecture's open issues.

**Medium:**
- **KMCP Tools API drift** — STORY-022 pins the version in `mcp/kmcp.yaml`; if a breaking change lands during dev, pin tighter or vendor.
- **kagent's pre-packaged Prom/Graf agent CRDs may have a different shape than expected** — STORY-018/019 surface this; mitigation = day-1–2 spike in M3.
- **Cross-author bandwidth in M1** — both devs jointly + 26 pts is tight. Mitigation: STORY-005 (heaviest) gets one owner; everyone else can pair.

**Low:**
- **kind ↔ vCluster runtime drift** — manifests are vanilla K8s ≥ 1.28 (NFR-006), but a residual risk that something works on kind and not on vCluster. M5 dry-run on a vCluster slice (if available) catches this.

---

## Dependencies

**External (in-scope to integrate, out-of-scope to develop):**
- `light-manager` deployed and reachable on the workshop cluster by 2026-05-15 (UC4 only).
- `workshop-tour` VS Code extension JSON schema stable (consumed via `schemas/`).
- `workshop-infrastructure` to be ready by M5 to deploy artefacts onto a vCluster slice for the dry-run; if not, dry-run runs on kind.
- KMCP Tools available and pinned for STORY-022.
- LLM provider credentials injected by `workshop-infrastructure` before any agent invocation in the dry-run.

**Internal:**
- Sprint 1 deliverables block all UC sprints.
- Sprint 2 + Sprint 3 (UC1/2/3 sub-agents) block STORY-025 (UC4 coordinator).

---

## Definition of Done (per story)

- [ ] Code committed to a feature branch and PR opened.
- [ ] `make validate-tours`, `make lint-manifests`, `make lint-agents` clean (whichever apply).
- [ ] PR reviewed by the **other** author (NFR-008).
- [ ] Cross-author reproduction signed off in PR description for every UC manifest/tour story (NFR-003).
- [ ] Per-UC README updated.
- [ ] `gitleaks` clean (NFR-011).
- [ ] No `:latest` image tags introduced (NFR-005).

---

## Sprint Cadence

| Sprint | Milestone | Calendar window               | Workdays | Goal                                          |
|--------|-----------|-------------------------------|---------:|-----------------------------------------------|
| 1      | M1        | 2026-04-28 → 2026-05-01       | 4–5      | Foundation & conventions                      |
| 2      | M2        | 2026-05-04 → 2026-05-08       | 5        | UC1 + UC2 in parallel                         |
| 3      | M3        | 2026-05-11 → 2026-05-13       | 3        | UC3 + UC4 prep in parallel                    |
| 4      | M4        | 2026-05-13 → 2026-05-17       | 4        | UC4 climax wired end-to-end                   |
| 5      | M5        | 2026-05-18 → 2026-05-19       | 2        | Dry-run + freeze                              |
| —      | Workshop  | **2026-05-20**                |          | Live.                                         |

Sprint windows assume normal Mon–Fri; if M3 needs more time it borrows from M4's front (M3/M4 are sized to fit if M3 spills 1 day).

---

## Next Steps

**Immediate:** Begin Sprint 1.

```
/bmad:create-story STORY-001    # generates a detailed story doc, or
/bmad:dev-story STORY-001       # opens a dev session on STORY-001
```

Recommended order for Sprint 1: STORY-001 → STORY-002 + STORY-003 + STORY-008 (parallelisable) → STORY-009 → STORY-010 → STORY-005 (heaviest, day 1–2) → STORY-004 + STORY-006 + STORY-007 + STORY-011 (all small, end of sprint).

---

**This plan was created using BMAD Method v6 — Phase 4 (Implementation Planning).**
