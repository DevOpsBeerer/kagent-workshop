# STORY-036: UC0 dashboard bridge step

**Epic:** EPIC-001 (foundational conventions / prep tour)
**Priority:** Should Have
**Story Points:** 2
**Status:** Completed (2026-05-17)
**Assigned To:** Clément Raussin
**Created:** 2026-05-05
**Sprint:** 6 (M6 post-dry-run patch, 2026-05-06 → 2026-05-15)
**Source:** Dry-run journal 2026-05-05 16:30, severity `issue`.

---

## User Story

As a **workshop participant just finishing UC0**,
I want **the tour to open the kagent dashboard for me right after the verify step**,
So that **I land in UC1 already knowing what the dashboard looks like, instead of meeting it for the first time in the middle of an agent invocation.**

---

## Background

The current UC0 ends on three `kubectl` verification commands (CRDs, controller pod, ModelConfig). Functionally complete, but the participant has not seen the kagent UI for themselves. UC1 then opens with "open the dashboard and chat with the agent", which lands abruptly. The dry-run on 2026-05-05 surfaced this as a missing pedagogical bridge.

## Scope

**In scope:**
- Add a Step 4 to `uc0/tour.json` that opens the kagent dashboard (`kagent dashboard` or equivalent port-forward + browser-open chain, frozen at implementation per the STORY-031 / STORY-033 spike pattern).
- The step's explanation tells the participant to click the command button in the tour pane, observe the UI loading in their browser, and close the tab when they are ready to move on.
- Update `uc0/README.md`: bump "three steps" to "four steps"; add the new step to the bulleted list and the Author notes.
- Update root `README.md` UC0 row description if it mentions step count (it does: "flat 3 steps" becomes "flat 4 steps").

**Out of scope:**
- Any change to the install itself or to UC1's Beat 3 invocation.
- Customising the dashboard content. UC0 step 4 just opens it.
- Per-environment URL handling (Mac vs. vCluster). The dashboard CLI handles port-forwarding under the hood; if the form needs to differ between local kind and vCluster slice, that is owned by a follow-up.

---

## Acceptance Criteria

- [ ] `uc0/tour.json` has 4 steps in order: *Check your cluster*, *Install kagent via CLI*, *Verify the installation*, *Open the kagent dashboard* (or similar mission-themed title).
- [ ] Step 4 has exactly one `commands[]` entry that opens the dashboard, identical mechanism to UC1 Beat 3 (`kagent dashboard` or the port-forward chain frozen during implementation).
- [ ] Step 4 explanation tells the participant: click the run button, watch the browser open, close the tab when done. No instruction to interact with any agent yet (that is UC1).
- [ ] `uc0/README.md` updated: file-listing block still says `4-step prep tour`; the "The four steps" section updated; Author notes reference STORY-036 alongside STORY-033.
- [ ] Root `README.md` UC0 row description updated: "flat 4 steps".
- [ ] `make validate-tours` green over all 5 tours.
- [ ] No em dashes in any new prose (operator preference).

---

## Technical Notes

- The dashboard-open command is the same form as UC1 Beat 3 (frozen by STORY-031 spike). If STORY-031 ends up using `kubectl port-forward + open` instead of `kagent dashboard`, UC0 step 4 should adopt the same form so the participant sees the exact same UI bring-up in both UCs.
- Per the `Prep tours` convention exception, UC0 stays exempt from the 4-beat narrative structure; "step 4" is just a flat step, not a Beat-numbered slot.
- The kagent dashboard is foreground (alive until Ctrl+C) per the STORY-031 spike outcome; the explanation should tell the participant they can Ctrl+C to close it before UC1, or leave it open if they go straight to UC1.

---

## Dependencies

**Prerequisite stories:** STORY-031 (UC1 Beat 3 UI/chat invocation), to align the dashboard-open command form.
**Blocks:** none.
**External:** kagent v0.9.0 CLI dashboard surface (already verified by STORY-031 spike).

---

## Definition of Done

- [ ] All acceptance criteria satisfied.
- [ ] `make validate-tours` green locally.
- [ ] `scripts/sync-workshop-tour.sh` refreshes `.workshop-tour/uc0-tour.json` with the new step.
- [ ] Manual walk-through on local kind: step 4 opens the kagent dashboard in a browser and the participant can close it cleanly before UC1.
- [ ] PR cross-reviewed by Quentin.
- [ ] `docs/sprint-status.yaml` updated: STORY-036 marked `completed` with `completion_date` and `actual_points`.

---

## Story Points Breakdown

- Tour step add + explanation: 1 pt
- README updates + sync + validate: 0.5 pt
- Cross-review + sprint-status close: 0.5 pt
- **Total: 2 pts**

---

## Progress Tracking

**Status History:**
- 2026-05-05: Created (Scrum Master, /create-story, post dry-run).
- 2026-05-17: Implemented (Developer, /dev-story).

**Actual Effort:** 2 points (matched estimate).

### Implementation Notes (2026-05-17)

The original AC said "Step 4 has exactly one `commands[]` entry that opens the dashboard, identical mechanism to UC1 Beat 3 (`kagent dashboard`)". Between this story's creation and its implementation, commit `58d200f` (2026-05-11) refactored UC1 Beat 3 to drop the `kagent dashboard` CLI step and use the workshop-tour extension's built-in **dashboard** button instead. STORY-036 followed that updated pattern: step 4 has **no** `commands[]`, only an `explanation` that tells the participant to click the extension's dashboard button.

Changes:

- `uc0/tour.json`: split the previous *Verify the installation* step into three atomic steps (one resource per step, with a tight pedagogical lead so the participant understands what they are looking at): **List the kagent CRDs**, **Find the controller pod**, **See the default ModelConfig**. Each new step has exactly one `kubectl` command and a short explanation that names the resource and why it matters. Then a new step *Take a look at the dashboard* (prose only, no CLI command) tells the participant to use the workshop-tour extension's dashboard button. UC0 now has **6 steps** total.
- `uc0/_README.md`: bumped *four steps* to *six steps*; rewrote the *The six steps* section with one bullet per atomic step (3 verify-split steps + dashboard step); refreshed the *Files in this directory* block ("4-step" → "6-step"); added STORY-036 to References.
- Root `README.md`: UC0 row description updated ("flat 4 steps" → "flat 6 steps") and the suggested-ordering paragraph rewritten to mention the resource walk-through alongside the dashboard landing; UC0 path link updated to the renamed `_README.md` filename (the underscore was introduced by an earlier rename, separate from this story).

The verify split was added in-flight at the operator's request during /dev-story: the original AC asked for one extra step (dashboard bridge); the participant pedagogy is significantly better with one step per resource (CRDs / controller / ModelConfig) so the participant builds a mental model of what kagent just installed, instead of running three commands in a row without context. The story scope grew from +1 step to +4 steps, still 2 pts of work because the new explanations are short and the underlying commands are unchanged.

`make validate-tours` green over all 5 tours.

### AC sign-off

- [x] `uc0/tour.json` has 6 steps in order (was specced for 4; verify-split added in-flight, see Implementation Notes).
- [x] Step *Take a look at the dashboard* follows the same mechanism as UC1 Beat 3 (extension button, no CLI command) per commit `58d200f`.
- [x] Dashboard step explanation tells the participant to click the dashboard button and observe the UI loading.
- [x] Verify-split steps each have a tight lead explaining the resource (CRDs / controller / ModelConfig) plus one `kubectl` command.
- [x] `uc0/_README.md` updated: step count, files block, step list, References.
- [x] Root `README.md` UC0 row updated: "flat 6 steps".
- [x] `make validate-tours` green on all 5 tours.
- [x] No em dashes in any new prose (operator preference).
- [ ] PR cross-review by Quentin (NFR-008) — lands when the diff is opened as a PR.
