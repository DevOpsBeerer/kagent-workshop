# STORY-043: UC4 WORKSHOP_PARTICIPANT_LOGIN prereq hardening (BLOCKER)

**Epic:** EPIC-004 (UC4 multi-agent + custom MCP)
**Priority:** Must Have (BLOCKER)
**Story Points:** 2
**Assigned To:** Quentin Rodic
**Status:** Not Started
**Created:** 2026-05-05
**Sprint:** 6 (M6 post-dry-run patch, 2026-05-06 → 2026-05-15)
**Source:** Dry-run journal 2026-05-05 16:45, severity `blocker`.

---

## User Story

As a **workshop participant or author starting UC4**,
I want **the first command to fail clearly and quickly if my environment is missing required variables, with a one-line fix in the error**,
So that **I either continue (variable already set on my slice) or fix the prereq immediately (local kind / dry-run), instead of debugging a cryptic Docker tag error.**

---

## Background

In the 2026-05-05 dry-run on local kind, UC4 step 1 (`kmcp build ... -t registry.workshop.qcs.ovh/$WORKSHOP_PARTICIPANT_LOGIN/artemis-bulb-mcp:v0.1.0 --push`) crashed immediately:

```
ERROR: failed to build: invalid tag "registry.workshop.qcs.ovh//artemis-bulb-mcp:v0.1.0": invalid reference format
```

Root cause: `$WORKSHOP_PARTICIPANT_LOGIN` is unset on local kind, so the image tag interpolates to `registry.workshop.qcs.ovh//artemis-bulb-mcp:v0.1.0` (double slash). Docker rejects. UC4 cannot start.

On the workshop slice, `workshop-infrastructure` pre-sets the variable in the participant's env. On local kind or any author dry-run setup, nothing pre-sets it and nothing in the tour signals the dependency. Tour aborts at step 1 with a misleading error.

## Scope

**In scope:**
- Pick one of three hardening paths during implementation (or combine):
  - **Path A (defensive check):** add a pre-step or inline check in Beat 1 that bails with a clear error if `$WORKSHOP_PARTICIPANT_LOGIN` is empty, with a suggested default (`export WORKSHOP_PARTICIPANT_LOGIN=dryrun`).
  - **Path B (inline fallback):** rewrite the `kmcp build` command to fall back to a default if the variable is unset: `${WORKSHOP_PARTICIPANT_LOGIN:-dryrun}` in the tag.
  - **Path C (explicit set step):** prepend an explicit step that sets the variable, with prose explaining the slice provides it normally but kind / local does not.
- Update `uc4/tour.json` with the chosen mechanism in Beat 1.
- Update `uc4/README.md` Author notes: which path was chosen, why, and what the slice-vs-kind behaviour difference looks like.
- Verify on a fresh kind cluster: with `$WORKSHOP_PARTICIPANT_LOGIN` unset, the tour either fails fast with a clear error (Path A) or proceeds with a sensible default (Path B / C).

**Out of scope:**
- The rest of UC4 (downstream `kmcp` commands, agent CRDs, MCP deploy). Once Beat 1 unblocks, those become accessible to the rest of the dry-run.
- A general "all env var prereqs" audit across UCs. UC4 is the only one with this gap today.
- Changing the registry host or the image-tag scheme.

---

## Acceptance Criteria

- [ ] On a fresh kind cluster, with `WORKSHOP_PARTICIPANT_LOGIN` unset, running UC4 Beat 1 either:
  - (Path A) fails with a clear error message that names the variable and gives a working `export` line; or
  - (Path B) succeeds with a default value baked into the tag (e.g. `dryrun`); or
  - (Path C) walks the participant through setting the variable before reaching the `kmcp build` line.
- [ ] On the workshop slice (or simulated by exporting the variable before running the tour), Beat 1 proceeds with the participant's actual login as before.
- [ ] `uc4/tour.json` Beat 1 carries the chosen mechanism. No reliance on shell behaviour the workshop slice does not guarantee.
- [ ] `uc4/README.md` Author notes section explains which path was chosen and why; lists the slice-vs-local behaviour explicitly.
- [ ] `make validate-tours` green over all 5 tours.
- [ ] No em dashes in any new prose.

---

## Technical Notes

- For Path A, the defensive check pattern: a single `[ -n "$WORKSHOP_PARTICIPANT_LOGIN" ] || { echo "WORKSHOP_PARTICIPANT_LOGIN is unset. Run: export WORKSHOP_PARTICIPANT_LOGIN=$(whoami) (or any non-empty string for dryrun)."; exit 1; }` as the first command of the step, then the actual `kmcp build` on the next.
- For Path B, the inline form `registry.workshop.qcs.ovh/${WORKSHOP_PARTICIPANT_LOGIN:-dryrun}/artemis-bulb-mcp:v0.1.0` works in bash, but the `${VAR:-default}` syntax should be tested with the way the workshop-tour extension forwards commands to the terminal (most shells handle it; verify on macOS zsh and bash).
- Path C is the most pedagogical but adds a step; weight against STORY-042's density goal.
- The chosen path should not require any change to `workshop-infrastructure`. The slice's env-var injection stays as it is; this story just makes the tour resilient when the injection is absent.

---

## Dependencies

**Prerequisite stories:** none. This story unblocks UC4 itself.
**Blocks:** any UC4 walk-through. The Sprint 6 freeze tag for the workshop should not ship until this story closes.
**External:** none beyond `kmcp` v0.1.x.

---

## Definition of Done

- [ ] All AC satisfied.
- [ ] Manual cold-cluster verification on kind: `unset WORKSHOP_PARTICIPANT_LOGIN; ./scripts/reset-kind.sh; <walk UC0 to UC4 Beat 1>` produces the expected behaviour.
- [ ] `make validate-tours` green locally.
- [ ] PR cross-reviewed by Clément.
- [ ] `docs/sprint-status.yaml` updated: STORY-043 → `completed`.

---

## Story Points Breakdown

- Path decision + Beat 1 implementation: 1 pt
- Author notes + verification on kind: 0.5 pt
- Cross-review + sprint-status close: 0.5 pt
- **Total: 2 pts**

---

## Progress Tracking

**Status History:**
- 2026-05-05: Created (Scrum Master, /create-story, post dry-run, BLOCKER).

**Actual Effort:** TBD.
