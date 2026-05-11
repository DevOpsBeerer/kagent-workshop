# STORY-025: UC4 coordinator a2a Agent CRD (artemis-mission-coordinator)

**Epic:** EPIC-004 (UC4 — Multi-agent coordinator + custom MCP)
**FRs:** FR-014 (UC4 multi-symptom + coordinator package), FR-017 (bulb-colour-as-diagnosis)
**NFRs:** NFR-005 (no unpinned versions / vanilla K8s), NFR-008 (PR cross-reviewed), NFR-012 (MCP tenancy guard reachable via the coordinator)
**Priority:** Must Have
**Story Points:** 5
**Status:** Completed (2026-05-11)
**Assigned To:** Quentin Rodic (re-attributed from "joint" — Clément still OOO at M3→M4 boundary; sixth swap of the OOO window.)
**Created:** 2026-05-11
**Sprint:** 4 (M4, 2026-05-13 → 2026-05-17) — implemented on the formal day-1 of Sprint 3 (2026-05-11), early-credit on Sprint 4 alongside STORY-024.

---

## Ownership swap (joint → Quentin, sixth swap of the OOO window)

Sprint plan owner is "joint" — both Clément and Quentin. With Clément still OOO (the same window that drove the four M3 EPIC-003 swaps plus STORY-022/023 on Quentin's original slate plus STORY-024 as the fifth swap), STORY-025 lands on Quentin. The work has one narrative-judgement slice (system-prompt phrasing of the slot ↔ UC and verdict ↔ colour mapping) but the architecture's FR-017 table (`docs/architecture-…md` + `docs/artemis-naming.md` L80–92) already locks the mapping in author-facing prose, so the narrative-judgement surface is bounded.

**Cross-author repro deferral.** Per the recursive deferral chain documented under STORY-021's *Ownership swap* + STORY-024's *Ownership swap*, NFR-008 cross-review for STORY-025 lands on Clément at M5 dry-run STORY-028 — same plate the prior 11 swap-chain stories already accumulated.

---

## User Story

As a **workshop participant** in UC4 (the workshop's climax),
I want **a single agent invocation against `artemis-mission-coordinator` to fan out to the UC1, UC2, and UC3 specialist debuggers in parallel and write three colour-coded verdicts back to my status bulbs through the tenancy-pinned MCP**, so that **the multi-agent (a2a) coordination shape is demonstrated end-to-end: one ask in → three independent diagnoses out → three bulbs flip simultaneously to red (or green, or amber if inconclusive) — proving that kagent's a2a delegation and the custom MCP integration both work as designed.**

---

## Description

### Background

UC4 is the workshop's third-axis demonstration: not a new bug class, but a new *interaction shape* — one coordinator agent fans out across three independent debuggers in a single round-trip, then writes colour-coded verdicts to the participant's bulbs via the bulb MCP. The coordinator is the smallest unit of work in UC4 that exercises both novel pieces (a2a + custom MCP) end-to-end.

STORY-024 shipped the cluster mess (3 broken Deployments in `artemis-uc4`). STORY-025 ships the agent that *operates on* that mess: a single `Agent` CRD that references the three UC specialist agents by name (`tools[].type: Agent`) and the bulb MCP `RemoteMCPServer` by reference (`tools[].type: McpServer`), with a system prompt that encodes the slot ↔ UC mapping (1 ↔ UC1, 2 ↔ UC2, 3 ↔ UC3), the verdict ↔ colour mapping (green / red / amber per `docs/artemis-naming.md` L80–92), and the tenancy-guard contract (`user="${WORKSHOP_PARTICIPANT_LOGIN}"` on every MCP call, per NFR-012).

Architecture §C6 + `docs/architecture-…md` L142–146 + `docs/artemis-naming.md` L57–66 nail the design:

> UC4 references the three sub-Agents by their canonical names (no per-UC4 rename). `artemis-mission-coordinator` Agent CRD lives in `kagent` namespace (cluster-scope-discoverable, `artemis-` prefix per the naming convention), declares a2a delegation to `artemis-mission-control-debugger` + `artemis-launch-pad-debugger` + `artemis-rover-telemetry-debugger`, and references `artemis-bulb-mcp` RemoteMCPServer for the bulb-write tool.

### Scope

**In scope:**
- `uc4/agents/agent.yaml` — `Agent artemis-mission-coordinator` in `kagent` ns. Declarative type. References:
  - the three UC sub-Agents via `tools[].type: Agent` (a2a — same shape as UC3's promql-agent + observability-agent delegation, per STORY-019 §Spike findings).
  - the bulb MCP `RemoteMCPServer artemis-bulb-mcp` (STORY-023) via `tools[].type: McpServer` for `list_bulbs` + `update_bulb`.
  - the kagent K8s read tool surface (`kagent-tool-server`) directly, for the coordinator's own use (the system prompt can ask sub-agents for diagnoses without needing to look at pods itself, but having `k8s_get_pod` available lets it sanity-check the namespace exists before fan-out).
- `uc4/agents/modelconfig.yaml` — per-UC `artemis-llm` slot in `artemis-uc4` ns, matching UC1/UC2/UC3's pattern (kept for naming-convention consistency + future per-UC override capability; the coordinator Agent itself references the kagent-installed `default-model-config` per the same precedent UC1+UC3 set).
- **Inline patch of `uc2/agents/agent.yaml`** (UC2 drift fix — *prerequisite* for a2a delegation, not a UC2 refactor):
  - `metadata.namespace`: `artemis-uc2` → `kagent` (matches UC1+UC3; required for `tools[].agent.name` cross-resolution from the coordinator in `kagent` ns).
  - `tools[].mcpServer.name`: `kagent-tools-k8s` → `kagent-tool-server` + add `apiGroup: kagent.dev` + `kind: RemoteMCPServer` (matches UC1+UC3; the previous name was incorrect and would have failed at runtime — latent bug that didn't surface because UC2 was never end-to-end validated, per the same chain of findings STORY-024 surfaced).
- **Bridge-Services promotion** (deferred from STORY-019 / STORY-024):
  - Move `uc3/agents/kagent-bridge-services.yaml` → `infra/observability/kagent-bridge-services.yaml`. The bridge is observability-bundle property, not UC3-specific (UC4 inherits the same need).
  - Update `Makefile` `observability-up` target to `kubectl apply -f infra/observability/kagent-bridge-services.yaml` after the kustomize apply. The bridge lives in `kagent` ns; the kustomization's root `namespace: artemis-observability` would override that, so it stays out of `kustomization.yaml` and is applied as a separate kubectl call.
  - The bridge file's preamble updated to reflect its new shared location.
- Self-author validation against the live `kagent-workshop` kind cluster: `make lint-agents` clean (server-side dry-run accepted by kagent v0.9.0's `Agent` CRD schema for the new coordinator + the patched UC2 agent); coordinator CRD reaches `ACCEPTED=True` after apply.

**Out of scope:**
- `uc4/tour.json` — STORY-026 (Beat 1 apply → Beat 2 sanity-check → Beat 3 coordinator invocation → Beat 4 bulb-state recap).
- `uc4/README.md` — STORY-027.
- `uc4/manifests/` — STORY-024 (already completed).
- `apps/` — explicitly forbidden by FR-014 AC. UC4 reuses existing FastAPI variants.
- End-to-end agent reasoning loop validation (single coordinator ask → fan-out → describe-pod per sub-agent → bulb writes → 3 bulbs flip). Requires live OpenAI credentials AND the light-manager backend deployed; both deferred to STORY-027's repro pass / STORY-028 (M5 dry-run) per the same chain that STORY-019/021/024 deferred.
- `light-manager` deployment / configuration — workshop-infrastructure responsibility (per architecture §C5 + brief). The MCP's HTTP client targets `LIGHT_MANAGER_URL` from env; the actual light-manager URL isn't pinned in repo.
- Any change to UC1's, UC3's, or UC2's bulb-related anything (UC2's bulb behaviour is `none` — UC2 is single-agent K8s diagnosis, not bulb-aware).
- Any change to UC1/UC3 manifests, tours, READMEs, or modelconfigs.

### User flow (workshop participant)

Pre-tour: workshop-infrastructure has already deployed the cluster state — `make uc4-up` ran at provisioning time, installing kagent + observability bundle (Prom + Graf + bridge Services in `kagent` ns) + `uc4/manifests/` (3 broken Deployments in `artemis-uc4`) + `uc4/agents/` (coordinator + modelconfig) + `mcp/manifests/` (bulb MCP RemoteMCPServer).

1. Participant opens UC4 in the workshop-tour extension. STORY-026's tour walks them through Beats 1–4.
2. **Beat 3** (the climax): the tour copy says (paraphrasing — STORY-026 writes the actual prose): *"Ask `artemis-mission-coordinator` what's wrong with the Artemis fleet today."* Participant runs the single agent invocation in the kagent dashboard.
3. The coordinator:
   - calls `list_bulbs(user="…")` to read the baseline bulb state (sanity check tenancy passes + the three slots are reachable).
   - delegates in parallel to `artemis-mission-control-debugger`, `artemis-launch-pad-debugger`, `artemis-rover-telemetry-debugger` — each diagnoses its own namespace's broken Deployment and returns a one-sentence verdict.
   - maps each verdict to a colour (red = symptom present, green = absent, amber = inconclusive) and writes via `update_bulb(user, slot, r, g, b)` for slots 1, 2, 3.
   - replies with a structured summary: which UC has which symptom, which bulb is which colour, and one-line remediation hints per UC.
4. **Beat 4**: participant looks at the physical bulb panel (or the light-manager web UI) — three bulbs are red, simultaneously.

STORY-025's job is the **wiring** that makes step 3 possible: the coordinator Agent CRD's structure + system prompt + tool references. Steps 1, 2, 4 are STORY-026's prose responsibility.

---

## Acceptance Criteria

(Mirrors sprint plan AC + the `artemis-naming.md` L57–66 (Agent CRD vocabulary) + L80–92 (FR-017 bulb mapping) constraints.)

- [ ] **`uc4/agents/agent.yaml`** creates `Agent artemis-mission-coordinator` in `kagent` namespace (per `docs/artemis-naming.md` L60: cluster-scope-discoverable kagent CRDs use the `artemis-` prefix and live in `kagent`). `apiVersion: kagent.dev/v1alpha2`, `spec.type: Declarative`. Labels include `kagent-workshop/uc: uc4`.
- [ ] **Coordinator references the three UC sub-Agents** via `spec.declarative.tools[].type: Agent`:
  - `artemis-mission-control-debugger` (UC1, lives in `kagent` ns) ✓
  - `artemis-launch-pad-debugger` (UC2, lives in `kagent` ns *after* this story's inline patch) ✓
  - `artemis-rover-telemetry-debugger` (UC3, lives in `kagent` ns) ✓
  - Reference shape: `{ type: Agent, agent: { name: <agent-name> } }` — same shape UC3's agent uses for `promql-agent` + `observability-agent`, per STORY-019 §Spike findings.
- [ ] **Coordinator references `artemis-bulb-mcp` RemoteMCPServer** for both bulb tools:
  - `tools[].type: McpServer`, `mcpServer.apiGroup: kagent.dev`, `kind: RemoteMCPServer`, `name: artemis-bulb-mcp`, `namespace: kagent`, `toolNames: [list_bulbs, update_bulb]`.
- [ ] **Coordinator references `kagent-tool-server` RemoteMCPServer** for its own K8s read budget (used for the optional pre-fan-out sanity check on `artemis-uc4`'s pods). Limited tool surface: `k8s_get_pod`, `k8s_get_resources`. (Lower than UC3's surface — the coordinator's own job is not deep K8s diagnosis; it delegates that.)
- [ ] **System prompt encodes the FR-017 contract** (per `docs/artemis-naming.md` L80–92):
  - Slot 1 ↔ UC1 verdict (mission-control image pull).
  - Slot 2 ↔ UC2 verdict (mission-control scheduling).
  - Slot 3 ↔ UC3 verdict (lunar-rover-telemetry OOM).
  - Verdict → colour: symptom present → red `(255, 0, 0)`; symptom absent → green `(0, 255, 0)`; inconclusive / partial finding → amber `(255, 191, 0)`.
- [ ] **System prompt encodes the NFR-012 tenancy contract**: every `list_bulbs` and `update_bulb` call passes `user="${WORKSHOP_PARTICIPANT_LOGIN}"` (the literal placeholder — kagent runtime substitutes the env at invocation time, per the MCP's own tenancy guard in `mcp/src/core/tenancy.py`).
- [ ] **System prompt encodes the delegation discipline**: coordinator delegates to sub-Agents *in parallel where the agent runtime supports it*, *one round-trip per sub-Agent*, and treats each sub-Agent's reply as authoritative for its own UC (no second-guessing diagnoses).
- [ ] **`uc4/agents/modelconfig.yaml`** creates `ModelConfig artemis-llm` in `artemis-uc4` namespace, matching UC1/UC2/UC3's shape (`provider: OpenAI`, `model: gpt-4o-mini`, `apiKeySecret: artemis-llm-credentials`, `apiKeySecretKey: api-key`). Kept as a per-UC slot for naming-convention consistency + future override capability; the coordinator Agent itself references `default-model-config` in `kagent` ns (same precedent UC1+UC3 set).
- [ ] **UC2 drift patched inline** (prerequisite for a2a delegation): `uc2/agents/agent.yaml` updated with `metadata.namespace: kagent` and `tools[].mcpServer` rewritten to the UC1/UC3 shape (`apiGroup: kagent.dev`, `kind: RemoteMCPServer`, `name: kagent-tool-server`).
- [ ] **Bridge-Services promotion**: `uc3/agents/kagent-bridge-services.yaml` moved to `infra/observability/kagent-bridge-services.yaml`. Preamble updated to reflect shared ownership. `Makefile` `observability-up` target applies it after the kustomize apply (separate `kubectl apply -f` because the bridge needs `namespace: kagent`, which the kustomization's root namespace override would mangle).
- [ ] **`make lint-agents` clean** over `uc*/agents/` (proxy: `kubectl apply --dry-run=server` accepts every `Agent`/`ModelConfig`/`RemoteMCPServer` CRD; the actual `make lint-agents` target is M1 STORY-003 skipped, so server-side dry-run substitutes per the STORY-018/023 precedent).
- [ ] **`make lint-manifests` clean** across `uc*/manifests/` + `infra/observability/` (including the promoted bridge file) + `mcp/manifests/`.
- [ ] **Cluster-side smoke validation** against the live `kagent-workshop` kind cluster:
  - [ ] Apply `uc4/agents/` (after STORY-024's `uc4/manifests/` already applied + observability + MCP up).
  - [ ] `kubectl get agent -n kagent artemis-mission-coordinator` reaches `ACCEPTED=True` within 60 s.
  - [ ] `kubectl get agent -n kagent artemis-launch-pad-debugger` (post-UC2-patch) also reaches `ACCEPTED=True` (confirms the namespace move + MCP reference fix worked).
  - [ ] `kubectl describe agent -n kagent artemis-mission-coordinator` shows `discoveredTools` including `list_bulbs`, `update_bulb` (from `artemis-bulb-mcp`) and `k8s_get_pod`, `k8s_get_resources` (from `kagent-tool-server`).
  - [ ] Bridge file applied via `kubectl apply -f infra/observability/kagent-bridge-services.yaml`; `kubectl get svc -n kagent prometheus grafana` returns both ExternalName Services (same shape STORY-019 + STORY-021 validated).

- [ ] **NFR-008 cross-author repro AC.** Clément's NFR-008 sign-off on the system-prompt narrative (slot ↔ UC ↔ colour prose) deferred to STORY-028 (M5 dry-run) per the recursive deferral chain. Pure-text follow-up; the manifest shape is locked by FR-017.
- [ ] **End-to-end agent reasoning loop NOT validated in STORY-025.** Requires (a) live OpenAI credentials, (b) the light-manager backend reachable from the cluster, (c) the three UC clusters in their broken states simultaneously. Deferred to STORY-027's cross-author repro pass / STORY-028 (M5 dry-run). Same precedent as STORY-019/020/021.

---

## Technical Notes

### Why the coordinator lives in `kagent` ns and not `artemis-uc4`

Two reasons.

1. **kagent v0.9.0 a2a wiring shape requires same-namespace.** The `tools[].type: Agent` reference shape is `{ name: <agent-name> }` (no `namespace` field). The runtime resolves the sub-Agent in the *same namespace as the caller*. UC3 confirmed this against `promql-agent` + `observability-agent`, both in `kagent` ns (STORY-019 §Spike findings).
2. **Convention consistency.** `docs/artemis-naming.md` L60 says cluster-scope-discoverable kagent CRDs use the `artemis-` prefix and live in `kagent`. UC1 + UC3 follow this. UC4's coordinator follows it. UC2's pre-patch drift was the outlier — fixed inline by this story (see below).

### Why UC2's drift had to be patched inline (and why it's not scope creep)

UC2's pre-patch state: `metadata.namespace: artemis-uc2` and `tools[].mcpServer.name: kagent-tools-k8s`. The first violates the convention; the second references an MCP server that doesn't exist (the actual name is `kagent-tool-server`, confirmed by UC1 and UC3). UC2's agent has never been end-to-end validated against a kagent v0.9.0 cluster (latent bug — same chain that STORY-024 surfaced for UC2's manifests).

Both pre-patch issues block STORY-025:
- The wrong `mcpServer.name` means UC2's agent would fail to load tools, so even a direct invocation (not via the coordinator) wouldn't work — the coordinator's delegation would hit an `Agent NOT ACCEPTED` upstream.
- The wrong `metadata.namespace` means the coordinator's `tools[].agent.name: artemis-launch-pad-debugger` reference can't resolve (cross-namespace lookup not supported).

The patch is 1 file, 2 stanzas: ~6 lines total. Strictly smaller than the 4 latent-bug findings STORY-024 surfaced about UC2's manifests (which STORY-024 deliberately did *not* patch — those are larger and stayed out of scope). The agent.yaml patch *is* in STORY-025's scope because the coordinator is the consumer; UC2's brokenness is STORY-025's blocker, not UC2 maintenance.

Sprint-3 retro candidate: the remaining UC2 latent bugs (image tag, bootstrap shell, RollingUpdate, taint tolerations — flagged in STORY-024 §Implementation findings) still need a follow-up. STORY-025 doesn't expand into them.

### Why the bridge gets promoted (and what changes)

`uc3/agents/kagent-bridge-services.yaml`'s preamble already says (line 19–20):

> When UC4 lands (STORY-024 onwards), it either copies these into uc4/agents/ or we promote the file to infra/observability/ — whichever matches the eventual UC4 wiring. Premature promotion deferred per the project's "don't design for hypothetical future requirements" default.

UC4 has landed (STORY-024 manifests, STORY-025 agents). The bridge is needed by both UC3 and UC4 (both reference `prometheus.kagent.svc` + `grafana.kagent.svc` via kagent's pre-packaged Prom/Graf agents). Two copies under `uc3/agents/` and `uc4/agents/` would be idempotent (`kubectl apply` for the second copy reports `unchanged`) but two-files-one-source is the duplication the original author note flagged.

Promotion changes:
- File path: `uc3/agents/kagent-bridge-services.yaml` → `infra/observability/kagent-bridge-services.yaml`. Content stays byte-identical except for the preamble — `kagent-workshop/uc: uc3` label updates to `kagent-workshop/component: observability` to reflect shared ownership; preamble paragraph updates to remove the "or we promote" sentence.
- `Makefile` `observability-up`: adds `kubectl apply -f $(OBSERVABILITY_DIR)/kagent-bridge-services.yaml` after the existing `kubectl apply -k $(OBSERVABILITY_DIR)/` line. Lives outside the kustomization because the kustomization sets `namespace: artemis-observability` at root, which would override the bridge's `namespace: kagent` and silently break it.
- `observability-down`: adds the matching `kubectl delete -f` for symmetry.
- UC3 inheritance: `make uc3-up` already runs `observability-up` first (Makefile L187), so the bridge lands automatically; no per-UC apply needed for UC3 either. UC3 README author-notes block (lives in `uc3/README.md` line 90-something per STORY-021) references the bridge — update the path reference there in a 1-line edit.

### Why two MCP server references on the coordinator (not one)

The coordinator references both `artemis-bulb-mcp` (for bulb tools) AND `kagent-tool-server` (for `k8s_get_pod` + `k8s_get_resources`). Reasoning:
- `artemis-bulb-mcp`: the coordinator MUST be able to write bulbs — this is the FR-017 contract.
- `kagent-tool-server`: the coordinator's system prompt instructs a pre-fan-out sanity check ("verify `artemis-uc4` namespace exists and the three Deployments are present; if not, surface the discovery and stop"). Without K8s read tools, the coordinator can't verify pre-conditions before fan-out. The sub-agents have their own K8s tools (UC1/UC2/UC3 each reference `kagent-tool-server`), but they're scoped to their own UC namespaces — the coordinator needs a cross-namespace look at `artemis-uc4`.

Tool budget on `kagent-tool-server` is deliberately tight: `k8s_get_pod`, `k8s_get_resources`. No `describe` (sub-agents handle deep inspection); no `events` (same).

### Why `default-model-config` (in `kagent`) for the coordinator Agent itself + per-UC `artemis-llm` slot kept in `artemis-uc4`

Same precedent UC1 + UC3 set: the Agent CRD lives in `kagent` and references `default-model-config` (kagent-installed) so a single shared LLM Secret (`artemis-llm-credentials`) doesn't need to be duplicated across namespaces. The per-UC `artemis-llm` slot in `artemis-uc4` (this story ships) is unused at runtime but preserved for two reasons:
1. **Convention consistency** — every UC has a `<UC>/agents/modelconfig.yaml` slot per `docs/artemis-naming.md` L78.
2. **Future-override capability** — if UC4 ever needs a different model than UC1/UC3 (e.g. a larger context window for the multi-agent fan-out replies), the slot is in place. Workshop-infrastructure can patch the `provider` / `model` fields without code changes, then a one-line edit to `agent.yaml` flips the coordinator from `default-model-config` to `artemis-llm`.

### System-prompt narrative-judgement scope

The prompt encodes three locked contracts (FR-017 mapping, NFR-012 tenancy, delegation discipline) and one bounded judgement slice — the prose surrounding those contracts. The judgement slice is small:
- Mission framing tone ("You are the Artemis mission coordinator...").
- The phrasing of "delegate to ... in parallel" vs "delegate to ... one at a time" (kagent v0.9.0's runtime parallelism for `tools[].type: Agent` calls is undocumented at the time of writing; the prompt uses "in parallel where the runtime supports it" hedge language to avoid lying).
- The phrasing of the verdict-summary reply ("Three bulbs are now lit: slot 1 red, slot 2 red, slot 3 red. Diagnoses: UC1 — image pull failure (tag `:v999` never published); UC2 — pod stuck Pending (synthetic node taint); UC3 — container OOMKilled (64 MiB limit + leak loop). Remediation hints: ..." etc.).

Clément's narrative-quality sign-off on this prose is deferred to STORY-028 (M5 dry-run). Pure-text follow-up — no cluster impact.

### What STORY-025 deliberately does **not** touch

- `uc1/agents/`, `uc1/manifests/`, `uc1/tour.json`, `uc1/README.md` — no impact.
- `uc2/manifests/`, `uc2/tour.json`, `uc2/README.md`, `uc2/agents/modelconfig.yaml` — no impact. The only UC2 file touched is `uc2/agents/agent.yaml` (the 1-file drift patch).
- `uc3/agents/agent.yaml`, `uc3/agents/modelconfig.yaml`, `uc3/manifests/`, `uc3/tour.json` — no impact. The only UC3 file touched is `uc3/agents/kagent-bridge-services.yaml` (deleted; promoted).
- `uc3/README.md` — 1-line edit to repath the bridge file reference (no narrative change).
- `apps/`, `schemas/`, `mcp/`, `docs/architecture-…md`, `docs/tour-content-conventions.md`, `docs/artemis-naming.md` — no impact.
- `uc4/manifests/`, `uc4/tour.json`, `uc4/README.md` — STORY-024, 026, 027 territory.

---

## Dependencies

**Prerequisite stories (all completed):**
- STORY-012 (UC1 manifests + agent) — provides `artemis-mission-control-debugger`.
- STORY-015 (UC2 manifests + agent) — provides `artemis-launch-pad-debugger` (post-STORY-025 inline patch).
- STORY-018 (`infra/observability/`) — provides the Prom + Graf stack the bridge bridges to.
- STORY-019 (UC3 manifests + agent + bridge Services) — provides `artemis-rover-telemetry-debugger` + the original bridge file location.
- STORY-022 (KMCP MCP source) — provides `list_bulbs` + `update_bulb` tool implementations.
- STORY-023 (MCP packaging — RemoteMCPServer `artemis-bulb-mcp`) — provides the MCP reference target.
- STORY-024 (UC4 multi-symptom manifests) — provides the cluster mess the coordinator operates on. Not a hard prerequisite for *authoring* STORY-025 (the agent references compile-time symbols only), but a hard prerequisite for the cluster-smoke validation step.

**External dependencies:**
- kagent v0.9.0 — `Agent` CRD's `tools[].type: Agent` shape (a2a delegation, confirmed in STORY-019 §Spike findings).
- kagent v0.9.0 demo profile — provides the kagent-installed `default-model-config` ModelConfig + the `kagent-tool-server` RemoteMCPServer.
- `artemis-llm-credentials` Secret in `kagent` ns + per-UC ns — injected by workshop-infrastructure at deploy time, NOT committed to repo per NFR-011.
- `WORKSHOP_PARTICIPANT_LOGIN` env on the MCP Deployment (Secret/ConfigMap refs, also workshop-infrastructure-injected per STORY-023's deployment.yaml shape).

**Blocked stories:**
- STORY-026 (UC4 tour) — needs the coordinator agent's name + the expected reply shape to write Beat 3 prose.
- STORY-027 (UC4 README + cross-author repro) — references the slot ↔ UC mapping, the colour mapping, the delegation flow, and the tenancy contract — all locked by STORY-025's agent.yaml + system prompt.
- STORY-028 (M5 dry-run) — absorbs the end-to-end agent reasoning loop validation deferred from STORY-025, alongside the same deferral from STORY-019/020/021/024.

---

## Definition of Done

- [ ] `uc4/agents/agent.yaml` + `uc4/agents/modelconfig.yaml` shipped with the documented shapes.
- [ ] `uc2/agents/agent.yaml` patched inline (namespace + MCP reference shape).
- [ ] `uc3/agents/kagent-bridge-services.yaml` moved to `infra/observability/kagent-bridge-services.yaml`; Makefile + UC3 README repath edits in place.
- [ ] AC ticked.
- [ ] Self-author cluster smoke validation recorded under *Implementation Notes*.
- [ ] STORY-025 entry in `docs/sprint-status.yaml` updated to `status: completed` with `completion_date`, `actual_points`, and an ownership re-attribution note (`joint → Quentin`).
- [ ] PR opened (or committed directly to `main` per the project's branching note); cross-author repro deferred to STORY-028.

---

## Story Points Breakdown

- **`uc4/agents/agent.yaml` coordinator with 3 a2a sub-Agent refs + 2 MCP refs + ~50-line system prompt:** 2 points. Mechanical reuse of UC3's tool-list shape + a longer system prompt encoding FR-017 + NFR-012 contracts.
- **`uc4/agents/modelconfig.yaml` per-UC slot:** 0.5 points. Direct copy from UC3's modelconfig.yaml.
- **UC2 drift inline patch (namespace + MCP reference):** 0.5 points. 2-stanza file edit, but requires careful AC walk to confirm it doesn't break UC2 standalone (which still gets exercised by `make uc2-up` and STORY-017's flow).
- **Bridge promotion + Makefile + UC3 README repath:** 1 point. File move + 2-line Makefile addition + 1-line README edit + preamble rewrite on the bridge file itself.
- **Self-author cluster smoke (apply chain + 3 `ACCEPTED=True` verifications + discoveredTools assertion):** 1 point.
- **Total:** 5 points. Matches sprint-plan estimate.

**Rationale:** Same complexity tier as STORY-019 (5 pts) because there's one bounded spike (kagent v0.9.0 a2a wiring shape, already confirmed by STORY-019 § Spike but re-exercised here at scale — the coordinator combines a2a + McpServer + dual-MCP, which UC3 didn't do simultaneously). Higher than STORY-024 (3 pts) because of the cross-UC patch + promotion surface.

---

## Additional Notes

- **Sprint plan AC mentioned "MCP `ToolServer` CRD"** — STORY-023 actually shipped `RemoteMCPServer` (`kagent.dev/v1alpha2`), which is what kagent v0.9.0 uses for STREAMABLE_HTTP. STORY-025 references it correctly. Same wording-vs-shape gap STORY-023 already flagged in its title note.
- **Why no `tools[].type: Tool` references** — kagent v0.9.0 dropped the standalone `Tool` CRD; tools come from MCP servers only. Same finding STORY-005 surfaced and UC1/UC3 already document.
- **Why the coordinator does NOT reference its own ModelConfig** — UC1 + UC3 both leave the Agent referencing `default-model-config` in `kagent` and ship the per-UC `artemis-llm` slot as a "future override" placeholder. STORY-025 follows the precedent.
- **Sprint-3 retro candidate (already partially flagged)**: kagent v0.9.0 a2a runtime parallelism semantics. The system prompt hedges ("delegate in parallel where the runtime supports it") because we haven't confirmed whether `tools[].type: Agent` calls are issued in parallel by the kagent reasoning loop or sequentially. STORY-028 dry-run will surface this via real timing observations.

---

## Progress Tracking

**Status History:**
- 2026-05-11: Created (Developer / Quentin, /bmad:dev-story STORY-025).
- 2026-05-11: Started — sixth swap of the OOO window, joint→Quentin.
- 2026-05-11: Implemented + cluster-smoke validated (CRD-acceptance level; full a2a reasoning loop deferred per AC).

**Actual Effort:** 5 points (matched estimate).

### Implementation Notes (2026-05-11)

#### Files added (2)
- `uc4/agents/agent.yaml` — `Agent artemis-mission-coordinator` in `kagent` ns. 3 a2a sub-agent refs (UC1/UC2/UC3 specialists by canonical name) + 2 `RemoteMCPServer` refs (`kagent-tool-server` for `k8s_get_pod` + `k8s_get_resources`; `artemis-bulb-mcp` for `list_bulbs` + `update_bulb`) + ~110-line system prompt encoding the FR-017 slot/colour mapping (slots 1/2/3 ↔ UC1/UC2/UC3; symptom present → red `(255,0,0)`; symptom absent → green `(0,255,0)`; inconclusive → amber `(255,191,0)`) + the NFR-012 tenancy contract (every MCP call passes `user="${WORKSHOP_PARTICIPANT_LOGIN}"`) + the delegation discipline (always delegate to all three; parallel where the runtime supports it; treat each verdict as authoritative).
- `uc4/agents/modelconfig.yaml` — per-UC `artemis-llm` slot in `artemis-uc4` ns (matches UC1/UC2/UC3 pattern; the coordinator itself references `default-model-config` per the UC1+UC3 precedent).

#### Files moved (1)
- `uc3/agents/kagent-bridge-services.yaml` → `infra/observability/kagent-bridge-services.yaml`. Preamble rewritten to reflect shared ownership. `kagent-workshop/uc: uc3` label swapped for `kagent-workshop/component: observability`.

#### Files patched (5)
- **`uc2/agents/agent.yaml` — three drift items fixed inline** (one more than originally planned):
  1. `metadata.namespace: artemis-uc2 → kagent` (same-namespace a2a wiring constraint).
  2. `tools[].mcpServer` rewritten to the `RemoteMCPServer` shape: `apiGroup: kagent.dev`, `kind: RemoteMCPServer`, `name: kagent-tool-server` (previous `kagent-tools-k8s` did not exist on kagent v0.9.0).
  3. **`declarative.modelConfig: artemis-llm → default-model-config`** (discovered during validation when the post-namespace-move agent landed `Accepted=False` with `ModelConfig.kagent.dev "artemis-llm" not found` — the ModelConfig lives in `artemis-uc2` ns, the Agent now lives in `kagent` ns, same-namespace lookup fails. UC1+UC3 both already use `default-model-config`; UC2's `artemis-llm` reference was a third pre-existing drift item).
- `Makefile` — `observability-up` extended with `kubectl apply -f $(OBSERVABILITY_DIR)/kagent-bridge-services.yaml` (separate from the kustomize apply because the kustomization's root `namespace: artemis-observability` would override the bridge's `namespace: kagent`). `observability-down` extended symmetrically. `lint-manifests` extended with a separate dry-run for the bridge file.
- `uc3/README.md` — two repath edits: bridge-section narrative (now points at `../infra/observability/kagent-bridge-services.yaml`) + file-tree listing (bridge removed from `uc3/agents/` block, new paragraph notes the promotion).
- `uc3/agents/agent.yaml` — 1-line preamble comment repath.

#### Files NOT modified (intentional)
- `uc1/`, `uc3/agents/agent.yaml` (modulo the preamble repath), `uc3/agents/modelconfig.yaml`, `uc2/manifests/`, `uc2/tour.json`, `uc2/README.md`, `uc2/agents/modelconfig.yaml`, `apps/`, `schemas/`, `mcp/`, `docs/architecture-…md`, `docs/tour-content-conventions.md`, `docs/artemis-naming.md` — no impact.
- `uc4/manifests/`, `uc4/tour.json`, `uc4/README.md` — STORY-024, 026, 027 territory.

#### Validation

**`make lint-manifests` clean** across `uc1/uc2/uc3/uc4/manifests/` + `infra/observability/` (both kustomize bundle and the promoted bridge file) + `mcp/manifests/`.

**`kubectl apply --dry-run=server -f uc*/agents/` clean** across all four UCs (`artemis-uc2` and `artemis-uc4` namespaces created beforehand for the ModelConfig dry-run — benign, matches the precedent UC3 set with `artemis-uc3` carrying its own modelconfig).

**End-to-end cluster smoke (live `kagent-workshop` kind):**

```text
$ kubectl apply -f uc2/agents/                             # patched UC2 (namespace + MCP + modelConfig)
agent.kagent.dev/artemis-launch-pad-debugger created
modelconfig.kagent.dev/artemis-llm created

$ kubectl apply -f uc4/agents/                             # new UC4 coordinator + modelconfig
agent.kagent.dev/artemis-mission-coordinator created
modelconfig.kagent.dev/artemis-llm created

$ kubectl apply -f infra/observability/kagent-bridge-services.yaml  # promoted bridge
service/prometheus configured
service/grafana configured

# MCP brought up via the STORY-023 recipe (image already locally built; side-loaded
# into kind; Secret WORKSHOP_PARTICIPANT_LOGIN=operator-test + ConfigMap
# LIGHT_MANAGER_URL=http://light-manager.light-manager.svc.cluster.local:8000;
# make mcp-up). Initial Accepted=False (same 7-second pod-creation/reconcile race
# STORY-023 documented); annotation poke retriggered reconcile, ACCEPTED=True within
# 5 seconds.

$ kubectl get agent -n kagent | grep artemis-
artemis-launch-pad-debugger            Declarative   python    True      True
artemis-mission-control-debugger       Declarative   python    Unknown   False   # pre-existing UC1 drift, not STORY-025
artemis-mission-control-k8s-debugger   Declarative   python    True      True    # unrelated experiment agent
artemis-mission-coordinator            Declarative   python    True      True
artemis-rover-telemetry-debugger       Declarative   python    True      True

$ kubectl get agent -n kagent artemis-mission-coordinator \
    -o jsonpath='{range .status.conditions[*]}{.type}={.status} ({.message}){"\n"}{end}'
Accepted=True (Agent configuration accepted)
Ready=True (Deployment is ready)

$ kubectl get agent -n kagent artemis-launch-pad-debugger \
    -o jsonpath='{range .status.conditions[*]}{.type}={.status} ({.message}){"\n"}{end}'
Accepted=True (Agent configuration accepted)
Ready=True (Deployment is ready)

$ kubectl get rmcps -n kagent artemis-bulb-mcp -o jsonpath='{.status.discoveredTools[*].name}'
list_bulbs update_bulb

$ kubectl get svc -n kagent prometheus grafana
NAME         TYPE           CLUSTER-IP   EXTERNAL-IP                                                 PORT(S)
prometheus   ExternalName   <none>       prometheus-server.artemis-observability.svc.cluster.local   9090/TCP
grafana      ExternalName   <none>       grafana.artemis-observability.svc.cluster.local             3000/TCP
```

Coordinator Agent reaches `Accepted=True` + `Ready=True` once the `artemis-bulb-mcp` RemoteMCPServer's discoveredTools reconcile completes (`list_bulbs` + `update_bulb` confirmed surfaced). UC2 patched agent also reaches `Accepted=True` + `Ready=True` — proves all three fixes (namespace move + RemoteMCPServer reference shape + modelConfig fix) are correct.

#### Implementation findings (Sprint-3 retro candidates)

1. **UC2 had three drift items, not two.** The plan caught the namespace move + MCP reference fix during static analysis; the modelConfig fix surfaced only during live-cluster validation. Sprint-3 retro candidate (already noted in STORY-024 for the manifest-side drift): UC2 needs a full pass — agent.yaml is now patched, but `uc2/manifests/` still has the four latent bugs STORY-024 flagged (`:v1` image tag, `/bin/bash` shell, RollingUpdate strategy, missing Job tolerations). ~10-line patch total.

2. **UC1 pre-existing drift on the cluster.** `artemis-mission-control-debugger` on the cluster is `Accepted=False` because the deployed spec references `kagent-tools-k8s` — but the repo's current `uc1/agents/agent.yaml` already uses `kagent-tool-server`. This means the cluster has a stale apply from before UC1's M2 fixes (or UC1 was never re-applied after the conventions stabilised). NOT a STORY-025 regression. Sprint-3 retro candidate: re-apply `uc1/agents/` (1-command fix; the repo already ships the correct spec).

3. **kagent v0.9.0 a2a runtime parallelism semantics still unconfirmed.** The system prompt hedges ("delegate in parallel where the runtime supports it") because the v0.9.0 reasoning loop's `tools[].type: Agent` call dispatch order isn't documented. STORY-028 dry-run timing observations will resolve this.

4. **RemoteMCPServer reconcile race is reproducible.** STORY-023 found a 7-second pod-creation/reconcile race that landed the MCP's rmcps `Accepted=False` on first apply; auto-recovers within 60 s, or can be retriggered with an annotation poke. STORY-025's validation hit the exact same race — the next iteration of `make mcp-up` would benefit from a wait-or-poke loop. Sprint-3-retro / workshop-infrastructure-docs candidate.

#### AC sign-off

- [x] `uc4/agents/agent.yaml` ships `Agent artemis-mission-coordinator` in `kagent` ns with the documented shape.
- [x] Coordinator references all three UC sub-Agents via `tools[].type: Agent` (a2a wiring).
- [x] Coordinator references `artemis-bulb-mcp` RemoteMCPServer with `toolNames: [list_bulbs, update_bulb]`.
- [x] Coordinator references `kagent-tool-server` RemoteMCPServer with `toolNames: [k8s_get_pod, k8s_get_resources]`.
- [x] System prompt encodes the FR-017 slot/colour mapping (slots 1/2/3 ↔ UC1/UC2/UC3; red/green/amber per `docs/artemis-naming.md` L80–92).
- [x] System prompt encodes the NFR-012 tenancy contract (`user="${WORKSHOP_PARTICIPANT_LOGIN}"` on every MCP call).
- [x] System prompt encodes delegation discipline (always delegate to all three; parallel where supported; per-verdict authority).
- [x] `uc4/agents/modelconfig.yaml` ships the per-UC `artemis-llm` slot in `artemis-uc4` ns.
- [x] UC2 drift patched inline (three items, one more than originally planned).
- [x] Bridge-Services promotion shipped (file move + Makefile additions + UC3 README repath).
- [x] `make lint-manifests` clean.
- [x] `kubectl apply --dry-run=server -f uc*/agents/` clean.
- [x] Coordinator reaches `Accepted=True` + `Ready=True` on the live cluster.
- [x] UC2 patched agent reaches `Accepted=True` + `Ready=True` on the live cluster.
- [x] `artemis-bulb-mcp` discoveredTools surface `list_bulbs` + `update_bulb`.
- [x] Bridge Services present in `kagent` ns via the new `infra/observability/` location.
- [ ] **Cross-author repro by Clément** — *deferred* to STORY-028 (M5 dry-run) per the recursive deferral chain established in STORY-018/019/020/021/024.
- [ ] **End-to-end agent reasoning loop** — *deferred* to STORY-028. Requires live OpenAI creds + light-manager backend + all three UC clusters in their broken states simultaneously.

### Next

- PR opened against `main` (or committed directly per the branching memory note).
- Sprint 4 sits at 8 / 14 committed points landed pre-launch (STORY-024 + STORY-025).
- STORY-026 (UC4 tour) is the natural continuation — needs the coordinator agent's name + reply shape locked, both of which STORY-025 provides.
- Sprint-3 retro ticket queue gains 1 more candidate: confirm kagent v0.9.0 a2a parallelism semantics during STORY-028 dry-run.

---

**This story was created using BMAD Method v6 - Phase 4 (Implementation Planning).**
