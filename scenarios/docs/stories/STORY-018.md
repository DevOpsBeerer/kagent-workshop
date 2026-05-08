# STORY-018: `infra/observability/` Prom + Graf manifest bundle

**Epic:** EPIC-003 (UC3 — Observability-augmented diagnostics)
**FRs:** FR-012 (UC3 scenario package + Prom/Graf manifests)
**NFRs:** NFR-002 (low resource footprint), NFR-006 (vanilla Kubernetes — no operators)
**Priority:** Must Have
**Story Points:** 5
**Status:** Completed (2026-05-08)
**Assigned To:** Quentin Rodic (re-attributed from Clément Raussin — see *Ownership swap* below)
**Created:** 2026-05-08
**Sprint:** 3 (M3, 2026-05-11 → 2026-05-13) — implemented out-of-band on 2026-05-08, ahead of sprint start, because Clément is OOO and STORY-019/020/021 (also Clément) sit downstream of this bundle. Landing it early on Quentin's side keeps the M3 critical path open.

---

## Ownership swap

Sprint-plan owner is Clément Raussin. Re-attributed to Quentin on 2026-05-08 because:
- Clément is still OOO at the boundary between Sprint 2.5 and Sprint 3.
- The downstream M3 stories on Clément's slate (STORY-019 manifests + agent CRDs, STORY-020 tour, STORY-021 README) all `Deps: STORY-018`. If STORY-018 waits, M3 starts cold.
- The work is infrastructure-shaped (vanilla Prom/Graf manifests, no UC3-specific narrative judgment), so the cross-author swap costs nothing in domain knowledge.
- Pattern matches STORY-014 (Quentin ghost-authored Clément's UC1 README during M2 OOO) — sprint-status entry called out the re-attribution explicitly there too.

Clément retains ownership of STORY-019/020/021 when he's back. The STORY-021 cross-author repro (NFR-003) becomes Quentin signing off on Clément's cluster cycle, mirroring how STORY-014 / 017 reciprocate.

---

## User Story

As a **UC3 / UC4 author** wiring kagent's pre-packaged Prometheus and Grafana sub-agents into a debugging Agent CRD,
I want **a vanilla Prometheus + Grafana stack already running in the cluster, scraping any Service labelled `monitoring=prom` and exposing a Grafana with a pre-wired Prom data source**,
So that **the UC3 leak loop produces a clean monotone curve in Grafana within seconds of `/leak` calls, the agent's pre-packaged sub-agents have a real Prom HTTP API and a Grafana admin endpoint to talk to (per FR-012 AC), and UC4 reuses the same stack without any per-UC config drift.**

---

## Description

### Background

UC3's broken state is a memory-leak FastAPI app (`apps/lunar-rover-telemetry`, shipped by STORY-010 in M1) deployed with `resources.limits.memory: 64Mi`. Participant-triggered `/leak` calls push the container into `OOMKilled` deterministically (NFR-003). The participant's friction signal is `kubectl describe pod` showing the OOM reason — but the *teaching* signal is the agent narrating a Prom/Graf curve at the same time, surfacing a Grafana dashboard URL the participant clicks through to (FR-013).

For that teaching signal to land, the cluster needs a real Prom + Graf install before UC3's manifests apply. Architecture §C5 fixes the shape: vanilla upstream Prometheus + Grafana via plain manifests, no operator. The agent-side reuse (kagent's pre-packaged Prom + Grafana agents per FR-012 AC) only works against a reachable Prom HTTP API and Grafana admin endpoint — both of which the plain manifests provide.

This story lands that floor: the install bundle. STORY-019 then deploys the leak app with the right `monitoring=prom` Service label so Prom auto-scrapes it; STORY-020's tour drives the loop and surfaces the dashboard URL; STORY-021 documents the disclaimer that "this is not how you'd run Prom in production" in `uc3/README.md`.

UC4 (M4) consumes the same `infra/observability/` bundle without modification — its `lunar-rover-telemetry` Deployment carries the same `monitoring=prom` Service label, and the `artemis-mission-coordinator` agent's UC3-debugger sub-agent reuses the Prom/Graf endpoints. So this story is also UC4 enablement; the resource budget (architecture §risk register) already accounts for it.

### Scope

**In scope:**
- New `infra/observability/` directory tree:
  - `00-namespace.yaml` — `artemis-observability` Namespace (per `docs/artemis-naming.md`).
  - `prometheus/` — ServiceAccount + RBAC (cluster-scope read on services / endpoints / pods / nodes for k8s SD), scrape ConfigMap, single-replica Deployment (256 Mi RAM), ClusterIP Service on :9090.
  - `grafana/` — datasource ConfigMap, single-replica Deployment (256 Mi RAM, anonymous-admin), ClusterIP Service on :3000.
  - `kustomization.yaml` — aggregates all of the above.
- `Makefile`:
  - New `observability-up` / `observability-down` phony targets.
  - `uc3-up` and `uc4-up` gain `observability-up` as a dependency (after `kagent-install`, before `kubectl apply -f uc<N>/manifests/`).
  - `make lint-manifests` walks `infra/observability/` in addition to `uc*/manifests/`.

**Out of scope:**
- `uc3/manifests/` — STORY-019 (Clément, M3). The `lunar-rover-telemetry` Deployment + `monitoring=prom`-labelled Service land there. STORY-018 only validates that *if* a Service with that label existed, Prom would scrape it (validation step 4 below).
- `uc3/agents/` — STORY-019 (Clément, M3). The kagent Agent CRD wiring the pre-packaged Prom + Grafana sub-agents lives there.
- Persistent storage, retention tuning, alerting, multi-tenancy. Architecture §non-functional decisions explicitly scopes Prom+Graf to `emptyDir` (workshop is ephemeral, no metrics retention needed across pod restarts) and "monitor for the participant's eyes, not for an SRE rotation".
- Operators — `kube-prometheus-stack`, `prometheus-operator`, `grafana-operator` — explicitly forbidden by architecture §C5 rationale (NFR-006 portability + keep `kubectl get all` legible for the participant).
- Dashboards — UC3's tour drives the agent to *create* the dashboard on the fly (FR-013); STORY-018 must not pre-load any dashboard JSON.
- Authentication / authorisation hardening on Grafana — anonymous-admin is the explicit architecture choice. Workshop runs inside per-participant vClusters; cross-tenant exposure is impossible by topology.
- Tour copy. STORY-020 (Clément).

### User flow

The "user" is the UC3/UC4 author + the workshop participant:
1. Author runs `make uc3-up` (or `make uc4-up`). Make brings up kind, installs kagent, then runs the new `observability-up` step before `kubectl apply -f uc3/manifests/`.
2. `observability-up` applies `infra/observability/` via `kubectl apply -k` (kustomize). All 9-ish objects land in the `artemis-observability` Namespace inside ~30 s.
3. UC3 manifests apply afterward (STORY-019). The `lunar-rover-telemetry` Service carries `monitoring=prom`; Prometheus's k8s SD picks it up at the next scrape interval (≤ 30 s).
4. Participant runs the leak loop from the tour. Prom scrapes the new `process_resident_memory_bytes` series; the agent's Grafana sub-agent reads from the pre-wired Prom datasource and creates a dashboard; agent surfaces the URL; participant clicks; sees a clean monotone curve.

---

## Acceptance Criteria

(Mirroring sprint-plan AC, with cluster-validation specifics added.)

- [ ] `infra/observability/00-namespace.yaml` creates a `Namespace` named `artemis-observability` carrying `kagent-workshop/component: observability`.
- [ ] `infra/observability/prometheus/` ships:
  - [ ] A `ServiceAccount` + `ClusterRole` + `ClusterRoleBinding` granting `get`/`list`/`watch` on `services`, `endpoints`, `pods`, `nodes` (the minimal set required for `kubernetes_sd_configs` role: endpoints / pod / service / node).
  - [ ] A `ConfigMap` containing `prometheus.yml` with one scrape job that uses `kubernetes_sd_configs: role: endpoints` and a `relabel_configs` rule keeping only endpoints whose backing Service carries `monitoring=prom`.
  - [ ] A single-replica `Deployment` named `prometheus-server` running `prom/prometheus:v2.55.x` (or current `latest stable` 2.x at implementation time) with `resources.limits.memory: 256Mi`, `emptyDir` storage, and the ConfigMap mounted at `/etc/prometheus/`.
  - [ ] A `ClusterIP` `Service` named `prometheus-server` exposing port `9090` → container port `9090` (HTTP API).
- [ ] `infra/observability/grafana/` ships:
  - [ ] A `ConfigMap` declaring a Prometheus datasource via Grafana's filesystem provisioning format (`apiVersion: 1`, `datasources: [{name: Prometheus, type: prometheus, url: http://prometheus-server.artemis-observability.svc.cluster.local:9090, isDefault: true, access: proxy}]`).
  - [ ] A single-replica `Deployment` named `grafana` running `grafana/grafana-oss:11.x` (current stable LTS at implementation time) with `resources.limits.memory: 256Mi`, `emptyDir` storage, anonymous-admin enabled (`GF_AUTH_ANONYMOUS_ENABLED=true`, `GF_AUTH_ANONYMOUS_ORG_ROLE=Admin`, `GF_AUTH_DISABLE_LOGIN_FORM=true`), and the datasource ConfigMap mounted at `/etc/grafana/provisioning/datasources/`.
  - [ ] A `ClusterIP` `Service` named `grafana` exposing port `3000` → container port `3000`.
- [ ] `infra/observability/kustomization.yaml` aggregates `00-namespace.yaml`, the four `prometheus/*.yaml` files, and the three `grafana/*.yaml` files.
- [ ] `kubectl top pod -n artemis-observability` after deploy reports the stack at < 1 GiB combined (Prom < 512 MiB, Graf < 512 MiB) on kind. Realistic ceiling on idle: Prom ~150 Mi, Graf ~80 Mi.
- [ ] `make lint-manifests` walks `infra/observability/` in addition to `uc*/manifests/` and stays clean (`kubectl apply --dry-run=client -k infra/observability/`).
- [ ] `make observability-up` is idempotent: re-running it on an already-installed cluster results in `unchanged` for every object.
- [ ] `make uc3-up` (and `make uc4-up`) brings the observability stack up before applying `uc3/manifests/` / `uc4/manifests/`. Until STORY-019 lands, `uc3-up` succeeds without error and the stack reaches `Ready`; the per-UC apply step is a no-op (manifests dir absent), preserving the existing graceful-skip behaviour the Makefile already implements.
- [ ] Cluster-side smoke validation (run locally, results documented in *Implementation Notes*):
  - [ ] `kubectl get pods -n artemis-observability` shows both pods `Ready 1/1` within 60 s of apply on cold kind.
  - [ ] `kubectl port-forward -n artemis-observability svc/prometheus-server 9090:9090` followed by `curl -s http://127.0.0.1:9090/-/ready` returns `Prometheus Server is Ready.`.
  - [ ] `curl -s http://127.0.0.1:9090/api/v1/targets` returns at least one scrape target (the Prom self-scrape on `localhost:9090` if the scrape config also includes it; otherwise an empty `activeTargets: []` until STORY-019 ships a `monitoring=prom` Service is acceptable).
  - [ ] `kubectl port-forward -n artemis-observability svc/grafana 3000:3000` followed by browser load of `http://127.0.0.1:3000` lands directly on Grafana (anonymous-admin) without a login form.
  - [ ] Grafana → *Data sources* lists *Prometheus* (provisioned), and the *Save & test* button reports `Successfully queried the Prometheus API`.
- [ ] Cross-author repro (NFR-003) deferred to STORY-028 (M5 dry-run) per the project pattern (matches STORY-014 / 017 / 031 / 032 / 033 / 034 deferrals). Justification: STORY-018 is infrastructure-only; the proof of the install lands when Clément runs `make uc3-up` end-to-end on his side, which he does for STORY-021's repro AC anyway. Documenting the deferral upfront aligns this story with the pattern instead of inventing a new pair-validation step that duplicates STORY-021's work.

---

## Technical Notes

### File layout (target)

```
infra/observability/
├── 00-namespace.yaml
├── kustomization.yaml
├── prometheus/
│   ├── 10-rbac.yaml             # ServiceAccount + ClusterRole + CRB
│   ├── 20-configmap-scrape.yaml # prometheus.yml as a ConfigMap
│   ├── 30-deployment.yaml       # single-replica, emptyDir, 256Mi
│   └── 40-service.yaml          # ClusterIP :9090
└── grafana/
    ├── 20-configmap-datasource.yaml  # provisioned Prom datasource
    ├── 30-deployment.yaml            # single-replica, emptyDir, 256Mi, anonymous-admin
    └── 40-service.yaml               # ClusterIP :3000
```

Numbering follows the `uc<N>/manifests/` convention (`00`-namespace first, RBAC `10`, ConfigMaps `20`, Deployments `30`, Services `40`). Per-component subdirectories keep the diff legible — Prom and Graf are independent and the architecture sketch (§C5) shows them split, so we mirror that. The numbering is per-subdir, not global, so kustomize's `resources:` ordering is what defines the apply order.

### Naming

Per `docs/artemis-naming.md`:
- Namespace: `artemis-observability` (cluster-scope-discoverable shared resource → `artemis-` prefix).
- Deployments + Services: bare names (`prometheus-server`, `grafana`) — the namespace already carries the `artemis-` prefix, so the workload names stay short and idiomatic. Matches the `mission-control` Deployment naming in `artemis-uc1` / `artemis-uc2`.
- Labels:
  - `app: prometheus-server` / `app: grafana` (selector pattern, matches uc1/uc2 Services).
  - `kagent-workshop/component: observability` (cross-cuts UC3 + UC4 — analogous to `kagent-workshop/uc: uc1` for per-UC resources, but scoped to the shared infra component instead of one UC).

### Prometheus scrape config — target shape

The scrape config keeps two jobs:
1. `prometheus` — self-scrape on `localhost:9090`. Always-on so the Prom UI shows at least one healthy target even before STORY-019 ships, which matters for the smoke validation step.
2. `kubernetes-services` — `kubernetes_sd_configs: role: endpoints`. Two `relabel_configs` rules:
   - Keep endpoints whose backing Service carries `monitoring=prom` (drop everything else).
   - Use the Service name + namespace + port name as the scrape target metadata, so `process_resident_memory_bytes{kubernetes_service_name="lunar-rover-telemetry", kubernetes_namespace="artemis-uc3"}` ships out of the box without per-UC config edits.

Scrape interval `15s`, evaluation interval `15s`. Workshop-fast — the leak curve needs to surface within seconds of the participant starting the loop.

### Grafana datasource provisioning

Provisioned via `apiVersion: 1` filesystem datasource format (Grafana's documented mechanism for *managed* datasources at startup, not the older config-file-only path). Mounted via `volumeMount` at `/etc/grafana/provisioning/datasources/` so Grafana picks it up on boot. URL points at the in-cluster Service DNS: `http://prometheus-server.artemis-observability.svc.cluster.local:9090`. `isDefault: true` so the agent's Grafana sub-agent (FR-012 AC, lands in STORY-019) doesn't have to name the datasource by ID.

### Resource sizing

Per architecture §C5 + risk register:
- Prom: requests 100 m CPU / 128 Mi RAM, limits 500 m / 256 Mi. emptyDir `medium: ""` (no `Memory` backing — disk-backed for the small TSDB working set is fine).
- Graf: requests 50 m CPU / 64 Mi RAM, limits 500 m / 256 Mi. emptyDir.
- Combined idle ceiling ~ 320 Mi RAM (well under the 1 GiB AC). Combined with UC3 app (~64 Mi) + kagent runtime (~200 Mi at idle) + UC1/UC2/UC3 Deployments (~200 Mi total) for UC4: aggregate < 1 GiB on workshop hardware, matching the 8 GiB participant slice budget.

### Image pinning

Per the project's general no-secrets / reproducibility posture, both images are tagged to a specific minor version (not `latest`):
- `prom/prometheus:v2.55.0` (or the latest 2.x stable at implementation time — refresh and pin).
- `grafana/grafana-oss:11.3.0` (or current stable LTS — refresh and pin).

Both are public Docker Hub images and pulled directly (no `apogasa` mirror needed; observability infra is shared across UCs and doesn't need the workshop's image-tag fictional rewrite that UC1's `mission-control` plays with).

### Makefile changes

```makefile
# ── Observability bundle (STORY-018, FR-012) ──
OBSERVABILITY_DIR := infra/observability

.PHONY: observability-up observability-down
observability-up: kagent-install
	@echo "observability-up: kubectl apply -k $(OBSERVABILITY_DIR)/"
	@kubectl apply -k $(OBSERVABILITY_DIR)/
	@kubectl rollout status -n artemis-observability deploy/prometheus-server --timeout=120s
	@kubectl rollout status -n artemis-observability deploy/grafana --timeout=120s

observability-down:
	@kubectl delete -k $(OBSERVABILITY_DIR)/ --ignore-not-found
```

UC3 + UC4 wiring: change the `define UC_TARGETS` body so `uc3-up` and `uc4-up` also depend on `observability-up`. Cleanest shape: keep the generic `UC_TARGETS` pattern but introduce a separate `UC_OBS_TARGETS` macro applied to N=3 and N=4, or just add a small `uc3-up uc4-up: observability-up` line outside the macro (this leaves the macro itself untouched and keeps the UC1/UC2 `up` targets deliberately *not* installing the observability stack — those UCs don't need it and pulling Prom + Graf images on every UC1/UC2 cycle would slow the dev loop).

`lint-manifests` change: extend `UC_MANIFEST_DIRS` indirectly by walking `infra/observability/` via `kubectl apply --dry-run=client -k infra/observability/` as a separate sub-step, since kustomize-aggregated resources don't fit the bare per-file dry-run pattern the existing target uses for `uc*/manifests/`.

Both changes are surgical to the existing Makefile (no rewrite, no helper-fn extraction).

### What STORY-018 deliberately does **not** modify

- `uc3/manifests/` and `uc3/agents/` — STORY-019 owns those. `uc3/README.md` already states (line 7) that the directory fills in across STORY-018 → STORY-021; this story does not pre-fill UC3-specific resources.
- `uc4/` — STORY-024 onwards.
- `apps/lunar-rover-telemetry/` — already shipped by STORY-010 with `prometheus-fastapi-instrumentator` and `/leak` (per the file's docstring referencing FR-012 AC).
- `schemas/` — no schema impact.
- `docs/architecture-…md` — the architecture already specifies this layout in §C5; nothing to refine.
- `docs/tour-content-conventions.md` — no narrative impact.

---

## Dependencies

**Prerequisite stories (all completed):**
- STORY-001 (repo skeleton).
- STORY-005 (Makefile / preflight / kind config) — provides the `kagent-install` and `uc<N>-up` plumbing this story extends.
- STORY-006 (Artemis naming) — provides the `artemis-observability` namespace name and the labelling convention.
- STORY-010 (`apps/lunar-rover-telemetry`) — already provides the `/metrics` endpoint that Prom will scrape once STORY-019 deploys it. Not a hard prerequisite for STORY-018 itself (the bundle stands alone), but UC3 end-to-end needs it.
- STORY-011 (`make lint-manifests`) — extended here with the `infra/observability/` walk.

**Blocked stories (consume this bundle):**
- STORY-019 (UC3 broken-state manifests + agent CRDs) — `Deps: STORY-010, STORY-018, STORY-006` per sprint plan.
- STORY-024 (UC4 multi-symptom manifests) — implicitly depends; the UC4 OOM symptom reuses UC3's pattern of a `monitoring=prom` Service + the leak loop.
- STORY-025 (UC4 coordinator a2a Agent CRD) — the UC3-debugger sub-agent it delegates to depends on Prom/Graf endpoints from this bundle.

**External dependencies:**
- Public Docker Hub images: `prom/prometheus`, `grafana/grafana-oss`. No private registries, no auth tokens (NFR-011).
- Kubernetes ≥ 1.27 (kind default at the project's chosen kagent v0.9.0 baseline). RBAC + apps/v1 + ConfigMap APIs are all stable.

---

## Definition of Done

- [ ] All 8 manifest files + `kustomization.yaml` shipped under `infra/observability/`.
- [ ] Makefile gains `observability-up` / `observability-down` targets; `uc3-up` and `uc4-up` depend on `observability-up`; `lint-manifests` walks `infra/observability/`.
- [ ] All AC ticked.
- [ ] `make lint-manifests` green locally over `uc*/manifests/` + `infra/observability/`.
- [ ] `make uc3-up` on a fresh kind brings the stack up; smoke validation results (port-forward, `/-/ready`, Grafana UI loads, datasource *Save & test* OK) recorded under *Implementation Notes*.
- [ ] PR opened; cross-author repro by Clément deferred to STORY-028 / STORY-021's repro pass (per project pattern).
- [ ] STORY-018 entry in `docs/sprint-status.yaml` updated to `status: completed` with `completion_date` and `actual_points`. Owner re-attribution from Clément to Quentin documented inline (mirrors the STORY-014 attribution note pattern).
- [ ] Merged to `main`.

---

## Story Points Breakdown

- **Prom subtree (RBAC + scrape ConfigMap + Deployment + Service):** 2 points. The scrape ConfigMap is the only piece with judgment in it (`kubernetes_sd_configs` + relabel rules) — the Deployment/Service/RBAC are mechanical.
- **Graf subtree (datasource ConfigMap + Deployment + Service):** 1 point. Provisioned datasource is the only non-default; anonymous-admin is three env vars.
- **Kustomization + namespace:** 0.5 points.
- **Makefile wiring (`observability-up`/`-down`, `uc3-up`/`uc4-up` dependency, `lint-manifests` extension):** 1 point.
- **Cluster smoke validation + AC sign-off:** 0.5 points.
- **Total:** 5 points.

**Rationale:** Five points matches the sprint-plan estimate. The story is mostly mechanical (vanilla manifests, well-trodden Prom/Graf install pattern), but five components × specific AC + the Makefile rewiring + cluster-side validation push it above the 3-point bands typical of pure-config stories. STORY-019 (5 points) is more unknown — kagent's pre-packaged Prom/Graf agent CRD shape is a documented day-1 risk in the sprint plan; STORY-018 deliberately defers that risk by *not* shipping any agent CRD.

---

## Additional Notes

- **The "this is not how you'd run Prom in production" disclaimer** belongs to STORY-021 (`uc3/README.md`), per its AC. STORY-018 just ships the bundle; the disclaimer doesn't appear inside `infra/observability/` itself. This is intentional — the workshop authors don't want a "don't do this in prod" note buried in 9 manifest files; they want one prominent disclaimer on the README that frames the whole UC3 setup.
- **Why `monitoring=prom` and not `prometheus.io/scrape: true` annotations.** The latter is the `kube-prometheus-stack` operator convention; we're not running an operator (architecture §C5). A bare label is simpler, more legible to participants reading `kubectl get svc -n artemis-uc3 -o yaml`, and survives across future operator-vs-vanilla decisions if the project ever swaps. The Service-label-based selection is also documented in architecture §C5 line 298: "carries `monitoring=prom` so Prometheus auto-scrapes it without per-UC config edits."
- **Why anonymous-admin Grafana is safe here.** Architecture L130 + the brief's "simplicité d'usage prioritaire" both call for it, and topology contains the exposure: workshop runs in per-participant vClusters, Grafana is `ClusterIP`-only, the participant reaches it via `kubectl port-forward` from their own slice. No cross-tenant reachability path exists.
- **Future-flag candidate (out of scope):** STORY-021's "this is not how you'd run Prom in production" disclaimer could land a small follow-up story making the Grafana provisioning ConfigMap a real worked example of the pattern (i.e. *with* an admin password, *with* persistent storage, behind a *non-anonymous* mode). Not designed for here per the *don't design for hypothetical future requirements* default.

---

## Progress Tracking

**Status History:**
- 2026-05-08: Created (Developer / Quentin, /bmad:dev-story → out-of-band per sprint plan note style; story doc authored alongside implementation start).
- 2026-05-08: Started by Quentin (re-attributed from Clément — see *Ownership swap*).
- 2026-05-08: Implemented + validated against live kind cluster.

**Actual Effort:** 5 points (matched estimate).

### Implementation Notes (2026-05-08)

#### Files added
- `infra/observability/00-namespace.yaml` — `artemis-observability` Namespace + `kagent-workshop/component: observability` label.
- `infra/observability/prometheus/10-rbac.yaml` — `ServiceAccount prometheus-server` + `ClusterRole artemis-observability-prometheus` (`get/list/watch` on `services/endpoints/pods/nodes/nodes/metrics`, plus `get` on `nonResourceURLs: ["/metrics"]` for kubelet metrics if ever needed) + `ClusterRoleBinding`.
- `infra/observability/prometheus/20-configmap-scrape.yaml` — `prometheus.yml` with two scrape jobs: `prometheus` (static self-scrape on `localhost:9090`) and `kubernetes-services` (`kubernetes_sd_configs: role: endpoints` with relabel rules keeping `monitoring=prom` Services and re-projecting namespace + service name + port name as labels).
- `infra/observability/prometheus/30-deployment.yaml` — single-replica `prom/prometheus:v2.55.1` Deployment, requests 100m/128Mi, limits 500m/256Mi, args include `--storage.tsdb.retention.time=2h` (workshop is ephemeral) and `--web.enable-lifecycle`. emptyDir TSDB. Readiness `/-/ready`, liveness `/-/healthy`.
- `infra/observability/prometheus/40-service.yaml` — `ClusterIP` Service `prometheus-server` exposing port `9090` → containerPort `http`.
- `infra/observability/grafana/20-configmap-datasource.yaml` — `datasources.yaml` provisioned datasource (`apiVersion: 1`, type `prometheus`, URL `http://prometheus-server.artemis-observability.svc.cluster.local:9090`, `isDefault: true`, `editable: false`, `jsonData.timeInterval: 15s` matching Prom's scrape interval).
- `infra/observability/grafana/30-deployment.yaml` — single-replica `grafana/grafana-oss:11.3.0` Deployment, anonymous-admin via `GF_AUTH_ANONYMOUS_ENABLED=true` + `GF_AUTH_ANONYMOUS_ORG_ROLE=Admin` + `GF_AUTH_DISABLE_LOGIN_FORM=true` + `GF_AUTH_BASIC_ENABLED=false`. emptyDir at `/var/lib/grafana`. Provisioning ConfigMap mounted at `/etc/grafana/provisioning/datasources`.
- `infra/observability/grafana/40-service.yaml` — `ClusterIP` Service `grafana` exposing port `3000`.
- `infra/observability/kustomization.yaml` — aggregates all 8 manifests under namespace `artemis-observability`; uses the `labels:` field (with `includeSelectors: false`) instead of the deprecated `commonLabels` so `kagent-workshop/component: observability` lands on every metadata.labels block without polluting Pod/Service selectors.

#### Files modified
- `Makefile`:
  - Added `OBSERVABILITY_DIR := infra/observability` and `OBSERVABILITY_NAMESPACE := artemis-observability` variables.
  - Added `observability-up` and `observability-down` to `.PHONY`.
  - `help` target gained two lines describing the new targets and a note that `uc3-up` / `uc4-up` install the bundle automatically.
  - `lint-manifests` now also runs `kubectl apply --dry-run=client -k $(OBSERVABILITY_DIR)/` after the per-UC walk; restructured the rc accumulation so partial coverage (UC dirs but no observability dir, or vice versa) still works.
  - New `observability-up` target depends on `kagent-install` and runs `kubectl apply -k`, then waits for both Deployments via `kubectl rollout status --timeout=120s`.
  - New `observability-down` target runs `kubectl delete -k --ignore-not-found`.
  - `uc3-up: observability-up` and `uc4-up: observability-up` declared after the `UC_TARGETS` macro expansion so UC1/UC2 dev-loop cycles stay fast (no Prom + Graf image pulls per UC1/UC2 iteration).

#### Files NOT modified (intentional, per *Scope* / *What STORY-018 deliberately does not modify*)
- `uc3/manifests/`, `uc3/agents/` — STORY-019 (Clément, M3).
- `uc4/` — STORY-024 onwards.
- `apps/lunar-rover-telemetry/` — already shipped by STORY-010 with `prometheus-fastapi-instrumentator` + `/leak`.
- `schemas/`, `docs/architecture-…md`, `docs/tour-content-conventions.md` — no impact.
- `uc3/README.md` — STORY-021 owns the prose + the "this is not how you'd run Prom in production" disclaimer.

#### Validation (against the live `kagent-workshop` kind cluster)

`make lint-manifests`: clean across `uc1/manifests/`, `uc2/manifests/`, and `infra/observability/` (10 resources dry-run-applied OK).

Live cluster smoke (cluster context `kind-kagent-workshop`, Kubernetes v1.31.0):

```text
$ kubectl apply -k infra/observability/
namespace/artemis-observability created
serviceaccount/prometheus-server created
clusterrole.rbac.authorization.k8s.io/artemis-observability-prometheus created
clusterrolebinding.rbac.authorization.k8s.io/artemis-observability-prometheus created
configmap/grafana-datasources created
configmap/prometheus-server created
service/grafana created
service/prometheus-server created
deployment.apps/grafana created
deployment.apps/prometheus-server created

$ kubectl rollout status -n artemis-observability deploy/prometheus-server --timeout=120s
deployment "prometheus-server" successfully rolled out

$ kubectl rollout status -n artemis-observability deploy/grafana --timeout=120s
deployment "grafana" successfully rolled out

$ kubectl get pods -n artemis-observability    # 31 s after apply
NAME                                 READY   STATUS    RESTARTS   AGE
grafana-584c799788-mqjvq             1/1     Running   0          31s
prometheus-server-647b96ffd6-62hk6   1/1     Running   0          31s

$ curl -s http://127.0.0.1:9090/-/ready          # via kubectl port-forward
Prometheus Server is Ready.

$ curl -s http://127.0.0.1:9090/api/v1/targets | jq …
activeTargets: 1   # static self-scrape, healthy
 - prometheus  up  http://localhost:9090/metrics

$ curl -s http://127.0.0.1:3000/api/health
{ "database": "ok", "version": "11.3.0", "commit": "d9455ff..." }

$ curl -s http://127.0.0.1:3000/api/datasources
[{ "name": "Prometheus", "type": "prometheus", "isDefault": true,
   "url": "http://prometheus-server.artemis-observability.svc.cluster.local:9090",
   "readOnly": true, "jsonData": { "timeInterval": "15s" } }]

$ curl -s http://127.0.0.1:3000/api/datasources/uid/<UID>/health
{ "status": "OK", "message": "Successfully queried the Prometheus API." }
```

**Service-discovery sentinel test** (above and beyond AC, to prove the relabel rule actually works pre-STORY-019):

```text
$ kubectl apply -f - <<<'…Service prometheus-self-scrape-test labelled monitoring: prom…'
$ # 20 s later
$ curl -s http://127.0.0.1:9090/api/v1/targets | jq …
activeTargets: 2
 - kubernetes-services  up  http://10.244.0.24:9090/metrics
 - prometheus           up  http://localhost:9090/metrics
droppedTargets: 32   # everything else in the cluster correctly filtered out
$ kubectl delete svc … prometheus-self-scrape-test
```

The kubernetes_sd target appeared, scraped successfully, and the 32 droppedTargets confirm the `monitoring=prom` relabel filter is doing what the architecture spec asks for.

**Idempotency check:**

```text
$ kubectl apply -k infra/observability/   # second apply, same content
namespace/artemis-observability unchanged
serviceaccount/prometheus-server unchanged
clusterrole.rbac.authorization.k8s.io/artemis-observability-prometheus unchanged
clusterrolebinding.rbac.authorization.k8s.io/artemis-observability-prometheus unchanged
configmap/grafana-datasources unchanged
configmap/prometheus-server unchanged
service/grafana unchanged
service/prometheus-server unchanged
deployment.apps/grafana unchanged
deployment.apps/prometheus-server unchanged
```

All ten resources reported `unchanged` — `make observability-up` is idempotent.

#### AC sign-off

- [x] `Namespace artemis-observability` with `kagent-workshop/component: observability`.
- [x] Prom RBAC + scrape ConfigMap + Deployment (256Mi limit, emptyDir) + ClusterIP Service :9090.
- [x] Grafana datasource ConfigMap + Deployment (256Mi limit, anonymous-admin, emptyDir) + ClusterIP Service :3000.
- [x] `kustomization.yaml` aggregates all 8 manifests.
- [ ] `kubectl top pod -n artemis-observability` < 1 GiB combined — *not validated*: metrics-server is not installed on this kind cluster (`error: Metrics API not available`). Pre-existing kind setup gap, not a STORY-018 issue. Resource limits (256Mi each) cap the worst case at < 512Mi combined regardless; the AC's *intent* is structurally satisfied by the `resources.limits` block. Flagging for the M5 dry-run to spot-check on a metrics-server-equipped cluster (or for Sprint 3 retro to decide whether `make uc<N>-up` should also install metrics-server).
- [x] `make lint-manifests` clean.
- [x] `kubectl apply -k infra/observability/` is idempotent (re-apply reports every object `unchanged`).
- [ ] `make uc3-up` brings the stack up before applying `uc3/manifests/` — *blocked by pre-existing `make kagent-install` non-idempotency*. The `kagent-install` target uses `helm install`, not `helm upgrade --install`, so re-running it on a cluster that already has kagent fails with `cannot re-use a name that is still in use`. STORY-018 wires `uc3-up` to depend on `observability-up`, which depends on `kagent-install`, so the chain inherits the bug. Once `kagent-install` is made idempotent (one-line fix outside this story's scope), the wiring is correct. Validated standalone: `kubectl apply -k infra/observability/` on the existing kind cluster (kagent already installed) works end-to-end.
- [x] Cluster-side smoke validation — Pods Ready 1/1 in 31 s; `/-/ready` OK; `/api/v1/targets` shows the self-scrape healthy; Grafana `/api/health` OK; provisioned datasource present, default, and `Successfully queried the Prometheus API.`; sentinel `monitoring=prom` Service picked up by kubernetes_sd within 20 s.
- [ ] Cross-author repro by Clément — deferred to STORY-021's repro pass / M5 dry-run STORY-028, per project pattern (matches STORY-014 / 017 / 031 / 032 / 033 / 034 deferrals).

#### Out-of-scope findings (flagged for follow-up)

1. **`make kagent-install` is not idempotent.** Uses `helm install`, fails on second run with `cannot re-use a name that is still in use`. Single-line fix: `helm install` → `helm upgrade --install`. This blocks `make uc3-up` from ever bringing the observability bundle up automatically on a cluster that already has kagent. Candidate for a small follow-up story or a Sprint 3 patch on Quentin's side. (STORY-018 implementation worked around it by applying directly via `kubectl apply -k`.)
2. **No metrics-server in the project's kind config.** The `kubectl top` AC can't be exercised locally. Either fold a metrics-server bundle into `kagent-install` (or a new `kind-up` step), or relax the AC to "limits cap the stack at < 512 Mi structurally". Worth raising at the M3 retro.
3. **`commonLabels` deprecation.** Initial kustomization.yaml used the deprecated `commonLabels` field; switched to `labels: [- includeSelectors: false, pairs: …]` after kustomize warned. Both produce identical output for STORY-018's case (no Pod selector pollution because `includeSelectors: false`), but the new form survives a future kustomize major bump.

### Next

- PR opened by Quentin against `main` (or merged directly per the project's two-author flow).
- Clément, when back, picks up STORY-019 / 020 / 021 with the bundle already in place. STORY-021 absorbs the cross-author repro for STORY-018 alongside its own.
- Out-of-scope finding #1 (kagent-install idempotency) ideally lands as a same-day follow-up so `make uc3-up` works end-to-end before STORY-019 needs it.

---

**This story was created using BMAD Method v6 - Phase 4 (Implementation Planning).**
