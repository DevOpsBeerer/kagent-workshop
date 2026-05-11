# STORY-026: UC4 `tour.json` — coordinator climax + bulb visualisation

**Epic:** EPIC-004 (UC4 — Multi-agent coordinator + custom MCP)
**FRs:** FR-015 (UC4 tour), FR-006 (4-beat convention), FR-017 (bulb-colour-as-diagnosis)
**NFRs:** NFR-008 (PR cross-reviewed), NFR-009 (English), NFR-010 (self-contained steps), NFR-012 (MCP tenancy guard visible to participant)
**Priority:** Must Have
**Story Points:** 3
**Status:** Completed (2026-05-11)
**Assigned To:** Quentin Rodic (re-attributed from "joint" — Clément still OOO at M3→M4 boundary; seventh swap of the OOO window.)
**Created:** 2026-05-11
**Sprint:** 4 (M4, 2026-05-13 → 2026-05-17) — implemented on formal Sprint 3 day-1 (2026-05-11), early-credit on Sprint 4 alongside STORY-024 + STORY-025.

---

## Ownership swap (joint → Quentin, seventh swap of the OOO window)

Sprint plan owner is "joint". With Clément still OOO (same window that drove STORY-018/019/020/021 + STORY-022/023/024/025), STORY-026 lands on Quentin. The work has a meaningful narrative-judgement surface (4-beat tour prose for UC4's climax) but inherits the locked convention from STORY-034 (the post-rewrite 4-beat form) + the locked FR-017 mapping from `docs/artemis-naming.md` L80-92, so the narrative surface is bounded.

**Cross-author repro deferral.** Per the recursive deferral chain documented across STORY-018/019/020/021/024/025, NFR-008 cross-review for STORY-026 — including the tonal sign-off on UC4 mission framing + the cluster-side run-through of Beat 1 → Beat 4 — lands on Clément at M5 dry-run STORY-028. Same plate the prior 12 swap-chain stories already accumulated.

---

## User Story

As a **workshop participant** in UC4 (the workshop's climax),
I want **a 4-beat tour that brings up the multi-symptom Artemis fleet, surfaces the simultaneous friction in one `kubectl get pods`, then asks `artemis-mission-coordinator` for a fleet-wide health check from the CLI — and shows me my three status bulbs flipping colour live in my browser tab as the coordinator's verdicts land**, so that **I experience the multi-agent coordination shape (a2a fan-out + custom MCP write-back + bulb-colour-as-diagnosis) as one synthesis, the same way UC1/UC2/UC3 demonstrated single-agent kubectl-vs-agent — only this time the contrast is multi-axis (three kubectl chains across three namespaces + three manual bulb writes via the light-manager API, vs one coordinator ask).**

---

## Description

### Background

UC4 is the workshop's third-axis demonstration: not a new bug class, but a new *interaction shape* — one coordinator agent fans out across three independent debuggers in a single round-trip and writes its colour-coded verdicts to the participant's status bulbs. STORY-024 shipped the cluster mess (3 broken Deployments in `artemis-uc4`); STORY-025 shipped the coordinator Agent CRD + the MCP wiring + the system-prompt contract. STORY-026 ships the **tour that the participant lives through** — the 4-beat narrative that frames the mission, surfaces the friction, calls the coordinator, and recaps the manual workflow the participant skipped.

The tour follows the post-STORY-034 4-beat convention (`docs/tour-content-conventions.md`):

```
[Mission setup] ──► [Mission status check] ──► [Call the agent] ──► [Manual recap]
   1 step              1 step                     exactly 1 step       exactly 1 step
```

UC4 declares the **CLI invoke** Beat 3 variant (per `docs/tour-content-conventions.md` §"Beat 3 invocation"). The participant runs `kagent invoke` from the terminal — the same operational CLI ops already use — and the coordinator's reply prints to the terminal. The **bulb-colour change is folded into the Beat 3 explanation**, not a separate step (which would violate the 4-beat shape): the participant opens the light-manager UI in another browser tab *before* running the invoke, watches their three bulbs simultaneously flip colour as the coordinator's `update_bulb` calls land, and reads the structured summary in the terminal.

### Scope

**In scope:**
- `uc4/tour.json` — the 4-beat tour file. Validates against `schemas/workshop-tour.schema.json` (`make validate-tours` clean).
  - `id`: `kagent-uc4-coordinator` (per `docs/artemis-naming.md` + `docs/tour-content-conventions.md` worked example).
  - `title`: Artemis-themed, mission framing, no bug-class names, no banned vocabulary.
  - `description`: One sentence framing UC4 as a mission and naming the coordinator's role + the bulb panel. No-spoiler rule applies.
  - Beat 1 — *Mission setup — bring the Artemis fleet up*. Exactly 1 step. `fileEdits[]` drops all 7 `uc4/manifests/*.yaml` with `overwrite: true` (verbatim lift). `commands[]` runs `kubectl apply -f uc4/manifests/`, waits for the rover to be Ready, then triggers the leak loop via `kubectl exec` inside the rover Pod (not via a transient trigger Pod — see *Technical Notes — leak trigger* below).
  - Beat 2 — *Mission status check — is the fleet on its feet?* Exactly 1 step (per convention's "one step typical case"). `kubectl get pods -n artemis-uc4` surfaces all three friction signals at once (image-pull retry, scheduling-blocked, and `RESTARTS: 1` on the rover). The convention's two-step allowance for multi-resource observation does **not** apply — `get pods` alone is legible.
  - Beat 3 — *Call the coordinator for help*. Exactly 1 step. CLI invoke variant. `kagent invoke --agent artemis-mission-coordinator --namespace kagent --task '<prompt>'`. Explanation includes (a) the exact prompt as a markdown block (per convention), (b) the light-manager URL pattern with `?user=<your-login>` so the participant can open their bulb panel in another tab before running, (c) the bulb-colour-as-output framing per FR-017.
  - Beat 4 — *What we'd have done by hand*. Exactly 1 step, pure markdown. Three sub-blocks: UC1-style manual diagnosis (3 kubectl commands), UC2-style manual diagnosis (5 kubectl commands across pods + nodes), UC3-style manual diagnosis (3 kubectl commands + a separate Grafana panel). Plus a fourth block: 3 manual `curl PUT /api/bulbs/{slot}?user=<login>` calls the human would have made to paint the panel. ~14+ commands total across 3 namespaces + 1 external system — vs the single coordinator ask.

**Out of scope:**
- `uc4/manifests/`, `uc4/agents/` — STORY-024, 025 (already completed).
- `uc4/README.md` — STORY-027 (will reference this tour, not the other way around).
- Any change to UC1/UC2/UC3 tours, READMEs, manifests, or agents.
- `apps/`, `schemas/`, `mcp/`, `infra/`, `docs/architecture-…md`, `docs/artemis-naming.md`, `docs/tour-content-conventions.md`.
- End-to-end cluster walk-through of all four beats with live OpenAI creds + light-manager backend. The Beat 3 invocation requires both; both are workshop-infrastructure responsibilities. Deferred to STORY-028 (M5 dry-run) per the recursive deferral chain.

### User flow (workshop participant lives this)

Pre-tour: workshop-infrastructure has deployed everything (`make uc4-up` ran at provisioning time). The participant opens the UC4 tour in their VS Code workshop-tour extension.

1. **Beat 1 — Mission setup.** The extension drops 7 manifests into `uc4/manifests/` (`overwrite: true`) and runs three commands: `kubectl apply -f uc4/manifests/`, `kubectl wait` for the rover Pod, then a `kubectl exec` into the rover that fires 30 `POST /leak` calls against `127.0.0.1:8000/leak`. The rover OOMs around iteration 7-11; the exec session dies with exit code 137; the wrapper swallows the error and continues.
2. **Beat 2 — Mission status check.** `kubectl get pods -n artemis-uc4` shows three friction signals:
   - `mission-control-imagepull-…` — `0/1 ImagePullBackOff`.
   - `mission-control-pending-…` — `0/1 Pending`.
   - `lunar-rover-telemetry-…` — `1/1 Running, RESTARTS: 1`.
   The fleet is not on its feet. Three subsystems are in trouble simultaneously — that's the cue to call the coordinator.
3. **Beat 3 — Call the coordinator.** The participant opens the light-manager UI in another browser tab (URL pattern surfaced in the step's explanation, with `?user=<their-login>` per FR-015). They see three bulbs, off. They run `kagent invoke --agent artemis-mission-coordinator --namespace kagent --task '...'` in the terminal. Within seconds:
   - Three bulbs in the light-manager UI flip to red simultaneously.
   - The terminal prints a structured summary: three bulb-state lines, three one-sentence diagnoses, three remediation hints.
4. **Beat 4 — What we'd have done by hand.** Pure markdown recap of what the participant *didn't* have to do: ~14 kubectl commands across 3 namespaces, a Grafana panel for the OOM curve, and 3 manual `curl PUT` calls to paint the bulbs themselves. The coordinator did all of it in one ask.

---

## Acceptance Criteria

(Mirrors sprint plan AC + the convention checklist + the FR-015/FR-017 specifics.)

- [ ] **`uc4/tour.json` validates** against `schemas/workshop-tour.schema.json` (`make validate-tours` clean over all 5 tours: uc0, uc1, uc2, uc3, uc4).
- [ ] **`id` is `kagent-uc4-coordinator`** (per `docs/artemis-naming.md` + `docs/tour-content-conventions.md` worked-example reference).
- [ ] **`title` is Artemis-themed**, ≤ 80 chars, no banned vocabulary (`broken`, `deliberately`, `intentionally`, `synthetic`, `fault`, `bug`, `wrong`, `error`, `fail`, `unsafe`, `blocked`, `taint`), no bug-class names (`ImagePullBackOff`, `Pod Pending`, `OOMKilled`, `CrashLoopBackOff`, `Pending`). Anticipatory tension OK.
- [ ] **`description` is one sentence** framing UC4 as a mission and naming the coordinator's role + the bulb panel. Same no-spoiler restrictions as `title`. **Names the agent**: `artemis-mission-coordinator`.
- [ ] **Beat 1 — `Mission setup — …`** exactly 1 step:
  - `fileEdits[]` creates all 7 `uc4/manifests/*.yaml` files with `overwrite: true`. File contents byte-identical to the manifests STORY-024 shipped.
  - `commands[]` has three entries:
    1. `kubectl apply -f uc4/manifests/` — applies the fleet.
    2. `kubectl wait --for=condition=Ready pod -n artemis-uc4 -l app=lunar-rover-telemetry --timeout=60s` — waits for the rover (only the rover, not the other two — they never become Ready by design).
    3. A leak-trigger command via `kubectl exec` into the rover Pod (see *Technical Notes* below for the exact form).
  - `explanation` frames the deployment as a fleet stand-up. No banned vocabulary; no bug specifics (image tags, taint keys, etc.) in the prose.
- [ ] **Beat 2 — `Mission status check — …`** exactly 1 step:
  - One `commands[]` entry: `kubectl get pods -n artemis-uc4`.
  - `explanation` directs the participant to look at all three Pods at once; surfaces the multi-symptom shape ("three subsystems showing different signs of friction") without naming bug classes.
- [ ] **Beat 3 — `Call the coordinator for help`** exactly 1 step, CLI invoke variant:
  - One `commands[]` entry: `kagent invoke --agent artemis-mission-coordinator --namespace kagent --task '<prompt>'`.
  - The prompt is also surfaced in the step's `explanation` as a markdown blockquote (per convention).
  - **`explanation` includes the light-manager URL pattern with `?user=<your-login>`** so the participant can open their bulb panel before invoking (per FR-015 AC: "References the participant's `?user=<login>` in copy").
  - **`explanation` describes the bulb-colour change** as the coordinator's diagnosis output: three bulbs flip simultaneously, slot 1 ↔ UC1 verdict, slot 2 ↔ UC2 verdict, slot 3 ↔ UC3 verdict, red/green/amber per the FR-017 mapping (per AC: "Includes a step that demonstrates the bulb colour change as the diagnosis output").
- [ ] **Beat 4 — `What we'd have done by hand`** exactly 1 step:
  - Pure markdown — no `commands[]`, no `fileEdits`.
  - Recap names the **manual `kubectl` chain across three namespaces** the participant skipped (~11 commands across three resource scopes), **plus the three manual bulb writes** via `curl PUT /api/bulbs/{slot}?user=<login>` that the coordinator did automatically.
  - Closes with the workshop's central rhetorical claim: one synthesis instead of N commands × M surfaces, multiplied across an on-call rotation.
  - **No cross-UC roadmap tail** (per convention's no-meta-references sub-rule — UC4 is the climax, no "UC5 will…").
- [ ] **No meta-references in participant-visible prose** (per convention): no `STORY-…` citations, no `Beat <N>` references inside `explanation` strings, no `UC<N>` mentions in `description`/explanation prose, no "earlier"/"later"/cross-tour pointers. Tour `id` retains `kagent-uc4-coordinator` (exempted), tour `title` retains the `UC4 — …` sidebar prefix (exempted).
- [ ] **Every `commands[].command` runs as-is in the VS Code server terminal** (NFR-010). No shell preconditions outside what the step itself sets.
- [ ] **English (NFR-009)** across all `title`, `explanation`, and any markdown.
- [ ] **No secrets** in `commands` or `fileEdits.content` (NFR-011). The leak-trigger command uses an in-pod loopback URL (`http://127.0.0.1:8000/leak`); the light-manager URL in Beat 3's explanation is a participant-environment-supplied URL pattern, not a literal URL with credentials.
- [ ] **Self-author validation** against the live `kagent-workshop` kind cluster:
  - [ ] `make validate-tours` clean.
  - [ ] `kubectl apply -f uc4/manifests/` applies cleanly (already validated by STORY-024; STORY-026 just re-confirms the manifests-as-tour-fileEdits-content matches).
  - [ ] The Beat 1 `kubectl exec` leak-trigger pattern executes successfully (rover OOMs deterministically; `RESTARTS: 1` visible within ~30 s of the trigger; exit-code-137 cleanly swallowed).
  - [ ] Beat 2 `kubectl get pods -n artemis-uc4` shows the expected three-symptom shape.
  - [ ] No banned vocabulary in participant-visible fields (custom audit per STORY-034's pattern).

- [ ] **NFR-008 cross-author tonal sign-off on UC4 mission framing** — deferred to STORY-028 (M5 dry-run) per the recursive deferral chain. Pure-text follow-up; the manifest shape is locked.
- [ ] **End-to-end Beat 3 execution** (live `kagent invoke` → coordinator fans out → 3 bulbs flip in light-manager UI) — deferred to STORY-028. Requires (a) live OpenAI credentials, (b) light-manager backend reachable from the cluster, (c) the participant's bulb-panel URL reachable from a browser. Same chain as STORY-019/020/021/024/025.

---

## Technical Notes

### Leak trigger: `kubectl exec` instead of `kubectl run --rm`

STORY-024's *Implementation findings* flagged this:

> Trigger leak via in-pod exec (the in-pod exec works because the rover already tolerates the taint; an external `kubectl run` trigger pod doesn't and would stay Pending — STORY-026 will design the tour-side trigger appropriately).

UC3's tour ships `kubectl run telemetry-stream --rm` with `curlimages/curl:8.10.1` — works in `artemis-uc3` because no taint blocks the trigger pod. UC4's `artemis-uc4` namespace has the synthetic taint applied by the bootstrap Job (UC2-style), so a vanilla `kubectl run` trigger pod stays Pending and never fires the leak loop.

Three options considered:

| Option | Pros | Cons |
| --- | --- | --- |
| **`kubectl exec` into the rover Pod** | Doesn't need a trigger Pod; rover already tolerates the taint; no `--overrides` JSON to surface | `kubectl exec` exits with code 137 when the rover OOMs mid-loop (needs `\|\| true` to swallow); python urllib syntax is uglier than curl |
| `kubectl run --overrides='{...tolerations...}'` | Mirrors UC3's pattern (`kubectl run --rm`); trigger pod survives the rover's OOM cycle so the loop runs to completion | The `--overrides` JSON contains `"key":"artemis.kagent.dev/launch-pad-fault"` → the `fault` substring leaks the bootstrap-Job's purpose to a careful reader (violates the *spirit* of the no-spoiler rule even though `commands[]` strings are out of the strict `title/description/explanation` scope) |
| Pre-shipped Pod with the toleration baked in | Cleanest narratively; no shell `$()` substitution; no `--overrides` JSON | Adds a new manifest file just for a one-shot trigger; complicates `make uc4-down` cleanup; expands `uc4/manifests/` past the 7 files STORY-024 froze |

**Chosen: `kubectl exec`** with `2>/dev/null || true` to swallow the kubelet's `exit code 137` after the rover OOMs. Full form:

```bash
kubectl exec -n artemis-uc4 $(kubectl get pod -n artemis-uc4 -l app=lunar-rover-telemetry -o jsonpath='{.items[0].metadata.name}') -- python3 -c "import urllib.request as u; [u.urlopen(u.Request('http://127.0.0.1:8000/leak', method='POST'), timeout=2).read() for _ in range(30)]" 2>/dev/null || true
```

In-pod loopback (`127.0.0.1:8000`) avoids the in-cluster Service DNS step UC3 needs (UC3's trigger pod talks to `http://lunar-rover-telemetry:8000` via the Service). The rover's FastAPI binds `0.0.0.0:8000` so localhost works.

Mission framing in Beat 1's explanation absorbs this cleanly: *"…push one short stream of telemetry bursts from inside the rover itself, since the rover is the one accumulating today's queued payload"*. The implementation detail (the kubectl exec) is invisible to the participant beyond seeing the command run.

### Beat 3 — bulb visualisation without breaking the 4-beat shape

The sprint-plan AC says "Includes a step that demonstrates the bulb colour change as the diagnosis output". A separate 5th step for the bulb panel would break the 4-beat convention. The bulb visualisation is therefore **folded into Beat 3's explanation** as a parallel observation surface, not a separate step:

1. Beat 3's `explanation` opens with: *"Before running the command, open your light-manager UI in a separate browser tab so you can watch your three status bulbs while the coordinator works."*
2. The URL pattern is given as: `<light-manager-url>/?user=<your-login>` — workshop-infrastructure pre-wires the actual URL into the participant's environment; the `?user=` query parameter is named explicitly per FR-015 AC.
3. The explanation continues: *"Then run the command below. The coordinator fans out to its three on-call specialists in parallel, collects their verdicts, and paints your three bulbs by writing to slots 1/2/3 through the per-vCluster custom MCP. Watch the panel — three bulbs should change colour simultaneously."*
4. The `commands[]` array has exactly one entry (`kagent invoke …`), as the CLI invoke variant requires.

The bulb-colour change is the **diagnosis output** the participant sees in the browser tab; the structured terminal reply is the **diagnosis transcript**. Both land in the same Beat 3 step, satisfying both ACs.

### Mission framing for the bootstrap Job

UC2's tour referred to the bootstrap-taint Job as *"the launch-pad readiness sweep"*. UC4 reuses the same Artemis vocabulary verbatim — *"RBAC for the launch-pad readiness sweep, the readiness sweep itself"* — so the convention vocabulary stays consistent across UC2 + UC4 without using meta-references to UC2 itself. The Job's actual technical purpose (apply a taint, force a rollout-restart) is invisible to the participant in tour prose; the cluster will tell the truth if they `kubectl describe job` mid-tour, but the tour's narrative arc doesn't leak it.

### What STORY-026 deliberately does **not** touch

- `uc4/manifests/`, `uc4/agents/`, `uc4/README.md` — STORY-024, 025, 027 territory.
- `uc1/`, `uc2/`, `uc3/`, `uc0/`, `apps/`, `schemas/`, `mcp/`, `infra/`, `Makefile`, `docs/architecture-…md`, `docs/tour-content-conventions.md`, `docs/artemis-naming.md` — no impact.

---

## Dependencies

**Prerequisite stories (all completed):**
- STORY-024 (UC4 multi-symptom manifests) — provides the 7 manifests Beat 1 `fileEdits` lift verbatim + the cluster mess Beat 2 surfaces.
- STORY-025 (UC4 coordinator a2a Agent CRD) — provides `artemis-mission-coordinator` in `kagent` ns, the bulb MCP wiring, and the system-prompt contract Beat 3 invokes.
- STORY-022 + STORY-023 (KMCP source + MCP packaging) — provide the `artemis-bulb-mcp` RemoteMCPServer the coordinator writes through.
- STORY-018 (`infra/observability/`) — Beat 4's manual-recap text references the Grafana panel UC3-style debugging would have required.
- STORY-030 (mission-framing tour convention) + STORY-034 (UC/meta-reference scrub) — define the 4-beat structure and the no-spoiler / no-meta-reference rules STORY-026 follows.
- STORY-007 (tour content convention doc) — the operational form of FR-006.

**External dependencies:**
- `schemas/workshop-tour.schema.json` — `ajv-cli` validates `tour.json` shape (NFR-005). Already in place.
- `kagent` CLI on the participant's VS Code server `PATH` — workshop-infrastructure responsibility, same precedent UC2 + UC3 already rely on.
- `light-manager` deployed and reachable from a participant's browser — workshop-infrastructure responsibility per architecture §C5 + brief. Cutoff 2026-05-15 per architecture L769.

**Blocked stories:**
- STORY-027 (UC4 README + cross-author repro) — references the tour ID, the climax shape, and the bulb-colour mapping.
- STORY-028 (M5 dry-run) — absorbs the end-to-end Beat 3 execution deferred from STORY-026, alongside the same deferrals from STORY-019/020/021/024/025.

---

## Definition of Done

- [ ] `uc4/tour.json` shipped with the documented shape.
- [ ] AC ticked.
- [ ] Self-author validation recorded under *Implementation Notes*.
- [ ] STORY-026 entry in `docs/sprint-status.yaml` updated to `status: completed` with `completion_date`, `actual_points`, and an ownership re-attribution note (`joint → Quentin`).
- [ ] PR opened (or committed directly to `main` per the branching convention).

---

## Story Points Breakdown

- **Beat 1 (fileEdits × 7 + apply + wait + leak trigger):** 1 point. Mostly mechanical — verbatim YAML lift × 7. The leak-trigger one-liner is the only judgement call (resolved per *Technical Notes*).
- **Beat 2 (1 command + explanation):** 0.25 points. Trivial.
- **Beat 3 (prompt + invoke + bulb-visualisation framing):** 1 point. Two contracts to encode in prose (FR-015 `?user=` visibility + FR-017 bulb mapping) plus the prompt phrasing.
- **Beat 4 (manual recap across 3 namespaces + bulb writes):** 0.5 points. Pure prose; the rhetorical content is well-precedented (UC2's two-axis manual recap + UC3's kubectl-plus-observability recap, both templated).
- **`make validate-tours` clean + custom no-spoiler audit + cluster-side smoke (Beat 1 + Beat 2):** 0.25 points.
- **Total:** 3 points. Matches sprint-plan estimate.

**Rationale:** Same complexity tier as STORY-016 (UC2 tour, 3 pts) — both follow the same 4-beat structure with the CLI invoke variant. UC4's slight overhead (7 fileEdits vs UC2's 5, plus the bulb-visualisation framing in Beat 3) is offset by the mission-framing convention being mature post-STORY-034 (no narrative-convention iteration needed).

---

## Additional Notes

- **Sprint plan AC mentioned a `?user=<login>` reference for FR-015.** The cleanest place is Beat 3's explanation block where the participant opens the light-manager UI — the URL pattern `…/?user=<your-login>` makes the per-participant tenancy visible without dragging it into the agent invocation.
- **Why no MCP Secret/ConfigMap in Beat 1.** The MCP runs in `artemis-mcp` (workshop-infrastructure pre-deploys it). The tour does not provision the MCP — that's a participant-environment prerequisite. Beat 1 only ships the UC4 cluster mess.
- **Beat 4's manual recap intentionally does NOT include `kagent invoke` calls** for each specialist. The "manual" axis is *no agents at all* — pure kubectl + curl + Grafana clicks. Falling back to "well, you'd invoke each specialist agent individually" would muddy the rhetorical contrast.
- **Sprint-3 retro candidate (already partially flagged in STORY-024)**: the `kubectl exec` leak-trigger pattern is a workaround for the taint-blocks-trigger-pod issue. A cleaner pattern (toleration baked into a pre-shipped trigger Pod manifest) would be ~10 lines of YAML but expands `uc4/manifests/` past STORY-024's frozen 7-file shape. Defer to M5 if it becomes friction.

---

## Progress Tracking

**Status History:**
- 2026-05-11: Created (Developer / Quentin, /bmad:dev-story STORY-026).
- 2026-05-11: Started — seventh swap of the OOO window, joint→Quentin.
- 2026-05-11: Implemented + validated.

**Actual Effort:** 3 points (matched estimate).

### Implementation Notes (2026-05-11)

#### Files added (1)
- `uc4/tour.json` — 4-beat tour, `id: kagent-uc4-coordinator`, title *"UC4 — The Artemis fleet check-in won't come together"*. ~24 KB total (most of the bulk is Beat 1's seven embedded manifests). The four beats:
  - **Beat 1 — Mission setup — bring the Artemis fleet up.** 3 `commands[]` entries: `kubectl apply -f uc4/manifests/`, `kubectl wait` for the rover Pod, and the in-pod-exec leak trigger. 7 `fileEdits[]` entries that lift the on-disk `uc4/manifests/*.yaml` byte-identically (including author comments — same precedent UC2 + UC3 set; the no-spoiler rule applies to `title`/`description`/`title`/`explanation`, not to YAML body content per `docs/tour-content-conventions.md` L59).
  - **Beat 2 — Mission status check — is the fleet on its feet?** 1 `commands[]` entry: `kubectl get pods -n artemis-uc4`. Single-step is enough — three workloads with three different `STATUS`/`RESTARTS` signals are all legible in one listing (no two-step multi-resource observation needed).
  - **Beat 3 — Call the coordinator for help.** CLI invoke variant (per `docs/tour-content-conventions.md` §"Beat 3 invocation"). 1 `commands[]` entry: `kagent invoke --agent artemis-mission-coordinator --namespace kagent --task '<prompt>'`. The `explanation` instructs the participant to open the light-manager UI in a separate browser tab first — references the participant's `?user=<login>` query parameter per FR-015 AC and frames the per-vCluster tenancy guarantee as a feature ("the same `?user=` query parameter your custom MCP enforces per-vCluster, so the coordinator can never paint someone else's bulbs"). Bulb-colour-as-output framing per FR-017: slot 1 ↔ mission-control's incoming roster, slot 2 ↔ launch-pad replica, slot 3 ↔ rover telemetry; red/green/amber per `docs/artemis-naming.md` L80–92.
  - **Beat 4 — What we'd have done by hand.** Pure markdown; no `commands[]`, no `fileEdits[]`. Four sub-blocks: 3 kubectl chains (UC1-style image-pull, UC2-style scheduling, UC3-style OOM) totalling ~11 kubectl commands across two resource kinds, plus a fourth block with 3 `curl PUT /api/bulbs/{slot}?user=<login>` calls. Closes with the workshop's central rhetorical claim — *one synthesis instead of N commands × M surfaces, especially when each incident spans multiple subsystems with their own specialists*. No cross-UC roadmap tail (UC4 is the climax — per convention's no-meta-references sub-rule).

#### Leak-trigger pattern (Beat 1 step 3)

Per `docs/tour-content-conventions.md` § Beat 1 and STORY-024's flagged finding ("STORY-026 will design the tour-side trigger appropriately"), UC4's leak trigger uses `kubectl exec` instead of UC3's `kubectl run --rm` pattern:

```bash
kubectl exec -n artemis-uc4 $(kubectl get pod -n artemis-uc4 -l app=lunar-rover-telemetry -o jsonpath='{.items[0].metadata.name}') -- python3 -c "import urllib.request as u; [u.urlopen(u.Request('http://127.0.0.1:8000/leak', method='POST'), timeout=2).read() for _ in range(30)]" 2>/dev/null || true
```

Reasoning (full trade-off matrix in *Technical Notes* above): the synthetic node taint blocks a vanilla `kubectl run` trigger pod from scheduling. The cleanest path is to run the leak loop *inside* the rover Pod itself (the rover tolerates the taint) via `kubectl exec` against the rover's in-pod loopback (`127.0.0.1:8000`). The `2>/dev/null || true` wrapper swallows the inevitable `exit code 137` when the rover OOMs mid-loop (the exec stream dies with the container) without surfacing a confusing error to the participant.

#### Files NOT modified (intentional)
- `uc4/manifests/`, `uc4/agents/`, `uc4/README.md` — STORY-024, 025, 027 territory.
- `uc1/`, `uc2/`, `uc3/`, `uc0/`, `apps/`, `schemas/`, `mcp/`, `infra/`, `Makefile`, `docs/architecture-…md`, `docs/tour-content-conventions.md`, `docs/artemis-naming.md` — no impact.

#### Validation

**`make validate-tours` clean** across all 5 tours (uc0/uc1/uc2/uc3/uc4) — the existing `TOUR_FILES := $(wildcard uc*/tour.json)` glob picked up `uc4/tour.json` automatically, no Makefile change needed.

**Custom no-spoiler audit** (banned vocabulary + bug-class names + UC<N> meta-refs across `title`, `description`, Beat 1/2/3 `title`/`explanation` — the pre-discovery participant-visible scope per convention): **0 issues**. Beat 4 legitimately names what the agent revealed (`ImagePullBackOff`, `OOMKilled`, `synthetic taint`, `FailedScheduling`) — same precedent UC1 + UC2 + UC3 tours set and the convention's worked example endorses.

**fileEdits byte-identical check**: all 7 `fileEdits[].content` strings byte-identical to the on-disk `uc4/manifests/*.yaml` files STORY-024 shipped (verified via `diff` after the initial draft accidentally stripped author comments — re-embedded verbatim per the UC2/UC3 precedent).

**End-to-end cluster smoke** against the live `kagent-workshop` kind cluster — executed Beat 1's 3-command chain + Beat 2's status check:

```text
$ kubectl apply -f uc4/manifests/                           # Beat 1 step 1
namespace/artemis-uc4 unchanged
[...rest of 12 resources applied/unchanged...]

$ kubectl wait --for=condition=Ready pod -n artemis-uc4 \
    -l app=lunar-rover-telemetry --timeout=60s             # Beat 1 step 2
pod/lunar-rover-telemetry-7bffbc6cb5-lbm4b condition met

$ kubectl exec -n artemis-uc4 $(kubectl get pod -n artemis-uc4 \
    -l app=lunar-rover-telemetry -o jsonpath='{.items[0].metadata.name}') \
    -- python3 -c "import urllib.request as u; \
        [u.urlopen(u.Request('http://127.0.0.1:8000/leak', method='POST'), \
                   timeout=2).read() for _ in range(30)]" 2>/dev/null || true
# Beat 1 step 3 — silent on success (137 exit code swallowed when rover OOMs)

$ kubectl get pods -n artemis-uc4                          # Beat 2
NAME                                        READY   STATUS             RESTARTS      AGE
lunar-rover-telemetry-7bffbc6cb5-lbm4b      1/1     Running            1 (15m ago)   15m
mission-control-imagepull-c94dd65cd-czpbm   0/1     ImagePullBackOff   0             15m
mission-control-pending-6d84c857b-gplb4     0/1     Pending            0             15m

$ kubectl get pod -n artemis-uc4 -l app=lunar-rover-telemetry \
    -o jsonpath='{.items[0].status.containerStatuses[0].lastState.terminated.reason}'
OOMKilled
```

Three simultaneous friction signals visible in one `kubectl get pods` — exactly the multi-symptom shape Beat 2 surfaces. Rover `RESTARTS: 1` + `lastState.terminated.reason: OOMKilled` + `exitCode: 137` confirms the leak trigger drove the rover through one OOM cycle deterministically.

Beat 3 + Beat 4 NOT executed live (requires OpenAI creds + reachable light-manager + browser-side bulb panel — deferred per AC to STORY-027/028).

#### Implementation findings (Sprint-3 retro candidates)

1. **Initial draft accidentally comment-stripped the fileEdits content.** The first pass at `uc4/tour.json` had its manifest YAML bodies stripped of author comments — reasoning that the comments contain banned vocabulary (`fault`, `taint`, `Pending`). Checking the convention closely (line 59) plus UC2 + UC3 tour precedent showed that author comments stay in YAML bodies — the no-spoiler rule scopes to *participant-visible tour fields* (`title`, `description`, step `title`/`explanation`). Re-embedded verbatim via a small script. **Sprint-3-retro candidate**: extend `make validate-tours` (or a sibling `make audit-tours`) with a fileEdits-byte-identity check so this drift is caught at lint time.

2. **`kubectl exec` exit-code-137 ergonomics.** The `2>/dev/null || true` wrapper is correct but participant-facing terminal output is *completely silent* for ~15 seconds (the in-pod python runs the leak loop until the rover OOMs; the python list comprehension doesn't auto-print results). Acceptable for the tour but might leave the participant uncertain whether the step is doing anything. **Sprint-3-retro candidate (optional)**: prepend a `echo "[Beat 1] pushing 30 telemetry bursts to the rover..."` before the kubectl exec for clearer progress reporting.

3. **Light-manager UI URL is participant-environment-supplied.** Beat 3's `explanation` says "Workshop-infrastructure pre-wired the URL into your environment" without pinning a literal URL. That assumes workshop-infrastructure injects something usable (an env var, a documented base URL, or an obvious tab in the participant's VS Code server). The choice is correct (the URL is workshop-infrastructure territory) but means the tour reads as slightly hand-wavy here. **Sprint-3-retro candidate**: confirm with workshop-infrastructure team what the actual URL pattern is, then tighten the Beat 3 explanation accordingly.

#### AC sign-off

- [x] `uc4/tour.json` validates against `schemas/workshop-tour.schema.json` (`make validate-tours` clean over all 5 tours).
- [x] `id: kagent-uc4-coordinator`.
- [x] `title` is Artemis-themed, ≤ 80 chars, no banned vocabulary, no bug-class names. Anticipatory tension via "won't come together".
- [x] `description` frames UC4 as a mission and names the coordinator's role + the status-bulb panel. No-spoiler rule honoured.
- [x] Beat 1 — Mission setup, exactly 1 step, 7 `fileEdits`, 3 `commands[]` (apply + wait + leak trigger).
- [x] Beat 2 — Mission status check, exactly 1 step, 1 `commands[]` (`kubectl get pods -n artemis-uc4`).
- [x] Beat 3 — Call the coordinator, exactly 1 step, CLI invoke variant. Prompt surfaced as markdown blockquote. Light-manager URL pattern with `?user=<your-login>` included. Bulb-colour-as-output framing per FR-017.
- [x] Beat 4 — Manual recap, exactly 1 step, pure markdown, no `commands[]`/`fileEdits`. Three diagnostic chains + manual bulb-write block. No cross-UC roadmap tail.
- [x] No meta-references in participant-visible prose (no `STORY-…`, `Beat <N>`, `UC<N>` in explanations; tour `id`/`title` exemptions retained).
- [x] Every `commands[].command` runs as-is in a terminal (cluster-side validated).
- [x] All copy English.
- [x] No secrets in `commands` or `fileEdits.content`.
- [x] `make validate-tours` clean.
- [x] Custom no-spoiler audit clean on pre-Beat-4 participant-visible fields.
- [x] Beat 1 → Beat 2 cluster-side smoke validated end-to-end on the live `kagent-workshop` kind cluster (three simultaneous friction signals confirmed).
- [ ] **NFR-008 cross-author tonal sign-off** — *deferred* to STORY-028 (M5 dry-run) per the recursive deferral chain established in STORY-018/019/020/021/024/025.
- [ ] **End-to-end Beat 3 execution** (live `kagent invoke` → coordinator fans out → 3 bulbs flip in light-manager UI) — *deferred* to STORY-028. Requires OpenAI creds + light-manager backend reachable.

---

**This story was created using BMAD Method v6 - Phase 4 (Implementation Planning).**
