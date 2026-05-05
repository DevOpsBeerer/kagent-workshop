# STORY-034: Scrub UC/meta-references from tour prose (UC0, UC1, UC2) + convention rule update

**Epic:** EPIC-002 (UC1 + UC2 narrative ownership; carries one EPIC-001 spillover — see *Spillover* below)
**FRs:** FR-006 (tour-content convention), FR-009 (UC1 tour), FR-011 (UC2 tour)
**NFRs:** NFR-008 (cross-author review), NFR-009 (English copy), NFR-010 (self-contained steps)
**Priority:** Must Have
**Story Points:** 2
**Status:** Completed (2026-05-05)
**Assigned To:** Quentin Rodic
**Created:** 2026-05-05
**Sprint:** 3 (M3, 2026-05-11 → 2026-05-13) — implemented out-of-band on 2026-05-05, ahead of sprint start, so the updated convention is in place before STORY-020 (UC3 tour, Clément) is authored.

---

## User Story

As a **workshop participant** running through the Artemis tour arc,
I want **the prose I read in UC0/UC1/UC2 to stay inside the mission fiction — no `UC1`/`UC2`/`UC3`/`UC4` cross-references, no "later/earlier" pointers to other tours, no `STORY-`/`Beat <N>` author-side citations**,
So that **the immersion the M2.5 mission-framing rewrite established (STORY-030/031/032/033) survives end-to-end and the agent's "one synthesis instead of N commands" payoff lands without being undermined by meta narration that breaks the fourth wall.**

---

## Description

### Background
M2.5 (STORY-030 → STORY-033) reframed UC1 and UC2 as Artemis missions and added a no-spoiler rule to `docs/tour-content-conventions.md`. The reframing landed cleanly on the *bug-class* axis (no `taint`, `ImagePullBackOff`, `:v999`, etc. surface in participant text). It did **not** land on the *meta-narration* axis: the rewritten tours still contain leaks like "UC1 is the participant's first contact with a kagent agent" (UC1 description) and "UC2 will scale this up to multi-resource correlation; UC3 to external observability; UC4 to multi-agent fan-out" (UC1 Beat 4 explanation). Author-side audit notes — `*Beat 3 invocation form (frozen by STORY-031 spike): …*` — also leaked into participant-visible explanation fields.

The convention doc itself contains the same class of leak: its canonical *Good* example for `description` (line 71 of `docs/tour-content-conventions.md`) reads `"… — UC1 is the participant's first contact with a kagent agent."` — the exact pattern the participant should not encounter. Without a convention update, the next UC author (Clément on STORY-020 / UC3) will copy from this *Good* example and re-introduce the leak prospectively.

This story is a pure-prose enforcement pass: scrub the leaks across UC0/UC1/UC2 `tour.json`, lift the audit-note metadata into per-UC author READMEs, and tighten the convention with an explicit "no meta-references in prose" rule so M3/M4 authoring inherits the corrected posture.

### Scope

**In scope:**
- Edit `uc0/tour.json`, `uc1/tour.json`, `uc2/tour.json` participant-visible fields (`description`, every step's `explanation`) to remove the leaks catalogued in *Leaks inventory* below.
- Edit `docs/tour-content-conventions.md` to:
  - Add a *No meta-references in prose* sub-rule under the *No-spoiler rule* section.
  - Rewrite the *Good* `description` example so it stops modelling the leak.
  - Add an explicit "audit notes (frozen by STORY-…) live in per-UC `README.md`, not in `tour.json`" clause.
- Move the relocated audit notes (Beat 3/install spike forms, profile-selection rationale) into `uc0/README.md`, `uc1/README.md`, `uc2/README.md` so the engineering trace stays preserved on the author side.

**Out of scope:**
- `uc3/tour.json` / `uc4/tour.json` — UC3 is owned by STORY-020 (Clément, M3) and UC4 by STORY-026 (joint, M4). Both must be authored against the **updated** convention; this story unblocks them but does not pre-write them.
- Tour `title` field — the convention's `UC<N> — <purpose>` shape is preserved (per option A: title is a sidebar bookmark, not prose, so the index-consistency reason still wins).
- Any change to `uc<N>/manifests/*.yaml` or `uc<N>/agents/*.yaml` — the cluster broken state stays bit-for-bit identical; only narrative copy changes.
- `schemas/workshop-tour.schema.json` — no schema impact (prose lives in free-form strings).
- PRD / architecture — convention refinement is granular operational form of FR-006/009/011, not a contradiction.

### User Flow
The "user" of this story is the participant; the "operator" is the tour author (Quentin) running the edit pass:
1. Quentin reads each leaked string in the *Leaks inventory* and rewrites it in-place to keep the same teaching point with no meta-reference.
2. Audit notes (`STORY-…` spike forms, `Beat 3 invocation form`, `--profile demo` rationale) are moved into the corresponding `uc<N>/README.md` under an *Author notes* heading.
3. `make validate-tours` is run locally — purely structural, expected green.
4. `docs/tour-content-conventions.md` gets the new sub-rule and a rewritten *Good* example.
5. PR is opened; Clément reads the three rendered tours back-to-back in the workshop-tour extension and signs off (NFR-008).

---

## Leaks inventory (the actual diff target)

Every offending string in participant-visible fields, catalogued before any edit so cross-author review can verify completeness against this list.

### `uc0/tour.json`
- **L4 description:** `"Run this first. Install kagent on your slice so the diagnostic UCs that follow have a working agent runtime."` — `the diagnostic UCs that follow` is a cross-tour roadmap pointer.
- **L16 step 2 explanation (3 distinct leaks):**
  - `"… and the demo profile's pre-packaged agents (the Prometheus / Grafana agents UC3 will reuse)."`
  - `"`--profile demo` provisions the demo profile so UC3 finds the pre-packaged Prom/Grafana agents already wired (architecture L300). Switch to `--profile minimal` only if UC3's needs change."` — two `UC3` mentions plus an `architecture L300` author-doc citation.
  - `"*Beat 3 install form (frozen by STORY-033 spike): `kagent install --profile demo` — the CLI's only documented profiles are `minimal` and `demo` per `kagent install --help`; `demo` is selected for UC3 reuse.*"` — `Beat 3` + `STORY-033` + `UC3`.
- **L24 step 3 explanation:** `"The per-UC `artemis-llm` ModelConfig is created later by UC1's apply step — zero or one ModelConfig in the `kagent` namespace at this point is fine."` — `per-UC`, `later`, `UC1`.

### `uc1/tour.json`
- **L4 description:** `"… — UC1 is the participant's first contact with a kagent agent."` — the canonical example you flagged.
- **L48 Beat 3 explanation:** `"*Beat 3 invocation form (frozen by STORY-031 spike): `kagent dashboard` foregrounds the port-forward and auto-opens the browser; alive until `Ctrl+C`.*"` — `Beat 3` + `STORY-031`.
- **L58 Beat 4 explanation:** `"UC2 will scale this up to multi-resource correlation; UC3 to external observability; UC4 to multi-agent fan-out."` — three forward-roadmap teasers.

### `uc2/tour.json`
- **L4 description:** `"… — UC2 is the participant's first kagent invocation from the terminal."`
- **L60 Beat 3 explanation:** `"UC1 introduced the kagent dashboard chat; UC2 demonstrates that kagent is also addressable from the operational CLI you already use."` — `UC1` cross-tour reference + `UC2` self-reference.
- **L70 Beat 4 explanation (2 distinct leaks):**
  - `"This is one notch above UC1's value: same idea (one synthesis instead of N commands), but the synthesis now crosses a resource boundary."`
  - `"UC3 will scale this further to external observability; UC4 to multi-agent fan-out."`

**Total:** 11 leaked strings across 3 tour files.

---

## Acceptance Criteria

- [ ] `uc0/tour.json`, `uc1/tour.json`, `uc2/tour.json` participant-visible fields (`description`, every step's `explanation`) contain **zero** occurrences of `UC0` / `UC1` / `UC2` / `UC3` / `UC4` / `STORY-` / `Beat <N>` author-citations / "later" / "earlier" / "next UC" / "the diagnostic UCs that follow" / "introduced the … chat" / "notch above" cross-tour copy. The tour `id` and `title` fields are exempted (per convention's stable-ID clause and per the title-as-sidebar-bookmark rule).
- [ ] Each Beat 4 (UC1 + UC2) preserves the agent-vs-CLI payoff intact: UC1 still names "three `kubectl` commands → one synthesis", UC2 still names "five `kubectl` commands across two resource kinds → one synthesis". The cross-UC roadmap tail is removed; the *agent's value within this scenario* is not.
- [ ] UC0 step 2's `--profile demo` rationale is rewritten to stand on its own ("the demo profile is the broadest install — it ships the controller plus pre-packaged Prometheus / Grafana agents") with no forward reference to UC3.
- [ ] UC0 step 3's "the per-UC `artemis-llm` ModelConfig is created later by UC1's apply step" sentence is rewritten ("any per-scenario `ModelConfig` is provisioned by the scenario that needs it; an empty list at this point is fine").
- [ ] All audit notes — `STORY-031 spike`, `STORY-033 spike`, `Beat 3 invocation form`, `architecture L300` citation, `--profile minimal` fallback note — are relocated to `uc0/README.md`, `uc1/README.md`, `uc2/README.md` under an *Author notes* heading. The engineering trace survives, just on the author side.
- [ ] `docs/tour-content-conventions.md` adds a *No meta-references in prose* sub-rule under §*The no-spoiler rule*, banning `UC<N>` mentions, "later", "earlier", "next UC", `STORY-` and `Beat <N>` citations from any participant-visible field except `id` and `title`.
- [ ] The convention's worked-example *Good* `description` (current line 71) is rewritten to drop the `"— UC1 is the participant's first contact with a kagent agent."` clause. The replacement description models a leak-free shape that STORY-020 (UC3) and STORY-026 (UC4) can copy from.
- [ ] The convention adds an explicit "audit notes live in `uc<N>/README.md`, not in `tour.json`" clause so future authors know where the spike forms / rationale citations belong.
- [ ] `make validate-tours` is run locally and is green over `uc0`, `uc1`, `uc2`. (Schema is structural; no impact expected.)
- [ ] Cross-author repro: Clément reads the three rendered tours back-to-back in the workshop-tour VS Code extension and confirms zero participant-visible meta-reference (NFR-008). Sign-off may be deferred to the M5 dry-run STORY-028 if Clément's M3 plate is full — pattern matches the deferred sign-offs already tracked on STORY-014/017/031/032/033.
- [ ] PR is opened; reviewer cross-checks against the *Leaks inventory* in this story document.

---

## Technical Notes

### Files modified
- `uc0/tour.json` — 4 leaked strings rewritten (1 in description, 3 in step 2 explanation, 1 in step 3 explanation; 2 of those collapse during the rewrite — the spike note moves out wholesale, so net edits are: description rewrite, step 2 explanation rewrite, step 3 explanation rewrite).
- `uc1/tour.json` — 3 leaked strings rewritten (description, Beat 3 explanation tail, Beat 4 explanation tail).
- `uc2/tour.json` — 4 leaked strings rewritten (description, Beat 3 explanation second sentence, Beat 4 "notch above" sentence, Beat 4 closing roadmap).
- `uc0/README.md`, `uc1/README.md`, `uc2/README.md` — *Author notes* section appended (or created if absent) with the relocated spike/rationale text.
- `docs/tour-content-conventions.md` — sub-rule added under §*The no-spoiler rule*; *Good* `description` rewritten; new "audit notes belong in README" clause added either to §*The no-spoiler rule* or §*The 4 beats* (author's call at edit time).

### Files NOT modified (intentional)
- `uc<N>/manifests/*.yaml` — broken state stays bit-for-bit identical; manifests are author-facing YAML with technical-intent comments allowed (per convention's existing rule).
- `uc<N>/agents/*.yaml` — agent CRDs unchanged.
- `schemas/workshop-tour.schema.json` — structural schema; prose changes touch free-form strings only.
- `uc3/`, `uc4/` — owned by STORY-020 / STORY-026; this story unblocks them by tightening the convention they will consume.
- `docs/prd-…md`, `docs/architecture-…md` — convention refinement, not a contradiction of FR-006/009/011.

### Convention sub-rule (target shape)

To paste under §*The no-spoiler rule* in `docs/tour-content-conventions.md`:

> **No meta-references in prose.** Participant-visible fields (`description` and every step's `title`/`explanation`) must not name other tours by handle (`UC<N>`, "the next UC", "the previous one"), pull on cross-tour temporal pointers ("later", "earlier", "the UCs that follow"), or expose author-side audit metadata (`STORY-…`, `Beat <N>` citations, architecture line references). The participant lives the mission; they are not reading a table of contents.
>
> The exemption from §*The no-spoiler rule*'s general scope applies here too: tour `id` retains `UC<N>` (stable handle, not rendered as prose); tour `title` retains `UC<N> — <purpose>` (sidebar index, not prose).
>
> Audit notes — spike-frozen invocation forms, profile-selection rationale, architecture line citations — belong in `uc<N>/README.md` under an *Author notes* heading, not in `tour.json`.

### Leak rewrites — proposed shape

These are non-binding sketches; final phrasing is at edit time. They exist to prove the rewrites are mechanically possible without losing meaning.

| File / location | Current (leaky) | Proposed (leak-free) |
| --- | --- | --- |
| `uc0/tour.json` description | "Run this first. Install kagent on your slice so the diagnostic UCs that follow have a working agent runtime." | "Run this first. Install kagent on your slice — every Artemis mission tour assumes a working agent runtime is already on the cluster." |
| `uc0/tour.json` step 2 expl. | "(the Prometheus / Grafana agents UC3 will reuse)" | "(the demo profile ships pre-packaged Prometheus / Grafana agents alongside the controller)" |
| `uc0/tour.json` step 2 expl. | "`--profile demo` provisions the demo profile so UC3 finds the pre-packaged Prom/Grafana agents already wired (architecture L300). Switch to `--profile minimal` only if UC3's needs change." | "`--profile demo` is the broadest install — controller plus the pre-packaged Prometheus / Grafana agents that observability missions rely on. The other documented profile, `--profile minimal`, ships the controller alone." |
| `uc0/tour.json` step 2 expl. | The whole *Beat 3 install form (frozen by STORY-033 spike): …* italic block | Removed from `tour.json`; relocated verbatim to `uc0/README.md` under *Author notes*. |
| `uc0/tour.json` step 3 expl. | "The per-UC `artemis-llm` ModelConfig is created later by UC1's apply step — zero or one ModelConfig in the `kagent` namespace at this point is fine." | "Any per-scenario `ModelConfig` is provisioned by the mission that needs it; an empty list at this point is fine." |
| `uc1/tour.json` description | "… — UC1 is the participant's first contact with a kagent agent." | "… — through the kagent dashboard chat." (drop the trailing meta-clause; the description already names the agent and the invocation surface) |
| `uc1/tour.json` Beat 3 expl. | "*Beat 3 invocation form (frozen by STORY-031 spike): …*" | Removed; relocated to `uc1/README.md` under *Author notes*. |
| `uc1/tour.json` Beat 4 expl. | "UC2 will scale this up to multi-resource correlation; UC3 to external observability; UC4 to multi-agent fan-out." | Removed entirely — the agent-vs-CLI value within this scenario stands on its own without the roadmap tail. |
| `uc2/tour.json` description | "… — UC2 is the participant's first kagent invocation from the terminal." | "… — from the operational CLI." |
| `uc2/tour.json` Beat 3 expl. | "UC1 introduced the kagent dashboard chat; UC2 demonstrates that kagent is also addressable from the operational CLI you already use." | "kagent is addressable from the operational CLI you already use, in addition to the dashboard chat surface." |
| `uc2/tour.json` Beat 4 expl. | "This is one notch above UC1's value: same idea (one synthesis instead of N commands), but the synthesis now crosses a resource boundary." | "Same idea as a single-resource diagnosis (one synthesis instead of N commands), only this time the synthesis crosses a resource boundary." |
| `uc2/tour.json` Beat 4 expl. | "UC3 will scale this further to external observability; UC4 to multi-agent fan-out." | Removed entirely. |

### Author notes — what relocates where

`uc0/README.md` *Author notes* gains:
- *Install spike (STORY-033) — frozen form:* `kagent install --profile demo`. CLI documented profiles are `minimal` and `demo` per `kagent install --help`; `demo` selected because the demo profile pre-packages Prometheus / Grafana agents that observability missions (UC3) reuse.
- *Architecture line 300 reference* — kagent install profile selection rationale.

`uc1/README.md` *Author notes* gains:
- *Beat 3 invocation spike (STORY-031) — frozen form:* `kagent dashboard` foregrounds the port-forward and auto-opens the browser; alive until `Ctrl+C`.

`uc2/README.md` *Author notes* gains:
- *Beat 3 invocation form:* `kagent invoke --agent <name> --namespace <ns> --task '<prompt>'`. CLI invocation chosen for UC2 per the convention's *Beat 3 invocation: UI/chat vs CLI invoke* section.

### Validation
- `make validate-tours` — structural schema check; no narrative enforcement; expected green.
- No new lint hook is added for the meta-reference rule (out of scope; the convention encodes it, the cross-author repro enforces it).

### Cross-cutting rules to preserve
NFR-008 cross-author review applies to convention-doc changes as well as code (per STORY-030 precedent). NFR-009 English copy, NFR-010 self-contained steps, NFR-011 no secrets — all unchanged. The 4-beat structure for UC1/UC2 is unchanged; the no-spoiler rule is unchanged; only the *No meta-references in prose* sub-rule is added.

---

## Dependencies

**Prerequisite stories:**
- STORY-030 (mission-framing convention) — completed; this story refines the convention it shipped.
- STORY-031 (UC1 tour rewrite) — completed; this story scrubs the leaks it left in UC1.
- STORY-032 (UC2 tour rewrite) — completed; this story scrubs the leaks it left in UC2.
- STORY-033 (UC0 prep tour) — completed; this story scrubs the leaks it left in UC0.

**Blocked stories (consume the updated convention prospectively):**
- STORY-020 (UC3 tour authoring, M3, Clément) — must be authored against the updated *No meta-references in prose* sub-rule. Scheduling: STORY-034 ships before Sprint 3 starts (2026-05-11) so STORY-020 inherits cleanly. If STORY-034 slips, STORY-020 either pauses on Beat 1/4 prose or absorbs the scrub during authoring.
- STORY-026 (UC4 tour authoring, M4, joint) — same, prospectively.

**External dependencies:** none. No third-party services, no cluster, no CI changes, no schema changes.

---

## Definition of Done

- [ ] All 11 leaked strings rewritten or removed per the *Leaks inventory* and the AC list above.
- [ ] `uc0/README.md`, `uc1/README.md`, `uc2/README.md` *Author notes* sections shipped with the relocated audit metadata.
- [ ] `docs/tour-content-conventions.md` *No meta-references in prose* sub-rule added; *Good* description example rewritten; "audit notes belong in README" clause added.
- [ ] All ten acceptance criteria above ticked.
- [ ] `make validate-tours` green locally over UC0/UC1/UC2.
- [ ] PR cross-reviewed by Clément (NFR-008) — sign-off may be deferred to M5 dry-run STORY-028 if M3 capacity dictates; document the deferral on the sprint-status entry.
- [ ] STORY-034 entry in `docs/sprint-status.yaml` updated to `status: completed` with `completion_date` and `actual_points`.
- [ ] Merged to `main`.

---

## Story Points Breakdown

- **UC0/UC1/UC2 prose scrub + author-notes relocation:** 1 point
- **Convention sub-rule + *Good* example rewrite + cross-review:** 1 point
- **Total:** 2 points

**Rationale:** Pure-prose pass; no manifests, no agent CRDs, no schema, no cluster cycles. The *Leaks inventory* enumerates every edit site (11 strings, 3 tour files, 3 READMEs, 1 convention section), so the unknowns are minimal — execution is mechanical. Estimated ~3 hours of careful editing + ~1 hour cross-review. Smaller than STORY-030 (3 pts) because the rule is already established by M2.5; this is enforcement, not invention.

---

## Spillover note (Epic ownership)

This story is filed under **EPIC-002** because the *Leaks inventory* is dominated by UC1 + UC2 fixes (7 of 11 strings) and Quentin owns UC2 + the cross-cutting M2.5 work. Two slices technically belong to **EPIC-001** — the four UC0 string fixes and the convention-doc update — but bundling them here keeps the no-meta-reference rule and its first three enforcement passes in one PR, where cross-author review can validate the rule and its application together. If Sprint 3 review prefers a split, STORY-035 can carve out the EPIC-001 slices (UC0 + convention), but the trace stays cleaner bundled.

---

## Additional Notes

- This story closes the *narrative axis* loop opened by M2.5: M2.5 fixed bug-class spoilers (the *what is wrong* axis) and meta narration (`UC<N>`, cross-tour pointers, audit citations) is what STORY-034 fixes. After STORY-034, the convention's no-spoiler section covers both axes uniformly.
- The "audit notes belong in `uc<N>/README.md`" clause is a small but durable improvement for repo maintainability: it gives engineering rationale a stable home that participants never see, decoupling author-side trace from participant-side prose. Future spike notes (UC3 dashboard URL freeze, UC4 a2a wiring freeze) inherit this convention prospectively.
- This story does not introduce a static lint for the meta-reference rule. If meta leaks recur across UC3/UC4 authoring, a follow-up story could add a `make lint-tours-prose` grep-based check; out of scope here per the *don't design for hypothetical future requirements* default.

---

## Progress Tracking

**Status History:**
- 2026-05-05: Created (Scrum Master, /bmad:create-story).
- 2026-05-05: Implemented (Developer, /bmad:dev-story).

**Actual Effort:** 2 points (matched estimate).

### Implementation Notes (2026-05-05)

#### Files modified
- `uc0/tour.json` — description rewritten (no `the diagnostic UCs that follow`); step 2 explanation rewritten (no `UC3 will reuse`, no `--profile minimal only if UC3's needs change`, no `STORY-033 spike` italic block, no `architecture L300` citation); step 3 explanation rewritten (no `per-UC … created later by UC1's apply step`).
- `uc1/tour.json` — description rewritten (no `UC1 is the participant's first contact …` clause); Beat 3 explanation tail trimmed (no `STORY-031 spike` italic block); Beat 4 explanation tail trimmed (no `UC2/UC3/UC4 will scale this …` roadmap).
- `uc2/tour.json` — description rewritten (no `UC2 is the participant's first kagent invocation …` clause); Beat 3 explanation rewritten (no `UC1 introduced the kagent dashboard chat; UC2 demonstrates …` cross-tour intro); Beat 4 explanation tail trimmed (no `notch above UC1's value` sentence, no `UC3/UC4 will scale this …` roadmap).
- `uc0/README.md` — *Author notes* section added with relocated install spike rationale (STORY-033 frozen form, demo vs minimal profile choice, architecture L300 reference, kagent namespace + ModelConfig timing).
- `uc1/README.md` — *Author notes* section added with relocated Beat 3 invocation form (STORY-031 spike: `kagent dashboard` foregrounds the port-forward, alive until `Ctrl+C`, NFR-010 self-contained-step rationale).
- `uc2/README.md` — *Author notes* section added with the CLI invocation form (`kagent invoke …`) and the convention-clause reference.
- `docs/tour-content-conventions.md` — three changes:
  - Line 3 story list: STORY-013 / 016 / 020 / 026 / 031 / 032 → … / 032 / 034.
  - *Good* `description` example (line 71) rewritten to drop the leak it modelled.
  - New `### No meta-references in prose` sub-section added under §*The no-spoiler rule*, with bad/good snippets from the actual STORY-031/032/033 → STORY-034 transition.
  - Quick checklist (bottom-of-doc) gained one new line ("No meta-references in prose") and an inline "**No cross-UC roadmap tail**" callout on the Beat 4 line.

#### Files NOT modified (intentional — confirmed against story spec)
- `uc<N>/manifests/*.yaml` — broken state byte-identical to M2/M2.5; cluster behaviour unchanged.
- `uc<N>/agents/*.yaml` — agent CRDs unchanged.
- `schemas/workshop-tour.schema.json` — no schema impact (the rule is rhetorical, not structural; `make validate-tours` confirmed green over all three files).
- `uc3/`, `uc4/` — owned by STORY-020 / STORY-026; this story unblocks them.
- `docs/prd-…md`, `docs/architecture-…md` — convention refinement, not contradiction.

#### Validation
- `make validate-tours`: 3/3 files valid against the schema (uc0, uc1, uc2).
- Custom Python audit over `description` + every step `title`/`explanation` in all three tours: zero matches for `UC[0-9]`, `STORY-`, `Beat <N>`, `architecture L<N>`, `later`, `earlier`, `the UCs that follow`, `first contact`, `first kagent invocation`, `introduced the`, `will scale`, `will reuse`, `notch above`, `per-UC`, `the next UC`. Confirmed clean.

#### Out-of-scope finding (pre-existing, flagged for future story)
The convention's `§The no-spoiler rule` lists `synthetic`, `fault`, `taint` in its banned vocabulary "across all participant-visible fields", but UC2's Beat 4 (shipped by STORY-032) quotes the cluster's own `FailedScheduling` event message — which contains `untolerated taint` verbatim — and names the synthetic taint key `artemis.kagent.dev/launch-pad-fault=true:NoSchedule` to ground the agent-vs-CLI contrast. Four `taint` matches, two `fault` matches, one `synthetic` match in `uc2/tour.json` step 3 (Beat 4) explanation. Two readings of this gap:
- (a) Convention drafting bug — banned vocabulary should be scoped to `title`/`description`/Beat 1 + the Beat-2 status check, not Beat 4 cluster-quotation prose.
- (b) Cluster-output quotations are an implicit exception — the *author* doesn't introduce the term; the cluster's own event surfaces it.
Either way, this is **out of scope for STORY-034** (the user's ask was meta-references — `UC<N>` etc. — not the banned-vocab list). Leaving for STORY-035 candidate or M5 cross-author review to resolve.

#### Cross-author repro (NFR-008)
PR cross-review by Clément deferred to the M5 dry-run STORY-028 — same pattern already established for STORY-014 / 017 / 031 / 032 / 033. Justification: STORY-034 is purely textual and has zero impact on cluster behaviour or `make validate-tours`. The tour text changes will be visible to Clément in the M5 dry-run when he walks through UC0/UC1/UC2 on a real kagent install.

### AC sign-off
All ten acceptance criteria satisfied as of 2026-05-05:
- [x] Zero `UC<N>` / `STORY-` / `Beat <N>` / "later" / "earlier" / "next UC" / "the diagnostic UCs that follow" / "introduced the … chat" / "notch above" in participant-visible fields. Confirmed by custom Python audit.
- [x] Beat 4 (UC1 + UC2) preserves the agent-vs-CLI payoff. UC1 still names "three `kubectl` commands → one synthesis"; UC2 still names "five `kubectl` commands across two resource kinds → one synthesis". Roadmap tails removed.
- [x] UC0 step 2's `--profile demo` rationale rewritten to stand on its own — no UC3 forward reference.
- [x] UC0 step 3's "later by UC1's apply step" sentence rewritten to "Any per-scenario `ModelConfig` is provisioned by the mission that needs it; an empty list at this point is fine."
- [x] All audit notes relocated: STORY-031 spike → `uc1/README.md`; STORY-033 spike + architecture L300 + `--profile minimal` fallback → `uc0/README.md`; Beat 3 CLI invocation form → `uc2/README.md`. Each under an *Author notes* heading.
- [x] `docs/tour-content-conventions.md` gained the *No meta-references in prose* sub-rule under §*The no-spoiler rule*.
- [x] *Good* `description` example rewritten to drop the leak it previously modelled.
- [x] "Audit notes live in `uc<N>/README.md`" clause documented inside the new sub-rule.
- [x] `make validate-tours` green over UC0/UC1/UC2.
- [ ] Cross-author repro by Clément — deferred to M5 dry-run STORY-028 per pattern (see *Cross-author repro* note above).

### Next
PR cross-review by Clément remains the last DoD checkbox; deferred to M5 dry-run STORY-028 along with the existing carry-overs (STORY-014, 017, 031, 032, 033). Sprint 3 starts 2026-05-11 with the convention now updated, so STORY-020 (UC3 tour, Clément) authors against the corrected *No meta-references in prose* posture from day one.

---

**This story was created using BMAD Method v6 - Phase 4 (Implementation Planning).**
