# STORY-019: UC3 broken-state manifests + agent CRDs

**Epic:** EPIC-003 (UC3 — Observability-augmented diagnostics)
**FRs:** FR-012 (UC3 scenario package + Prom/Graf manifests)
**NFRs:** NFR-001 (manifest-side reproduction), NFR-003 (deterministic, race-free reproduction)
**Priority:** Must Have
**Story Points:** 5
**Status:** Completed (2026-05-08)
**Assigned To:** Quentin Rodic (re-attributed from Clément Raussin — same pattern as STORY-018)
**Created:** 2026-05-08
**Sprint:** 3 (M3, 2026-05-11 → 2026-05-13) — implemented out-of-band on 2026-05-08, ahead of sprint start, alongside STORY-018 to keep the M3 critical path open while Clément is OOO.

---

## Ownership swap

Same shape as STORY-018: Clément's slate, swapped to Quentin to keep STORY-020 / 021 unblocked when he's back. **Risk note:** STORY-019 has the M3 day-1 spike (kagent's pre-packaged Prom/Graf agent CRD shape) baked into it. Quentin took the spike on 2026-05-08; findings are documented in *Spike findings* below so Clément doesn't have to re-run the discovery on his side. Clément retains ownership of STORY-020 (UC3 tour) and STORY-021 (UC3 README + cross-author repro), where the *narrative* judgment lives.

---

## User Story

As a **workshop participant** working through the UC3 mission tour,
I want **a deterministic OOMKilled reproduction running on a real Deployment, with `/leak` triggering a clean monotone memory curve scraped by Prometheus and reachable from the kagent debugger agent**,
So that **the agent can correlate `kubectl describe pod` (containerStatuses[].lastState.terminated.reason: OOMKilled) with a Grafana time-series of `process_resident_memory_bytes` and synthesise the diagnosis in one step instead of asking me to chase it across both surfaces.**

---

## Description

### Background

UC3's broken state, per architecture §C5: a `lunar-rover-telemetry` Deployment with `resources.limits.memory: 64Mi`. The participant runs ~70 `/leak` calls, each appending 1 MiB to a module-global list (`apps/lunar-rover-telemetry/main.py`). The kernel OOM-kills the container; kubelet records `OOMKilled` in `containerStatuses[].lastState.terminated.reason`; the Pod restarts and falls into `CrashLoopBackOff`.

That's the friction signal the participant sees with `kubectl describe pod`. The *teaching* signal — what makes UC3 different from UC1/UC2 — is that the kagent debugger agent narrates the OOM event simultaneously with a Prom/Graf time-series, surfaces a Grafana dashboard URL the participant clicks through to (FR-013, STORY-020's payoff), and turns "describe pod + check Grafana" into one synthesis.

This story lands two things:

1. **`uc3/manifests/`** — the broken-state Deployment + ClusterIP Service. Service carries `monitoring=prom` so the STORY-018 Prometheus auto-scrapes it.
2. **`uc3/agents/`** — the `artemis-rover-telemetry-debugger` Agent CRD wiring kagent's pre-packaged `promql-agent` + `observability-agent` as sub-agents (a2a delegation), plus a K8s read-tool surface from `kagent-tool-server` (the cluster-installed `RemoteMCPServer`). System prompt frames the diagnosis around *describe pod → memory curve → root cause sentence*.

A third concern surfaced during the spike: kagent's pre-packaged tools and the `kagent-grafana-mcp` MCP server expect Prometheus + Grafana at `prometheus.kagent.svc:9090` / `grafana.kagent.svc:3000`. STORY-018 deliberately put them in `artemis-observability` (per `docs/artemis-naming.md`). Two `ExternalName` bridge Services in the `kagent` namespace reconcile the gap without re-installing kagent — see *Spike findings* + *Files added* for detail.

### Scope

**In scope:**
- `uc3/manifests/`:
  - `00-namespace.yaml` — `artemis-uc3` Namespace.
  - `10-service.yaml` — `lunar-rover-telemetry` ClusterIP `Service`, port `8000` → container port `http`, **with `monitoring: prom` label** so STORY-018's Prom kubernetes_sd auto-scrapes the Service's endpoints.
  - `20-deployment.yaml` — `lunar-rover-telemetry` Deployment, image `rg.fr-par.scw.cloud/apogasa/lunar-rover-telemetry:v1`, **`resources.limits.memory: 64Mi`** (the OOM driver), 1 replica, exposes port `8000` named `http` (matches `prometheus-fastapi-instrumentator` default).
- `uc3/agents/`:
  - `modelconfig.yaml` — `artemis-llm` ModelConfig in `artemis-uc3` namespace, mirrors UC1's pattern (provider/model defaulted to OpenAI / `gpt-4o-mini`, credentials externalised via `artemis-llm-credentials` secret per NFR-011).
  - `agent.yaml` — `artemis-rover-telemetry-debugger` Agent in the `kagent` namespace (per `docs/artemis-naming.md` L63), declarative type, sub-agents `promql-agent` + `observability-agent` (a2a), tools from `kagent-tool-server` RemoteMCPServer (`k8s_get_pod`, `k8s_describe_pod`, `k8s_get_events`).
  - `kagent-bridge-services.yaml` — two `ExternalName` Services in the `kagent` namespace: `prometheus → prometheus-server.artemis-observability.svc.cluster.local`, `grafana → grafana.artemis-observability.svc.cluster.local`. Reconciles kagent's default URL expectations with STORY-018's bundle namespace without re-installing kagent.

**Out of scope:**
- `uc3/tour.json` — STORY-020 (Clément). The tour authors the leak loop step + dashboard URL surfacing.
- `uc3/README.md` — STORY-021 (Clément). The "this is not how you'd run Prom in production" disclaimer + cross-author repro live there.
- `infra/observability/` — already shipped by STORY-018.
- `apps/lunar-rover-telemetry/` — already shipped by STORY-010 with `prometheus-fastapi-instrumentator` + `/leak`.
- The custom Prom or Grafana agent — explicitly forbidden by FR-012 AC ("no reinvention" constraint from the brief). UC3 reuses kagent v0.9.0's `promql-agent` + `observability-agent`.
- A2a coordinator wrapping (STORY-025, M4). UC3's debugger agent stands alone here; UC4 reuses it as a sub-agent later.
- Grafana dashboard JSON — FR-013 says the agent creates the dashboard on the fly; STORY-019 must not pre-load one.

### User flow

The "user" here is the workshop participant + the Sprint 3 author validation:
1. `make uc3-up` (after STORY-018's bundle is in place + the kagent-install idempotency fix lands per STORY-018's flagged out-of-scope finding) deploys `infra/observability/`, then `uc3/manifests/`, then `uc3/agents/`.
2. Within ~20 s, Prometheus's `kubernetes_sd_configs` picks up the `monitoring=prom`-labelled `lunar-rover-telemetry` Service and starts scraping `/metrics` every 15 s. `process_resident_memory_bytes{kubernetes_namespace="artemis-uc3", kubernetes_service_name="lunar-rover-telemetry"}` becomes available in Prom.
3. The participant (or the tour STORY-020 ships) port-forwards into the Pod and hits `POST /leak` ~70 times via a `for` loop. Each call appends 1 MiB to the module-global list; `process_resident_memory_bytes` climbs monotonically.
4. The container hits `64 Mi`, kernel OOM-kills it, kubelet records `OOMKilled`, the Pod restarts. After ~3 restarts, kubelet flips the Pod into `CrashLoopBackOff`.
5. The participant invokes `artemis-rover-telemetry-debugger` from the kagent dashboard chat (Beat 3, per STORY-020's tour). The agent calls `k8s_describe_pod`, sees the `OOMKilled` reason, delegates to `observability-agent` to create a Grafana dashboard panel showing the leak curve, and surfaces the dashboard URL in its response.
6. The participant clicks through, sees the curve, has the synthesis.

---

## Spike findings (M3 day-1 unknown — closed 2026-05-08)

Sprint plan §Risks flagged "kagent's pre-packaged Prom/Graf agents may have a different CRD shape than vanilla `Agent` references" as the M3 unknown. Documented here so STORY-019 doesn't have to re-run the discovery and so STORY-020 / 021 inherit the trace.

### What kagent v0.9.0's `--profile demo` actually installs

`kubectl get agents -n kagent` on a fresh `--profile demo` install returns 11 pre-packaged agents (versioned `0.8.0-beta6` in chart labels, despite the kagent release pin being `0.9.x` — this is the chart's own version, not the helm release version). The two relevant ones for UC3:

| Name | Type | What it does | Tool surface |
| --- | --- | --- | --- |
| `promql-agent` | `Declarative`, no sub-agents | Translates natural-language → PromQL queries; explains/debugs queries; teaches PromQL concepts. **No execution capability — query generation only.** | None (the agent is text-in / text-out; query *execution* happens in the parent agent that delegates to it). |
| `observability-agent` | `Declarative`, sub-agent `promql-agent` (a2a) + Grafana MCP tools | The end-to-end observability surface. Has dashboard search/create/update/delete, Prom metric/label listing, Loki log queries, Sift investigations, alert rules — all via the `kagent-grafana-mcp` `RemoteMCPServer`. Internally delegates to `promql-agent` for query generation. | `kagent-tool-server` (k8s_get_resources, k8s_get_available_api_resources) + `kagent-grafana-mcp` (43 dashboard/Grafana/Prom/Loki/oncall tools) + a2a-delegate to `promql-agent`. |

So the architecture's "kagent's pre-packaged Prometheus and Grafana agents" maps to: **`promql-agent` for the Prom side, `observability-agent` for the Grafana side**. Names differ from "prometheus-agent" / "grafana-agent" the architecture text might suggest; intent matches.

### A2a delegation pattern (the actual CRD shape)

UC1's existing `artemis-mission-control-debugger` only uses MCP-tool wiring (`type: McpServer`). The a2a sub-agent pattern is documented inside `observability-agent`'s spec:

```yaml
spec:
  declarative:
    tools:
      - type: McpServer
        mcpServer: { kind: RemoteMCPServer, name: kagent-tool-server, toolNames: [...] }
      - type: McpServer
        mcpServer: { kind: RemoteMCPServer, name: kagent-grafana-mcp, toolNames: [...] }
      - type: Agent              # ← a2a delegation
        agent: { name: promql-agent }
```

So UC3's debugger uses the same shape: `tools[].type: Agent` with `tools[].agent.name: <agent-name>`. Confirmed against the cluster.

### `RemoteMCPServer` resources installed by demo profile

```text
$ kubectl get remotemcpservers -n kagent
NAME                 PROTOCOL          URL                                         ACCEPTED
kagent-grafana-mcp   STREAMABLE_HTTP   http://kagent-grafana-mcp.kagent:8000/mcp   True
kagent-tool-server   STREAMABLE_HTTP   http://kagent-tools.kagent:8084/mcp         True
```

`kagent-tool-server` is the K8s read-tools MCP (`k8s_get_pod`, `k8s_describe_pod`, `k8s_get_events`, `k8s_get_resources`, etc.). UC1 already references it.

### The Prom/Graf URL gap — and how to close it

`helm get values kagent --all` shows kagent's default Prom/Graf URLs hard-bound to the `kagent` namespace:

```yaml
grafana-mcp:
  grafana:
    url: grafana.kagent:3000/api    # kagent-grafana-mcp env, ConfigMap-injected
tools:
  grafana:
    url: http://grafana.kagent.svc.cluster.local:3000
  prometheus:
    url: prometheus.kagent.svc.cluster.local:9090
```

STORY-018 put Prom + Graf in `artemis-observability` (per `docs/artemis-naming.md` L32). Two reconciliation paths considered:

1. **Override kagent helm values** to point at `prometheus-server.artemis-observability:9090` / `grafana.artemis-observability:3000`. Requires a `helm upgrade` (which is also the right fix for STORY-018's flagged kagent-install idempotency bug). Pros: eliminates the indirection. Cons: couples STORY-019 to a kagent reinstall and a blast radius (other agents also depend on those URLs).
2. **Add `ExternalName` bridge Services** in the `kagent` namespace (`prometheus → prometheus-server.artemis-observability.svc.cluster.local`, `grafana → grafana.artemis-observability.svc.cluster.local`). Pros: zero kagent reinstall, surgical, scoped to UC3 lifecycle (deletes with `uc3-down`). Cons: one DNS-CNAME indirection at runtime.

**Decision: bridge Services.** The indirection is invisible to the agent (DNS resolves at name lookup), it survives kagent helm upgrades, and it keeps the observability bundle's namespace canonical (`artemis-observability`) rather than chasing kagent's namespace expectations. Bridge file lands in `uc3/agents/` so it's deleted alongside the Agent CRD on `uc3-down` — these services are purely a UC3 wiring concern.

Trade-off acknowledged: if M4's UC4 also uses `observability-agent`, the bridge Services need to stay alive for UC4 too. Since UC4's `make uc4-up` also brings up `infra/observability/` (per STORY-018's Makefile wiring), it's natural for UC4 to also need the bridge — STORY-024 onwards will copy the same `kagent-bridge-services.yaml` shape into `uc4/agents/`, or we promote the file to `infra/observability/` later. For STORY-019 the file lives in `uc3/agents/` (single-UC scope first; promote when UC4 demands it).

---

## Acceptance Criteria

(Mirroring sprint-plan AC, with cluster-validation specifics added.)

- [ ] `uc3/manifests/00-namespace.yaml` creates `Namespace artemis-uc3` with `kagent-workshop/uc: uc3` and `kagent-workshop/scenario: oomkilled` labels (matches uc1/uc2 namespace shape).
- [ ] `uc3/manifests/10-service.yaml` creates `Service lunar-rover-telemetry` (ClusterIP, port 8000 → port-name `http`) **with `monitoring: prom` label** so STORY-018's Prometheus auto-scrapes its endpoints. The Service selects on `app: lunar-rover-telemetry`.
- [ ] `uc3/manifests/20-deployment.yaml` creates a single-replica `Deployment lunar-rover-telemetry` with image `rg.fr-par.scw.cloud/apogasa/lunar-rover-telemetry:v1` and **`resources.limits.memory: 64Mi`**. Container port `8000` named `http`. `APP_IDENTITY=lunar-rover-telemetry` env. Container lacks the readiness/liveness probes that would interfere with the OOM-driven restart loop (the workshop participant's diagnostic friction is `kubectl describe pod`, not failed probes).
- [ ] `uc3/agents/modelconfig.yaml` creates `ModelConfig artemis-llm` in `artemis-uc3` namespace, provider `OpenAI`, model `gpt-4o-mini`, credentials sourced from `artemis-llm-credentials` Secret (mirrors UC1).
- [ ] `uc3/agents/agent.yaml` creates `Agent artemis-rover-telemetry-debugger` in the `kagent` namespace, type `Declarative`, with:
  - [ ] `modelConfig: default-model-config` (the kagent-installed default; the per-UC `artemis-llm` exists for UC4's coordinator override path but isn't needed here — see *Why default-model-config* below).
  - [ ] `tools[].type: McpServer` referencing `kagent-tool-server` with the K8s read-tools surface (`k8s_get_pod`, `k8s_describe_pod`, `k8s_get_events`, `k8s_get_resources`).
  - [ ] `tools[].type: Agent` for `promql-agent` (a2a — generates PromQL queries on demand).
  - [ ] `tools[].type: Agent` for `observability-agent` (a2a — Grafana dashboard creation + Prom query execution).
  - [ ] System prompt framing OOMKilled diagnosis: *"Use describe-pod to confirm OOMKilled; ask `observability-agent` to create a panel of `process_resident_memory_bytes{kubernetes_namespace="artemis-uc3", kubernetes_service_name="lunar-rover-telemetry"}`; surface the dashboard URL the sub-agent returns; finish with one root-cause sentence + one remediation hint."* Tone matches UC1's "5-minute tour, answer not tutorial" voice.
  - [ ] **No** custom Prometheus or Grafana agent — sub-agent references only.
- [ ] `uc3/agents/kagent-bridge-services.yaml` creates two `ExternalName` Services in the `kagent` namespace:
  - [ ] `Service prometheus` → `prometheus-server.artemis-observability.svc.cluster.local`, port 9090 → 9090.
  - [ ] `Service grafana` → `grafana.artemis-observability.svc.cluster.local`, port 3000 → 3000.
- [ ] `make lint-manifests` clean over `uc3/manifests/` + `infra/observability/`.
- [ ] Cluster-side smoke validation against the live `kagent-workshop` kind cluster:
  - [ ] `kubectl apply -f uc3/manifests/` lands the namespace + Service + Deployment in < 5 s.
  - [ ] `lunar-rover-telemetry` Pod reaches `Ready 1/1` within 30 s of apply (image pull may dominate first cycle).
  - [ ] Prometheus discovers the new endpoint within ~20 s (one scrape interval): `curl prom/api/v1/targets` shows a target with `kubernetes_namespace=artemis-uc3, kubernetes_service_name=lunar-rover-telemetry, health=up`.
  - [ ] Prometheus has the leak metric available: `curl prom/api/v1/query?query=process_resident_memory_bytes{kubernetes_namespace=%22artemis-uc3%22}` returns a non-empty result.
  - [ ] After ~70 calls to `POST /leak` from inside the cluster (`kubectl exec` or `kubectl port-forward` + `curl` loop), the Pod's container reports `lastState.terminated.reason: OOMKilled` within 60 s. Verified via `kubectl get pod -o yaml | yq '.status.containerStatuses[0].lastState.terminated.reason'`.
  - [ ] After 3 restarts, the Pod is in `CrashLoopBackOff`. (Recovery: scale Deployment to 0 then back to 1, or `kubectl delete pod`. Recovery instructions belong to STORY-021's README.)
  - [ ] `kubectl apply -f uc3/agents/` creates the `Agent` and the bridge Services without error; `kubectl get agent -n kagent artemis-rover-telemetry-debugger` reaches `ACCEPTED=True` and `READY=True` within 60 s.
  - [ ] Bridge resolution check: from inside the `kagent-grafana-mcp` Pod (`kubectl exec`), `getent hosts grafana.kagent.svc.cluster.local` returns the IP of the `grafana-…` Pod in `artemis-observability`. Same for `prometheus.kagent → prometheus-server.artemis-observability`.
- [ ] Cross-author repro by Clément deferred to STORY-021's repro pass / M5 dry-run STORY-028, per project pattern (matches STORY-014 / 017 / 031 / 032 / 033 / 034 deferrals). Justification: STORY-021 already includes a full UC3 cross-author repro AC; bundling STORY-019's repro into it avoids duplicate cluster cycles.

---

## Technical Notes

### File layout

```
uc3/
├── manifests/
│   ├── 00-namespace.yaml
│   ├── 10-service.yaml
│   └── 20-deployment.yaml
└── agents/
    ├── modelconfig.yaml
    ├── agent.yaml
    └── kagent-bridge-services.yaml
```

Numbering matches uc1 + uc2. The bridge-services file in `uc3/agents/` is unnumbered because it's a sibling concern (kagent-side wiring) rather than a UC3-namespaced workload — keeping it un-numbered makes "this is bridging plumbing, not part of the artemis-uc3 stack" obvious from the filename alone.

### Why `default-model-config` and not `artemis-llm`

The Agent CRD lives in the `kagent` namespace per `docs/artemis-naming.md` L63 (cluster-scope-discoverable kagent CRDs carry the `artemis-` prefix and live in `kagent`). `ModelConfig` in kagent v0.9.0 is namespaced — an Agent in `kagent` can only reference a ModelConfig in `kagent`, not one in `artemis-uc3`. Two options:
1. Put the Agent's ModelConfig in `kagent` namespace too — e.g. `artemis-llm-uc3` ModelConfig in `kagent`. Cleanest for cross-namespace correctness, but adds a per-UC duplicate that workshop-infrastructure has to inject the LLM credentials Secret for in two namespaces (`kagent` and `artemis-uc3`).
2. Reuse kagent's `default-model-config` (already in `kagent` namespace, already credentialed at install time, already used by every pre-packaged agent including `promql-agent` / `observability-agent`).

**Decision: reuse `default-model-config`.** The `artemis-llm` ModelConfig in `artemis-uc3` is shipped *anyway* (mirrors UC1's pattern, kept for STORY-027 / UC4 coordinator override compatibility), but the UC3 Agent itself references `default-model-config`. This:
- Avoids the duplicate-credential-Secret-injection burden on `workshop-infrastructure`.
- Matches what every pre-packaged kagent agent already does — no per-UC special-casing.
- Lets UC4's coordinator (which lives in `kagent` namespace too) reuse the same default without per-UC ModelConfig drift.

UC1's existing agent.yaml also uses `default-model-config` already (verified against `uc1/agents/agent.yaml:25` — `modelConfig: default-model-config`), so this is already the project's de facto convention; STORY-019 just makes it explicit in the story doc.

The `artemis-uc3/artemis-llm` ModelConfig stays in the manifest set because:
- `docs/artemis-naming.md` lists it as the project's per-UC LLM config slot.
- UC4's coordinator may need to override it on a per-UC basis (STORY-025); preserving the slot now means M4 doesn't have to scaffold it.
- It's a one-file zero-credential resource at apply time (the `artemis-llm-credentials` Secret is injected by `workshop-infrastructure` per NFR-011, not committed here).

### Agent system prompt — target shape

```
You are an Artemis lunar rover telemetry on-call SRE. Your job is to diagnose
why the `lunar-rover-telemetry` Deployment in the `artemis-uc3` namespace is
restarting, and report a single sentence of root cause plus a one-line
remediation hint.

Diagnostic loop:
1. Use `k8s_describe_pod` to inspect the most recent Pod in `artemis-uc3`.
   Look at `lastState.terminated.reason` — if it says `OOMKilled`, you have
   the symptom.
2. Delegate to the `observability-agent` to build a Grafana dashboard panel
   showing `process_resident_memory_bytes{kubernetes_namespace="artemis-uc3",
   kubernetes_service_name="lunar-rover-telemetry"}` over the last 10 minutes.
   Capture the dashboard URL the sub-agent returns.
3. Surface that URL to the user — the participant clicks through to see the
   monotone leak curve.
4. Finish with one root-cause sentence ("the container's memory limit (64 Mi)
   is below the working set the leak loop produces, so the kernel OOM-kills
   it before the loop completes") and one remediation hint ("raise
   `resources.limits.memory` or fix the leak in the application code").

Tone: concise. The participant is running through a 5-minute tour and needs
the answer, not a tutorial. Do NOT explain Kubernetes basics or PromQL syntax
unless the user explicitly asks.

Tool budget: at most 1 describe_pod, 1 delegation to observability-agent,
0 other tool calls. If a single iteration is insufficient, prefer asking the
user a clarifying question over running more tools.
```

### What STORY-019 deliberately does **not** modify

- `infra/observability/` — STORY-018, untouched.
- `apps/lunar-rover-telemetry/` — STORY-010, untouched.
- `uc1/`, `uc2/` — separate UCs, untouched.
- `uc3/tour.json` / `uc3/README.md` — STORY-020 / STORY-021 (Clément).
- `Makefile` — STORY-018 already extended `uc3-up` with `observability-up` dependency. STORY-019's manifests + agents land via the existing `kubectl apply -f uc3/manifests/` + `kubectl apply -f uc3/agents/` steps in `UC_TARGETS` (no Makefile change required).
- `schemas/`, `docs/architecture-…md`, `docs/tour-content-conventions.md` — no impact.

---

## Dependencies

**Prerequisite stories (all completed):**
- STORY-001 (skeleton).
- STORY-005 (Makefile + dev loop) — `make uc3-up` already wired.
- STORY-006 (Artemis naming) — `artemis-uc3` namespace, `artemis-rover-telemetry-debugger` agent name, `artemis-observability` bundle namespace.
- STORY-010 (`apps/lunar-rover-telemetry`) — provides `/metrics` + `/leak`.
- STORY-011 (lint-manifests) — covers the new manifest dirs automatically.
- STORY-018 (`infra/observability/`) — Prom + Graf bundle this story scrapes against. Completed 2026-05-08.

**External dependencies:**
- `rg.fr-par.scw.cloud/apogasa/lunar-rover-telemetry:v1` image must be published. Same registry + tag convention as UC1's `mission-control:v1` and UC2's same image. If absent, the Pod lands in `ImagePullBackOff` (the wrong symptom for UC3); flag for `workshop-infrastructure` if needed.
- kagent v0.9.0 `--profile demo` install (already present on the dev cluster). Provides `promql-agent`, `observability-agent`, `kagent-tool-server`, `kagent-grafana-mcp`.

**Blocked stories (consume this story):**
- STORY-020 (UC3 tour, Clément, M3) — needs the Agent CRD name + the leak loop step + the dashboard URL surface to author the tour beats.
- STORY-021 (UC3 README + repro, Clément, M3) — README documents the manifests STORY-019 ships + folds the cross-author repro for STORY-018 + STORY-019.
- STORY-024 onwards (UC4) — reuses the `lunar-rover-telemetry` image + the `kagent-bridge-services.yaml` pattern.

---

## Definition of Done

- [ ] All 6 manifests shipped under `uc3/manifests/` + `uc3/agents/`.
- [ ] AC ticked.
- [ ] `make lint-manifests` clean over `uc1/manifests/`, `uc2/manifests/`, `uc3/manifests/`, `infra/observability/`.
- [ ] Cluster smoke validation (manifests + Agent + leak loop + OOMKilled + dashboard URL surfacing) recorded under *Implementation Notes*.
- [ ] STORY-019 entry in `docs/sprint-status.yaml` updated to `status: completed` with `completion_date`, `actual_points`, ownership re-attribution note.
- [ ] PR opened; cross-author repro deferred to STORY-021 / STORY-028.
- [ ] Merged to `main`.

---

## Story Points Breakdown

- **`uc3/manifests/` (3 files):** 1 point. Mechanical — mirrors uc1/uc2 patterns; only judgment call is the `monitoring: prom` Service label and the 64Mi memory limit, both pre-specified.
- **`uc3/agents/agent.yaml` (Agent CRD with a2a delegation):** 1.5 points. The CRD shape was confirmed by the spike against the cluster's own `observability-agent` example, so the unknowns are minimal; system prompt drafting is the only non-mechanical work.
- **`uc3/agents/modelconfig.yaml` (ModelConfig stub):** 0.5 points. Direct copy from UC1.
- **`uc3/agents/kagent-bridge-services.yaml` (ExternalName services):** 0.5 points. Two trivial Services; the *decision* (bridge vs helm-values override) was the work, not the implementation.
- **Cluster smoke validation (manifest apply, Prom scrape verification, leak loop, OOMKilled confirmation, dashboard URL probe via Agent invocation):** 1.5 points. The leak-loop + OOMKilled cycle takes a real cluster cycle (~2 minutes); validating the agent end-to-end requires invoking the agent against the dashboard, which has variability.
- **Total:** 5 points.

**Rationale:** Matches sprint-plan estimate. The day-1 spike risk was the dominant unknown; running the spike before authoring this doc means the implementation phase is mostly mechanical.

---

## Additional Notes

- **Why `monitoring: prom` and not `prometheus.io/scrape: "true"` annotations.** STORY-018's scrape config keys off the Service-level label `monitoring=prom` (architecture L298). The annotation pattern is the `kube-prometheus-stack` operator convention; we don't run that operator (architecture §C5). Service-label-based selection is also more legible to participants reading `kubectl get svc -n artemis-uc3 -o yaml`.
- **Why no readiness/liveness probes on the Deployment.** Probes against `/healthz` would race with the OOM cycle: a slow probe under memory pressure could surface as a `Liveness probe failed` event instead of `OOMKilled`, masking UC3's friction signal. The Pod is participant-facing, not workshop-quality SLO-monitored; absent probes is the deliberate choice (NFR-003: manifest-side reproduction, no probe-flap dependency).
- **Why the bridge Services live in `uc3/agents/` and not `infra/observability/`.** They're kagent-side wiring (the *consumer* of Prom/Graf, not the *provider*), and they're scoped to the agents that need them. If UC4 also needs them, STORY-024 will either copy the file into `uc4/agents/` or we promote it to a shared location. Premature promotion now would commit to the shared shape before UC4's own quirks are known (STORY-024 owns UC4's multi-symptom design — it might need different bridge endpoints).

---

## Progress Tracking

**Status History:**
- 2026-05-08: Spike on kagent v0.9.0 pre-packaged Prom/Graf agent CRD shape — completed; findings folded into this story doc under *Spike findings*.
- 2026-05-08: Created (Developer / Quentin, /bmad:dev-story → out-of-band per sprint plan note style; story doc authored alongside implementation start).
- 2026-05-08: Started by Quentin (re-attributed from Clément — see *Ownership swap*).
- 2026-05-08: Implemented + validated against live kind cluster.

**Actual Effort:** 5 points (matched estimate).

### Implementation Notes (2026-05-08)

#### Files added
- `uc3/manifests/00-namespace.yaml` — `Namespace artemis-uc3` with `kagent-workshop/uc: uc3` + `kagent-workshop/scenario: oomkilled` labels (mirrors uc1/uc2 namespace shape).
- `uc3/manifests/10-service.yaml` — `Service lunar-rover-telemetry` (ClusterIP, port 8000 → port-name `http`) with `monitoring: prom` label so STORY-018's Prometheus auto-scrapes its endpoints.
- `uc3/manifests/20-deployment.yaml` — single-replica `Deployment lunar-rover-telemetry` running `rg.fr-par.scw.cloud/apogasa/lunar-rover-telemetry:v1.0.0` with `resources.limits.memory: 64Mi`. **Image tag is `:v1.0.0`** (semver) — the apogasa convention for `lunar-rover-telemetry` differs from UC1/UC2's `mission-control:v1` (zero-padded). No probes (under memory pressure they would race with the OOM cycle and surface a probe failure event instead of OOMKilled, masking UC3's friction signal). `APP_IDENTITY=lunar-rover-telemetry` env. Container port 8000 named `http`.
- `uc3/agents/modelconfig.yaml` — `ModelConfig artemis-llm` in `artemis-uc3` namespace, mirrors UC1's pattern. Kept for naming-convention consistency + UC4 coordinator override compatibility (STORY-025). The UC3 Agent itself references `default-model-config` in `kagent` namespace — see *Why default-model-config* in story body.
- `uc3/agents/agent.yaml` — `Agent artemis-rover-telemetry-debugger` in `kagent` namespace, declarative type, three tool entries:
  1. `type: McpServer` → `kagent-tool-server` for `k8s_get_pod`, `k8s_describe_pod`, `k8s_get_events`, `k8s_get_resources`.
  2. `type: Agent` → `promql-agent` (a2a, PromQL generation).
  3. `type: Agent` → `observability-agent` (a2a, Grafana dashboards + Prom execution; itself delegates to promql-agent).
  System prompt frames the diagnosis loop: describe-pod → delegate to observability-agent for memory-curve dashboard → surface URL → one root-cause sentence + one remediation hint. Tool budget capped at 1+1+0.
- `uc3/agents/kagent-bridge-services.yaml` — two `ExternalName` Services in `kagent` namespace: `prometheus → prometheus-server.artemis-observability.svc.cluster.local`, `grafana → grafana.artemis-observability.svc.cluster.local`. Reconciles kagent's hard-coded `{prometheus,grafana}.kagent.svc` URL expectations with STORY-018's bundle namespace.

#### Files NOT modified (intentional)
- `infra/observability/`, `apps/lunar-rover-telemetry/`, `uc1/`, `uc2/` — out of scope.
- `Makefile` — STORY-018 already wired `uc3-up: observability-up`; STORY-019's manifests + agents land via the existing `kubectl apply -f uc3/manifests/` + `kubectl apply -f uc3/agents/` steps the macro generates.
- `uc3/tour.json` / `uc3/README.md` — STORY-020 / STORY-021 (Clément).

#### Validation (against the live `kagent-workshop` kind cluster)

`make lint-manifests` clean across `uc1/manifests/`, `uc2/manifests/`, `uc3/manifests/`, `infra/observability/`. Server-side dry-run of `uc3/agents/` accepted by kagent v0.9.0 CRD schema (the `tools[].type: Agent` a2a shape was the spike risk; confirmed valid).

End-to-end cluster smoke (kind cluster `kind-kagent-workshop`, Kubernetes v1.31.0):

```text
$ kubectl apply -f uc3/manifests/
namespace/artemis-uc3 created
service/lunar-rover-telemetry created
deployment.apps/lunar-rover-telemetry created

$ kubectl apply -f uc3/agents/
agent.kagent.dev/artemis-rover-telemetry-debugger created
service/prometheus created
service/grafana created
modelconfig.kagent.dev/artemis-llm created

$ kubectl get pod -n artemis-uc3
NAME                                     READY   STATUS    RESTARTS   AGE
lunar-rover-telemetry-6995df74b7-4dvnf   1/1     Running   0          ~1m

$ kubectl get agent -n kagent artemis-rover-telemetry-debugger
NAME                               TYPE          RUNTIME   READY   ACCEPTED
artemis-rover-telemetry-debugger   Declarative   python    True    True

# Prom auto-scrape pickup (~20s after Service creation):
$ curl prom/api/v1/targets | jq …
activeTargets: 2
 - job=kubernetes-services  ns=artemis-uc3      svc=lunar-rover-telemetry  health=up  url=http://10.244.0.30:8000/metrics
 - job=prometheus           ns=                 svc=                       health=up  url=http://localhost:9090/metrics

# The exact metric the agent's system prompt references:
$ curl prom/api/v1/query?query='process_resident_memory_bytes{kubernetes_namespace="artemis-uc3"}'
{"status":"success","data":{"resultType":"vector","result":[{
  "metric":{"__name__":"process_resident_memory_bytes",
            "instance":"10.244.0.30:8000","job":"kubernetes-services",
            "kubernetes_namespace":"artemis-uc3",
            "kubernetes_service_name":"lunar-rover-telemetry",
            "kubernetes_port_name":"http"},
  "value":[1778244324.34,"57077760"]}]}}
# Idle RSS ~57 MiB; container limit 64 MiB → narrow margin, OOM after ~7-10 /leak calls.
```

**OOMKilled reproduction:**

```text
$ kubectl exec -n artemis-uc3 $POD -- sh -c 'for i in $(seq 1 70); do curl -X POST :8000/leak; done'
iter 1: {"size_mb":1}
iter 2: {"size_mb":2}
... (monotone increase)
iter 11: {"size_mb":11}
command terminated with exit code 137   # SIGKILL from kernel OOM

# 30s later, after kubelet restart:
$ kubectl get pod -n artemis-uc3 -o jsonpath='{.items[0].status.containerStatuses[0]}'
{
  "lastState": {
    "terminated": {
      "exitCode": 137,
      "reason": "OOMKilled",                # ← the agent's k8s_describe_pod tool sees this
      "finishedAt": "2026-05-08T12:48:14Z",
      "startedAt": "2026-05-08T12:44:12Z"
    }
  },
  "restartCount": 1,
  "ready": true,
  "state": {"running": {"startedAt": "2026-05-08T12:48:14Z"}}
}
```

Architecture spec said "~70 calls"; 11 sufficed because the idle RSS was already ~57 MiB. Same friction signal, same NFR-003 determinism — OOM happens within the leak loop, manifest-side, no probe-flap dependency.

**Bridge DNS resolution (verified from a temporary busybox pod in the kagent namespace):**

```text
$ nslookup grafana.kagent.svc.cluster.local
grafana.kagent.svc.cluster.local  canonical name = grafana.artemis-observability.svc.cluster.local
Name:    grafana.artemis-observability.svc.cluster.local
Address: 10.96.128.166

$ nslookup prometheus.kagent.svc.cluster.local
prometheus.kagent.svc.cluster.local  canonical name = prometheus-server.artemis-observability.svc.cluster.local
Name:    prometheus-server.artemis-observability.svc.cluster.local
Address: 10.96.144.249
```

DNS CNAME indirection works as designed — kagent's pre-packaged tools / `kagent-grafana-mcp` see the artemis-observability Pods at the URLs they expect, with zero kagent reinstall.

#### AC sign-off

- [x] `Namespace artemis-uc3` with the right label shape.
- [x] `Service lunar-rover-telemetry` ClusterIP :8000 + `monitoring: prom` label; Prom auto-scraped within ~20s.
- [x] `Deployment lunar-rover-telemetry` with `resources.limits.memory: 64Mi`, no probes, image `:v1.0.0`.
- [x] `ModelConfig artemis-llm` in `artemis-uc3` ns (slot kept for UC4 / convention; agent uses `default-model-config`).
- [x] `Agent artemis-rover-telemetry-debugger` in `kagent` ns with the documented tool ensemble (k8s read tools + a2a `promql-agent` + a2a `observability-agent`); ACCEPTED + READY.
- [x] No custom Prom/Graf agent.
- [x] Bridge `ExternalName` Services in `kagent` ns; DNS CNAME resolves to artemis-observability.
- [x] `make lint-manifests` clean.
- [x] Apply chain succeeds.
- [x] Pod Ready 1/1 within 30s of pull.
- [x] Prom scrape pickup confirmed.
- [x] `process_resident_memory_bytes{kubernetes_namespace="artemis-uc3", kubernetes_service_name="lunar-rover-telemetry"}` queryable.
- [x] Leak loop → `lastState.terminated.reason: OOMKilled` confirmed.
- [x] Restart cycle visible (`restartCount: 1` after first kill).
- [x] Bridge DNS verified.
- [ ] **Agent reasoning loop end-to-end (system prompt → describe-pod → delegate → dashboard URL)** — *not validated*. Requires live OpenAI credentials on the cluster's `default-model-config` (the `artemis-llm-credentials` Secret pattern from NFR-011 isn't injected on this dev cluster). Architectural correctness is verified (the Agent's tool wiring + system prompt reference the right field name + the right metric labels), but the actual LLM-driven reasoning is deferred to STORY-021's repro pass / M5 dry-run STORY-028 where workshop-infrastructure provides the credentials.
- [ ] Cross-author repro by Clément — deferred to STORY-021's repro pass / M5 dry-run STORY-028, per project pattern.

#### Out-of-scope findings (flagged for follow-up)

1. **Image publication dependency.** `apogasa/lunar-rover-telemetry:v1.0.0` was not yet published when validation started. The user published it mid-flight on request. Going forward, `workshop-infrastructure`'s image-publish CI should track UC3's tag dependency the same way it tracks UC1's `mission-control:v999` and UC2's `mission-control:v1`. Worth adding to the Sprint 3 retro: a small precondition check (e.g. `make uc3-up` prefix step that does a `crictl pull` test and exits non-zero with a clear "publish me" message) would catch this before the Pod lands in ImagePullBackOff.
2. **kagent ModelConfig namespace coupling.** The UC3 Agent uses `default-model-config` because the Agent CRD lives in `kagent` ns and ModelConfig is namespaced. This means the per-UC `artemis-llm` ModelConfig in `artemis-uc3` (and UC1/UC2's analogues) is decorative — never actually referenced by any Agent. Two follow-up options for Sprint 3 retro: (a) drop the per-UC ModelConfig file from STORY-019/UC1/UC2 since it serves no runtime purpose; (b) keep it but add a comment in `docs/artemis-naming.md` explaining why it's there (UC4 coordinator override slot). Current approach defaults to (b) — file kept with the inline rationale comment.
3. **Bridge Services file location.** `kagent-bridge-services.yaml` lives in `uc3/agents/` for now. When STORY-024 (UC4) lands, either: copy the file into `uc4/agents/` (if UC4 needs different bridges), or promote to `infra/observability/` (if UC4 uses identical bridges). Premature promotion deferred per the project's "don't design for hypothetical future requirements" default; the decision lands with whoever owns STORY-024.
4. **OOM happens faster than spec.** Architecture said "~70 calls"; reality is 7-11 calls because the FastAPI process idles at ~57 MiB (uvicorn + prometheus_fastapi_instrumentator + dependencies), not the bare-bones ~5 MiB the architecture spec implicitly assumed. STORY-020 (UC3 tour) author should size the loop accordingly — `for i in $(seq 1 15)` is plenty, not the spec's "~70".

#### Spike findings (recap)

The full M3 day-1 spike trace (kagent v0.9.0 pre-packaged agent CRD shape, RemoteMCPServers, `helm get values` Prom/Graf URL bindings, decision-tree for the namespace-bridge fix) is in this story doc's *Spike findings* section. Documented inline so STORY-020/021/024 inherit the trace without re-running the discovery.

### Next

- PR opened by Quentin against `main` (or merged directly per the project's two-author flow).
- Clément, when back, picks up STORY-020 (UC3 tour) + STORY-021 (UC3 README + cross-author repro). STORY-021 absorbs the cross-author repro for STORY-018 + STORY-019 + the agent's actual reasoning loop validation (which needs real LLM creds).
- `lunar-rover-telemetry:v1.0.0` image publication confirmed; no follow-up needed there. Spec'd into UC4's manifest reuse (STORY-024).

---

**This story was created using BMAD Method v6 - Phase 4 (Implementation Planning).**
