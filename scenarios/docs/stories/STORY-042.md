# STORY-042: Tour explanation density: convention rule + pass across all UCs

**Epic:** EPIC-001 (foundational conventions)
**Priority:** Should Have
**Story Points:** 5
**Assigned To:** joint (Clément + Quentin)
**Status:** Not Started
**Created:** 2026-05-05
**Sprint:** 6 (M6 post-dry-run patch, 2026-05-06 → 2026-05-15)
**Source:** Dry-run journal 2026-05-05 16:42 + 16:46, severity `issue`.

---

## User Story

As a **workshop participant clicking through a tour step**,
I want **the explanation to lead me to the next action in a glance, not a paragraph**,
So that **I spend time on the workshop's pedagogical demonstration (running commands, watching the agent work, observing the result), not on parsing the prose around it.**

---

## Background

The 2026-05-05 dry-run surfaced a cross-cutting density problem: tour `explanation` blocks pack lore framing, mechanism explanation, and rationale into single dense paragraphs. The participant has to read a paragraph to find the next click. The user noted it generally at 16:42 and again specifically on UC4 at 16:46: *"l'intro est lourde, faut etre plus synthétique dans les explications / clair / langage simple globalement"*.

UC4 (the workshop climax) is the most affected because its tour content is the longest and most layered. UC1, UC2, UC3 are also affected but to a lesser degree.

## Scope

**In scope:**
- Add a convention rule to `docs/tour-content-conventions.md`:
  - Tour `explanation` is a tight pedagogical lead, not a doc body.
  - Suggested structure per beat: one short sentence framing the action, then a bulleted list of what to look at or expect, then optionally one short payoff sentence.
  - Background, rationale, and engineering context live in the UC's `README.md` Author notes, never in `explanation`.
  - Soft length cap: aim for ~80 words per `explanation` block; flagged in PR review when exceeded without a justified reason.
- Apply a density pass to all 5 UCs (UC0 to UC4), in priority order:
  1. UC4 (workshop climax, most affected).
  2. UC0 (first contact, sets the participant's reading register).
  3. UC1, UC2, UC3 (existing tours, condense where possible).
- Update `docs/tour-content-conventions.md` §`Quick checklist` with a new line for explanation length / density.
- Where useful, relocate excised content into the per-UC `README.md` Author notes (no information loss, just the right reader).

**Out of scope:**
- UC content changes beyond prose density (the commands, fileEdits, agents, manifests, narrative structure stay).
- Convention rules about Beat 3 structure (covered by STORY-038) or Beat 2 user-symptom framing (covered by STORY-037).
- A pass on convention docs and READMEs themselves; this story is about the participant-visible tour text.

---

## Acceptance Criteria

- [ ] `docs/tour-content-conventions.md` has a new section or subsection codifying explanation density: lead sentence, bulleted what-to-watch, optional payoff, ~80-word soft cap, rationale lives in author notes.
- [ ] §`Quick checklist` has a matching item: "Explanation: short lead + bullets, rationale in author notes, length under ~80 words unless justified."
- [ ] All `explanation` blocks across `uc0/tour.json` through `uc4/tour.json` revisited and tightened. Each block follows the new structure: one short lead sentence then a bulleted list, optionally one closing sentence.
- [ ] No information is lost: anything cut from `explanation` is captured in the corresponding `uc<N>/README.md` Author notes when it has engineering value.
- [ ] `make validate-tours` green over all 5 tours after the pass.
- [ ] No em dashes in any of the rewritten prose.
- [ ] PR cross-review: both authors sign off on the convention rule and the density pass.

---

## Technical Notes

- This story is the most cross-cutting one in Sprint 6. Coordinate with STORY-037 (UC1 framing) and STORY-038 (UC1 Beat 3 expansion) so the UC1 prose pass happens once: either bundle into STORY-038's PR or run STORY-042 after the others ship.
- The 80-word cap is a soft target. Some beats legitimately need more (Beat 4 manual recap may exceed because it lists kubectl commands). Document the exceptions in the convention rule.
- A pre-merge `wc -w` check on each `explanation` block is useful but not required as CI. Manual review suffices for one-shot pass.

---

## Dependencies

**Prerequisite stories:** none (operates on already-merged tour content).
**Blocks:** none directly, but coordinates with STORY-037 / STORY-038 / STORY-040 / STORY-041 (all touch tour prose).
**Related:** STORY-034 (No meta-references rule) set the precedent for relocating tour-internal author commentary into README author notes.

---

## Definition of Done

- [ ] All AC satisfied.
- [ ] `make validate-tours` green locally.
- [ ] `scripts/sync-workshop-tour.sh` refreshes `.workshop-tour/` with the new prose.
- [ ] Manual walk-through (or visual scan) on all 5 tours: a participant can read each explanation in under 20 seconds.
- [ ] PR cross-reviewed by both authors.
- [ ] `docs/sprint-status.yaml` updated: STORY-042 → `completed`.

---

## Story Points Breakdown

- Convention rule draft + checklist update: 1 pt
- Density pass on UC4: 1 pt
- Density pass on UC0: 0.5 pt
- Density pass on UC1, UC2, UC3 (concurrent with related stories): 1.5 pt
- Cross-review coordination + sprint-status close: 1 pt
- **Total: 5 pts**

---

## Progress Tracking

**Status History:**
- 2026-05-05: Created (Scrum Master, /create-story, post dry-run).

**Actual Effort:** TBD.
