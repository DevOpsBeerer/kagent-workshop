# STORY-022: KMCP-Tools-generated MCP source + tenancy guard + Pydantic shape tests

**Epic:** EPIC-004 (UC4 — Multi-agent coordinator + custom MCP)
**FRs:** FR-016 (custom MCP wrapping the light-manager OpenAPI)
**NFRs:** NFR-012 (per-participant tenancy on the UC4 MCP)
**Priority:** Must Have
**Story Points:** 5
**Status:** Completed (2026-05-08)
**Assigned To:** Quentin Rodic
**Created:** 2026-05-08
**Sprint:** 3 (M3, 2026-05-11 → 2026-05-13) — implemented out-of-band on 2026-05-08, alongside the four EPIC-003 swaps. **First STORY-022 onwards is on Quentin's original slate** (no ownership swap).

---

## User Story

As a **UC4 coordinator agent** running inside a per-participant vCluster,
I want **a hardened, tenancy-pinned MCP that proxies the participant's slice of `light-manager`'s bulb API** (`list_bulbs(user)` + `update_bulb(user, slot, r, g, b)`),
So that **the coordinator's verdict-to-bulb-color mapping (FR-017: green / red / amber on slots 1/2/3) lands on the right participant's bulbs *by topology*, not by prompt discipline — a misprompted coordinator in vCluster A literally cannot mutate participant B's bulbs because the MCP in vCluster A doesn't know B's login (NFR-012).**

---

## Description

### Background

UC4's coordinator (`artemis-mission-coordinator`, lands in STORY-025) delegates to the UC1/UC2/UC3 specialist agents and writes its verdict back to the participant's three status bulbs (slot 1 → UC1 verdict, slot 2 → UC2, slot 3 → UC3 — FR-017). The bulbs themselves live in the workshop-cluster-shared `light-manager` service (sibling repo, multi-tenant by `?user=<login>` query param).

NFR-012 hard-prohibits cross-participant bulb writes. The architecture choice (§Component 6, §Risk register) is **per-vCluster MCP topology**: each participant's vCluster runs its own MCP pod with `WORKSHOP_PARTICIPANT_LOGIN` pinned at deploy time; every tool call's `user=` arg is checked against that env var; mismatches are rejected. Cross-participant bleed becomes impossible **by topology** — vCluster A's MCP never holds participant B's login, so even a misprompted coordinator can't construct a valid call against B.

This story ships the source: KMCP-Tools-scaffolded FastMCP-Python project under `mcp/`, two tools (`list_bulbs` + `update_bulb`), Pydantic shape shadows of `BulbRead` / `BulbUpdate`, the tenancy guard, and unit tests. STORY-023 ships the packaging (Dockerfile + manifests + ToolServer CRD).

### Scope

**In scope:**
- KMCP-Tools `kmcp init python mcp` scaffold under `scenarios/mcp/`. The CLI generates `kmcp.yaml` (declarative config), `pyproject.toml`, `Dockerfile` (consumed by STORY-023), `src/main.py` (entry), `src/core/{server,utils}.py` (FastMCP runtime + dynamic tool loading), `src/tools/` (one file per tool), and `tests/` (test_server / test_discovery / test_tools).
- `src/tools/list_bulbs.py` — `list_bulbs(user: str) -> list[BulbRead]`. Proxies `GET /api/bulbs?user=<user>`.
- `src/tools/update_bulb.py` — `update_bulb(user: str, slot: int, r: int, g: int, b: int) -> BulbRead`. Proxies `PUT /api/bulbs/{slot}?user=<user>` with body `BulbUpdate`.
- Shared helpers under `src/core/`:
  - `src/core/models.py` — Pydantic shapes that *shadow* light-manager's `BulbRead` / `BulbUpdate` (slot int 1–3 enforced via Field; r/g/b int 0–255 via Field; vendored shape, not imported from sibling repo because `mcp/` ships as a standalone container).
  - `src/core/tenancy.py` — `enforce_tenancy(user: str)` — reads `WORKSHOP_PARTICIPANT_LOGIN` env, raises `TenancyMismatchError` if `user != WORKSHOP_PARTICIPANT_LOGIN`, raises `RuntimeError` if env unset (fail-closed: an unset login means the MCP can't safely accept any call).
  - `src/core/lightmanager_client.py` — thin httpx-based client. Reads `LIGHT_MANAGER_URL` env (e.g. `http://light-manager.light-manager.svc.cluster.local:8000`). Exposes `get_bulbs(user)` and `put_bulb(user, slot, payload)` returning raw JSON dicts; the tool layer wraps these with the Pydantic shapes.
- Tests:
  - `tests/test_models.py` — Pydantic shape validation. `BulbRead` round-trip; `BulbUpdate` ge/le bounds (r/g/b ∈ [0,255]); slot validation as a separate utility (or as part of `update_bulb`'s Pydantic input).
  - `tests/test_tenancy.py` — guard behaviour. Match (allowed) / mismatch (raises) / env-unset (fail-closed raises).
  - `tests/test_list_bulbs.py` — happy path (mocked light-manager response), tenancy mismatch (raises before any HTTP call).
  - `tests/test_update_bulb.py` — happy path, slot validation (1/2/3 OK; 0 / 4 / -1 reject), RGB validation (0/255 OK; -1 / 256 reject), tenancy mismatch (raises before any HTTP call).
- `pyproject.toml` adds `httpx` as a runtime dep (KMCP scaffolds without it; we need it for the light-manager client).
- `kmcp.yaml` `name:` field renamed from generic `mcp` → `artemis-bulb-mcp` per `docs/artemis-naming.md` L72.

**Out of scope:**
- `mcp/Dockerfile` — kmcp scaffolds it, but final image-layer optimisation + CI publishing belongs to STORY-023.
- `mcp/manifests/` (Deployment + Service + ToolServer CRD) — STORY-023.
- `apps/light-manager/` — sibling repo, not in this directory tree (per memory).
- Integration tests against a running light-manager — would require either a TestClient bind or a live cluster cycle. Out of scope for STORY-022; STORY-027 / STORY-028 (M5 dry-run) covers the live integration.
- The coordinator agent (STORY-025) — UC4 wiring; consumes this MCP via the ToolServer STORY-023 ships.
- `WORKSHOP_PARTICIPANT_LOGIN` value injection — workshop-infrastructure's responsibility per NFR-011 (no secrets in repo). The MCP only consumes the env var; it doesn't ship a default.

### User flow (the design lives this)

1. `workshop-infrastructure` builds the image (STORY-023's Dockerfile), deploys it into each participant's vCluster (STORY-023's manifests), and injects `WORKSHOP_PARTICIPANT_LOGIN=<participant-login>` + `LIGHT_MANAGER_URL=http://light-manager.…svc.cluster.local:8000` via Deployment env.
2. The MCP boots; FastMCP exposes `list_bulbs` + `update_bulb` over Streamable HTTP at `/mcp`.
3. UC4's coordinator (STORY-025) calls `update_bulb(user="${WORKSHOP_PARTICIPANT_LOGIN}", slot=1, r=255, g=0, b=0)` — the coordinator interpolates its own pinned login at deploy time, the MCP checks it against *its* pinned login (same value, by construction), accepts.
4. A misprompted coordinator that calls `update_bulb(user="someone-else", …)` is rejected by the tenancy guard *before* any HTTP request to light-manager. The coordinator gets an MCP error; light-manager never sees the request.

---

## Acceptance Criteria

(Mirrors sprint plan AC + KMCP-specific shape.)

- [ ] `mcp/` contains the KMCP-Tools-scaffolded project: `kmcp.yaml` (with `framework: fastmcp-python`), `pyproject.toml`, `Dockerfile`, `src/main.py`, `src/core/`, `src/tools/`, `tests/`. Generated by `kmcp init python mcp` (kmcp v0.2.8 at authoring time).
- [ ] `kmcp.yaml.name == "artemis-bulb-mcp"` per `docs/artemis-naming.md` L72.
- [ ] `src/tools/list_bulbs.py` defines `list_bulbs(user: str) -> list[BulbRead]` decorated with `@mcp.tool(annotations=ToolAnnotations(title="List bulbs", readOnlyHint=True))`. Proxies `GET <LIGHT_MANAGER_URL>/api/bulbs?user=<user>` after passing the tenancy guard.
- [ ] `src/tools/update_bulb.py` defines `update_bulb(user: str, slot: int, r: int, g: int, b: int) -> BulbRead` decorated with `@mcp.tool(annotations=ToolAnnotations(title="Update bulb"))` (default `readOnlyHint=False`). Validates slot ∈ {1, 2, 3} and constructs `BulbUpdate` (which validates r/g/b ∈ [0,255] via Pydantic `Field(ge=0, le=255)`). Proxies `PUT <LIGHT_MANAGER_URL>/api/bulbs/{slot}?user=<user>` with the validated body.
- [ ] **Tenancy guard** — `src/core/tenancy.py` defines `enforce_tenancy(user: str)`:
  - Raises `RuntimeError("WORKSHOP_PARTICIPANT_LOGIN not set")` if env is unset / empty (fail-closed).
  - Raises `TenancyMismatchError(user, expected)` if `user != $WORKSHOP_PARTICIPANT_LOGIN`. The error message names both the call's `user` arg and the pinned login, so the coordinator's MCP-error response is debuggable.
  - **No hard-coded user value anywhere.** A `grep -n 'WORKSHOP_PARTICIPANT_LOGIN' src/` finds the env-var reference in `src/core/tenancy.py` only; `grep -rn '"alice"\|"operator-' src/` returns zero matches in committed source.
  - The guard runs **before** any HTTP call to light-manager — verified by tests that mock httpx and assert the mock is never reached on tenancy-mismatch paths.
- [ ] **Pydantic shadows** — `src/core/models.py` defines `BulbRead` (fields: `slot: int`, `r: int`, `g: int`, `b: int`, `updated_at: datetime`) and `BulbUpdate` (fields: `r: int = Field(ge=0, le=255)`, same for g/b). Shapes match `light-manager/backend/app/routers/bulbs.py:17–30` byte-equivalent (vendored; not imported from sibling).
- [ ] **Unit tests** (per sprint plan AC):
  - [ ] **Happy path** — `list_bulbs` and `update_bulb` succeed when `user == WORKSHOP_PARTICIPANT_LOGIN` and the mocked HTTP layer returns valid JSON. The tool function's return value is a `BulbRead` (or `list[BulbRead]`) that round-trips against the Pydantic shape.
  - [ ] **Slot validation** — `update_bulb` rejects slot ∈ {0, 4, -1} (raises `ValueError` or returns a structured MCP error). Slot ∈ {1, 2, 3} accepted.
  - [ ] **RGB validation** — `update_bulb` rejects r/g/b values outside [0, 255] (Pydantic `ValidationError`). Boundary values 0 and 255 accepted.
  - [ ] **Tenancy mismatch** — both tools raise `TenancyMismatchError` when called with `user != WORKSHOP_PARTICIPANT_LOGIN`. The mocked httpx is **not** invoked in the mismatch path (verified via `mock.assert_not_called()`).
- [ ] **Test runner**: `pytest tests/` from `mcp/` is green. Tests run against the kmcp-scaffolded `tests/` plus the new files this story adds. The kmcp-default `tests/test_tools.py` and `tests/test_server.py` reference the `echo` example tool — STORY-022 deletes the `echo` tool (UC4 has no use for it) and updates the auto-generated tests accordingly so the suite stays green.
- [ ] `pyproject.toml` adds `httpx` as a runtime dependency (KMCP scaffolds without it). Version pinned to a current 0.27.x or 0.28.x at authoring time.
- [ ] No secrets in source (`gitleaks` clean — STORY-011's CI hook).

---

## Technical Notes

### KMCP-Tools — what it actually does

`kmcp init python <name>` (v0.2.8) scaffolds a FastMCP-Python project: declarative config in `kmcp.yaml`, dynamic tool discovery via `src/core/server.py:DynamicMCPServer` that imports every `*.py` under `src/tools/` at boot and triggers each module's `@mcp.tool()` decorators. New tools come in via `kmcp add-tool <name> --description "..."` which writes a `src/tools/<name>.py` template + a `tests/test_tools.py` entry. Build (`kmcp build`) wraps Docker; deploy (`kmcp deploy`) wraps `kubectl apply`; run (`kmcp run`) wraps the FastMCP entry. STORY-022 uses `init` + `add-tool`; build / deploy belong to STORY-023.

The dynamic tool discovery means each tool file is independent — the only shared state is `src/core/server.py:mcp` (the `FastMCP` instance) and any helpers under `src/core/`. STORY-022 puts the tenancy guard, the Pydantic shapes, and the light-manager HTTP client in `src/core/` so both tool files share them without circular imports.

### Why vendor the Pydantic shapes rather than import from `light-manager`

The MCP ships as a standalone Docker image (STORY-023). `light-manager` is a sibling repo, not a Python package the MCP can `pip install`. Three options were considered:

1. **Vendor the shapes** — copy `BulbRead` / `BulbUpdate` definitions byte-equivalent into `src/core/models.py`, keep them in sync manually.
2. **Publish `light-manager-models` as a PyPI package** — would let MCP `pip install light-manager-models`. Out of scope (sibling repo doesn't currently publish).
3. **Skip Pydantic shapes, hand-roll dict validation** — saves the vendoring duplication but loses the static guarantees Pydantic gives us.

**Decision: vendor.** The shapes are tiny (5 fields + 3 fields), the duplication is mechanical, and the MCP layer's *contract* is what `light-manager` exposes today — if the sibling changes its shape, the MCP needs to update too, which is exactly the same coordination this story already implies. A PR-time check (`grep`-based) for shape drift is sufficient enforcement; codifying it in CI is a Sprint-3-retro candidate, not in scope here.

The vendored shapes carry a comment naming the source file + the line numbers + the date they were vendored, so a future author can re-sync without ambiguity.

### Tenancy guard — why fail-closed on unset env

If `WORKSHOP_PARTICIPANT_LOGIN` is unset, the guard raises `RuntimeError`. Two reasons:

1. **NFR-012 contract.** Without a pinned login the MCP cannot enforce *anything*. Letting calls through with no guard would silently disable tenancy, which is the worst possible failure mode (security regression in production-like systems gets caught by CI; here it would only manifest in a workshop incident).
2. **Deploy-time validation.** STORY-023's manifests inject the env via Deployment `env:`. If workshop-infrastructure mis-configures the injection, the MCP pod will boot and immediately error on every tool call — visible in pod logs within seconds. Fail-open would silently produce a working but tenancy-broken MCP.

The error message includes a hint: "STORY-022 fail-closed: WORKSHOP_PARTICIPANT_LOGIN must be set at deploy time per NFR-012; check the Deployment's env: section". Future-you debugging a misconfigured vCluster sees this in the agent's MCP-error response.

### What STORY-022 deliberately does **not** modify

- `apps/`, `uc1/`, `uc2/`, `uc3/`, `uc4/`, `infra/`, `Makefile`, `schemas/`, `docs/architecture-…md`, `docs/tour-content-conventions.md` — no impact.
- `docs/artemis-naming.md` — already lists `artemis-bulb-mcp` (L72 row) for the `Service in artemis-mcp namespace, MCP HTTP/SSE port`. STORY-022 just consumes the name.
- The kmcp-default `echo` tool (`src/tools/echo.py`) is deleted as part of *Scope* — but the kmcp-generated `tests/test_tools.py` + `tests/test_server.py` reference it. STORY-022 updates those tests to drop the echo-specific assertions; that's not "modifying out-of-scope files", it's "the kmcp scaffolding's example artefact is being replaced by the actual UC4 tools".

---

## Dependencies

**Prerequisite stories (all completed):**
- STORY-001 (repo skeleton).
- STORY-006 (Artemis naming) — provides the `artemis-bulb-mcp` name.

**External dependencies:**
- `kmcp` CLI v0.2.8 — installed at `/usr/local/bin/kmcp` on the dev environment.
- `light-manager` sibling repo at `/home/qrodic/workspace/intern/DevOpsDays/2026/kagent-workshop/light-manager` — read-only reference for shape vendoring.
- `httpx` 0.27.x or 0.28.x — added to `pyproject.toml`.

**Blocked stories:**
- STORY-023 (MCP packaging — Dockerfile + manifests + ToolServer CRD) — depends on this story's `mcp/` source layout.
- STORY-024 onwards (UC4 manifests + coordinator) — UC4 references the bulb MCP via `ToolServer` (STORY-023).

---

## Definition of Done

- [ ] All AC ticked.
- [ ] `pytest tests/` from `mcp/` is green (kmcp-default tests + new tests = full suite).
- [ ] `pyproject.toml` adds `httpx`; `uv sync` (or equivalent) resolves the lock.
- [ ] STORY-022 entry in `docs/sprint-status.yaml` updated to `status: completed` with `completion_date`, `actual_points`, and a one-line note that this is the **first** story of M3 on Quentin's original slate (no swap context — contrasts with STORY-018/019/020/021).
- [ ] No `gitleaks`-flagged secrets.
- [ ] Merged to `main`.

---

## Story Points Breakdown

- **KMCP-Tools scaffold (init + add-tool x2 + delete echo + rename to artemis-bulb-mcp):** 0.5 points. Mostly CLI invocations.
- **Pydantic shape vendoring (`src/core/models.py`):** 0.5 points. Direct copy + comment block citing source.
- **Tenancy guard (`src/core/tenancy.py`):** 0.5 points. ~20 lines of code with a custom exception class and one env read.
- **Light-manager HTTP client (`src/core/lightmanager_client.py`):** 1 point. httpx-based, two methods (`get_bulbs`, `put_bulb`), env-driven URL.
- **Tool implementations (list_bulbs, update_bulb):** 1 point. Each is ~20 lines: tenancy guard call, slot/payload validation, HTTP call, Pydantic round-trip.
- **Unit tests (4 test files, ~12 test cases total):** 1.5 points. Tenancy tests (4 cases — match, mismatch, env unset, env empty), shape tests (4 cases — RGB bounds, slot validity, datetime round-trip, missing fields), happy-path tests (2 cases — list + update mocked), failure-path tests (2 cases — slot reject, RGB reject).
- **Total:** 5 points. Matches sprint-plan estimate.

**Rationale:** Sprint-plan estimate was 5 pts. Most of the work is mechanical (KMCP scaffolds the runtime; we add ~150 lines of tool/guard/client code). The tests carry weight because they are the AC-named deliverable: NFR-012 isn't credible without the tenancy-mismatch test, and FR-016's "shadows BulbRead/BulbUpdate" claim isn't credible without the shape tests.

---

## Additional Notes

- **Why FastMCP and not raw `mcp` SDK.** KMCP's `kmcp init python` defaults to FastMCP, which gives us the `@mcp.tool(...)` decorator + ToolAnnotations + auto-discovery. Going lower-level (raw `mcp.server.lowlevel`) would buy us nothing — the tool surface is two functions, the runtime is single-tenant per pod, and the streaming/error semantics FastMCP wraps are exactly what kagent's `RemoteMCPServer` expects. Decision aligns with the "no reinvention" constraint that gave us `promql-agent` / `observability-agent` instead of custom Prom/Graf agents in STORY-019.
- **Why a TenancyMismatchError class instead of just `PermissionError`.** Custom exception lets the test assert against the *type* (not just the message), and lets future tooling (e.g. Sentry breadcrumb tagging at STORY-028 dry-run time) distinguish tenancy violations from generic permission errors. ~3 lines of code.
- **Why no integration test against a running light-manager.** STORY-022's AC don't require it (they say "unit tests cover happy path, slot validation (1–3), RGB validation (0–255), tenancy mismatch"). STORY-027 (UC4 README + cross-author repro) brings up the full UC4 stack including a per-vCluster light-manager Service; that's the natural integration test point. Premature integration here would couple STORY-022 to STORY-024+ scheduling.
- **Sprint-3 retro candidate:** the vendored Pydantic shapes drift if `light-manager` changes its shape. A small CI hook (grep + diff against the source file in the sibling repo) would catch this at PR time. Out of scope per the project's "don't design for hypothetical future requirements" default; flagging here for future consideration.

---

## Progress Tracking

**Status History:**
- 2026-05-08: Created (Developer / Quentin, /bmad:dev-story).
- 2026-05-08: Started — first story of M3 on Quentin's original slate (no swap).
- 2026-05-08: Implemented + tests passing (61/61).

**Actual Effort:** 5 points (matched estimate).

### Implementation Notes (2026-05-08)

#### Files added (10)
- `mcp/kmcp.yaml` — KMCP declarative config; `name: artemis-bulb-mcp`, `framework: fastmcp-python`, `version: 0.1.0`. Generated by `kmcp init python mcp` (kmcp v0.2.8) then renamed for artemis-naming consistency.
- `mcp/pyproject.toml` — kmcp-generated; renamed project to `artemis-bulb-mcp`; added `httpx==0.28.1` runtime dep (for the light-manager client).
- `mcp/Dockerfile` — kmcp-generated; consumed by STORY-023 (the packaging story); not modified here.
- `mcp/.gitignore`, `mcp/.env.example`, `mcp/.python-version`, `mcp/README.md` — kmcp-generated boilerplate; left as-is.
- `mcp/src/main.py` — kmcp-generated entry point (stdio + http transport modes via argparse). Not modified.
- `mcp/src/core/server.py` — kmcp-generated `DynamicMCPServer` with auto-discovery of `src/tools/*.py` files. Not modified.
- `mcp/src/core/utils.py` — kmcp-generated config / env helpers. Not modified.
- `mcp/src/core/__init__.py` — kmcp-generated package init.
- `mcp/src/core/models.py` — **NEW**, ~30 lines. Vendored `BulbRead`, `BulbUpdate`, `VALID_SLOTS` from `light-manager/backend/app/routers/bulbs.py:17-30`. Comment block names the source file + line numbers + vendoring date so a future re-sync is unambiguous.
- `mcp/src/core/tenancy.py` — **NEW**, ~45 lines. `WORKSHOP_PARTICIPANT_LOGIN_ENV` constant; `TenancyMismatchError(PermissionError)` class with `.user` and `.expected` attributes for debuggability; `enforce_tenancy(user)` function with fail-closed posture (RuntimeError on unset/empty env, TenancyMismatchError on user-vs-expected mismatch).
- `mcp/src/core/lightmanager_client.py` — **NEW**, ~50 lines. httpx-based, env-driven `LIGHT_MANAGER_URL`. Two functions: `get_bulbs(user)` and `put_bulb(user, slot, payload)`. Trusts caller for tenancy (the guard runs upstream); does no caching, retry, or auth.
- `mcp/src/tools/list_bulbs.py` — **NEW**, ~32 lines (replaced kmcp template). `list_bulbs(user: str) -> list[BulbRead]`. `@mcp.tool(annotations=ToolAnnotations(title="List bulbs", readOnlyHint=True))`. Calls `tenancy.enforce_tenancy(user)` first, then `lightmanager_client.get_bulbs(user)`, then Pydantic-validates each item.
- `mcp/src/tools/update_bulb.py` — **NEW**, ~50 lines (replaced kmcp template). `update_bulb(user, slot, r, g, b) -> BulbRead`. `@mcp.tool(annotations=ToolAnnotations(title="Update bulb"))`. Tenancy guard, then slot ∈ VALID_SLOTS check, then `BulbUpdate(r=r, g=g, b=b)` (Pydantic validates 0–255), then HTTP call, then BulbRead validation of response.
- `mcp/src/tools/__init__.py` — kmcp auto-generates this with `from .echo import echo`; rewrote to import `list_bulbs` + `update_bulb` instead. (The dynamic loader doesn't depend on this file — it's editor convenience.)
- `mcp/tests/test_models.py` — **NEW**. BulbRead round-trip + missing-field rejection, BulbUpdate boundary acceptance (0/1/127/254/255) + out-of-range rejection (-1, 256) for r/g/b, partial-payload rejection, VALID_SLOTS == (1,2,3).
- `mcp/tests/test_tenancy.py` — **NEW**. enforce_tenancy: match (allowed), mismatch (raises TenancyMismatchError with .user / .expected attrs), unset env (RuntimeError), whitespace-only env (RuntimeError after strip), TenancyMismatchError ↔ PermissionError subclass relationship.
- `mcp/tests/test_list_bulbs.py` — **NEW**. Happy path (mocked response, 3 bulbs returned, mock called once with user). Tenancy mismatch raises before any HTTP call (mock.assert_not_called). Unset env fails closed before any HTTP call.
- `mcp/tests/test_update_bulb.py` — **NEW**. Happy path × 3 (slot 1/2/3 each). Slot rejection × 4 (slot 0/4/-1/999). RGB boundary acceptance × 6 (each channel × {0, 255}). RGB out-of-range rejection × 6 (each channel × {-1, 256}). Tenancy mismatch + unset env, both with mock.assert_not_called confirming guard ran first.

#### Files modified (3 — kmcp-generated test files updated for the bulb tools)
- `mcp/tests/test_tools.py` — rewrote: drop echo assertions, assert `list_bulbs in server.loaded_tools`, `update_bulb in server.loaded_tools`. Added autouse fixture pinning `WORKSHOP_PARTICIPANT_LOGIN` so the dynamic loader's tool imports never depend on host env state.
- `mcp/tests/test_server.py` — surgical edit: TestToolLoading now asserts `list_bulbs` and `update_bulb` in `server.loaded_tools` (was: echo). test_get_tool_config now uses bulb-tool-shaped fake config (was: echo + weather).
- `mcp/tests/test_discovery.py` — left untouched (was already echo-agnostic).

#### Test results

```text
$ uv run pytest tests/
======================== 61 passed, 1 warning in 1.03s =========================
```

Breakdown:
- `test_discovery.py`: 4 passing (kmcp-generated, generic).
- `test_server.py`: 8 passing (kmcp-generated, updated to bulb tools).
- `test_tools.py`: 4 passing (rewrote for bulb tools).
- `test_models.py`: 14 passing (new — Pydantic shape coverage).
- `test_tenancy.py`: 5 passing (new — guard coverage).
- `test_list_bulbs.py`: 3 passing (new — happy + tenancy + env).
- `test_update_bulb.py`: 23 passing (new — parametrised slot, RGB, tenancy).

The single warning is an upstream `authlib.jose` deprecation inside FastMCP's auth providers — out of scope for STORY-022 (lives in a transitive dep we don't import).

#### AC trail — "no hard-coded user="

```text
$ grep -rn '"alice"\|"operator-0\|"bob"' src/
(zero matches)

$ grep -rn 'WORKSHOP_PARTICIPANT_LOGIN' src/
src/core/tenancy.py:3:    The MCP is deployed per-vCluster, with WORKSHOP_PARTICIPANT_LOGIN injected at
src/core/tenancy.py:9:    Fail-closed posture: if WORKSHOP_PARTICIPANT_LOGIN is unset or empty, every call
src/core/tenancy.py:16:WORKSHOP_PARTICIPANT_LOGIN_ENV = "WORKSHOP_PARTICIPANT_LOGIN"
src/core/tenancy.py:36:    RuntimeError: if WORKSHOP_PARTICIPANT_LOGIN is unset / empty (fail-closed).
src/core/tenancy.py:39:    expected = os.environ.get(WORKSHOP_PARTICIPANT_LOGIN_ENV, "").strip()
src/core/tenancy.py:42:        f"STORY-022 fail-closed: {WORKSHOP_PARTICIPANT_LOGIN_ENV} must be set "
src/tools/list_bulbs.py:5:    `user=` arg matches WORKSHOP_PARTICIPANT_LOGIN.
src/tools/list_bulbs.py:25:    user: ARTEMIS operator login. Must match WORKSHOP_PARTICIPANT_LOGIN
src/tools/update_bulb.py:25:    user: ARTEMIS operator login. Must match WORKSHOP_PARTICIPANT_LOGIN
```

The only `WORKSHOP_PARTICIPANT_LOGIN` reference in `src/` is the env-variable name itself (in `core/tenancy.py`); the tool files just mention the contract in their docstrings. No hard-coded user values anywhere — FR-016 + NFR-012 satisfied.

#### Implementation finding (worth noting)

The FastMCP `@mcp.tool(...)` decorator returns the **original function** rather than a wrapper. The kmcp-generated `test_tools.py` accesses tools via `server.get_tools_sync()` which yields wrapper objects with `.fn` — but direct module-level imports give the raw function. Initial test draft used `update_bulb.fn(...)` (assumed wrapper everywhere); first pytest run failed 24/61 with `AttributeError: 'function' object has no attribute 'fn'`. Fixed by dropping `.fn` from direct-import test paths.

Worth flagging for the Sprint-3 retro: the kmcp scaffolding's example test patterns mix the two access styles silently. A short `mcp/README.md` clarification ("when iterating, `tool.fn`; when importing, just call directly") would save the next author ~30s of debugging.

#### AC sign-off

- [x] `mcp/` contains kmcp-scaffolded project (kmcp.yaml + pyproject.toml + Dockerfile + src/ + tests/).
- [x] `kmcp.yaml.name == "artemis-bulb-mcp"`.
- [x] `list_bulbs(user)` and `update_bulb(user, slot, r, g, b)` implemented; tools auto-loaded by dynamic loader; `@mcp.tool` annotations include `readOnlyHint=True` on list_bulbs.
- [x] Tools shadow `BulbRead` / `BulbUpdate` shapes — vendored from light-manager source with provenance comment.
- [x] Tenancy guard rejects every call where `user != $WORKSHOP_PARTICIPANT_LOGIN`; no hard-coded user.
- [x] Unit tests cover happy path, slot validation (1–3 plus 0/4/-1/999), RGB validation (0/255 boundary plus -1/256 rejection), tenancy mismatch.
- [x] `pytest tests/` is green: 61 passed, 0 failed.
- [x] `pyproject.toml` adds `httpx`; `uv sync` resolves clean.

No deferred AC — STORY-022 is fully self-contained at story-completion time. Live-cluster integration with light-manager (STORY-027 / STORY-028) is out of scope per the story doc *Scope* / *Out of scope* sections.

### Next

- PR opened against `main` (or merged directly per project flow). Diff: `docs/stories/STORY-022.md`, `docs/sprint-status.yaml`, full `mcp/` tree.
- STORY-023 (MCP packaging — Dockerfile final-layer optimisation + manifests + ToolServer CRD) is the natural continuation. Quentin's slate, no Clément blockers, ~3 pts per sprint plan.
- Sprint 3 now sits at **22 / 25** points landed pre-launch. Only STORY-023 remains as Sprint 3 must-do.

---

**This story was created using BMAD Method v6 - Phase 4 (Implementation Planning).**
