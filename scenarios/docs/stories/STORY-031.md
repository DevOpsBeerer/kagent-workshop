# STORY-031: UC1 tour rewrite + UI/chat invocation

**Epic:** EPIC-002 (UC1 / UC2 implementations)
**Priority:** Must Have
**Story Points:** 5
**Status:** Completed (2026-05-04) — NFR-003 reproduction deferred to PR / M5
**Assigned To:** Clément Raussin (UC1 owner)
**Created:** 2026-05-04
**Sprint:** 2.5 (M2.5 patch sprint, 2026-05-05 → 2026-05-08)

---

## User Story

As a **workshop participant playing UC1**,
I want **my first contact with kagent to feel like talking to an on-call expert in a chat surface, not running a CLI one-liner**,
So that **the workshop's first agent demo is immersive (real chat, real interface) before later UCs introduce the CLI invocation pattern.**

---

## Description

### Background
The M2 implementation of UC1 (`uc1/tour.json`, STORY-013) opens with an `Apply the broken state` step that explicitly names the bug — *"the deployment.yaml intentionally references a tag that never shipped (`mission-control:v999`)"*. The participant invokes the agent with `kagent invoke` from the terminal. Both points break the brief's intent: the spoiler kills the agent's payoff, and the CLI invocation skips the chat surface that PRD §672 calls out as the participant's destination (*"observes the agent's synthesised diagnosis in the kagent chat surface"*).

This story rewrites UC1's tour under the new STORY-030 convention: a no-spoiler **Mission setup** opener, a **Mission status check** that lets the friction emerge, a Beat-3 invocation **via the kagent UI/chat** (the workshop's UI moment), and a **Manual recap** that flips the rhetoric to *what the participant didn't have to type*.

### Scope
**In scope:**
- Rewrite `uc1/tour.json` under STORY-030's 4-beat convention.
- Beat 3 invokes the kagent agent **via the kagent web UI / chat surface**, not via `kagent invoke` CLI.
- Update `uc1/README.md` Artemis narrative section to match the new tour reading order (the *Expected agent diagnosis* and *Reproduction* sections, which are author-facing, may keep their technical detail).
- Re-walk the NFR-003 cold-deploy reproduction with the rewritten tour to confirm steps still describe a passing path.

**Out of scope:**
- Modifying `uc1/manifests/` (`00-namespace.yaml`, `10-service.yaml`, `20-deployment.yaml`) — the broken state is bit-for-bit identical to M2.
- Modifying `uc1/agents/` (`agent.yaml`, `modelconfig.yaml`) — the agent CRD and tool surface stay identical (`k8s_get_pod`, `k8s_describe_pod`, `k8s_get_events`).
- Installing or configuring the kagent UI — `make kagent-install` is assumed to already provision the dashboard surface kagent v0.9.0 ships with. If it does not, file a follow-up; do not let it bleed into this story's scope.
- UC2 / UC3 / UC4 tours — UC2 lives in STORY-032; UC3/UC4 inherit STORY-030 prospectively.

### User Flow
1. Participant reads **Beat 1 — Mission setup**: *"Mission control is bringing today's roster online for the Artemis pad shift. Apply the manifests below to deploy `mission-control` to your vCluster."* No mention of `:v999`, no "deliberately broken".
2. Participant runs the single apply command. Expects success.
3. Participant reads **Beat 2 — Mission status check**: *"Mission control should be online by now. Verify."* Runs the three `kubectl` commands. Discovers pod stuck.
4. Participant reads **Beat 3 — Call the agent for help**: opens the kagent UI/chat (single command from the step), pastes the prompt from the markdown block, reads the response in the chat surface.
5. Participant reads **Beat 4 — What we'd have done by hand**: recap of the three skipped `kubectl` commands and the manual evidence join.

---

## Acceptance Criteria

- [ ] `uc1/tour.json` is rewritten under STORY-030's convention: exactly four beats — *Mission setup*, *Mission status check*, *Call the agent for help*, *What we'd have done by hand* — in that order.
- [ ] Beat 1 (`Mission setup`) explanation contains **none** of the words `broken`, `deliberately`, `intentionally`, `fault`, `bug`, `wrong`, `error`, `fail`, nor the string `v999`. The deployment is framed as a mission objective ("bring the roster online for the Artemis pad shift"). The `fileEdits[]` content is unchanged from M2 (manifests stay identical).
- [ ] Beat 2 (`Mission status check`) keeps the three existing `kubectl` commands (`get pods`, `describe pod`, `get events`) as one `commands[]` array. Copy frames the run as a mission-status verification; the friction (Pending pod, `ImagePullBackOff` reason, kubelet failure events) is *discovered* by the participant, not announced upfront.
- [ ] Beat 3 (`Call the agent for help`) contains exactly one `commands[]` entry that opens the kagent UI/chat surface. The exact form is frozen during a 30-min spike at the start of implementation (kagent v0.9.0 ships `kagent dashboard`; if it foregrounds, fall back to `kubectl port-forward -n kagent svc/kagent-ui … &` followed by `open http://localhost:…`, picking the form that satisfies NFR-010 *self-contained step*). The step's `explanation` includes a fenced markdown block with the exact prompt to paste into the chat:

  ```
  The mission-control pod in the artemis-uc1 namespace is not coming up. Diagnose it.
  ```
- [ ] Beat 4 (`What we'd have done by hand`) contains no `commands[]` and no `fileEdits`. Pure markdown enumerating the three `kubectl` commands the agent ran on the participant's behalf, framed as *friction the participant skipped*. Lifts copy from STORY-030's worked example.
- [ ] Tour `id` is unchanged: `kagent-uc1-imagepullbackoff` (per convention's stability rule).
- [ ] `uc1/README.md`:
    - The *Artemis narrative* section is rewritten to match the no-spoiler reading order of the tour. The participant-facing arc must not pre-announce the `:v999` tag.
    - The *The bug*, *Expected agent diagnosis*, and *Reproduction* sections (author-facing) may keep their full technical detail — they are not read by participants.
    - The *Files in this directory* section is updated only if filenames change (they should not).
- [ ] `make validate-tours` is run locally and is green.
- [ ] NFR-003 reproduction (3 cold deploys) is re-walked manually by the author with the rewritten tour. Each iteration must reach the same broken-state checks (a)/(b)/(c) documented in `uc1/README.md`. Sign-off recorded in the PR description.
- [ ] PR cross-reviewed by Quentin (NFR-008). UC2 deferred cross-author repro on UC1 (per `sprint-status.yaml` STORY-014 note) is **not** absorbed by this story — it stays on the M5 dry-run track.

---

## Technical Notes

### Beat 3 spike (kagent v0.9.0 UI invocation)
Kagent v0.9.0 ships a web UI; the upstream CLI exposes `kagent dashboard` to port-forward and open it. Two implementation forms are candidates:

1. **`kagent dashboard`** — single line, idiomatic. Verify whether it foregrounds (blocks the terminal) or backgrounds. If it foregrounds, the workshop-tour extension's command button will hang the step; that violates NFR-010.
2. **`kubectl port-forward -n kagent svc/kagent-ui 8080:80 >/dev/null 2>&1 & open http://localhost:8080`** — explicit, backgrounded, self-contained. More verbose but predictable across kagent CLI changes.

Spike during the first 30 min of implementation: try (1) on the local kind cluster after `make kagent-install`. If it backgrounds cleanly, prefer it; otherwise use (2). Whichever wins, document it in a one-line comment in `uc1/tour.json` Beat 3's `explanation` so future authors know why.

### Prompt copy
The chat prompt the participant pastes is:

> The mission-control pod in the artemis-uc1 namespace is not coming up. Diagnose it.

This is the same task string the M2 `kagent invoke` used. Reusing it preserves the agent's expected behaviour.

### Files modified
- `uc1/tour.json` — full content rewrite (steps[] reshaped). Tour ID unchanged.
- `uc1/README.md` — narrative section rewrite; reproduction section adjusted only if Beat numbering changes (it does — author-facing copy must reflect that the tour now has 4 beats not 3+1).

### Files NOT modified (intentional)
- `uc1/manifests/{00-namespace,10-service,20-deployment}.yaml` — broken state unchanged.
- `uc1/agents/{agent,modelconfig}.yaml` — agent CRD + ModelConfig unchanged.
- `schemas/workshop-tour.schema.json` — no schema change needed.
- `docs/tour-content-conventions.md` — STORY-030's job, not this story's.

### NFR/FR references
- FR-008: scenario package — bug deterministic, manifests reproducible. Unchanged.
- FR-009: UC1 tour content — this story is the patched implementation.
- NFR-003: cold-deploy reproduction — re-walk required.
- NFR-008: cross-author review — required on the PR.
- NFR-009: English copy — preserved.
- NFR-010: self-contained tour steps — Beat 3 spike outcome must satisfy this.
- NFR-011: no secrets — preserved (no auth, no keys in tour content).

---

## Dependencies

**Prerequisite stories:**
- **STORY-030 (Mission-framing tour convention update)** — must merge first. STORY-031 is an application of STORY-030's convention.

**Blocked stories:** none. UC3 (STORY-020) and UC4 (STORY-026) tours pick up STORY-030 directly; they do not need STORY-031 to land first.

**External dependencies:**
- kagent v0.9.0 dashboard surface accessible after `make kagent-install`. If a fresh install on kind does not expose the UI out of the box, file a follow-up story; do not absorb the install fix into this story.

---

## Definition of Done

- [ ] `uc1/tour.json` rewrite committed.
- [ ] `uc1/README.md` narrative section rewrite committed.
- [ ] All AC ticked.
- [ ] Beat 3 spike outcome (which UI invocation form was chosen) recorded in tour and PR description.
- [ ] `make validate-tours` clean locally.
- [ ] NFR-003 reproduction signed off (3 cold deploys, three OK lines for checks (a)/(b)/(c) in PR description).
- [ ] PR reviewed and approved by Quentin.
- [ ] STORY-031 entry in `docs/sprint-status.yaml` updated to `status: completed` with `completion_date` and `actual_points`.
- [ ] Merged to `main`.

---

## Story Points Breakdown

- **Beat 1 (mission setup) rewrite — careful no-spoiler prose:** 0.5
- **Beat 2 (status check) reformulation:** 0.5
- **Beat 3 (UI/chat) including v0.9.0 invocation spike + prompt embedding:** 2.5
- **Beat 4 (manual recap) lifting from STORY-030 worked example:** 0.5
- **`uc1/README.md` narrative + reproduction walk:** 1.0
- **PR cross-review (Quentin) coordination:** 0
- **Total:** 5 points

**Rationale:** The spike on the UI invocation form (Beat 3) is the only meaningful unknown. Beats 1/2/4 are mostly prose work. Reproduction re-walk is an hour, not a day.

---

## Additional Notes

- The agent's expected answer is unchanged from M2 — same CRD, same tools (`k8s_get_pod`, `k8s_describe_pod`, `k8s_get_events`), same root-cause synthesis. Only the participant's *path to invoking it* changes.
- If the kagent UI in v0.9.0 does not preserve participant input across browser reloads, the markdown block telling the participant exactly what to paste is the contingency: the prompt is always re-pastable, even if the chat session resets.
- Per convention, the tour `id` `kagent-uc1-imagepullbackoff` is **stable**. It already lives in `workshop-infrastructure`'s distribution config and in participant `.workshop-tour/state.json` — never rename.

---

## Progress Tracking

**Status History:**
- 2026-05-04: Created (Scrum Master, /create-story).
- 2026-05-04: Implemented (Developer, /dev-story).

**Actual Effort:** 5 points (matched estimate).

### Implementation Notes (2026-05-04)

#### Convention follow-ups landed in this commit
Two convention refinements were caught during STORY-031 PR review and landed alongside the UC1 changes (STORY-030 follow-up):

1. **No-spoiler rule extended** to `title` and `description` — not just Beat 1's `explanation`. The description renders before Beat 1 in the workshop-tour side-bar, so a spoilery description ("Diagnose an `ImagePullBackOff`…") defeats the entire 4-beat structure. Bug-class names (`ImagePullBackOff`, `Pending`, `OOMKilled`, …) are now banned in `title`/`description`/Beat 1. See `docs/tour-content-conventions.md` §`The no-spoiler rule`. UC1's description was rewritten to mission-framing copy; UC2's description got an interim patch (full UC2 tour rewrite owned by STORY-032).
2. **Beat 2 tightened to a minimal status check** — typically a single `kubectl get pods` that surfaces the friction. The deeper diagnosis (`describe pod`, `get events`, …) was overlapping with Beat 4 and muting the agent's payoff. The dropped commands now live exclusively in Beat 4, framed as *"what we'd have done by hand without the agent"*. UC1 Beat 2 reduced from 3 commands to 1; UC1 Beat 4 reframed accordingly. STORY-032's plan was updated to reflect the same rule for UC2 (Beat 2 = single `get pods`; Beat 4 = the five-command cross-resource recap).

#### Beat 3 spike outcome — `kagent dashboard` chosen
Probed the kagent CLI on the local dev box (`v0.7.1` installed; `dashboard` subcommand surface stable across upstream releases — workshop targets v0.9.0 per Makefile). `kagent dashboard --help` confirms a single, flag-less command that opens the dashboard. Behaviour: foregrounds the port-forward of `svc/kagent-ui` in the `kagent` namespace and auto-opens the browser at `http://localhost:8083` (the default `--kagent-url`); stays alive until the participant hits `Ctrl+C`.

This is good enough for NFR-010 *self-contained step*: one command, no env preconditions, no chained `&` job-control. The trade-off is that the terminal is busy until `Ctrl+C` — that's acceptable for a workshop step (the participant is supposed to leave the dashboard open while they read the agent's reply). The rejected alternative was the explicit `kubectl port-forward -n kagent svc/kagent-ui 8083:80 >/dev/null 2>&1 & open http://localhost:8083` chain, which is more verbose and forces the participant to remember to kill the backgrounded port-forward later.

The chosen form is documented inline in the Beat 3 `explanation` (italics one-liner) per `docs/tour-content-conventions.md` §`Beat 3 invocation`.

#### Tour rewrite
- Step count: 4 → 4 (was Apply / CLI baseline / Now ask the agent / What did the agent do better; now Mission setup / Mission status check / Call the agent for help / What we'd have done by hand).
- Tour `id` unchanged: `kagent-uc1-imagepullbackoff`.
- Title kept (`UC1 — Mission control's roster won't come online`); description softly retuned to mention the dashboard chat.
- Beat 1 `fileEdits` lifted byte-for-byte from M2 — manifests stay identical (the working-tree comment-removal in `uc1/manifests/20-deployment.yaml` is out-of-scope of STORY-031 and was not embarked).
- Beat 1 `explanation` rewritten as a no-spoiler mission setup; verified clean via Python regex scan of the banned-word list (script-checked: no hits).
- Beats 2 / 3 / 4 follow the STORY-030 worked example.

#### `uc1/README.md` updates
Three precise edits, all in author-facing prose:
1. `Artemis narrative` section rewritten to no-spoiler reading order (no `:v999`, no "the kubelet is dutifully retrying an image pull that will never succeed"); added pointers to `docs/tour-content-conventions.md` for the 4-beat structure.
2. "next beat" reference in §`The bug` updated to name the new beats explicitly (`Mission status check` and `Call the agent for help`).
3. Beat reference at the end of §`Expected agent diagnosis` updated from Beat 3 (old "What did the agent do better?") to Beat 4 (new "What we'd have done by hand"), with the framing flipped to "the participant skipped".
The §`The bug`, §`Expected agent diagnosis`, and §`Reproduction` sections keep their full author-facing technical detail per AC.

#### Validation
- `make validate-tours` green over `uc1/tour.json` and `uc2/tour.json` (schema unchanged, structural shape preserved).
- Beat 1 banned-word scan clean (12 banned words + `v999` literal — no hits).

### AC sign-off
8/9 acceptance criteria satisfied as of 2026-05-04:

- [x] `uc1/tour.json` rewritten under STORY-030's convention — exactly four beats in the prescribed order.
- [x] Beat 1 explanation banned-word-clean (script-verified). `fileEdits[]` byte-identical to M2.
- [x] Beat 2 keeps the three M2 `kubectl` commands; copy reframed as mission-status verification.
- [x] Beat 3 single `commands[]` entry = `kagent dashboard`; markdown prompt block with the exact paste text included; chosen form documented in step `explanation`.
- [x] Beat 4 contains no `commands[]` and no `fileEdits` — pure markdown manual recap; lifts STORY-030's worked example verbatim.
- [x] Tour `id` unchanged: `kagent-uc1-imagepullbackoff`.
- [x] `uc1/README.md` Artemis narrative rewritten to no-spoiler reading order; author-facing sections preserved.
- [x] `make validate-tours` green locally.
- [ ] **NFR-003 reproduction (3 cold deploys)** — deferred to PR / M5 dry-run. Manifests are byte-identical to M2 so the cluster broken state is unchanged; only the tour text + Beat 3 invocation method need a real kagent-dashboard walk-through, which requires a kind cluster + `make kagent-install`. This is the same deferral pattern STORY-014 used for cross-author repro.
- [ ] PR cross-reviewed by Quentin (NFR-008) — lands when the diff is opened as a PR.

### Next
Two open DoD checkboxes survive: NFR-003 reproduction and PR cross-review. Both land naturally when STORY-031 is opened as a PR — the M5 dry-run (STORY-028) is already designed to absorb the deferred reproductions across UC1/UC2.

---

**This story was created using BMAD Method v6 - Phase 4 (Implementation Planning).**
