# kagent-workshop-scenarios

Pedagogical artefacts for the DevOpsDays 2026 kagent workshop: four reproducible Kubernetes incident scenarios diagnosed by [kagent](https://kagent.dev) agents, each shipped with a [`workshop-tour`](docs/prd-kagent-workshop-scenarios-2026-04-27.md#fr-002-tour-json-conforms-to-the-workshop-tour-schema) tutorial. UC4 adds a custom MCP wrapping the sibling `light-manager` API so the multi-agent coordinator's diagnosis is visible as bulb colour changes — the Artemis-themed payoff of the workshop.

> **Workshop date:** 2026-05-20 · **Authors:** Clément Raussin, Quentin Rodic.

## Overview

This repo ships **build-time artefacts**. Their runtime composition (image build, manifest application onto a participant's vCluster slice, tour distribution into the participant's VS Code server, kubeconfig + LLM credential injection) is owned by the sibling `workshop-infrastructure` project and is out of scope here.

Each use case (`uc1/` → `uc4/`) is a self-contained scenario package:

- **K8s manifests** — a deliberately broken Deployment, deterministic on apply (NFR-003 — see `docs/architecture-kagent-workshop-scenarios-2026-04-28.md`).
- **kagent CRDs** — `Agent` + `Tool` (+ `ToolServer`, `ModelConfig`) at v0.9.0, scoped to the diagnosis.
- **`tour.json`** — validated against the vendored `workshop-tour` schema (see `schemas/README.md`).
- **Per-UC README** — bug, expected agent diagnosis, Artemis narrative.

Shared artefacts live under `apps/` (FastAPI variants), `infra/observability/` (Prom + Grafana for UC3/UC4), `mcp/` (UC4 custom MCP), `schemas/` (vendored), and `scripts/` (author dev loop).

The full functional and non-functional contract lives in `docs/prd-kagent-workshop-scenarios-2026-04-27.md`; the architecture decisions in `docs/architecture-kagent-workshop-scenarios-2026-04-28.md`.

## Prerequisites

**For workshop participants** (provisioned upstream by `workshop-infrastructure`, listed here for reference only):

- A per-participant **vCluster slice** on the workshop's shared AKS cluster, Kubernetes ≥ 1.28.
- A per-participant **VS Code server** with the `workshop-tour` extension preinstalled and the UC's `tour.json` already placed.
- `kubectl` and the `kagent` CLI on `PATH`, kubeconfig pre-wired to the vCluster slice.
- LLM provider credentials injected into the cluster as Secrets referenced by each UC's `ModelConfig` CRD.

The slice itself is pre-provisioned by `workshop-infrastructure` (vCluster, VS Code server, CLIs, LLM credentials). Participants run **UC0 — Install kagent** as their first tour to bring the kagent runtime online on their slice; UC1 → UC4 follow once that completes.

## Install kagent

This repo pins **kagent v0.9.0** (NFR-005). All `Agent`, `Tool`, `ToolServer`, and `ModelConfig` CRDs target this version exactly.

- Upstream release: <https://github.com/kagent-dev/kagent/releases/tag/v0.9.0>
- Upstream docs: <https://kagent.dev>

Install onto a vanilla cluster with Helm (reference command — `workshop-infrastructure` runs an equivalent of this on every participant vCluster, so participants do not need to run it):

```bash
helm repo add kagent https://kagent-dev.github.io/kagent
helm install kagent kagent/kagent --version 0.9.0 --namespace kagent --create-namespace
```

Authors running the local dev loop (see below) should pin the same version.

## Use cases

| UC  | Scenario                                       | Path                       | Tour ID                          |
| --- | ---------------------------------------------- | -------------------------- | -------------------------------- |
| UC0 | Install kagent (run-this-first prep tour)      | [`uc0/`](uc0/README.md)    | `kagent-uc0-install`             |
| UC1 | ImagePullBackOff                               | [`uc1/`](uc1/README.md)    | `kagent-uc1-imagepullbackoff`    |
| UC2 | Pod Pending (taint mismatch)                   | [`uc2/`](uc2/README.md)    | `kagent-uc2-pod-pending`         |
| UC3 | OOMKilled + on-the-fly Grafana dashboard       | [`uc3/`](uc3/README.md)    | `kagent-uc3-oom-killed`          |
| UC4 | Multi-agent coordinator (a2a) + custom MCP     | [`uc4/`](uc4/README.md)    | `kagent-uc4-coordinator`         |

**Suggested ordering:** UC0 → UC1 → UC2 → UC3 → UC4. UC0 installs kagent on the participant's slice; UC1 establishes the single-agent / single-source pattern; UC2 adds multi-tool correlation; UC3 brings external observability; UC4 is the multi-agent climax with the custom MCP and the visible bulb-colour payoff. UC0 is a [prep tour](docs/tour-content-conventions.md#prep-tours-uc0-exception) — flat 3 steps, no diagnostic agent — while UC1–UC4 follow the [4-beat mission framing](docs/tour-content-conventions.md#the-4-beats).

## Artemis lore index

The four scenarios are framed as a single narrative arc on a fictional Artemis lunar mission. The lore is light by design: it gives every Kubernetes resource a thematic name and gives the tour copy a thread to pull on, without standing between the participant and the diagnostic content.

| UC  | Narrative beat                                                                            | Anchor resource(s)                       |
| --- | ----------------------------------------------------------------------------------------- | ---------------------------------------- |
| UC1 | Mission Control's roster fails to come online — a deploy targets an image that never shipped. | `mission-control` Deployment             |
| UC2 | A new mission-control replica refuses to land on the only available node.                 | `mission-control` Deployment + node taint |
| UC3 | Lunar rover telemetry leaks memory until the kernel reaps it.                             | `lunar-rover-telemetry` Deployment       |
| UC4 | A mission coordinator fans out diagnostics across the three sub-incidents and signals each verdict on a bulb. | `artemis-mission-coordinator` Agent + bulbs |

The full naming vocabulary (namespaces, Deployments, kagent Agent CRDs, ToolServer, ModelConfig, FR-017 bulb-colour mapping) is locked in [`docs/artemis-naming.md`](docs/artemis-naming.md). All Kubernetes resource names under `uc<N>/` follow that vocabulary (FR-005 AC).

## Tour distribution (informational only)

This repo authors and validates `uc<N>/tour.json` files. It does **not** distribute them.

At workshop time, `workshop-infrastructure` reads each `uc<N>/tour.json` from this repo and copies it into the corresponding participant's VS Code server, where the [`workshop-tour`](https://github.com/kagent-dev/workshop-tour) extension reads it from `.workshop-tour/tour.json` and renders the steps.

Consequences for authors:

- **Self-contained steps (NFR-010)** — every step's `commands` and `fileEdits` must run as-is in the participant's VS Code server terminal, with `kubectl` / `kagent` on `PATH` and the kubeconfig pre-wired. No "first set X" preconditions outside what the step itself does.
- **Schema conformance (FR-002)** — every `tour.json` validates against `schemas/workshop-tour.schema.json` (see `schemas/README.md`). CI runs `make validate-tours` on every PR.
- **No commits during a session** — once `workshop-infrastructure` distributes a tour, this repo is not in the loop. Hot-fixing during the workshop is not a path.

## For workshop authors only

> **Author-only zone.** Everything below this line is for the two repo authors. Workshop participants do not need any of it.

### Local dev loop

The author dev loop is a kind cluster + per-UC `make` targets, intentionally separate from the workshop runtime (kind survives only as the author tool — participants run on vCluster).

**Prerequisites** (validated by `make preflight`): `docker` (daemon reachable), `kubectl`, `kind`, `helm`, and the `kagent` CLI on `PATH`. The kagent CRDs are installed by `make kagent-install`.

**One-shot bring-up of UC&lt;N&gt;** (idempotent — re-runnable on a hot cluster):

```bash
make preflight        # validates toolchain + (if cluster reachable) kagent CRDs
make uc1-up           # kind-up → kagent-install (v0.9.0) → kubectl apply uc1/manifests + uc1/agents
# … exercise the tour …
make uc1-down         # delete uc1 resources, keep cluster up
```

**Targets:**

- `make preflight` — required-tool + kagent-CRD presence check, exits non-zero with actionable messages.
- `make kind-up` / `make kind-down` — create / delete the local kind cluster (`kagent-workshop`). Config: `scripts/kind-config.yaml`.
- `make kagent-install` — `helm upgrade --install` of kagent **v0.9.0** into the current context (idempotent).
- `make uc<N>-up` (N ∈ 1..4) — chains `kind-up` → `kagent-install` → applies `uc<N>/manifests/` and `uc<N>/agents/`. No-ops gracefully when those dirs are still empty (the per-UC content lands in M2–M4).
- `make uc<N>-down` — deletes the UC's resources but leaves the kind cluster up so the next `uc<M>-up` is fast. `make kind-down` is the hard reset (use when NFR-003 cold-deploy reproduction is what you're testing).

**Previewing tours locally (before launching VS Code):**

The `workshop-tour` VS Code extension reads tour files from `.workshop-tour/` in the open workspace, but the repo authors them under `uc<N>/tour.json`. **Before opening this workspace in VS Code**, run:

```bash
./scripts/sync-workshop-tour.sh
```

The script copies every `uc<N>/tour.json` into `.workshop-tour/uc<N>-tour.json` (sorted by UC), clearing any stale `.workshop-tour/*.json` entries first. Re-run it after every tour edit before reloading VS Code so the extension picks up the latest content. (Workshop-time distribution is owned by `workshop-infrastructure` — see *Tour distribution* above; this script is the author-local equivalent.)

**Lint targets** (run before opening a PR):

- `make validate-tours` — JSON-schema-validate every `uc<N>/tour.json` against `schemas/workshop-tour.schema.json`.
- `make lint-manifests` — `kubectl apply --dry-run=client` over every `uc<N>/manifests/`. Wired into CI alongside `validate-tours`.
- `make lint-agents` — validate every `uc<N>/agents/*.yaml` against the vendored kagent v0.9.0 CRDs. *Parked: STORY-003 was deferred — until it lands, agent CRDs are validated end-to-end by `make uc<N>-up` apply against a real cluster.*

### Repo layout

```
apps/                  FastAPI app sources + variants (FR-007 — STORY-008/009/010)
uc1/  uc2/  uc3/  uc4/ Per-UC scenario packages (FR-001)
infra/observability/   Prom + Grafana manifests (UC3, UC4 — STORY-018)
mcp/                   UC4 custom MCP source + packaging (FR-016 — STORY-022/023)
schemas/               Vendored workshop-tour schema (+ kagent CRDs when STORY-003 lands)
scripts/               Author dev loop helpers (FR-004 — STORY-005)
docs/                  PRD, architecture, sprint plan, conventions
Makefile               Author + CI Make targets
```

The directory layout is the contract: `uc<N>/` belongs to exactly one author (NFR-008); shared dirs require both authors' review. Full ownership map enforced by `CODEOWNERS` at the workshop repo root.

### Conventions

- **Per-UC ownership boundary (NFR-008)** — `CODEOWNERS` (at the workshop repo root, `../CODEOWNERS`) enforces that `uc<N>/` PRs require the UC's owner.
- **Tour content convention (FR-006)** — every tour follows the CLI baseline → "Now ask the agent" → contrast recap structure. Documented in [`docs/tour-content-conventions.md`](docs/tour-content-conventions.md).
- **Artemis naming (FR-005)** — every K8s resource name draws from [`docs/artemis-naming.md`](docs/artemis-naming.md).
- **No `:latest` (NFR-005)** — every image and CRD reference pins a version.
- **No secrets in repo (NFR-011)** — `.gitignore` covers `.env*` and `kubeconfig*`; `gitleaks` runs in CI on every PR.

### Where the work is tracked

- Functional + non-functional requirements: `docs/prd-kagent-workshop-scenarios-2026-04-27.md`
- Architecture: `docs/architecture-kagent-workshop-scenarios-2026-04-28.md`
- Sprint plan (M1 → M5): `docs/sprint-plan-kagent-workshop-scenarios-2026-04-28.md`
- Live sprint status: `docs/sprint-status.yaml`
- Product brief: `docs/product-brief-kagent-workshop-scenarios-2026-04-27.md`

---

This repo is the source-of-artefacts side of a three-repo workshop:

- `kagent-workshop-scenarios` (this repo) — broken apps, agent CRDs, tours, custom MCP.
- `light-manager` (sibling, `../light-manager`) — multi-tenant bulb-state service the UC4 MCP wraps.
- `workshop-tour` VS Code extension (`../../workshop-vscode-ext/workshop-tour`) — owns the `tour.json` schema this repo conforms to.
- `workshop-infrastructure` (sibling) — image builds, vCluster slicing, tour + kubeconfig + credential distribution.
