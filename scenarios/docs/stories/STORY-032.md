# STORY-032: UC2 tour rewrite (mission framing, CLI invoke retained)

**Epic:** EPIC-002 (UC1 / UC2 implementations)
**Priority:** Must Have
**Story Points:** 3
**Status:** Not Started
**Assigned To:** Quentin Rodic (UC2 owner)
**Created:** 2026-05-04
**Sprint:** 2.5 (M2.5 patch sprint, 2026-05-05 → 2026-05-08)

---

## User Story

As a **workshop participant playing UC2 after UC1**,
I want **the same Artemis-mission framing on UC2 that I just lived in UC1, with no spoiler in the apply step**,
So that **the cross-resource correlation lesson (pod side vs node side) lands on its own, not because the tour told me where the bug was hiding.**

---

## Description

### Background
The M2 implementation of UC2 (`uc2/tour.json`, STORY-016) opens with an `Apply the broken state` step that tells the participant *"a synthetic node taint blocks scheduling"* and explains the bootstrap Job's exact mechanism. By the time the participant reads `kubectl describe pod`, they already know the answer is on the **node** — the diagnostic insight UC2 is supposed to teach them to *find* has been handed to them in the opening paragraph.

This story rewrites UC2's tour under STORY-030's new convention (mission framing, no spoiler, manual recap at the close). UC2 keeps the **CLI invoke** Beat-3 form intentionally — UC1 has just introduced the kagent UI, and UC2 demonstrates that kagent is also addressable from the operational CLI the participant already knows. Pedagogically, the participant sees both modes across the workshop.

### Scope
**In scope:**
- Rewrite `uc2/tour.json` under STORY-030's 4-beat convention.
- Beat 2 (`Mission status check`) is **a single `kubectl get pods`** showing Pending — that's the friction signal. Per the tightened convention (STORY-030 follow-up, 2026-05-04), Beat 2 must not pre-walk Beat 4's commands; the cross-resource manual diagnosis (`describe pod`, `get events`, `describe node`, …) lives in Beat 4 framed as *"what we'd have done by hand"*. UC2's pedagogical point — that one resource isn't enough — is **made by Beat 4**, not by Beat 2.
- Beat 3 retains `kagent invoke …` CLI invocation (no UI/chat — that's UC1's role).
- Update `uc2/README.md` Artemis narrative section to match the no-spoiler reading order. Author-facing sections (*The bug*, *Expected agent diagnosis*, *Reproduction*) keep their full technical detail.
- Re-walk the NFR-003 cold-deploy reproduction to confirm the rewritten tour still describes a passing path.

**Out of scope:**
- Modifying `uc2/manifests/` (`00-namespace.yaml`, `10-rbac.yaml`, `20-bootstrap-taint-job.yaml`, `30-service.yaml`, `40-deployment.yaml`) — broken state and bootstrap mechanism are bit-for-bit identical to M2.
- Modifying `uc2/agents/` — agent CRD and tool surface unchanged.
- Touching the Beat-3 invocation form. CLI invoke is the chosen UC2 mode for the workshop's tour-of-modes pedagogy (UC1 = UI, UC2 = CLI).
- UC1 / UC3 / UC4 tours.

### User Flow
1. Participant reads **Beat 1 — Mission setup**: *"A replacement `mission-control` replica is going up on the launch pad. Apply the bundle to your vCluster — namespace, RBAC, the launch-pad readiness sweep, service, deployment."* No mention of *taint*, *blocked*, *unsafe*, *broken*.
2. Participant runs the single apply command. Expects success. Behind the scenes (~30 s) the bootstrap Job taints the node and restarts the deployment, leaving the Pod Pending.
3. Participant reads **Beat 2 — Mission status check**: *"Is the new replica live?"* Runs a single `kubectl get pods`, sees the Pod is Pending — that's the friction signal. They don't need to dig further before calling in help.
4. Participant reads **Beat 3 — Call the agent for help**: runs `kagent invoke --agent artemis-launch-pad-debugger …`. Reads the agent's single-sentence synthesis in the terminal.
5. Participant reads **Beat 4 — What we'd have done by hand**: recap of the five `kubectl` commands across two resource kinds the agent ran on their behalf — pod side (`describe pod`, `get events`) **and** node side (`describe node`). The cross-resource lesson lands here.

---

## Acceptance Criteria

- [ ] `uc2/tour.json` is rewritten under STORY-030's convention with **four steps** in four beats: *Mission setup* (1 step), *Mission status check* (1 step, single `kubectl get pods`), *Call the agent for help* (1 step), *What we'd have done by hand* (1 step). Tour `id` unchanged: `kagent-uc2-pod-pending`.
- [ ] Beat 1 (`Mission setup`) explanation contains **none** of the words `taint`, `blocked`, `unsafe`, `broken`, `deliberately`, `intentionally`, `synthetic`, `fault`, `bug`, `wrong`, `error`, `fail`, nor any phrasing that pre-announces the scheduling obstruction. The bundle is framed as a routine launch-pad replica deployment. The `fileEdits[]` content is unchanged from M2 (manifests stay identical, including the existing intent comments inside the YAML — those are for authors, not participants). Tour-level `title` and `description` also follow the no-spoiler rule (no `Pending`, `taint`, etc.).
- [ ] Beat 2 contains a **single** `commands[]` entry: `kubectl get pods -n artemis-uc2 -l app=mission-control` (or equivalent). Copy frames it as a status check ("Is the new replica live?"); the friction (Pending pod) is *discovered*, not announced. The deeper diagnosis (`describe pod`, `get events`, `describe node`) does **not** appear in Beat 2 — it lives in Beat 4 per the tightened convention.
- [ ] Beat 3 (`Call the agent for help`) contains exactly one `commands[]` entry: `kagent invoke --agent artemis-launch-pad-debugger --namespace artemis-uc2 --task '<task-string>'`. The task string is unchanged from M2: `The mission-control pod in the artemis-uc2 namespace is stuck Pending. Diagnose it.`
- [ ] Beat 4 (`What we'd have done by hand`) contains no `commands[]` and no `fileEdits`. Pure markdown enumerating the **five** `kubectl` commands an ops engineer without the agent would have run — `get pods`, `describe pod`, `get events`, `get nodes`, `describe node` — across two resource kinds. The recap explicitly names the cross-resource lesson (one resource wasn't enough; the agent crossed pod and node sides in a single synthesis). Lifts copy patterns from STORY-030's worked example, scaled to UC2's two-resource correlation.
- [ ] Tour `id` is unchanged: `kagent-uc2-pod-pending` (per convention's stability rule).
- [ ] `uc2/README.md`:
    - The *Artemis narrative* section is rewritten to match the no-spoiler reading order of the tour. The participant-facing arc must not pre-announce the taint mechanism.
    - The *The bug*, *Expected agent diagnosis*, and *Reproduction* sections (author-facing) may keep their full technical detail.
- [ ] `make validate-tours` is run locally and is green.
- [ ] NFR-003 reproduction (3 cold deploys) is re-walked manually with the rewritten tour. Each iteration reaches the same broken-state checks documented in `uc2/README.md`. Sign-off recorded in the PR description.
- [ ] PR cross-reviewed by Clément (NFR-008). The deferred cross-author repro on UC2 from M2 (per `sprint-status.yaml` STORY-017 note) is **not** absorbed by this story — it stays on the M5 dry-run track.

---

## Technical Notes

### Files modified
- `uc2/tour.json` — full content rewrite (steps[] reshaped). Tour ID unchanged. STORY-031 already shipped a no-spoiler `description` patch as an interim — STORY-032 may keep that wording or refine it.
- `uc2/README.md` — Artemis narrative section rewrite; reproduction step numbers may shift if step count changes (M2 had 6 steps including `Apply` + 2 CLI baselines; new tour has **4 steps in 4 beats** under the tightened minimal-Beat-2 convention).

### Files NOT modified (intentional)
- `uc2/manifests/{00-namespace,10-rbac,20-bootstrap-taint-job,30-service,40-deployment}.yaml` — bootstrap Job, RBAC, taint key/value/effect, Deployment image — all unchanged.
- `uc2/agents/` — agent CRD + ModelConfig unchanged.
- `schemas/workshop-tour.schema.json` — no schema change.
- `docs/tour-content-conventions.md` — STORY-030's job.

### Naming the bootstrap mechanism without spoiling
The bootstrap Job is named `bootstrap-launch-pad-fault` and tags resources with `kagent-workshop/scenario: pod-pending`. These names appear in `kubectl get all`. The convention's no-spoiler rule applies to the **tour content**, not to the cluster's true state. A participant who runs `kubectl get jobs -n artemis-uc2` mid-tour will discover the Job exists. That is acceptable: it does not invalidate the diagnostic exercise (the participant still has to find the taint on the node and connect it to the Pending pod). The tour copy must simply not pre-announce.

A possible mitigation if the lore needs more cover: in Beat 1, refer to the bundle as "a launch-pad readiness sweep, a mission-control service, and the new replica deployment". The Job is real and named, but the *purpose* is not pre-announced.

### Manual recap content (Beat 4)
Lifts the format from STORY-030's worked example and scales it to UC2's two-resource correlation. Suggested skeleton (final wording is the author's):

> If you had done this manually, you would have run five commands across two resource kinds:
>
> ```bash
> kubectl get pods -n artemis-uc2 -l app=mission-control
> kubectl describe pod -n artemis-uc2 -l app=mission-control
> kubectl get events -n artemis-uc2 --sort-by=.lastTimestamp
> kubectl get nodes
> kubectl describe node $(kubectl get nodes -o name | head -n1)
> ```
>
> …and joined two pieces of evidence yourself: a Pending Pod with `FailedScheduling: 0/1 nodes are available: 1 node(s) had untolerated taint`, and a Node carrying `artemis.kagent.dev/launch-pad-fault=true:NoSchedule`. The agent ran the same five tools across the two resources and returned a single sentence of root cause. You didn't.

This is one notch above UC1's recap: the friction is named as *cross-resource correlation*, not just *cross-command synthesis*.

### NFR/FR references
- FR-010: scenario package — bug deterministic, manifests reproducible. Unchanged.
- FR-011: UC2 tour content — this story is the patched implementation.
- NFR-003: cold-deploy reproduction — re-walk required.
- NFR-008: cross-author review — required.
- NFR-009: English copy — preserved.
- NFR-010: self-contained tour steps — preserved.
- NFR-011: no secrets — preserved.

---

## Dependencies

**Prerequisite stories:**
- **STORY-030 (Mission-framing tour convention update)** — must merge first.

**Independent of:** STORY-031 (UC1 rewrite). The two can be authored in parallel by Clément and Quentin once STORY-030 is in.

**External dependencies:** none.

---

## Definition of Done

- [ ] `uc2/tour.json` rewrite committed.
- [ ] `uc2/README.md` narrative section rewrite committed.
- [ ] All AC ticked.
- [ ] `make validate-tours` clean locally.
- [ ] NFR-003 reproduction signed off (3 cold deploys, three OK lines for checks (a)/(b)/(c) in PR description).
- [ ] PR reviewed and approved by Clément.
- [ ] STORY-032 entry in `docs/sprint-status.yaml` updated to `status: completed` with `completion_date` and `actual_points`.
- [ ] Merged to `main`.

---

## Story Points Breakdown

- **Beat 1 (mission setup) rewrite — careful no-spoiler prose:** 0.5
- **Beats 2a + 2b (status check, two sub-steps) reformulation:** 1.0
- **Beat 3 (CLI invoke) — copy adjustment only, command unchanged:** 0
- **Beat 4 (manual recap) — five-command, two-resource framing:** 0.5
- **`uc2/README.md` narrative + reproduction walk:** 1.0
- **PR cross-review (Clément) coordination:** 0
- **Total:** 3 points

**Rationale:** No spike (CLI invocation is unchanged), no new mechanism. The work is rhetorical: lift the M2 prose into the no-spoiler register and produce the manual recap. UC2's two-step Beat 2 is what makes this story non-trivial vs. STORY-030's pure-doc 3 points.

---

## Additional Notes

- The cross-resource lesson is the point of UC2 — but per the tightened convention (STORY-030 follow-up, 2026-05-04) it is now made in **Beat 4** (manual recap) rather than walked in Beat 2. Beat 2 is the friction signal (one `kubectl get pods` = "the pod is not Running"); Beat 4 is the recap that crosses pod side and node side and explicitly names what the agent absorbed.
- Per convention, the tour `id` `kagent-uc2-pod-pending` is **stable**. Lives in `workshop-infrastructure` distribution config and participant `.workshop-tour/state.json` — never rename.

---

## Progress Tracking

**Status History:**
- 2026-05-04: Created (Scrum Master, /create-story).

**Actual Effort:** TBD.

---

**This story was created using BMAD Method v6 - Phase 4 (Implementation Planning).**
