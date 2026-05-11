# UC3 — OOMKilled (lunar rover telemetry leak)

**Owner:** Quentin Rodic (re-attributed from Clément Raussin — full M3 Clément swap; see [`../docs/stories/STORY-021.md`](../docs/stories/STORY-021.md) §Ownership swap)
**Milestone:** M3 (Sprint 3, 2026-05-11 → 2026-05-13; landed out-of-band 2026-05-08)
**Tour ID:** `kagent-uc3-oom-killed`
**FR / NFR:** FR-012 (scenario package + Prom/Graf manifests), FR-013 (tour with on-the-fly dashboard), NFR-001/002/003/006/008

UC3 is the workshop's third diagnostic axis: external observability. The participant has just seen UC1 (single-resource — pod + three commands → one synthesis) and UC2 (cross-resource — pod + node + five commands → one synthesis). UC3 extends the same pattern to a third surface: the cluster's metric pipeline. The participant brings a lunar rover online, runs a short telemetry stream that crashes the rover, and hands the diagnosis to a kagent agent that not only reads `kubectl describe pod` but also delegates to kagent's pre-packaged Prometheus + Grafana sub-agents to surface a memory-curve dashboard URL the participant clicks through to. UC4 will fold UC3's debugger into a multi-agent coordinator (FR-017).

## Artemis narrative

The lunar rover is checking in for the Artemis pad shift, but its outbound telemetry buffer can't survive a normal mission burst — the rover queues bursts in memory until the kernel reaps the container. The participant plays the on-call: applies the rover deployment as a routine mission setup, runs a transient operator station that pushes 30 telemetry bursts to the rover's outbound queue, discovers the friction by hand (`kubectl get pods` shows the rover restarted mid-stream), then hands the diagnosis to **`artemis-rover-telemetry-debugger`** through the kagent dashboard chat. The agent describes the OOMKilled cause from `lastState.terminated.reason`, delegates to `observability-agent` to build a Grafana memory-curve panel, surfaces the dashboard URL in the chat, and the participant clicks through to see the leak slope first-hand. See [`../docs/artemis-naming.md`](../docs/artemis-naming.md#narrative-arc-uc1--uc4) for the full arc, and [`../docs/tour-content-conventions.md`](../docs/tour-content-conventions.md) for the 4-beat structure (mission setup → status check → call the agent → manual recap).

## Prerequisite — observability bundle + kagent bridge

UC3 is the first UC that depends on infrastructure beyond vanilla kagent. Two prerequisites must already be on the cluster before `kubectl apply -f uc3/manifests/` produces a meaningful broken state:

### `infra/observability/` Prom + Graf bundle (STORY-018)

A vanilla Prometheus + Grafana single-replica install in the `artemis-observability` namespace:

- **Prometheus** (`prom/prometheus:v2.55.1`) — single-replica `Deployment`, `emptyDir` storage, `--storage.tsdb.retention.time=2h`, scrape config that uses `kubernetes_sd_configs: role: endpoints` with a `keep` relabel rule on `monitoring=prom` Service labels. ClusterIP Service on port `9090`.
- **Grafana** (`grafana/grafana-oss:11.3.0`) — single-replica `Deployment`, anonymous-admin (`GF_AUTH_ANONYMOUS_ENABLED=true`, `GF_AUTH_ANONYMOUS_ORG_ROLE=Admin`, `GF_AUTH_DISABLE_LOGIN_FORM=true`), `emptyDir` storage, provisioned Prom datasource via filesystem ConfigMap. ClusterIP Service on port `3000`.
- **No operator.** No `kube-prometheus-stack`, no `prometheus-operator`, no `grafana-operator`. Plain manifests under `infra/observability/{prometheus,grafana}/` aggregated by `kustomization.yaml`.

`make observability-up` installs the bundle; `make uc3-up` and `make uc4-up` depend on it (STORY-018's Makefile wiring). UC1 and UC2 deliberately do **not** install the bundle — the dev-loop saves a Prom/Graf image pull per UC1/UC2 iteration.

The Service-label-based scrape selection means UC3's `lunar-rover-telemetry` Service is auto-discovered by Prom's kubernetes_sd as soon as it lands in the cluster (~one scrape interval, ≤ 20 s).

### kagent ↔ artemis-observability namespace bridge (STORY-019)

kagent v0.9.0's `--profile demo` ships pre-packaged agents (`promql-agent`, `observability-agent`) plus two `RemoteMCPServer`s (`kagent-tool-server`, `kagent-grafana-mcp`). Their helm-time URL bindings hard-code `prometheus.kagent.svc:9090` and `grafana.kagent.svc:3000` — not `artemis-observability`. STORY-019 reconciles the gap with two `ExternalName` Services in the `kagent` namespace:

| `kagent` ns Service (ExternalName) | CNAMEs to                                                   |
| ---------------------------------- | ----------------------------------------------------------- |
| `prometheus`                       | `prometheus-server.artemis-observability.svc.cluster.local` |
| `grafana`                          | `grafana.artemis-observability.svc.cluster.local`           |

The CNAME indirection is invisible to kagent's runtime: the pre-packaged tools resolve `grafana.kagent.svc.cluster.local` and get the artemis-observability Pod's IP. Zero kagent helm reinstall, surgical, scoped to the observability bundle's lifecycle (the bridge Services delete with `make observability-down`). See [`../docs/stories/STORY-019.md`](../docs/stories/STORY-019.md) §Spike findings for the alternatives considered (helm-values override path, namespace migration) and the rationale.

The bridge Services live in [`../infra/observability/kagent-bridge-services.yaml`](../infra/observability/kagent-bridge-services.yaml) — promoted from `uc3/agents/` by STORY-025 once UC4 confirmed identical bridge needs. They are applied by `make observability-up` alongside the Prom + Graf kustomize bundle, so both `make uc3-up` and `make uc4-up` inherit them transparently.

## The bug

A single Deployment under one namespace, with a `resources.limits.memory: 64Mi` cap that's below the working set the participant-triggered telemetry stream produces. Three resources land on the cluster on apply:

| Resource    | Name                    | Where it lives | Notes                                                                                                                                       |
| ----------- | ----------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Namespace   | `artemis-uc3`           | cluster-scoped | Labelled `kagent-workshop/uc=uc3`, `kagent-workshop/scenario=oomkilled`.                                                                    |
| Service     | `lunar-rover-telemetry` | `artemis-uc3`  | ClusterIP, port 8000 → container port `http`. **Carries `monitoring=prom`** so STORY-018's Prom kubernetes_sd auto-scrapes it.              |
| Deployment  | `lunar-rover-telemetry` | `artemis-uc3`  | `replicas: 1`, image `rg.fr-par.scw.cloud/apogasa/lunar-rover-telemetry:v1.0.0` (semver tag — note `:v1.0.0`, not UC1/UC2's `:v1`/`:v999`), **`resources.limits.memory: 64Mi`** — the broken bit. No probes (probes would race with the OOM cycle and surface as Liveness failures, masking the OOMKilled signal — NFR-003). |

The `lunar-rover-telemetry` image is the FastAPI variant from `apps/lunar-rover-telemetry/` (FR-007). It exposes:

- `/healthz` — health check.
- `/metrics` — Prometheus text format, instrumented via `prometheus-fastapi-instrumentator`. STORY-018's Prom scrape picks this up via the `monitoring=prom` Service label.
- `POST /leak` — appends 1 MiB to a module-global list per call. Used by the tour's Beat 1 to drive the rover into OOMKilled deterministically.

The mechanism, end-to-end:

1. `make uc3-up` (or the equivalent manual chain) installs the observability bundle, creates `artemis-uc3`, applies the Service + Deployment.
2. The rover Pod boots; uvicorn starts; `prometheus-fastapi-instrumentator` mounts `/metrics`. Idle RSS settles at ~57 MiB (uvicorn + instrumentator + dependencies). With the 64 MiB limit, the headroom is ~7 MiB — narrow.
3. STORY-018's Prom kubernetes_sd finds the new endpoint within ~20 s and starts scraping `process_resident_memory_bytes` every 15 s.
4. The tour's Beat 1 spins up a transient `telemetry-stream` Pod (`kubectl run --rm` with `curlimages/curl:8.10.1`) that posts 30 bursts to the rover's `/leak` endpoint via the Service DNS. Each call appends 1 MiB; RSS climbs monotonically.
5. Around iteration 7–11, RSS exceeds 64 MiB; the kernel OOM-kills the container; kubelet records `OOMKilled` in `containerStatuses[].lastState.terminated.reason` (exit code 137).
6. Kubelet restarts the container after the first backoff (~5 s). The rover comes back up `Running 1/1` with `RESTARTS: 1`.
7. The transient `telemetry-stream` Pod survives the rover's restart (it's a separate workload pod) and keeps hammering the Service through the brief connection-refused window. It self-deletes (`--rm`) when its loop completes.
8. Final state visible to the participant: rover `Running 1/1, RESTARTS: 1`, `lastState.terminated.reason: OOMKilled` available to `kubectl describe pod`.

That `RESTARTS: 1` column is UC3's friction signal — subtler than UC1's `ImagePullBackOff` or UC2's `Pending`, but honest (it's what kubelet actually exposes after a single OOM cycle). The architecture spec said "~70 calls" for the leak loop; reality is ~7–11 because the FastAPI process idles at ~57 MiB rather than the bare-bones Python the spec implicitly assumed. STORY-019 / STORY-020 sized the loop accordingly (30 iterations → typically one OOM mid-loop, with the remaining iterations hitting the post-restart container).

The participant's job in the manual diagnosis is to combine `kubectl describe pod` (OOMKilled reason) with a memory time-series (RSS climb) — two surfaces, one synthesis. The agent's job in Beat 3 is to do the same correlation in one shot, including the cross-tool delegation to `observability-agent` for the Grafana panel.

## Expected agent diagnosis

The diagnostic agent is **`artemis-rover-telemetry-debugger`** ([`agents/agent.yaml`](agents/agent.yaml)), a kagent v0.9.0 `Agent` of type `Declarative`. It lives in the `kagent` namespace per `docs/artemis-naming.md` (cluster-scope-discoverable kagent CRDs use the `artemis-` prefix and live in `kagent`) and references kagent's installed `default-model-config` ModelConfig — the canonical credentials slot across every Artemis agent, backed by the `artemis-llm-credentials` Secret in `kagent`.

**Tool surface — three layers:**

- **Direct K8s read tools** from `kagent-tool-server` (RemoteMCPServer): `k8s_get_pod`, `k8s_describe_pod`, `k8s_get_events`, `k8s_get_resources`.
- **A2a sub-agent: `promql-agent`** — kagent's pre-packaged PromQL generator (text-in / text-out: translates a natural-language ask into a PromQL query, no execution).
- **A2a sub-agent: `observability-agent`** — kagent's pre-packaged Grafana / Prom executor. Internally delegates to `promql-agent` for query generation, executes the query via the bridged `prometheus.kagent.svc:9090`, creates a Grafana panel via the `kagent-grafana-mcp` RemoteMCPServer (which talks to the bridged `grafana.kagent.svc:3000`), and returns the panel URL.

**Expected agent output** (one or two sentences plus a Grafana URL, deterministic across runs to within phrasing):

> The `lunar-rover-telemetry` Pod in `artemis-uc3` keeps restarting because its container's memory limit (64 Mi) is below the working set the telemetry stream produces, so the kernel OOM-kills it before the stream completes. Memory curve: <Grafana panel URL>. Raise `resources.limits.memory` or fix the leak in the application code.

The pedagogical point made in the tour's Beat 4 ("What we'd have done by hand"): same evidence, same conclusion, but the participant had to assemble it from three `kubectl` commands AND a Grafana dashboard the participant doesn't yet have. The agent did the cross-surface correlation in one synthesis. UC4 will fold this debugger into the `artemis-mission-coordinator` (STORY-025) so a single coordinator delegates to UC1/UC2/UC3 specialists and reports verdicts on the participant's status bulbs (FR-017).

The agent's system prompt caps tool budget at 1 describe-pod + 1 delegation to `observability-agent` + 0 other tool calls — the synthesis is intentionally narrow because the participant is on a 5-minute tour, not a tutorial.

## Files in this directory

```
uc3/
  README.md                          this file
  tour.json                          4-beat workshop-tour content (FR-013, STORY-020)
  manifests/
    00-namespace.yaml                artemis-uc3 namespace
    10-service.yaml                  ClusterIP for lunar-rover-telemetry, monitoring=prom label
    20-deployment.yaml               1-replica Deployment, 64Mi limit, no probes
  agents/
    agent.yaml                       artemis-rover-telemetry-debugger (a2a + k8s read tools; references default-model-config)
```

The kagent ↔ artemis-observability bridge (`kagent-bridge-services.yaml`) was shipped under `uc3/agents/` by STORY-019; STORY-025 promoted it to [`../infra/observability/`](../infra/observability/) once UC4 confirmed identical bridge needs.

The manifest filenames are numbered so `kubectl apply -f uc3/manifests/` applies them in dependency order (namespace before namespaced resources).

## Reproduction (NFR-003 — 3/3 cold deploys)

The reproduction checklist below is the **manual** form of the NFR-003 reliability AC. Run it three times in a row from a deleted cluster; all three runs must reach the documented broken state. Tooling prereqs are validated by `make preflight` (`docker`, `kubectl`, `kind`, `helm`, `kagent`).

For each cold-deploy iteration:

1. **Reset the cluster.** From the repo root:
   ```bash
   make kind-down       # no-op if no cluster exists
   make kind-up         # creates the kagent-workshop kind cluster
   make kagent-install  # installs kagent v0.9.0 CRDs into the kagent namespace
   ```
   *Note:* `make kagent-install` is currently non-idempotent (uses `helm install` rather than `helm upgrade --install`). On a fresh kind cluster — the case for NFR-003 cold-deploys — that's fine. On a cluster that already has kagent, it errors with `cannot re-use a name that is still in use`. Tracked under STORY-018's flagged out-of-scope findings; resolution is a one-line Makefile fix scheduled for Sprint-3 retro.

2. **Bring up the observability bundle + UC3.**
   ```bash
   make uc3-up   # equivalent to:
                 #   make observability-up
                 #     → kubectl apply -k infra/observability/
                 #     → kubectl rollout status deploy/{prometheus-server,grafana} -n artemis-observability
                 #   kubectl apply -f uc3/manifests/
                 #   kubectl apply -f uc3/agents/
   ```

3. **Wait ~30 s** for the rover Pod to boot, Prom to discover the new endpoint, and the telemetry-stream pod (run in step 4) to complete its loop.

4. **Trigger the leak** (the tour's Beat 1 third command):
   ```bash
   kubectl run telemetry-stream --rm -i --restart=Never \
     --image=curlimages/curl:8.10.1 \
     --namespace=artemis-uc3 \
     --command -- sh -c \
     'for i in $(seq 1 30); do curl -sf -X POST http://lunar-rover-telemetry:8000/leak --max-time 2; echo; done; echo stream complete'
   ```
   The trigger pod will print `{"size_mb":N}` for ~7–11 iterations, then a few empty lines (rover restarting briefly), then more `{"size_mb":N}` against the post-restart container. It self-deletes on exit (`--rm`).

5. **Verify the broken state.** Each of the four checks below must pass:
   ```bash
   # (a) The rover Pod is Running 1/1 with at least one restart
   kubectl get pods -n artemis-uc3 -l app=lunar-rover-telemetry \
     -o jsonpath='{.items[0].status.containerStatuses[0].restartCount}'
   # → ≥ 1   (typically 1; can be higher if the loop ran long enough to OOM twice)

   # (b) The previous container terminated with reason OOMKilled
   kubectl get pod -n artemis-uc3 -l app=lunar-rover-telemetry \
     -o jsonpath='{.items[0].status.containerStatuses[0].lastState.terminated.reason}'
   # → OOMKilled

   # (c) Prometheus is scraping the rover endpoint
   kubectl port-forward -n artemis-observability svc/prometheus-server 9090:9090 &
   PF=$!
   sleep 2
   curl -sS --data-urlencode 'query=process_resident_memory_bytes{kubernetes_namespace="artemis-uc3"}' \
     http://127.0.0.1:9090/api/v1/query | head -50
   kill $PF
   # → JSON containing kubernetes_namespace="artemis-uc3" and a non-zero value

   # (d) The bridge Services in the kagent namespace resolve via DNS CNAME
   kubectl run dns-test --rm -i --restart=Never --image=busybox:1.36 -n kagent -- \
     sh -c 'nslookup grafana.kagent.svc.cluster.local; echo; nslookup prometheus.kagent.svc.cluster.local'
   # → grafana.kagent → grafana.artemis-observability;
   #   prometheus.kagent → prometheus-server.artemis-observability
   ```

6. **(Optional) Exercise the agent end-to-end** to confirm the diagnostic path is wired:
   ```bash
   kagent invoke \
     --agent artemis-rover-telemetry-debugger \
     --namespace kagent \
     --task 'The lunar-rover-telemetry pod in the artemis-uc3 namespace keeps restarting. Diagnose it, and show me a memory chart from the time of the failure.'
   # Expected: agent names the OOM root cause within ~10–20 s and surfaces a Grafana
   # panel URL via observability-agent delegation. The URL points at grafana:3000 in
   # the cluster — open it via `kubectl port-forward -n artemis-observability
   # svc/grafana 3000:3000` and substitute `localhost:3000` for the URL host.
   ```
   This step is gated on a real `artemis-llm-credentials` Secret being present in the `kagent` namespace (the agent uses `default-model-config`, which kagent's helm install pre-wires the Secret reference for); on a bare local kind without one, the four manifest checks (a)–(d) above are sufficient for NFR-003 sign-off.

7. **Tear down before the next iteration.**
   ```bash
   make uc3-down              # delete uc3/manifests + uc3/agents
   make observability-down    # delete infra/observability
   ```
   For a strict cold deploy (recommended for NFR-003), `make kind-down` between iterations.

**Sign-off:** record the run in the PR description per the M5 dry-run convention — three timestamps, four "OK" lines for checks (a)/(b)/(c)/(d), and a one-line note on whether step 6 was exercised. The cross-author sign-off (Clément ↔ Quentin) lands on the PR per NFR-003 AC #2 before the M5 dry-run. Per [`../docs/stories/STORY-021.md`](../docs/stories/STORY-021.md) §Ownership swap, STORY-021 was written by Quentin under the M3 swap, so the cross-author signoff falls on **Clément** when he's back, deferred to STORY-028.

## Recovery procedure

UC3's broken state is participant-triggered, so re-running the tour bumps the rover's restart counter rather than re-creating it. Three recovery levels:

- **Level 1 — re-run the tour with the existing rover.** The rover stays in `Running 1/1, RESTARTS: N` after the OOM. Re-applying Beat 1 (the manifests are idempotent + the `kubectl run --rm` trigger is one-shot) bumps the counter by 1. Acceptable for ad-hoc testing; not acceptable for NFR-003 reproduction (the counter contaminates the friction signal).
- **Level 2 — reset the rover only.** `kubectl rollout restart -n artemis-uc3 deploy/lunar-rover-telemetry` creates a fresh ReplicaSet → fresh Pod with restart count 0. The observability bundle and the agent CRD survive untouched. Use this for tour iteration during authoring.
- **Level 3 — full UC3 teardown.** `make uc3-down` deletes the manifests + agents (including the bridge Services). `make observability-down` deletes the bundle. The kind cluster + kagent install survive, ready for UC1/UC2/UC4 work or another UC3 cold deploy.
- **Level 4 — full cluster teardown.** `make kind-down`. Required for NFR-003 cold deploys per the reproduction checklist.

## Production disclaimer

**The Prom + Graf install in `infra/observability/` is workshop-grade, not production-grade.** Do not point at it as a reference for a real observability deployment.

What's pedagogical here:

- **Single-replica everywhere.** One Prom Pod, one Grafana Pod. No HA, no redundancy. A Pod restart loses ~30 s of metrics and clears Grafana's session state.
- **`emptyDir` storage.** Both Prom's TSDB (at `/prometheus`) and Grafana's data dir (at `/var/lib/grafana`) are `emptyDir`. Pod restarts wipe everything. Combined with the 2-hour Prom retention, the workshop is a pure ephemeral observability surface — exactly what UC3's leak loop needs (the curve is real-time, the participant clicks the dashboard URL within 30 s of the OOM), and exactly nothing more.
- **Anonymous-admin Grafana.** `GF_AUTH_ANONYMOUS_ENABLED=true`, `GF_AUTH_ANONYMOUS_ORG_ROLE=Admin`, `GF_AUTH_DISABLE_LOGIN_FORM=true`. The participant's browser lands directly on Grafana with admin rights — zero login friction. Safe in this context because the workshop runs in per-participant vClusters (NFR-012); ClusterIP Services + `kubectl port-forward` mean cross-participant exposure is impossible by topology, not by auth.
- **No operator.** No `kube-prometheus-stack`, no `prometheus-operator`, no `grafana-operator`. Plain manifests under `infra/observability/{prometheus,grafana}/` aggregated by `kustomization.yaml`. This is a deliberate architecture choice (NFR-006 portability + keeping `kubectl get all` legible for the participant); it is not the right shape for a real cluster.
- **No alerting.** No AlertManager. No PagerDuty. The Prom server logs OOMs to its own stdout but signals nothing externally. UC3's friction signal is what kubelet reports through `kubectl describe pod`, not a paged-out incident.
- **Hard-coded URLs.** kagent's helm install binds `prometheus.kagent.svc:9090` and `grafana.kagent.svc:3000`; STORY-019's `kagent-bridge-services.yaml` reconciles the gap with `ExternalName` Services. In production you would either run kagent with helm-values overrides (so the controllers point at the real Prom/Graf endpoints directly) or run Prom/Graf inside the same namespace kagent expects. The bridge is a workshop convenience, not a pattern to lift.

What you would change for a production-grade install (rough sketch, not exhaustive):

- 3-replica Prom (HA), persistent volumes, retention policy aligned with capacity planning (typically 15–90 days), federation to a long-term store (Thanos / Cortex / Mimir).
- Grafana behind real auth (LDAP / OIDC / SAML), persistent volumes for dashboards / users / orgs, RBAC.
- An operator (`kube-prometheus-stack` is the modern default) so AlertManager rules / ServiceMonitor / PrometheusRule are first-class CRDs rather than ConfigMap shells.
- A scrape config that keys off pod-level annotations (`prometheus.io/scrape: "true"`) or operator-managed `ServiceMonitor` resources, not the workshop's bare `monitoring=prom` label.
- Network-level segmentation (NetworkPolicies) between Prom and the workloads it scrapes.

The workshop's intent is to teach **agent-vs-CLI diagnosis** with observability as the third axis — not to teach operators how to run Prom. Treat `infra/observability/` as a learning-friendly stand-in.

## Author notes

The notes below capture engineering rationale and spike outcomes that participants don't read. Authors come here to find the *why* behind UC3's non-obvious choices.

### kagent v0.9.0 pre-packaged Prom/Graf agents — spike findings (STORY-019)

The architecture (L300) said UC3 reuses "kagent's pre-packaged Prometheus and Grafana agents". STORY-019's spike against the live `--profile demo` install found the actual surface: **`promql-agent`** (PromQL generator only, text-in / text-out) and **`observability-agent`** (Grafana dashboards + Prom execution + a2a-delegate to `promql-agent`). Two `RemoteMCPServer`s are also installed: `kagent-tool-server` (k8s read tools) and `kagent-grafana-mcp` (43 dashboard / Prom / Loki / oncall / Sift tools).

The a2a delegation pattern — confirmed against the cluster's own `observability-agent.spec` — is `tools[].type: Agent` + `tools[].agent.name: <agent-name>`. UC3's `agent.yaml` uses this shape verbatim for both `promql-agent` and `observability-agent` references.

Full trace, including the alternatives considered for the namespace bridge (helm-values override vs ExternalName CNAMEs) and the decision rationale, is in [`../docs/stories/STORY-019.md`](../docs/stories/STORY-019.md) §Spike findings.

### `kubectl run --rm` leak-trigger pattern (STORY-020 implementation finding)

The tour's Beat 1 third command uses `kubectl run telemetry-stream --rm -i --restart=Never --image=curlimages/curl:8.10.1 …` rather than the more obvious `kubectl exec deploy/lunar-rover-telemetry -- sh -c 'for i ...; do curl ...'`. Two reasons:

1. **The rover container has only `python3`.** The Dockerfile (`apps/lunar-rover-telemetry/Dockerfile`) is `python:3.12-slim` — no `curl`, no `wget`. `kubectl exec ... -- sh -c '... curl ...'` fails with `sh: 1: curl: not found` (exit 127, not the expected 137 from SIGKILL).
2. **The trigger pod survives the rover's restart.** When the rover OOMs mid-loop, the `kubectl run --rm` pod stays alive and keeps hammering the Service through the brief connection-refused window (`-sf` swallows the errors silently; the loop continues). The `kubectl exec` form, by contrast, dies with exit 137 the moment the rover container is killed (exec is bound to the target container's lifecycle).

A bonus: the mission framing absorbs the run-pod cleanly — it becomes "a transient operator station that pushes 30 bursts to the rover's outbound queue", which is honestly *more* faithful to the lunar-rover-and-base mental model than an in-pod self-trigger would have been.

Sprint-3 retro decision pending: codify this pattern in `docs/tour-content-conventions.md` if UC4 (STORY-026) hits the same in-pod-tooling gap.

### kagent ↔ artemis-observability bridge — choice rationale (STORY-019)

kagent's helm-time URL bindings (`prometheus.kagent.svc:9090`, `grafana.kagent.svc:3000`) hard-code the `kagent` namespace. STORY-018 deliberately put Prom/Graf in `artemis-observability` per `docs/artemis-naming.md`. Two reconciliation paths were considered:

| Path                                             | Pros                                                       | Cons                                                                                                          |
| ------------------------------------------------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| **Override kagent helm values** (`prometheus.url: ...`) | Eliminates the indirection; URLs say what they mean.       | Couples STORY-019 to a kagent reinstall; blast radius extends to other agents that also depend on those URLs. |
| **ExternalName bridge** (`Service prometheus → ...`)    | Zero kagent reinstall; surgical; scoped to UC3 lifecycle (deletes with `make uc3-down`); survives kagent helm upgrades. | One DNS-CNAME indirection at runtime — invisible to kagent's runtime.                                         |

**Decision: bridge Services.** The indirection is a one-time cognitive cost for the author reading `agent.yaml` and the bridge file together; the runtime cost is zero. If UC4 also needs the bridge (likely — it reuses UC3's debugger as a sub-agent under the coordinator), STORY-024 onwards will either copy the bridge file into `uc4/agents/` or promote it to `infra/observability/`. The promotion is deferred until UC4's actual needs are clear; not designing for hypothetical future requirements.

### Why the agent uses `default-model-config`

Every Artemis agent (UC1/UC2/UC3/UC4) references the kagent-installed `default-model-config` ModelConfig in the `kagent` namespace. ModelConfig is namespaced — an Agent in `kagent` can only reference a ModelConfig in `kagent` — and `default-model-config` is already credentialed via the `artemis-llm-credentials` Secret kagent's helm install pre-wires. Reusing it avoids duplicating the credentials Secret in any per-UC namespace.

The per-UC `artemis-llm` ModelConfig slots that earlier iterations shipped under each `agents/modelconfig.yaml` were dropped post-freeze — they were decorative (no agent ever referenced them at runtime). The canonical credentials slot is `default-model-config`, full stop.

## Cleanup

```bash
make uc3-down            # delete uc3/manifests + uc3/agents (including bridge Services)
make observability-down  # delete infra/observability
make kind-down           # nuke the kind cluster entirely
```

`make uc3-down` leaves `infra/observability/` running — useful when iterating on UC3 against the same observability bundle. `make observability-down` is a separate step because UC4 also depends on the bundle (STORY-024 onwards).

## References

- **PRD:** [`../docs/prd-kagent-workshop-scenarios-2026-04-27.md`](../docs/prd-kagent-workshop-scenarios-2026-04-27.md) — FR-012 (scenario package + Prom/Graf), FR-013 (tour with on-the-fly dashboard), NFR-003 (reproduction), NFR-006 (vanilla K8s, no operators).
- **Architecture:** [`../docs/architecture-kagent-workshop-scenarios-2026-04-28.md`](../docs/architecture-kagent-workshop-scenarios-2026-04-28.md) §Component 5 (UC3) + §Observability Layer (UC3) + §C5 manifests sketch.
- **Naming vocabulary:** [`../docs/artemis-naming.md`](../docs/artemis-naming.md) — UC3 row in the narrative arc, namespace + Deployment + Agent + observability rows.
- **Tour content convention:** [`../docs/tour-content-conventions.md`](../docs/tour-content-conventions.md) — the 4-beat mission-framing structure UC3's `tour.json` instantiates, plus the no-meta-references sub-rule the README is exempt from (this is author-facing).
- **Sprint plan:** [`../docs/sprint-plan-kagent-workshop-scenarios-2026-04-28.md`](../docs/sprint-plan-kagent-workshop-scenarios-2026-04-28.md) §Sprint 3 — STORY-018 (`infra/observability/`), STORY-019 (manifests + agents + bridge), STORY-020 (`tour.json`), STORY-021 (this README + cross-author repro).
- **Per-story implementation traces:** [`../docs/stories/STORY-018.md`](../docs/stories/STORY-018.md), [`STORY-019.md`](../docs/stories/STORY-019.md), [`STORY-020.md`](../docs/stories/STORY-020.md), [`STORY-021.md`](../docs/stories/STORY-021.md). The four together document the full UC3 stack including spike findings, validation traces, and out-of-scope flagged issues for Sprint-3 retro.
