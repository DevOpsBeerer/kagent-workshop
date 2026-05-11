# UC1 — ImagePullBackOff

**Owner:** Clément Raussin
**Milestone:** M2 (Sprint 2, 2026-05-04 → 2026-05-08)
**Tour ID:** `kagent-uc1-imagepullbackoff`
**FR / NFR:** FR-008 (scenario package), FR-009 (tour), NFR-001/003/005/006

UC1 is the workshop's opening scenario: the simplest single-agent diagnosis path. The participant first runs three `kubectl` commands to observe a broken `mission-control` deployment, then hands the same problem to a kagent agent that returns one synthesised root-cause sentence using the same read tools. UC1 establishes the "agent vs. CLI" comparison the rest of the workshop builds on.

## Artemis narrative

Mission control is bringing today's on-shift roster online for the Artemis pad shift, but the new replica isn't reaching the cluster — the deploy went out at the end of yesterday's pad shift and the on-call has woken up to a stuck pod. The participant plays the on-call: applies the deployment as a routine mission setup, sweeps the pod and events as a status check, discovers the friction by hand, then hands the diagnosis to **`artemis-mission-control-debugger`** through the kagent dashboard chat. The agent's response in the chat closes the diagnostic loop in one synthesis. See [`docs/artemis-naming.md`](../docs/artemis-naming.md#narrative-arc-uc1--uc4) for the full arc, and [`docs/tour-content-conventions.md`](../docs/tour-content-conventions.md) for the 4-beat structure (mission setup → status check → call the agent → manual recap).

## The bug

A single Deployment under one namespace, deliberately broken at the image-tag level — no probes, no readiness gates, no networking gotchas. The failure is the simplest possible Kubernetes diagnostic: an image reference that the registry will never resolve.

| Resource    | Name                  | Where it lives        | Notes                                                                                       |
| ----------- | --------------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| Namespace   | `artemis-uc1`         | cluster-scoped        | Labelled `kagent-workshop/uc=uc1`, `kagent-workshop/scenario=imagepullbackoff`.             |
| Deployment  | `mission-control`     | `artemis-uc1`         | `replicas: 1`, image `rg.fr-par.scw.cloud/apogasa/mission-control:v999` — **the broken bit**.   |
| Service     | `mission-control`     | `artemis-uc1`         | ClusterIP, port 8000 → container port `http`. Present so a working pod would be reachable.  |

The `mission-control` image is the FastAPI variant from `apps/mission-control/` (FR-007). Tag `:v1` exists and is used unbroken by UC2; `:v999` is intentionally not published. On apply, the kubelet attempts the pull, fails, backs off, and the Pod settles in `Waiting / ImagePullBackOff` (after one or two `ErrImagePull` cycles) within ~30 s on kind. Three pieces of state name the failure:

1. The Pod's phase: `Pending`, container state `Waiting` with reason `ImagePullBackOff`.
2. The container's image reference: `rg.fr-par.scw.cloud/apogasa/mission-control:v999`.
3. Recent events: repeated `Failed to pull image … manifest unknown` from the kubelet.

In the tour, **Mission status check** is intentionally minimal — a single `kubectl get pods` that surfaces the friction (pod not Running). The full three-command diagnosis is what the participant *would* have walked manually without the agent; in the tour, the agent absorbs it, and Beat 4 (`What we'd have done by hand`) names what was skipped.

## Expected agent diagnosis

The diagnostic agent is **`artemis-mission-control-debugger`** (see [`agents/agent.yaml`](agents/agent.yaml)), a kagent v0.9.0 `Agent` of type `Declarative`. It lives in the `kagent` namespace, references kagent's installed `default-model-config` ModelConfig (the canonical credentials slot across every Artemis agent — backed by the `artemis-llm-credentials` Secret in `kagent`), and sources tools from the `kagent-tool-server` RemoteMCPServer that ships with kagent's demo profile.

**Tool surface — exactly the three the participant just used manually:**

- `k8s_get_pod`
- `k8s_describe_pod`
- `k8s_get_events`

**Expected agent output** (one or two sentences, deterministic across runs to within phrasing):

> The `mission-control` Pod in `artemis-uc1` is in `ImagePullBackOff` because its container references `rg.fr-par.scw.cloud/apogasa/mission-control:v999`, an image tag that has never been published. Update the Deployment to a published tag (e.g. `:v1`) and re-apply.

The pedagogical point made in the tour's Beat 4 ("What we'd have done by hand"): same tools, same evidence, three commands collapsed into one synthesis — the participant skipped them. UC2 scales this up to multi-resource correlation; UC3 to external observability; UC4 to multi-agent fan-out.

## Files in this directory

```
uc1/
  README.md          this file
  tour.json          3-beat workshop-tour content (FR-009, STORY-013)
  manifests/
    00-namespace.yaml      artemis-uc1 namespace
    10-service.yaml        ClusterIP for mission-control
    20-deployment.yaml     1-replica Deployment with the broken :v999 tag
  agents/
    agent.yaml             artemis-mission-control-debugger (kagent.dev/v1alpha2 Agent; references default-model-config)
```

The manifest filenames are numbered so `kubectl apply -f uc1/manifests/` applies them in dependency order (namespace before namespaced resources).

## Reproduction (NFR-003 — 3/3 cold deploys)

The reproduction checklist below is the **manual** form of the NFR-003 reliability AC. Run it three times in a row from a deleted cluster; all three runs must reach the documented broken state. Tooling prereqs are validated by `make preflight` (`docker`, `kubectl`, `kind`, `helm`, `kagent`).

For each cold-deploy iteration:

1. **Reset the cluster.** From the repo root:
   ```bash
   make kind-down  # no-op if no cluster exists
   make kind-up    # creates the kagent-workshop kind cluster
   make kagent-install  # installs kagent v0.9.0 CRDs into the kagent namespace
   ```
2. **Apply UC1.**
   ```bash
   make uc1-up    # equivalent to: kubectl apply -f uc1/manifests/ && kubectl apply -f uc1/agents/
   ```
3. **Wait ~30 s** for the kubelet to attempt and fail the image pull.
4. **Verify the broken state.** Each of the three checks below must pass:
   ```bash
   # (a) Pod is Pending with ImagePullBackOff
   kubectl get pods -n artemis-uc1 -l app=mission-control \
     -o jsonpath='{.items[0].status.containerStatuses[0].state.waiting.reason}'
   # → ImagePullBackOff   (or ErrImagePull on the first 1-2 cycles, then ImagePullBackOff)

   # (b) Image reference is the unpublished tag
   kubectl get deploy mission-control -n artemis-uc1 \
     -o jsonpath='{.spec.template.spec.containers[0].image}'
   # → rg.fr-par.scw.cloud/apogasa/mission-control:v999

   # (c) Kubelet has logged at least one pull failure event
   kubectl get events -n artemis-uc1 --field-selector reason=Failed
   # → at least one "Failed to pull image … manifest unknown" event
   ```
5. **(Optional) Exercise the agent end-to-end** to confirm the diagnostic path is wired:
   ```bash
   kagent invoke \
     --agent artemis-mission-control-debugger \
     --namespace artemis-uc1 \
     --task 'The mission-control pod in the artemis-uc1 namespace is not coming up. Diagnose it.'
   # Expected: the agent names the v999 tag as the root cause within ~10–20 s.
   ```
   This step is gated on a real `artemis-llm-credentials` Secret being present in the `kagent` namespace (the agent uses `default-model-config`, which kagent's helm install pre-wires); on a bare local kind without one, the manifest checks (a–c) above are sufficient for NFR-003 sign-off.
6. **Tear down before the next iteration.**
   ```bash
   make uc1-down
   ```
   For a strict cold deploy (recommended for NFR-003), `make kind-down` between iterations.

**Sign-off:** record the run in the PR description per the M5 dry-run convention — three timestamps, three "OK" lines for checks (a)/(b)/(c), and a one-line note on whether step 5 was exercised. The cross-author sign-off (Clément ↔ Quentin) lands on the PR per NFR-003 AC #2 before the M5 dry-run.

## Author notes

The note below captures the spike outcome that was temporarily inlined in `tour.json`'s participant text and has since been relocated here per the convention's *No meta-references in prose* rule (`../docs/tour-content-conventions.md`). Participants never read this section; authors come here to find the *why* behind the Beat 3 invocation form.

### Beat 3 invocation — frozen form (STORY-031)

`kagent dashboard` is the frozen Beat 3 invocation form. The kagent v0.9.0 CLI ships a `dashboard` sub-command that foregrounds the `kubectl port-forward -n kagent svc/kagent-ui` and auto-opens the participant's browser at the resulting URL. The command stays alive in the terminal until `Ctrl+C` — that holds the port-forward open while the participant uses the chat surface, then releases it cleanly. This honours NFR-010 *self-contained step*: no separate `kubectl port-forward … &` + `open` chain to maintain, no environment-variable preconditions, no orphaned background processes.

## Cleanup

```bash
make uc1-down   # delete uc1 resources, keep cluster up
make kind-down  # nuke the kind cluster entirely
```

## References

- **PRD:** [`../docs/prd-kagent-workshop-scenarios-2026-04-27.md`](../docs/prd-kagent-workshop-scenarios-2026-04-27.md) — FR-008 (scenario package), FR-009 (tour), NFR-003 (reproduction).
- **Architecture:** [`../docs/architecture-kagent-workshop-scenarios-2026-04-28.md`](../docs/architecture-kagent-workshop-scenarios-2026-04-28.md).
- **Naming vocabulary:** [`../docs/artemis-naming.md`](../docs/artemis-naming.md) — UC1 row in the narrative arc, namespace + Deployment + Agent rows.
- **Tour content convention:** [`../docs/tour-content-conventions.md`](../docs/tour-content-conventions.md) — the 3-beat structure UC1's `tour.json` instantiates.
- **Sprint plan:** [`../docs/sprint-plan-kagent-workshop-scenarios-2026-04-28.md`](../docs/sprint-plan-kagent-workshop-scenarios-2026-04-28.md) §Sprint 2 — STORY-012 (manifests + agent CRDs), STORY-013 (`tour.json`), STORY-014 (this README + cross-author repro).
