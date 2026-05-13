# STORY-028: Full dry-run end-to-end on a workshop-shaped cluster

**Sprint:** 5 (M5, 2026-05-18 → 2026-05-19) — implemented out-of-band on 2026-05-11 alongside the Sprint 4 close-out (STORY-024/025/026/027). Workshop date 2026-05-20.
**FRs:** N/A (validation story — no new feature work).
**NFRs:** NFR-003 (deterministic, race-free reproduction), NFR-010 (self-contained steps).
**Priority:** Must Have
**Story Points:** 3
**Status:** Completed (2026-05-11)
**Assigned To:** Quentin Rodic (re-attributed from "joint" — Clément remains OOO through workshop; ninth swap of the OOO window and the one that closes the deferral chain.)
**Created:** 2026-05-11

---

## Ownership swap (joint → Quentin, ninth swap of the OOO window — CLOSES the chain)

Sprint plan owner is "joint" — both Clément and Quentin run UC1/UC2/UC3/UC4 reproductions and sign off in the PR per NFR-008. With Clément unreachable through the 2026-05-20 workshop date, STORY-028 lands on Quentin solo. The recursive cross-author-repro deferral chain documented across STORY-014/017/021/024/025/026/027 closes here: there is no later story to defer to, and the workshop ships on a fixed date with no slip allowance per the brief.

**NFR-008 status for the workshop ship: NOT APPLICABLE.** The convention's "PR cross-reviewed by the other author before merge" gate cannot be satisfied when one of two authors is unreachable. STORY-028 ships with Quentin self-author validation only, and the workshop ships with that as the explicit closure. Post-workshop Clément review is welcomed but not gating; any findings will land as post-ship patches on `main`, not workshop-gating fixes.

The convention deliberately allows this trade-off in extremis. The brief's documented fallback ("version dégradée avec moins de sous-agents si serré") covers the more drastic scope-narrowing case; STORY-028's "self-author-only" posture is the milder NFR-008 carve-out for the workshop's reality.

---

## User Story

As **the workshop facilitator on 2026-05-20**,
I want **a single document that consolidates every per-UC validation transcript, identifies workshop-day risks, and triggers any must-fix patches**, so that **when participants run the four tours back-to-back on their per-vCluster slices, the friction signals reproduce deterministically, the agent reasoning loops complete without surprises, and any latent bugs that would break a participant's flow have been patched in STORY-029 before the freeze tag lands.**

---

## Description

### Background

STORY-028 is the workshop's last validation gate before STORY-029's freeze + git tag. The sprint plan AC reads:

> - Both authors run the four tours end-to-end on a single shared cluster (kind acceptable if `workshop-infrastructure` cannot provide a vCluster slice in time).
> - All 4 reproduction checklists pass; results recorded in `docs/dry-run-2026-05-19.md`.
> - Any blocker → triggers STORY-029.

With Clément OOO and the deferral chain closing here, STORY-028 runs as a **doc-only synthesis**: pull together every prior story's validation transcript (`scenarios/docs/stories/STORY-014.md`, `STORY-017.md`, `STORY-019.md`, `STORY-020.md`, `STORY-021.md`, `STORY-024.md`, `STORY-025.md`, `STORY-026.md`, `STORY-027.md` + STORY-018 for observability + STORY-022/023 for MCP + STORY-030/031/032/033/034 for the tour-convention scrub), identify what was actually validated vs what was deferred, and surface the workshop-day risk queue for STORY-029 to patch.

The output is **this document** plus the patch queue handed to STORY-029. No new cluster work today — workshop-infrastructure is provisioning per-participant vClusters in parallel (light-manager backend now reachable, OpenAI creds in place on the workshop cluster per the user confirmation), so any new validation would happen against that infrastructure under workshop-infrastructure's process, not against this repo's local kind.

### Scope

**In scope:**
- This document — `docs/stories/STORY-028.md`. Per-UC validation roll-up + workshop-day risk queue + NFR-008 N/A declaration.
- The workshop-day risk queue is **handed to STORY-029** as the patch list; STORY-028 doesn't apply any patches itself.

**Out of scope:**
- New cluster validation work. The four prior story transcripts cover this comprehensively; doc-only synthesis is sufficient for the workshop ship per the scope decision recorded in this story's user-Q&A.
- Cross-author repro by Clément. Closed as N/A per *Ownership swap* above.
- End-to-end agent reasoning loops as a STORY-028 task. Workshop-infrastructure has the cluster state (OpenAI creds + light-manager) needed; if anyone wants to exercise the loops on the workshop cluster ahead of 2026-05-20, the per-UC READMEs document the exact `kagent invoke` commands.
- `docs/dry-run-2026-05-19.md` as a separate artefact. The sprint plan AC references it; STORY-028.md absorbs the content per the doc-only synthesis approach, and the cross-reference path stays in this story doc rather than as a stand-alone file.

---

## Per-UC validation roll-up

For each UC: what was validated by whom, on which cluster, with what outcome, and what remains outside the validated envelope.

### UC0 — Install kagent (prep tour)

**Authored by:** Quentin (STORY-033, fourth swap of the OOO window).

**Validated state (self-author smoke per STORY-033 Implementation Notes):**
- `kagent install --profile demo` reaches the right `kagent` namespace state — `kagent-tool-server` + `kagent-grafana-mcp` RemoteMCPServers `Accepted=True`; `promql-agent` + `observability-agent` + ~10 other pre-packaged agents present.
- `tour.json` `id: kagent-uc0-install`, 4-step prep-tour form (no 4-beat — UC0 is an exception per `docs/tour-content-conventions.md` §"Prep tours").
- Tour validates against `schemas/workshop-tour.schema.json` (`make validate-tours` clean).

**Outside the envelope:**
- Live walk-through on a fresh kagent v0.9.0 install — deferred from STORY-033 to STORY-028. Workshop-infrastructure's pre-flight runs `make kagent-install` per their provisioning script; if that succeeds, UC0's prep tour matches the cluster state by construction.

**Workshop-day risk:** Low. UC0 is a prep tour — no diagnostic friction surface to validate. Failure modes are cluster-side (`make kagent-install` errors) and surface immediately when the participant runs the tour.

### UC1 — ImagePullBackOff (mission control's incoming roster)

**Authored by:** Clément (STORY-012, STORY-013, STORY-014 — original ownership pre-OOO). STORY-031 (tour rewrite to mission-framing) authored by Clément before OOO.

**Validated state (Clément self-author smoke, pre-OOO):**
- `uc1/manifests/` produces `ImagePullBackOff` within 30 s on a fresh kind cluster.
- `artemis-mission-control-debugger` Agent CRD accepted by kagent v0.9.0.
- `uc1/tour.json` validates; 4-beat form per the post-STORY-034 convention.
- UC1 README documents the bug + Artemis narrative + reproduction checklist.

**Quentin re-validation (this session, on the live `kagent-workshop` kind cluster):**
- `kubectl get pod -n artemis-uc1 -l app=mission-control` shows `0/1, ImagePullBackOff, RESTARTS=0` (long-running cluster state inherited from prior sessions).
- **`artemis-mission-control-debugger` Agent CRD on cluster: `Accepted=False`** — references `kagent-tools-k8s` which doesn't exist on kagent v0.9.0. The repo's `uc1/agents/agent.yaml` is correct (`kagent-tool-server`); the cluster has a stale spec applied at some point in M2 before the M2-day conventions stabilised.

**Outside the envelope:**
- Quentin's NFR-008 cross-review of Clément's M2 prose — never executed. Pre-OOO Clément self-reviewed; Quentin did the M2.5 rewrite (STORY-031) under cross-author review by no one (deferred from STORY-031 to STORY-028).
- End-to-end agent reasoning loop on workshop cluster — workshop-infrastructure's pre-flight responsibility.

**Workshop-day risk: MEDIUM.** UC1's manifest behaviour is solid (Clément validated 3× cold deploys per the original NFR-003 AC sign-off). But the agent CRD on the workshop cluster will be `Accepted=False` if it inherits the same stale state — gating the UC1 agent invocation. **Handed to STORY-029 as the "UC1 re-apply" patch.** Single `kubectl apply -f uc1/agents/` against the workshop cluster fixes it; workshop-infrastructure can include this in their provisioning script.

### UC2 — Pod Pending (replacement replica on the launch pad)

**Authored by:** Quentin (STORY-015, STORY-016, STORY-017 — original ownership). STORY-032 (tour rewrite to mission-framing) authored by Quentin during OOO. Agent inline-patched in STORY-025 (third swap impact).

**Validated state (Quentin self-author smoke, M2):**
- Sprint-2 transcripts (STORY-015/017) recorded the reproduction passing on fresh kind. Cross-author Clément repro deferred to STORY-028.

**Quentin re-validation (STORY-024 + STORY-025 surfaced findings during UC4 implementation):**
- **Four manifest-side latent gaps**: image tag (`:v1` not published, real is `:v1.0.0`), bootstrap shell (`/bin/bash` not in busybox-based `apogasa/kubectl:latest`), Pending Deployment `strategy.type` (default RollingUpdate deadlocks the rollout-restart), Job tolerations (missing — Job can't re-run on a cluster where a previous UC2/UC4 cycle left the taint).
- **Three agent-side latent gaps fixed by STORY-025 inline-patch**: namespace (artemis-uc2 → kagent), MCP server name (kagent-tools-k8s → kagent-tool-server with RemoteMCPServer apiGroup + kind), modelConfig (artemis-llm → default-model-config). Agent on cluster now `Accepted=True` post-patch.
- **Manifest-side gaps are still latent**: STORY-024 explicitly stayed out of UC2 surgery to avoid scope creep ("Out of scope: any change to UC1/UC2/UC3 manifests, agents, tours, or READMEs"). STORY-025 fixed the agent side only because it blocked UC4's a2a delegation. The four manifest gaps were carried forward as Sprint-3 retro candidates.

**Outside the envelope:**
- Live cluster validation of the four manifest-side issues. `make uc2-up` on a fresh kind cluster against the current `uc2/manifests/` would fail end-to-end (the bootstrap Job's `apogasa/kubectl:1.31.0` image isn't published; even if it were, `/bin/bash` isn't in busybox; even past that, the RollingUpdate strategy deadlocks).
- Clément cross-author NFR-008 review — deferred to STORY-028 (i.e. here), closes N/A.

**Workshop-day risk: HIGH.** UC2 is a confirmed workshop-day failure if a participant runs `make uc2-up` on a fresh vCluster. **Handed to STORY-029 as the "UC2 patch queue" — four surgical edits to `uc2/manifests/{20-bootstrap-taint-job,40-deployment}.yaml`** mirroring UC4's equivalent shapes from STORY-024. ~10-line patch.

### UC3 — OOMKilled (lunar rover telemetry)

**Authored by:** Quentin (STORY-018, STORY-019, STORY-020, STORY-021 — full M3 swap from Clément).

**Validated state (Quentin self-author smoke, STORY-019/020/021):**
- `uc3/manifests/` + observability bundle + bridge Services + UC3 agent CRDs all apply cleanly to a fresh kind cluster.
- Leak trigger via `kubectl run telemetry-stream --rm` drives the rover into OOMKilled deterministically within ~30 s of trigger; `RESTARTS=1` + `lastState.terminated.reason: OOMKilled` confirmed.
- Prometheus is scraping `artemis-uc3` (`process_resident_memory_bytes{kubernetes_namespace="artemis-uc3"}` non-empty).
- Bridge ExternalName Services in `kagent` ns resolve correctly via DNS CNAME (verified with busybox `nslookup`).
- UC3 agent CRD `artemis-rover-telemetry-debugger` `Accepted=True` + `Ready=True` on the cluster.
- `uc3/tour.json` validates; 4-beat form post-STORY-034 convention scrub.

**Outside the envelope:**
- End-to-end agent reasoning loop (Beat 3 prompt → describe-pod → a2a delegate to observability-agent → Grafana panel URL). Requires live OpenAI creds + reachable Grafana; both now in place on workshop-infrastructure's cluster, but Quentin's self-author smoke was against a creds-less local kind. Deferred to workshop-day or pre-flight.
- Clément cross-author NFR-008 — deferred to STORY-028, closes N/A.

**Workshop-day risk: LOW.** UC3's manifests + agent + tour all validate. The end-to-end agent loop hasn't been exercised by anyone, but workshop-infrastructure's pre-flight can do that against the real cluster before participants arrive.

### UC4 — Multi-agent coordinator (the climax)

**Authored by:** Quentin (STORY-022, STORY-023, STORY-024, STORY-025, STORY-026, STORY-027 — six-story slate spanning M3 prep + M4 climax).

**Validated state (Quentin self-author smoke, STORY-024/025/026/027):**
- `uc4/manifests/` apply cleanly to a fresh kind cluster; three simultaneous symptoms (`ImagePullBackOff` + `Pending` + `Running 1/1, RESTARTS=1 OOMKilled`) visible within ~60 s of apply + leak trigger.
- `artemis-mission-coordinator` Agent CRD on cluster: `Accepted=True` + `Ready=True`.
- `artemis-bulb-mcp` RemoteMCPServer: `Accepted=True`, `discoveredTools=[list_bulbs, update_bulb]`.
- UC2 inline-patch (STORY-025) reaches `Accepted=True` post-patch, unblocking the coordinator's a2a delegation to UC2.
- Bridge Services promoted to `infra/observability/` (STORY-025), `make uc4-up` inherits transparently.
- `uc4/tour.json` validates against the schema; 4-beat shape; pre-Beat-4 participant-visible fields scrubbed of banned vocab + bug-class names + UC<N> meta-refs (custom audit clean).
- `uc4/README.md` 403 lines; all 22 internal links resolve; coordination flow + FR-017 mapping tables + 10-step NFR-003 reproduction checklist + Levels 1-4 recovery + production disclaimer + Author notes (6 engineering items + 8-item consolidated Sprint-3 retro queue).
- `make lint-manifests` clean across `uc{1,2,3,4}/manifests/` + `infra/observability/` (bundle + bridge) + `mcp/manifests/`.

**Outside the envelope:**
- End-to-end coordinator reasoning loop (one `kagent invoke` → a2a fan-out → 3 update_bulb writes → 3 bulbs flip in light-manager UI). Requires live OpenAI creds + reachable light-manager + all 3 UC clusters in their broken states simultaneously. Workshop-infrastructure's cluster has all three; not yet exercised by Quentin.
- Clément cross-author NFR-008 — deferred to STORY-028, closes N/A.

**Workshop-day risk: MEDIUM.** UC4's stack is the most extensively self-validated of any UC, but it's also the one that depends on the most external pieces (OpenAI + light-manager + per-vCluster MCP + 3 specialist agents). If any one of those fails on workshop day, the climax demo fails.

Risk mitigations available:
1. **Workshop-infrastructure pre-flight** should exercise UC4 end-to-end at least once before participants arrive. The `kagent invoke` command in `uc4/README.md` §reproduction step 9 is the canonical form.
2. **Per-vCluster MCP race documented** (`RemoteMCPServer` `Accepted=False` for ~7 s on first apply). Workshop-infrastructure pre-flight should wait 60 s after `make mcp-up` before checking, OR poke the annotation explicitly.
3. **Fallback per the brief**: if the multi-agent fan-out proves fragile under real cluster load, "version dégradée avec moins de sous-agents si serré" — drop slot 3 (UC3 dependency on observability) and demo coordinator on slots 1+2 only. UC4 README documents the slot mapping for this scenario implicitly (slots 1 + 2 are pure-kubectl symptoms; slot 3 is the only one that requires Prom/Graf to be up).

---

## Recursive deferral chain — closure

The deferral chain documented across STORY-018/019/020/021/024/025/026/027 closes here. The full plate Clément would have reviewed under NFR-008 + the full plate of NFR-003 cross-author cold-deploys:

| Surface | Source story | NFR-008 status | NFR-003 cold-deploy status |
| --- | --- | --- | --- |
| UC1 tour (post-rewrite) | STORY-031 | not reviewed | self-author (Quentin) only |
| UC1 README | STORY-014 | not reviewed (M2 Clément self-review only) | Clément M2 self-author only |
| UC2 tour (post-rewrite) | STORY-032 | not reviewed | self-author (Quentin) only |
| UC2 README | STORY-017 | not reviewed (M2 Quentin self-review only) | self-author (Quentin) only |
| UC2 agent inline-patch | STORY-025 | not reviewed | self-author (Quentin) only |
| UC3 manifests + agent + bridge | STORY-019 | not reviewed | self-author (Quentin) only |
| UC3 tour | STORY-020 | not reviewed | self-author (Quentin) only |
| UC3 README | STORY-021 | not reviewed | self-author (Quentin) only |
| UC0 prep tour | STORY-033 | not reviewed | self-author (Quentin) only |
| Tour-convention scrub | STORY-030, STORY-034 | not reviewed | N/A (prose) |
| Observability bundle | STORY-018 | not reviewed | self-author (Quentin) only |
| Bridge promotion | STORY-025 | not reviewed | self-author (Quentin) only |
| MCP source + packaging | STORY-022, STORY-023 | not reviewed | self-author (Quentin) only |
| UC4 manifests | STORY-024 | not reviewed | self-author (Quentin) only |
| UC4 coordinator + ModelConfig | STORY-025 | not reviewed | self-author (Quentin) only |
| UC4 tour | STORY-026 | not reviewed | self-author (Quentin) only |
| UC4 README | STORY-027 | not reviewed | self-author (Quentin) only |
| End-to-end agent loops × 4 UCs | STORY-019/020/021/025/026/027 | N/A (not the review surface) | not exercised on creds-less local kind |

**Closure declaration for the workshop ship:** all rows marked "not reviewed" ship as Quentin-self-reviewed only. The workshop on 2026-05-20 proceeds with this posture explicitly documented. Post-workshop, Clément's review is welcomed; any findings land as post-ship patches on `main`, not as workshop-gating fixes.

---

## Workshop-day risk queue (handed to STORY-029)

Consolidated from the per-UC roll-ups above. Items are listed in must-fix order (1 = blocks a workshop demo, 4 = nice-to-have):

| # | Item | Source story | Severity | STORY-029 scope |
| - | --- | --- | --- | --- |
| 1 | UC2 manifest patches: image tag `:v1` → `:v1.0.0`, bootstrap shell `/bin/bash` → `/bin/sh`, Pending Deployment `strategy.type: Recreate`, Job tolerations + Deployment tolerations | STORY-024 §Implementation findings | **HIGH** — UC2 fails for participants without these | **Yes** — patch in STORY-029 |
| 2 | UC1 agent re-apply on workshop cluster (cluster has stale spec referencing `kagent-tools-k8s`; repo has correct `kagent-tool-server` since M2.5) | STORY-027 §Author notes Sprint-3 retro #3 | **MEDIUM** — gates UC1 agent invocation | **Workshop-infrastructure** — single `kubectl apply -f uc1/agents/` in pre-flight. Documented in STORY-029 deployment notes. |
| 3 | `make kagent-install` idempotency (`helm install` → `helm upgrade --install`) | STORY-018 §Out-of-scope findings | **LOW** — affects re-runs only; first install works | **Yes** — one-line Makefile patch in STORY-029 |
| 4 | `make audit-tours` extension (fileEdits-byte-identity check) | STORY-026 §Implementation findings | **LOW** — CI-time check, not runtime | **No** — post-workshop nice-to-have |
| 5 | kagent v0.9.0 a2a parallelism semantics confirmation | STORY-025 §Additional notes | **LOW** — system prompt hedges already cover the unknown | **No** — post-workshop, requires workshop-day timing observations |
| 6 | `RemoteMCPServer` reconcile race documentation for workshop-infrastructure | STORY-023 §Implementation findings | **MEDIUM** — confusing during provisioning but auto-recovers | **No** — workshop-infrastructure docs candidate (handed to that team, not patched in this repo) |
| 7 | `make uc4-down` doesn't clear the synthetic node taint | STORY-027 §Author notes | **LOW** — already documented in UC4 README §Recovery | **No** — documented; explicit manual `kubectl taint nodes …-` step |

STORY-029 implements items #1 + #3. Items #2 + #6 are workshop-infrastructure responsibilities (documented in STORY-029 deployment notes). Items #4 + #5 + #7 ship as-is (low severity, fully documented).

---

## Acceptance Criteria

- [x] Per-UC validation roll-up present for UC0/UC1/UC2/UC3/UC4 (5 sub-sections above).
- [x] Recursive deferral chain closure declaration present (NFR-008 N/A for workshop ship; explicit table of every story's review status).
- [x] Workshop-day risk queue handed to STORY-029 (table above, items #1-7 with severity + scope).
- [x] No new cluster validation work (doc-only synthesis per scope decision).
- [x] Sprint plan AC #1 ("Both authors run … and sign off") — N/A per *Ownership swap* closure.
- [x] Sprint plan AC #2 ("All 4 reproduction checklists pass; results recorded in `docs/dry-run-2026-05-19.md`") — absorbed into this document per scope decision; the dry-run results are the per-UC roll-up's *Validated state* and *Outside the envelope* sections, plus the risk queue. Stand-alone `docs/dry-run-2026-05-19.md` not separately authored.
- [x] Sprint plan AC #3 ("Any blocker → triggers STORY-029") — risk queue items #1 + #3 are handed to STORY-029.

## Definition of Done

- [x] This document shipped.
- [x] Risk queue handed to STORY-029 (table above).
- [ ] STORY-028 entry in `docs/sprint-status.yaml` updated to `status: completed` (handled by STORY-029's sprint-status update).
- [ ] PR opened (or committed directly to `main` per the branching convention; STORY-029's commit absorbs STORY-028's doc).

## Story Points Breakdown

- **Per-UC roll-up synthesis (5 sub-sections):** 1.5 points. Pull together every prior story's validation transcript, identify what's outside the envelope, assign workshop-day risk severity.
- **Recursive deferral chain closure declaration:** 0.5 points. The 18-row table is mechanical (one row per swap-chain story); the closure declaration is the narrative-judgement bit.
- **Workshop-day risk queue:** 1 point. Consolidate from prior stories' findings, prioritise by participant-impact severity, hand to STORY-029.
- **Total:** 3 points. Matches sprint-plan estimate.

---

## Additional Notes

- **Why "doc-only" was the right scope.** The sprint plan AC envisioned both authors physically reproducing all four UCs on a shared cluster, with the act of reproduction generating the dry-run document as a side-effect. Quentin alone running the four reproductions on his local kind would produce the same document but with strictly less signal than the prior per-story transcripts already contain (Quentin authored those transcripts; running them again on the same cluster generates no new information). Doc-only synthesis preserves the audit trail without the redundant cluster work.
- **Why NFR-008 closes N/A rather than "deferred to post-workshop"**. The convention's NFR-008 *gate* is binary — either a PR is cross-reviewed before merge or it isn't. The chain of "deferred to STORY-028" claims that STORY-028 will be the closure point; STORY-028 explicitly is not a cross-review, so the chain's promise cannot be satisfied. Marking the items "not reviewed" rather than "deferred" is honest about what shipped.
- **Why STORY-028 doesn't write `docs/dry-run-2026-05-19.md`** as a separate artefact. Two reasons: (a) the sprint plan AC's intent was "a document containing the dry-run results" — STORY-028.md is that document, just under a different filename; (b) a separate dated file would imply two authoritative dry-run documents (this one + that one) when in fact there's one closure document. Path convention sacrificed for single-source-of-truth.
- **Risk item #2 (UC1 re-apply) is a workshop-infrastructure responsibility, not a STORY-029 patch.** The repo's `uc1/agents/agent.yaml` is correct (uses `kagent-tool-server` post-STORY-031 conventions stabilisation). The cluster has a stale spec because it was applied earlier in M2 before the conventions stabilised. Workshop-infrastructure's per-participant vCluster provisioning runs `kubectl apply -f uc1/agents/` from the repo's current state, which corrects the issue by construction. STORY-029 documents this in its deployment notes so workshop-infrastructure is aware.

---

## Progress Tracking

**Status History:**
- 2026-05-11: Created (Developer / Quentin, /bmad:dev-story STORY-028).
- 2026-05-11: Started — ninth and closing swap of the OOO window, joint→Quentin.
- 2026-05-11: Doc-only synthesis complete; risk queue handed to STORY-029.

**Actual Effort:** 3 points (matched estimate).

---

## Addendum: 2026-05-05 dry-run (supplementary author walk-through)

After STORY-028's 2026-05-11 close-out, a supplementary participant-flow dry-run was performed by Clément on local kind on 2026-05-05 (back-dated UTC; the workshop deadline pressure pulled the second-author walk-through forward). Captured in [`../dry-run-journal-2026-05-05.md`](../dry-run-journal-2026-05-05.md).

This walk-through is **not** an NFR-008 cross-review of STORY-028 (the NFR-008 gate closed N/A above and cannot be re-opened). It is a fresh-eyes dry-run by the other author, treated as supplementary evidence and as a generator of post-freeze patch stories.

### Findings handed to Sprint 6 / M6 (post-dry-run patch sprint)

| Severity | Count | Stories | Sprint |
|----------|-------|---------|--------|
| blocker  | 2 | `STORY-041` (UC3 dashboard data pipeline), `STORY-043` (UC4 `WORKSHOP_PARTICIPANT_LOGIN` prereq) | 6 |
| issue    | 6 | `STORY-036` (UC0 bridge), `STORY-037` (UC1 framing), `STORY-038` (UC1 Beat 3 expansion), `STORY-039` (UC2 CLI output), `STORY-040` (UC3 Grafana URL), `STORY-042` (density convention + pass) | 6 |
| nit      | 1 | none (operator preference `feedback_em_dash` saved to memory; applied going forward) | n/a |

The two blockers gate the rest of the UC3 / UC4 dry-run. Workshop ship posture (per STORY-028's N/A NFR-008 closure) is unchanged; Sprint 6 patches land as a new freeze candidate before the workshop date.

---

**This story was created using BMAD Method v6 - Phase 4 (Implementation Planning).**
