# UC3 — Cross-wire k8s-agent and image-fetcher to auto-remediate

**Owner:** Quentin Rodic
**Tour ID:** `kagent-uc3-auto-remediation`
**Pedagogical hook:** A2A (agent-to-agent) delegation as a no-code way to specialise a generic agent.

UC3 is the workshop's third beat. UC1 used kagent's built-in `k8s-agent` to **diagnose** an `ImagePullBackOff`. UC2 had the participant **author** their own agent (`artemis-image-fetcher`) — a registry inspector — but the participant still applied the actual `kubectl set image` fix by hand. UC3 closes the loop: the participant adds an A2A edge from `k8s-agent` → `artemis-image-fetcher` in the kagent dashboard, then asks `k8s-agent` to fix the deployment. The agent describes the broken pod, delegates to the image-fetcher for a published tag, patches the Deployment itself. Zero `kubectl patch`, zero new code.

## Artemis narrative

Another `mission-control` replica went out yesterday with a tag that doesn't exist. Rather than wake up the on-call to type the patch, you teach kagent's general-purpose `k8s-agent` to call the registry-inspector specialist you authored in UC2. Same scenario family as UC1 / UC2 (`ImagePullBackOff` on `mission-control`), different namespace (`artemis-uc3`), different remediation surface (the agent does the patch).

## The bug

Single Deployment, deliberately broken at the image-tag level — `rg.fr-par.scw.cloud/apogasa/mission-control:v999` is not published.

| Resource    | Name              | Where it lives | Notes                                                                                  |
| ----------- | ----------------- | -------------- | -------------------------------------------------------------------------------------- |
| Namespace   | `artemis-uc3`     | cluster-scoped | Labelled `kagent-workshop/uc=uc3`, `kagent-workshop/scenario=auto-remediation`.        |
| Service     | `mission-control` | `artemis-uc3`  | ClusterIP, port 8000 → container port `http`.                                          |
| Deployment  | `mission-control` | `artemis-uc3`  | `replicas: 1`, image `:v999` (unpublished). Kubelet retries the pull, settles in `ImagePullBackOff` within ~30 s. |

UC3 ships **no** Agent CRD of its own. The two agents the tour cross-wires already exist:

- **`k8s-agent`** — kagent built-in (demo profile, `kagent` namespace). Read + mutate tools across the K8s API. Wired by `make kagent-install`.
- **`artemis-image-fetcher`** — UC2's custom agent (`kagent` namespace). `fetch_json` over the `fetcher` MCPServer; canonical "Container Registry Image Inspector" prompt. Wired by UC2's tour.

## Expected end state of the tour

After Beat 4 (asking the wired-up `k8s-agent` to fix the deployment):

1. `k8s-agent` reads the broken Pod via `k8s_describe_resource`, identifies the unpublished tag.
2. `k8s-agent` delegates a sub-task to `artemis-image-fetcher` over A2A ("which tags are published for `rg.fr-par.scw.cloud/apogasa/mission-control`?") — receives back the registry's tag list (typically `[v1.0.0]`).
3. `k8s-agent` calls `k8s_patch_resource` (or `k8s_apply_manifest`) to update the Deployment's image to the recovered tag.
4. New ReplicaSet rolls out, new Pod reaches `1/1 Running` on the now-resolvable image.

Beat 5 verifies with `kubectl get pods -n artemis-uc3 -l app=mission-control` and contrasts with the manual three-surface workflow (kubectl read → registry HTTP → kubectl write).

## Why the A2A wiring is done in the UI

UC3 ships **no patch YAML** and **no `kubectl edit` step**. The participant wires the A2A edge in the kagent dashboard's agent editor:

1. **Agents → `k8s-agent` → Edit → Tools → Add → Agent: `artemis-image-fetcher` → Save.**

Two reasons:

- **Pedagogical clarity.** The dashboard renders the `tools[]` list as a graphical picker; the participant sees exactly what an A2A edge looks like in kagent's mental model before they need to author one in YAML. UC4 closes the loop with full A2A in YAML (the `artemis-mission-coordinator`).
- **No helm-upgrade hazard.** `k8s-agent` is helm-managed (`kagent` chart). Patching it in YAML risks being overwritten by a future helm upgrade. The dashboard write is identical to `kubectl edit` under the hood, but the workshop's mental model is "you wired a tool", not "you patched a helm-managed resource".

Verification command (Beat 3): `kubectl get agent k8s-agent -n kagent -o jsonpath='{range .spec.declarative.tools[?(@.type=="Agent")]}{.agent.name}{"\n"}{end}'` should list `artemis-image-fetcher`.

## Files in this directory

```
uc3/
  README.md             this file
  tour.json             5-beat workshop-tour content (setup → status → wire A2A → fix → verify+recap)
  manifests/
    00-namespace.yaml   artemis-uc3 namespace
    10-service.yaml     ClusterIP for mission-control
    20-deployment.yaml  1-replica Deployment with the broken :v999 tag
```

No `agents/` directory — the agents UC3 talks to are owned by other UCs (built-in `k8s-agent` from `make kagent-install`; `artemis-image-fetcher` from `kubectl apply -f uc2/agents/`).

## Reproduction

For each cold-deploy iteration:

1. **Reset the cluster + install kagent.**
   ```bash
   make kind-down && make kind-up && make kagent-install
   ```
2. **Bring up UC2's image-fetcher** (it stays running across UC3):
   ```bash
   kubectl apply -f uc2/manifests/  # incl. the fetcher MCPServer
   kubectl apply -f uc2/agents/     # artemis-image-fetcher
   ```
3. **Bring up UC3's broken Deployment.**
   ```bash
   make uc3-up   # equivalent to: kubectl apply -f uc3/manifests/
   ```
4. **Wait ~30 s** for the kubelet to attempt + fail the pull.
5. **Verify the broken state.**
   ```bash
   kubectl get pods -n artemis-uc3 -l app=mission-control \
     -o jsonpath='{.items[0].status.containerStatuses[0].state.waiting.reason}'
   # → ImagePullBackOff
   ```
6. **(Optional) Exercise the agent path** — gated on a real LLM credentials Secret in `kagent` ns. In the dashboard, edit `k8s-agent`, add `artemis-image-fetcher` under Tools (type Agent), save. Open chat for `k8s-agent` and paste the UC3 Beat 4 prompt. Expected: pod transitions to `1/1 Running` within ~30 s.
7. **Tear down before the next iteration.**
   ```bash
   make uc3-down
   ```
   The A2A edge persists on `k8s-agent` until kagent is re-installed. Remove it via the dashboard (Tools → minus icon) if you want a strict reset between iterations.

UC3 no longer depends on `infra/observability/` — the Prom + Graf bundle is now UC4-only (the rover-telemetry slot's specialist agent delegates to kagent's `observability-agent` for Grafana panels).

## Cleanup

```bash
make uc3-down   # delete uc3/manifests
make kind-down  # nuke the cluster entirely
```

## References

- **UC2 README** — the `artemis-image-fetcher` agent UC3 cross-wires to.
- **UC4 README** — the multi-specialist coordinator that uses the same A2A pattern at scale.
- **`docs/tour-content-conventions.md`** — UC3 follows the canonical 4-beat extended to 5 to cover the explicit fix + verify (same shape UC4 uses).
