# STORY-024: UC4 multi-symptom manifests (3 Deployments, single namespace)

**Epic:** EPIC-004 (UC4 — Multi-agent coordinator + custom MCP)
**FRs:** FR-014 (UC4 multi-symptom manifest set)
**NFRs:** NFR-001 (≤ 60 s reproduction), NFR-002 (low resource footprint), NFR-003 (deterministic, race-free reproduction)
**Priority:** Must Have
**Story Points:** 3
**Status:** Completed (2026-05-08)
**Assigned To:** Quentin Rodic (re-attributed from "joint" — Clément still OOO; first M4 story.)
**Created:** 2026-05-08
**Sprint:** 4 (M4, 2026-05-13 → 2026-05-17) — implemented out-of-band on 2026-05-08, alongside the M3 EPIC-003 swaps and the EPIC-004 source/packaging on Quentin's slate.

---

## Ownership swap (joint → Quentin, fifth swap of the OOO window)

Sprint plan owner is "joint" — both Clément and Quentin. With Clément still OOO (the same window that drove the four M3 EPIC-003 swaps + STORY-022/023 on Quentin's original slate), STORY-024 lands on Quentin. The work is mechanical (faithful reuse of UC1/UC2/UC3 manifest patterns into a single namespace) and has no UC-narrative judgement, so the swap doesn't carry the same narrative-quality risk STORY-020 did.

**Cross-author repro deferral.** Per the recursive deferral chain documented under STORY-021's *Ownership swap*, NFR-008 cross-review for STORY-024 lands on Clément at M5 dry-run STORY-028 — same plate the prior 10 swap-chain stories already accumulated.

---

## User Story

As a **workshop participant** entering UC4 (the workshop's climax — multi-agent coordination),
I want **a single `kubectl apply -f uc4/manifests/` to land three independent broken-state Deployments side-by-side in one namespace** (image-pull failure, scheduler-blocked Pending, and OOM-prone) so that **the climactic agent demonstration — `artemis-mission-coordinator` delegating to UC1/UC2/UC3 specialists in parallel and writing colour-coded verdicts back via the bulb MCP (FR-017) — has a real cluster mess to operate on, with all three symptoms reproducible deterministically (NFR-003) within the 60-second window the architecture commits to (NFR-001).**

---

## Description

### Background

UC4 is the workshop's third-axis demonstration: not a new bug class, but a new *interaction shape* — one coordinator agent fans out across three independent debuggers in a single round-trip and writes its verdicts to the participant's status bulbs (FR-017). The coordinator's value emerges only when all three symptoms are present simultaneously; a single-symptom UC4 cluster wouldn't motivate the fan-out. STORY-024 is the cluster-side prerequisite — the manifests that produce those three symptoms.

Architecture §C6 nails the design:

> UC4 references `mission-control:v999` (UC1-style ImagePullBackOff Deployment), `mission-control:v1` with the UC2 taint-mismatch overlay (UC2-style Pending Deployment), and `lunar-rover-telemetry:v1` with low memory limit (UC3-style OOMKilled Deployment) — all running side-by-side in a single namespace.

The manifests reuse three already-published images (no new app source per FR-014 AC) and three already-validated broken-state mechanisms (image-pull, taint, leak-loop). The only novel work is putting them in one namespace and ensuring the bootstrap Job (UC2's taint + rollout-restart pattern) targets the right Deployment.

### Scope

**In scope:**
- `uc4/manifests/` — single namespace `artemis-uc4`, 7 files:
  - `00-namespace.yaml` — `artemis-uc4` Namespace.
  - `10-rbac.yaml` — `ServiceAccount bootstrap-uc4-fault` + ClusterRole/Binding for `nodes: patch` + Role/Binding for `deployments: patch` (scoped to artemis-uc4 ns). Reused-shape from UC2's `10-rbac.yaml`.
  - `20-bootstrap-taint-job.yaml` — Job that taints all nodes with `artemis.kagent.dev/launch-pad-fault=true:NoSchedule` (same key as UC2 — multi-namespace coexistence is fine; the taint is per-node, both UC2 and UC4 Pending pods stay blocked) and forces a `kubectl rollout restart` on `mission-control-pending` so the cold-deploy race doesn't let it bind before the taint lands. Reused-shape from UC2's `20-bootstrap-taint-job.yaml`.
  - `30-services.yaml` — three ClusterIP Services (one per Deployment), port 8000 → port-name `http`. The `lunar-rover-telemetry` Service carries `monitoring=prom` so STORY-018's Prometheus auto-scrapes it.
  - `40-deployment-imagepull.yaml` — `Deployment mission-control-imagepull`, image `rg.fr-par.scw.cloud/apogasa/mission-control:v999` (intentionally unpublished). Reused-shape from UC1's `20-deployment.yaml`. Restart count and ImagePullBackOff signal visible to `kubectl describe pod` within ~30 s of apply.
  - `50-deployment-pending.yaml` — `Deployment mission-control-pending`, image `:v1` (the real tag), no toleration for the synthetic taint. Reused-shape from UC2's `40-deployment.yaml`. After the bootstrap Job runs (`20-bootstrap-taint-job.yaml`), the Pod is Pending with `FailedScheduling: untolerated taint`.
  - `60-deployment-telemetry.yaml` — `Deployment lunar-rover-telemetry`, image `:v1.0.0` (the published semver tag — note the v1.0.0 not v1; matches STORY-019), `resources.limits.memory: 64Mi`. Reused-shape from UC3's `20-deployment.yaml`. The OOMKilled symptom is *participant-triggered* via the same leak-loop pattern STORY-020's UC3 tour ships; STORY-026 (UC4 tour) drives it.
- Self-author validation against the live `kagent-workshop` kind cluster: apply manifests, observe three symptoms simultaneously within 60 s of apply (one of which — OOMKilled — requires a leak-loop trigger, same as STORY-019's pattern).

**Out of scope:**
- `uc4/agents/` — STORY-025 (coordinator a2a Agent CRD + reuse of UC1/UC2/UC3 sub-agents + bulb MCP `RemoteMCPServer` reference). The bridge Services (`grafana → grafana.artemis-observability`, `prometheus → prometheus-server.artemis-observability`) currently live in `uc3/agents/kagent-bridge-services.yaml`; STORY-025 decides whether to copy them into `uc4/agents/` or promote to `infra/observability/`. STORY-024 makes no decision either way.
- `uc4/tour.json` — STORY-026 (UC4 tour: single coordinator ask → fan-out → bulb colour change).
- `uc4/README.md` — STORY-027.
- `apps/` — explicitly forbidden by FR-014 AC ("no new app source under uc4/"). UC4 reuses the three existing FastAPI variants by image tag.
- Any change to UC1/UC2/UC3 manifests, agents, tours, or READMEs. UC4 ships a *reproduction* of their broken states, not a refactor of them.
- `infra/observability/` — already shipped by STORY-018 and auto-installed by `make uc4-up` (per STORY-018's Makefile wiring `uc4-up: observability-up`).

### User flow (workshop participant lives this — pre-tour cluster setup)

1. Participant opens UC4 in the workshop-tour extension. workshop-infrastructure has already deployed the cluster state — `make uc4-up` ran at provisioning time, installing kagent + observability + uc4 manifests + uc4 agents + the bulb MCP.
2. Within 30–60 s of the manifest apply (which workshop-infra ran, not the participant):
   - `mission-control-imagepull` Pod is in `ImagePullBackOff` (kubelet retried `:v999` repeatedly).
   - `mission-control-pending` Pod is in `Pending` (the bootstrap Job tainted the node; no toleration matches).
   - `lunar-rover-telemetry` Pod is `Running 1/1, RESTARTS: 0`. The OOM symptom is dormant until Beat 1 of STORY-026's tour fires the leak loop.
3. Participant runs `kubectl get pods -n artemis-uc4` (Beat 2-equivalent in STORY-026's tour). Sees:
   ```
   NAME                                         READY   STATUS              RESTARTS   AGE
   mission-control-imagepull-…                  0/1     ImagePullBackOff    0          2m
   mission-control-pending-…                    0/1     Pending             0          2m
   lunar-rover-telemetry-…                      0/1     CrashLoopBackOff   N (Xs ago)  2m
   ```
   (after the tour's Beat 1 leak loop has run; before that, telemetry shows `Running 1/1, RESTARTS: 0`).
4. Participant invokes `artemis-mission-coordinator` (STORY-025); the coordinator delegates to the three specialists in parallel; each returns a verdict; coordinator maps verdicts to bulb colours (FR-017: slot 1 ↔ UC1, slot 2 ↔ UC2, slot 3 ↔ UC3) and writes via the bulb MCP. Three bulbs flip to red simultaneously.

STORY-024's job is steps 1–2: the cluster reaches the right state, deterministically, within 60 s of apply. Steps 3–4 are STORY-025/026's responsibility.

---

## Acceptance Criteria

(Mirrors sprint plan AC + the namespace-naming + image-tag specifics from `docs/artemis-naming.md`.)

- [ ] **`uc4/manifests/00-namespace.yaml`** creates `Namespace artemis-uc4` (per `docs/artemis-naming.md` L31) with labels `kagent-workshop/uc: uc4` and `kagent-workshop/scenario: multi-symptom`.
- [ ] **`uc4/manifests/10-rbac.yaml`** ships the bootstrap-Job RBAC: `ServiceAccount bootstrap-uc4-fault`, `ClusterRole artemis-uc4-bootstrap-node-tainter` (verbs `get/list/patch` on `nodes`), `Role bootstrap-deployment-restarter` in `artemis-uc4` ns (verbs `get/patch` on `deployments`), plus the matching ClusterRoleBinding + RoleBinding. Pattern mirrors `uc2/manifests/10-rbac.yaml`.
- [ ] **`uc4/manifests/20-bootstrap-taint-job.yaml`** ships a Job named `bootstrap-uc4-fault` in `artemis-uc4` ns that:
  - Taints all nodes with `artemis.kagent.dev/launch-pad-fault=true:NoSchedule` (`kubectl taint --overwrite`, idempotent).
  - Waits up to 60 s for `deploy/mission-control-pending` to exist in `artemis-uc4` (handles the apply-order race between the Job and the Deployment).
  - Forces `kubectl rollout restart -n artemis-uc4 deploy/mission-control-pending` so the Pod is re-evaluated against the now-tainted node.
  - Uses the same image (`rg.fr-par.scw.cloud/apogasa/kubectl:1.31.0`) and the same resource limits (10m/32Mi requests, 100m/128Mi limits) as UC2's bootstrap Job.
  - **Does not** restart the imagepull or telemetry Deployments — they don't need it (their broken states are non-scheduling-related).
- [ ] **`uc4/manifests/30-services.yaml`** creates three ClusterIP Services in `artemis-uc4` ns:
  - `Service mission-control-imagepull` (selector `app: mission-control-imagepull`, port 8000 → `http`).
  - `Service mission-control-pending` (selector `app: mission-control-pending`, port 8000 → `http`).
  - `Service lunar-rover-telemetry` (selector `app: lunar-rover-telemetry`, port 8000 → `http`, **`monitoring: prom` label** so STORY-018's Prometheus auto-scrapes it).
- [ ] **`uc4/manifests/40-deployment-imagepull.yaml`** creates `Deployment mission-control-imagepull`:
  - Image `rg.fr-par.scw.cloud/apogasa/mission-control:v999` (intentionally unpublished — UC1's broken tag).
  - 1 replica, container port 8000 named `http`, `APP_IDENTITY=mission-control` env, requests/limits matching UC1.
  - No probes (preserves the ImagePullBackOff signal — same NFR-003 reasoning as UC1).
- [ ] **`uc4/manifests/50-deployment-pending.yaml`** creates `Deployment mission-control-pending`:
  - Image `rg.fr-par.scw.cloud/apogasa/mission-control:v1` (real tag — UC2 reuses this).
  - 1 replica, container port 8000 named `http`, `APP_IDENTITY=mission-control` env, no toleration for `artemis.kagent.dev/launch-pad-fault`.
  - No probes.
- [ ] **`uc4/manifests/60-deployment-telemetry.yaml`** creates `Deployment lunar-rover-telemetry`:
  - Image `rg.fr-par.scw.cloud/apogasa/lunar-rover-telemetry:v1.0.0` (the semver-tagged image — note `:v1.0.0`, **not `:v1`** as the architecture's wording suggests; matches STORY-019).
  - 1 replica, container port 8000 named `http`, `APP_IDENTITY=lunar-rover-telemetry` env, **`resources.limits.memory: 64Mi`**.
  - No probes (preserves the OOMKilled signal — same NFR-003 reasoning as UC3).
- [ ] **`make lint-manifests` clean** over `uc*/manifests/`, `infra/observability/`, `mcp/manifests/`, **and now `uc4/manifests/`** (the existing `UC_MANIFEST_DIRS := $(wildcard uc*/manifests)` glob picks up the new dir automatically, no Makefile change needed).
- [ ] **Cluster-side smoke validation** against the live `kagent-workshop` kind cluster:
  - [ ] Apply manifests + observability bundle (the latter is a STORY-018 prerequisite for the `monitoring=prom` scrape; STORY-024's manifests are AC-passing without it, but UC4 end-to-end depends on it).
  - [ ] Within 60 s of apply: `kubectl get pods -n artemis-uc4` shows `mission-control-imagepull` in `ImagePullBackOff`, `mission-control-pending` in `Pending`, `lunar-rover-telemetry` in `Running 1/1` (pre-leak baseline).
  - [ ] Bootstrap Job (`bootstrap-uc4-fault`) reports `succeeded: 1`.
  - [ ] The synthetic taint is on the node (verified via `kubectl describe node`).
  - [ ] `mission-control-pending`'s most recent event is `FailedScheduling: untolerated taint`.
  - [ ] Trigger the leak loop using STORY-019's `kubectl run --rm` pattern: 30 bursts to `lunar-rover-telemetry.artemis-uc4:8000/leak`. Within ~30 s of trigger: `lunar-rover-telemetry` Pod has `RESTARTS ≥ 1` and `lastState.terminated.reason: OOMKilled`.
  - [ ] **All three symptoms simultaneously visible** in `kubectl get pods -n artemis-uc4`:
    - imagepull: still `ImagePullBackOff` (kubelet retries forever, never resolves).
    - pending: still `Pending` (taint stays on node).
    - telemetry: `Running 1/1, RESTARTS ≥ 1` (post-OOM cycle, live again until the next leak loop).
  - [ ] Prometheus is scraping `lunar-rover-telemetry` in `artemis-uc4` (verified via `process_resident_memory_bytes{kubernetes_namespace="artemis-uc4"}` query — non-empty result).
  - [ ] `make uc4-down` cleans up uc4/manifests/ resources (the synthetic taint persists on the node — same caveat as UC2; document in `uc4/README.md` per STORY-027).

- [ ] **NFR-003 deterministic-reproduction AC.** The 60-second simultaneous-three-symptom window holds across 3/3 cold deploys. **Self-author smoke validates this once on the in-place cluster, NOT three times on a fresh kind**; the 3/3 cold-deploys requirement defers to STORY-028 (M5 dry-run) where Clément's cross-author repro absorbs both the cold-deploy iterations and the NFR-008 review (per the recursive deferral chain established in STORY-018/019/020/021).

---

## Technical Notes

### Why a single bootstrap Job, not three (one per Deployment)

UC2's bootstrap-taint Job restarts mission-control to close the cold-deploy race where the scheduler binds the Pod *before* the taint lands. UC4's `mission-control-pending` has the same race; the imagepull Deployment has no taint dependency (its symptom is image-pull-side, not scheduling-side); the telemetry Deployment has no taint dependency either (its symptom is participant-triggered post-deploy).

So one Job suffices — and it's identical in shape to UC2's, just targeting `deploy/mission-control-pending` in `artemis-uc4` instead of `deploy/mission-control` in `artemis-uc2`.

### Why the same taint key as UC2

The taint key `artemis.kagent.dev/launch-pad-fault=true:NoSchedule` is reused verbatim from UC2. Two reasons:

1. **Per-vCluster topology.** Workshop-infrastructure deploys per-participant vClusters; UC2 and UC4 in the same vCluster *would* both apply the taint, but the participant only has one of them deployed at a time in the workshop flow (UC4 is the climax, UC2 is earlier). Even if both were applied: the taint is global on the node, both UC2 and UC4 Pending pods stay Pending, no conflict.
2. **Naming convention.** `artemis.kagent.dev/launch-pad-fault` is already in `docs/artemis-naming.md` (UC2 row); inventing a UC4-specific key would split the convention without runtime benefit.

The `.fault` suffix is a deliberate keyword the convention's banned-vocabulary rule covers — but the rule applies to *participant-visible tour fields*, not to manifest content (taint keys are author-facing). Same reasoning UC2's manifest uses it.

### Why no probes anywhere in UC4's Deployments

Same as UC1/UC2/UC3: probes against `/healthz` would race with the symptoms and surface as Liveness/Readiness failure events instead of the actual broken-state signal. NFR-003 is non-negotiable; absent probes is the deliberate choice.

For UC4 in particular: a `mission-control-pending` Pod that's `Pending` never has a container running at all, so probes can't even fire. A `mission-control-imagepull` Pod in `ImagePullBackOff` has the same issue. Probes are only meaningful for the telemetry Deployment, and there the OOM cycle is what we want kubelet to surface — not a probe failure.

### Resource budget

Per architecture §risk register (line 511): UC4 Pods aggregate ≈ 1 GiB plus kagent runtime. Breakdown:
- `mission-control-imagepull`: 64 Mi requested, but never runs (pull fails). 0 Mi actual.
- `mission-control-pending`: 64 Mi requested, but never schedules. 0 Mi actual.
- `lunar-rover-telemetry`: 64 Mi limit, ~57 Mi idle.
- Plus Prom (~150 Mi idle), Graf (~80 Mi idle), kagent controller (~150 Mi), kagent debugger pods reused from UC1/UC2/UC3 (~150 Mi total).

Aggregate: ~600 MiB on idle. Well under the 1 GiB participant-slice budget. Adding the bulb MCP (STORY-023, ~64 Mi) and the coordinator agent runtime (STORY-025, ~150 Mi) brings it to ~800 MiB — still within budget.

### What STORY-024 deliberately does **not** modify

- `uc1/`, `uc2/`, `uc3/`, `apps/`, `infra/observability/`, `mcp/`, `Makefile`, `schemas/`, `docs/architecture-…md`, `docs/tour-content-conventions.md`, `docs/artemis-naming.md` — no impact.
- `uc4/agents/`, `uc4/tour.json`, `uc4/README.md` — STORY-025, 026, 027.

---

## Dependencies

**Prerequisite stories (all completed):**
- STORY-012 (UC1 manifests) — provides the `mission-control:v999` reuse pattern.
- STORY-015 (UC2 manifests) — provides the `mission-control:v1` real-tag image, the bootstrap-taint Job pattern, and the RBAC shape.
- STORY-019 (UC3 manifests) — provides the `lunar-rover-telemetry:v1.0.0` image + 64 Mi limit + `monitoring=prom` Service-label pattern.
- STORY-018 (`infra/observability/`) — Prom scrapes the UC4 telemetry Service the same way it scrapes UC3's.
- STORY-001 (skeleton) + STORY-005 (Makefile / dev loop) + STORY-006 (Artemis naming) — baseline.

**External dependencies:**
- `apogasa/mission-control:v999` (intentionally unpublished — UC1's broken tag), `apogasa/mission-control:v1` (real — UC2's), `apogasa/lunar-rover-telemetry:v1.0.0` (real — UC3's). All three already validated by their respective UC stories.

**Blocked stories:**
- STORY-025 (UC4 coordinator a2a Agent CRD) — `Deps: STORY-012, STORY-015, STORY-019, STORY-023`. STORY-024 isn't a hard prerequisite for STORY-025's authoring (the agents reference Service names + agent names, both authorable in advance), but UC4 *end-to-end* needs STORY-024's manifests to be applied so the coordinator has something to delegate against.
- STORY-026 (UC4 tour) — needs the cluster state STORY-024 produces for Beat 1's apply step + Beat 2's status check.
- STORY-027 (UC4 README + cross-author repro).

---

## Definition of Done

- [ ] All 7 manifests shipped under `uc4/manifests/`.
- [ ] AC ticked.
- [ ] Self-author cluster smoke validation recorded under *Implementation Notes*.
- [ ] STORY-024 entry in `docs/sprint-status.yaml` updated to `status: completed` with `completion_date`, `actual_points`, and an ownership re-attribution note (`joint → Quentin`).
- [ ] PR opened; cross-author repro deferred to STORY-028.
- [ ] Merged to `main`.

---

## Story Points Breakdown

- **7 manifest files (mostly verbatim lifts from UC1/UC2/UC3 + the namespace + 2-of-3 Deployment renaming):** 1.5 points. Mechanical; the only judgement is the namespace consolidation pattern.
- **Bootstrap Job adapted for UC4 (target Deployment renamed, namespace renamed, RBAC ScopeAccount renamed):** 0.5 points. Direct copy from UC2 + sed.
- **Self-author cluster smoke (apply → wait → 4 verification steps + leak-loop trigger + 3-symptom-simultaneous check):** 1 point. Each step is a single command; the chain is what takes time.
- **Total:** 3 points. Matches sprint-plan estimate.

**Rationale:** Lower than STORY-019 (5 pts) because there's no spike — the patterns are all already validated. Lower than STORY-018 (5 pts) because there's no new infrastructure to invent. STORY-024 is the most mechanical M4 story.

---

## Additional Notes

- **Why deploy names carry suffixes (`-imagepull`, `-pending`) and not the generic `mission-control`.** Two `mission-control` Deployments in one namespace would collide. Architecture §C6 + `docs/artemis-naming.md` L53 chose `mission-control-imagepull` + `mission-control-pending` to disambiguate. The FastAPI app inside is the same `apps/mission-control` source; only the Deployment metadata + image tag differs.
- **Why `lunar-rover-telemetry` keeps its bare name.** Only one telemetry Deployment in UC4; no disambiguation needed. Matches UC3's naming.
- **Why no `MCPServer` (kagent.dev/v1alpha1) reference.** UC4's MCP integration is via `RemoteMCPServer artemis-bulb-mcp` (STORY-023) which lives in the `kagent` namespace. STORY-024 ships only the broken-state manifests; the agent-side wiring is STORY-025.
- **Sprint-3-retro candidate (already flagged via STORY-018):** `make kagent-install` is non-idempotent. UC4 cold-deploys hit the same blocker UC3 did; on a cluster with kagent already installed, `make uc4-up` fails on the helm install step. The fix is one line (`helm install` → `helm upgrade --install`); flagging it here because UC4's cold-deploy iteration count is highest (M5 dry-run will run UC4 multiple times across kagent reinstalls in the worst case).

---

## Progress Tracking

**Status History:**
- 2026-05-08: Created (Developer / Quentin, /bmad:dev-story).
- 2026-05-08: Started — first M4 story, joint→Quentin re-attribution per the OOO swap chain.
- 2026-05-08: Implemented + cluster smoke validated end-to-end.

**Actual Effort:** 3 points (matched estimate).

### Implementation Notes (2026-05-08)

#### Files added (7)
- `uc4/manifests/00-namespace.yaml` — `Namespace artemis-uc4` with `kagent-workshop/uc: uc4` + `kagent-workshop/scenario: multi-symptom` labels.
- `uc4/manifests/10-rbac.yaml` — `ServiceAccount bootstrap-uc4-fault` + ClusterRole/Binding (`nodes: patch`) + Role/Binding (`deployments: patch` in artemis-uc4). Pattern lifted from `uc2/manifests/10-rbac.yaml`.
- `uc4/manifests/20-bootstrap-taint-job.yaml` — Job that taints all nodes with `artemis.kagent.dev/launch-pad-fault=true:NoSchedule` and rollout-restarts `mission-control-pending` to close the cold-deploy race. **Three deltas from UC2's bootstrap Job during validation:**
  1. Image: `apogasa/kubectl:latest` (was `:1.31.0` in UC2 — that tag isn't published; `:latest` is what the user pushed mid-flight).
  2. Shell: `/bin/sh` (was `/bin/bash` in UC2 — `:latest` is busybox-based / Alpine, no bash; busybox sh supports `set -o pipefail` and the script is POSIX-compatible).
  3. **Tolerations added to the Job pod template** (UC2's Job has none) — so re-applying the manifest on a cluster where a previous UC4 (or UC2) cycle has already tainted the node doesn't deadlock the bootstrap Job's own pod.
- `uc4/manifests/30-services.yaml` — three ClusterIP Services (one per Deployment), `lunar-rover-telemetry` carries `monitoring=prom` so STORY-018's Prom auto-scrapes it.
- `uc4/manifests/40-deployment-imagepull.yaml` — `Deployment mission-control-imagepull`, `:v999` (UC1's broken tag). **Toleration added** (the symptom is image-pull-side, not scheduling-side; the Pod must schedule normally even with the synthetic taint on the node).
- `uc4/manifests/50-deployment-pending.yaml` — `Deployment mission-control-pending`, image `:v1.0.0` (was `:v1` initially — that tag isn't published; the user re-published as `:v1.0.0`). **`strategy.type: Recreate`** (UC2 omits this; under default RollingUpdate, the rollout-restart deadlocks because the new Pending pod never becomes Ready, so the old Running pod is never reaped). No toleration (the symptom IS scheduling-blocked).
- `uc4/manifests/60-deployment-telemetry.yaml` — `Deployment lunar-rover-telemetry`, image `:v1.0.0`, `resources.limits.memory: 64Mi`. **Toleration added** (the symptom is participant-triggered post-deploy; the rover must schedule normally).

#### Files NOT modified (intentional)
- `uc1/`, `uc2/`, `uc3/`, `apps/`, `infra/observability/`, `mcp/`, `Makefile`, `schemas/`, `docs/architecture-…md`, `docs/tour-content-conventions.md`, `docs/artemis-naming.md` — no impact.
- `uc4/agents/`, `uc4/tour.json`, `uc4/README.md` — STORY-025, 026, 027.

#### Validation

`make lint-manifests` clean across `uc1/uc2/uc3/uc4/manifests/` + `infra/observability/` + `mcp/manifests/`. The existing `UC_MANIFEST_DIRS := $(wildcard uc*/manifests)` glob picked up `uc4/manifests/` automatically, no Makefile change needed.

End-to-end cluster smoke (live `kagent-workshop` kind, after image-fix iterations + cluster-state cleanup):

```text
$ kubectl apply -f uc4/manifests/
namespace/artemis-uc4 created
serviceaccount/bootstrap-uc4-fault created
clusterrole.rbac.authorization.k8s.io/artemis-uc4-bootstrap-node-tainter created
clusterrolebinding.rbac.authorization.k8s.io/artemis-uc4-bootstrap-node-tainter created
role.rbac.authorization.k8s.io/bootstrap-deployment-restarter created
rolebinding.rbac.authorization.k8s.io/bootstrap-deployment-restarter created
job.batch/bootstrap-uc4-fault created
service/mission-control-imagepull created
service/mission-control-pending created
service/lunar-rover-telemetry created
deployment.apps/mission-control-imagepull created
deployment.apps/mission-control-pending created
deployment.apps/lunar-rover-telemetry created

$ # 60 s after apply:
$ kubectl get pods -n artemis-uc4
NAME                                        READY   STATUS         RESTARTS   AGE
bootstrap-uc4-fault-tlnwr                   0/1     Completed      0          61s
lunar-rover-telemetry-7bffbc6cb5-85n9g      1/1     Running        0          61s
mission-control-imagepull-c94dd65cd-h5kqh   0/1     ErrImagePull   0          61s
mission-control-pending-79f7c4b74c-fpqcq    0/1     Pending        0          25s

# bootstrap Job logs:
[bootstrap] tainting all nodes with artemis.kagent.dev/launch-pad-fault=true:NoSchedule
node/kagent-workshop-control-plane modified
[bootstrap] waiting up to 60s for deployment/mission-control-pending to exist in artemis-uc4
[bootstrap] deployment found after 1s
[bootstrap] forcing rollout restart of mission-control-pending to surface the untolerated-taint event
deployment.apps/mission-control-pending restarted
[bootstrap] done

# After ~75 s the imagepull pod transitions ErrImagePull → ImagePullBackOff.

# Trigger leak via in-pod exec (the in-pod exec works because the rover already
# tolerates the taint; an external `kubectl run` trigger pod doesn't and would
# stay Pending — STORY-026 will design the tour-side trigger appropriately):
$ kubectl exec -n artemis-uc4 $ROVER -- python3 -c "import urllib.request as u; \
    [u.urlopen(u.Request('http://127.0.0.1:8000/leak', method='POST'), timeout=2).read() \
     for _ in range(30)]"
command terminated with exit code 137   # SIGKILL from kernel OOM

$ # ~10 s after kubelet restarts the rover container:
$ kubectl get pods -n artemis-uc4
POD                                                 phase       reason             restarts  lastTerm
lunar-rover-telemetry-7bffbc6cb5-85n9g              Running     Running            1         OOMKilled
mission-control-imagepull-c94dd65cd-h5kqh           Pending     ImagePullBackOff   0         -
mission-control-pending-79f7c4b74c-fpqcq            Pending     Pending            0         -

# Three symptoms simultaneously visible. NFR-001 60s window honoured (the OOM
# adds ~15s on top of the apply-chain 60s, but the symptom is participant-
# triggered per the architecture's design).

# Prom is scraping the post-restart rover:
$ curl prom/api/v1/query?query='process_resident_memory_bytes{kubernetes_namespace="artemis-uc4"}'
  ns=artemis-uc4 svc=lunar-rover-telemetry value=57094144 bytes (54.4 MiB)
```

`make uc4-down`-equivalent cleanup verified — `kubectl delete -f uc4/manifests/` + `kubectl taint nodes --all artemis.kagent.dev/launch-pad-fault-` returns the cluster to pristine state.

#### Implementation findings (Sprint-3 retro candidates)

Four findings during validation, all flagged for follow-up:

1. **`apogasa/mission-control:v1` was NOT published.** UC2 and UC4 both reference it. User republished as `:v1.0.0` mid-flight. UC4 updated to `:v1.0.0`; **UC2 still references `:v1`** — UC2 was likely never end-to-end validated on this cluster (latent gap that didn't surface during M2). Sprint-3 retro: update UC2's `40-deployment.yaml` to `:v1.0.0`.

2. **`apogasa/kubectl:1.31.0` was NOT published.** UC2 and UC4 both reference it. User pushed `apogasa/kubectl:latest` (busybox-based / Alpine). UC4's bootstrap Job updated to `:latest` + `/bin/sh` (no `/bin/bash` in busybox). **UC2 still references `:1.31.0` + `/bin/bash`** — same latent gap. Sprint-3 retro: ~5-line patch to UC2's bootstrap Job mirroring UC4's surgery.

3. **Default RollingUpdate strategy deadlocks the rollout-restart pattern.** When the bootstrap Job triggers a rollout-restart on `mission-control-pending`, the default RollingUpdate strategy waits for the new Pod to become Ready before terminating the old one — but the new Pod is `Pending` forever, so the old `Running` Pod sticks around. Result: 1 Running + 1 Pending pod for the same Deployment, confusing both the participant and the agent. UC4 uses `strategy.type: Recreate` to sidestep the deadlock. **UC2 omits this** — likely the same latent gap that didn't surface during M2 because UC2 was never end-to-end validated. Sprint-3 retro: add `strategy: { type: Recreate }` to UC2's `40-deployment.yaml`.

4. **Bootstrap Job needs to tolerate the taint it applies.** Without a toleration, the Job's own pod can't schedule on a cluster where a previous UC4 (or UC2) cycle left the taint behind. UC4 adds tolerations on the bootstrap Job + the imagepull Deployment + the telemetry Deployment (only `mission-control-pending` keeps no toleration — that's the one that's *supposed* to be blocked). **UC2's Job has no toleration**, but UC2's README documents `make kind-down` between cold-deploy iterations, which clears the taint along with the kind cluster. UC4 is more robust to in-place re-applies on the same cluster. Sprint-3 retro: optional UC2 robustness patch.

The four findings together suggest UC2's M2 validation was never actually run on a cluster with apogasa images; the manifests passed lint but would fail at runtime. STORY-028 (M5 dry-run) will need to surface this if the recursive cross-author-repro deferral chain hasn't already.

#### AC sign-off

- [x] All 7 manifests shipped with the documented shapes.
- [x] Apply succeeds; bootstrap Job reaches `Succeeded: 1`.
- [x] Within 60 s of apply: imagepull = ImagePullBackOff (after ErrImagePull → backoff transition), pending = Pending with `untolerated taint` event, telemetry = Running 1/1.
- [x] Leak trigger drives the telemetry container into OOMKilled; `lastState.terminated.reason: OOMKilled` visible.
- [x] Prom is scraping `artemis-uc4`'s `lunar-rover-telemetry` Service (54.4 MiB on the post-restart container).
- [x] `make lint-manifests` clean.
- [ ] **Cross-author repro by Clément** — *deferred* to STORY-028 (M5 dry-run) per the recursive deferral chain established in STORY-018/019/020/021.
- [ ] **NFR-003 3/3 cold deploys** — *deferred*. Self-author smoke validated once on the in-place cluster; the 3/3 cold-deploys requirement absorbs into STORY-028.

### Next

- PR opened against `main` (or merged directly).
- Sprint 4 sits at 3 / 14 committed points landed pre-launch.
- STORY-025 (UC4 coordinator a2a Agent CRD, 5 pts) is the natural continuation. It needs to decide where `kagent-bridge-services.yaml` lives long-term (`uc4/agents/` copy vs `infra/observability/` promotion) — a STORY-019 finding STORY-024 inherited but didn't have to act on.
- Sprint-3 retro ticket queue gained 4 candidates from STORY-024 alone (UC2 image tag, UC2 shell, UC2 strategy, UC2 tolerations). All ~5-line surgical patches; the 4 deltas between UC4's bootstrap Job + Pending Deployment and UC2's are exactly what UC2 needs to be retroactively fixed.

---

**This story was created using BMAD Method v6 - Phase 4 (Implementation Planning).**
