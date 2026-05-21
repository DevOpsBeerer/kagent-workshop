# UC4 — Multi-agent coordinator + custom MCP

**Owner:** Quentin Rodic (re-attributed from joint — full M4 Clément swap; see [`../docs/stories/STORY-027.md`](../docs/stories/STORY-027.md) §Ownership swap)
**Milestones:** M3 prep (custom MCP source + packaging — STORY-022/023), M4 climax (multi-symptom cluster + a2a coordinator + tour + this README — STORY-024/025/026/027)
**Tour ID:** `kagent-uc4-coordinator`
**FR / NFR:** FR-014 (multi-symptom scenario package), FR-015 (tour), FR-016 (custom MCP), FR-017 (bulb-colour-as-diagnosis), NFR-001/002/003/005/006/008/012

UC4 is the workshop's climax. The participant has just seen UC1 (single-agent, single-resource — `kubectl describe pod` synthesised in one shot), UC2 (single-agent, multi-resource — cross-resource correlation), UC3 (single-agent + external observability — `kubectl describe pod` + Grafana dashboard URL). UC4 introduces a fourth axis: **multi-agent fan-out**. One coordinator agent delegates three independent diagnoses to its on-call specialists in parallel, then writes three colour-coded verdicts to the participant's status bulbs through a per-vCluster custom MCP. The pedagogical contrast is no longer *one synthesis instead of N commands* — it's *one synthesis instead of N commands × M surfaces × K specialist contexts*, with the custom MCP acting as the diagnosis-output medium.

## Artemis narrative

The mission coordinator is on shift today. Three Artemis subsystems are checking in at once — mission control's incoming roster, a replacement replica on the launch pad, and the lunar rover's telemetry uplink — and all three are showing signs of friction simultaneously. The participant plays the on-call: applies the full fleet as a routine deployment, pushes a short telemetry stream from inside the rover, discovers in one `kubectl get pods` that three subsystems are in three different states of trouble at once, and hands the cross-subsystem assessment to **`artemis-mission-coordinator`** from the operational CLI. The coordinator fans out **three sub-tasks in parallel to the same specialist — kagent's built-in `k8s-agent`** — one per Deployment, collects each verdict, paints the participant's three status bulbs accordingly, and replies with a structured summary. The participant then asks the coordinator to **remediate** what it found, and the coordinator delegates fix-tasks the same way; bulbs flip green as each patch lands. See [`../docs/artemis-naming.md`](../docs/artemis-naming.md#narrative-arc-uc1--uc4) for the full arc, and [`../docs/tour-content-conventions.md`](../docs/tour-content-conventions.md) for the canonical 4-beat structure UC4 extends to **5 beats** to cover the fix flow (mission setup → status check → diagnose → fix → verify+recap).

## Prerequisites

UC4 is the workshop's most-integrated scenario. Four pieces of cluster state must be in place before `kubectl apply -f uc4/manifests/` + `kubectl apply -f uc4/agents/` produces a meaningful broken state.

### 1. kagent v0.9.0 with the demo profile (M1 baseline)

`make kagent-install` installs kagent v0.9.0 with `--profile demo` (per [`../docs/stories/STORY-033.md`](../docs/stories/STORY-033.md)). The demo profile ships the pre-packaged sub-agents UC3's debugger delegates to (`promql-agent`, `observability-agent`) and the `kagent-tool-server` + `kagent-grafana-mcp` RemoteMCPServers UC1/UC2/UC3/UC4 source their tools from.

### 2. A2A specialists in `kagent` namespace

The coordinator's `tools[].type: Agent` references resolve same-namespace only in kagent v0.9.0 (no `namespace` field on the agent ref — STORY-019 §Spike findings). After the UC1–UC4 redesign, **the coordinator delegates to a single specialist** — kagent's built-in `k8s-agent` — for all three slots:

| Specialist  | Source                                                                       | Used for                                                                                                                                                                                  |
| ----------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `k8s-agent` | kagent built-in (installed by `make kagent-install`, demo profile) — in `kagent` ns | All three slots. General K8s diagnose + remediate (read tools for diagnosis; `k8s_patch_resource` / `k8s_apply_manifest` for remediation). Earlier iterations shipped three per-symptom specialists (`mission-control-debugger`, `launch-pad-debugger`, `rover-telemetry-debugger`); all three were biased toward their UC's specific symptom and have been collapsed into `k8s-agent`. |

`make uc4-up` applies `uc4/manifests/` + `uc4/agents/` (just the coordinator). UC1 / UC2 / UC3 do not contribute Agent CRDs that UC4's coordinator depends on (UC2 ships its own `artemis-image-fetcher` for the UC2 tour only; UC4 does not delegate to it).

### 4. Custom bulb MCP (STORY-022, STORY-023)

UC4's diagnosis-output medium is the participant's three status bulbs. The coordinator writes them through a per-vCluster custom MCP that wraps the sibling `light-manager` API (`GET /api/bulbs?user=<login>`, `PUT /api/bulbs/<slot>?user=<login>`). The MCP source lives under [`../mcp/`](../mcp/); the tour brings it up by running `kmcp build` + `kmcp deploy --no-inspector` in Beat 1. `kmcp deploy` creates an **`MCPServer`** CRD (kagent.dev/v1alpha1), and kagent's reconciler then materialises the Deployment + Service + auto-discovers the tool surface — no separate `RemoteMCPServer` pointer is applied. The coordinator's `tools[]` references `kind: MCPServer name: artemis-bulb-mcp` directly. The `--no-inspector` flag tells `kmcp deploy` not to open a post-deploy browser-side MCP inspector.

The MCP is **tenancy-pinned** (NFR-012) at deploy time, **not** at call time: `list_bulbs()` and `update_bulb(slot, r, g, b)` take NO `user=` argument. The MCP reads `$WORKSHOP_PARTICIPANT_LOGIN` from its own env at every call and uses it on the light-manager request — agents have no way to target a different participant because the tool input schema has no slot for one. Beat 1's `kmcp deploy` threads two env vars into the MCP container: `--env WORKSHOP_PARTICIPANT_LOGIN=$WORKSHOP_PARTICIPANT_LOGIN` (the tenancy pin — the MCP fails closed on an unset/empty value) and `--env LIGHT_MANAGER_URL=http://light-manager.light-manager.svc.cluster.local:8000` (the light-manager backend the bulbs write to). See [`../mcp/`](../mcp/) for the full MCP source.

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
| Agent CRD                 | `artemis-mission-coordinator` | `kagent`          | Declarative type. A2A delegation to kagent's built-in `k8s-agent` for all three slots + MCP refs to `kagent-tool-server` RemoteMCPServer (`k8s_get_resources` for the pre-fan-out sanity check) and to the kmcp-deployed `artemis-bulb-mcp` MCPServer (bulb writes). |

The three Deployment symptoms surface on different timelines: `…-imagepull` enters `ImagePullBackOff` within ~30 s of apply (kubelet's first pull retry); `…-pending` enters `Pending` within ~5 s of the bootstrap Job completing (which is within ~10 s of apply); `…-telemetry` stays Running until the tour's Beat 1 leak trigger drives it through one OOM cycle (~10-15 s after the trigger fires). All three are visible simultaneously in `kubectl get pods -n artemis-uc4` ~60 s after `kubectl apply -f uc4/manifests/` + the leak trigger.

## Expected coordinator behaviour

The coordinator is **`artemis-mission-coordinator`** ([`agents/agent.yaml`](agents/agent.yaml)), a kagent v0.9.0 `Agent` of type `Declarative`. It lives in the `kagent` namespace (same constraint UC1/UC3 already document — cluster-scope-discoverable kagent CRDs use the `artemis-` prefix and live in `kagent`; same-namespace a2a wiring required by v0.9.0).

**Tool surface — three layers:**

| Layer            | Source                                       | Tools available to the coordinator                          |
| ---------------- | -------------------------------------------- | ----------------------------------------------------------- |
| K8s read (light) | `kagent-tool-server` (RemoteMCPServer, kagent ns)                  | `k8s_get_resources`                                         |
| Bulb writes      | `artemis-bulb-mcp` (MCPServer, kagent ns — kmcp-deployed)          | `list_bulbs`, `update_bulb`                                 |
| A2A sub-agent    | one specialist in `kagent` ns                | `k8s-agent` (kagent built-in, demo profile — all three slots)                                       |

The K8s read surface is deliberately tight (no `describe`, no `events`) — the coordinator does NOT do deep diagnosis itself. Its job is the *fan-out + bulb-write + summary*; each specialist handles the deep diagnosis (and remediation, when asked) for its own slot.

### Coordination flow (two modes)

The system prompt encodes two modes — diagnose and remediate (per [`agents/agent.yaml`](agents/agent.yaml)):

**Diagnose mode** (Beat 3 of the tour):

1. **(Optional) `list_bulbs()`** — reads the current bulb state. No arguments; the MCP knows which login to query from its own env.
2. **(Optional) `k8s_get_resources` on the named namespace** — confirms the three Deployments exist. If any is missing, stop and report the gap.
3. **Delegate three diagnosis sub-tasks** (parallel where supported) — one per slot, all targeting `k8s-agent` with a different Deployment name in each sub-task. Each returns a verdict.
4. **Map each verdict to a colour** per the FR-017 table.
5. **Three `update_bulb(slot, r, g, b)` calls** — one per slot. No `user=` argument; the MCP sources the pinned login from its own env. All three slots are written (green is a positive status signal, not a no-op).
6. **Structured reply** to the participant: three bulb-state lines + three remediation hints (copied verbatim from the specialists).

**Remediate mode** (Beat 4 of the tour — triggered by an explicit "fix / patch / remediate" phrasing in the participant's request):

1. **Delegate three remediation sub-tasks** to the same specialists, with prompts that name the fix path (e.g. "patch the Deployment's image to the most-recently-published tag", "remove the synthetic taint from all nodes", "raise the memory limit on the rover Deployment with a workaround caveat").
2. **`k8s-agent` runs the fix path** for each slot using its mutate tools (`k8s_patch_resource`, `k8s_apply_manifest`, ...).
3. **`update_bulb` each newly-green slot** as confirmations come in.
4. **Reply** with what was patched per slot, including the rover's workaround caveat (raising the memory limit hides a real memory leak in the application code — a production fix lives in `apps/lunar-rover-telemetry/`, not in the manifest).

**Total round-trip from the participant's perspective:** two `kagent invoke` calls (diagnose, then fix), six bulb-colour transitions in the light-manager UI tab, one structured terminal reply per call.

### Slot ↔ specialist mapping (FR-017)

The coordinator's system prompt locks the slot ↔ subsystem ↔ specialist mapping. The mapping is also in [`../docs/artemis-naming.md`](../docs/artemis-naming.md#fr-017-bulb--verdict-mapping-uc4) for cross-reference:

| Bulb slot | Deployment name pattern        | Specialist                          | Subsystem                                                                  |
| --------- | ------------------------------ | ----------------------------------- | -------------------------------------------------------------------------- |
| 1         | `mission-control-imagepull`    | `k8s-agent` (kagent built-in)       | UC1-family — image-pull anomaly.                                            |
| 2         | `mission-control-pending`      | `k8s-agent` (kagent built-in)       | UC2-family — scheduling anomaly.                                            |
| 3         | `lunar-rover-telemetry`        | `k8s-agent` (kagent built-in)       | UC3-family — restart / memory anomaly.                                     |

The mapping is intentionally aligned with the workshop arc (slot N ↔ UC N) so a participant who has just walked through UC1/UC2/UC3 reads the bulb panel as a recap of the diagnostic axes.

### Verdict ↔ colour mapping (FR-017)

The coordinator's system prompt locks the verdict ↔ colour mapping. The mapping is also in [`../docs/artemis-naming.md`](../docs/artemis-naming.md#fr-017-bulb--verdict-mapping-uc4):

| Verdict (specialist's reply)                                 | Colour | RGB              |
| ------------------------------------------------------------ | ------ | ---------------- |
| Symptom present (specialist diagnosed an active anomaly)     | red    | `(255, 0, 0)`    |
| Symptom absent (specialist found no anomaly)                 | green  | `(0, 255, 0)`    |
| Inconclusive / partial finding (specialist could not reach a verdict) | amber  | `(255, 191, 0)`  |

In the workshop's expected end-state after Beat 3, all three slots flip to **red** simultaneously — UC4's broken state is *deliberately* the three-symptom case. After Beat 4 (the participant asks the coordinator to remediate), the same three slots flip to **green** as each specialist confirms its patch. Amber is reserved for the inconclusive path (specialist could not reach a verdict — namespace unreachable, workload missing) and stays out of the happy-path tour.

**Expected coordinator output — Beat 3 (diagnose, guidance, not deterministic):**

> Three bulbs are now lit: slot 1 red, slot 2 red, slot 3 red.
>
> - **Slot 1** — image-pull anomaly on `mission-control-imagepull` (specialist verdict from `k8s-agent`, copied verbatim).
> - **Slot 2** — scheduling anomaly on `mission-control-pending` (specialist verdict from `k8s-agent`).
> - **Slot 3** — restart / memory anomaly on `lunar-rover-telemetry` (specialist verdict from `k8s-agent`).

Phrasing varies because the underlying specialists (`k8s-agent` especially) have general system prompts and produce variable wording. The coordinator does NOT rephrase the specialists' replies — it copies them.

**Expected coordinator output — Beat 4 (remediate, guidance):**

> Three slots updated: slot 1 green, slot 2 green, slot 3 green.
>
> - **Slot 1** — patched `mission-control-imagepull` image to `:v1.0.0` (specialist confirmation).
> - **Slot 2** — removed synthetic taint `artemis.kagent.dev/launch-pad-fault` from all nodes.
> - **Slot 3** — raised `lunar-rover-telemetry` memory limit to 128Mi. **Workaround caveat:** this hides a memory leak in the application code rather than fixing it. A real fix lives in `apps/lunar-rover-telemetry/`, not in the manifest.

## Tenancy guarantee (FR-015 + NFR-012)

UC4's diagnosis-output medium is a shared physical resource — the participant's three status bulbs — wrapping a multi-tenant `light-manager` service that hosts every participant's bulbs concurrently. The architecture's per-vCluster MCP design (§C5 + L122-126 of the architecture document) provides a **hard tenancy guarantee**: the coordinator in vCluster A *cannot* paint participant B's bulbs even if a misprompted agent tries.

Three pieces of the design enforce the guarantee:

1. **Per-vCluster MCP.** Each participant gets their own `artemis-bulb-mcp` Deployment in their `artemis-mcp` namespace, with `WORKSHOP_PARTICIPANT_LOGIN` injected from a per-participant Secret. The MCP refuses every call where `user != $WORKSHOP_PARTICIPANT_LOGIN`. See [`../mcp/src/core/tenancy.py`](../mcp/src/core/tenancy.py).
2. **`list_bulbs` / `update_bulb` take no `user=` argument** — the MCP's tool input schema has no slot for one. The coordinator's prompt only specifies `slot`, `r`, `g`, `b`; the MCP threads the env-pinned login on every light-manager request itself. The agent literally cannot misuse it. See [`agents/agent.yaml`](agents/agent.yaml) for the prompt and [`../mcp/src/tools/`](../mcp/src/tools/) for the tool signatures.
3. **The tour's Beat 3 explanation** (per FR-015) names the `?user=<login>` query parameter explicitly so the participant *sees* the tenancy scope as a feature: they open the light-manager UI in a browser tab with their own `?user=<their-login>` and watch their three bulbs flip — the same query parameter the MCP enforces server-side. See [`tour.json`](tour.json) Beat 3.

The trade-off vs a shared-MCP design (one MCP pod, N vClusters): per-vCluster costs ~50 MiB of RAM per participant slice (architecture L122-126), but gives a hard guarantee at the topology level — vCluster A's coordinator cannot even reach vCluster B's MCP because the per-vCluster MCP doesn't know B's login.

## Files in this directory

```
uc4/
  README.md                              this file
  tour.json                              5-beat workshop-tour content (mission setup → status check → diagnose → fix → verify+recap)
  manifests/
    00-namespace.yaml                    artemis-uc4 namespace
    10-rbac.yaml                         ServiceAccount + ClusterRole/Binding + Role/Binding for the bootstrap Job
    20-bootstrap-taint-job.yaml          synthetic-taint apply + rollout-restart of mission-control-pending
    30-services.yaml                     3 ClusterIP Services (one per Deployment; rover Service carries monitoring=prom)
    40-deployment-imagepull.yaml         mission-control-imagepull — UC1-style image-pull symptom
    50-deployment-pending.yaml           mission-control-pending — UC2-style scheduling symptom (Recreate strategy)
    60-deployment-telemetry.yaml         lunar-rover-telemetry — UC3-style OOM symptom (64Mi limit)
  agents/
    agent.yaml                           artemis-mission-coordinator (A2A to k8s-agent + kagent-tool-server RemoteMCPServer + artemis-bulb-mcp MCPServer; references default-model-config)
```

UC4 also depends on, but does not contain:

- [`../mcp/`](../mcp/) — the custom bulb MCP source (Python project + `kmcp.yaml`). The tour builds it with `kmcp build` and ships it with `kmcp deploy --no-inspector` (Beat 1) — the latter creates the `MCPServer` CRD that kagent reconciles into a Deployment + Service + tool registration.
- (no observability dependency anymore — the coordinator collapsed slot 3 onto `k8s-agent` and dropped the Grafana A2A. `infra/observability/` + the kagent bridge still exist as standalone targets for authors who want them; UC4 does not pull them in.)
- (no external Agent CRDs required) — all three slots are handled by kagent's built-in `k8s-agent` (installed by `make kagent-install`, demo profile). UC1 / UC2 / UC3 do not contribute Agent CRDs the coordinator depends on.

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

2. **Build + deploy the custom bulb MCP.** Same shape the Beat 1 tour commands run; threads the two env vars the MCP needs (`WORKSHOP_PARTICIPANT_LOGIN` for tenancy, `LIGHT_MANAGER_URL` for the bulbs backend) and uses `--no-inspector` so the post-deploy step doesn't try to open a browser-side MCP inspector:
   ```bash
   kmcp build --project-dir mcp/ \
       -t registry.kagent-devopsdays.ch/$WORKSHOP_PARTICIPANT_LOGIN/artemis-bulb-mcp:v0.1.0 \
       --push --platform linux/amd64

   kmcp deploy \
       --file mcp/kmcp.yaml \
       --image registry.kagent-devopsdays.ch/$WORKSHOP_PARTICIPANT_LOGIN/artemis-bulb-mcp:v0.1.0 \
       --namespace kagent \
       --transport http \
       --no-inspector \
       --env WORKSHOP_PARTICIPANT_LOGIN=$WORKSHOP_PARTICIPANT_LOGIN \
       --env LIGHT_MANAGER_URL=http://light-manager.light-manager.svc.cluster.local:8000
   ```
   `kmcp deploy` creates an `MCPServer` CRD named `artemis-bulb-mcp` in `kagent` ns; the kagent reconciler turns it into a Deployment + Service + tool registration within ~10 s. No separate `RemoteMCPServer` pointer is applied — the coordinator's `tools[]` references the `MCPServer` directly. Verify:
   ```bash
   kubectl get mcpserver -n kagent artemis-bulb-mcp \
     -o jsonpath='{range .status.conditions[*]}{.type}={.status}{","}{end}'
   # → Accepted=True,ResolvedRefs=True,Programmed=True,Ready=True,
   ```

3. **Bring up UC4** (manifests + coordinator agent; all three slots are served by the built-in `k8s-agent` that `make kagent-install` already deployed):
   ```bash
   make uc4-up   # equivalent to:
                 #   kubectl apply -f uc4/manifests/
                 #   kubectl apply -f uc4/agents/
   ```
   Verify the coordinator reaches `Accepted=True` within ~30 s:
   ```bash
   kubectl get agent -n kagent -o wide | grep -E 'k8s-agent|artemis-mission-coordinator'
   # → k8s-agent                            Declarative   python   True   True
   # → artemis-mission-coordinator          Declarative   python   True   True
   ```

4. **Wait ~60 s** for the three Deployments to reach their respective symptoms:
   - `mission-control-imagepull`: kubelet retries the pull 3-5 times before transitioning to `ImagePullBackOff`.
   - `mission-control-pending`: the bootstrap Job applies the taint within ~5 s, then `kubectl rollout restart` produces a new Pod that hits the taint and stays `Pending`.
   - `lunar-rover-telemetry`: comes up `Running 1/1` (no symptom yet — the leak loop is participant-triggered in Beat 1 of the tour).

5. **Trigger the leak** (the tour's Beat 1 third command — `kubectl exec` form per [STORY-026](../docs/stories/STORY-026.md) Technical Notes; the `kubectl run --rm` form UC3 uses doesn't work here because the synthetic taint blocks an external trigger pod):
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

6. **Verify the three-symptom-simultaneous state.** Each of the four checks below must pass:
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

   # (d) MCPServer artemis-bulb-mcp is Ready (kagent reconciled the Deployment + Service)
   kubectl get mcpserver -n kagent artemis-bulb-mcp \
     -o jsonpath='{range .status.conditions[*]}{.type}={.status}{","}{end}'
   # → Accepted=True,ResolvedRefs=True,Programmed=True,Ready=True,
   ```

7. **(Optional) Exercise the coordinator end-to-end** — gated on a real LLM credentials Secret in `kagent` ns + a reachable `light-manager` backend. On a bare local kind without these, the four checks (a)-(d) above are sufficient for the NFR-003 self-author smoke.
   ```bash
   # Diagnose mode (Beat 3 of the tour) — three bulbs flip to red
   kagent invoke --agent artemis-mission-coordinator --namespace kagent \
       --task 'Run a fleet-wide diagnosis on the Artemis subsystems active in the artemis-uc4 namespace and broadcast each verdict to my status bulbs.'

   # Remediate mode (Beat 4 of the tour) — three bulbs flip to green
   kagent invoke --agent artemis-mission-coordinator --namespace kagent \
       --task 'Now remediate every red subsystem in artemis-uc4 by delegating the fix to the matching specialist. Update my bulbs as you go.'
   ```

8. **Tear down before the next iteration.**
    ```bash
    make uc4-down              # delete uc4/manifests + uc4/agents
    kubectl delete mcpserver -n kagent artemis-bulb-mcp --ignore-not-found   # tear down the kmcp-deployed bulb MCP
    kubectl taint nodes --all artemis.kagent.dev/launch-pad-fault-           # clear the synthetic taint (no-op if Beat 4 already removed it)
    ```
    For a strict cold deploy (recommended for NFR-003), `make kind-down` between iterations and skip the per-resource teardowns above.

**Sign-off:** record the run in the PR description per the M5 dry-run convention — three timestamps, four "OK" lines for checks (a)/(b)/(c)/(d), and a one-line note on whether step 7 was exercised. The **cross-author cold-deploy by Clément is deferred to STORY-028 (M5 dry-run)** per the recursive deferral chain established across STORY-018/019/020/021/024/025/026; STORY-027's PR ships Quentin's self-author smoke only.

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
- **(Observability bundle no longer in scope for UC4.)** Earlier iterations had UC4 delegate slot 3 to a rover-telemetry-debugger that A2A'd to kagent's `observability-agent` for a Grafana memory panel. The collapsed coordinator only delegates to `k8s-agent`, so the observability stack and the anonymous-admin Grafana disclaimer no longer apply to UC4.
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

### kagent v0.9.0 A2A wiring shape (STORY-019 spike, re-exercised by STORY-025)

The architecture (L300 + L457) originally said UC4 reuses "the three UC sub-Agents for A2A delegation". STORY-019 first confirmed the v0.9.0 A2A reference shape against the cluster's own `observability-agent.spec`: `tools[].type: Agent` + `tools[].agent.name: <agent-name>`. **No `namespace` field** — the runtime resolves the sub-Agent same-namespace.

That's why every A2A target (kagent's built-in `k8s-agent`, the UC4 coordinator) lives in `kagent` namespace. The UC1–UC4 redesign collapsed the old three-specialist setup (mission-control-debugger + launch-pad-debugger + rover-telemetry-debugger) into a single delegation target — kagent's built-in `k8s-agent` — for all three slots; the same-namespace constraint still holds.

### UC2 inline drift patch chain (STORY-024 + STORY-025)

UC2's agent shipped in M2 with three drift items relative to the convention that UC1/UC3 established:

1. `metadata.namespace: artemis-uc2` (vs `kagent` per `docs/artemis-naming.md` L60).
2. `tools[].mcpServer.name: kagent-tools-k8s` (vs `kagent-tool-server` — the name kagent v0.9.0 demo profile actually ships).
3. `declarative.modelConfig: artemis-llm` (vs `default-model-config` — every Artemis agent uses the kagent-installed default to avoid per-UC credential-Secret duplication; the per-UC `artemis-llm` ModelConfig slots that earlier iterations shipped were dropped post-freeze).

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

1. **UC1–UC4 redesign follow-ups** — (a) the `mission-control-debugger.yaml` CRD removed from `uc4/agents/` (replaced by built-in `k8s-agent`); (b) UC2 fully pivoted to `image_fetcher` with the `fetcher` MCPServer; (c) UC3 prompt generalised, mutate tool added for UC4 reuse; (d) UC4 coordinator now delegates to two specialists instead of three, 5-beat tour with explicit fix flow.
2. **`make kagent-install` non-idempotency** — `helm install` vs `helm upgrade --install` (STORY-018 flagged). Hit by every cold-deploy iteration of UC3 + UC4. One-line Makefile fix.
3. **`make audit-tours` extension** — byte-identity check between `fileEdits[].content` and on-disk `uc*/manifests/*.yaml` to catch comment drift at lint time.
4. **kagent v0.9.0 A2A runtime parallelism semantics** — the coordinator's system prompt hedges "delegate in parallel where the runtime supports it" because we haven't confirmed whether `tools[].type: Agent` calls are issued in parallel by the kagent reasoning loop. Dry-run timing observations will resolve this.
5. **RemoteMCPServer reconcile race** — workshop-infrastructure docs candidate (above).
6. **`make uc4-down` does not clear the synthetic taint** — the Job already completed, deleting its manifest doesn't undo the `kubectl taint`. The `make uc4-down` target could add a `kubectl taint nodes --all artemis.kagent.dev/launch-pad-fault-` step, or document the manual step (currently in this README's *Recovery procedure*).

## Cleanup

```bash
make uc4-down            # delete uc4/manifests + uc4/agents
make mcp-down            # delete mcp/manifests (artemis-bulb-mcp)
kubectl delete mcpserver -n kagent artemis-bulb-mcp --ignore-not-found   # tear down the kmcp-deployed bulb MCP
kubectl taint nodes --all artemis.kagent.dev/launch-pad-fault-   # clear the synthetic taint
make kind-down           # nuke the kind cluster entirely
```

`make uc4-down` leaves the kmcp-deployed `artemis-bulb-mcp` MCPServer running — useful when iterating on UC4 against the same MCP state. Delete it explicitly (above) when you want a strict reset.

## References

- **PRD:** [`../docs/prd-kagent-workshop-scenarios-2026-04-27.md`](../docs/prd-kagent-workshop-scenarios-2026-04-27.md) — FR-014 (UC4 multi-symptom + coordinator), FR-015 (UC4 tour), FR-016 (custom MCP), FR-017 (bulb-colour-as-diagnosis), NFR-001/002/003 (reliability), NFR-008 (cross-author review), NFR-012 (per-vCluster MCP tenancy).
- **Architecture:** [`../docs/architecture-kagent-workshop-scenarios-2026-04-28.md`](../docs/architecture-kagent-workshop-scenarios-2026-04-28.md) §Component 6 (UC4) + §C5 (Custom MCP) + §C6 (Multi-symptom manifests) + L325 (tenancy contract) + L457 (coordination flow).
- **Naming vocabulary:** [`../docs/artemis-naming.md`](../docs/artemis-naming.md) — UC4 row in the narrative arc, namespace + Deployment + Agent + ModelConfig + ToolServer rows; FR-017 bulb / verdict mapping table.
- **Tour content convention:** [`../docs/tour-content-conventions.md`](../docs/tour-content-conventions.md) — the canonical 4-beat mission-framing structure UC4's `tour.json` extends to 5 beats (the extra beat covers the explicit fix flow); the no-spoiler rule that scopes to tour fields only (this README is author-facing and exempt).
- **Sprint plan:** [`../docs/sprint-plan-kagent-workshop-scenarios-2026-04-28.md`](../docs/sprint-plan-kagent-workshop-scenarios-2026-04-28.md) §Sprint 3 (STORY-022 MCP source, STORY-023 MCP packaging) + §Sprint 4 (STORY-024 manifests, STORY-025 coordinator, STORY-026 tour, STORY-027 this README + cross-author repro).
- **Per-story implementation traces:** [`../docs/stories/STORY-022.md`](../docs/stories/STORY-022.md), [`STORY-023.md`](../docs/stories/STORY-023.md), [`STORY-024.md`](../docs/stories/STORY-024.md), [`STORY-025.md`](../docs/stories/STORY-025.md), [`STORY-026.md`](../docs/stories/STORY-026.md), [`STORY-027.md`](../docs/stories/STORY-027.md). The six together document the full UC4 stack including spike findings, validation traces, and the consolidated Sprint-3 retro queue. STORY-028 (M5 dry-run) will close the recursive cross-author-repro deferral chain.
