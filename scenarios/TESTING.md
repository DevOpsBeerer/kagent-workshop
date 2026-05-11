# Local testing — author quick reference

How to test each UC locally as a repo author. The per-UC `README.md` files document the manifest design, the agent behaviour, and the full NFR-003 manual reproduction checklist; this file is the **cross-UC quick-start** + the **expected friction signal per UC** + the **common pitfalls** consolidated in one place.

For participant-facing instructions (workshop day), see [`DISTRIBUTION.md`](DISTRIBUTION.md).

---

## Cold-start recipe (~5 minutes from `make kind-down` to a Ready UC1)

Run from this repo's root (`scenarios/`):

```bash
make preflight           # validates docker / kubectl / kind / helm / kagent installed
make kind-down           # no-op if no cluster exists
make kind-up             # creates the kagent-workshop kind cluster
make kagent-install      # installs kagent v0.9.0 (helm upgrade --install, idempotent)
make uc1-up              # applies uc1/manifests/ + uc1/agents/
```

`make uc1-up` is the fastest UC to test (single Deployment, no taint Job, no leak loop). UC2/UC3/UC4 add complexity progressively:

```bash
make uc2-up              # adds bootstrap-taint Job + RBAC. ~60s for Pending pod
make uc3-up              # auto-installs observability bundle + bridge (uc3-up: observability-up). ~30s for rover Ready
make uc4-up              # same observability dependency + 3-symptom-simultaneous state
```

Common end-of-session cleanup:

```bash
make uc<N>-down          # delete one UC's manifests + agents (cluster + kagent + observability stay)
make observability-down  # delete Prom + Graf + bridge (UC3/UC4 prerequisite)
make mcp-down            # delete the bulb MCP (UC4 prerequisite)
make kind-down           # nuke the whole cluster
```

---

## Per-UC quick test matrix

| UC  | What to run                              | What to look for (`kubectl get pods -n …`)                          | Expected friction signal                                                                                                  | Full reproduction checklist |
| --- | ---------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| UC0 | `make kagent-install`                    | `kubectl get pods -n kagent` shows kagent runtime + demo-profile agents (`promql-agent`, `observability-agent`, etc.) | Not a diagnostic UC — installs kagent v0.9.0 with `--profile demo`. No friction signal to look for; just verify the demo-profile sub-agents are present. | [`uc0/README.md`](uc0/README.md) (no Reproduction section — install-only) |
| UC1 | `make uc1-up`<br>(wait ~30s)             | `kubectl get pods -n artemis-uc1`                                   | `mission-control-…` Pod `0/1 ImagePullBackOff` — kubelet retries `mission-control:v999` (unpublished tag) repeatedly      | [`uc1/README.md`](uc1/README.md) §Reproduction |
| UC2 | `make uc2-up`<br>(wait ~60s — bootstrap Job runs first) | `kubectl get pods -n artemis-uc2`                                  | `mission-control-…` Pod `0/1 Pending` — `FailedScheduling: 0/1 nodes are available: 1 node(s) had untolerated taint`     | [`uc2/README.md`](uc2/README.md) §Reproduction |
| UC3 | `make uc3-up`<br>(wait Ready, then run the Beat 1 leak loop — see UC3 README) | `kubectl get pods -n artemis-uc3`                                   | `lunar-rover-telemetry-…` Pod `1/1 Running, RESTARTS: 1` — `lastState.terminated.reason: OOMKilled, exitCode: 137`        | [`uc3/README.md`](uc3/README.md) §Reproduction |
| UC4 | `make uc4-up`<br>(wait rover Ready, run Beat 1 in-pod-exec leak loop — see UC4 README) | `kubectl get pods -n artemis-uc4`                                   | **Three simultaneous symptoms**: `mission-control-imagepull-…` ImagePullBackOff, `mission-control-pending-…` Pending, `lunar-rover-telemetry-…` Running 1/1 RESTARTS=1 (OOMKilled) | [`uc4/README.md`](uc4/README.md) §Reproduction |

**Beat 1 leak loops** (copy-paste-ready):

```bash
# UC3 — kubectl run trigger pod (UC3 namespace has no taint):
kubectl run telemetry-stream --rm -i --restart=Never \
  --image=curlimages/curl:8.10.1 --namespace=artemis-uc3 \
  --command -- sh -c 'for i in $(seq 1 30); do \
    curl -sf -X POST http://lunar-rover-telemetry:8000/leak --max-time 2; \
    echo; done; echo stream complete'

# UC4 — kubectl exec inside the rover Pod (UC4 namespace has the synthetic taint;
# transient kubectl run pod would stay Pending):
kubectl wait --for=condition=Ready pod -n artemis-uc4 \
  -l app=lunar-rover-telemetry --timeout=60s
kubectl exec -n artemis-uc4 \
  $(kubectl get pod -n artemis-uc4 -l app=lunar-rover-telemetry \
      -o jsonpath='{.items[0].metadata.name}') \
  -- python3 -c "import urllib.request as u; \
                 [u.urlopen(u.Request('http://127.0.0.1:8000/leak', method='POST'), \
                            timeout=2).read() for _ in range(30)]" \
  2>/dev/null || true
```

---

## Testing the agents (gated on LLM credentials)

The cluster-side reproductions above don't require LLM credentials — they validate the **manifest behaviour** that the agent reasoning loops consume. To exercise the agents themselves, an `artemis-llm-credentials` Secret must exist in the `kagent` namespace.

For a local kind cluster, the simplest path is to mirror the workshop-infrastructure shape:

```bash
kubectl -n kagent create secret generic artemis-llm-credentials \
  --from-literal=api-key=sk-...       # your OpenAI key
```

Then each UC's agent can be invoked from the operational CLI:

```bash
# UC1 — via kagent dashboard (UI/chat):
kagent dashboard                       # opens the dashboard in your browser

# UC2 / UC3 / UC4 — via kagent CLI invoke:
kagent invoke --agent artemis-launch-pad-debugger --namespace kagent \
  --task 'The mission-control pod in the artemis-uc2 namespace is stuck Pending. Diagnose it.'

kagent invoke --agent artemis-rover-telemetry-debugger --namespace kagent \
  --task 'The lunar-rover-telemetry pod in the artemis-uc3 namespace keeps restarting. Diagnose it, and show me a memory chart.'

kagent invoke --agent artemis-mission-coordinator --namespace kagent \
  --task 'Run a fleet-wide status check on the Artemis subsystems active in the artemis-uc4 namespace and broadcast each verdict to my status bulbs.'
```

UC4's coordinator additionally needs the bulb MCP up and the light-manager backend reachable for the bulb-write half to land. The local-kind form (with placeholder values) is in [`uc4/README.md`](uc4/README.md#reproduction-nfr-003--33-cold-deploys) step 3.

---

## Common pitfalls

The Sprint-3 retro queue (consolidated in [`uc4/README.md`](uc4/README.md#author-notes) §Author notes) names these in detail. Quick reference:

### 1. `RemoteMCPServer` reconcile race on first MCP apply (~7 s window)

After `make mcp-up`, the `artemis-bulb-mcp` RemoteMCPServer initially lands `Accepted=False` because kagent's reconciler probes the MCP Pod before it's Ready. Auto-recovers within ~60 s, or trigger an explicit re-reconcile:

```bash
kubectl annotate rmcps -n kagent artemis-bulb-mcp poke=$(date +%s) --overwrite
```

### 2. UC4 leaves the synthetic taint on the node after `make uc4-down`

The bootstrap Job already completed when you tear down — deleting its manifest doesn't undo the `kubectl taint` it ran. Clear manually:

```bash
kubectl taint nodes --all artemis.kagent.dev/launch-pad-fault-
```

Same applies after `make uc2-down`. The UC2/UC4 READMEs both document this in their *Recovery procedure* sections.

### 3. `make kagent-install` is idempotent post-STORY-029

Pre-STORY-029, the target used `helm install` (errored on re-runs with "cannot re-use a name"). STORY-029 switched it to `helm upgrade --install` so re-running on a cluster that already has kagent yields `STATUS: deployed, REVISION: N+1` instead of failing.

If you're testing against a long-running cluster and seeing odd kagent behaviour after a re-install, check `helm history -n kagent kagent-crds` to verify the revision count.

### 4. UC1 agent on the workshop cluster may have a stale spec

The shared workshop kagent cluster currently has a pre-M2.5 `artemis-mission-control-debugger` agent that references `kagent-tools-k8s` (which doesn't exist on kagent v0.9.0). The repo's `uc1/agents/agent.yaml` is correct. To fix on the shared cluster:

```bash
kubectl apply -f uc1/agents/
kubectl get agent -n kagent artemis-mission-control-debugger -o wide
# Expected: Accepted=True within ~30s
```

Per-participant vClusters get the corrected spec by construction (workshop-infrastructure provisioning runs `kubectl apply -f` against the repo state).

### 5. UC3/UC4 require the observability bundle to be Ready before the agent works

`make uc3-up` and `make uc4-up` declare `observability-up` as a prerequisite, but kagent's pre-packaged Prom/Graf agents resolve `prometheus.kagent.svc:9090` and `grafana.kagent.svc:3000` via the bridge Services in [`infra/observability/kagent-bridge-services.yaml`](infra/observability/kagent-bridge-services.yaml). If the bridge is missing, the agents reach Accepted=True but their Prom/Graf tool calls fail at invocation time.

Verify the bridge is present:

```bash
kubectl get svc -n kagent prometheus grafana
# Expected: both ExternalName Services pointing to artemis-observability
```

### 6. The freeze tag is the authoritative workshop ship state

`git tag workshop-2026-05-20-freeze` was applied to commit `25e5723` after STORY-029. The tag pins the state workshop-infrastructure pulls; subsequent commits on `main` should be docs typo fixes only (or new author-facing tooling outside the frozen surface, like this file and `DISTRIBUTION.md`).

To check out the tagged state locally:

```bash
git checkout workshop-2026-05-20-freeze    # detached HEAD
# … test …
git checkout main                           # back to ongoing work
```

---

## Cross-references

- **Per-UC reproduction checklists:** [`uc0/README.md`](uc0/README.md), [`uc1/README.md`](uc1/README.md), [`uc2/README.md`](uc2/README.md), [`uc3/README.md`](uc3/README.md), [`uc4/README.md`](uc4/README.md).
- **Naming vocabulary:** [`docs/artemis-naming.md`](docs/artemis-naming.md).
- **Tour content convention:** [`docs/tour-content-conventions.md`](docs/tour-content-conventions.md).
- **BMAD audit trail** (story documents, sprint plan, dry-run synthesis): [`docs/stories/STORY-001.md`](docs/stories/) onwards + [`docs/sprint-plan-kagent-workshop-scenarios-2026-04-28.md`](docs/sprint-plan-kagent-workshop-scenarios-2026-04-28.md) + [`docs/stories/STORY-028.md`](docs/stories/STORY-028.md) for the dry-run synthesis.
- **Workshop deployment to participants:** [`DISTRIBUTION.md`](DISTRIBUTION.md).
