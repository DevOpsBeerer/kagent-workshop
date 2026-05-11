# Workshop distribution — what gets shipped to participants

The `kagent-workshop-scenarios` repo mixes participant-facing artefacts (UC tours, manifests, agents, observability bundle, MCP, Makefile, READMEs) with author-facing artefacts (BMAD audit trail, story documents, sprint plan, PRD, architecture, etc.). The **distribution** is the participant-facing subset, copied into each participant's coder workspace by workshop-infrastructure.

This document is the contract between **this repo** (produces the distribution) and **`workshop-infrastructure`** (consumes the distribution). It specifies what's in vs out, how to build it, and the pre-flight steps workshop-infrastructure runs on each participant vCluster.

For local-testing recipes (authors), see [`TESTING.md`](TESTING.md).

---

## Contents

### What ships to participants

The distribution lives under `dist/workshop/` after running [`scripts/build-workshop-distribution.sh`](scripts/build-workshop-distribution.sh). The whitelist mirrors what a participant needs to run all 5 tours (UC0 install + UC1/2/3/4 diagnostic scenarios):

| Path                                       | Purpose                                                                                                                      |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                                | Repo overview + UC index.                                                                                                    |
| `Makefile`                                 | All `make` targets the per-UC READMEs reference (`kind-up`, `kagent-install`, `uc<N>-up`/`down`, `observability-up`/`down`, `mcp-build`/`up`/`down`, `lint-manifests`, `validate-tours`, `preflight`). |
| `uc0/`                                     | kagent install prep tour (`tour.json` + `README.md`).                                                                        |
| `uc1/`                                     | UC1 scenario package: `tour.json` + `manifests/` + `agents/` + `README.md`.                                                  |
| `uc2/`                                     | UC2 scenario package (same shape).                                                                                           |
| `uc3/`                                     | UC3 scenario package (same shape).                                                                                           |
| `uc4/`                                     | UC4 scenario package (same shape) + the multi-symptom mess + the coordinator agent.                                          |
| `infra/observability/`                     | Prom + Graf bundle + kagent↔observability namespace bridge (`kagent-bridge-services.yaml`).                                  |
| `mcp/`                                     | Custom bulb MCP source (KMCP-generated) + `Dockerfile` + per-vCluster `manifests/` + `pyproject.toml` + `tests/`.            |
| `apps/`                                    | FastAPI app variants (`mission-control`, `lunar-rover-telemetry`, `_skeleton`). Images are pre-built in the apogasa registry, but the sources are useful for participants who want to read or rebuild. |
| `schemas/workshop-tour.schema.json`        | Tour-content JSON schema, for `make validate-tours`.                                                                          |
| `scripts/preflight.sh`                     | Validates participant's Docker / kubectl / kind / helm / kagent install.                                                     |
| `scripts/kind-config.yaml`                 | Local kind cluster config (for participants who want to spin up a kind cluster outside the workshop).                        |
| `scripts/sync-workshop-tour.sh`            | Copies `uc*/tour.json` into `.workshop-tour/` for the VS Code extension (author dev-loop convenience; harmless for participants). |
| `docs/artemis-naming.md`                   | Naming-convention reference. Per-UC READMEs link to it.                                                                       |
| `docs/tour-content-conventions.md`         | Tour content convention reference. Per-UC READMEs link to it.                                                                 |
| `.gitignore`                               | Reasonable default for participants who decide to `git init` their workspace.                                                |
| `.workshop-distribution-info`              | Auto-generated marker file naming the source commit/tag and the build timestamp.                                              |

### What stays out (author-facing only)

The build script excludes these explicitly:

| Excluded path / pattern                    | Why                                                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `docs/stories/`                            | BMAD story documents — full audit trail (30+ files). Author-facing; participants don't read sprint planning. |
| `docs/prd-*.md`                            | Product Requirements Document — internal planning.                                                        |
| `docs/architecture-*.md`                   | Architecture document — internal planning.                                                                |
| `docs/product-brief-*.md`                  | Product brief — internal planning.                                                                        |
| `docs/sprint-plan-*.md`                    | Sprint plan — internal planning.                                                                          |
| `docs/sprint-status.yaml`                  | Sprint status tracking — author-facing.                                                                   |
| `docs/bmm-workflow-status.yaml`            | BMAD workflow status — author-facing.                                                                     |
| `bmad/`                                    | BMAD method configuration.                                                                                |
| `CLAUDE.md`                                | Project-specific assistant instructions.                                                                  |
| `TESTING.md`                               | Author-facing local-testing landing page.                                                                 |
| `DISTRIBUTION.md`                          | This document — author + workshop-infrastructure handoff.                                                 |
| `dist/`                                    | The script's own output directory (recursive exclusion).                                                  |
| `.git/`, `.github/`, `.idea/`, `.vscode/`  | VCS + IDE config.                                                                                         |
| `__pycache__/`, `.venv/`, `.pytest_cache/`, `*.pyc`, `*.egg-info/` | Python build artefacts.                                                            |
| `node_modules/`, `*.tsbuildinfo`           | Node/TypeScript build artefacts.                                                                          |
| `.DS_Store`, `Thumbs.db`, `.gitkeep`       | OS + VCS marker files.                                                                                    |
| `.env`, `.env.*`, `kubeconfig*`, `*.kubeconfig` | Secrets / credentials (NFR-011 — never committed, never shipped).                                    |
| `.workshop-tour/`                          | Author-local preview output of `sync-workshop-tour.sh`.                                                   |

---

## Build recipe

Run from the repo root (`scenarios/`):

```bash
./scripts/build-workshop-distribution.sh
```

Output:

```
build-workshop-distribution: building distribution at /…/scenarios/dist/workshop
  + README.md
  + Makefile
  + uc0/  (recursive, excludes applied)
  + uc1/  (recursive, excludes applied)
  …

build-workshop-distribution: done.
  output:  /…/scenarios/dist/workshop
  size:    <~5-10 MB>
  files:   <~100-200>

To deploy to each participant's coder PVC, rsync this directory:
  rsync -avh --delete /…/scenarios/dist/workshop/ <coder-pvc-mount>/workshop/
```

The script is **idempotent + reproducible**: each run wipes `dist/workshop/` and rebuilds from the current working-tree state. The output includes a `.workshop-distribution-info` marker naming the source commit + tag + branch.

The script requires:
- `rsync` on `PATH` (for the directory copies with exclude patterns).
- `git` on `PATH` (optional — used only for the marker file's commit/tag/branch lookup).

---

## Workshop-infrastructure consumption recipe

Workshop-infrastructure pulls this repo at the freeze tag and runs the build script. The output rsyncs into each participant's coder PVC.

### Step 1 — pull the freeze tag

```bash
git clone https://github.com/<org>/kagent-workshop.git
cd kagent-workshop/scenarios
git checkout workshop-2026-05-20-freeze   # the M5 freeze tag
```

If a freeze tag isn't present (or a fresher state is needed), `origin/main` works too — but `main` may carry post-freeze typo fixes that haven't been re-tested.

### Step 2 — build the distribution

```bash
./scripts/build-workshop-distribution.sh
# → dist/workshop/ now contains the participant-facing artefacts
```

### Step 3 — rsync into each participant's coder PVC

For each participant `participant-NN`:

```bash
PVC_MOUNT=/data/participants/participant-NN/workspace   # or wherever the coder PVC is mounted

rsync -avh --delete dist/workshop/ "${PVC_MOUNT}/"
```

The participant's coder workspace now contains the distribution at its root. They open the VS Code workshop-tour extension and walk through UC0 → UC1 → UC2 → UC3 → UC4.

### Step 4 — workshop-infrastructure pre-flight (cluster-side)

Per [`docs/stories/STORY-029.md`](docs/stories/STORY-029.md) §Workshop-infrastructure deployment notes, two pre-flight items must run on each participant's vCluster after the standard provisioning chain:

#### 4a. UC1 agent re-apply

Defends against the M2-era stale spec on the shared workshop kagent cluster (the repo's `uc1/agents/agent.yaml` is correct since M2.5; the stale spec only matters if it somehow inherits into per-participant vClusters):

```bash
kubectl --context=<participant-vCluster> apply -f dist/workshop/uc1/agents/

# Sanity check:
kubectl --context=<participant-vCluster> get agent -n kagent artemis-mission-control-debugger -o wide
# Expected: Accepted=True, Ready=True within ~30s.
```

#### 4b. RemoteMCPServer reconcile race on first MCP apply

`make mcp-up` produces a `RemoteMCPServer artemis-bulb-mcp` resource that kagent's reconciler probes ~7 seconds after creation — before the MCP Pod is Ready. The initial reconcile lands `Accepted=False`; auto-recovers within ~60 s, or trigger explicitly:

```bash
# Option A — wait for auto-recovery (90s buffer)
make mcp-up
sleep 90
kubectl get rmcps -n kagent artemis-bulb-mcp \
  -o jsonpath='{.status.conditions[?(@.type=="Accepted")].status}'
# Expected: True

# Option B — explicit poke after Pod is Ready
make mcp-up
kubectl wait -n artemis-mcp --for=condition=Ready pod \
  -l app=artemis-bulb-mcp --timeout=60s
kubectl annotate rmcps -n kagent artemis-bulb-mcp poke=$(date +%s) --overwrite
sleep 10
kubectl get rmcps -n kagent artemis-bulb-mcp \
  -o jsonpath='{.status.conditions[?(@.type=="Accepted")].status}'
# Expected: True
```

Either approach yields the same end-state; Option B is faster.

### Step 5 — per-participant Secret / ConfigMap pre-wiring

Two Secrets + one ConfigMap need to exist in each participant's vCluster before the tour-driven `make mcp-up` / agent invocations work:

| Resource                                 | Namespace        | Keys                                         | Notes                                                                                          |
| ---------------------------------------- | ---------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Secret `artemis-llm-credentials`         | `kagent`         | `api-key=<OpenAI / Anthropic / … key>`       | Referenced by every UC's `ModelConfig` (and by kagent's installed `default-model-config`).     |
| Secret `artemis-bulb-mcp-tenancy`        | `artemis-mcp`    | `WORKSHOP_PARTICIPANT_LOGIN=<participant-NN>` | Pins the MCP's tenancy guard (NFR-012). The login string must match what `light-manager` recognises for this participant. |
| ConfigMap `artemis-bulb-mcp-config`      | `artemis-mcp`    | `LIGHT_MANAGER_URL=http://light-manager.<ns>.svc.cluster.local:8000` | In-cluster URL for the participant-side MCP→light-manager link. |

The participant's `coder` workspace does **not** know about these — they're cluster-side state, managed by workshop-infrastructure's per-participant provisioning script.

---

## Verifying a built distribution

Quick sanity checks before rsyncing to participants:

```bash
# Built marker present?
cat dist/workshop/.workshop-distribution-info

# All 5 tours validate against the schema?
( cd dist/workshop && make validate-tours )

# All manifests dry-run clean?
( cd dist/workshop && make lint-manifests )

# No author-facing leaks?
find dist/workshop \( -name 'STORY-*.md' -o -name 'prd-*.md' -o -name 'architecture-*.md' \
                     -o -name 'sprint-*' -o -name 'product-brief-*' -o -name 'bmm-workflow-status.yaml' \
                     -o -name 'CLAUDE.md' -o -name 'TESTING.md' -o -name 'DISTRIBUTION.md' \) -print
# Expected: zero output.
```

The third command is the audit — if any author-facing file slipped into the distribution, fix the `excludes` list in the build script and re-run.

---

## Re-building post-typo-fix

The freeze tag is the authoritative ship state. If a docs typo fix lands on `main` after the freeze, workshop-infrastructure can re-pull and re-build:

```bash
cd kagent-workshop/scenarios
git fetch origin
git reset --hard origin/main                    # only if typo-fix only — verify with git log first
./scripts/build-workshop-distribution.sh
# then re-rsync to each participant's coder PVC
```

The freeze tag stays pointing at `25e5723` (the M5 corrections + freeze commit). Post-freeze docs typo fixes move `main` forward but don't disturb the tagged state.

---

## Cross-references

- **Build script:** [`scripts/build-workshop-distribution.sh`](scripts/build-workshop-distribution.sh).
- **Local testing (authors):** [`TESTING.md`](TESTING.md).
- **Freeze story + workshop-infrastructure deployment notes:** [`docs/stories/STORY-029.md`](docs/stories/STORY-029.md) §Workshop-infrastructure deployment notes.
- **Dry-run synthesis + risk queue:** [`docs/stories/STORY-028.md`](docs/stories/STORY-028.md).
- **Per-UC reproduction checklists:** [`uc0/README.md`](uc0/README.md), [`uc1/README.md`](uc1/README.md), [`uc2/README.md`](uc2/README.md), [`uc3/README.md`](uc3/README.md), [`uc4/README.md`](uc4/README.md).
