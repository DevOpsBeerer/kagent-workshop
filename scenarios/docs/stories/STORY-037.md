# STORY-037: UC1 framing tightening (name the user-visible symptom alongside the lore)

**Epic:** EPIC-002 (UC1 / UC2 implementations)
**Priority:** Should Have
**Story Points:** 2
**Assigned To:** Clément Raussin (UC1 owner)
**Status:** Completed (2026-05-17)
**Created:** 2026-05-05
**Sprint:** 6 (M6 post-dry-run patch, 2026-05-06 → 2026-05-15)
**Source:** Dry-run journal 2026-05-05 16:31, severity `issue`.

---

## User Story

As a **workshop participant working through UC1**,
I want **the tour to clearly say in tutorial terms what is failing on the user side (not only in lore)**,
So that **I can map the Artemis story back to the real Kubernetes symptom and stay grounded in the tech tutorial.**

---

## Background

The current UC1 Beat 2 (Mission status check) frames the friction inside the Artemis lore: "mission control's roster won't come online". Fun and on-thread, but a participant lands without the explicit tech-tutorial signal of *what the user sees fail*. The dry-run on 2026-05-05 surfaced this as a missing layer: lore is good, but the tutorial also needs to name the user-visible symptom in plain terms (e.g. "a crew member tried to reach the roster and got an inaccessible response"), then return to the lore.

## Scope

**In scope:**
- Tighten `uc1/tour.json` Beat 2 (`Mission status check`) and where useful Beat 1, so the explanation names the user-visible symptom in one short sentence alongside the lore.
- Same light pass on `uc2/tour.json` Beat 2 (which has the same Mission status check beat).
- Add a convention sentence in `docs/tour-content-conventions.md` §`The 4 beats` table row for Beat 2: "Beat 2 names a user-visible symptom (a crew member tried to do X and got Y) in addition to the lore framing".

**Out of scope:**
- UC3 and UC4 (different shape, addressed by future patches or by STORY-042 density pass).
- Beat 1 mission setup, which stays no-spoiler.
- Beat 3 and Beat 4 prose.

---

## Acceptance Criteria

- [ ] `uc1/tour.json` Beat 2 explanation contains a single sentence in the participant-facing tutorial register, naming what a user (or crew member, to keep the lore) would observe as the failure. Example pattern: "If a crew member tries to reach mission-control right now, they will see the roster does not respond yet."
- [ ] Same pattern applied to `uc2/tour.json` Beat 2.
- [ ] The no-spoiler rule still holds (no bug-class names like `ImagePullBackOff` / `Pending` / `OOMKilled` in Beat 1 or in the new sentences).
- [ ] `docs/tour-content-conventions.md` §`The 4 beats` Beat 2 row gets a one-line addendum codifying the user-visible-symptom rule.
- [ ] `docs/tour-content-conventions.md` §`Quick checklist` gets a matching item: "Beat 2 names a user-visible symptom alongside the lore".
- [ ] `make validate-tours` green over all 5 tours.
- [ ] No em dashes in any new prose.

---

## Technical Notes

- Pure prose work. No manifest / agent / CRD change. No code.
- Keep the change to Beat 2 explanation only; Beat 2 commands list stays the single `kubectl get pods` per the STORY-030 follow-up convention.
- The user-visible symptom is named in **tutorial register**, not as a kubectl artefact. Phrasing should not duplicate Beat 4's manual recap.

---

## Dependencies

**Prerequisite stories:** none (operates on already-merged UC1 / UC2 tours).
**Blocks:** none.
**Related:** STORY-042 (density pass + convention rule), which may absorb the prose-tweak side of this story.

---

## Definition of Done

- [ ] All AC satisfied.
- [ ] `make validate-tours` green locally.
- [ ] `scripts/sync-workshop-tour.sh` refreshes `.workshop-tour/` with the new prose.
- [ ] PR cross-reviewed by Quentin.
- [ ] `docs/sprint-status.yaml` updated: STORY-037 → `completed`.

---

## Story Points Breakdown

- UC1 + UC2 Beat 2 prose tweak: 1 pt
- Convention rule addendum + checklist: 0.5 pt
- Validate + sync + cross-review: 0.5 pt
- **Total: 2 pts**

---

## Progress Tracking

**Status History:**
- 2026-05-05: Created (Scrum Master, /create-story, post dry-run).
- 2026-05-17: Implemented (Developer, /dev-story).

**Actual Effort:** 2 points (matched estimate).

### Implementation Notes (2026-05-17)

Pure prose tweak, no command / manifest / agent change. Beat 2 explanations of UC1 and UC2 were re-framed around a clear three-part structure: (1) short lore intro naming the application's purpose in the mission, (2) tutorial objective stating the healthy state the participant should see, (3) **no failure announcement**. The participant observes the raw pod state; the agent in Beat 3 stays the canonical reveal of what's actually wrong.

The first iteration of this story appended a "what a crew member would see" failure-side sentence to each Beat 2 explanation. The operator caught that this implicitly spoiled the workshop's discovery moment ("if the pod is not Running, that's our cue to call in help" + "a crew member would get nothing back: the user-visible failure"). The revised framing keeps the lore intro but drops the failure announcement; the participant's path to the agent is no longer conditioned on "I saw the pod is broken", it is simply the next tour step.

Per-file:

- `uc1/tour.json` Beat 2 `explanation`: rewritten with the new three-part structure. Lore intro: every crew member opening their dashboard at shift start hits `mission-control`. Objective: pod should be `Running` and `Ready`. No mention of failure modes.
- `uc2/tour.json` Beat 2 `explanation`: same shape. Lore intro: heavier pad-shift load motivates a second replica. Objective: new replica should be `Running` and `Ready` alongside the existing one.
- `docs/tour-content-conventions.md` §`The 4 beats` Beat 2 row: rewritten to codify the three-part structure (lore intro + tutorial objective, no pre-announced failure, agent in Beat 3 is the canonical reveal).
- `docs/tour-content-conventions.md` §`Quick checklist` Beat 2 entry: matching item.

A wider banned-word scan than the convention's base list (adding `pending`, `crashloop`, `imagepullbackoff`, `oomkilled`, `our cue to call`, `user-visible failure`) confirms both UC1 and UC2 Beat 2 are spoiler-free.

`make validate-tours` green over all 5 tours. No em dashes in any new prose.

### AC sign-off

- [x] UC1 Beat 2 explanation has a short lore intro naming the application's purpose in tutorial register.
- [x] Same pattern applied to UC2 Beat 2.
- [x] **Stronger than original AC:** explanation does **not** announce the failure. The agent in Beat 3 stays the canonical reveal of what's wrong (per operator clarification during /dev-story).
- [x] No-spoiler rule holds (no bug-class names, no banned words, no failure-side language).
- [x] `docs/tour-content-conventions.md` §`The 4 beats` Beat 2 row rewritten around the three-part structure.
- [x] §`Quick checklist` Beat 2 matching item.
- [x] `make validate-tours` green over all 5 tours.
- [x] No em dashes in any new prose.
- [ ] PR cross-reviewed by Quentin (NFR-008) — lands when the diff is opened as a PR.
