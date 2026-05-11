# UC4 — Multi-agent coordinator + custom MCP

**Owner:** Quentin Rodic (re-attributed from joint — full M4 Clément swap; see [`../docs/stories/STORY-027.md`](../docs/stories/STORY-027.md) §Ownership swap)
**Milestones:** M3 prep (custom MCP source + packaging — STORY-022/023), M4 climax (multi-symptom cluster + a2a coordinator + tour + this README — STORY-024/025/026/027)
**Tour ID:** `kagent-uc4-coordinator`
**FR / NFR:** FR-014 (multi-symptom scenario package), FR-015 (tour), FR-016 (custom MCP), FR-017 (bulb-colour-as-diagnosis), NFR-001/002/003/005/006/008/012

UC4 is the workshop's climax. The participant has just seen UC1 (single-agent, single-resource — `kubectl describe pod` synthesised in one shot), UC2 (single-agent, multi-resource — cross-resource correlation), UC3 (single-agent + external observability — `kubectl describe pod` + Grafana dashboard URL). UC4 introduces a fourth axis: **multi-agent fan-out**. One coordinator agent delegates three independent diagnoses to its on-call specialists in parallel, then writes three colour-coded verdicts to the participant's status bulbs through a per-vCluster custom MCP. The pedagogical contrast is no longer *one synthesis instead of N commands* — it's *one synthesis instead of N commands × M surfaces × K specialist contexts*, with the custom MCP acting as the diagnosis-output medium.

## Artemis narrative

The mission coordinator is on shift today. Three Artemis subsystems are checking in at once — mission control's incoming roster, a replacement replica on the launch pad, and the lunar rover's telemetry uplink — and all three are showing signs of friction simultaneously. The participant plays the on-call: applies the full fleet as a routine deployment, pushes a short telemetry stream from inside the rover, discovers in one `kubectl get pods` that three subsystems are in three different states of trouble at once, and hands the cross-subsystem assessment to **`artemis-mission-coordinator`** from the operational CLI. The coordinator fans out to its three on-call specialists in parallel, collects each verdict, paints the participant's three status bulbs accordingly, and replies with a structured summary in the terminal. See [`../docs/artemis-naming.md`](../docs/artemis-naming.md#narrative-arc-uc1--uc4) for the full arc, and [`../docs/tour-content-conventions.md`](../docs/tour-content-conventions.md) for the 4-beat structure (mission setup → status check → call the agent → manual recap).

## Prerequisites

UC4 is the workshop's most-integrated scenario. Four pieces of cluster state must be in place before `kubectl apply -f uc4/manifests/` + `kubectl apply -f uc4/agents/` produces a meaningful broken state.

### 1. kagent v0.9.0 with the demo profile (M1 baseline)

`make kagent-install` installs kagent v0.9.0 with `--profile demo` (per [`../docs/stories/STORY-033.md`](../docs/stories/STORY-033.md)). The demo profile ships the pre-packaged sub-agents UC3's debugger delegates to (`promql-agent`, `observability-agent`) and the `kagent-tool-server` + `kagent-grafana-mcp` RemoteMCPServers UC1/UC2/UC3/UC4 source their tools from.

### 2. `infra/observability/` Prom + Graf bundle + bridge Services (STORY-018, STORY-019, STORY-025)

UC4 inherits UC3's observability dependency — the lunar rover's `monitoring=prom` Service is auto-scraped by Prometheus, and the coordinator's UC3-delegated specialist (`artemis-rover-telemetry-debugger`) reaches Prom + Grafana through the same kagent ↔ artemis-observability namespace bridge UC3 introduced. STORY-025 promoted the bridge from `uc3/agents/` to [`../infra/observability/kagent-bridge-services.yaml`](../infra/observability/kagent-bridge-services.yaml) when UC4 confirmed identical bridge needs; `make observability-up` applies both the Prom + Graf kustomize bundle AND the bridge Services as separate `kubectl apply` calls (the bridge lives in `kagent` ns, which the kustomization's root namespace override would mangle).

`make uc4-up` declares `uc4-up: observability-up` so the bundle + bridge come up transparently with UC4. See [`../uc3/README.md`](../uc3/README.md#prerequisite--observability-bundle--kagent-bridge) for the bundle's full design rationale.

### 3. Sibling specialist Agent CRDs in `kagent` namespace

The coordinator's `tools[].type: Agent` references resolve same-namespace only in kagent v0.9.0 (no `namespace` field on the agent ref — STORY-019 §Spike findings; re-confirmed by STORY-025 validation). All four diagnostic agents therefore live in the `kagent` namespace:

| Agent CRD                                  | Lives in `kagent` ns because of                                        |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `artemis-mission-control-debugger` (UC1)   | [`../uc1/agents/agent.yaml`](../uc1/agents/agent.yaml) — original placement |
| `artemis-launch-pad-debugger` (UC2)        | [`../uc2/agents/agent.yaml`](../uc2/agents/agent.yaml) — STORY-025 inline patch moved it from `artemis-uc2` to `kagent` for a2a delegation reachability |
| `artemis-rover-telemetry-debugger` (UC3)   | [`../uc3/agents/agent.yaml`](../uc3/agents/agent.yaml) — STORY-019 placement |
| `artemis-mission-coordinator` (UC4)        | [`agents/agent.yaml`](agents/agent.yaml) — STORY-025                   |

`make uc{1,2,3,4}-up` each apply their `agents/` directory; the coordinator's a2a delegation only works once all three specialist Agents have reached `Accepted=True`.

### 4. Custom bulb MCP (STORY-022, STORY-023)

UC4's diagnosis-output medium is the participant's three status bulbs. The coordinator writes them through a per-vCluster custom MCP that wraps the sibling `light-manager` API (`GET /api/bulbs?user=<login>`, `PUT /api/bulbs/<slot>?user=<login>`). The MCP lives under [`../mcp/`](../mcp/); the `RemoteMCPServer artemis-bulb-mcp` resource that exposes it to kagent ships at [`../mcp/manifests/30-remotemcpserver.yaml`](../mcp/manifests/30-remotemcpserver.yaml). `make mcp-up` brings it up after a `make mcp-build` + `kind load docker-image` chain (or, on the real workshop cluster, the image comes from the apogasa registry per workshop-infrastructure's pre-publishing step).

The MCP is **tenancy-pinned** (NFR-012): it reads `$WORKSHOP_PARTICIPANT_LOGIN` at startup and refuses every call where `user != $WORKSHOP_PARTICIPANT_LOGIN`. The coordinator's system prompt always passes `user="${WORKSHOP_PARTICIPANT_LOGIN}"` — workshop-infrastructure substitutes the env at invocation time. See [`../mcp/`](../mcp/) for the full MCP source + the tenancy guard implementation.

## The multi-symptom mess

A single namespace, `artemis-uc4`, hosts three Deployments in three different states of trouble simultaneously, plus a bootstrap Job that arms the scheduling-blocked state. Twelve resources land on the cluster on apply:

| Resource                  | Name                          | Where it lives    | Notes                                                                                                                                                                                                |
| ------------------------- | ----------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Namespace                 | `artemis-uc4`                 | cluster-scoped    | Labelled `kagent-workshop/uc=uc4`, `kagent-workshop/scenario=multi-symptom`.                                                                                                                          |
| RBAC                      | `bootstrap-uc4-fault` + roles | `artemis-uc4`     | ServiceAccount + ClusterRole/Binding (nodes patch) + Role/Binding (deployments patch). UC2-style; STORY-024 added Job tolerations + Recreate strategy on the Pending Deployment.                     |
| Job                       | `bootstrap-uc4-fault`         | `artemis-uc4`     | One-shot: taints all nodes with `artemis.kagent.dev/launch-pad-fault=true:NoSchedule` then `kubectl rollout restart deploy/mission-control-pending`. Tolerations baked in for idempotent re-runs.    |
| Service × 3               | one per Deployment            | `artemis-uc4`     | ClusterIP, port 8000 → http. `lunar-rover-telemetry` Service carries `monitoring=prom` so STORY-018's Prom auto-scrapes it.                                                                          |
| Deployment `…-imagepull`  | `mission-control-imagepull`   | `artemis-uc4`     | Image `mission-control:v999` (unpublished) → `ImagePullBackOff`. UC1-style symptom. Tolerates the synthetic taint (its symptom is image-pull-side, not scheduling-side).                             |
| Deployment `…-pending`    | `mission-control-pending`     | `artemis-uc4`     | Image `mission-control:v1.0.0` (real). No toleration for the synthetic taint → `Pending` with `FailedScheduling: untolerated taint`. UC2-style symptom. `strategy.type: Recreate` (see Author notes). |
| Deployment `…-telemetry`  | `lunar-rover-telemetry`       | `artemis-uc4`     | Image `lunar-rover-telemetry:v1.0.0` (real), `resources.limits.memory: 64Mi`. Pod stays `Running 1/1` until the tour's Beat 1 leak loop drives it into OOMKilled. UC3-style symptom. Tolerates the taint. |
| Agent CRD                 | `artemis-mission-coordinator` | `kagent`          | Declarative type. a2a delegation to the three UC specialist debuggers + RemoteMCPServer references to `kagent-tool-server` (k8s read) + `artemis-bulb-mcp` (bulb writes).                            |
| ModelConfig               | `artemis-llm`                 | `artemis-uc4`     | Per-UC slot (kept for naming-convention consistency; the coordinator itself uses `default-model-config` per the UC1/UC3 precedent — see STORY-025 Technical Notes).                                  |

The three Deployment symptoms surface on different timelines: `…-imagepull` enters `ImagePullBackOff` within ~30 s of apply (kubelet's first pull retry); `…-pending` enters `Pending` within ~5 s of the bootstrap Job completing (which is within ~10 s of apply); `…-telemetry` stays Running until the tour's Beat 1 leak trigger drives it through one OOM cycle (~10-15 s after the trigger fires). All three are visible simultaneously in `kubectl get pods -n artemis-uc4` ~60 s after `kubectl apply -f uc4/manifests/` + the leak trigger.

## Expected coordinator behaviour

The coordinator is **`artemis-mission-coordinator`** ([`agents/agent.yaml`](agents/agent.yaml)), a kagent v0.9.0 `Agent` of type `Declarative`. It lives in the `kagent` namespace (same constraint UC1/UC3 already document — cluster-scope-discoverable kagent CRDs use the `artemis-` prefix and live in `kagent`; same-namespace a2a wiring required by v0.9.0).

**Tool surface — three layers:**

| Layer            | Source                                       | Tools available to the coordinator                          |
| ---------------- | -------------------------------------------- | ----------------------------------------------------------- |
| K8s read (light) | `kagent-tool-server` (RemoteMCPServer, kagent ns) | `k8s_get_pod`, `k8s_get_resources`                          |
| Bulb writes      | `artemis-bulb-mcp` (RemoteMCPServer, kagent ns)   | `list_bulbs`, `update_bulb`                                 |
| A2a sub-agents   | three sibling Agent CRDs in `kagent` ns       | `artemis-mission-control-debugger`, `artemis-launch-pad-debugger`, `artemis-rover-telemetry-debugger` |

The K8s read surface is deliberately tight (no `describe`, no `events`) — the coordinator does NOT do deep diagnosis itself. Its job is the *fan-out + bulb-write + summary*; each specialist handles the deep diagnosis for its own namespace.

### Coordination flow

The system prompt encodes a deterministic execution recipe (per [`agents/agent.yaml`](agents/agent.yaml)):

1. **(Optional) `list_bulbs(user="${WORKSHOP_PARTICIPANT_LOGIN}")`** — reads the current bulb state. Debugging aid; not strictly required.
2. **(Optional) `k8s_get_resources` on `artemis-uc4`** — confirms the three Deployments (`mission-control-imagepull`, `mission-control-pending`, `lunar-rover-telemetry`) exist. If any is missing, stop and report the gap — do not delegate to a specialist for a subsystem that isn't deployed.
3. **Delegate to all three specialists in parallel where the runtime supports it.** Each delegation is `tools[].type: Agent` + `tools[].agent.name: <specialist>`; the kagent v0.9.0 runtime resolves the agent same-namespace and calls into its reasoning loop with the sub-task prompt the coordinator constructs. Each specialist returns a one-sentence verdict for its own subsystem.
4. **Map each verdict to a colour** per the FR-017 table (next section).
5. **Three `update_bulb` calls** — one per slot, each carrying `user="${WORKSHOP_PARTICIPANT_LOGIN}"` to satisfy the tenancy guard. All three slots are written even when the verdict is *symptom absent* (green is a positive status signal, not a no-op).
6. **Structured reply** to the participant:
   - Three bulb-state lines (slot N: <colour>, <verdict>).
   - Three remediation-hint lines (the coordinator copies the specialist's hint verbatim — it is authoritative).

**Total round-trip from the participant's perspective:** one `kagent invoke` → one terminal print → three bulbs change colour in the light-manager UI tab simultaneously. The fan-out + correlation + medium-translation happen inside kagent's reasoning loop.

### Slot ↔ sub-agent mapping (FR-017)

The coordinator's system prompt locks the slot ↔ subsystem mapping. The mapping is also in [`../docs/artemis-naming.md`](../docs/artemis-naming.md#fr-017-bulb--verdict-mapping-uc4) for cross-reference:

| Bulb slot | Sub-agent                                  | Subsystem (UC1/2/3-style symptom in `artemis-uc4`)                        |
| --------- | ------------------------------------------ | ------------------------------------------------------------------------- |
| 1         | `artemis-mission-control-debugger`         | UC1 — image-pull symptom on `mission-control-imagepull` Deployment.       |
| 2         | `artemis-launch-pad-debugger`              | UC2 — scheduling symptom on `mission-control-pending` Deployment.         |
| 3         | `artemis-rover-telemetry-debugger`         | UC3 — OOM symptom on `lunar-rover-telemetry` Deployment.                  |

The mapping is intentionally aligned with the workshop arc (slot N ↔ UC N) so a participant who has just walked through UC1/UC2/UC3 reads the bulb panel as a recap of the four diagnostic axes.

### Verdict ↔ colour mapping (FR-017)

The coordinator's system prompt locks the verdict ↔ colour mapping. The mapping is also in [`../docs/artemis-naming.md`](../docs/artemis-naming.md#fr-017-bulb--verdict-mapping-uc4):

| Verdict (specialist's reply)                                 | Colour | RGB              |
| ------------------------------------------------------------ | ------ | ---------------- |
| Symptom present (specialist diagnosed an active anomaly)     | red    | `(255, 0, 0)`    |
| Symptom absent (specialist found no anomaly)                 | green  | `(0, 255, 0)`    |
| Inconclusive / partial finding (specialist could not reach a verdict) | amber  | `(255, 191, 0)`  |

In the workshop's expected end-state, all three slots flip to red simultaneously — UC4's broken state is *deliberately* the three-symptom case (the cluster mess STORY-024 produces). The other colour states are not reachable from UC4's stock cluster state alone; they exist to make the coordinator's mapping robust if the participant experiments (e.g. patches one Deployment to remove its symptom and re-asks the coordinator).

**Expected coordinator output** (the structured reply, deterministic to within phrasing):

> Three bulbs are now lit: slot 1 red, slot 2 red, slot 3 red.
>
> - **Slot 1 (UC1)** — `mission-control-imagepull` in `artemis-uc4` cannot pull its container image: the deploy targets `mission-control:v999`, which was never published. *Remediation:* roll the deploy back to the last published tag (`mission-control:v1.0.0` per the deployment's `artemis.kagent.dev/last-published-tag` annotation).
> - **Slot 2 (UC2)** — `mission-control-pending` in `artemis-uc4` cannot land any Pod: the only node carries a synthetic `artemis.kagent.dev/launch-pad-fault=true:NoSchedule` taint the Pod does not tolerate. *Remediation:* remove the synthetic taint or add a matching toleration to the Deployment.
> - **Slot 3 (UC3)** — `lunar-rover-telemetry` in `artemis-uc4` keeps restarting: the container's memory limit (64 Mi) is below the working set the telemetry stream produces, so the kernel OOM-kills it. *Remediation:* raise `resources.limits.memory` or fix the leak in the application code.

## Tenancy guarantee (FR-015 + NFR-012)

UC4's diagnosis-output medium is a shared physical resource — the participant's three status bulbs — wrapping a multi-tenant `light-manager` service that hosts every participant's bulbs concurrently. The architecture's per-vCluster MCP design (§C5 + L122-126 of the architecture document) provides a **hard tenancy guarantee**: the coordinator in vCluster A *cannot* paint participant B's bulbs even if a misprompted agent tries.

Three pieces of the design enforce the guarantee:

1. **Per-vCluster MCP.** Each participant gets their own `artemis-bulb-mcp` Deployment in their `artemis-mcp` namespace, with `WORKSHOP_PARTICIPANT_LOGIN` injected from a per-participant Secret. The MCP refuses every call where `user != $WORKSHOP_PARTICIPANT_LOGIN`. See [`../mcp/src/core/tenancy.py`](../mcp/src/core/tenancy.py).
2. **The coordinator's system prompt** always passes `user="${WORKSHOP_PARTICIPANT_LOGIN}"` on every `list_bulbs` / `update_bulb` call. workshop-infrastructure substitutes the env at invocation time. See [`agents/agent.yaml`](agents/agent.yaml).
3. **The tour's Beat 3 explanation** (per FR-015) names the `?user=<login>` query parameter explicitly so the participant *sees* the tenancy scope as a feature: they open the light-manager UI in a browser tab with their own `?user=<their-login>` and watch their three bulbs flip — the same query parameter the MCP enforces server-side. See [`tour.json`](tour.json) Beat 3.

The trade-off vs a shared-MCP design (one MCP pod, N vClusters): per-vCluster costs ~50 MiB of RAM per participant slice (architecture L122-126), but gives a hard guarantee at the topology level — vCluster A's coordinator cannot even reach vCluster B's MCP because the per-vCluster MCP doesn't know B's login.

## Files in this directory

```
uc4/
  README.md                              this file
  tour.json                              4-beat workshop-tour content (FR-015, STORY-026)
  manifests/
    00-namespace.yaml                    artemis-uc4 namespace
    10-rbac.yaml                         ServiceAccount + ClusterRole/Binding + Role/Binding for the bootstrap Job
    20-bootstrap-taint-job.yaml          synthetic-taint apply + rollout-restart of mission-control-pending
    30-services.yaml                     3 ClusterIP Services (one per Deployment; rover Service carries monitoring=prom)
    40-deployment-imagepull.yaml         mission-control-imagepull — UC1-style image-pull symptom
    50-deployment-pending.yaml           mission-control-pending — UC2-style scheduling symptom (Recreate strategy)
    60-deployment-telemetry.yaml         lunar-rover-telemetry — UC3-style OOM symptom (64Mi limit)
  agents/
    agent.yaml                           artemis-mission-coordinator (a2a + 2× RemoteMCPServer)
    modelconfig.yaml                     artemis-llm ModelConfig (slot — coordinator uses default-model-config)
```

UC4 also depends on, but does not contain:

- [`../mcp/`](../mcp/) — the custom bulb MCP (image source + KMCP config + per-vCluster manifests + RemoteMCPServer CRD).
- [`../infra/observability/kagent-bridge-services.yaml`](../infra/observability/kagent-bridge-services.yaml) — the kagent ↔ artemis-observability namespace bridge (Prom + Graf ExternalName Services in `kagent` ns).
- [`../uc1/agents/agent.yaml`](../uc1/agents/agent.yaml), [`../uc2/agents/agent.yaml`](../uc2/agents/agent.yaml), [`../uc3/agents/agent.yaml`](../uc3/agents/agent.yaml) — the three specialist Agent CRDs the coordinator delegates to.

Manifest filenames are numbered so `kubectl apply -f uc4/manifests/` applies them in dependency order (namespace → RBAC → Job → Services → Deployments).

## Reproduction (NFR-003 — 3/3 cold deploys)

The reproduction checklist below is the **manual** form of the NFR-003 reliability AC. Run it three times in a row from a deleted cluster; all three runs must reach the documented three-symptom-simultaneous state. Tooling prereqs are validated by `make preflight` (`docker`, `kubectl`, `kind`, `helm`, `kagent`).

For each cold-deploy iteration:

1. **Reset the cluster.** From the repo root:
   ```bash
   make kind-down       # no-op if no cluster exists
   make kind-up         # creates the kagent-workshop kind cluster
   make kagent-install  # installs kagent v0.9.0 (demo profile) into the kagent namespace
   ```
   *Note:* `make kagent-install` is currently non-idempotent (uses `helm install` rather than `helm upgrade --install`). On a fresh kind cluster this is fine; on a cluster that already has kagent, it errors. Tracked as a Sprint-3 retro candidate (one-line Makefile fix).

2. **Bring up the observability bundle.** UC4 depends on it (the rover Service is auto-scraped by Prom; the UC3-style specialist delegates to kagent's pre-packaged Prom/Graf agents through the bridge).
   ```bash
   make observability-up
   # → kubectl apply -k infra/observability/
   # → kubectl apply -f infra/observability/kagent-bridge-services.yaml   # promoted bridge
   # → kubectl rollout status deploy/{prometheus-server,grafana} -n artemis-observability
   ```

3. **Bring up the custom bulb MCP.** Local-kind form (workshop-infrastructure does this differently on the real cluster):
   ```bash
   make mcp-build                                                       # builds the image
   kind load docker-image rg.fr-par.scw.cloud/apogasa/artemis-bulb-mcp:v0.1.0 \
       --name kagent-workshop                                           # side-load into kind
   kubectl create namespace artemis-mcp
   kubectl -n artemis-mcp create secret generic artemis-bulb-mcp-tenancy \
       --from-literal=WORKSHOP_PARTICIPANT_LOGIN=operator-test          # placeholder login
   kubectl -n artemis-mcp create configmap artemis-bulb-mcp-config \
       --from-literal=LIGHT_MANAGER_URL=http://light-manager.light-manager.svc.cluster.local:8000
   make mcp-up                                                          # applies mcp/manifests/
   ```
   The `RemoteMCPServer artemis-bulb-mcp` resource may initially show `Accepted=False` for ~7 s due to a pod-creation/reconciler race (STORY-023 + STORY-025 documented this); auto-recovers within 60 s, or trigger a re-reconcile via `kubectl annotate rmcps -n kagent artemis-bulb-mcp poke=$(date +%s) --overwrite`.

4. **Bring up the three specialist Agent CRDs** in `kagent` namespace. Each lives in its own UC's `agents/` directory:
   ```bash
   kubectl apply -f uc1/agents/
   kubectl apply -f uc2/agents/   # post-STORY-025 patch: namespace=kagent, MCP=kagent-tool-server, modelConfig=default-model-config
   kubectl apply -f uc3/agents/
   ```
   Verify all three reach `Accepted=True` within ~30 s:
   ```bash
   kubectl get agent -n kagent -o wide | grep artemis-
   # → artemis-mission-control-debugger     Declarative   python   True   True
   # → artemis-launch-pad-debugger          Declarative   python   True   True
   # → artemis-rover-telemetry-debugger     Declarative   python   True   True
   ```

5. **Bring up UC4** (manifests + coordinator + per-UC ModelConfig slot):
   ```bash
   make uc4-up   # equivalent to:
                 #   make observability-up      (already up; idempotent)
                 #   kubectl apply -f uc4/manifests/
                 #   kubectl apply -f uc4/agents/
   ```

6. **Wait ~60 s** for the three Deployments to reach their respective symptoms:
   - `mission-control-imagepull`: kubelet retries the pull 3-5 times before transitioning to `ImagePullBackOff`.
   - `mission-control-pending`: the bootstrap Job applies the taint within ~5 s, then `kubectl rollout restart` produces a new Pod that hits the taint and stays `Pending`.
   - `lunar-rover-telemetry`: comes up `Running 1/1` (no symptom yet — the leak loop is participant-triggered in Beat 1 of the tour).

7. **Trigger the leak** (the tour's Beat 1 third command — `kubectl exec` form per [STORY-026](../docs/stories/STORY-026.md) Technical Notes; the `kubectl run --rm` form UC3 uses doesn't work here because the synthetic taint blocks an external trigger pod):
   ```bash
   kubectl wait --for=condition=Ready pod -n artemis-uc4 \
       -l app=lunar-rover-telemetry --timeout=60s
   kubectl exec -n artemis-uc4 \
       $(kubectl get pod -n artemis-uc4 -l app=lunar-rover-telemetry -o jsonpath='{.items[0].metadata.name}') \
       -- python3 -c "import urllib.request as u; \
                      [u.urlopen(u.Request('http://127.0.0.1:8000/leak', method='POST'), timeout=2).read() \
                       for _ in range(30)]" 2>/dev/null || true
   ```
   The exec session dies with exit code 137 when the rover OOMs mid-loop (~10 s in); the `2>/dev/null || true` wrapper swallows the error.

8. **Verify the three-symptom-simultaneous state.** Each of the four checks below must pass:
   ```bash
   # (a) Three friction signals visible in one listing
   kubectl get pods -n artemis-uc4
   # → mission-control-imagepull-…   0/1   ImagePullBackOff   0    Nm
   # → mission-control-pending-…     0/1   Pending            0    Nm
   # → lunar-rover-telemetry-…       1/1   Running            1    Nm   (RESTARTS: 1)

   # (b) Rover's lastState confirms OOMKilled
   kubectl get pod -n artemis-uc4 -l app=lunar-rover-telemetry \
     -o jsonpath='{.items[0].status.containerStatuses[0].lastState.terminated.reason}'
   # → OOMKilled

   # (c) Coordinator Agent is Accepted=True and Ready=True
   kubectl get agent -n kagent artemis-mission-coordinator \
     -o jsonpath='{range .status.conditions[*]}{.type}={.status}{"\n"}{end}'
   # → Accepted=True
   # → Ready=True

   # (d) discoveredTools include list_bulbs + update_bulb from artemis-bulb-mcp
   kubectl get rmcps -n kagent artemis-bulb-mcp \
     -o jsonpath='{.status.discoveredTools[*].name}'
   # → list_bulbs update_bulb
   ```

9. **(Optional) Exercise the coordinator end-to-end** — gated on a real `artemis-llm-credentials` Secret in `kagent` ns + a reachable `light-manager` backend. On a bare local kind without these, the four checks (a)-(d) above are sufficient for STORY-027's NFR-003 self-author smoke.
   ```bash
   kagent invoke \
       --agent artemis-mission-coordinator \
       --namespace kagent \
       --task 'Run a fleet-wide status check on the Artemis subsystems active in the artemis-uc4 namespace and broadcast each verdict to my status bulbs.'
   # Expected: three bulbs flip to red in the light-manager UI; structured summary
   # prints to the terminal within ~30-45 s.
   ```

10. **Tear down before the next iteration.**
    ```bash
    make uc4-down              # delete uc4/manifests + uc4/agents
    make mcp-down              # delete mcp/manifests (artemis-bulb-mcp)
    make observability-down    # delete infra/observability (bundle + bridge)
    kubectl delete -f uc1/agents/ -f uc2/agents/ -f uc3/agents/   # specialist Agents
    kubectl taint nodes --all artemis.kagent.dev/launch-pad-fault-   # clear the synthetic taint
    ```
    For a strict cold deploy (recommended for NFR-003), `make kind-down` between iterations and skip the per-resource teardowns above.

**Sign-off:** record the run in the PR description per the M5 dry-run convention — three timestamps, four "OK" lines for checks (a)/(b)/(c)/(d), and a one-line note on whether step 9 was exercised. The **cross-author cold-deploy by Clément is deferred to STORY-028 (M5 dry-run)** per the recursive deferral chain established across STORY-018/019/020/021/024/025/026; STORY-027's PR ships Quentin's self-author smoke only.

## Recovery procedure

UC4's broken states are partly participant-triggered (the rover OOM via the Beat 1 leak), partly node-side (the synthetic taint persists across re-applies of `uc4/manifests/`). Four recovery levels:

- **Level 1 — re-trigger the leak only.** The rover stays in `Running 1/1, RESTARTS: N` after the OOM cycle. Re-running the Beat 1 leak trigger bumps the counter by 1. Acceptable for ad-hoc testing; not acceptable for NFR-003 reproduction (the counter contaminates the friction signal).
- **Level 2 — reset the rover only.** `kubectl rollout restart -n artemis-uc4 deploy/lunar-rover-telemetry` creates a fresh ReplicaSet → fresh Pod with restart count 0. The other two symptoms + the bootstrap Job + the synthetic taint survive untouched. Use this for tour iteration during authoring.
- **Level 3 — full UC4 teardown** (with manual taint clean-up). `make uc4-down` deletes `uc4/manifests/` + `uc4/agents/`. The synthetic taint **persists on the node** (the Job already completed; deleting the Job's manifest doesn't undo the `kubectl taint` it ran). Manually clear it:
  ```bash
  kubectl taint nodes --all artemis.kagent.dev/launch-pad-fault-
  ```
  Then re-applying `uc4/manifests/` reproduces the cycle from scratch.
- **Level 4 — full cluster teardown.** `make kind-down`. Required for NFR-003 cold deploys per the reproduction checklist.

## Production disclaimer

**Several UC4 design choices are workshop-grade, not production-grade.** Do not point at them as references for a real multi-agent or multi-tenant deployment.

What's pedagogical here:

- **Per-vCluster custom MCP.** Each participant runs their own `artemis-bulb-mcp` Pod (~50 MiB RAM). At workshop scale (~20-50 participants), the aggregate is small enough to fit on the AKS cluster comfortably. A real multi-tenant deployment would run a shared MCP behind an auth-aware gateway, encode `user=` in a verified JWT, and reject mismatches at the gateway rather than at the MCP pod. The per-vCluster design is chosen for the *hard topology-level guarantee* it gives (NFR-012) — a participant's coordinator literally cannot reach another participant's MCP — at the cost of pod density.
- **Plain HTTP everywhere.** The coordinator → MCP link is plain HTTP (`http://artemis-bulb-mcp.artemis-mcp.svc.cluster.local:8080`). The MCP → light-manager link is `http://light-manager.light-manager.svc.cluster.local:8000`. The vCluster network is the trust boundary; cross-vCluster traffic is impossible by topology. In production with shared networks, both links would be HTTPS with mutual auth, the MCP would validate its caller's identity rather than trusting the env var, and the light-manager would enforce its own per-tenant authorization at the API layer.
- **Anonymous Grafana inherited from `infra/observability/`.** UC4's rover-telemetry-debugger delegates to kagent's `observability-agent`, which talks to Grafana via the bridge — `GF_AUTH_ANONYMOUS_ENABLED=true` makes that interaction zero-friction. Same disclaimer UC3's README documents: safe per-vCluster by topology, not safe in a shared-network production setting.
- **`emptyDir` MCP state.** The MCP is stateless (it proxies light-manager); pod restarts don't lose data. But if it ever needed local state (rate-limiting buckets, audit logs), a real deployment would use a PVC or an external store.
- **No coordinator-side rate limiting or retry policy.** If a specialist's reasoning loop hangs, the coordinator hangs. If a specialist returns gibberish, the coordinator's verdict-mapping defaults to amber (the system prompt's *inconclusive* category). A production multi-agent system would carry timeouts, retries, and a more structured error-propagation contract.
- **Single-replica everything in the demo path.** UC4 inherits UC3's single-replica Prom/Graf and adds a single-replica MCP. None of these survive Pod loss for more than ~30 s. The workshop's ephemerality model (each participant boots a fresh vCluster per session) makes that acceptable.

What you would change for a production multi-tenant multi-agent system (rough sketch):

- Shared MCP behind an auth gateway. Token-scoped per-tenant. Audit-logged.
- mTLS or service mesh between agent → MCP → backend. Network policies as defence-in-depth.
- Persistent storage for the observability bundle + retention policy aligned with capacity (15-90 days typical).
- A multi-agent coordinator with explicit timeouts, retries, structured error categories, and a verdict-confidence score per specialist reply.
- LLM cost / latency guard-rails (per-tenant rate limits, model-version pinning, evaluation harnesses for specialist agents).

The workshop's intent is to teach **multi-agent fan-out + custom MCP as a diagnosis medium** — not to teach operators how to run multi-tenant LLM-agent systems. Treat UC4's stack as a learning-friendly stand-in.

## Author notes

The notes below capture engineering rationale and spike outcomes that participants don't read. Authors come here to find the *why* behind UC4's non-obvious choices.

### kagent v0.9.0 a2a wiring shape (STORY-019 spike, re-exercised by STORY-025)

The architecture (L300 + L457) said UC4 reuses "the three UC sub-Agents for a2a delegation". STORY-019 first confirmed the v0.9.0 a2a reference shape against the cluster's own `observability-agent.spec`: `tools[].type: Agent` + `tools[].agent.name: <agent-name>`. **No `namespace` field** — the runtime resolves the sub-Agent same-namespace.

This is why all four diagnostic agents (UC1/UC2/UC3 + UC4 coordinator) live in `kagent` namespace per `docs/artemis-naming.md` L60. STORY-025 confirmed the constraint when authoring the UC4 coordinator: the coordinator references the three specialists by name only, and the kagent reasoning loop resolves them against the coordinator's own namespace.

### UC2 inline drift patch chain (STORY-024 + STORY-025)

UC2's agent shipped in M2 with three drift items relative to the convention that UC1/UC3 established:

1. `metadata.namespace: artemis-uc2` (vs `kagent` per `docs/artemis-naming.md` L60).
2. `tools[].mcpServer.name: kagent-tools-k8s` (vs `kagent-tool-server` — the name kagent v0.9.0 demo profile actually ships).
3. `declarative.modelConfig: artemis-llm` (vs `default-model-config` — UC1+UC3 both use the kagent-installed default to avoid per-UC credential-Secret duplication).

STORY-024 also surfaced four manifest-side UC2 drifts: image tags (`:v1` not published, real tag is `:v1.0.0`), bootstrap shell (`/bin/bash` not in busybox-based `apogasa/kubectl:latest`, needs `/bin/sh`), strategy (default RollingUpdate deadlocks the rollout-restart pattern, needs `Recreate`), tolerations (Job has no toleration for the taint it applies, deadlocks on in-place re-apply).

STORY-025 inline-patched the three agent-side drifts because they block UC4's coordinator from reaching UC2's specialist via a2a. The four manifest-side drifts STORY-024 surfaced are still latent in UC2 — they don't block UC4 (UC2's manifests aren't applied by `make uc4-up`), so they're **Sprint-3 retro candidates** for an in-UC2 patch pass.

Together these seven UC2 latent gaps suggest UC2 was never end-to-end validated on a real cluster during M2. The PR's cross-author repro AC (deferred to STORY-028) will surface this when Clément runs UC2 fresh.

### Bridge-Services promotion: uc3/agents/ → infra/observability/ (STORY-019 → STORY-025)

The kagent ↔ artemis-observability bridge (two ExternalName Services in `kagent` ns) was originally shipped under `uc3/agents/` by STORY-019. STORY-019's preamble explicitly deferred the placement decision: *"either we copy these into uc4/agents/ or we promote the file to infra/observability/"*. STORY-024 inherited the question but didn't act (it scoped to manifests only). STORY-025 promoted to `infra/observability/` once UC4 confirmed identical bridge needs.

The promotion is in the kustomize-adjacent path (`infra/observability/kagent-bridge-services.yaml`), applied by `make observability-up` as a separate `kubectl apply -f` *outside* the kustomization. Reason: the kustomization sets `namespace: artemis-observability` at the root level, which would silently override the bridge's `namespace: kagent` and break it. STORY-025 also extended `make lint-manifests` with a separate dry-run for the bridge file.

UC3 inherits transparently: `make uc3-up` already depends on `observability-up`, so the bridge lands automatically. UC3's README + agent.yaml comments were updated for the new path.

### Leak-trigger pattern divergence — UC3 vs UC4 (STORY-020 → STORY-026)

UC3's tour ships `kubectl run telemetry-stream --rm -i --restart=Never --image=curlimages/curl:8.10.1 -- sh -c '...'` — works in `artemis-uc3` because no taint blocks the trigger pod. UC4 cannot use this pattern: the synthetic taint applied by UC4's bootstrap Job blocks a vanilla `kubectl run` trigger pod (no toleration). Three options were considered (STORY-026 §Technical Notes):

- `kubectl exec` into the rover Pod itself (rover tolerates the taint) — chosen.
- `kubectl run --overrides='{...tolerations...}'` — rejected: the JSON exposes the taint key, leaks the bootstrap-Job's purpose to a careful tour-command reader.
- Pre-shipped trigger Pod manifest with the toleration baked in — rejected: expands `uc4/manifests/` past STORY-024's frozen 7-file shape.

The `kubectl exec` form has one ergonomic downside: the exec stream dies with `exit code 137` when the rover OOMs mid-loop. `2>/dev/null || true` swallows the error so the participant doesn't see a scary stderr message. The Python urllib call avoids the in-pod `curl` dependency (the FastAPI image is `python:3.12-slim` — no curl).

### MCP RemoteMCPServer reconcile race (STORY-023, re-hit by STORY-025)

`make mcp-up` produces a `RemoteMCPServer artemis-bulb-mcp` resource that kagent's reconciler probes within ~7 s of creation — *before* the MCP Pod is Ready and listening. The initial reconcile probe gets `connect: connection refused`; the resource lands `Accepted=False`. ~60 s later the next reconcile succeeds automatically; an annotation poke (`kubectl annotate rmcps … poke=$(date +%s) --overwrite`) speeds it up.

STORY-023 documented this on first encounter. STORY-025 re-hit it during validation. Not a bug per se — it's an eventually-consistent reconciler doing its job — but it's a *user experience* gap: a participant who runs `make mcp-up` and immediately checks the rmcps will see `Accepted=False` and think something's broken. Workshop-infrastructure documentation needs to call this out, OR the Makefile target should wait-and-poke before exiting. **Sprint-3 retro candidate.**

### Sprint-3 retro candidates consolidated from UC4 stack

STORY-027 inherits a queue of retro items the upstream stories surfaced. Listed here as the consolidated retro plate ahead of M5:

1. **UC2 manifest-side patches** (STORY-024) — image tag `:v1` → `:v1.0.0`, bootstrap shell `/bin/bash` → `/bin/sh`, Pending Deployment `strategy.type: Recreate`, tolerations on Job + imagepull Deployment + rover Deployment. ~10-line patch, identical surgery to UC4's.
2. **UC2 agent-side patches** (STORY-025) — namespace, MCP server name, modelConfig. Already landed inline as part of STORY-025.
3. **UC1 stale spec on cluster** — `artemis-mission-control-debugger` on the workshop cluster currently shows `Accepted=False` because the deployed spec references `kagent-tools-k8s` (not the corrected `kagent-tool-server` the repo ships). Single re-apply of `uc1/agents/` fixes it.
4. **`make kagent-install` non-idempotency** — `helm install` vs `helm upgrade --install` (STORY-018 flagged). Hit by every cold-deploy iteration of UC3 + UC4. One-line Makefile fix.
5. **`make audit-tours` extension** — STORY-026 nearly shipped comment-stripped `fileEdits` content; a byte-identity check between `fileEdits[].content` and on-disk `uc*/manifests/*.yaml` would have caught it at lint time.
6. **kagent v0.9.0 a2a runtime parallelism semantics** — the coordinator's system prompt hedges "delegate in parallel where the runtime supports it" because we haven't confirmed whether `tools[].type: Agent` calls are issued in parallel by the kagent reasoning loop. STORY-028 timing observations during the dry-run will resolve this.
7. **RemoteMCPServer reconcile race** — workshop-infrastructure docs candidate (above).
8. **`make uc4-down` does not clear the synthetic taint** — the Job already completed, deleting its manifest doesn't undo the `kubectl taint`. The `make uc4-down` target could add a `kubectl taint nodes --all artemis.kagent.dev/launch-pad-fault-` step, or document the manual step (currently in this README's *Recovery procedure*).

## Cleanup

```bash
make uc4-down            # delete uc4/manifests + uc4/agents
make mcp-down            # delete mcp/manifests (artemis-bulb-mcp)
make observability-down  # delete infra/observability (bundle + bridge)
kubectl taint nodes --all artemis.kagent.dev/launch-pad-fault-   # clear the synthetic taint
make kind-down           # nuke the kind cluster entirely
```

`make uc4-down` leaves `infra/observability/` and `mcp/` running — useful when iterating on UC4 against the same observability + MCP state. Each is a separate target because UC4 isn't the only consumer (UC3 also uses observability; future scenarios may also use the MCP).

## References

- **PRD:** [`../docs/prd-kagent-workshop-scenarios-2026-04-27.md`](../docs/prd-kagent-workshop-scenarios-2026-04-27.md) — FR-014 (UC4 multi-symptom + coordinator), FR-015 (UC4 tour), FR-016 (custom MCP), FR-017 (bulb-colour-as-diagnosis), NFR-001/002/003 (reliability), NFR-008 (cross-author review), NFR-012 (per-vCluster MCP tenancy).
- **Architecture:** [`../docs/architecture-kagent-workshop-scenarios-2026-04-28.md`](../docs/architecture-kagent-workshop-scenarios-2026-04-28.md) §Component 6 (UC4) + §C5 (Custom MCP) + §C6 (Multi-symptom manifests) + L325 (tenancy contract) + L457 (coordination flow).
- **Naming vocabulary:** [`../docs/artemis-naming.md`](../docs/artemis-naming.md) — UC4 row in the narrative arc, namespace + Deployment + Agent + ModelConfig + ToolServer rows; FR-017 bulb / verdict mapping table.
- **Tour content convention:** [`../docs/tour-content-conventions.md`](../docs/tour-content-conventions.md) — the 4-beat mission-framing structure UC4's `tour.json` instantiates; the no-spoiler rule that scopes to tour fields only (this README is author-facing and exempt).
- **Sprint plan:** [`../docs/sprint-plan-kagent-workshop-scenarios-2026-04-28.md`](../docs/sprint-plan-kagent-workshop-scenarios-2026-04-28.md) §Sprint 3 (STORY-022 MCP source, STORY-023 MCP packaging) + §Sprint 4 (STORY-024 manifests, STORY-025 coordinator, STORY-026 tour, STORY-027 this README + cross-author repro).
- **Per-story implementation traces:** [`../docs/stories/STORY-022.md`](../docs/stories/STORY-022.md), [`STORY-023.md`](../docs/stories/STORY-023.md), [`STORY-024.md`](../docs/stories/STORY-024.md), [`STORY-025.md`](../docs/stories/STORY-025.md), [`STORY-026.md`](../docs/stories/STORY-026.md), [`STORY-027.md`](../docs/stories/STORY-027.md). The six together document the full UC4 stack including spike findings, validation traces, and the consolidated Sprint-3 retro queue. STORY-028 (M5 dry-run) will close the recursive cross-author-repro deferral chain.
