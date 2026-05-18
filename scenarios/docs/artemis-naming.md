# Artemis naming convention

**Source of truth** for every resource name committed under `uc<N>/`, `apps/`, `infra/`, and `mcp/`. M2–M4 authors look up names here rather than inventing them; FR-005 and the architecture's NFR-008 (anti-collision) both depend on this single vocabulary.

> Workshop participants do not read this doc. It is for the two repo authors. The Artemis fil rouge they see is in the per-UC tour copy + the root README's lore index.

## Narrative arc (UC1 → UC4)

The fictional setting is NASA's Artemis lunar program: a small fleet of mission ops services running on the surface and in cislunar space, mostly stable, occasionally not. Every UC is one anomaly in that fleet.

| UC  | Beat                                                                                                                                  | Anchor resource                            | Pedagogical hook                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------ |
| UC1 | Mission control's new on-shift roster fails to come online — the deploy targets an image build that was never shipped.                | `mission-control` Deployment with `:v999`   | Use a pre-installed agent (kagent built-in `k8s-agent`).                       |
| UC2 | A replacement mission-control replica points at a tag nobody confirmed is published — author a small agent that asks the registry.   | `mission-control` Deployment with `:v999`, `fetcher` MCPServer | Author your own Agent CRD wired to one ambient MCP-served tool (`fetch_json`). |
| UC3 | The lunar rover's telemetry stream is leaking memory to the lunar regolith. The kernel reaps the process before it can phone home.    | `lunar-rover-telemetry` Deployment, 64 Mi   | MCP as an explicit topic + A2A delegation to kagent's pre-packaged observability stack. |
| UC4 | The mission coordinator surveys three active anomalies in one namespace, delegates per-slot to its on-call specialists (one of them kagent's built-in `k8s-agent`), broadcasts verdicts on the participant's three status bulbs, and on a second prompt remediates each in turn. | `artemis-mission-coordinator` Agent + bulbs | Build your own MCP (`artemis-bulb-mcp`) + multi-agent fan-out + agent-driven remediation. |

The arc is meant to be light. Every step's pedagogical content stands without the lore; the lore only adds a thread to pull on across the four scenarios.

## Resource naming vocabulary

DNS-1123 rules apply (lowercase, hyphenated, ≤ 63 chars per label). Cluster-scoped or kagent CRDs carry the `artemis-` prefix so they are discoverable at the cluster level (`kubectl get agents -A` reads cleanly); namespaced workload resources (Deployment, Service) drop the prefix because their namespace already carries it.

### Namespaces

| Namespace               | Owner       | Purpose                                                                          |
| ----------------------- | ----------- | -------------------------------------------------------------------------------- |
| `artemis-uc1`           | UC1         | UC1 broken-state Deployment + Service.                                           |
| `artemis-uc2`           | UC2         | UC2 broken-state Deployment + Service (image-discovery scenario — same `:v999` family as UC1, in `artemis-uc2`). |
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
| UC2 | `mission-control`                                                      | `<registry>/mission-control:v999` (unpublished — same broken-tag family as UC1, in `artemis-uc2`) | `ImagePullBackOff`; the participant authors `artemis-image-fetcher` to discover the real published tag (`v1.0.0`) via the registry's OCI Distribution API. |
| UC3 | `lunar-rover-telemetry`                                                | `<registry>/lunar-rover-telemetry:v1.0.0`            | `resources.limits.memory: 64Mi` + the tour's transient telemetry-stream loop → `OOMKilled` (FR-012). |
| UC4 | `mission-control-imagepull`, `mission-control-pending`, `lunar-rover-telemetry` (3 Deployments in `artemis-uc4`) | reuses UC1/UC3 image tags                            | All three symptoms reproduce side-by-side (FR-014). The coordinator can diagnose and remediate the three in two prompts. |

Service ports: `8000` everywhere (the FastAPI app's uvicorn port). UC3's Service additionally carries the label `monitoring=prom` so the Prometheus install auto-scrapes it without per-UC config edits (FR-012).

### kagent Agent CRDs (cluster-scope-discoverable — `artemis-` prefix)

| UC  | Agent name                              | Origin / role                                                                                                                |
| --- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| UC1 | `k8s-agent` (kagent built-in)           | Demo-profile general K8s diagnostician + remediator (KubeAssist). UC1 does NOT ship a custom Agent CRD — it talks to this directly. |
| UC2 | `artemis-image-fetcher`                 | Custom Agent CRD authored by the participant. General OCI-registry inspector (Scaleway / Docker Hub / GHCR / Quay / …); single tool: `fetch_json` from the `fetcher` MCPServer. |
| UC3 | `artemis-rover-telemetry-debugger`      | Custom Agent CRD. General K8s + observability assistant (read + mutate + A2A to `observability-agent` for Grafana panels). Reused by UC4's coordinator. |
| UC4 | `artemis-mission-coordinator`           | Custom Agent CRD. Multi-agent (A2A) coordinator. Delegates per-slot — slots 1+2 → kagent's built-in `k8s-agent`, slot 3 → `artemis-rover-telemetry-debugger` — and reports verdicts via the bulb MCP. Two modes: diagnose and remediate. |

UC4 references the two specialists by their canonical names above (no per-UC4 rename). The removed `artemis-mission-control-debugger` and `artemis-launch-pad-debugger` from the M2 baseline are folded into the built-in `k8s-agent` — same diagnostic + mutate surface, broader scope, no per-UC bias.

### MCP servers

| Name               | Type (CRD)                                       | Used by  | Purpose                                                                                                 |
| ------------------ | ------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------- |
| `fetcher`          | `MCPServer` (`kagent.dev/v1alpha1`, `kagent` ns) | UC2      | kagent-managed npx wrapper of `@tokenizin/mcp-npx-fetch`. Exposes `fetch_html`, `fetch_markdown`, `fetch_txt`, `fetch_json`. UC2 references `fetch_json` only. |
| `artemis-bulb-mcp` | `RemoteMCPServer` (`kagent.dev/v1alpha2`, `kagent` ns) — backed by an `MCPServer` deployed via `kmcp` | UC4 | Custom-authored MCP wrapping the `light-manager` API; tenancy-pinned to `WORKSHOP_PARTICIPANT_LOGIN`. Exposes `list_bulbs`, `update_bulb`. |

### ModelConfig

| Name                    | Scope                                       | Notes                                                                                                                                            |
| ----------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `default-model-config`  | `kagent` ns (kagent helm install pre-wires) | The canonical ModelConfig every Artemis agent (UC1/UC2/UC3/UC4) references. Credentials live in the `artemis-llm-credentials` Secret in `kagent`, injected by `workshop-infrastructure` at deploy time (NFR-005, NFR-011). One shared config across every UC. |

## FR-017 bulb / verdict mapping (UC4)

The mission coordinator paints three bulbs to broadcast its verdict for each sub-incident. Slot ↔ subsystem ↔ specialist mapping is fixed in the coordinator's system prompt:

| Bulb slot | Deployment name pattern         | Specialist                          | Symptom present (red) | Symptom absent / fixed (green) |
| --------- | ------------------------------- | ----------------------------------- | --------------------- | ------------------------------ |
| 1         | `mission-control-imagepull`     | `k8s-agent` (kagent built-in)       | `(255, 0, 0)`         | `(0, 255, 0)`                  |
| 2         | `mission-control-pending`       | `k8s-agent` (kagent built-in)       | `(255, 0, 0)`         | `(0, 255, 0)`                  |
| 3         | `lunar-rover-telemetry`         | `artemis-rover-telemetry-debugger`  | `(255, 0, 0)`         | `(0, 255, 0)`                  |
| any       | inconclusive / partial finding  | —                                   | amber `(255, 191, 0)` | —                              |

Encoded in the `artemis-mission-coordinator` Agent's system prompt and documented in `uc4/_README.md`.

## Conventions

- **Lowercase, hyphenated, DNS-1123.** No camelCase, no underscores, no ≥ 64-char labels.
- **`artemis-` prefix where cluster-discoverability matters** (namespaces, kagent CRDs, ToolServers). Drop it on namespaced workload resources to keep names short.
- **One namespace per UC.** Cross-UC resource references happen only at the kagent CRD level (UC4 referencing the built-in `k8s-agent` + UC3's `artemis-rover-telemetry-debugger` by name).
- **No `:latest`.** Images and helm charts pin a version (NFR-005).
- **Stable Tour IDs.** Pinned by FR-009/011/013/015 — they live in `tour.json` and follow `kagent-uc<N>-<symptom>`. Listed in the root README's UC index.

## Adding a new resource

When a new resource needs naming during an M2–M4 PR:

1. Pick the smallest scope that fits — namespaced if it lives inside one UC; cluster-scoped only if a ToolServer / Agent / ModelConfig actually needs to be cluster-discoverable.
2. Look up the right column above. If the resource type isn't in the table, add it in the same PR; this doc is part of FR-005's contract.
3. If the resource is shared across UCs (e.g. `infra/observability/`), put it in a shared `artemis-<purpose>` namespace and prefix every name with `artemis-`.
4. Update the architecture document if the new resource is structural (new Agent role, new ToolServer, new app identity) — not for routine Deployments/Services that just instantiate existing patterns.
