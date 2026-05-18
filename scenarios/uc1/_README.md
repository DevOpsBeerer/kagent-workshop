# UC1 — ImagePullBackOff (use the built-in k8s-agent)

**Owner:** Clément Raussin
**Milestone:** M2 (Sprint 2) — pivoted to built-in `k8s-agent` in STORY-045
**Tour ID:** `kagent-uc1-imagepullbackoff`
**FR / NFR:** FR-008 (scenario package), FR-009 (tour), NFR-001/003/005/006

UC1 is the workshop's opening scenario: the simplest single-agent diagnosis path. The participant applies a deliberately broken `mission-control` Deployment, runs one `kubectl get pods` to see something's wrong, and hands the diagnosis to **kagent's built-in `k8s-agent`** (KubeAssist) through the kagent dashboard chat. The agent walks the same describe-pod / events tools the participant would have used by hand, names the root cause in one sentence, and (on a second prompt) hands back the exact `kubectl set image` command to roll the Deployment forward. UC1 establishes the "agent vs. CLI" comparison the rest of the workshop builds on, **without authoring anything** — the agent is already there, installed by `make kagent-install`.

## Artemis narrative

Mission control is bringing today's on-shift roster online for the Artemis pad shift, but the new replica isn't reaching the cluster — the deploy went out at the end of yesterday's pad shift and the on-call has woken up to a stuck pod. The participant plays the on-call: applies the deployment as a routine mission setup, sweeps the pods as a status check, discovers the friction by hand, then hands the diagnosis to **`k8s-agent`** in the kagent dashboard chat (the agent is the generic Kubernetes troubleshooter shipped with kagent's demo profile, already running in the `kagent` namespace). A two-prompt flow — diagnose first, then ask for the remediation command — closes the loop. See [`../docs/artemis-naming.md`](../docs/artemis-naming.md#narrative-arc-uc1--uc4) for the full arc, and [`../docs/tour-content-conventions.md`](../docs/tour-content-conventions.md) for the canonical 4-beat structure (mission setup → status check → call the agent → manual recap).

## The bug

A single Deployment under one namespace, deliberately broken at the image-tag level — no probes, no readiness gates, no networking gotchas. The failure is the simplest possible Kubernetes diagnostic: an image reference that the registry will never resolve.

| Resource    | Name                  | Where it lives        | Notes                                                                                       |
| ----------- | --------------------- | --------------------- | ------------------------------------------------------------------------------------------- |
| Namespace   | `artemis-uc1`         | cluster-scoped        | Labelled `kagent-workshop/uc=uc1`, `kagent-workshop/scenario=imagepullbackoff`.             |
| Deployment  | `mission-control`     | `artemis-uc1`         | `replicas: 1`, image `rg.fr-par.scw.cloud/apogasa/mission-control:v999` — **the broken bit**.   |
| Service     | `mission-control`     | `artemis-uc1`         | ClusterIP, port 8000 → container port `http`. Present so a working pod would be reachable.  |

The `mission-control` image is the FastAPI variant from `apps/mission-control/` (FR-007). Tag `:v1.0.0` exists and is reused (in `:v999`-broken form) by UC2's `artemis-uc2` namespace; `:v999` is intentionally not published in the registry. On apply, the kubelet attempts the pull, fails, backs off, and the Pod settles in `Waiting / ImagePullBackOff` (after one or two `ErrImagePull` cycles) within ~30 s. Three pieces of state name the failure:

1. The Pod's phase: `Pending`, container state `Waiting` with reason `ImagePullBackOff`.
2. The container's image reference: `rg.fr-par.scw.cloud/apogasa/mission-control:v999`.
3. Recent events: repeated `Failed to pull image … manifest unknown` from the kubelet.

In the tour, **Mission status check** is intentionally minimal — a single `kubectl get pods` that surfaces the friction (pod not Running). The full three-command diagnosis is what the participant *would* have walked manually without the agent; in the tour, the agent absorbs it.

## Expected agent behaviour

The diagnostic agent is **`k8s-agent`** — kagent's built-in generic Kubernetes troubleshooter, installed in the `kagent` namespace by `make kagent-install` (demo profile). The participant does NOT deploy any custom `Agent` CRD for UC1; that's what makes UC1 the simplest tour.

**Tool surface** (kagent's k8s-agent ships with both read and mutate tools from `kagent-tool-server`):

- Read: `k8s_get_resources`, `k8s_describe_resource`, `k8s_get_events`, `k8s_get_pod_logs`, `k8s_get_resource_yaml`, `k8s_check_service_connectivity`, `k8s_get_available_api_resources`, `k8s_get_cluster_configuration`.
- Mutate: `k8s_apply_manifest`, `k8s_patch_resource`, `k8s_create_resource`, `k8s_delete_resource`, `k8s_label_resource`, `k8s_annotate_resource`, plus the corresponding removes. UC1's tour only exercises the read tools — the *participant* runs the `kubectl set image` remediation themselves after the agent proposes it. (UC4 is where the agent runs mutations itself.)

**The two-prompt flow** UC1's tour walks:

1. **Diagnose.** `In the artemis-uc1 namespace, what is failing?` — the agent runs `k8s_get_resources` + `k8s_describe_resource` and reports something like: *"The `mission-control` pod in `artemis-uc1` is stuck in `ImagePullBackOff`. The kubelet cannot pull the container image `rg.fr-par.scw.cloud/apogasa/mission-control:v999` because that tag is not published in the registry."*
2. **Ask for the remediation command.** `Propose the kubectl command to roll the mission-control deployment forward to image tag v1.0.0.` — the agent returns `kubectl set image deployment/mission-control mission-control=rg.fr-par.scw.cloud/apogasa/mission-control:v1.0.0 -n artemis-uc1`. The participant runs that themselves in the next tour step.

The pedagogical point made in the tour's recap: same tools, same evidence, three commands collapsed into one synthesis — and the participant authored nothing. UC2 raises the stakes by having the participant **write their own Agent CRD**; UC3 introduces MCP and external observability; UC4 climaxes with multi-agent fan-out + a custom MCP.

## Files in this directory

```
uc1/
  README.md          this file
  tour.json          4-beat workshop-tour content (FR-009)
  manifests/
    00-namespace.yaml      artemis-uc1 namespace
    10-service.yaml        ClusterIP for mission-control
    20-deployment.yaml     1-replica Deployment with the broken :v999 tag
```

There is no `agents/` directory under UC1 — the agent UC1 talks to is `k8s-agent`, which lives in `kagent` ns and is owned by kagent's helm install. (UC2/UC3/UC4 all ship their own custom Agent CRDs because they teach the authoring side.)

The manifest filenames are numbered so `kubectl apply -f uc1/manifests/` applies them in dependency order (namespace before namespaced resources).

## Reproduction (NFR-003 — 3/3 cold deploys)

For each cold-deploy iteration:

1. **Reset the cluster.** From the repo root:
   ```bash
   make kind-down       # no-op if no cluster exists
   make kind-up         # creates the kagent-workshop kind cluster
   make kagent-install  # installs kagent v0.9.0 (demo profile) — brings up k8s-agent
   ```
2. **Apply UC1.**
   ```bash
   make uc1-up    # equivalent to: kubectl apply -f uc1/manifests/
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
5. **(Optional) Exercise the agent end-to-end** — gated on a real LLM credentials Secret in the `kagent` namespace (the `k8s-agent` uses `default-model-config`, which `make kagent-install` pre-wires); on a bare local kind without one, the checks (a)–(c) above are sufficient for NFR-003 sign-off.
   ```bash
   kagent invoke --agent k8s-agent --namespace kagent \
     --task 'In the artemis-uc1 namespace, what is failing?'
   # Expected: the agent names the v999 tag as the root cause within ~10–20 s.

   kagent invoke --agent k8s-agent --namespace kagent \
     --task 'Propose the kubectl command to roll the mission-control deployment forward to image tag v1.0.0.'
   # Expected: kubectl set image deployment/mission-control ...
   ```
6. **Tear down before the next iteration.**
   ```bash
   make uc1-down
   ```
   For a strict cold deploy (recommended for NFR-003), `make kind-down` between iterations.

## Author notes

### Beat 3 invocation — dashboard button

The workshop-tour VS Code extension exposes a **dashboard** button that opens the kagent web dashboard directly. UC1's Beat 3 step relies on that button rather than shipping a `commands[]` entry — the participant taps the button, the dashboard opens, they paste the two prompts into the chat for `k8s-agent` (which lives in `kagent` ns). An author testing locally without the extension can fall back to `kagent invoke ...` as shown in the reproduction §step 5 above, or to `kubectl port-forward -n kagent svc/kagent-ui` + the dashboard URL.

### Why no custom agent

The pre-STORY-045 design shipped `artemis-mission-control-debugger`, a read-only custom Agent CRD scoped to `artemis-uc1`. STORY-045 dropped it: kagent's built-in `k8s-agent` does the same job with a wider toolset, no authoring overhead, and a setup the participant doesn't have to read. The pedagogical loss is zero — UC2 covers agent authoring properly, with a non-Kubernetes domain (registry inspection) that makes the authoring concepts clearer.

## Cleanup

```bash
make uc1-down   # delete uc1 resources, keep cluster up
make kind-down  # nuke the kind cluster entirely
```

## References

- **PRD:** [`../docs/prd-kagent-workshop-scenarios-2026-04-27.md`](../docs/prd-kagent-workshop-scenarios-2026-04-27.md) — FR-008 (scenario package), FR-009 (tour), NFR-003 (reproduction).
- **Architecture:** [`../docs/architecture-kagent-workshop-scenarios-2026-04-28.md`](../docs/architecture-kagent-workshop-scenarios-2026-04-28.md).
- **Naming vocabulary:** [`../docs/artemis-naming.md`](../docs/artemis-naming.md) — UC1 row in the narrative arc.
- **Tour content convention:** [`../docs/tour-content-conventions.md`](../docs/tour-content-conventions.md) — the 4-beat structure UC1's `tour.json` instantiates.
