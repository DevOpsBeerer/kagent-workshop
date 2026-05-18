# UC2 — Image discovery (author your own agent)

**Owner:** Quentin Rodic
**Milestone:** M2 → reshaped in M-current per the UC1–UC4 pedagogical-arc redesign (Sprint-3 retro candidate; tracked separately).
**Tour ID:** `kagent-uc2-image-discovery`
**FR / NFR:** FR-010 (scenario package), FR-011 (tour), NFR-001/003/005/006

UC2 is the workshop's second beat. UC1 used kagent's built-in `k8s-agent` to diagnose a broken Deployment — the participant didn't author anything, just consumed an agent that was already there. UC2 hands them the authoring side: you **write your own Agent CRD**, give it a system prompt scoped to a single non-Kubernetes domain (container-registry inspection), wire it to a single MCP-served tool (`fetch_json`), and use it to answer a question that turns out to fix the same kind of `ImagePullBackOff` UC1 introduced — but this time the agent's value isn't "diagnose Kubernetes", it's "answer a question the participant doesn't have a CLI for".

The pedagogical pivot from UC1 → UC2 is therefore **what you build**, not what you debug. The broken state is the same family as UC1's; the lesson is the authoring loop.

## Artemis narrative

A new `mission-control` replica was scheduled in `artemis-uc2`, but the deployment manifest points at an image tag (`:v999`) that nobody confirmed is published in the registry. The participant plays the on-call: rather than guess at a real tag and `kubectl patch` until something sticks, they author a small custom agent — **`artemis-image-fetcher`** — that asks the registry directly which tags exist. The agent surfaces the tag list, the participant picks a real tag, patches the Deployment, the pod comes up. See [`../docs/artemis-naming.md`](../docs/artemis-naming.md#narrative-arc-uc1--uc4) for the full arc, and [`../docs/tour-content-conventions.md`](../docs/tour-content-conventions.md) for the 4-beat structure (mission setup → status check → call the agent → manual recap).

## The bug

A single Deployment under one namespace, deliberately broken at the image-tag level — same failure family as UC1, deliberately. The participant has already seen `ImagePullBackOff` once (in UC1) and is expected to recognise it; the lesson this time is *what you do with that information* when you don't have a UI for the registry.

| Resource    | Name              | Where it lives | Notes                                                                                                       |
| ----------- | ----------------- | -------------- | ----------------------------------------------------------------------------------------------------------- |
| Namespace   | `artemis-uc2`     | cluster-scoped | Labelled `kagent-workshop/uc=uc2`, `kagent-workshop/scenario=image-discovery`.                              |
| Service     | `mission-control` | `artemis-uc2`  | ClusterIP, port 8000 → container port `http`.                                                                |
| Deployment  | `mission-control` | `artemis-uc2`  | `replicas: 1`, image `rg.fr-par.scw.cloud/apogasa/mission-control:v999` — **the broken bit**. Tag does not exist; the kubelet's pull retries fail, Pod settles in `ImagePullBackOff` within ~30 s. |
| MCPServer   | `fetcher`         | `kagent`       | kagent-managed `MCPServer` (`kagent.dev/v1alpha1`) that wraps `@tokenizin/mcp-npx-fetch` via npx. Exposes `fetch_html`, `fetch_markdown`, `fetch_txt`, `fetch_json` on stdio (port 3000 via kagent's sidecar gateway). |

Tag `:v1.0.0` exists in the registry and is the only currently-published tag — the agent surfaces this; the participant patches the Deployment to it.

## Expected agent behaviour

The agent is **`artemis-image-fetcher`** ([`agents/agent.yaml`](agents/agent.yaml)), a kagent v0.9.0 `Agent` of type `Declarative`. It lives in the `kagent` namespace, references kagent's installed `default-model-config` ModelConfig (the canonical credentials slot across every Artemis agent — backed by the `kagent-openai` Secret in `kagent`), and sources its single tool from the `fetcher` `MCPServer` defined under [`manifests/30-mcpserver.yaml`](manifests/30-mcpserver.yaml).

**Tool surface — one tool, one MCP:**

- `fetch_json` from the `fetcher` `MCPServer` (kagent.dev/v1alpha1, namespace `kagent`).

**System prompt — general, not UC2-specific.** The prompt is the canonical "Container Registry Image Inspector" template — it covers Scaleway, Docker Hub, GHCR, Quay, ECR, GAR, ACR, and any generic OCI registry. It does not name `artemis-uc2`, does not assume a `:v999` tag, does not pre-suppose the verdict. That generality matters: the same agent can be reused for any image-registry question the participant raises later, and there's no per-tour bias steering it toward a known answer.

**Expected response shape** (deterministic to within phrasing):

> Published tags for `rg.fr-par.scw.cloud/apogasa/mission-control`: `["v1.0.0"]`. The `:v999` tag your Deployment references is not in the list. Patch the Deployment to `:v1.0.0` to fix the `ImagePullBackOff`.

The agent reaches this via two `fetch_json` calls: (1) mint a Scaleway registry token from `https://api.scaleway.com/registry-internal/v1/regions/fr-par/tokens?service=registry&scope=repository:apogasa/mission-control:pull` with `Authorization: Basic bm9sb2dpbjo=` (Basic auth, `nologin:` with empty password); (2) call `https://rg.fr-par.scw.cloud/v2/apogasa/mission-control/tags/list` with `Authorization: Bearer <token>`. The Scaleway public namespace `apogasa` permits this anonymous-Bearer flow.

## Files in this directory

```
uc2/
  README.md          this file
  tour.json          4-beat workshop-tour content
  manifests/
    00-namespace.yaml      artemis-uc2 namespace
    10-service.yaml        ClusterIP for mission-control
    20-deployment.yaml     1-replica Deployment with the broken :v999 tag
    30-mcpserver.yaml      fetcher MCPServer (kagent-managed, npx @tokenizin/mcp-npx-fetch)
  agents/
    agent.yaml             artemis-image-fetcher (Agent, fetch_json tool)
```

The manifest filenames are numbered so `kubectl apply -f uc2/manifests/` applies them in dependency order. Note that `30-mcpserver.yaml` lives in `kagent` namespace (not `artemis-uc2`) — kagent CRDs are cluster-scope-discoverable per `docs/artemis-naming.md`.

## Reproduction (NFR-003 — 3/3 cold deploys)

For each cold-deploy iteration:

1. **Reset the cluster.** From the repo root:
   ```bash
   make kind-down
   make kind-up
   make kagent-install
   ```

2. **Apply UC2.**
   ```bash
   make uc2-up   # equivalent to: kubectl apply -f uc2/manifests/ && kubectl apply -f uc2/agents/
   ```

3. **Wait ~30 s** for the kubelet to attempt + fail the image pull, and ~20 s for the fetcher MCPServer pod to come up + register tools.

4. **Verify the broken state + the agent path.** Each of the four checks below must pass:
   ```bash
   # (a) Pod is Pending with ImagePullBackOff
   kubectl get pods -n artemis-uc2 -l app=mission-control \
     -o jsonpath='{.items[0].status.containerStatuses[0].state.waiting.reason}'
   # → ImagePullBackOff   (or ErrImagePull on the first 1-2 cycles)

   # (b) Image reference is the unpublished tag
   kubectl get deploy mission-control -n artemis-uc2 \
     -o jsonpath='{.spec.template.spec.containers[0].image}'
   # → rg.fr-par.scw.cloud/apogasa/mission-control:v999

   # (c) Fetcher MCPServer is Ready and discoveredTools include fetch_json
   kubectl get mcpserver -n kagent fetcher \
     -o jsonpath='{range .status.conditions[*]}{.type}={.status}{","}{end}'
   # → Accepted=True,ResolvedRefs=True,Programmed=True,Ready=True,

   # (d) Agent reaches Accepted=True and Ready=True
   kubectl get agent -n kagent artemis-image-fetcher \
     -o jsonpath='{range .status.conditions[*]}{.type}={.status}{","}{end}'
   # → Accepted=True,Ready=True,
   ```

5. **(Optional) Exercise the agent end-to-end** — gated on a real `kagent-openai` Secret in `kagent` ns and network egress to `api.scaleway.com` + `rg.fr-par.scw.cloud`:
   ```bash
   kagent invoke \
     --agent artemis-image-fetcher --namespace kagent \
     --task 'List the published tags for rg.fr-par.scw.cloud/apogasa/mission-control. The Deployment in artemis-uc2 currently references :v999 which is failing ImagePullBackOff; recommend a tag to use instead.'
   # Expected: the agent makes two fetch_json calls and reports the v1.0.0 tag.
   ```
   On a bare local kind without credentials, checks (a)–(d) above are sufficient for NFR-003 sign-off.

6. **Tear down before the next iteration.**
   ```bash
   make uc2-down
   ```
   For a strict cold deploy (recommended for NFR-003), `make kind-down` between iterations.

## Author notes

The notes below capture engineering rationale and spike outcomes that participants don't read.

### Why an `MCPServer`, not a `RemoteMCPServer`

kagent v0.9.0 has two MCP CRDs: `MCPServer` (kagent-managed — kagent deploys the MCP container itself, e.g. an npx package) and `RemoteMCPServer` (just a pointer to an MCP endpoint kagent doesn't own). UC2 uses `MCPServer` because it lets the workshop ship one self-contained YAML — no separate Deployment + Service for the npx process. kagent's sidecar gateway wraps the stdio MCP as streamable HTTP on port 3000 automatically.

This is also the participant's first encounter with the `MCPServer` resource. The tour deliberately doesn't explain MCP at Beat 1 (the explanation is one sentence: "this MCP is plumbing for your agent's HTTP needs — UC3 covers MCP properly"). UC3 then closes the loop by configuring an externally-hosted Grafana MCP and using it via A2A delegation.

### Why a general prompt, not a UC2-scoped one

Earlier iterations of UC2 (and UC3) used UC-specific system prompts ("diagnose the v999 tag in `artemis-uc2`", "find the OOM in `artemis-uc3`"). Those produce biased agents — they go straight to the expected answer, and they're useless for any follow-up question outside the tour's narrow scope.

The current prompt is the canonical "Container Registry Image Inspector" template: covers Scaleway, Docker Hub, GHCR, Quay, ECR, GAR, ACR, and any generic OCI registry; explains the OCI Distribution API; lists the auth approach per registry hostname. Same agent answers UC2's tag question, but also answers "what's the manifest digest of `nginx:1.27`?" or "which tags exist for `ghcr.io/<org>/<repo>`?" with no code change.

### Reference-shell text inside the system prompt

The prompt embeds reference shell commands (`curl -s -u 'nologin:' …`) even though the agent has no shell tool — only `fetch_json`. The shell snippets are documentation of the API contract, not invocations the agent should attempt; the LLM is expected to translate them into `fetch_json` calls with the equivalent `Authorization` header. This phrasing comes verbatim from the canonical inspector prompt and is preserved deliberately for cross-environment portability (the same prompt works in an agent that *does* have a shell tool too).

## Cleanup

```bash
make uc2-down   # delete uc2 resources, keep cluster up
make kind-down  # nuke the kind cluster entirely
```

The `fetcher` MCPServer in `kagent` ns is part of `uc2/manifests/` and deletes with `make uc2-down`. If UC4 or another scenario later wants to reuse it, promote it to `infra/` and reference from both UCs (same shape as `infra/observability/kagent-bridge-services.yaml`).

## References

- **PRD:** [`../docs/prd-kagent-workshop-scenarios-2026-04-27.md`](../docs/prd-kagent-workshop-scenarios-2026-04-27.md) — FR-010 (scenario package), FR-011 (tour).
- **Architecture:** [`../docs/architecture-kagent-workshop-scenarios-2026-04-28.md`](../docs/architecture-kagent-workshop-scenarios-2026-04-28.md).
- **Naming vocabulary:** [`../docs/artemis-naming.md`](../docs/artemis-naming.md) — UC2 row in the narrative arc.
- **Tour content convention:** [`../docs/tour-content-conventions.md`](../docs/tour-content-conventions.md) — the 4-beat structure UC2's `tour.json` instantiates.
