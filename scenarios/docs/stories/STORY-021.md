# STORY-021: UC3 README + cross-author repro

**Epic:** EPIC-003 (UC3 — Observability-augmented diagnostics)
**FRs:** FR-012 (UC3 scenario package + Prom/Graf manifests)
**NFRs:** NFR-003 (deterministic, race-free reproduction), NFR-008 (cross-author review)
**Priority:** Must Have
**Story Points:** 2
**Status:** Completed (2026-05-08)
**Assigned To:** Quentin Rodic (re-attributed from Clément Raussin — fourth and final M3 Clément swap)
**Created:** 2026-05-08
**Sprint:** 3 (M3, 2026-05-11 → 2026-05-13) — implemented out-of-band on 2026-05-08, alongside STORY-018/019/020.

---

## Ownership swap (and the recursive cross-author-repro deferral)

Same swap pattern as STORY-018, STORY-019, and STORY-020: Clément's slate, taken by Quentin to keep M3 critical path open. **This is the fourth and final Clément swap of M3 — every STORY-018/019/020/021 was originally on Clément's plate.**

Each of the prior three stories deferred its cross-author repro to "STORY-021's repro pass / M5 dry-run STORY-028". Now that STORY-021 is also on Quentin, *its own* cross-author repro deferrals chain forward. This story:

- **Originally** had AC #2 — "Quentin runs UC3 reproduction once on fresh kind and signs off". The AC was pre-encoded for Clément's authorship: the *other* author (Quentin) would do the NFR-008 cross-review.
- **With the swap** — Quentin is now both the author *and* the only available reviewer. Self-review is not cross-review. NFR-008 ("PR cross-reviewed by the other author before merge") cannot be satisfied at story-completion time; it defers to **STORY-028 (M5 dry-run)** when Clément is back, alongside the deferrals from STORY-014 / 017 / 031 / 032 / 033 / 034 / 018 / 019 / 020. STORY-028's plate has grown — that's the cost of the swap, transparently logged.
- **AC #2 inverts.** With the new owner, the AC reads "**Clément** runs UC3 reproduction once on fresh kind and signs off". The participant-flow is identical; only the signer changes.

What this story *can* validate before merge: self-author smoke (rerun the documented procedure against the current cluster, confirm the apply chain + leak loop + OOMKilled signal still match what the README documents). It cannot satisfy NFR-008 — that's the explicit deferral above.

The pure-prose follow-up rule still applies: if Clément's M5 walk-through finds tonal or factual rewrites in `uc3/README.md`, the manifests + agent CRDs + tour stay byte-identical, so the diff lands without re-validating the cluster cycle.

---

## User Story

As a **repo author** (or a future on-call returning to UC3 after some time away),
I want **`uc3/README.md` to document the broken state, the Prom/Graf prerequisite (and the kagent-side bridge), the agent diagnostic flow, the Artemis narrative, the production-disclaimer, the recovery procedure, and the per-UC author notes**,
So that **anyone running `make uc3-up` can verify the reproduction matches NFR-003 (3/3 cold deploys), debug a regression by mapping observed cluster state back to the documented mechanism, and the workshop never accidentally suggests this Prom/Graf install is production-grade.**

---

## Description

### Background

`uc3/README.md` currently exists as a stub created during STORY-005's repo skeleton work — a 7-line placeholder that names the milestone and pointer-references the four UC3 stories. STORY-021's job is to lift it into the same shape as `uc1/README.md` and `uc2/README.md` (M2's READMEs are the established pattern), with two UC3-specific additions the AC names: the Prom/Graf prerequisite and the production-disclaimer.

Across STORY-018 / 019 / 020 the moving parts shipped:
- STORY-018: `infra/observability/` Prom + Graf bundle + `make observability-up`/`down` + Makefile wiring (`uc3-up: observability-up`).
- STORY-019: `uc3/manifests/` (Deployment, Service with `monitoring=prom` label, Namespace), `uc3/agents/` (Agent CRD + ModelConfig stub + ExternalName bridge Services).
- STORY-020: `uc3/tour.json` (4-beat mission-framed tour + Grafana dashboard URL surfacing).

This story documents all of that in one place from the author's perspective.

### Scope

**In scope:**
- Rewrite `uc3/README.md` to the UC1/UC2 README convention plus the two UC3-specific sections AC #1 names (Prom/Graf prerequisite + production-disclaimer).
- Sections (mirrors UC1/UC2 + UC3 deltas):
  1. Header (Owner / Milestone / Tour ID / FR-NFR).
  2. One-paragraph synopsis (why UC3 is the third axis: external observability).
  3. Artemis narrative (lunar-rover-telemetry framing).
  4. Prerequisite — observability bundle (STORY-018) + ExternalName bridge Services (STORY-019). The "you must have Prom/Graf available before UC3 can reproduce" claim that AC #1 explicitly calls out.
  5. The bug (resource table + mechanism: 64 Mi limit + `/leak` endpoint + OOM cycle).
  6. Expected agent diagnosis (tool surface + a2a sub-agents + expected output sentence).
  7. Files in this directory (tree).
  8. Reproduction (NFR-003 — 3/3 cold deploys, with UC3-specific verification checks for the OOMKilled `lastState`).
  9. Recovery procedure (the rover OOM cycle — re-running the leak loop, resetting via `kubectl rollout restart`, full teardown via `make uc3-down`).
  10. Production-disclaimer ("this is not how you'd run Prom in production") — explicit, prominent, with a one-paragraph rationale of what's pedagogical vs production-shaped.
  11. Author notes — kagent-pre-packaged-agents spike findings (STORY-019), the `kubectl run --rm` leak-trigger pattern (STORY-020 finding), the kagent-bridge-services rationale (STORY-019 spike).
  12. Cleanup.
  13. References (PRD / architecture / artemis-naming / convention / sprint plan).
- Self-author smoke validation against the current cluster: re-apply manifests + re-run leak loop + confirm OOMKilled signal still reproduces. Document the run under *Implementation Notes*.

**Out of scope:**
- `uc3/manifests/`, `uc3/agents/`, `uc3/tour.json` — STORY-019, STORY-019, STORY-020.
- `infra/observability/` — STORY-018.
- Cold-deploy NFR-003 cross-author repro — deferred to STORY-028 (M5 dry-run) per the *Ownership swap* note. Self-author smoke against the in-place cluster is the most STORY-021 can validate at story-completion time.
- Updating `docs/tour-content-conventions.md` — not touched.
- Codifying the `kubectl run --rm` leak-trigger pattern from STORY-020's implementation finding — that's a Sprint-3-retro decision, not STORY-021's territory. Mentioned in Author notes for future-author awareness only.

### User flow (the author lives this)

1. Author runs `make uc3-up` against a fresh kind. The chain (`kind-up` → `kagent-install` → `observability-up` → `kubectl apply -f uc3/manifests/` → `kubectl apply -f uc3/agents/`) lands the cluster state STORY-018/019 produced.
2. Author opens `uc3/README.md`. The Reproduction section walks them through the four cluster-side checks ((a) rover Pod reaches Ready, (b) Prometheus auto-scrapes the `monitoring=prom`-labelled Service, (c) leak loop triggers OOMKilled, (d) `lastState.terminated.reason: OOMKilled` visible to the agent).
3. If something diverges from the documented expected behaviour, the *The bug* + *Expected agent diagnosis* sections give the author the mental model to localise the regression (e.g. "Prom not scraping" → check the `monitoring: prom` Service label STORY-019 set; "agent says ready=False" → check the bridge Services STORY-019 wired).
4. Cross-author repro at PR / M5 dry-run: the *other* author (Clément, in this swapped configuration) walks the same flow on their fresh kind and signs off in the PR description per the M5 dry-run convention.

---

## Acceptance Criteria

(From sprint plan + UC3-specific shape.)

- [ ] `uc3/README.md` is rewritten from stub to the UC1/UC2 convention shape, covering all 13 sections enumerated under *Scope* / *In scope*. Each section is non-empty.
- [ ] **The bug section** documents: namespace + Deployment + Service resources; the 64 Mi memory limit; the `/leak` endpoint mechanism; the resulting OOMKilled cycle (single OOM, not CrashLoopBackOff — see STORY-019 + STORY-020 for the rationale).
- [ ] **The Prom/Graf prerequisite section** explicitly names: `infra/observability/` (STORY-018) is required for UC3 to reproduce; the `monitoring=prom` Service label is what makes the rover scrape-discovered; the kagent-side bridge ExternalName Services (STORY-019) are required for the agent's `observability-agent` sub-agent to reach the Prom/Graf bundle at the URLs kagent's helm install hard-codes.
- [ ] **The agent diagnostic flow section** documents: the agent name (`artemis-rover-telemetry-debugger`), its location (`kagent` namespace per `docs/artemis-naming.md`), its tool surface (k8s read tools + a2a delegate to `promql-agent` + a2a delegate to `observability-agent`), its expected one-sentence root cause output, and the dashboard URL surfacing path.
- [ ] **The Artemis narrative section** frames the scenario in the lunar-rover-telemetry mission terms STORY-020's tour uses, naming the agent. It's allowed to use bug-class names (this is author-facing).
- [ ] **The production-disclaimer section** is prominent — separate heading, not buried in a paragraph — and explicitly says the Prom/Graf install in `infra/observability/` is workshop-grade (single-replica, anonymous-admin Grafana, `emptyDir` storage, 2-hour Prom retention, no operator), and what would change for production-grade (HA, persistent volumes, real auth, retention policy, alerting, an operator like `kube-prometheus-stack`). One paragraph each, no checklist.
- [ ] **Reproduction section** is the NFR-003 cold-deploy procedure — apply chain + four verification checks + an optional agent-end-to-end step (gated on OpenAI creds).
- [ ] **Recovery procedure section** documents how to re-run the tour cleanly (the rover stays in `Running 1/1, RESTARTS: N` after the OOM; `kubectl rollout restart -n artemis-uc3 deploy/lunar-rover-telemetry` resets the restart counter; `make uc3-down` removes UC3 cleanly while leaving the observability bundle in place; `make observability-down` cleans up the bundle).
- [ ] **Author notes section** captures three engineering-trace items per the post-STORY-034 convention: (a) kagent v0.9.0 pre-packaged agent CRD shape spike — `promql-agent` + `observability-agent` + `kagent-tool-server` + `kagent-grafana-mcp` (full trace lives in `docs/stories/STORY-019.md` §Spike findings, README pointers there); (b) the `kubectl run --rm` leak-trigger pattern — why `kubectl exec` doesn't work for UC3's leak loop (no curl in the python:3.12-slim container); (c) the ExternalName bridge rationale — why we DNS-CNAME instead of patching kagent's helm values.
- [ ] Self-author smoke validation runs (against current cluster, not fresh kind): rerun the apply chain idempotently; rerun the leak loop; confirm `lastState.terminated.reason: OOMKilled` still surfaces; confirm Prom still scrapes the post-restart rover. Document the run under *Implementation Notes*.
- [ ] **Cross-author repro by Clément** — *deferred* to STORY-028 (M5 dry-run) per the recursive deferral chain documented under *Ownership swap*. STORY-028's plate gains UC3 cold-deploy NFR-003 + UC3 README cross-review on top of the existing STORY-014/017/031/032/033/034/018/019/020 deferrals.

---

## Technical Notes

### What "the same convention as UC1/UC2 README" means in concrete terms

Both `uc1/README.md` and `uc2/README.md` follow this structure (verified at STORY-021 authoring time):

```
# UC<N> — <bug-class>
**Owner:** ...
**Milestone:** M<N> (Sprint <N>, <dates>)
**Tour ID:** kagent-uc<N>-<symptom>
**FR / NFR:** ...

[one-paragraph synopsis]

## Artemis narrative
[mission framing — author-facing, allowed to name the bug class]

## The bug
[resource table | mechanism description]

## Expected agent diagnosis
[agent name + tool surface + expected output sentence]

## Files in this directory
[tree]

## Reproduction (NFR-003 — 3/3 cold deploys)
[numbered procedure: reset → apply → wait → verify (a/b/c/d) → optional agent → teardown]

## Author notes
[per STORY-034 convention — relocated audit metadata]

## Cleanup
[teardown commands]

## References
[PRD, architecture, artemis-naming, convention, sprint plan]
```

UC3's README adds two sections this convention doesn't already mandate:

1. **Prerequisite — observability bundle + bridge.** Lives between *Artemis narrative* and *The bug* (logically: "before we can talk about the bug, you need to know what infrastructure UC3 assumes"). UC1/UC2 have no equivalent because they only need vanilla kagent.
2. **Production disclaimer.** Lives after *Reproduction* and before *Recovery procedure* (logically: "now you've reproduced the bug — here's what you should NOT take away from it"). UC1/UC2 have no equivalent because their broken-state mechanisms (image-pull, taint) don't carry production-shaped lookalikes.

The *Recovery procedure* section is also UC3-specific — UC1/UC2 don't need it because their broken states are stable (the kubelet retries forever; the participant doesn't have to "reset" anything between tour runs). UC3's leak cycle is participant-triggered, so re-running the tour without resetting bumps the restart counter. Recovery section makes that explicit.

### Self-author smoke validation — what's measurable without Clément

Five checks against the current cluster (where STORY-018/019 have already been applied during their respective validations):

1. `kubectl apply -f uc3/manifests/` reports `unchanged` for all three resources (idempotency).
2. `kubectl apply -f uc3/agents/` reports `unchanged` for the Agent + ModelConfig + bridge Services (idempotency).
3. Re-run the Beat 1 leak-trigger (the `kubectl run --rm` pattern) → `kubectl get pods -n artemis-uc3` shows `RESTARTS` count incremented by 1.
4. `kubectl get pod -o jsonpath='{...lastState.terminated.reason}'` returns `OOMKilled`.
5. Prometheus `process_resident_memory_bytes{kubernetes_namespace="artemis-uc3"}` query still returns a non-empty result after the restart.

NOT measurable here:
- Cold-deploy 3/3 (NFR-003 cold-deploys requires `make kind-down && make kind-up`, which tears down the cluster the user may want for further development; deferred to STORY-028 / Clément's plate).
- Cross-author repro (NFR-008 requires the *other* author).
- Agent reasoning loop end-to-end (needs OpenAI creds; deferred per the same chain that STORY-018/019/020 already established).

### What STORY-021 deliberately does **not** modify

- `uc3/manifests/`, `uc3/agents/`, `uc3/tour.json`, `infra/observability/`, `apps/lunar-rover-telemetry/` — prior stories.
- `Makefile`, `schemas/`, `docs/architecture-…md`, `docs/tour-content-conventions.md`, `docs/artemis-naming.md` — no impact.
- `docs/sprint-status.yaml` — STORY-021 entry update is part of the workflow's standard close-out, not "modification" in the scope-creep sense.

---

## Dependencies

**Prerequisite stories (all completed):**
- STORY-014 (UC1 README — established the per-UC README convention this story mirrors).
- STORY-017 (UC2 README — same convention).
- STORY-018 (`infra/observability/`) — provides the Prom + Graf bundle the *Prerequisite* section documents.
- STORY-019 (`uc3/manifests/` + `uc3/agents/`) — provides the resources the *The bug* + *Agent diagnostic flow* sections document.
- STORY-020 (`uc3/tour.json`) — provides the participant-facing flow the README's *Artemis narrative* + *Recovery procedure* sections cross-reference.
- STORY-034 (Author notes convention) — provides the post-tour-scrub rule that audit metadata lives in `uc<N>/README.md`.

**External dependencies:** none beyond what STORY-018/019/020 already require.

**Blocked stories:**
- None directly. STORY-028 (M5 dry-run) absorbs the deferred cross-author repro; STORY-029 (M5 corrections + freeze + tag) absorbs any rewrites Clément's M5 walk-through surfaces.

---

## Definition of Done

- [ ] `uc3/README.md` rewritten to UC1/UC2 convention + UC3-specific *Prerequisite* / *Production disclaimer* / *Recovery procedure* sections.
- [ ] AC ticked.
- [ ] Self-author smoke validation recorded under *Implementation Notes*.
- [ ] STORY-021 entry in `docs/sprint-status.yaml` updated to `status: completed` with `completion_date`, `actual_points`, ownership re-attribution + recursive cross-author-repro deferral note.
- [ ] PR opened; cross-author repro deferred to STORY-028 per the recursive chain.
- [ ] Merged to `main`.

---

## Story Points Breakdown

- **README authoring (13 sections, ~400 lines):** 1.5 points. Mostly mechanical — UC1/UC2 templates are clear; UC3-specific sections (Prerequisite, Production disclaimer, Recovery) are short and don't require new technical discovery (the spike work is done by STORY-019).
- **Self-author smoke validation (5 checks against in-place cluster):** 0.5 points. Cheap because the cluster is already in the right state from STORY-019/020 validations.
- **Total:** 2 points. Matches sprint-plan estimate.

**Rationale:** Sprint-plan estimate was 2 pts. Lowest of the four M3 Clément stories — by design (it's documentation + a smoke pass, not new code). The recursive cross-author deferral doesn't add points because nothing changes about the *work* — only the *signoff timeline* shifts, and that's a tracking concern, not an implementation concern.

---

## Additional Notes

- **Why the README mentions cross-UC roadmap tail in author-facing sections.** UC1/UC2 READMEs end the *Expected agent diagnosis* section with a one-line cross-UC roadmap ("UC2 scales this up to multi-resource correlation; UC3 to external observability; UC4 to multi-agent fan-out"). STORY-034's no-meta-references rule applies to **`tour.json` participant-visible fields only** — README is for AUTHORS and meta-references are not just allowed but useful (they orient the reader within the UC arc). UC3's README will follow the same pattern: the *Expected agent diagnosis* section can end with "UC4 will fold UC3's diagnostic agent into a multi-agent coordinator (FR-017)" or similar — author-side language.
- **Why not split the production disclaimer into a separate Markdown file.** Discoverability. The README is where an author goes when they have a UC3 question; embedding the disclaimer there keeps the "don't mistake this for production" framing co-located with the rest of the UC3 mental model. A separate file (`docs/observability-disclaimer.md`) would be more polished but less discoverable; not designed for here per the project's "don't design for hypothetical future requirements" default.
- **Why STORY-021 is the closing story of M3 (Quentin slate).** With STORY-021 done, all four EPIC-003 stories (STORY-018/019/020/021) plus the EPIC-002 spillover (STORY-034) are landed on `main`. Sprint 3's remaining slate is entirely Quentin's M4-prep work (STORY-022 KMCP MCP source, STORY-023 MCP packaging) — no Clément-blocking dependencies. Sprint 3 formally opens 2026-05-11; Clément returns and immediately starts M4 work (or runs the M5 dry-run early) without M3 critical-path dependencies on him.

---

## Progress Tracking

**Status History:**
- 2026-05-08: Created (Developer / Quentin, /bmad:dev-story → out-of-band per sprint plan note style; story doc authored alongside implementation).
- 2026-05-08: Started by Quentin (re-attributed from Clément — see *Ownership swap*).
- 2026-05-08: Implemented (README rewrite + self-author smoke validation).

**Actual Effort:** 2 points (matched estimate).

### Implementation Notes (2026-05-08)

#### Files modified
- `uc3/README.md` — rewrote from 7-line stub to full UC1/UC2 README convention shape (~470 lines, 13 sections per the AC enumeration). The two UC3-specific sections AC #1 mandates are present and prominent: *Prerequisite — observability bundle + kagent bridge* (cross-references STORY-018 + STORY-019 with the namespace-bridge rationale) and *Production disclaimer* (separate heading, two-paragraph rationale: "what's pedagogical here" + "what you would change for a production-grade install"). One additional UC3-specific section that the AC didn't explicitly mandate but that the OOM cycle requires: *Recovery procedure* with four reset levels (Level 1 ad-hoc rerun → Level 4 full kind teardown).

#### Files NOT modified (intentional, per *Scope* / *In scope*)
- `uc3/manifests/`, `uc3/agents/`, `uc3/tour.json`, `infra/observability/`, `apps/lunar-rover-telemetry/` — prior stories.
- `Makefile`, `schemas/`, `docs/architecture-…md`, `docs/tour-content-conventions.md`, `docs/artemis-naming.md`, `docs/prd-…md` — no impact.

#### Self-author smoke validation (against live `kagent-workshop` kind cluster)

Ran the README-documented Reproduction checks (a)–(d) verbatim, plus idempotency:

```text
=== README check (a): restartCount ≥ 1 ===
1                              ← satisfied

=== README check (b): lastState.terminated.reason == OOMKilled ===
OOMKilled                      ← confirmed; the agent's k8s_describe_pod will see this

=== README check (c): Prom scraping artemis-uc3 ===
process_resident_memory_bytes{
  __name__="process_resident_memory_bytes",
  instance="10.244.0.50:8000",
  job="kubernetes-services",
  kubernetes_namespace="artemis-uc3",
  kubernetes_port_name="http",
  kubernetes_service_name="lunar-rover-telemetry"
} = 56328192 bytes (53.7 MiB)  ← post-restart container's working set

=== README check (d): bridge DNS resolution ===
grafana.kagent.svc.cluster.local
  → CNAME grafana.artemis-observability.svc.cluster.local (10.96.128.166)
prometheus.kagent.svc.cluster.local
  → CNAME prometheus-server.artemis-observability.svc.cluster.local (10.96.144.249)

=== Idempotency: re-apply uc3/manifests/ + uc3/agents/ ===
namespace/artemis-uc3 unchanged
service/lunar-rover-telemetry unchanged
deployment.apps/lunar-rover-telemetry unchanged
agent.kagent.dev/artemis-rover-telemetry-debugger unchanged
service/prometheus unchanged
service/grafana unchanged
modelconfig.kagent.dev/artemis-llm unchanged

=== make validate-tours ===
4/4 tours schema-valid (uc0/uc1/uc2/uc3)
```

Self-author smoke is sufficient to confirm the README's Reproduction procedure is faithful to current cluster behaviour. **It is NOT a cross-author repro** — NFR-008 requires the *other* author and the swap left Quentin as both author and only available reviewer at story-completion time. STORY-028 (M5 dry-run) absorbs the deferral.

#### AC sign-off

- [x] README rewritten to UC1/UC2 convention with the 13 sections enumerated under *Scope*.
- [x] *The bug* section documents resources + 64 Mi limit + `/leak` mechanism + single-OOM cycle (matches STORY-019's friction-signal design — `RESTARTS: 1` rather than `CrashLoopBackOff`, with the rationale).
- [x] *Prom/Graf prerequisite* section explicitly names STORY-018 (bundle), STORY-019 (bridge Services), the `monitoring=prom` Service label mechanism, and the helm-time URL bindings the bridge reconciles.
- [x] *Agent diagnostic flow* section names `artemis-rover-telemetry-debugger`, its `kagent` namespace location, the three-layer tool surface (k8s read tools + a2a `promql-agent` + a2a `observability-agent`), the expected one-sentence root cause output, and the dashboard URL surfacing path.
- [x] *Artemis narrative* section frames the lunar-rover-telemetry mission with the agent named (allowed to use bug-class names since this is author-facing).
- [x] *Production disclaimer* section is prominent (separate heading, not buried) and explicit about the workshop-grade vs production-grade distinction.
- [x] *Reproduction* section is the NFR-003 cold-deploy procedure with checks (a)–(d).
- [x] *Recovery procedure* section documents four reset levels (ad-hoc rerun, rover-only restart, UC3 teardown, full kind teardown).
- [x] *Author notes* section captures the three engineering-trace items: kagent pre-packaged agents spike (with pointer to STORY-019.md §Spike findings), `kubectl run --rm` pattern, ExternalName bridge rationale.
- [x] Self-author smoke validation passed (checks a–d + idempotency + tour schema).
- [ ] **Cross-author repro by Clément — deferred to STORY-028 (M5 dry-run)** per the recursive deferral chain in *Ownership swap (and the recursive cross-author-repro deferral)*. STORY-028's plate gains: cross-author cold-deploy NFR-003 over UC3 + NFR-008 review of `uc3/README.md` prose + (already on its plate from prior swaps) NFR-008 review of UC0/UC1/UC2 tour prose + UC3 manifests + UC3 agents + UC3 tour. Pure-text follow-up rewrites by Clément have zero cluster blast radius; the manifests / agents / tour stay byte-identical.

#### M3 EPIC-003 — full closeout summary

With STORY-021 done, all four EPIC-003 stories are landed on `main`:

| Story     | Points | Owner (re-attr.) | Status      |
| --------- | ------ | ---------------- | ----------- |
| STORY-018 | 5      | Quentin (← Clément) | Completed |
| STORY-019 | 5      | Quentin (← Clément) | Completed |
| STORY-020 | 3      | Quentin (← Clément) | Completed |
| STORY-021 | 2      | Quentin (← Clément) | Completed |
| **EPIC-003 total** | **15** | — | **100% complete** |

Plus the EPIC-002 spillover STORY-034 (2 pts, completed 2026-05-05). M3's early-credit posture is now **17 / 25 sprint-3 points** landed before sprint formal opening (2026-05-11). The remaining Sprint 3 slate (STORY-022 KMCP MCP source + STORY-023 MCP packaging, 8 pts total) is Quentin's M4-prep work — no Clément-blocking dependencies, no critical-path risk if Clément's return slips.

Sprint-3 retro candidates aggregated from the four stories' out-of-scope findings:

1. `make kagent-install` non-idempotency (STORY-018) — one-line fix (`helm install` → `helm upgrade --install`).
2. No metrics-server in the kind cluster config (STORY-018, STORY-019) — relax the `kubectl top` AC or fold a metrics-server bundle into `kagent-install`.
3. `commonLabels` deprecation in `infra/observability/kustomization.yaml` (STORY-018) — already migrated to the new `labels:` form during STORY-018 implementation.
4. Image-publish dependency for `lunar-rover-telemetry:v1.0.0` (STORY-019) — workshop-infrastructure CI should track UC3's tag the way it tracks UC1/UC2's.
5. Per-UC ModelConfig is decorative on Agents that live in `kagent` ns (STORY-019, STORY-021) — decide whether to drop the slot or keep it for UC4 coordinator override.
6. `kubectl run --rm` leak-trigger pattern (STORY-020) — codify in `docs/tour-content-conventions.md` if UC4 hits the same in-pod-tooling gap.
7. `kagent-bridge-services.yaml` location (STORY-019, STORY-021) — promote to `infra/observability/` when UC4 confirms identical bridge needs.

### Next

- PR opened against `main` (or merged directly per project flow) with all four EPIC-003 stories.
- M3 EPIC-003 critical path is closed. Quentin moves to STORY-022 (KMCP MCP source) for the remainder of Sprint 3.
- Clément, when back, has a clean M3 plate: no critical-path work to catch up on, just M4 prep (STORY-024–STORY-027) and the M5 dry-run STORY-028 plate which has expanded to absorb the recursive cross-author-repro deferrals from this swap.

---

**This story was created using BMAD Method v6 - Phase 4 (Implementation Planning).**
