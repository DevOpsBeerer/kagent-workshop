# STORY-037: UC1 framing tightening (name the user-visible symptom alongside the lore)

**Epic:** EPIC-002 (UC1 / UC2 implementations)
**Priority:** Should Have
**Story Points:** 2
**Assigned To:** Clément Raussin (UC1 owner)
**Status:** Not Started
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

**Actual Effort:** TBD.
