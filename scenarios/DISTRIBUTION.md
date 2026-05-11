# Workshop distribution — what gets shipped to participants

The participant-facing slice of this repo is small: just the 5 UC scenario packages (`uc0/` through `uc4/`, each minus its author-facing `README.md`) and the shared observability bundle (`infra/observability/`). Everything else — Makefile, MCP source, FastAPI app sources, schemas, scripts, docs, BMAD audit trail — stays in the repo for authors and never reaches the participants' coder workspaces.

This document is the contract between **this repo** (produces the distribution) and **`workshop-infrastructure`** (consumes the distribution). For local-testing recipes (authors), see [`TESTING.md`](TESTING.md).

---

## Contents (built `dist/workshop/`)

```
dist/workshop/
  .workshop-distribution-info        # auto-generated marker: commit + tag + branch + build timestamp
  uc0/
    tour.json                        # kagent install prep tour
  uc1/
    tour.json                        # 4-beat tour
    manifests/                       # namespace + service + Deployment (ImagePullBackOff)
    agents/                          # artemis-mission-control-debugger Agent + ModelConfig
  uc2/
    tour.json                        # 4-beat tour
    manifests/                       # namespace + RBAC + bootstrap-taint Job + service + Deployment (Pending)
    agents/                          # artemis-launch-pad-debugger Agent + ModelConfig
  uc3/
    tour.json                        # 4-beat tour
    manifests/                       # namespace + service (monitoring=prom) + Deployment (OOMKilled, 64Mi limit)
    agents/                          # artemis-rover-telemetry-debugger Agent + ModelConfig
  uc4/
    tour.json                        # 4-beat tour
    manifests/                       # namespace + RBAC + bootstrap-taint Job + 3 services + 3 Deployments (multi-symptom)
    agents/                          # artemis-mission-coordinator Agent + ModelConfig
  infra/
    observability/                   # Prom + Graf bundle + kagent↔observability namespace bridge
      00-namespace.yaml
      kustomization.yaml
      kagent-bridge-services.yaml    # applied outside the kustomization (lives in `kagent` ns)
      prometheus/{10-rbac,20-configmap-scrape,30-deployment,40-service}.yaml
      grafana/{20-configmap-datasource,30-deployment,40-service}.yaml
```

**Size:** ~300 KB, 42 files.

### What stays out (author-facing, never shipped)

- `README.md` files (root + per-UC) — author-facing narrative; the tour itself is the participant-facing narrative.
- `Makefile` — `make` targets are author dev-loop convenience; participants run `kubectl apply -f …` directly from the tour's `commands[]` entries.
- `apps/` — FastAPI app sources (`mission-control`, `lunar-rover-telemetry`, `_skeleton`). Images are pre-built in the apogasa registry; participants pull them by tag.
- `mcp/` — custom bulb MCP source. Workshop-infrastructure builds + deploys the image per-vCluster; participants don't see the MCP source.
- `schemas/` — JSON schema for `make validate-tours` (authors only).
- `scripts/` — preflight + kind-config + author dev-loop helpers.
- `docs/` — naming convention, tour-content convention, PRD, architecture, product brief, sprint plan, sprint status, all story documents, BMAD config. The full BMAD audit trail.
- `bmad/`, `CLAUDE.md`, `TESTING.md`, `DISTRIBUTION.md` — author / assistant config + this doc itself.
- Build artefacts: `.git/`, `.venv/`, `.pytest_cache/`, `__pycache__/`, `*.pyc`, `node_modules/`, `*.tsbuildinfo`, `.DS_Store`, etc.

---

## Build recipe

Run from the repo root (`scenarios/`):

```bash
./scripts/build-workshop-distribution.sh
```

The script wipes `dist/workshop/` and rebuilds from the current working-tree state. It also drops a `.workshop-distribution-info` marker naming the source commit + tag + branch + build timestamp, so workshop-infrastructure can verify it's deploying the right state.

Requires `rsync` on `PATH`. `git` optional (used only for the marker file).

---

## Workshop-infrastructure consumption recipe

### Step 1 — pull the freeze tag

```bash
git clone https://github.com/<org>/kagent-workshop.git
cd kagent-workshop/scenarios
git checkout workshop-2026-05-20-freeze
```

If the freeze tag isn't present or a fresher state is needed, `origin/main` works too — but `main` may carry post-freeze typo fixes that haven't been re-tested.

### Step 2 — build the distribution

```bash
./scripts/build-workshop-distribution.sh
# → dist/workshop/ now contains 42 files (~300 KB) of participant-facing artefacts
```

### Step 3 — rsync into each participant's coder PVC

For each participant `participant-NN`:

```bash
PVC_MOUNT=/data/participants/participant-NN/workspace
rsync -avh --delete dist/workshop/ "${PVC_MOUNT}/"
```

The participant's coder workspace now contains the distribution at its root. They open the VS Code workshop-tour extension and walk through UC0 → UC1 → UC2 → UC3 → UC4.

### Step 4 — per-vCluster pre-flight (cluster-side state)

The participant's coder workspace only ships the **broken-state manifests** (which the tour applies via `kubectl apply -f uc<N>/manifests/`). The shared cluster-side state — kagent, the observability bundle, the bridge Services, the bulb MCP, the four Agent CRDs — is **workshop-infrastructure's responsibility** to pre-apply per-vCluster.

The full per-vCluster pre-flight chain:

```bash
# 4a. Install kagent v0.9.0 (demo profile — provides the pre-packaged sub-agents
#     and the kagent-tool-server + kagent-grafana-mcp RemoteMCPServers)
helm upgrade --install kagent-crds oci://ghcr.io/kagent-dev/kagent/helm/kagent-crds \
    --namespace kagent --create-namespace --wait

# 4b. Apply observability bundle + bridge
kubectl apply -k infra/observability/
kubectl apply -f infra/observability/kagent-bridge-services.yaml
kubectl rollout status -n artemis-observability deploy/prometheus-server --timeout=120s
kubectl rollout status -n artemis-observability deploy/grafana --timeout=120s

# 4c. Apply all 4 UC agent CRDs (cluster-side, before participants run any tour)
kubectl apply -f uc1/agents/
kubectl apply -f uc2/agents/
kubectl apply -f uc3/agents/
kubectl apply -f uc4/agents/

# 4d. Per-participant Secret + ConfigMap for the bulb MCP
kubectl create namespace artemis-mcp
kubectl -n artemis-mcp create secret generic artemis-bulb-mcp-tenancy \
    --from-literal=WORKSHOP_PARTICIPANT_LOGIN=participant-NN
kubectl -n artemis-mcp create configmap artemis-bulb-mcp-config \
    --from-literal=LIGHT_MANAGER_URL=http://light-manager.<ns>.svc.cluster.local:8000

# 4e. Deploy the bulb MCP (image side-loaded from the apogasa registry; the
#     mcp/manifests/ directory and the Dockerfile live in the source repo,
#     not in the participant's coder workspace — workshop-infrastructure
#     applies them from its own checkout)
kubectl apply -f <source-repo>/mcp/manifests/

# 4f. Per-participant LLM credentials
kubectl -n kagent create secret generic artemis-llm-credentials \
    --from-literal=api-key=<per-participant-key-or-shared-pool>
```

### Step 5 — known race + idempotency notes

Per [`docs/stories/STORY-029.md`](docs/stories/STORY-029.md) §Workshop-infrastructure deployment notes:

#### 5a. `RemoteMCPServer artemis-bulb-mcp` reconcile race (~7 s window)

After step 4e applies the `mcp/manifests/`, the `artemis-bulb-mcp` RemoteMCPServer initially lands `Accepted=False` because kagent's reconciler probes the MCP Pod ~7 s after creation — before the Pod is Ready. Auto-recovers within ~60 s, or trigger explicitly:

```bash
kubectl wait -n artemis-mcp --for=condition=Ready pod \
    -l app=artemis-bulb-mcp --timeout=60s
kubectl annotate rmcps -n kagent artemis-bulb-mcp poke=$(date +%s) --overwrite
```

#### 5b. UC1 agent re-apply (defensive)

The repo's `uc1/agents/agent.yaml` is correct since M2.5. If your provisioning pipeline somehow inherited an M2-era stale spec, re-apply explicitly:

```bash
kubectl apply -f uc1/agents/
kubectl get agent -n kagent artemis-mission-control-debugger -o wide
# Expected: Accepted=True, Ready=True within ~30 s.
```

Per-participant vClusters provisioned from a clean state (step 4c above applies the corrected spec) get this for free.

---

## Verifying a built distribution

```bash
# Marker present + naming the right state?
cat dist/workshop/.workshop-distribution-info

# All 5 tours present?
ls dist/workshop/uc*/tour.json
# Expected: uc0/tour.json uc1/tour.json uc2/tour.json uc3/tour.json uc4/tour.json

# Manifests dry-run clean?
kubectl apply --dry-run=client -f dist/workshop/uc1/manifests/
kubectl apply --dry-run=client -f dist/workshop/uc2/manifests/
kubectl apply --dry-run=client -f dist/workshop/uc3/manifests/
kubectl apply --dry-run=client -f dist/workshop/uc4/manifests/
kubectl apply --dry-run=client -k dist/workshop/infra/observability/
kubectl apply --dry-run=client -f dist/workshop/infra/observability/kagent-bridge-services.yaml

# No author-facing leaks?
find dist/workshop \( -name 'README.md' -o -name 'Makefile' -o -name 'STORY-*.md' \
                     -o -name 'prd-*.md' -o -name 'architecture-*.md' \
                     -o -name 'CLAUDE.md' -o -name 'TESTING.md' \
                     -o -name 'DISTRIBUTION.md' \) -print
# Expected: zero output.
```

If the third audit returns any files, fix the `excludes` list in [`scripts/build-workshop-distribution.sh`](scripts/build-workshop-distribution.sh) and re-build.

---

## Re-building post-typo-fix

The freeze tag is the authoritative ship state. Post-freeze docs typo fixes move `main` forward without disturbing the tagged state. Re-build + re-rsync:

```bash
cd kagent-workshop/scenarios
git fetch origin
git checkout origin/main                          # verify with git log first
./scripts/build-workshop-distribution.sh
# then re-rsync to each participant's coder PVC
```

---

## Cross-references

- **Build script:** [`scripts/build-workshop-distribution.sh`](scripts/build-workshop-distribution.sh).
- **Local testing (authors):** [`TESTING.md`](TESTING.md).
- **Freeze story + workshop-infrastructure deployment notes:** [`docs/stories/STORY-029.md`](docs/stories/STORY-029.md).
- **Dry-run synthesis + risk queue:** [`docs/stories/STORY-028.md`](docs/stories/STORY-028.md).
