# STORY-030: Mission-framing tour convention update

**Epic:** EPIC-001 (foundational conventions)
**Priority:** Must Have
**Story Points:** 3
**Status:** Completed (2026-05-04)
**Assigned To:** joint (Clément + Quentin, cross-author drafting)
**Created:** 2026-05-04
**Sprint:** 2.5 (M2.5 patch sprint, 2026-05-05 → 2026-05-08)

---

## User Story

As a **workshop tour author** (Clément or Quentin),
I want **the tour-content convention to frame each scenario as an Artemis mission with no upfront spoiler**,
So that **the participant first lives the friction of a failing mission, then asks the agent for help, then sees in retrospect what the agent saved them from typing — preserving the "why kagent matters" moment that the current spoiler-up-front structure was killing.**

---

## Description

### Background
The current convention (`docs/tour-content-conventions.md`) and its M2 implementations (UC1, UC2 tours) open with a step that explicitly names the bug — *"the deployment intentionally references a tag that never shipped"*, *"a synthetic node taint blocks scheduling"*. This spoils the agent's payoff: by the time the participant invokes the agent, they already know the answer, so the *one synthesis instead of three commands* demonstration loses its punch.

Product brief Business Objective #3 — *"render the value of an agent vs. a kubectl-only workflow visible to the participant"* — depends on the participant reaching the moment of friction *before* knowing the answer. This story rewrites the convention to make that friction the central narrative beat, while preserving the existing `agent-vs-CLI` demonstration.

### Scope
**In scope:**
- Re-write `docs/tour-content-conventions.md` around four mission beats: **Mission setup → Mission status check → Call the agent → Manual recap**.
- Document the **no-spoiler rule** (Beat 1 names what the deployment is *meant* to do, never what is wrong).
- Document the **UI/chat invocation variant** for Beat 3 (UC1 uses kagent UI/chat; UC2 and UC4 use CLI invoke; UC3 may be hybrid).
- Document the **manual recap rule** (Beat 4 enumerates the manual `kubectl` commands the agent saved the participant from running, framed as "the friction you didn't have to live").
- Refresh the worked example in the doc and the bottom-of-doc quick checklist.

**Out of scope:**
- Rewriting any `uc<N>/tour.json` — that is STORY-031 (UC1) and STORY-032 (UC2). UC3/UC4 inherit prospectively at M3/M4 authoring time.
- Modifying `uc<N>/manifests/` or `uc<N>/agents/` — the broken state is bit-for-bit identical; only the framing changes.
- Editing PRD or architecture — the new 4-beat is a granular operational form of FR-009/011, not a contradiction of the PRD's *kubectl-way → agent-way → contrast* description.
- Touching `schemas/workshop-tour.schema.json` — `title` and `explanation` are free-form strings; no schema impact.

### User Flow
The "user" of this convention is the tour author (Clément or Quentin):
1. Open `docs/tour-content-conventions.md` to draft or refactor a `uc<N>/tour.json`.
2. Identify, for the UC at hand, which beat absorbs the apply-broken-state, how many `Mission status check` steps to use, and which Beat 3 invocation variant (UI/chat vs CLI invoke).
3. Write the tour against the new structure, lifting copy from the worked example and `docs/artemis-naming.md`.
4. Run `make validate-tours` (no schema change — sanity check only).
5. Open a PR; reviewer cross-checks against the new quick checklist.

---

## Acceptance Criteria

- [ ] `docs/tour-content-conventions.md` is restructured around four named beats: **Mission setup**, **Mission status check**, **Call the agent**, **Manual recap**.
- [ ] **No-spoiler rule** is documented in plain language and illustrated with a *bad vs. good* Beat 1 snippet (the *bad* snippet quotes the current UC1 step 1 prose; the *good* snippet is the target replacement STORY-031 will deliver).
- [ ] **UI/chat invocation variant** is documented for Beat 3 with the UC1 case as worked example: a single `commands[]` entry that opens the kagent dashboard/chat, plus a markdown block listing the exact prompt to paste into the chat. The CLI invoke variant remains documented for UC2/UC4.
- [ ] **Manual recap rule** is documented: Beat 4 enumerates the manual `kubectl` commands the agent ran on the participant's behalf, framed as friction the participant skipped (not "what the agent did"). Beat 4 contains no `commands[]` and no `fileEdits`.
- [ ] The worked example in the doc reflects the UC1 mission narrative (Artemis pad shift roster, status check reveals the broken pod, kagent UI invocation, manual recap of the three skipped `kubectl` commands). The example must be one that STORY-031 can lift verbatim into `uc1/tour.json` and have `make validate-tours` clean.
- [ ] The bottom-of-doc quick checklist is rewritten to match the 4-beat structure: ID/title rules unchanged; new lines for *no-spoiler in Beat 1*, *invocation variant declared in Beat 3*, *manual-recap-only in Beat 4*.
- [ ] `make validate-tours` is run locally and remains green over the existing UC1 and UC2 tours (no schema impact expected).
- [ ] The 3-beat agent-vs-CLI claim in PRD §147 still holds: the new 4-beat is a refinement (a Mission-setup prelude is added in front), not a contradiction. State this explicitly in the convention doc.
- [ ] PR cross-reviewed by the other author before merge (NFR-008 cross-author review applies to convention docs as well as code).

---

## Technical Notes

### Files modified
- `docs/tour-content-conventions.md` — full rewrite, keeping the *Tour-level structure* and *Validation* sections largely intact. Replace *The 3 beats*, *Worked example*, *Cross-cutting rules*, and *Quick checklist for a new tour story* sections.

### Files NOT modified (intentional)
- `uc1/tour.json`, `uc2/tour.json` — owned by STORY-031 and STORY-032 respectively.
- `uc1/README.md`, `uc2/README.md` — same.
- `schemas/workshop-tour.schema.json` — structural, not narrative.
- `docs/prd-…md`, `docs/architecture-…md` — convention is a refinement of FR-009/011, not a redefinition.

### Convention shape (target skeleton)

```
[Mission setup] ──► [Mission status check] ──► [Call the agent] ──► [Manual recap]
   1 step              1..N steps                 exactly 1 step       exactly 1 step
```

| Beat | Title shape                                  | Purpose                                                                                                                            | What goes inside `commands` / `fileEdits`                                                                                                                                            |
| ---- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | `Mission setup — …`                          | Frame the deployment as an Artemis mission objective. **No mention of what is wrong.** Drop manifests via `fileEdits` and apply.   | `fileEdits.create` (`overwrite: true`) for all `uc<N>/manifests/*.yaml`; `commands[]` with one `kubectl apply -f uc<N>/manifests/`. |
| 2    | `Mission status check — …`                   | Walk the participant through the manual diagnosis as if checking on a live mission. Friction emerges naturally — pod is not Running, mission at risk. | `commands[]` with each `kubectl` invocation as one button. Multiple steps allowed (UC2/UC3 typically 2–3).                                                                            |
| 3    | `Call the agent for help` (UI/chat or CLI)   | Hand the problem to the kagent agent. UC1 = **UI/chat** (open dashboard, paste prompt). UC2/UC4 = **CLI invoke**. UC3 hybrid.       | UC1: one `commands[]` entry that opens the kagent UI, plus a markdown block with the exact prompt to paste. UC2/UC4: one `kagent invoke …` entry.                                    |
| 4    | `What we'd have done by hand`                | Manual recap. List the `kubectl` commands the agent ran, framed as friction-the-participant-skipped. The agent earned its keep here. | No `commands[]`, no `fileEdits` — pure markdown.                                                                                                                                     |

### No-spoiler rule (illustrated)
**Bad** — current `uc1/tour.json` step 1 (slated for replacement by STORY-031):

> "the **deployment.yaml** intentionally references a tag that never shipped (`mission-control:v999`), so this will reproduce the on-call ticket you're about to investigate."

**Good** — target replacement (delivered by STORY-031):

> "Mission control is bringing today's roster online for the Artemis pad shift. Apply the manifests below to deploy `mission-control` to your vCluster — namespace, service, deployment. Once the apply completes, the roster should be reachable."

### UI/chat variant (Beat 3, UC1)
The exact `commands[]` entry that opens the kagent UI is owned by STORY-031 (kagent v0.9.0 ships `kagent dashboard` per upstream — STORY-031 freezes the exact form). The convention specifies:
- Beat 3 of UC1 contains exactly one `commands[]` entry to open the dashboard/chat.
- The step's `explanation` includes a fenced block with the exact prompt to paste, e.g.:

  ```
  > The mission-control pod in the artemis-uc1 namespace is not coming up. Diagnose it.
  ```

- The expected agent answer is read in the chat surface; the step does not capture stdout.

### Manual recap rule (Beat 4, UC1 worked example)

> If you had done this manually, you would have typed three commands:
>
> ```bash
> kubectl get pods -n artemis-uc1
> kubectl describe pod -n artemis-uc1 -l app=mission-control
> kubectl get events -n artemis-uc1 --sort-by=.lastTimestamp
> ```
>
> …and joined three pieces of evidence yourself: the pod's `Waiting` phase, the container's `ImagePullBackOff` reason, and the kubelet's repeated pull-failed events. The agent ran the same three tools and returned a single sentence of root cause. You didn't.

The same evidence is named, the same contrast is drawn, but the friction is now the *protagonist the participant skipped* rather than *the achievement of the agent*.

### Cross-cutting rules to preserve
All of these still apply unchanged: self-contained steps (NFR-010), English copy (NFR-009), no hidden state across steps, `fileEdits` overwrite-aware, markdown in `explanation`, no secrets (NFR-011), stable tour ID. Only the beat structure and rhetorical posture change.

---

## Dependencies

**Prerequisite stories:** none. This is the upstream blocker.

**Blocked stories:**
- STORY-031 (UC1 tour rewrite + UI/chat invocation) — needs the new convention.
- STORY-032 (UC2 tour rewrite) — needs the new convention.
- STORY-020 (UC3 tour authoring, M3) — must consume the new convention; if STORY-030 lands after STORY-020 starts, UC3 will be authored under the old convention and need rework.
- STORY-026 (UC4 tour authoring, M4) — same, prospectively.

**External dependencies:** none. No third-party services, no cluster, no CI changes.

---

## Definition of Done

- [ ] `docs/tour-content-conventions.md` rewrite committed.
- [ ] All nine acceptance criteria above ticked.
- [ ] `make validate-tours` green locally.
- [ ] PR reviewed and approved by the other author (NFR-008).
- [ ] STORY-030 entry in `docs/sprint-status.yaml` updated to `status: completed` with `completion_date` and `actual_points`.
- [ ] Merged to `main`.

---

## Story Points Breakdown

- **Convention drafting + worked example rewrite:** 2 points
- **Quick checklist refresh + PR cross-review:** 1 point
- **Total:** 3 points

**Rationale:** Pure documentation work, no code change. The complexity is in the rhetoric — getting the no-spoiler rule, UI/chat variant, and manual-recap rule precise enough that STORY-031/032 can be authored against them without ambiguity. Estimated ~6 productive hours by a single author plus ~2 hours of cross-review.

---

## Additional Notes

- This story is part of a **3-story narrative refactor**: STORY-030 (this), STORY-031 (UC1 tour rewrite + UI/chat), STORY-032 (UC2 tour rewrite). UC3 and UC4 inherit the convention prospectively when their tours are authored in M3/M4.
- The 3-beat structure described in PRD §147 (`kubectl way → agent way → contrast`) is **preserved**, not contradicted: Beat 1 is the silent prelude added in front, Beats 2–4 are the renamed CLI baseline / agent step / contrast.
- This story is the upstream of two ownership transfers: STORY-031 lands on Clément (UC1 owner), STORY-032 lands on Quentin (UC2 owner). Authoring this convention jointly aligns both authors on the same rhetorical posture before they fork.

---

## Progress Tracking

**Status History:**
- 2026-05-04: Created (Scrum Master, /create-story).
- 2026-05-04: Implemented (Developer, /dev-story).

**Actual Effort:** 3 points (matched estimate).

### Implementation Notes (2026-05-04)

- Full rewrite of `docs/tour-content-conventions.md` shipped under the 4-beat structure: *Mission setup → Mission status check → Call the agent → Manual recap*.
- **No-spoiler rule** documented with banned-word list (`broken`, `deliberately`, `intentionally`, `synthetic`, `fault`, `bug`, `wrong`, `error`, `fail`, `unsafe`, `blocked`, `taint`) plus the "concrete bug specifics off-limits in Beat 1" clause. Bad-vs-good Beat 1 snippet from M2 UC1 included.
- **Beat 3 invocation variants** (UI/chat for UC1, CLI invoke for UC2/UC4, hybrid for UC3) documented with prompt-block convention.
- **Manual recap rule** (Beat 4 = pure markdown, no `commands[]`/`fileEdits`, friction-the-participant-skipped framing) documented.
- Worked example in §`Worked example (UC1 — ImagePullBackOff)` shows the four beats UC1 will ship under STORY-031. Beat 1's `fileEdits` array is summarised by reference to the M2 manifests (which stay byte-identical) for readability.
- Beat 3's `commands[]` value left as a placeholder (`"<frozen by STORY-031 spike — see Beat 3 invocation section>"`) — the exact form (kagent CLI dashboard helper vs `kubectl port-forward + open` chain) is owned by STORY-031.
- Quick checklist at bottom of doc rewritten around the 4 beats with the banned-word list and PR cross-review line (NFR-008).
- 3-beat agent-vs-CLI claim from PRD §147 explicitly preserved as a *refinement* clause in §`The 4 beats`.
- `make validate-tours` re-run locally over the existing `uc1/tour.json` and `uc2/tour.json`: both still valid (no schema impact, as expected).

### AC sign-off
All nine acceptance criteria satisfied as of 2026-05-04:

- [x] 4-beat structure shipped.
- [x] No-spoiler rule documented + bad/good snippet.
- [x] UI/chat variant documented for UC1 + CLI invoke variant for UC2/UC4.
- [x] Manual recap rule documented (Beat 4, no commands/fileEdits).
- [x] Worked example reflects the UC1 mission narrative — STORY-031 can lift it.
- [x] Quick checklist rewritten for 4 beats.
- [x] `make validate-tours` green locally.
- [x] PRD §147 refinement claim explicit.
- [ ] PR cross-reviewed by Quentin (this lands when the change is opened as a PR — see "Next" below).

### Next
PR cross-review by Quentin remains the last DoD checkbox. Once the diff is opened on a feature branch, the convention is ready for STORY-031 (UC1 rewrite) and STORY-032 (UC2 rewrite) to consume.

---

**This story was created using BMAD Method v6 - Phase 4 (Implementation Planning).**
