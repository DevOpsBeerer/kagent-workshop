# STORY-040: UC3 Grafana dashboard URL fix or port-forward step

**Epic:** EPIC-003 (UC3 observability scenario)
**Priority:** Should Have
**Story Points:** 3
**Assigned To:** Clément Raussin (UC3 owner)
**Status:** Not Started
**Created:** 2026-05-05
**Sprint:** 6 (M6 post-dry-run patch, 2026-05-06 → 2026-05-15)
**Source:** Dry-run journal 2026-05-05 16:39, severity `issue`.

---

## User Story

As a **workshop participant who just asked the agent to build a Grafana dashboard in UC3**,
I want **the link the agent returns to actually open the dashboard**,
So that **the visible payoff of UC3 (see the leak in Grafana) lands, instead of a 404 on a malformed URL.**

---

## Background

In the 2026-05-05 dry-run, the agent in UC3 returned a dashboard URL of the form `http://localhost:8082/agents/kagent/artemis-rover-telemetry-debugger/chat/d/efly2rk3j9xc0b/4167a0a`. Clicking returned a 404. The URL embeds a Grafana dashboard id (`efly2rk3j9xc0b`) inside what looks like a kagent chat path; the kagent UI on kind does not proxy to Grafana. The workaround that worked: `kubectl port-forward` to Grafana directly, then navigate to `http://localhost:<grafana-port>/d/<dashboard-id>`. The dashboard exists, the URL synthesis is just wrong.

## Scope

**In scope:**
- Diagnose where the URL is composed (likely in the `kagent-grafana-mcp` tool config or its system prompt).
- Pick one of two fixes during implementation:
  - **Path A:** patch the tool config so the agent emits a direct Grafana URL (`http://localhost:<port>/d/<dashboard-id>`); add a port-forward command earlier in the UC3 tour so the URL is clickable.
  - **Path B:** keep the kagent-UI-relative URL, document the kind port-forward prereq in the UC3 tour, and add the port-forward command as an explicit step.
- Update `uc3/tour.json`: add the port-forward step if Path A or Path B requires it, and clarify in the relevant beat that the URL becomes clickable once port-forward is up.
- Update `uc3/README.md` Author notes: the chosen path + the rationale + the kind-vs-vCluster behaviour difference.

**Out of scope:**
- The dashboard content (PromQL queries, panel layout). That is in STORY-041's scope.
- Changes outside UC3.
- Productionising the port-forward (no `Ingress` for kind; the workshop slice on vCluster has its own routing).

---

## Acceptance Criteria

- [ ] Root cause of the 404 URL identified and documented in `uc3/README.md` Author notes (which component composes the URL, what the wrong assumption is).
- [ ] The participant can click the agent's returned URL or run one extra port-forward command, and the dashboard opens with the expected layout.
- [ ] `uc3/tour.json`:
  - The relevant beat has a port-forward command (`kubectl port-forward -n <ns> svc/grafana <port>:<grafana-port>` or equivalent) before the URL is presented.
  - The step explanation tells the participant: run the port-forward first, leave it open, then click the dashboard link.
- [ ] If Path A is chosen: the agent's tool emits a direct Grafana URL; tested live on kind.
- [ ] If Path B is chosen: the kagent-UI URL is kept but the port-forward step explicitly makes it work.
- [ ] `make validate-tours` green over all 5 tours.
- [ ] No em dashes.

---

## Technical Notes

- The `kagent-grafana-mcp` tool is part of the demo profile install (kagent v0.9.0). Its config is exposed via a `ToolServer` or `RemoteMCPServer` CRD; check `kubectl get toolservers -A` and `kubectl describe ...` for the URL template.
- The 404 URL format `http://localhost:8082/agents/.../chat/d/<id>` suggests the tool injected the kagent UI's base URL (port 8082) and then concatenated Grafana's `/d/<id>` path under a chat sub-path, which the kagent UI does not route.
- On the workshop slice (vCluster + Ingress) this URL would probably work because the kagent UI is behind an Ingress that includes a Grafana sub-route. On kind without Ingress, it does not. Whatever path is chosen needs to work on **both**.
- The port-forward command must be backgrounded or in a separate shell so the participant can continue running tour commands. The convention's NFR-010 (self-contained steps) suggests inline `&` is acceptable as long as cleanup is explained.

---

## Dependencies

**Prerequisite stories:**
- STORY-041 (UC3 dashboard data pipeline) ideally lands first so the URL points at a populated dashboard; STORY-040 can land first if its work is purely on URL synthesis and not on dashboard content.

**Blocks:** none.
**External:** kagent v0.9.0 `kagent-grafana-mcp` tool config surface.

---

## Definition of Done

- [ ] All AC satisfied.
- [ ] Manual run on kind: agent's URL opens the dashboard (or the participant clicks one extra step to make it open).
- [ ] `make validate-tours` green locally.
- [ ] PR cross-reviewed by Quentin.
- [ ] `docs/sprint-status.yaml` updated: STORY-040 → `completed`.

---

## Story Points Breakdown

- Root-cause investigation (where URL is composed): 1 pt
- Decision + implementation: 1.5 pt
- Validate + sync + cross-review: 0.5 pt
- **Total: 3 pts**

---

## Progress Tracking

**Status History:**
- 2026-05-05: Created (Scrum Master, /create-story, post dry-run).

**Actual Effort:** TBD.
