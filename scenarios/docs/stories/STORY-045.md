# STORY-045: UC1 pivot to built-in `k8s-agent` (2-prompt flow, drop custom debugger CRD from UC1)

**Epic:** EPIC-002 (UC1 / UC2 implementations)
**Priority:** Should Have
**Story Points:** 2
**Assigned To:** Clément Raussin (UC1 owner)
**Status:** Completed (2026-05-17)
**Created:** 2026-05-17
**Sprint:** 6 (M6 post-dry-run patch, 2026-05-06 → 2026-05-15)
**Source:** Operator pivot 2026-05-17 after a same-session brainstorm on UC1 remediation. Supersedes the design that was sketched as STORY-044 (collaborative self-fix via `k8s_patch_resource`); STORY-044 was created in-session but never committed, then dropped in favour of this simpler shape.

---

## User Story

As a **workshop participant in UC1**,
I want **to talk to kagent's built-in `k8s-agent` for both the global diagnosis and the kubectl remediation command, in two clear prompts**,
So that **I see the value of an already-shipped generic agent (no per-UC custom CRD), and I keep the remediation under my own hand by running the kubectl command myself.**

---

## Background

UC1 walk-through earlier on 2026-05-17 surfaced two findings in sequence:

1. The custom `artemis-mission-control-debugger` agent we ship for UC1 diagnoses correctly but returns only a generic remediation hint ("verify the image name and tag are correct"), no actionable command.
2. Three remediation directions were explored on top of that finding:
   - Hardcode the valid tag in the prompt: rejected as a spoiler (agent would not be reasoning, just reciting).
   - HTTP-probe the Scaleway registry for tags: blocked at two layers (the `kagent-tool-server` image is distroless with only `kubectl` available via the `shell` tool, and the registry is private with 401 on `/v2/.../tags/list`).
   - Add a write tool (`k8s_patch_resource`) and let the agent apply the fix collaboratively (STORY-044 design): viable, but requires shipping our own Agent CRD with write capabilities.

The operator pivoted to a fourth direction: **drop the custom agent for UC1 entirely**, use kagent's built-in `k8s-agent` (KubeAssist, ships with the demo profile, already running in the `kagent` namespace after `kagent install --profile demo`), and split UC1 Beat 3 into two prompts:

- Prompt 1: a global namespace-level diagnostic ask. `k8s-agent` already has the read tools and the troubleshooting prompt baked in, no custom CRD needed.
- Prompt 2: ask the agent for the kubectl command to remediate. The agent returns a `kubectl set image …` line; the participant runs it themselves in Beat 4.

The pedagogical narrative shifts from "we ship a specialised agent per UC" to "kagent's built-in agents are good enough for diagnosis + remediation suggestion". The remediation stays manual (the participant runs the kubectl command), which matches how the workshop framed UC1's value before STORY-044 ("the agent told you what to do, you applied it").

### Why the agent file is moved, not deleted

UC4's coordinator (`uc4/agents/agent.yaml`) delegates to `artemis-mission-control-debugger` as one of its three a2a specialists. The CRD must therefore continue to be applied on the cluster. Three placement options were considered:

- (i) Keep `uc1/agents/agent.yaml` on disk even though UC1 no longer references it.
- (ii) Move `uc1/agents/agent.yaml` to `uc4/agents/mission-control-debugger.yaml` (where it is actually consumed) and delete the now-empty `uc1/agents/` folder.
- (iii) Pivot UC4's coordinator to delegate to `k8s-agent` as well, dropping the specialised debugger altogether.

The operator picked (ii). UC1 stays minimalist (manifests only), UC4 keeps its multi-agent a2a pedagogy intact, and the file lives where its sole consumer is.

---

## Scope

**In scope:**

- Move `uc1/agents/agent.yaml` → `uc4/agents/mission-control-debugger.yaml` (filename differs from `uc4/agents/agent.yaml`, which stays the coordinator). Refresh the file's header comment to reflect the new location and rationale (no behavioural change to the Agent spec itself).
- Delete the now-empty `uc1/agents/` directory.
- `uc1/tour.json` Beat 1:
  - Explanation: 3 files instead of 4; drop the "on-call debugger agent" mention; add a sentence noting that the diagnostic agent (`k8s-agent`) ships with kagent's demo profile and is already running.
  - fileEdits: drop the 4th entry (agents/agent.yaml).
  - commands: drop the second one ("Apply the on-call debugger agent").
- `uc1/tour.json` Beat 3:
  - Rewritten around `k8s-agent` (built-in, namespace `kagent`).
  - Two prompts in order, each followed by an "you should see something like" expected-response block so the participant can spot if the agent goes off the rails:
    - Prompt 1 (diagnose): "In the `artemis-uc1` namespace, what is failing?" Expected response: short paragraph naming `ImagePullBackOff` on `mission-control` and the bad tag `:v999`.
    - Prompt 2 (remediation command): "Propose the kubectl command to roll the `mission-control` deployment forward to image tag `v1.0.0`." Expected response: a `kubectl set image …` line ready to copy.
  - Sets the expectation that the participant will copy the returned kubectl command and run it themselves in the next beat.
- `uc1/tour.json` Beat 4 explanation: light tweak so it references the command the agent returned in Beat 3. Commands unchanged (`kubectl set image` to `v1.0.0`).
- `uc1/tour.json` Beat 5 ("What we'd have done by hand"): **deleted**. The expected-response blocks in Beat 3 absorb the pedagogical role of "this is what the agent saved you from typing", so the manual recap is now redundant. UC1 collapses from 5 beats to 4, which matches the canonical 4-beat shape for diagnostic UCs (`docs/tour-content-conventions.md` §The 4 beats).
- `uc4/tour.json` Beat 1:
  - Explanation: 9 files → 10 files; "one Agent CRD" → "two Agent CRDs" (with a one-line note that the second is the UC1 debugger now owned by UC4).
  - fileEdits: append the relocated debugger between the coordinator (`uc4/agents/agent.yaml`) and the MCP RemoteMCPServer manifest.

**Out of scope:**

- UC2 / UC3 / UC4 tour bodies (only UC4 Beat 1 fileEdits change is in-scope, as a knock-on of moving the file).
- The Agent spec itself (systemMessage, tool set, labels). The pre-STORY-044 read-only diagnostic agent is preserved verbatim; only the file's header comment changes.
- Migrating UC2 / UC3 debugger CRDs to a similar pattern. Out of scope for STORY-045; revisit only if the workshop direction calls for it.
- Convention rule changes about Beat 3 being a single prompt. The 2-prompt sequence still fits inside one tour step (one Beat 3 explanation, no extra step), so no convention change is required.

---

## Acceptance Criteria

- [x] `uc1/agents/` directory does not exist.
- [x] `uc4/agents/mission-control-debugger.yaml` exists, contains the pre-STORY-044 read-only diagnostic Agent (`name: artemis-mission-control-debugger`, `namespace: kagent`), with a refreshed header comment that explains why it lives under `uc4/agents/` now.
- [x] `uc1/tour.json` Beat 1 `fileEdits` has 3 entries (no `uc1/agents/agent.yaml`).
- [x] `uc1/tour.json` Beat 1 `commands` has 1 entry (just `Apply the manifests`).
- [x] `uc1/tour.json` Beat 1 explanation reflects 3 files and mentions `k8s-agent` as the built-in diagnostic agent.
- [x] `uc1/tour.json` Beat 3 explanation routes to `k8s-agent` (namespace `kagent`) and walks through the two prompts (diagnose, then remediation-command ask). Both prompts are surfaced as blockquotes, each followed by an "you should see something like" expected-response blockquote so the participant can sanity-check the agent's output.
- [x] `uc1/tour.json` Beat 4 explanation references the kubectl command the agent returned in Beat 3. Commands unchanged.
- [x] `uc1/tour.json` Beat 5 ("What we'd have done by hand") is removed. UC1 tour ends on Beat 4 (Mission recovery), giving 4 beats total (canonical shape for diagnostic UCs).
- [x] `uc4/tour.json` Beat 1 `fileEdits` has 10 entries including the relocated debugger right after the coordinator.
- [x] `uc4/tour.json` Beat 1 explanation reflects 10 files and 2 Agent CRDs.
- [x] No em dashes in any new prose.
- [x] `make validate-tours` green over all 5 tours.
- [ ] Live test on kind: applying `uc1/manifests/` plus opening the dashboard chat for `k8s-agent` runs the 2-prompt flow end-to-end and the agent returns a usable `kubectl set image` command in Prompt 2 (operator step, after sync).
- [ ] PR cross-reviewed by Quentin (NFR-008), lands when the diff is opened as a PR.

---

## Technical Notes

- `k8s-agent` ships with kagent v0.9.0's demo profile. Its identity in the cluster:
  - `apiVersion: kagent.dev/v1alpha2`, `kind: Agent`, `metadata.name: k8s-agent`, `metadata.namespace: kagent`.
  - `spec.declarative.systemMessage` is the "KubeAssist" prompt: generic K8s troubleshooting persona, with informational tools (`GetResources`, `DescribeResource`, `GetEvents`, `GetPodLogs`, `GetResourceYAML`, `CheckServiceConnectivity`, `ExecuteCommand`, etc.) sourced from the same `kagent-tool-server` RemoteMCPServer that the rest of the workshop already references.
  - `modelConfig: default-model-config` (same as our own agents), so credentials come from the cluster-wide `artemis-llm-credentials` Secret.
- Beat 4 keeps the manual `kubectl set image` as the remediation step. The participant runs the command the agent returned in Beat 3.
- The 2-prompt flow is intentionally not enforced by a multi-step Beat 3. It stays inside a single tour step so the participant copies both prompts from one screen and the dashboard tab stays on the same chat thread.
- The expected-response blockquotes after each prompt absorb the pedagogical role of the old Beat 5 ("What we'd have done by hand"). The participant gets the "this is what the agent should have replied" verification inline with the prompt, instead of waiting until the end of the tour for a manual recap. The recap step is therefore removed and UC1 lands at 4 beats, matching the canonical diagnostic-UC shape.
- Why we did not pivot UC4 too (option iii): UC4's coordinator delegates by name to three specialists (`artemis-mission-control-debugger`, `artemis-launch-pad-debugger`, `artemis-rover-telemetry-debugger`). Pivoting to `k8s-agent` for all three would either collapse the three delegations into one (losing the multi-agent pedagogy) or require introducing per-subsystem prompts on a single agent (losing the a2a clarity). Out of scope.

---

## Dependencies

**Prerequisite stories:**

- STORY-031 (UC1 Beat 3 UI/chat invocation) already provides the dashboard chat surface.
- STORY-037 (UC1 Beat 2 framing) provides the spoiler-free Beat 2 baseline.

**Blocks:** none.

**Supersedes:** STORY-044 (collaborative self-fix design via `k8s_patch_resource`). STORY-044 was sketched in the same session but never committed. STORY-045 is the shipped design.

**Pre-empts:** STORY-038 (f) open spike "can the agent apply the fix itself?". Answer per STORY-045: it does not. The agent proposes the kubectl command; the participant runs it. STORY-038's (e) verification sub-step is also re-shaped: Beat 4 is the verification step (the participant runs the agent's command and watches the pod come up), no separate verify prompt is needed in Beat 3.

**External:** kagent v0.9.0 demo profile (`k8s-agent` Agent + `kagent-tool-server` RemoteMCPServer, both already deployed).

---

## Definition of Done

- [ ] All AC satisfied.
- [ ] `make validate-tours` green locally.
- [ ] `scripts/sync-workshop-tour.sh` refreshes `.workshop-tour/` with the new prose.
- [ ] Live test on kind: 2-prompt flow against `k8s-agent` returns a usable diagnostic + a copy-pasteable `kubectl set image` command.
- [ ] PR cross-reviewed by Quentin (NFR-008), with attention to the UC4 fileEdits ripple (10 entries, 2 Agent CRDs).
- [ ] `docs/sprint-status.yaml` updated: STORY-045 → `completed`; STORY-038 note refreshed.

---

## Story Points Breakdown

- File move + header rewrite: 0.5 pt
- UC1 tour Beat 1 + Beat 3 + Beat 4 + Beat 5 prose: 1 pt
- UC4 tour Beat 1 fileEdits + explanation update: 0.25 pt
- Sprint-status + validate + sync + commit: 0.25 pt
- **Total: 2 pts**

---

## Progress Tracking

**Status History:**

- 2026-05-17: Created (Scrum Master, /create-story).
- 2026-05-17: Implemented (Developer, /dev-story).

**Actual Effort:** 2 points (matched estimate).

### Implementation Notes (2026-05-17)

Pivot session. Same operator, same day as the live-test finding that drove the STORY-044 sketch. The decision to drop our own Agent CRD for UC1 came after we mapped out the kagent-tool-server catalogue (~120 tools, including `k8s_patch_resource`) and discovered that the `shell` tool's execution image is distroless with only `kubectl`. That ruled out the most authentic "agent finds the published tag on its own" path. From there, two options remained: ship a write-capable custom agent (STORY-044 design) or piggyback on what's already there (STORY-045 design). Picked STORY-045 for two reasons: less to teach (no Agent CRD walk-through in UC1), and a cleaner reframing of the workshop's value proposition for UC1 ("the agent diagnoses + proposes; you apply").

Per-file:

- `uc1/agents/agent.yaml`: moved to `uc4/agents/mission-control-debugger.yaml` via `git mv`, header comment refreshed (location rationale + STORY-045 reference); Agent spec unchanged (read-only, 3 kubectl tools, same `artemis-mission-control-debugger` name + `kagent` namespace).
- `uc1/agents/` directory: removed (empty after the move).
- `uc1/tour.json`:
  - Beat 1 explanation rewritten: 3 files, no debugger CRD; mentions `k8s-agent` as the built-in diagnostic agent the tour will use later.
  - Beat 1 `fileEdits`: trimmed to first 3 entries.
  - Beat 1 `commands`: trimmed to first entry (`Apply the manifests`).
  - Beat 3 explanation rewritten around `k8s-agent` + 2 prompts in blockquotes, each followed by an "you should see something like" expected-response blockquote (paragraph for Prompt 1, a `kubectl set image` line for Prompt 2).
  - Beat 4 explanation tweaked: references the command the agent returned in Beat 3 (commands unchanged).
  - Beat 5 ("What we'd have done by hand"): removed entirely. The expected-response inline blocks in Beat 3 absorb its role, and UC1 now lands at 4 beats (canonical diagnostic-UC shape).
- `uc4/tour.json`:
  - Beat 1 explanation: 9 → 10 files, 1 → 2 Agent CRDs, with a parenthetical noting the second is the UC1 debugger now owned by UC4 (STORY-045).
  - Beat 1 `fileEdits`: appended the relocated debugger between the coordinator and the MCP RemoteMCPServer manifest. Content regenerated from on-disk `uc4/agents/mission-control-debugger.yaml` via `jq --rawfile` to guarantee parity.
- `docs/sprint-status.yaml`: STORY-045 added to Sprint 6 as completed (2 pts), STORY-038 entry annotated, Sprint 6 + metrics totals updated.

No changes to UC2 / UC3 / UC4 agent CRDs or tour bodies beyond the UC4 Beat 1 fileEdits ripple.

`make validate-tours` green over all 5 tours. Em-dash scan clean on all new prose (Beat 1, Beat 3, Beat 4, Beat 5 of UC1, and the updated header of the moved debugger YAML).
