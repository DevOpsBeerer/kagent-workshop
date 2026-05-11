# Artemis naming convention

**Source of truth** for every resource name committed under `uc<N>/`, `apps/`, `infra/`, and `mcp/`. M2–M4 authors look up names here rather than inventing them; FR-005 and the architecture's NFR-008 (anti-collision) both depend on this single vocabulary.

> Workshop participants do not read this doc. It is for the two repo authors. The Artemis fil rouge they see is in the per-UC tour copy + the root README's lore index.

## Narrative arc (UC1 → UC4)

The fictional setting is NASA's Artemis lunar program: a small fleet of mission ops services running on the surface and in cislunar space, mostly stable, occasionally not. Every UC is one anomaly in that fleet.

| UC  | Beat                                                                                                                                  | Anchor resource                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| UC1 | Mission control's new on-shift roster fails to come online — the deploy targets an image build that was never shipped.                | `mission-control` Deployment with `:v999`   |
| UC2 | A replacement mission-control replica refuses to land on the only available pad — the launch-pad bears a taint that no one tolerates. | `mission-control` Deployment + node taint   |
| UC3 | The lunar rover's telemetry stream is leaking memory to the lunar regolith. The kernel reaps the process before it can phone home.    | `lunar-rover-telemetry` Deployment, 64 Mi   |
| UC4 | The mission coordinator surveys all three active anomalies, delegates to the on-call specialists, and signals each verdict on the participant's status bulbs. | `artemis-mission-coordinator` Agent + bulbs |

The arc is meant to be light. Every step's pedagogical content stands without the lore; the lore only adds a thread to pull on across the four scenarios.

## Resource naming vocabulary

DNS-1123 rules apply (lowercase, hyphenated, ≤ 63 chars per label). Cluster-scoped or kagent CRDs carry the `artemis-` prefix so they are discoverable at the cluster level (`kubectl get agents -A` reads cleanly); namespaced workload resources (Deployment, Service) drop the prefix because their namespace already carries it.

### Namespaces

| Namespace               | Owner       | Purpose                                                                          |
| ----------------------- | ----------- | -------------------------------------------------------------------------------- |
| `artemis-uc1`           | UC1         | UC1 broken-state Deployment + Service.                                           |
| `artemis-uc2`           | UC2         | UC2 broken-state Deployment + Service + bootstrap taint Job.                     |
| `artemis-uc3`           | UC3         | UC3 broken-state Deployment + Service.                                           |
| `artemis-uc4`           | UC4         | UC4 multi-symptom Deployments (UC1- + UC2- + UC3-style side-by-side).            |
| `artemis-observability` | UC3 / UC4   | `infra/observability/` Prom + Grafana single-replica install.                    |
| `artemis-mcp`           | UC4         | Per-vCluster custom MCP pod (`mcp/`).                                            |
| `kagent`                | (upstream)  | Reserved for the kagent control plane install (`make kagent-install`).           |

### App identities (already locked by STORY-008/009/010)

| `apps/<dir>/`              | Image identity       | Used by   | Notes                                                                         |
| -------------------------- | -------------------- | --------- | ----------------------------------------------------------------------------- |
| `apps/_skeleton/`          | `_skeleton`          | (none)    | Reference template; never deployed.                                            |
| `apps/mission-control/`    | `mission-control`    | UC1, UC2  | `/healthz` only.                                                              |
| `apps/lunar-rover-telemetry/` | `lunar-rover-telemetry` | UC3, UC4 | Adds `/leak` (1 MiB / call) and `/metrics`.                                  |

The `APP_IDENTITY` env var defaults to the directory name; a deployment that overrides it must use a name that is also in this table.

### Deployments + Services (namespaced — no `artemis-` prefix)

| UC  | Deployment / Service name                                              | Image                                                | Why broken                                                       |
| --- | ---------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- |
| UC1 | `mission-control`                                                      | `<registry>/mission-control:v999` (unpublished)      | `ImagePullBackOff` on first pull (FR-008).                       |
| UC2 | `mission-control`                                                      | `<registry>/mission-control:v1` (real)               | Pod cannot tolerate the bootstrap-Job taint → `Pending` (FR-010). |
| UC3 | `lunar-rover-telemetry`                                                | `<registry>/lunar-rover-telemetry:v1`                | `resources.limits.memory: 64Mi` + 70 × `/leak` → `OOMKilled` (FR-012). |
| UC4 | `mission-control-imagepull`, `mission-control-pending`, `lunar-rover-telemetry` (3 Deployments in `artemis-uc4`) | reuses UC1/UC2/UC3 image tags                        | All three symptoms reproduce side-by-side (FR-014).               |

Service ports: `8000` everywhere (the FastAPI app's uvicorn port). UC3's Service additionally carries the label `monitoring=prom` so the Prometheus install auto-scrapes it without per-UC config edits (FR-012).

### kagent Agent CRDs (cluster-scope-discoverable — `artemis-` prefix)

| UC  | Agent name                              | Diagnostic role                                                          |
| --- | --------------------------------------- | ------------------------------------------------------------------------ |
| UC1 | `artemis-mission-control-debugger`      | Diagnoses ImagePullBackOff for `mission-control`. Tools: `kubectl get/describe pod`, `get events`. |
| UC2 | `artemis-launch-pad-debugger`           | Diagnoses Pod Pending — multi-resource correlation across pod, node, taints, events. |
| UC3 | `artemis-rover-telemetry-debugger`      | Diagnoses OOMKilled. Composes kagent's pre-packaged Prom + Grafana sub-agents. |
| UC4 | `artemis-mission-coordinator`           | Multi-agent (a2a) coordinator. Delegates to UC1/UC2/UC3 sub-Agents and reports verdicts via the bulb MCP. |

UC4 references the three sub-Agents by their canonical names above (no per-UC4 rename).

### ToolServer (UC4)

| Name              | Points at                                                | Purpose                                          |
| ----------------- | -------------------------------------------------------- | ------------------------------------------------ |
| `artemis-bulb-mcp` | `Service` in `artemis-mcp` namespace, MCP HTTP/SSE port  | Wraps `light-manager` API; tenancy-pinned to `WORKSHOP_PARTICIPANT_LOGIN`. |

### ModelConfig

| Name                    | Scope                                       | Notes                                                                                                                                            |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `default-model-config`  | `kagent` ns (kagent helm install pre-wires) | The canonical ModelConfig every Artemis agent (UC1/UC2/UC3/UC4) references. Credentials live in the `artemis-llm-credentials` Secret in `kagent`, injected by `workshop-infrastructure` at deploy time (NFR-005, NFR-011). One shared config across every UC. |

## FR-017 bulb / verdict mapping (UC4)

The mission coordinator paints three bulbs to broadcast its verdict for each sub-incident.

| Bulb slot | Sub-agent verdict                | Colour       | RGB              |
| --------- | -------------------------------- | ------------ | ---------------- |
| 1         | UC1 — symptom present            | red          | `(255, 0, 0)`    |
| 1         | UC1 — symptom absent             | green        | `(0, 255, 0)`    |
| 2         | UC2 — symptom present / absent   | red / green  | as above          |
| 3         | UC3 — symptom present / absent   | red / green  | as above          |
| any       | inconclusive / partial finding   | amber        | `(255, 191, 0)`  |

Encoded in the `artemis-mission-coordinator` Agent's system prompt (STORY-025) and documented in `uc4/README.md` (STORY-027).

## Conventions

- **Lowercase, hyphenated, DNS-1123.** No camelCase, no underscores, no ≥ 64-char labels.
- **`artemis-` prefix where cluster-discoverability matters** (namespaces, kagent CRDs, ToolServers). Drop it on namespaced workload resources to keep names short.
- **One namespace per UC.** Cross-UC resource references happen only at the kagent CRD level (UC4 referencing UC1/UC2/UC3 sub-Agents by name).
- **No `:latest`.** Images and helm charts pin a version (NFR-005).
- **Stable Tour IDs.** Pinned by FR-009/011/013/015 — they live in `tour.json` and follow `kagent-uc<N>-<symptom>`. Listed in the root README's UC index.

## Adding a new resource

When a new resource needs naming during an M2–M4 PR:

1. Pick the smallest scope that fits — namespaced if it lives inside one UC; cluster-scoped only if a ToolServer / Agent / ModelConfig actually needs to be cluster-discoverable.
2. Look up the right column above. If the resource type isn't in the table, add it in the same PR; this doc is part of FR-005's contract.
3. If the resource is shared across UCs (e.g. `infra/observability/`), put it in a shared `artemis-<purpose>` namespace and prefix every name with `artemis-`.
4. Update the architecture document if the new resource is structural (new Agent role, new ToolServer, new app identity) — not for routine Deployments/Services that just instantiate existing patterns.
