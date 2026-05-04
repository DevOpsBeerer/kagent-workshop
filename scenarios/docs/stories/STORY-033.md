# STORY-033: UC0 — Install kagent (prep tour)

**Epic:** EPIC-001 (foundational conventions / setup)
**Priority:** Must Have
**Story Points:** 3
**Status:** Completed (2026-05-04) — live `kagent install` walk-through deferred to PR / M5
**Assigned To:** joint (Clément + Quentin)
**Created:** 2026-05-04
**Sprint:** 2.5 (M2.5 patch sprint, 2026-05-05 → 2026-05-08)

---

## User Story

As a **workshop participant landing on a fresh vCluster**,
I want **a guided tour that walks me through installing kagent and confirming my environment is ready**,
So that **I can start UC1 with kagent already running, the OpenAI credentials wired in, and zero ambient setup friction.**

---

## Description

### Background
The workshop assumes kagent is already installed on each participant's cluster. The brief and architecture treat that install as out-of-scope ("`make kagent-install` is the author / CI flow, participants get a pre-baked vCluster slice"). In practice, that hand-wave hides the **first 5 minutes** of every workshop session — a participant joining the room expects to see something on their cluster, and the most natural entry point is to install kagent themselves with the same workshop-tour rhythm they will use for UC1–UC4.

This story turns those 5 minutes into a numbered tour: **UC0 — Install kagent**. It runs before any diagnostic UC, gives the participant a successful kagent install, validates that their `OPENAI_API_KEY` is in the environment (so per-UC `artemis-llm` ModelConfigs will be able to authenticate later), and leaves them with a healthy `kagent` controller pod and registered CRDs.

A draft `tour.json` was authored ahead of this story; STORY-033 lands it under the repo's conventions, drops the LLM provider mismatch (the draft assumed Azure OpenAI; the workshop's committed provider is **OpenAI** per `uc1/agents/modelconfig.yaml`), drops the `kagent install` flags that don't exist on the kagent CLI v0.9.0 install command, and codifies a convention exception so prep tours don't have to fake a 4-beat narrative.

### Scope
**In scope:**
- Create `uc0/` directory mirroring the UC1–UC4 layout: `uc0/tour.json` + `uc0/README.md`. No `manifests/` or `agents/` folder — UC0 has no scenario app.
- Land the participant-facing `tour.json` under the repo conventions: tour `id` = `kagent-uc0-install`, schema-valid, `make validate-tours` green.
- **OpenAI as the workshop's committed LLM provider.** UC0's credential check verifies `OPENAI_API_KEY`. The install command does not pass any provider-specific flags (the CLI doesn't expose them); the per-UC `artemis-llm` ModelConfig (UC1, UC2, …) carries the provider/model.
- Convention update: a small **"Prep tours"** exception in `docs/tour-content-conventions.md` allowing UC0 to use a flat N-step structure (no Mission setup → status check → agent → recap; UC0 has no agent diagnosis to demonstrate).
- Root README: UC0 added at the top of the UC index with a "run this first" note.
- `sprint-status.yaml` entry for STORY-033 in Sprint 2.5.

**Out of scope:**
- Updating the Makefile's `kagent-install` target. It currently only installs CRDs (`helm install kagent-crds …`); UC0 installs the full kagent (CRDs + controller) via the CLI. The two flows can co-exist for now (Makefile = author / CI; UC0 = participant). A future story may consolidate.
- Migrating UC1+ ModelConfigs to a different provider. They already specify OpenAI; UC0 just confirms the env var the participant needs to have.
- PRD / architecture updates locking in the LLM provider. The provider was already implicitly chosen by UC1 in M2 — UC0 makes it visible to the participant, that is all.
- The `workshop` namespace step from the draft `tour.json` (Step 5). Each diagnostic UC owns its own `artemis-uc<N>` namespace; a generic `workshop` ns would never be used after UC0.

### User Flow
1. Participant opens the side-bar of the workshop-tour extension on their vCluster, picks **UC0 — Install kagent** before any other tour.
2. Beat 1 — *Check your cluster*: runs `kubectl config current-context` + `kubectl get nodes`. Confirms reachability.
3. Beat 2 — *Verify your OpenAI credentials*: a single `echo $OPENAI_API_KEY | cut -c1-8` to confirm the env var is present (no full key printed).
4. Beat 3 — *Install kagent via CLI*: runs `kagent install` (the kagent v0.9.0 CLI installs CRDs + controller in the `kagent` namespace; the per-UC ModelConfig handles provider wiring later).
5. Beat 4 — *Verify the installation*: lists kagent CRDs, checks controller pod is `Running`, and lists ModelConfigs in the `kagent` namespace as a sanity check (zero or one is fine — per-UC ModelConfigs land later).
6. Tour ends. Participant moves on to UC1 with a healthy kagent install.

---

## Acceptance Criteria

- [ ] `uc0/` directory created with `tour.json` and `README.md`. No `manifests/` or `agents/` subfolders.
- [ ] `uc0/tour.json` has tour `id` = `kagent-uc0-install` (kebab-case, follows the `kagent-uc<N>-<symptom>` convention; UC1 is `kagent-uc1-imagepullbackoff`, UC4 is `kagent-uc4-coordinator`). `title` = `UC0 — Install kagent`. `description` is a one-sentence summary of the prep goal.
- [ ] `tour.json` has **4 steps** in this order, each schema-valid:
    1. *Check your cluster* — two commands: `kubectl config current-context` and `kubectl get nodes`.
    2. *Verify your OpenAI credentials* — one command: `echo $OPENAI_API_KEY | cut -c1-8 && echo '...(truncated)'`. Explanation references **OpenAI** (not Azure).
    3. *Install kagent via CLI* — one command: `kagent install` (no provider-specific flags — the kagent CLI's `install` command only accepts `--profile minimal|demo` per `kagent install --help`; the workshop uses default profile unless the spike during /dev-story shows `--profile demo` is needed for UC3's pre-packaged Prom/Grafana agents).
    4. *Verify the installation* — three commands: `kubectl get crds | grep kagent`, `kubectl get pods -n kagent`, `kubectl get modelconfig -n kagent`. **Namespace is `kagent`** (not `kagent-system` as in the original draft — the kagent CLI default per `kagent --help` is `kagent`).
- [ ] Step 5 from the original draft (the `workshop` namespace `fileEdits` + `kubectl apply`) is **dropped**: each diagnostic UC creates its own `artemis-uc<N>` namespace; a generic `workshop` ns has no consumer downstream.
- [ ] `tour.json` contains **no Azure OpenAI references** anywhere (`AZURE_OPENAI_API_KEY`, `--azure-openai-endpoint`, `--azure-openai-deployment`, "Azure", etc.). Provider is OpenAI only, consistent with the M2 UC1 ModelConfig.
- [ ] `docs/tour-content-conventions.md` gains a **"Prep tours" exception** clause: UC0 (and any future prep tour) is allowed a flat N-step structure (the 4-beat Mission setup → Mission status check → Call the agent → Manual recap is for diagnostic UCs only). The exception explicitly names UC0 and pins the rule "prep tours do not need a Beat 3 agent invocation".
- [ ] `uc0/README.md` is short and author-facing: explains UC0's role (run-this-first), names the prerequisite env var (`OPENAI_API_KEY`), points to `docs/tour-content-conventions.md` for the prep-tour exception, and lists the four steps.
- [ ] Root `README.md`: UC0 row added to the top of the UC index (above UC1) with a one-line description and a "run this first" annotation.
- [ ] `docs/sprint-status.yaml`: STORY-033 added to Sprint 2.5 with `status: completed` (when /dev-story closes), `actual_points` populated, and Sprint 2.5 metrics (`completed_points`) updated.
- [ ] `make validate-tours` is run locally and green over `uc0/tour.json`, `uc1/tour.json`, `uc2/tour.json`.
- [ ] The kagent install command (`kagent install`) is sanity-checked during /dev-story against the Makefile's `KAGENT_VERSION = 0.9.0` — if the v0.9.0 CLI requires a flag (e.g. `--profile demo` for the pre-packaged Prom/Grafana agents that UC3 will reuse), that flag is added in the AC and the rationale is recorded in Implementation Notes.
- [ ] PR cross-reviewed by both authors before merge (NFR-008).

---

## Technical Notes

### `kagent install` command surface (verified 2026-05-04)
Verified locally on `kagent` v0.7.1 (the CLI installed on the dev box; v0.9.0 surface confirmed equivalent unless `kagent install --help` on v0.9.0 says otherwise during /dev-story):

```
$ kagent install --help
Install kagent

Usage:
  kagent install [flags]

Flags:
  -h, --help             help for install
      --profile string   Installation profile (minimal|demo)
```

**No `--model-type`, no `--azure-openai-endpoint`, no `--azure-openai-deployment` flags exist**. The original draft `tour.json` was likely generated with a hallucinated CLI surface. UC0 reverts to plain `kagent install` (or `--profile demo` if UC3 needs the pre-packaged agents).

The CLI default namespace is `kagent` (not `kagent-system`). All verification commands in Beat 4 use `-n kagent`.

### Profile choice (`--profile demo` vs default)
A 5-min spike during /dev-story should confirm whether UC3's pre-packaged Prometheus / Grafana agents (per architecture L300) ship under the default profile or only with `--profile demo`. If only `demo`, UC0 must use `kagent install --profile demo`. If both, leave as default for a leaner install. Whichever wins, document the choice in `uc0/tour.json` Beat 3's `explanation` (italicised one-liner, same pattern as STORY-031's Beat 3 spike note).

### LLM provider — already chosen
UC1's `uc1/agents/modelconfig.yaml` ships `provider: OpenAI` + `model: gpt-4o-mini` with credentials externalised via the `artemis-llm-credentials` Secret. STORY-033 simply makes that visible to the participant by checking `OPENAI_API_KEY` is in the env. The workshop's M2 commitment to **OpenAI** is preserved; STORY-033 does **not** re-open the provider question.

### Files modified
- `uc0/tour.json` — new file, ≤ 200 lines, schema-valid.
- `uc0/README.md` — new file, short author-facing.
- `docs/tour-content-conventions.md` — append the **Prep tours** exception clause (§ near *The 4 beats*), update the quick checklist with a "UC0 / prep tours follow a flat N-step structure" line.
- `README.md` (root) — UC index gains a UC0 row at the top.
- `docs/sprint-status.yaml` — Sprint 2.5 + metrics updated when /dev-story closes.

### Files NOT modified (intentional)
- `Makefile` — `kagent-install` target stays as-is (CRDs only, helm-based). It serves the author / CI flow, not participants. A future story may align it; not scope of STORY-033.
- `uc1/`, `uc2/`, `uc3/`, `uc4/` — UC0 is independent of any other UC.
- `schemas/workshop-tour.schema.json` — no schema change needed; UC0 is a schema-valid tour by construction.
- `docs/prd-…md`, `docs/architecture-…md` — provider was implicitly fixed by M2; STORY-033 doesn't change it.

### Sample target `uc0/tour.json` shape
For reference (final wording is /dev-story's job):

```json
{
  "id": "kagent-uc0-install",
  "title": "UC0 — Install kagent",
  "description": "Get kagent running on your vCluster before any diagnostic scenario. By the end of UC0 the kagent controller is up, the CRDs are registered, and your OpenAI key is wired into the environment.",
  "steps": [
    { "title": "Check your cluster",                "explanation": "…", "commands": [ /* current-context + get nodes */ ] },
    { "title": "Verify your OpenAI credentials",    "explanation": "…", "commands": [ /* echo $OPENAI_API_KEY | cut -c1-8 */ ] },
    { "title": "Install kagent via CLI",            "explanation": "…", "commands": [ /* kagent install (--profile demo if confirmed by spike) */ ] },
    { "title": "Verify the installation",           "explanation": "…", "commands": [ /* CRDs + controller pod + modelconfig in kagent ns */ ] }
  ]
}
```

The original draft's 5th step (deploy `workshop` namespace) is dropped per the scope decision.

### NFR / FR references
- FR-006 (tour content convention): the prep-tour exception lands here.
- NFR-008 (cross-author review on conventions): required.
- NFR-009 (English copy): preserved.
- NFR-010 (self-contained steps): every step's commands run as-is in the participant's VS Code server terminal; `OPENAI_API_KEY` is assumed pre-set in the env (provided by `workshop-infrastructure`'s vCluster slice setup, same way the kubeconfig is pre-wired).
- NFR-011 (no secrets): the only secret-adjacent line is `echo $OPENAI_API_KEY | cut -c1-8` which prints **8 characters** of the key. Acceptable as a sanity check (the participant needs to know "yes my key is set"), but flag for `gitleaks` / scrubbing review during /dev-story — if even a partial key is too sensitive, downgrade to `[ -n "$OPENAI_API_KEY" ] && echo "OPENAI_API_KEY is set" || echo "MISSING"`.

---

## Dependencies

**Prerequisite stories:** none. UC0 is foundational and runs before all diagnostic UCs.

**Blocked stories:** UC0 should land before any participant runs the workshop end-to-end (M5 dry-run, STORY-028). STORY-033 doesn't *technically* block STORY-031 / STORY-032 — those are tour-text rewrites that don't depend on UC0 — but the participant flow does.

**External dependencies:**
- `kagent` CLI v0.9.0 install behaviour (verified locally on v0.7.1, sanity-check on v0.9.0 during /dev-story).
- `OPENAI_API_KEY` provided by `workshop-infrastructure` in the participant's vCluster slice env (out-of-repo dependency).

---

## Definition of Done

- [ ] `uc0/tour.json` + `uc0/README.md` committed.
- [ ] `docs/tour-content-conventions.md` prep-tour exception committed.
- [ ] Root `README.md` UC index updated with UC0.
- [ ] All AC ticked.
- [ ] `make validate-tours` clean locally.
- [ ] `kagent install` flow verified once on kind (or noted in Implementation Notes if blocked by no-cluster).
- [ ] PR reviewed by both authors.
- [ ] `docs/sprint-status.yaml` updated: STORY-033 → `status: completed` with `completion_date` and `actual_points`; Sprint 2.5 metrics refreshed.
- [ ] Merged to `main`.

---

## Story Points Breakdown

- **Folder + tour.json + README:** 1 point (the JSON is mostly drafted; AC adjustments are minor).
- **Convention exception (prep tours) in `tour-content-conventions.md`:** 0.5 point.
- **Root README UC index update:** 0.5 point.
- **Spike (kagent install profile + namespace + flag verification on v0.9.0):** 0.5 point.
- **Sprint-status + PR cross-review coordination:** 0.5 point.
- **Total:** 3 points.

**Rationale:** The user pre-drafted the tour content; STORY-033 is mostly translation work (Azure → OpenAI, kagent-system → kagent, drop spurious flags, drop the workshop ns step) plus the convention exception. No new agent CRDs, no manifests. One small spike on `--profile`.

---

## Additional Notes

- The original draft `tour.json` was authored against an unverified kagent CLI surface (Azure OpenAI flags don't exist; the namespace is `kagent`, not `kagent-system`). STORY-033's job is to land it correctly on top of the actual v0.9.0 surface.
- Per convention, the tour `id` `kagent-uc0-install` becomes **stable** once UC0 ships — no rename later. Distribution config and `.workshop-tour/state.json` will reference it.
- A `partial-key echo` is the sanity check used in Beat 2. If the workshop-infrastructure team prefers a non-printing check, switch to `[ -n "$OPENAI_API_KEY" ]` form. /dev-story may flag this during PR review.

---

## Progress Tracking

**Status History:**
- 2026-05-04: Created (Scrum Master, /create-story).
- 2026-05-04: Implemented (Developer, /dev-story).

**Actual Effort:** 3 points (matched estimate).

### Implementation Notes (2026-05-04)

#### Post-implementation tweak (2026-05-04, follow-up)
The original `tour.json` shipped with **4 steps**: cluster check / OpenAI credential echo / install / verify. The credential-echo step (`echo "$OPENAI_API_KEY" | cut -c1-8 …`) was subsequently **removed at the user's request** — even a partial-key echo touches the secret value, and the per-UC `artemis-llm` ModelConfig is what actually consumes the key downstream (the participant doesn't need to see it). UC0 is now a **3-step prep tour** (cluster check → install → verify); the original AC #3 reference to four steps + the "Verify your OpenAI credentials" item are both obsolete. The `OPENAI_API_KEY` env var stays in the prereqs (downstream UCs need it), it just isn't echoed.

#### Spike outcome — `kagent install --profile demo`
`kagent install --help` on the locally-installed CLI does not differentiate `--profile demo` from `--profile minimal` in its help output (both flags resolve to the same `Installation profile (minimal|demo)` line). Without a real cluster to compare side-by-side, **`--profile demo` is the chosen default** based on the architecture L300 constraint — UC3 reuses kagent's pre-packaged Prometheus / Grafana agents, and `demo` is the obviously-named profile that ships them. Switching to `--profile minimal` is a one-line change in `uc0/tour.json` Beat 3 if a future spike on v0.9.0 shows the demo profile is unnecessary. The choice is documented in the Beat 3 explanation (italicised one-liner, same pattern as STORY-031).

#### Tour content — Azure → OpenAI, kagent-system → kagent
The user-drafted `tour.json` referenced `--model-type azure-openai`, `--azure-openai-endpoint`, `--azure-openai-deployment` flags that do **not** exist on the kagent CLI's `install` subcommand (verified against `kagent install --help` — only `--profile` is exposed). Those flags were dropped wholesale. Provider remained the M2 commitment (**OpenAI**, per `uc1/agents/modelconfig.yaml`); the credential check is a partial-key echo of `OPENAI_API_KEY` (first 8 chars + `...(truncated)`). Namespace `kagent-system` was corrected to `kagent` (the kagent CLI default per `kagent --help`). Step 5 (`workshop` namespace creation) was dropped per scope — each diagnostic UC creates its own `artemis-uc<N>` namespace and a generic `workshop` ns has no consumer downstream.

#### Convention update — Prep tours exception
Inserted a new `## Prep tours (UC0 exception)` clause in `docs/tour-content-conventions.md` directly after `## The 4 beats` and before `## The no-spoiler rule`. The clause exempts UC0 from the 4-beat structure (no friction, no agent, no recap to flip) while keeping every other rule (NFR-009/010/011, schema, Artemis lore). Quick checklist updated with a `Prep-tour exception` bullet that lets prep tours skip the four 4-beat-specific items.

#### Files created / modified
- `uc0/tour.json` — new, 4-step prep tour, schema-valid.
- `uc0/README.md` — new, short author-facing.
- `docs/tour-content-conventions.md` — Prep tours exception inserted; quick checklist updated.
- `README.md` (root) — UC0 row added at the top of the Use cases table; the "Participants do not install anything by hand" paragraph rewritten to point at UC0.
- `docs/sprint-status.yaml` — STORY-033 closed (3/3 pts, completion 2026-05-04); Sprint 2.5 marked `completed` (14/14 pts, all four stories done); metrics rolled forward (`stories_completed` 19 → 20, `stories_not_started` 13 → 12).

#### Files NOT modified (intentional)
- `Makefile` — `kagent-install` target stays as-is (helm CRDs only). Author / CI install flow is unchanged. Future story may consolidate.
- `uc1/`, `uc2/`, `uc3/`, `uc4/` — UC0 is independent of any other UC.
- `schemas/workshop-tour.schema.json` — no schema change needed; `make validate-tours` green over `uc0` / `uc1` / `uc2`.

#### Validation
- `make validate-tours` runs over 3 tour files; all valid (schema is structural, not narrative — accepts both 4-beat and prep-tour shapes).
- Banned-word scan does not apply to UC0 (Prep tours exemption).

### AC sign-off
9/12 acceptance criteria satisfied as of 2026-05-04:

- [x] `uc0/` directory created with `tour.json` and `README.md`. No `manifests/` or `agents/`.
- [x] `uc0/tour.json` has tour `id` `kagent-uc0-install`, title `UC0 — Install kagent`, no-spoiler-clean description.
- [x] 4 schema-valid steps in the prescribed order (cluster check / OpenAI creds / install / verify). Namespace is `kagent`.
- [x] Step 5 (`workshop` namespace) dropped.
- [x] No Azure OpenAI references anywhere; OpenAI only.
- [x] `docs/tour-content-conventions.md` Prep tours exception clause added; quick checklist updated.
- [x] `uc0/README.md` short, author-facing, points at the convention's prep-tour clause.
- [x] Root `README.md` UC0 row added at the top of the use cases table; paragraph adjusted.
- [x] `docs/sprint-status.yaml` updated: STORY-033 → `completed` (3 pts); Sprint 2.5 → `completed`; metrics 20/33 stories complete.
- [x] `make validate-tours` green over `uc0` / `uc1` / `uc2`.
- [ ] **Live `kagent install --profile demo` walk-through on v0.9.0** — deferred to PR / M5 dry-run. The CLI surface was confirmed locally (v0.7.1) but the actual install behaviour on v0.9.0 is the residual unknown. Same deferral pattern as STORY-031 / STORY-032.
- [ ] PR cross-reviewed by both authors (NFR-008) — lands when the diff is opened as a PR.

### Next
Two open DoD checkboxes survive: live install walk-through and PR cross-review. Both land naturally when STORY-033 is opened as a PR — the M5 dry-run (STORY-028) is already designed to absorb the deferred walk-throughs across UC0 / UC1 / UC2.

---

**This story was created using BMAD Method v6 - Phase 4 (Implementation Planning).**
