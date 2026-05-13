# STORY-038: UC1 Beat 3 expansion (UI explore, kubectl parity, chat, verify, optional self-fix spike)

**Epic:** EPIC-002 (UC1 / UC2 implementations)
**Priority:** Should Have
**Story Points:** 5
**Assigned To:** Clément Raussin (UC1 owner)
**Status:** Not Started
**Created:** 2026-05-05
**Sprint:** 6 (M6 post-dry-run patch, 2026-05-06 → 2026-05-15)
**Source:** Dry-run journal 2026-05-05 16:32, severity `issue`.

---

## User Story

As a **workshop participant on their first kagent invocation (UC1)**,
I want **the tour to walk me through exploring the agent, comparing UI to CRD, then chatting with it through a build-up of prompts**,
So that **I understand how the agent is built, what it can do, and how to talk to it before I rely on it as a black-box oracle.**

---

## Background

UC1 Beat 3 is currently one step: open the dashboard and paste a diagnostic prompt. The dry-run on 2026-05-05 found this compressed too tightly for the workshop's first agent contact. The participant should ramp up: explore the agent visually, then in CRD form (UI/kubectl parity), then say hello, then ask for diagnosis, then verify the fix, with an open question on whether the agent can apply the fix itself. This pedagogical sequence is the core of UC1 and currently undelivered.

## Scope

**In scope:**
- Expand `uc1/tour.json` Beat 3 from 1 step to a multi-step sub-sequence:
  - (a) **Explore the agent in the dashboard.** Open the dashboard, click the agent's *edit* button to inspect its config (model, tools, prompt).
  - (b) **kubectl parity.** Run `kubectl get agents -n <ns>` then `kubectl get agent <name> -n <ns> -o yaml`. Same config as in the UI, but in CRD form.
  - (c) **Open the chat and greet.** Open the agent's chat surface, send a polite "hello" to anchor the interaction.
  - (d) **Diagnostic prompt.** Paste the precise diagnostic prompt; read the agent's synthesised answer in the chat.
  - (e) **Verification prompt.** Follow-up prompt that asks the agent to confirm the fix worked once applied (the participant applies the fix between (d) and (e)).
  - (f) **Spike (optional, time-boxed at the start of dev):** can the agent apply the fix itself (image tag update via the agent's write capabilities like `k8s_apply`)? If yes and within budget, replace step (e) with an "ask the agent to self-fix" prompt and adjust the recap. If no / blocked / too risky, drop this sub-step and keep (d) + (e).
- Update `uc1/README.md` Author notes and the "Expected agent diagnosis" section to reflect the multi-step Beat 3 and the kubectl parity expectation.
- Update `docs/tour-content-conventions.md` §`The 4 beats` to allow Beat 3 to be multi-step for pedagogically rich UCs (currently it is pinned at exactly 1 step). Add a sub-rule: "Beat 3 may expand to N steps when the UC is the workshop's first contact with a new mode (UI/chat for UC1, MCP for UC4)".
- Update `docs/tour-content-conventions.md` worked example to reflect the new Beat 3 shape for UC1.

**Out of scope:**
- Changes to UC2 / UC3 / UC4 Beat 3.
- Re-recording the agent CRD (`uc1/agents/agent.yaml`) unless the self-fix spike requires a new tool grant.
- Re-doing the no-spoiler / Beat 1 prose (covered by STORY-037 and STORY-042).

---

## Acceptance Criteria

- [ ] `uc1/tour.json` Beat 3 expanded into the (a) through (e) sub-steps. Each sub-step has a clear title and short explanation. Tour `id` unchanged: `kagent-uc1-imagepullbackoff`.
- [ ] Sub-step (a) opens the kagent dashboard and tells the participant to click *edit* on `artemis-mission-control-debugger`. The explanation lists what to look at (model, tools, system prompt).
- [ ] Sub-step (b) commands list: `kubectl get agents -n artemis-uc1` and `kubectl get agent artemis-mission-control-debugger -n artemis-uc1 -o yaml`. Explanation surfaces that the YAML output matches the UI's edit panel.
- [ ] Sub-step (c) tells the participant to open the agent's chat and paste a greeting ("hello" or similar). Optional explanation note on why we anchor the interaction.
- [ ] Sub-step (d) carries the diagnostic prompt that was previously the single Beat 3 prompt. The expected answer is named (the published-tag root cause) in the explanation as a "you should see something like" cue.
- [ ] Sub-step (e) carries a verification prompt ("did the fix work?") or, if the self-fix spike succeeds, an "apply the fix" prompt with the resulting expected behaviour.
- [ ] Self-fix spike documented in `uc1/README.md` Author notes: outcome (chosen path) plus one-line rationale.
- [ ] `docs/tour-content-conventions.md` updated: Beat 3 multi-step allowance documented; worked example refreshed.
- [ ] `make validate-tours` green over all 5 tours.
- [ ] No em dashes.

---

## Technical Notes

- The Beat 3 sub-steps share the kagent dashboard surface, so the `kagent dashboard` open command should appear once in sub-step (a) and stay running while (c) (d) (e) happen in the same browser tab. Note in the explanation that the dashboard process stays alive between sub-steps.
- For the self-fix spike, the agent currently has `k8s_get_pod`, `k8s_describe_pod`, `k8s_get_events` per `uc1/agents/agent.yaml` (read-only). Auto-fix would need a write tool (`k8s_apply` or `k8s_patch`). Granting it changes the agent's capability surface; review with Quentin before merging.
- Time-box the spike to ~1 hour at the start of dev. If the write tool exists in kagent v0.9.0 and the agent reliably finds the deploy spec to patch, ship the auto-fix variant. Otherwise stay on participant-applied fix.
- Multi-step Beat 3 is a convention change; the Beat 3 rule must be relaxed in `tour-content-conventions.md` before STORY-038 merges, or merge them in the same PR.

---

## Dependencies

**Prerequisite stories:**
- STORY-031 (UC1 Beat 3 UI/chat invocation) already shipped the single-step variant this story extends.
- STORY-042 (density pass) may run in parallel; coordinate on explanation length.

**Blocks:** none directly.
**External:** kagent v0.9.0 dashboard surface + agent write-capability tools (`k8s_apply` / `k8s_patch`), to be confirmed in the spike.

---

## Definition of Done

- [ ] All AC satisfied.
- [ ] Self-fix spike outcome recorded in `uc1/README.md` Author notes.
- [ ] `make validate-tours` green locally.
- [ ] Manual walk-through on kind: each sub-step is doable end-to-end.
- [ ] PR cross-reviewed by Quentin (NFR-008), with special attention on the convention rule change.
- [ ] `docs/sprint-status.yaml` updated: STORY-038 → `completed`.

---

## Story Points Breakdown

- Self-fix spike (~1h): 0.5 pt
- Beat 3 (a) through (e) authoring: 2 pts
- Convention update + worked example refresh: 1 pt
- README author notes + validate + sync: 1 pt
- Cross-review coordination: 0.5 pt
- **Total: 5 pts**

---

## Progress Tracking

**Status History:**
- 2026-05-05: Created (Scrum Master, /create-story, post dry-run).

**Actual Effort:** TBD.
