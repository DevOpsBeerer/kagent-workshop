# UC2 — Pod Pending (taint mismatch)

**Owner:** Quentin Rodic
**Milestone:** M2 (Sprint 2, 2026-05-04 → 2026-05-08)
**Tour ID:** `kagent-uc2-pod-pending`
**FR / NFR:** FR-010 (scenario package), FR-011 (tour), NFR-001/003/004/005/006

UC2 is the workshop's second beat: the participant has just learned the single-resource pattern from UC1 (one Pod, three commands, one synthesis) and now has to extend the same diagnostic instinct across **two** resource kinds — the Pod is Pending, but the failure lives on the Node. The agent's value goes up correspondingly: it crosses the resource boundary in a single synthesis, where the human had to switch context by hand.

## Artemis narrative

Mission control needs a replacement `mission-control` replica on the Artemis launch pad — the previous one rotated out at end of shift. The participant plays the on-call: applies the bundle as a routine launch-pad readiness sweep + replica deployment, sweeps the pod as a mission-status check, discovers the friction by hand (the replica hasn't come up), then hands the diagnosis to **`artemis-launch-pad-debugger`** from the operational CLI. The agent's response in the terminal closes the diagnostic loop in one synthesis — and the manual recap that follows names the cross-resource walk (pod side + node side) the participant skipped. See [`docs/artemis-naming.md`](../docs/artemis-naming.md#narrative-arc-uc1--uc4) for the full arc, and [`docs/tour-content-conventions.md`](../docs/tour-content-conventions.md) for the 4-beat structure (mission setup → status check → call the agent → manual recap).

## The bug

A single Deployment under one namespace, blocked at the scheduling layer by a synthetic node taint that no Pod tolerates. The image is real (`mission-control:v1`, the same tag UC4 will reuse) — only the scheduling constraint is unsatisfiable. Five resources land on the cluster on apply:

| Resource                      | Name                                          | Where it lives        | Notes                                                                                                       |
| ----------------------------- | --------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| Namespace                     | `artemis-uc2`                                 | cluster-scoped        | Labelled `kagent-workshop/uc=uc2`, `kagent-workshop/scenario=pod-pending`.                                  |
| ServiceAccount + RBAC         | `bootstrap-launch-pad-fault` + 2 RoleBindings | mixed                 | ClusterRole grants `nodes/patch` (for the taint); namespaced Role grants `deployments/patch` (for the rollout restart). Least-privilege. |
| Job                           | `bootstrap-launch-pad-fault`                  | `artemis-uc2`         | `rg.fr-par.scw.cloud/apogasa/kubectl:1.31.0`. Taints all nodes with `artemis.kagent.dev/launch-pad-fault=true:NoSchedule`, then `kubectl rollout restart`s the Deployment. **The bit that makes the broken state deterministic.** |
| Service                       | `mission-control`                             | `artemis-uc2`         | ClusterIP, port 8000 → container port `http`. Present so a working pod would be reachable.                  |
| Deployment                    | `mission-control`                             | `artemis-uc2`         | `replicas: 1`, image `rg.fr-par.scw.cloud/apogasa/mission-control:v1` (real tag), no toleration — **the broken bit**. |

The mechanism, end-to-end:

1. The bootstrap Job runs first (numbered file ordering: `20-` before the Deployment's `40-`). Its first kubectl call applies the synthetic taint.
2. The Job then waits up to 60 s for the Deployment to exist (handles the apply ordering between Job spec and Deployment spec).
3. Once the Deployment exists, the Job runs `kubectl rollout restart` — this bumps the pod template hash, terminates any Pod the scheduler may have bound to the (then-untainted) node, and creates a fresh Pod that the scheduler now refuses to place on the (now-tainted) node.
4. The new Pod settles in `Pending` with a `FailedScheduling: 0/1 nodes are available: 1 node(s) had untolerated taint` event from `default-scheduler`.

The rollout-restart step is what closes the cold-deploy race that would otherwise let a Pod bind before the taint lands (see NFR-003). Without it, on a fresh kind cluster with the `mission-control:v1` image already cached, the Pod would frequently end up Running.

The participant's job in the CLI baseline is to find the taint by switching from the Pod to the Node; the agent's job in the next beat is to do the same correlation in one shot.

## Expected agent diagnosis

The diagnostic agent is **`artemis-launch-pad-debugger`** (see [`agents/agent.yaml`](agents/agent.yaml)), a kagent v0.9.0 `Agent` of type `Declarative`. It lives in the `kagent` namespace, references kagent's installed `default-model-config` ModelConfig (the canonical credentials slot across every Artemis agent — backed by the `artemis-llm-credentials` Secret in `kagent`), and sources tools from the `kagent-tool-server` RemoteMCPServer that ships with kagent's demo profile.

**Tool surface — five tools spanning two resource kinds + events (per FR-010 AC "multi-tool reach: pod, node, taint, events"):**

- `k8s_get_pod`
- `k8s_describe_pod`
- `k8s_get_node`
- `k8s_describe_node`
- `k8s_get_events`

**Expected agent output** (one or two sentences, deterministic across runs to within phrasing):

> The `mission-control` Pod in `artemis-uc2` is Pending because the only node carries a synthetic `artemis.kagent.dev/launch-pad-fault=true:NoSchedule` taint that the Pod does not tolerate. Remove the taint with `kubectl taint nodes --all artemis.kagent.dev/launch-pad-fault-` (or add a matching toleration to the Deployment).

The pedagogical point made in the tour's Beat 3 ("What did the agent do better?"): same evidence, same conclusion, but the participant had to assemble it from two different `kubectl describe` invocations on two different resource kinds, while the agent did the cross-kind correlation in one synthesis. UC3 will scale this further to external observability; UC4 to multi-agent fan-out.

## Files in this directory

```
uc2/
  README.md          this file
  tour.json          4-step workshop-tour content (FR-011, STORY-016 → STORY-032 mission-framing rewrite)
  manifests/
    00-namespace.yaml          artemis-uc2 namespace
    10-rbac.yaml               SA + ClusterRole/Binding (nodes/patch) + Role/Binding (deployments/patch)
    20-bootstrap-taint-job.yaml  Job that taints the node and forces a rollout restart
    30-service.yaml            ClusterIP for mission-control
    40-deployment.yaml         1-replica Deployment with the real :v1 tag, no toleration
  agents/
    agent.yaml                 artemis-launch-pad-debugger (kagent.dev/v1alpha2 Agent, 5 tools; references default-model-config)
```

The manifest filenames are numbered so `kubectl apply -f uc2/manifests/` applies them in dependency order: namespace before namespaced resources; RBAC before the Job that needs it; Job before the Deployment so the Job's wait-loop catches the Deployment's creation.

## Reproduction (NFR-003 — 3/3 cold deploys)

The reproduction checklist below is the **manual** form of the NFR-003 reliability AC. Run it three times in a row from a deleted cluster; all three runs must reach the documented broken state. Tooling prereqs are validated by `make preflight` (`docker`, `kubectl`, `kind`, `helm`, `kagent`).

For each cold-deploy iteration:

1. **Reset the cluster.** From the repo root:
   ```bash
   make kind-down       # no-op if no cluster exists
   make kind-up         # creates the kagent-workshop kind cluster
   make kagent-install  # installs kagent v0.9.0 CRDs into the kagent namespace
   ```
2. **Apply UC2.**
   ```bash
   make uc2-up   # equivalent to: kubectl apply -f uc2/manifests/ && kubectl apply -f uc2/agents/
   ```
3. **Wait ~30 s** for the bootstrap Job to taint the node, force the rollout restart, and let the scheduler emit the FailedScheduling event.
4. **Verify the broken state.** Each of the four checks below must pass:
   ```bash
   # (a) Bootstrap Job has succeeded
   kubectl get job -n artemis-uc2 bootstrap-launch-pad-fault \
     -o jsonpath='{.status.succeeded}'
   # → 1

   # (b) The synthetic taint is on at least one node
   kubectl get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{range .spec.taints[*]}{.key}={.value}:{.effect}{" "}{end}{"\n"}{end}' \
     | grep 'artemis.kagent.dev/launch-pad-fault=true:NoSchedule'
   # → at least one matching line

   # (c) The mission-control Pod is Pending
   kubectl get pods -n artemis-uc2 -l app=mission-control \
     -o jsonpath='{.items[0].status.phase}'
   # → Pending

   # (d) The scheduler has emitted a FailedScheduling event naming the taint
   kubectl get events -n artemis-uc2 --field-selector reason=FailedScheduling \
     -o jsonpath='{.items[*].message}'
   # → at least one message containing "untolerated taint" and the taint key
   ```
5. **(Optional) Exercise the agent end-to-end** to confirm the diagnostic path is wired:
   ```bash
   kagent invoke \
     --agent artemis-launch-pad-debugger \
     --namespace artemis-uc2 \
     --task 'The mission-control pod in the artemis-uc2 namespace is stuck Pending. Diagnose it.'
   # Expected: the agent names the artemis.kagent.dev/launch-pad-fault taint as the root cause within ~10–20 s.
   ```
   This step is gated on a real `artemis-llm-credentials` Secret being present in the `kagent` namespace (the agent uses `default-model-config`, which kagent's helm install pre-wires); on a bare local kind without one, the manifest checks (a)–(d) above are sufficient for NFR-003 sign-off.
6. **Tear down before the next iteration.**
   ```bash
   make uc2-down
   ```
   For a strict cold deploy (recommended for NFR-003), `make kind-down` between iterations — this also removes the synthetic taint that would otherwise persist on the kind node.

**Sign-off:** record the run in the PR description per the M5 dry-run convention — three timestamps, four "OK" lines for checks (a)/(b)/(c)/(d), and a one-line note on whether step 5 was exercised. The cross-author sign-off (Clément ↔ Quentin) lands on the PR per NFR-003 AC #2 before the M5 dry-run.

## Author notes

The note below captures the chosen invocation form for Beat 3, relocated from `tour.json`'s participant text per the convention's *No meta-references in prose* rule (`../docs/tour-content-conventions.md`). Participants never read this section; authors come here to find the *why* behind the Beat 3 invocation form.

### Beat 3 invocation form

`kagent invoke --agent <agent-name> --namespace <ns> --task '<prompt>'` is UC2's CLI invocation per the convention's *Beat 3 invocation: UI/chat vs CLI invoke* clause. UC2 declares the CLI variant to demonstrate kagent's terminal-side surface in addition to the dashboard chat surface UC1 uses. The agent's response prints to the terminal; the prompt is also surfaced in the step's markdown so the participant can copy-paste-modify it for re-runs without leaving the tour.

## Cleanup

```bash
make uc2-down   # delete uc2 resources, keep cluster up
make kind-down  # nuke the kind cluster entirely (also removes the synthetic taint)
```

If you keep the cluster up after `make uc2-down`, the synthetic taint stays on the node. To remove it without nuking the cluster:

```bash
kubectl taint nodes --all artemis.kagent.dev/launch-pad-fault-
```

## References

- **PRD:** [`../docs/prd-kagent-workshop-scenarios-2026-04-27.md`](../docs/prd-kagent-workshop-scenarios-2026-04-27.md) — FR-010 (scenario package), FR-011 (tour), NFR-001/003/004 (performance + reliability).
- **Architecture:** [`../docs/architecture-kagent-workshop-scenarios-2026-04-28.md`](../docs/architecture-kagent-workshop-scenarios-2026-04-28.md).
- **Naming vocabulary:** [`../docs/artemis-naming.md`](../docs/artemis-naming.md) — UC2 row in the narrative arc, namespace + Deployment + Agent rows.
- **Tour content convention:** [`../docs/tour-content-conventions.md`](../docs/tour-content-conventions.md) — the 4-beat mission-framing structure UC2's `tour.json` instantiates (mission setup → status check → CLI invoke of the agent → manual recap of the pod-side / node-side commands the participant skipped).
- **Sprint plan:** [`../docs/sprint-plan-kagent-workshop-scenarios-2026-04-28.md`](../docs/sprint-plan-kagent-workshop-scenarios-2026-04-28.md) §Sprint 2 — STORY-015 (manifests + agent CRDs), STORY-016 (`tour.json`), STORY-017 (this README + cross-author repro).
