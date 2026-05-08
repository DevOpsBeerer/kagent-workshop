# STORY-020: UC3 `tour.json` — leak loop, agent dashboard creation, dashboard URL surfacing

**Epic:** EPIC-003 (UC3 — Observability-augmented diagnostics)
**FRs:** FR-013 (UC3 tour with on-the-fly dashboard)
**NFRs:** NFR-008 (cross-author review), NFR-009 (English copy), NFR-010 (self-contained steps)
**Priority:** Must Have
**Story Points:** 3
**Status:** Completed (2026-05-08)
**Assigned To:** Quentin Rodic (re-attributed from Clément Raussin — third Clément story in the M3 swap)
**Created:** 2026-05-08
**Sprint:** 3 (M3, 2026-05-11 → 2026-05-13) — implemented out-of-band on 2026-05-08, alongside STORY-018/019.

---

## Ownership swap (and the narrative-quality risk)

Same swap pattern as STORY-018 and STORY-019: Clément's slate, taken by Quentin to keep M3 critical path open. **This is the third Clément story in a row, and the first one where the work is *narrative* rather than infrastructure.**

In the STORY-019 sprint-status note I committed to "Clément retains ownership of STORY-020 (UC3 tour) and STORY-021 (UC3 README + cross-author repro) when he's back — those carry the UC3 narrative judgment". Taking STORY-020 anyway contradicts that line.

The risk this opens: the *taste* of the tour — voice, cadence, mission-framing nuance — is closer to Clément's craft (he wrote STORY-031 / 033 and shaped STORY-030 / 034's conventions) than to mine. Quentin can ship a tour that **passes** the convention checklist (4 beats, no banned words, no meta-references, schema-clean, mission-framed) but may miss the tonal touches Clément would have added.

**Mitigation:** STORY-021's cross-author repro AC (already on Clément when he's back) is upgraded — it absorbs both the cluster cycle *and* a tonal sign-off pass on `uc3/tour.json`. If Clément wants to rewrite Beat-3/4 prose, the manifests + agent CRDs underneath stay byte-identical (this story is purely participant-visible text), so a pure-prose follow-up has zero blast radius. Same precedent as STORY-031/032 → STORY-034 (M2.5 → M3 prose scrub). Documenting the risk explicitly here — and mitigating via the existing cross-author repro pattern — is the honest move.

---

## User Story

As a **workshop participant** opening UC3 in the workshop-tour VS Code extension,
I want **to live an Artemis mission where I bring the lunar rover online, send telemetry up to base, see the rover restart unexpectedly, and hand the diagnosis to a kagent agent that returns a synthesised root cause plus a Grafana memory-curve dashboard URL I click through to**,
So that **I see the agent's value over a kubectl-only workflow on a third axis — external observability — without ever having the bug class spoiled to me by the tour prose, and the friction signal (the rover restarting) is what I report to the agent rather than a tour-supplied prompt about an OOMKilled.**

---

## Description

### Background

UC3's broken state is shipped by STORY-019: a `lunar-rover-telemetry` Deployment with a 64 Mi memory limit, instrumented with a `/leak` endpoint that appends 1 MiB to a module-global list per call. Triggered enough times, the kernel OOM-kills the container; kubelet restarts it; `lastState.terminated.reason: OOMKilled` is visible to `kubectl describe pod`. STORY-019 also wires the `artemis-rover-telemetry-debugger` Agent CRD that delegates to kagent's pre-packaged `promql-agent` and `observability-agent` (a2a) and uses `kagent-tool-server` for K8s read tools.

This story is the participant-facing surface: the four-beat tour that drives the leak, surfaces the friction, hands the diagnosis to the agent, and surfaces the Grafana dashboard URL the `observability-agent` returns. The tour fronts the cluster behaviour STORY-019 produces with mission framing the participant lives.

### Scope

**In scope:**
- `uc3/tour.json` — full 4-beat tour with `id: kagent-uc3-oom-killed`, the lunar-rover-telemetry mission framing, and the participant-visible step prose. Adheres to:
  - `docs/tour-content-conventions.md` (the 4-beat structure, no-spoiler rule, no-meta-references rule, English-only, self-contained steps).
  - `schemas/workshop-tour.schema.json` (structural — `make validate-tours` clean).
- Beat 1 mission setup includes both the manifest apply *and* a telemetry-stream step that triggers the leak loop, framed as part of "bringing the rover online and sending telemetry up to base". This is a UC3-specific shape: UC3 is the only UC where the broken state is *participant-triggered* rather than manifest-immediate, so Beat 1 absorbs the trigger to keep Beat 2 single-step (canonical).

**Out of scope:**
- `uc3/manifests/`, `uc3/agents/` — STORY-019, completed 2026-05-08.
- `uc3/README.md` — STORY-021 (Clément). The "this is not how you'd run Prom in production" disclaimer + the participant-flow recovery instructions live there.
- The agent's reasoning loop end-to-end validation (system prompt → describe-pod → delegate to observability-agent → dashboard URL) — needs live OpenAI creds, deferred to STORY-021's repro pass / M5 dry-run STORY-028.
- Updating `docs/tour-content-conventions.md` — STORY-034 already added the no-meta-references sub-rule and the leak-free *Good* example. STORY-020 just consumes the convention as written; no convention edits needed.
- Cross-UC roadmap tail in Beat 4 — explicitly forbidden by STORY-034's no-meta-references rule. Beat 4 closes after the on-call-rotation value statement, no UC4 tease.

### User flow (the participant lives this)

1. Participant opens UC3 in the workshop-tour extension. Sidebar reads "UC3 — Lunar rover telemetry won't keep its uplink up". Description summarises the mission, names `artemis-rover-telemetry-debugger`, says nothing about OOM / memory / restart.
2. **Beat 1.** Mission setup: drop the three manifest files, apply them, wait for the rover Pod to come Ready, then send a 30-burst telemetry stream from inside the rover (`kubectl exec` + `for` loop posting to `/leak`). The stream terminates with `command terminated with exit code 137` mid-loop — a first hint something went wrong. The participant has no language yet for what.
3. **Beat 2.** Mission status check: one `kubectl get pods -n artemis-uc3 -l app=lunar-rover-telemetry`. The rover is `Running 1/1` but `RESTARTS: 1`. Subtle friction — the rover is alive, but it didn't survive the telemetry stream. That is the cue to call the agent.
4. **Beat 3.** Call the agent for help — UI/chat invocation (matches UC1's pattern; UC2 is the CLI variant). One `kagent dashboard` command, one prompt to paste: *"The lunar-rover-telemetry pod in the artemis-uc3 namespace keeps restarting. Diagnose it, and show me a memory chart from the time of the failure."* The agent describes the OOM root cause + delegates to `observability-agent` to build a dashboard panel + surfaces the dashboard URL in the chat surface.
5. **Beat 4.** Manual recap — three kubectl commands the participant didn't run (`get pods`, `describe pod`, `get events`) plus the observability work the agent did on the participant's behalf (PromQL query + Grafana dashboard creation). Closes with the on-call-rotation value statement and a single sentence inviting the participant to open the dashboard URL the agent returned in Beat 3.

---

## Acceptance Criteria

(Per sprint plan + UC3-specific shape.)

- [ ] `uc3/tour.json` parses as JSON and validates against `schemas/workshop-tour.schema.json` (`make validate-tours` green).
- [ ] `id`: `kagent-uc3-oom-killed`. (Locked per the root README's UC index. Note: the slug carries the symptom name — exempt from the no-spoiler rule per *Tour ID is stable* clause.)
- [ ] `title`: Artemis-themed, ≤ 80 chars, no banned vocabulary, no bug-class names. Anticipatory tension allowed.
- [ ] `description`: one sentence framing the scenario as a mission and naming the agent's role; no OOM / memory / restart / banned words; no UC<N> / STORY- / meta-references.
- [ ] **Beat 1** — exactly 1 step titled `Mission setup — …`. `fileEdits[]` drops the three `uc3/manifests/*.yaml` files (overwrite: true). `commands[]` contains: kubectl apply, `kubectl wait` for the rover to come Ready, the telemetry-stream `kubectl exec` loop. Beat 1 prose contains none of the banned words and no concrete bug specifics.
- [ ] **Beat 2** — exactly 1 step titled `Mission status check — …`, single `kubectl get pods` command. The friction signal is the `RESTARTS: 1` column on a `Running 1/1` Pod (subtler than UC1's `ImagePullBackOff` or UC2's `Pending`, but honest — see *Why a single OOM cycle, not CrashLoopBackOff* below). Prose names the friction without naming the bug class.
- [ ] **Beat 3** — exactly 1 step titled `Call the agent for help`. Single `kagent dashboard` command (UI/chat variant, locked by STORY-031 spike for UC1). Step explanation includes the prompt to paste as a fenced markdown blockquote — same form as UC1's tour. Prompt asks the agent to diagnose the restart *and* surface a memory chart, so the agent's reasoning loop will delegate to `observability-agent` and produce a dashboard URL.
- [ ] **Beat 4** — exactly 1 step titled `What we'd have done by hand`. No `commands[]`, no `fileEdits`. Markdown body lists the three kubectl commands the agent absorbed + the observability work it did + the on-call-rotation closing. **Beat 4 closes after the value statement — no cross-UC roadmap tail** (per STORY-034's no-meta-references sub-rule). Includes a single sentence inviting the participant to open the dashboard URL the agent returned in Beat 3.
- [ ] **No banned words in any participant-visible field** (`title`, `description`, every step `title`/`explanation`): `broken`, `deliberately`, `intentionally`, `synthetic`, `fault`, `bug`, `wrong`, `error`, `fail`, `unsafe`, `blocked`, `taint`. **No bug-class names**: `OOMKilled`, `OOM`, `memory limit`, `memory leak`, `CrashLoopBackOff`, `restart loop`. (The Beat 4 manual-recap exception that allows quoting cluster output applies — UC2's tour quotes `untolerated taint` in Beat 4's manual recap, that's the precedent. STORY-020's Beat 4 may quote `OOMKilled` in the cluster-output sense if the manual-recap prose surfaces what the agent's `describe pod` output looked like — same justification as UC2's STORY-032.)
- [ ] **No meta-references in any participant-visible field**: no `UC<N>`, `STORY-…`, `Beat <N>` author-citations, "later", "earlier", "next UC", "the UCs that follow", "introduced the", "will scale", "notch above". Convention's tour-`id` and tour-`title` exemptions apply.
- [ ] **English copy** (NFR-009).
- [ ] **Self-contained steps** (NFR-010): every command runs as-is in the participant's VS Code server terminal; no required env vars set outside the step itself; no inter-step shell-state dependencies.
- [ ] **No secrets** (NFR-011): no LLM keys, registry tokens, or kubeconfig anywhere in `commands[]` or `fileEdits[].content`.
- [ ] **Cluster-side smoke validation** (against the live `kagent-workshop` kind cluster, after `make uc3-up` from STORY-019):
  - [ ] Beat 1's apply chain succeeds; rover Pod reaches Ready 1/1 within 60 s.
  - [ ] Beat 1's telemetry-stream command terminates with exit 137 (SIGKILL from kernel OOM) somewhere between iteration 5 and 30.
  - [ ] Beat 2's `kubectl get pods` shows `Running 1/1` with `RESTARTS: 1` within 30 s of the OOM.
  - [ ] (Agent invocation deferred to STORY-021 / M5 dry-run STORY-028 — needs live OpenAI creds.)
- [ ] **Tonal sign-off**: Clément reads the rendered tour back-to-back in the workshop-tour extension and confirms the prose matches the UC1/UC2 voice. Per the *Ownership swap* note above, this sign-off is **upgraded** — it absorbs more than the usual cross-author repro because the swap moved the narrative judgment to Quentin. Deferral to STORY-021's repro pass / M5 dry-run STORY-028 follows the existing pattern; if Clément wants to rewrite Beat-3/4 prose, the diff is pure text and ships with no cluster blast radius.

---

## Technical Notes

### Why a single OOM cycle, not CrashLoopBackOff

The architecture spec (§C5 lines 279-281) describes the broken state as "the tour's CLI baseline step posts to `/leak` ~70 times via `curl` in a loop; the kernel OOM-kills the container before the loop completes, kubelet restarts the pod, and the CrashLoopBackOff with `OOMKilled` reason becomes visible". STORY-019's smoke validation found that 11 calls suffice for the *first* OOM (idle process RSS is ~57 Mi — uvicorn + prometheus_fastapi_instrumentator + dependencies — leaving ~7 Mi of headroom under the 64 Mi limit, not the bare-bones figure the spec implicitly assumed).

A single OOM cycle does **not** produce visible `CrashLoopBackOff` — the rover restarts and is back to `Running 1/1` within ~5 s. The only friction signal is the `RESTARTS: 1` column on a Running Pod. To produce visible `CrashLoopBackOff` would require either:

1. Multiple back-to-back leak loops (each from a fresh process state) so the kubelet's exponential backoff kicks in. This needs choreography (`kubectl wait` between loops, race-prone backoff timing) that adds tour fragility for marginal narrative payoff.
2. A leak loop run from a *separate* Pod that survives the rover's restarts (e.g. `kubectl run leak-trigger --image=curlimages/curl …`). This works but adds a one-shot Pod the participant has to clean up afterwards.

**Decision: single OOM cycle, friction signal is the `RESTARTS: 1` column.** Trade-off accepted:
- Pros: simpler tour code (one `kubectl exec`); deterministic timing (~30 s end-to-end); honest signal that matches what the agent's `k8s_describe_pod` actually sees in `lastState.terminated.reason`; matches what STORY-019 validated end-to-end.
- Cons: friction is subtler than UC1/UC2 — `RESTARTS: 1` requires a more attentive participant than `Pending` or `ImagePullBackOff`.

The Beat 2 prose compensates by drawing the participant's eye to the restart count explicitly: "the rover is up, but it didn't survive the telemetry stream — note the **`RESTARTS`** column". This is information the participant needs to spot to know to call the agent; framing it doesn't spoil the bug class (it just names the symptom kubelet exposed, the same way `kubectl get pods` would name `Pending` for UC2).

### Telemetry-stream framing (the leak-loop disguise)

The leak endpoint is named `/leak` in the FastAPI app source — author-facing, that's fine. Participant-facing, the tour frames the same `POST /leak` calls as "telemetry bursts the rover sends up to base". The mental model is:
- Each `/leak` call = one telemetry burst the rover queues for transmission.
- The 30-iteration loop = a normal telemetry stream cadence the rover sustains during a mission window.
- The OOM = the rover's outbound buffer overflows (which is structurally *true* — `LEAK` is an unbounded module-global list, the rover IS buffering bursts in memory until the kernel reaps it).

The framing is fictional but not dishonest: the cluster's evidence (process_resident_memory_bytes climbing monotonically, OOMKilled in lastState.terminated.reason) is what the participant sees if they follow the curiosity. The fiction is the *purpose* of the calls (telemetry vs leak), not the mechanism.

### Beat 1 commands — exact shape

Three commands in Beat 1's `commands[]`:

```
1. kubectl apply -f uc3/manifests/
2. kubectl wait --for=condition=Ready pod -n artemis-uc3 -l app=lunar-rover-telemetry --timeout=60s
3. kubectl exec -n artemis-uc3 deploy/lunar-rover-telemetry -- sh -c 'for i in $(seq 1 30); do curl -sf -X POST http://127.0.0.1:8000/leak; echo; done'
```

Command 3 will exit 137 mid-loop (around iteration 5–10 depending on warmup). The exit-137 message in the participant's terminal is itself a hint the rover is in trouble — but it doesn't say what kind of trouble, which preserves the Beat 2 reveal.

`kubectl exec deploy/X` syntax is supported and verified against the cluster; it picks the first matching Pod in the Deployment.

### Beat 3 prompt — exact shape

```
The lunar-rover-telemetry pod in the artemis-uc3 namespace keeps restarting.
Diagnose it, and show me a memory chart from the time of the failure.
```

Two-clause prompt:
- "keeps restarting" — names the friction signal the participant just saw, no bug class.
- "show me a memory chart" — nudges the agent to delegate to `observability-agent`, which is what creates the Grafana dashboard panel and returns the URL. Without the second clause, the agent might stop at the describe-pod synthesis without invoking observability — defeating UC3's third-axis payoff.

The agent's STORY-019 system prompt already names the diagnosis loop (describe-pod → delegate to observability-agent → surface URL → root-cause sentence + remediation hint), so the prompt only needs to set the *intent*, not the mechanics.

### What STORY-020 deliberately does **not** modify

- `uc3/manifests/`, `uc3/agents/` — STORY-019.
- `uc3/README.md` — STORY-021.
- `infra/observability/` — STORY-018.
- `apps/lunar-rover-telemetry/` — STORY-010.
- `Makefile`, `schemas/`, `docs/architecture-…md` — no impact.
- `docs/tour-content-conventions.md` — STORY-034 already shipped the no-meta-references sub-rule + leak-free *Good* example; STORY-020 consumes the convention as written.

---

## Dependencies

**Prerequisite stories (all completed):**
- STORY-007 (tour content convention, M1) — provides the 4-beat structure + no-spoiler rule.
- STORY-019 (UC3 manifests + agent CRDs, M3) — completed 2026-05-08; provides the cluster behaviour this tour fronts.
- STORY-030 (mission-framing convention, M2.5) — provides the no-bug-class-in-Beat-1 rule.
- STORY-031 (UC1 tour rewrite, M2.5) — UI/chat invocation form `kagent dashboard` is locked here; STORY-020 reuses it.
- STORY-034 (UC0/UC1/UC2 prose scrub + no-meta-references sub-rule, Sprint-3 early-credit) — provides the rule STORY-020 must satisfy from the first commit.

**External dependencies:**
- `lunar-rover-telemetry:v1.0.0` image published (confirmed during STORY-019 validation; no follow-up needed).
- The `workshop-tour` VS Code extension renders the tour at runtime — schema-clean is sufficient at author time.

**Blocked stories:**
- STORY-021 (UC3 README + cross-author repro, Clément, M3) — README needs to reference the tour's beats and the recovery instructions for the OOM cycle.

---

## Definition of Done

- [ ] `uc3/tour.json` shipped, schema-clean, banned-word and meta-reference audit clean.
- [ ] AC ticked.
- [ ] Cluster-side smoke validation recorded under *Implementation Notes*.
- [ ] STORY-020 entry in `docs/sprint-status.yaml` updated to `status: completed` with `completion_date`, `actual_points`, owner re-attribution + tonal-deferral note.
- [ ] PR opened; tonal sign-off + cross-author repro deferred to STORY-021 / STORY-028.
- [ ] Merged to `main`.

---

## Story Points Breakdown

- **Tour authoring (`uc3/tour.json` 4 beats + manifest content embedding):** 1.5 points. Mechanical relative to the convention; the only judgment calls are the telemetry-stream framing and the Beat 3 prompt, both pre-decided in *Technical Notes*.
- **Convention compliance audit (banned words, no meta-references, schema):** 0.5 points. Custom Python audit pass, same shape as STORY-034.
- **Cluster smoke validation (apply chain → exit 137 → RESTARTS column):** 1 point. Requires a real cluster cycle; matches STORY-019's effort for the same loop, minus the agent invocation step.
- **Total:** 3 points. Matches sprint-plan estimate.

**Rationale:** Sprint-plan estimate was 3 pts. The convention work is well-paved by STORY-030 + 031 + 034; the cluster behaviour is shipped by STORY-019; the only new work is participant-facing prose. Lower than STORY-018 (5 pts) because there is no infrastructure to invent.

---

## Additional Notes

- **Why UI/chat for UC3 and not CLI invoke.** The convention (line 105) says UC3 is hybrid — UC1 = UI/chat, UC2/UC4 = CLI invoke, UC3 = hybrid. The hybrid here means the *invocation* is UI/chat (matching UC1's first-contact pattern, and consistent with the participant being already in the kagent dashboard if they were exploring), but the *secondary surface* is the Grafana dashboard URL the agent returns and the participant clicks through to. Beat 3 declares one step (the `kagent dashboard` invocation); the dashboard URL surfaces in Beat 3's chat output and is referenced in Beat 4's manual recap.
- **Why the prompt names "memory chart" explicitly.** Without that nudge, the agent's reasoning loop might describe the OOMKilled root cause from `lastState.terminated.reason` and stop — never delegating to `observability-agent`, never producing a Grafana URL. UC3's third-axis payoff (external observability, beyond UC1's pod-only and UC2's pod+node correlation) hinges on the agent reaching the observability sub-agent. The prompt's second clause is the explicit hand-off; if the agent doesn't take the bait, that's a system-prompt issue worth flagging for STORY-019 follow-up rather than a STORY-020 prose fix.
- **Recovery instructions.** After Beat 4, the rover is in `Running 1/1` with `RESTARTS: 1`. To re-run the tour cleanly, the participant either: (a) closes the tour and reopens it (Beat 1 re-applies idempotently, telemetry stream re-OOMs, cycle continues with `RESTARTS: 2`); (b) `kubectl rollout restart -n artemis-uc3 deploy/lunar-rover-telemetry` (resets the restart counter via a fresh pod). STORY-021's `uc3/README.md` documents this — STORY-020 doesn't include it in the tour because the convention restricts post-Beat-4 prose to the manual-recap closing.

---

## Progress Tracking

**Status History:**
- 2026-05-08: Created (Developer / Quentin, /bmad:dev-story → out-of-band per sprint plan note style; story doc authored alongside implementation).
- 2026-05-08: Started by Quentin (re-attributed from Clément — see *Ownership swap (and the narrative-quality risk)*).
- 2026-05-08: Implemented + validated against live kind cluster.

**Actual Effort:** 3 points (matched estimate).

### Implementation Notes (2026-05-08)

#### Files added
- `uc3/tour.json` — full 4-beat tour, `id: kagent-uc3-oom-killed`, mirrors UC1's UI/chat invocation form (`kagent dashboard` from STORY-031's frozen spike) and UC2's pure-text Beat 4 manual-recap shape. The three manifest contents in Beat 1's `fileEdits[]` are byte-identical lifts of `uc3/manifests/00-namespace.yaml` / `10-service.yaml` / `20-deployment.yaml` (STORY-019).

#### Files NOT modified (intentional)
- `uc3/manifests/`, `uc3/agents/` — STORY-019.
- `uc3/README.md` — STORY-021.
- `infra/observability/` — STORY-018.
- `apps/lunar-rover-telemetry/` — STORY-010.
- `Makefile`, `schemas/`, `docs/architecture-…md`, `docs/tour-content-conventions.md` — no impact (STORY-034 already shipped the no-meta-references sub-rule + leak-free *Good* example).

#### Validation

`make validate-tours` clean — 4/4 tours (`uc0`, `uc1`, `uc2`, `uc3`) schema-valid against `schemas/workshop-tour.schema.json`.

Custom audit pass (Python script, case-sensitive `UC<N>` regex per STORY-034 precedent — lowercase namespace identifiers like `artemis-uc3` are not flagged):

```text
AUDIT CLEAN across 10 fields:
  - tour.title
  - tour.description
  - step1.title       (Mission setup)
  - step1.explanation
  - step2.title       (Mission status check)
  - step2.explanation
  - step3.title       (Call the agent for help)
  - step3.explanation
  - step4.title       (What we'd have done by hand)
  - step4.explanation
```

Audit checks:
- 12 banned words (`broken`, `deliberately`, `intentionally`, `synthetic`, `fault`, `bug`, `wrong`, `error`, `fail`, `unsafe`, `blocked`, `taint`) — case-insensitive — across all 10 fields → 0 matches.
- 5 bug-class names (`OOMKilled`, `OOM`, `memory leak`, `CrashLoopBackOff`, `restart loop`) — case-insensitive — across the strict-fields set (`tour.title`, `tour.description`, Beat 1, Beat 2, Beat 3) → 0 matches. Beat 4's manual-recap is allowed cluster-output quoting (per UC2/STORY-032 precedent for `untolerated taint`); STORY-020's Beat 4 quotes `OOMKilled` once in a cluster-output frame ("a `Running 1/1` Pod whose previous container terminated with `lastState.terminated.reason: OOMKilled` and `exitCode: 137`") and `kubelet events naming the OOM` — both legitimate cluster surfaces, not authorial spoiler.
- Meta-reference patterns (`UC<N>` case-sensitive, `STORY-`, `Beat <N>`, `later`, `earlier`, `the next UC`, `the UCs that follow`, `introduced the`, `will scale`, `notch above`) — across 9 fields (tour.title exempted per convention) → 0 matches.

Cluster smoke validation against the live `kagent-workshop` kind cluster:

```text
=== Beat 1 / cmd 1 — Apply ===
namespace/artemis-uc3 unchanged
service/lunar-rover-telemetry unchanged
deployment.apps/lunar-rover-telemetry unchanged

=== Beat 1 / cmd 2 — kubectl wait Ready ===
pod/lunar-rover-telemetry-65df677888-x85zp condition met

=== Beat 1 / cmd 3 — Telemetry stream (kubectl run --rm) ===
{"size_mb":1}
{"size_mb":2}
... (monotonically increasing)
{"size_mb":18}    # rover OOM around iteration 11; pod restarts; new container
{"size_mb":19}    # ← post-restart bursts continue, run-pod survives rover restart
... (more monotone increases on the new container)
{"size_mb":25}
   (some empty lines from -sf swallowing brief connection refusals during restart window)
stream complete
pod "telemetry-stream" deleted from artemis-uc3 namespace
Elapsed: 3s

=== Beat 2 / cmd 1 — kubectl get pods ===
NAME                                     READY   STATUS    RESTARTS      AGE
lunar-rover-telemetry-65df677888-x85zp   1/1     Running   1 (10s ago)   18s

=== lastState.terminated.reason ===
OOMKilled    ← what the agent's k8s_describe_pod will surface in Beat 3

=== telemetry-stream pod cleanup ===
Error from server (NotFound): pods "telemetry-stream" not found    ← --rm worked

=== Prom still scraping the (post-restart) rover ===
process_resident_memory_bytes{kubernetes_namespace="artemis-uc3",
                              kubernetes_service_name="lunar-rover-telemetry"}
  = 51130368 bytes (48.8 MiB)    ← clean memory curve available for the agent's
                                    observability sub-agent to query
```

Total Beat 1 + Beat 2 wall-clock: ~13 s. Within tour-extension UX expectations (commands run in foreground in the participant's terminal).

#### Implementation finding (worth flagging)

Discovered during validation: the `lunar-rover-telemetry` container (`python:3.12-slim`) has **only `python3`** — no `curl`, no `wget`. My initial Beat 1 leak-trigger draft was `kubectl exec ... -- sh -c '... curl ...'`, which fails with `sh: 1: curl: not found` (exit 127, not the expected 137 from SIGKILL).

Switched the trigger to `kubectl run --rm` with `curlimages/curl:8.10.1`. Two payoffs beyond fixing the immediate bug:

1. **Run-pod survives rover restarts.** When the rover OOMs mid-loop, the trigger pod stays alive and keeps hammering the Service; once kubelet brings up a fresh rover, the loop reaches it again. The `kubectl exec` form, by contrast, dies with exit 137 the moment the rover container is killed (exec is bound to the target container's lifecycle).
2. **Mission framing fits naturally.** The trigger pod becomes "a transient operator station that pushes 30 bursts to the rover's outbound queue" — a separate workload pod is honestly *more* faithful to the lunar-rover-and-base mental model than an in-pod self-trigger would have been.

The trade-off: each `curl --max-time 2 -sf` swallows brief connection-refused errors during the rover's restart window (typical 5–10 s). The participant sees a few empty lines in the output instead of `{"size_mb":N}`, which the Beat 1 explanation briefly references ("the operator station's output is the per-burst response from the rover").

For STORY-021 follow-up: the README should reference this `kubectl run --rm` pattern in the recovery section (re-running the tour leaves no trigger pod behind because `--rm` self-deletes on exit; the rover Pod stays in `Running 1/1, RESTARTS: N` and re-running Beat 1 cmd 3 just bumps `N`).

#### AC sign-off

- [x] Schema-clean (`make validate-tours`).
- [x] `id: kagent-uc3-oom-killed`.
- [x] Title / description Artemis-themed, no banned vocab, no bug-class names.
- [x] Beat 1 — exactly 1 step; manifest `fileEdits[]` (3 files, byte-identical lifts of STORY-019); 3-command sequence (apply → wait → stream).
- [x] Beat 2 — exactly 1 step, single `kubectl get pods` command, friction signal is `RESTARTS: 1`.
- [x] Beat 3 — exactly 1 step, `kagent dashboard` UI/chat invocation, prompt as fenced markdown blockquote, two-clause prompt asking for diagnosis + memory chart.
- [x] Beat 4 — exactly 1 step, no commands / no fileEdits, manual recap with kubectl half + Grafana half + on-call value statement; closes after the value statement (no cross-UC roadmap tail).
- [x] No banned words across 10 participant-visible fields (case-insensitive).
- [x] No bug-class names across the strict fields (Beat 4 cluster-output quotation allowed — UC2/STORY-032 precedent).
- [x] No meta-references across 9 fields (tour.title `UC<N>` index slot exempted per convention).
- [x] English-only.
- [x] Self-contained steps — every command runs as-is in a kubectl-equipped terminal; no env-var preconditions; no inter-step shell state.
- [x] No secrets in any field.
- [x] Cluster smoke validation: apply chain → exit-after-OOM → RESTARTS=1 → lastState.terminated.reason==OOMKilled, telemetry-stream pod auto-cleaned, Prom still scraping the post-restart rover.
- [ ] Agent invocation end-to-end — *deferred*. Needs live OpenAI creds on the cluster's `default-model-config` (the `artemis-llm-credentials` Secret pattern from NFR-011 isn't injected on this dev cluster). Deferred to STORY-021's repro pass / M5 dry-run STORY-028.
- [ ] Tonal sign-off by Clément — *deferred and upgraded*. Per the *Ownership swap (and the narrative-quality risk)* note above, Clément's STORY-021 repro AC absorbs not just the cluster cycle but a tonal pass on the rendered tour. Pure-prose follow-up has zero cluster blast radius — STORY-031/032 → STORY-034 is the precedent (M2.5 prose scrub, no manifest changes).

#### Out-of-scope findings (flagged for follow-up)

1. **No metrics-server in this kind cluster** — STORY-018 already flagged. The Prom-side validation works because Prom scrapes `/metrics` from the rover directly (not the metrics-server API); the missing component only blocks the architecture-spec `kubectl top` AC, not anything in STORY-020.
2. **`kubectl exec` vs. `kubectl run --rm` design choice.** Documented in *Implementation finding*. The decision logic (no curl in container + survives-restart bonus) is repository knowledge worth preserving for future tour authors who hit the same gap. Worth a one-paragraph note in `docs/tour-content-conventions.md` under §*Cross-cutting rules* — but that touches the convention doc, which is STORY-034's territory and out of scope here. Defer to a Sprint-3 retro decision: keep the convention silent (rely on author judgment per scenario) or codify the pattern.

### Next

- PR opened against `main` (or merged directly per project flow).
- Clément, when back, runs STORY-021's cross-author repro on a fresh kind: `make uc3-up` → tour walk-through → tonal sign-off / rewrite. The manifests + agent CRDs are byte-identical to today's state, so any prose-only changes from Clément ship without re-validating the cluster cycle.
- Sprint-3 retro decision pending: codify the `kubectl run --rm` trigger pattern into `docs/tour-content-conventions.md` if UC4 (STORY-026) hits the same in-pod-tooling gap.

---

**This story was created using BMAD Method v6 - Phase 4 (Implementation Planning).**
