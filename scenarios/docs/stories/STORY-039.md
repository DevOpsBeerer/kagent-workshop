# STORY-039: UC2 Beat 3 CLI output (pipe to jq or refit)

**Epic:** EPIC-002 (UC1 / UC2 implementations)
**Priority:** Should Have
**Story Points:** 2
**Assigned To:** Quentin Rodic (UC2 owner)
**Status:** Not Started
**Created:** 2026-05-05
**Sprint:** 6 (M6 post-dry-run patch, 2026-05-06 → 2026-05-15)
**Source:** Dry-run journal 2026-05-05 16:38, severity `issue`.

---

## User Story

As a **workshop participant calling the agent via the terminal in UC2**,
I want **the CLI output to be readable, not a wall of A2A protocol JSON**,
So that **I can see the agent's diagnosis at a glance and understand why the CLI path is a real ops scenario, not just JSON soup.**

---

## Background

The current UC2 Beat 3 runs `kagent invoke --agent ... --task '...'` raw. The CLI returns the full A2A Task JSON: artifacts, contextId, complete history (every tool call and tool response), metadata, status. The actual one-sentence diagnosis sits at the bottom inside `artifacts[0].parts[0].text`. From a terminal-reader perspective, this is unreadable. The dry-run on 2026-05-05 surfaced this as a pedagogical breakdown of UC2's "CLI as the operational mode" pitch.

## Scope

**In scope:**
- Pick one of two paths during implementation, documented in `uc2/README.md` Author notes:
  - **Path A (tactical):** wrap `kagent invoke` with `jq` to extract only the final answer, e.g. `kagent invoke ... | jq -r '.artifacts[0].parts[-1].text'`. Optionally add a second command that prints the full JSON for the curious.
  - **Path B (strategic):** refit Beat 3 into a realistic CLI-ops scenario. Example: an on-call shell snippet that pipes the diagnosis into a logger / Slack message / file, demonstrating why an ops would use the CLI path in real life. Updates the `tour-content-conventions.md` definition of the CLI invoke variant.
- Update `uc2/tour.json` Beat 3 with the chosen form.
- Update `uc2/README.md` Author notes: rationale for the chosen path, including what the rejected path would have looked like.
- If Path B is chosen, update `docs/tour-content-conventions.md` §`Beat 3 invocation: UI/chat vs CLI invoke` to describe the CLI invoke variant as "scripted / pipe-friendly" rather than "raw `kagent invoke`".

**Out of scope:**
- Changing UC4's CLI invocations (`kmcp build`, etc.) which have a different shape.
- The agent CRD or task string (the diagnostic prompt stays).
- UC1's UI/chat invocation.

---

## Acceptance Criteria

- [ ] `uc2/tour.json` Beat 3 has the chosen form (Path A or Path B) with a `commands[]` that produces a human-readable terminal output containing the agent's final diagnostic sentence and nothing else by default.
- [ ] If Path A: the `jq` selector matches the A2A Task shape across runs; if the shape changes upstream, the failure mode is a clear error message, not a confusing partial output.
- [ ] If Path B: the realistic-CLI scenario is non-trivial (one pipe at minimum) and explained briefly in the step explanation.
- [ ] `uc2/README.md` Author notes section explains why the chosen path was selected and what the rejected path would have been.
- [ ] `docs/tour-content-conventions.md` updated only if Path B is taken: the CLI invoke variant description becomes scripted-CLI rather than raw-invoke.
- [ ] `make validate-tours` green over all 5 tours.
- [ ] No em dashes.
- [ ] Manual run on kind: the participant sees one short answer in the terminal, no JSON wall.

---

## Technical Notes

- A2A response shape on kagent v0.9.0: `artifacts[0].parts[0]` is the *agent's first answer fragment*; the final synthesised answer is usually in `artifacts[0].parts[-1].text` (last fragment) OR `history[-1].parts[0].text` (last message in the message thread). Verify the selector against several runs before pinning.
- `jq` is on `PATH` per the workshop slice and is installable on kind / local. No extra prereq.
- For Path B, a worked example is a `tee` of the answer into a fictional incident log: `kagent invoke ... | jq -r '...' | tee /tmp/uc2-diagnosis.log`. The point is to surface that "CLI" means "pipeable", which is why an ops would use this over the UI in scripted contexts.

---

## Dependencies

**Prerequisite stories:** none.
**Blocks:** none.
**Related:** STORY-032 (UC2 tour rewrite under the mission-framing convention) is the parent; this story is a follow-up on the Beat 3 output specifically.

---

## Definition of Done

- [ ] All AC satisfied.
- [ ] `make validate-tours` green locally.
- [ ] Author note in `uc2/README.md` documents the chosen path.
- [ ] PR cross-reviewed by Clément.
- [ ] `docs/sprint-status.yaml` updated: STORY-039 → `completed`.

---

## Story Points Breakdown

- Decision (Path A vs Path B) + selector probing: 0.5 pt
- Tour step rewrite + README author note: 1 pt
- Convention update (only if Path B): 0.5 pt
- **Total: 2 pts**

---

## Progress Tracking

**Status History:**
- 2026-05-05: Created (Scrum Master, /create-story, post dry-run).

**Actual Effort:** TBD.
