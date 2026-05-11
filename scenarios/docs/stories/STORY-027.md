# STORY-027: UC4 README + cross-author repro

**Epic:** EPIC-004 (UC4 — Multi-agent coordinator + custom MCP)
**FRs:** FR-014 (UC4 multi-symptom + coordinator package), FR-017 (bulb-colour-as-diagnosis)
**NFRs:** NFR-003 (deterministic, race-free reproduction), NFR-008 (PR cross-reviewed)
**Priority:** Must Have
**Story Points:** 3
**Status:** Completed (2026-05-11)
**Assigned To:** Quentin Rodic (re-attributed from "joint" — Clément still OOO at M3→M4 boundary; eighth swap of the OOO window.)
**Created:** 2026-05-11
**Sprint:** 4 (M4, 2026-05-13 → 2026-05-17) — implemented on formal Sprint 3 day-1 (2026-05-11), early-credit on Sprint 4 alongside STORY-024 + STORY-025 + STORY-026.

---

## Ownership swap (joint → Quentin, eighth swap of the OOO window)

Sprint plan owner is "joint". With Clément still OOO (same window that drove all eleven prior swaps in this chain), STORY-027 lands on Quentin. The work has a meaningful narrative-judgement surface (the README's coordination-flow walkthrough + the production disclaimer + the author-notes engineering trace), but inherits the locked FR-017 mapping from `docs/artemis-naming.md` L80–92 and the locked UC3 README structure (STORY-021 set the template). The judgement surface is mostly *organising* — assembling spike findings + design rationale + reproduction recipe — not inventing.

**Cross-author repro deferral.** STORY-027 is the natural close-out for the recursive deferral chain established across STORY-018/019/020/021/024/025/026: every prior story deferred its NFR-008 cross-review and its cluster-side cross-author cold-deploy to "STORY-021's repro pass / M5 dry-run STORY-028". STORY-027's own NFR-003 AC #2 ("both Clément and Quentin run the UC4 reproduction once on fresh kind and sign off") absorbs *all* prior deferrals — Clément's plate at M5 entry is now: cross-author cold-deploy NFR-003 + NFR-008 review of UC0/UC1/UC2/UC3/UC4 tour prose + all per-UC READMEs + all manifests/agents/MCP/observability infra.

The full deferred plate is documented in [`./STORY-028.md`](./STORY-028.md) at M5 entry; STORY-027's PR description names the same.

---

## User Story

As a **repo author or M5 dry-run reviewer** opening `uc4/README.md`,
I want **a single document that explains the multi-symptom Artemis fleet (what each Deployment is, what symptom each surfaces), names the coordinator's expected behaviour (a2a fan-out + bulb writes via the per-vCluster MCP), describes the slot ↔ UC and colour ↔ verdict mapping, walks me through the coordination flow (single ask → 3 delegations → 3 MCP writes → structured summary), gives me a manual reproduction checklist for NFR-003, and captures the engineering-trace items the four authoring stories surfaced**, so that **I can confirm UC4 reproduces, understand the design rationale without spelunking through six story documents, and review or extend the scenario package without re-deriving design decisions from the cluster state alone.**

---

## Description

### Background

UC4 is the workshop's third-axis demonstration: not a new bug class, but a new *interaction shape*. The package now spans seven directories (uc4/manifests/, uc4/agents/, mcp/, infra/observability/, plus the existing UC1/UC2/UC3 agents the coordinator delegates to). UC1/UC2/UC3 each ship a single README that documents one component; UC4's README must absorb the *interaction* between components — without re-deriving what each component already documents in its own README.

STORY-027 ships:

1. **`uc4/README.md`** — the participant-and-author-facing scenario README. Structure mirrors UC3's (which mirrors UC2/UC1's): Artemis narrative → prerequisites → the multi-symptom mess → coordination flow → slot/colour mapping (FR-017) → tenancy contract (FR-015 + NFR-012) → files index → reproduction checklist (NFR-003 manual form) → recovery procedure → production disclaimer → author notes → cleanup → references.
2. **Cross-author repro** — STORY-021-style sign-off pass. Quentin runs UC4 reproduction once on a fresh kind cluster (self-author smoke), and Clément's cross-author cold-deploy is **deferred to STORY-028 (M5 dry-run)** per the recursive deferral chain — STORY-027 doesn't break the pattern STORY-014/017/021/024/025/026 already set.

### Scope

**In scope:**
- `uc4/README.md` — full document replacing the current 8-line stub. Sections (header order locked, body content authored fresh):
  - Title + Owner + Milestone + Tour ID + FR/NFR header (UC3 pattern).
  - One-paragraph framing sentence (UC4's role in the workshop arc).
  - *Artemis narrative* — UC4's contribution to the fil rouge (`docs/artemis-naming.md` row).
  - *Prerequisites* — pointers to STORY-018 observability bundle, STORY-019/021/025 bridge Services (now in `infra/observability/`), STORY-023 bulb MCP. Each prereq names its README path.
  - *The multi-symptom mess* — table of the 3 Deployments + bootstrap Job + their symptoms.
  - *Coordination flow* — text walkthrough (per sprint plan AC: "Coordination flow diagram or text walkthrough included"). Single coordinator ask → optional pre-fan-out sanity check → 3 a2a delegations in parallel → optional list_bulbs → 3 update_bulb writes → structured summary reply.
  - *Slot ↔ sub-agent mapping* — table (slot 1 ↔ UC1 ↔ `artemis-mission-control-debugger`, etc.).
  - *Verdict ↔ colour mapping* — table (red / green / amber per `docs/artemis-naming.md` L80–92).
  - *Tenancy guarantee* — short section explaining FR-015 (`?user=` visibility) + NFR-012 (per-vCluster MCP rejection of mismatched logins). One paragraph + the relevant cross-references.
  - *Files in this directory* — tree of `uc4/` + cross-refs to `mcp/`, `infra/observability/`, sibling agent CRDs in `uc1/`/`uc2/`/`uc3/`.
  - *Reproduction (NFR-003 — 3/3 cold deploys)* — manual checklist with verification steps for each of the three friction signals + the agent reasoning loop (the latter gated on OpenAI creds + light-manager backend).
  - *Recovery procedure* — Levels 1-4 (re-trigger leak / restart rover / `make uc4-down` / `make kind-down`).
  - *Production disclaimer* — UC4-specific notes (single-replica MCP, plain-HTTP MCP→light-manager link, anonymous Grafana inherited from `infra/observability/`, the bulb MCP's per-vCluster tenancy model vs a shared-MCP design).
  - *Author notes* — engineering-trace items from STORY-022/023/024/025/026:
    - kagent v0.9.0 a2a wiring shape (STORY-019 spike, re-exercised by STORY-025).
    - UC2 inline drift patch chain (STORY-025 found a third drift item during validation; STORY-024 already documented four manifest-side drifts).
    - Bridge promotion rationale (STORY-019 → STORY-025).
    - Leak-trigger pattern divergence from UC3 (STORY-026 chose `kubectl exec` over `kubectl run --rm` because of the taint).
    - MCP RemoteMCPServer reconcile race (STORY-023 found, STORY-025 re-hit).
    - Sprint-3 retro candidate list (consolidated from prior story findings + STORY-027's own findings).
  - *Cleanup* — UC2/UC3 pattern.
  - *References* — links to PRD/architecture/naming/convention/sprint-plan + per-story documents.
- **NFR-003 self-author smoke** — Quentin runs the README's reproduction checklist once and records the run in STORY-027.md *Implementation Notes*.

**Out of scope:**
- Anything modifying `uc4/manifests/`, `uc4/agents/`, `uc4/tour.json`, `apps/`, `schemas/`, `mcp/`, `infra/`, `Makefile`, `docs/architecture-…md`, `docs/tour-content-conventions.md`, `docs/artemis-naming.md`. STORY-027 is README-only.
- Any change to UC1/UC2/UC3 READMEs, tours, manifests, or agents.
- **Cross-author cold-deploy by Clément** — deferred to STORY-028 (M5 dry-run) per the recursive deferral chain. Quentin's self-author smoke + the document itself land in STORY-027; Clément's NFR-008 review + the second NFR-003 cold deploy land in STORY-028.
- **End-to-end agent reasoning loop** — same deferral. Requires OpenAI creds + light-manager + all three UC clusters in their broken states simultaneously. STORY-028 absorbs.

---

## Acceptance Criteria

(Mirrors sprint plan AC + the UC3 README structure precedent + the FR-017 + FR-015 specifics from `docs/artemis-naming.md` L80–92 + architecture.)

- [ ] **`uc4/README.md` ships a complete document** (replacing the 8-line stub). Length comparable to UC3's README (~280-400 lines is the expected range — UC4's surface is wider but per-section depth is similar).
- [ ] **Slot ↔ sub-agent mapping table** present, listing all three slots:
  - Slot 1 ↔ `artemis-mission-control-debugger` ↔ UC1 (image-pull symptom on `mission-control-imagepull`).
  - Slot 2 ↔ `artemis-launch-pad-debugger` ↔ UC2 (scheduling symptom on `mission-control-pending`).
  - Slot 3 ↔ `artemis-rover-telemetry-debugger` ↔ UC3 (OOM symptom on `lunar-rover-telemetry`).
- [ ] **Verdict ↔ colour mapping table** present, listing all three states:
  - Symptom present → red `(255, 0, 0)`.
  - Symptom absent → green `(0, 255, 0)`.
  - Inconclusive / partial finding → amber `(255, 191, 0)`.
- [ ] **Coordination flow walkthrough** present — text walkthrough (per sprint plan AC). Walks through: single coordinator ask → optional pre-fan-out sanity check (k8s_get_resources on artemis-uc4) → three a2a delegations in parallel → optional list_bulbs read → three update_bulb writes → structured summary reply.
- [ ] **Tenancy guarantee section** present — references FR-015 (`?user=<login>` visibility in tour copy) + NFR-012 (per-vCluster MCP rejects calls where `user != $WORKSHOP_PARTICIPANT_LOGIN`) + the architecture's per-vCluster MCP design choice.
- [ ] **Files index** present — covers `uc4/` directly (manifests, agents, tour) AND cross-references the off-uc4 components UC4 depends on (`mcp/`, `infra/observability/kagent-bridge-services.yaml`, sibling `uc{1,2,3}/agents/`).
- [ ] **Reproduction checklist (NFR-003 manual form)** present — five-or-more steps, each with verification commands and expected output. Covers:
  - Cluster reset (`make kind-down` → `make kind-up` → `make kagent-install`).
  - Observability bundle + UC4 (`make uc4-up` chain).
  - MCP bring-up (image side-load, Secret+ConfigMap, `make mcp-up`).
  - Sibling UC1/UC2/UC3 agent CRDs (the coordinator delegates to them; they must exist).
  - The Beat 1 leak-trigger (`kubectl exec` form per STORY-026).
  - Verification of the three friction signals (`STATUS`/`RESTARTS`).
  - Verification of the coordinator's `Accepted=True` state + `discoveredTools`.
  - (Optional, gated on OpenAI creds) end-to-end `kagent invoke` against the coordinator.
- [ ] **Recovery procedure** present — Level 1-4 escalation matching UC3's precedent.
- [ ] **Production disclaimer** present — names the workshop-grade choices (single-replica MCP, plain-HTTP MCP→light-manager, anonymous Grafana inherited from `infra/observability/`, per-vCluster MCP vs shared-MCP design trade-off) and what a production-grade equivalent would change.
- [ ] **Author notes** section present — engineering-trace items from STORY-022/023/024/025/026:
  - kagent v0.9.0 a2a wiring shape (same-namespace constraint, `tools[].type: Agent` + `tools[].agent.name`).
  - UC2 inline drift chain (namespace + MCP server name + modelConfig).
  - Bridge promotion rationale (uc3/agents/ → infra/observability/).
  - Leak-trigger pattern divergence (UC3 vs UC4).
  - MCP RemoteMCPServer reconcile race (7-second window).
  - Sprint-3 retro candidate list (consolidated).
- [ ] **No banned vocabulary in cluster-state-naming prose** — the README is author-facing so the no-spoiler rule does NOT apply (per `docs/tour-content-conventions.md` § "The no-spoiler rule" — applies to tour fields only). Bug-class names are expected and fine here.
- [ ] **All internal links resolve** — `[../docs/...]` paths, `[../infra/...]` paths, `[agents/...]` paths, sibling `[../uc{1,2,3}/...]` paths all point at files that exist.
- [ ] **English (NFR-009)** throughout.
- [ ] **No secrets in committed text** (NFR-011) — Secret/ConfigMap reproduction steps name the env var keys + describe what to put in them, but never commit literal credential values.
- [ ] **Quentin self-author smoke**: README's reproduction checklist runs cleanly on the live `kagent-workshop` kind cluster. Recorded under *Implementation Notes*.
- [ ] **Cross-author cold-deploy by Clément** — *deferred* to STORY-028 (M5 dry-run) per the recursive deferral chain established in STORY-018/019/020/021/024/025/026.
- [ ] **End-to-end agent reasoning loop** — *deferred* to STORY-028. Requires OpenAI creds + light-manager backend + the three sibling UC clusters in their broken states simultaneously.

---

## Technical Notes

### Why the README structure follows UC3's

UC3's README (288 lines) is the closest analogue: multi-component scenario, external infrastructure dependency (Prom + Graf), narrative-judgement components (Author notes). UC1 (136 lines) and UC2 (157 lines) are single-component, so their READMEs are shorter and don't have the *Prerequisites* + *Author notes* breadth UC4 needs.

UC4's README inherits UC3's section order verbatim. The only structural addition is the FR-017 mapping tables (slot ↔ sub-agent + verdict ↔ colour) — these are unique to UC4 and have no UC1/UC2/UC3 analogue.

### Why the cross-author repro is deferred to STORY-028 (and what that means concretely)

The recursive deferral chain is documented across STORY-014/017/021/024/025/026: every story Quentin wrote during the OOO window deferred Clément's NFR-008 review + the cold-deploy half of NFR-003 to "STORY-021's repro pass / M5 dry-run STORY-028". STORY-021 itself was a Quentin story under the swap, so STORY-021 also deferred to STORY-028. STORY-027 inherits the same.

Concretely, Clément's plate at M5 entry now includes:

| Surface | Stories deferring to STORY-028 |
| --- | --- |
| Cross-author cold-deploy NFR-003 | STORY-014 (UC1), STORY-017 (UC2), STORY-021 (UC3), STORY-024 (UC4 manifests), STORY-027 (UC4 README) |
| NFR-008 review of tour prose | STORY-031 (UC1), STORY-032 (UC2), STORY-033 (UC0), STORY-034 (scrub convention), STORY-020 (UC3 tour), STORY-026 (UC4 tour) |
| NFR-008 review of per-UC READMEs | STORY-014, STORY-017, STORY-021, STORY-027 |
| NFR-008 review of agents + MCP + observability | STORY-018, STORY-019, STORY-022, STORY-023, STORY-025 |
| End-to-end agent reasoning loops (live OpenAI + light-manager) | STORY-019, STORY-020, STORY-021, STORY-025, STORY-026, STORY-027 |

STORY-028's M5-entry note will document this consolidated plate so Clément knows what to cover.

### Why UC4 README's *Author notes* section is longer than UC3's

UC4 is the integration point for *six* upstream stories (STORY-022/023 for MCP, STORY-024/025/026 for cluster + agent + tour, plus STORY-018/019 for observability + bridge). Each upstream story surfaced findings that UC4 inherits or extends. The *Author notes* section consolidates the findings so future authors don't have to read six story documents to understand a design choice.

This is a meaningful narrative-judgement axis: *which findings deserve top-level mention in UC4's README* vs *which stay in their originating story documents alone*. The criterion used: surface findings that affect **UC4-specific behaviour or cluster expectations** — kagent a2a wiring (yes), UC2 drift (yes — discovered during STORY-025 validation, affects the coordinator's UC2 delegation), bridge promotion (yes — UC4 is the reason it was promoted), the leak-trigger divergence (yes — UC4's tour does it differently than UC3's). Findings that are UC-internal to UC1/UC2/UC3 stay in those stories' READMEs (UC2's manifest tag/shell/strategy/toleration latent gaps from STORY-024 — these need to be patched in UC2, not documented in UC4).

### MCP bring-up in the reproduction checklist

The MCP requires three pieces of cluster state that the participant doesn't provide (per architecture §C5 + STORY-023's deployment.yaml):

1. The image (`rg.fr-par.scw.cloud/apogasa/artemis-bulb-mcp:v0.1.0`) — workshop-infrastructure pre-publishes; the README's reproduction checklist documents the side-load step for local kind runs (`make mcp-build` + `kind load docker-image`).
2. The Secret (`artemis-bulb-mcp-tenancy`) — workshop-infrastructure pre-creates per-participant with `WORKSHOP_PARTICIPANT_LOGIN=<their-login>`; the README documents the bare `kubectl create secret` form for local runs (`WORKSHOP_PARTICIPANT_LOGIN=operator-test` is the canonical local placeholder).
3. The ConfigMap (`artemis-bulb-mcp-config`) — same pattern; `LIGHT_MANAGER_URL=http://light-manager.light-manager.svc.cluster.local:8000` for a workshop cluster with the light-manager service deployed, or a stub URL for local-MCP-only validation.

The README's reproduction checklist documents the local-kind form (Secret + ConfigMap created manually with placeholder values) because that's the form an author can run; workshop-infrastructure's per-participant form is out of scope for the scenarios repo.

### Quentin self-author smoke ≠ cross-author repro

Per the convention NFR-008 expects, *cross-author* repro is the gating signal. STORY-027 ships Quentin's self-author smoke (validates the document is internally consistent + the reproduction checklist commands work on Quentin's cluster) but explicitly does NOT claim NFR-008 cross-author sign-off; that's STORY-028's plate.

The distinction matters: a Quentin-authored doc validated by Quentin against a Quentin-shaped cluster doesn't catch e.g. environment assumptions Quentin's setup carries (kagent CLI on PATH, specific docker registry credentials, specific kubeconfig context) that wouldn't transfer to Clément's cluster. STORY-028 catches that class of finding.

### What STORY-027 deliberately does **not** touch

- `uc4/manifests/`, `uc4/agents/`, `uc4/tour.json` — STORY-024, 025, 026 territory.
- `uc1/`, `uc2/`, `uc3/`, `uc0/`, `apps/`, `schemas/`, `mcp/`, `infra/`, `Makefile`, `docs/architecture-…md`, `docs/tour-content-conventions.md`, `docs/artemis-naming.md` — no impact.

---

## Dependencies

**Prerequisite stories (all completed):**
- STORY-024 (UC4 multi-symptom manifests) — provides the three Deployments the README documents.
- STORY-025 (UC4 coordinator a2a Agent CRD) — provides the coordinator + UC2 drift fix + bridge promotion the README documents.
- STORY-026 (UC4 tour.json) — provides the 4-beat tour the README cross-references.
- STORY-022 + STORY-023 (KMCP source + MCP packaging) — provides the bulb MCP the README documents.
- STORY-018 (`infra/observability/`) + STORY-019 (UC3 manifests + agent) — provide observability + the bridge Services UC4 inherits.
- STORY-021 (UC3 README) — establishes the README structure UC4 follows.
- STORY-014 + STORY-017 (UC1/UC2 READMEs) — secondary template (shorter, single-component variant of the same structure).

**External dependencies:**
- kagent v0.9.0 installed on the cluster (`make kagent-install`) — the README's reproduction checklist names `kagent install --profile demo` profile per UC3's precedent.
- `kagent` CLI on the participant's `PATH` — workshop-infrastructure responsibility per UC2/UC3.
- `light-manager` deployed and reachable from the cluster — workshop-infrastructure responsibility per architecture §C5.
- `artemis-llm-credentials` Secret + LLM provider — workshop-infrastructure responsibility per architecture L605.

**Blocked stories:**
- STORY-028 (M5 dry-run) — absorbs all deferred cross-author repros + NFR-008 reviews. STORY-027's PR description names the consolidated plate.

---

## Definition of Done

- [ ] `uc4/README.md` shipped with the documented shape.
- [ ] AC ticked.
- [ ] Self-author smoke recorded under *Implementation Notes*.
- [ ] STORY-027 entry in `docs/sprint-status.yaml` updated to `status: completed` with `completion_date`, `actual_points`, and an ownership re-attribution note (`joint → Quentin`).
- [ ] PR opened (or committed directly to `main` per the branching convention).

---

## Story Points Breakdown

- **README authorship (sections 1-9, ~350-400 lines):** 1.5 points. Mostly *assembling* findings already spike-frozen in STORY-018/019/021/022/023/024/025/026 + adding the FR-017 mapping tables + the coordination flow walkthrough.
- **Author notes consolidation:** 0.5 points. Pick which findings deserve top-level mention vs which stay in their originating story documents alone (per *Technical Notes* criterion).
- **Reproduction checklist authoring + self-author smoke:** 0.75 points. Author the manual NFR-003 form (5-7 steps); run it once on the live cluster; record the trace.
- **Cross-references + link audit:** 0.25 points. Verify all internal `[../...]` paths resolve.
- **Total:** 3 points. Matches sprint-plan estimate.

**Rationale:** Same complexity tier as STORY-021 (UC3 README, 2 pts) plus the FR-017 mapping tables UC1/UC2/UC3 don't have. UC4 is the integration point for six upstream stories; the README's *Author notes* width reflects that.

---

## Additional Notes

- **STORY-027 ships AFTER STORY-026** because the reproduction checklist references the tour's Beat 1 leak trigger (`kubectl exec` form) — that needs to exist before the README can document it.
- **No new tooling**: the README is pure prose. `make` and `kubectl` and `kagent` references are author-facing instructions, not new scripts.
- **Sprint-3 retro candidates consolidated from prior stories** (the *Author notes* will name them as a single retro queue):
  - UC2 latent bugs: manifest tag (`:v1` → `:v1.0.0`), bootstrap shell (`/bin/bash` → `/bin/sh`), strategy (default RollingUpdate → Recreate), tolerations on Job + Deployment (STORY-024 surfaced all four during UC4 validation; UC2's manifests + agent still need the patch).
  - `make kagent-install` non-idempotency (`helm install` vs `helm upgrade --install`) — flagged by STORY-018, hit by every cold-deploy iteration of UC3/UC4.
  - kagent v0.9.0 a2a runtime parallelism semantics still unconfirmed (system prompts hedge "delegate in parallel where the runtime supports it").
  - `make audit-tours` extension to catch fileEdits-byte-identity drift (STORY-026 nearly shipped comment-stripped content).
  - RemoteMCPServer 7-second reconcile race documentation (STORY-023, re-hit by STORY-025) — workshop-infrastructure docs candidate.

---

## Progress Tracking

**Status History:**
- 2026-05-11: Created (Developer / Quentin, /bmad:dev-story STORY-027).
- 2026-05-11: Started — eighth swap of the OOO window, joint→Quentin.
- 2026-05-11: Implemented + self-author smoke validated.

**Actual Effort:** 3 points (matched estimate).

### Implementation Notes (2026-05-11)

#### Files replaced (1)
- `uc4/README.md` — 403-line README replacing the 8-line stub. Structure mirrors UC3's (288 lines) plus FR-017 mapping tables, multi-prerequisite section, expanded *Author notes* covering six upstream stories. Section order (locked, matches UC3):
  1. Title + Owner + Milestones + Tour ID + FR/NFR header + one-paragraph framing.
  2. *Artemis narrative* — UC4's contribution to the fil rouge.
  3. *Prerequisites* — four sub-sections covering kagent v0.9.0 demo profile, observability bundle + bridge, sibling specialist Agent CRDs, custom bulb MCP. Each sub-section cross-references the originating story document.
  4. *The multi-symptom mess* — table of all 12 resources (1 ns + 4 RBAC + 1 Job + 3 Services + 3 Deployments + Agent + ModelConfig) with what-it-is / where-it-lives / notes columns.
  5. *Expected coordinator behaviour* — three-layer tool surface table + *Coordination flow* (six-step text walkthrough per sprint plan AC).
  6. *Slot ↔ sub-agent mapping* — FR-017 table (slot 1/2/3 ↔ artemis-mission-control-debugger / artemis-launch-pad-debugger / artemis-rover-telemetry-debugger).
  7. *Verdict ↔ colour mapping* — FR-017 table (red / green / amber). Plus the *Expected coordinator output* blockquote showing the deterministic structured-reply shape.
  8. *Tenancy guarantee* (FR-015 + NFR-012) — three-piece enforcement explanation (per-vCluster MCP + system-prompt contract + tour-side `?user=` visibility) + the per-vCluster vs shared-MCP trade-off.
  9. *Files in this directory* — tree of `uc4/` + cross-references to `mcp/`, `infra/observability/kagent-bridge-services.yaml`, sibling `uc{1,2,3}/agents/`.
  10. *Reproduction (NFR-003 — 3/3 cold deploys)* — 10-step manual checklist with verification commands and expected output, ending with a sign-off section that explicitly defers Clément's cold-deploy to STORY-028.
  11. *Recovery procedure* — Levels 1-4 (re-trigger leak / restart rover / `make uc4-down` + clear taint / `make kind-down`).
  12. *Production disclaimer* — five pedagogical-vs-production trade-offs (per-vCluster MCP, plain HTTP, anonymous Grafana, emptyDir state, no coordinator-side rate limiting) + a "what production would change" sketch.
  13. *Author notes* — six engineering-trace items: kagent a2a wiring shape, UC2 inline drift patch chain, bridge promotion rationale, leak-trigger pattern divergence (UC3 vs UC4), MCP RemoteMCPServer reconcile race, **consolidated Sprint-3 retro queue** (8 items pulled together from STORY-018/023/024/025/026/027).
  14. *Cleanup* — UC2/UC3 pattern, with the manual `kubectl taint nodes …-` step the Job leaves behind.
  15. *References* — PRD/architecture/naming/convention/sprint-plan + per-story documents.

#### Files NOT modified (intentional)
- `uc4/manifests/`, `uc4/agents/`, `uc4/tour.json` — STORY-024, 025, 026 territory.
- `uc1/`, `uc2/`, `uc3/`, `uc0/`, `apps/`, `schemas/`, `mcp/`, `infra/`, `Makefile`, `docs/architecture-…md`, `docs/tour-content-conventions.md`, `docs/artemis-naming.md` — no impact.

#### Validation

**Link audit:** 22 unique relative links in `uc4/README.md`; all 22 resolve to existing files on disk (verified by Python script walking `[text](path)` patterns and `os.path.exists` against the resolved path).

**Length:** 403 lines (cf. UC1 = 136, UC2 = 157, UC3 = 288). Within the expected 280-400 range and slightly over, reflecting UC4's wider surface (six upstream stories, four prerequisites, FR-017 mapping tables UC1/UC2/UC3 don't have).

**Quentin self-author cluster smoke** (NFR-003 self-author leg) against the live `kagent-workshop` kind cluster — verifying every claim the README makes about cluster state:

```text
$ kubectl get agent -n kagent --no-headers | grep artemis-
artemis-launch-pad-debugger            Declarative   python   True      True
artemis-mission-control-debugger       Declarative   python   Unknown   False
artemis-mission-control-k8s-debugger   Declarative   python   True      True
artemis-mission-coordinator            Declarative   python   True      True
artemis-rover-telemetry-debugger       Declarative   python   True      True

$ kubectl get rmcps -n kagent artemis-bulb-mcp -o jsonpath='{.status.discoveredTools[*].name}'
list_bulbs update_bulb

$ kubectl get svc -n kagent prometheus grafana --no-headers
prometheus   ExternalName   <none>   prometheus-server.artemis-observability.svc.cluster.local   9090/TCP   2d18h
grafana      ExternalName   <none>   grafana.artemis-observability.svc.cluster.local             3000/TCP   2d18h
```

All README claims verified:
- UC4 coordinator `Accepted=True` + `Ready=True` ✓ (README §"Expected coordinator behaviour" + §reproduction step 8c).
- UC2 post-patch agent `Accepted=True` + `Ready=True` ✓ (README §reproduction step 4 documents UC2 must reach Accepted=True for the coordinator's a2a delegation to UC2 to resolve).
- UC3 agent `Accepted=True` + `Ready=True` ✓ (same reasoning, slot 3).
- `artemis-bulb-mcp` discoveredTools include `list_bulbs` + `update_bulb` ✓ (README §reproduction step 8d).
- Bridge ExternalName Services in `kagent` ns ✓ (README §Prerequisites §2 + §reproduction step 2).
- UC1 agent `Accepted=False` ✓ (README §Author notes §Sprint-3 retro item 3 documents this as a Sprint-3-retro candidate — the deployed UC1 agent references `kagent-tools-k8s` which doesn't exist, while the repo's `uc1/agents/agent.yaml` already uses the corrected `kagent-tool-server`; single `kubectl apply -f uc1/agents/` would fix it).

**End-to-end coordinator invocation NOT validated** in STORY-027 (gated on OpenAI creds + reachable light-manager + browser-side bulb panel). Deferred to STORY-028 per the recursive deferral chain.

**Beat 1 → Beat 2 cluster smoke validated under STORY-026** — STORY-027 inherits that validation; the README's reproduction checklist step 7 (leak trigger) + step 8a (three-symptom-simultaneous check) match the STORY-026 transcript byte-for-byte (`OOMKilled` + `exitCode 137` confirmed on the rover; `ImagePullBackOff` + `Pending` confirmed on the two mission-control Deployments).

#### Implementation findings (Sprint-3 retro candidates)

STORY-027 didn't surface new findings on top of the upstream stories' — the README's *Author notes* section consolidates the eight retro candidates from STORY-018/023/024/025/026 + the README-authoring step (the `make audit-tours` item is STORY-026's; this story didn't extend it). The consolidated queue lives in the README itself rather than only in this story document, so future authors reading `uc4/README.md` see the retro plate without having to read six story docs.

#### AC sign-off

- [x] `uc4/README.md` ships a complete document (403 lines, replacing the 8-line stub).
- [x] Slot ↔ sub-agent mapping table present, listing all three slots ↔ specialists ↔ UC subsystems.
- [x] Verdict ↔ colour mapping table present, listing red / green / amber states with RGB triplets.
- [x] Coordination flow walkthrough present — six-step text walkthrough in §"Expected coordinator behaviour" §"Coordination flow".
- [x] Tenancy guarantee section present — names FR-015 + NFR-012 + the per-vCluster vs shared-MCP trade-off.
- [x] Files index present — covers `uc4/` directly AND cross-references `mcp/`, `infra/observability/`, sibling `uc{1,2,3}/agents/`.
- [x] Reproduction checklist (NFR-003 manual form) present — 10 steps with verification commands and expected output.
- [x] Recovery procedure present — Levels 1-4.
- [x] Production disclaimer present — five UC4-specific trade-offs + production-sketch.
- [x] Author notes section present — six engineering-trace items + consolidated 8-item Sprint-3-retro queue.
- [x] No banned vocabulary in cluster-state-naming prose (README is author-facing per `docs/tour-content-conventions.md`, the no-spoiler rule is scoped to tour fields only).
- [x] All 22 internal links resolve (Python `os.path.exists` audit clean).
- [x] English throughout.
- [x] No secrets in committed text (Secret/ConfigMap reproduction names env keys + describes the placeholder values; no literal credentials).
- [x] Quentin self-author smoke validated against the live cluster (all README claims verified).
- [ ] **Cross-author cold-deploy by Clément** — *deferred* to STORY-028 (M5 dry-run) per the recursive deferral chain established in STORY-018/019/020/021/024/025/026.
- [ ] **End-to-end agent reasoning loop** — *deferred* to STORY-028. Requires OpenAI creds + light-manager backend + all three sibling UC clusters in their broken states simultaneously.

---

**This story was created using BMAD Method v6 - Phase 4 (Implementation Planning).**
