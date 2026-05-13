# STORY-041: UC3 dashboard data pipeline (BLOCKER)

**Epic:** EPIC-003 (UC3 observability scenario)
**Priority:** Must Have (BLOCKER)
**Story Points:** 5
**Assigned To:** Clément Raussin (UC3 owner)
**Status:** Not Started
**Created:** 2026-05-05
**Sprint:** 6 (M6 post-dry-run patch, 2026-05-06 → 2026-05-15)
**Source:** Dry-run journal 2026-05-05 16:40, severity `blocker`.

---

## User Story

As a **workshop participant working through UC3**,
I want **the Grafana dashboard the agent built to actually show the rover-telemetry memory leak**,
So that **the visual payoff of UC3 (see the leak rise until OOMKill, the strongest argument for observability-aware agents) lands.**

---

## Background

In the 2026-05-05 dry-run, Grafana came up, the agent created its dashboard, but every panel was empty. No data flowing in. UC3's whole pedagogical promise (see the memory leak in the dashboard, correlate with the OOM events) collapses if the panels are blank. This is the workshop's most demanding UC and the one that demonstrates the strongest agent-vs-CLI gain; it must work on kind and on the workshop slice.

Suspects, ranked at triage time:
1. Prometheus is not scraping the `lunar-rover-telemetry` pod (missing or mislabeled `ServiceMonitor`, wrong scrape port).
2. The agent's dashboard PromQL does not match the live series names exposed by the rover-telemetry container.
3. Dashboard time window is wider or narrower than the leak window, so data exists but is not visible at the default range.

## Scope

**In scope:**
- Diagnose the broken data flow by walking from app to dashboard: rover-telemetry container exposes metrics → `ServiceMonitor` (or scrape annotation) → Prometheus has the series → agent's PromQL matches the series → Grafana panel renders.
- Fix the root cause(s). Most likely a manifest fix in `infra/observability/` and/or a prompt / tool config fix on the agent side.
- Verify on a fresh kind cluster (full reset via `scripts/reset-kind.sh`, full UC0 → UC3 walk-through).
- Update `uc3/README.md` Author notes: root cause + fix + a one-paragraph note on how to re-diagnose if the data ever stops flowing again (this is the workshop's most demanding UC and it will be the first thing to break).

**Out of scope:**
- The dashboard URL routing (covered by STORY-040). This story focuses on what fills the panels, not on how the URL gets to them.
- UC4 (which reuses some observability paths but is its own scope).
- Refactoring `infra/observability/` beyond the minimum fix.

---

## Acceptance Criteria

- [ ] On a freshly-reset kind cluster (`scripts/reset-kind.sh` then `make uc0-up` ... `make uc3-up`), the Grafana dashboard built by UC3's agent renders **non-empty** panels showing the memory growth of the `lunar-rover-telemetry` workload over time.
- [ ] The OOMKill event (when the pod restarts due to memory pressure) is visible on at least one panel, correlated to the memory growth curve.
- [ ] Root cause of the empty-dashboard regression documented in `uc3/README.md` Author notes, with the fix described.
- [ ] Diagnostic walk recorded in `uc3/README.md`: app metrics endpoint → ServiceMonitor / scrape config → Prometheus series → agent PromQL → Grafana panel.
- [ ] If the fix is in a manifest under `infra/observability/`, the change is documented in that file's header comment.
- [ ] `make uc3-up` produces a working data pipeline end-to-end on a cold start within a reasonable wait window (~3 min for scrape + agent dashboard creation).
- [ ] No em dashes in any new prose.

---

## Technical Notes

- Likely first checks at implementation:
  - `kubectl get servicemonitor -A -o wide` to see if a ServiceMonitor exists for the rover-telemetry service and what selectors it uses.
  - `kubectl get svc -n <uc3-ns> -o wide` to compare the SVC labels with the ServiceMonitor selector.
  - In the Prometheus UI (port-forward Prometheus, navigate to `/graph` or `/targets`), check whether `rover-telemetry` is a listed target and is `UP`.
  - If Prometheus has the target, run a PromQL like `process_resident_memory_bytes{job=~"rover.*"}` and confirm it returns data.
  - If Prometheus has no data, the gap is upstream (ServiceMonitor / Service / annotations). If Prometheus has data but the dashboard is empty, the gap is on the dashboard side (panel PromQL or time range).
- The agent's dashboard creation runs via the demo profile's `kagent-grafana-mcp` tool. If the agent's prompt is generating wrong panel queries, the fix is either (a) constrain the prompt to use a known metric name, or (b) ship a hand-authored dashboard JSON that the agent imports, with stable query strings.

---

## Dependencies

**Prerequisite stories:** none (this story is unblocking UC3 itself).
**Blocks:** STORY-040 (URL fix) lands cleaner once UC3 has working data; the freeze tag for the workshop is blocked until this story is closed.
**External:** kube-prometheus-stack on kind; the rover-telemetry app's metrics endpoint surface.

---

## Definition of Done

- [ ] All AC satisfied.
- [ ] Full UC0 → UC3 cold walk-through on kind passes the dashboard data check.
- [ ] Cross-checked on the workshop vCluster slice (if accessible) so the fix is not kind-specific.
- [ ] `make validate-tours` still green (no schema change expected).
- [ ] PR cross-reviewed by Quentin.
- [ ] `docs/sprint-status.yaml` updated: STORY-041 → `completed`.

---

## Story Points Breakdown

- Root-cause diagnosis (where the data is dropping): 2 pts
- Fix + verification on cold kind: 2 pts
- Author notes + cross-cluster verification + cross-review: 1 pt
- **Total: 5 pts**

---

## Progress Tracking

**Status History:**
- 2026-05-05: Created (Scrum Master, /create-story, post dry-run, BLOCKER).

**Actual Effort:** TBD.
