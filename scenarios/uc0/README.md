# UC0 — Install kagent

**Owner:** joint
**Sprint:** 2.5 (M2.5)
**Tour ID:** `kagent-uc0-install`
**Type:** Prep tour (run-this-first — see `docs/tour-content-conventions.md` §`Prep tours`)
**FR / NFR:** FR-006 (tour content convention), NFR-009 / NFR-010 / NFR-011

UC0 is the workshop's run-this-first prep tour. It installs kagent on the participant's vCluster slice so UC1–UC4 can run with a working agent runtime.

## Files in this directory

```
uc0/
  README.md          this file
  tour.json          3-step prep tour
```

UC0 has **no** `manifests/` or `agents/` — there is no scenario app, and no diagnostic agent CRD to ship. The three tour steps drive `kagent install --profile demo` directly against the participant's slice.

## Prerequisites

- `OPENAI_API_KEY` already set in the env on the participant's VS Code server (provisioned by `workshop-infrastructure`). UC0 does **not** print or read the value — UC1's `artemis-llm` ModelConfig is what consumes it via a Kubernetes Secret.
- `kubectl` and the `kagent` CLI on `PATH` (slice setup).
- A reachable Kubernetes cluster — the per-participant vCluster slice. UC0's first step verifies this.

## The three steps

1. **Check your cluster** — `kubectl config current-context` + `kubectl get nodes`.
2. **Install kagent via CLI** — `kagent install --profile demo` then `kubectl rollout status deployment/kagent-controller -n kagent`. The `--profile demo` choice is documented in the tour step's explanation; rationale: UC3 reuses the demo profile's pre-packaged Prometheus / Grafana agents (architecture L300).
3. **Verify the installation** — kagent CRDs registered, controller pod `Running`, ModelConfigs in the `kagent` namespace.

## Why a "prep tour" exception?

The 4-beat tour convention (`docs/tour-content-conventions.md` §`The 4 beats`) is built for diagnostic UCs: friction surfaces, the agent absorbs it, the recap names what was skipped. UC0 has nothing to diagnose — there is no friction on a fresh slice — so the 4-beat doesn't apply. The convention's `§Prep tours` clause carves the exception explicitly.

## Author / CI install path (separate from UC0)

For author / CI work the `Makefile`'s `kagent-install` target installs **CRDs only** via `helm install kagent-crds …` — that is enough to `kubectl apply` Agent / ModelConfig manifests in repo dry-runs but does **not** stand up a live controller. The participant's UC0 path uses `kagent install --profile demo` for a full install on the slice. The two paths intentionally co-exist for now; consolidating them is out of scope for STORY-033.

## Author notes

The notes below capture engineering rationale and spike outcomes that were temporarily inlined in `tour.json`'s participant text and have since been relocated here per the convention's *No meta-references in prose* rule (`docs/tour-content-conventions.md`). Participants never read this section; authors come here to find the *why* behind each install choice.

### Install spike — frozen form (STORY-033)

`kagent install --profile demo` is the frozen install command for the prep tour. Per `kagent install --help` on v0.9.0 the CLI documents two profiles: `minimal` (controller alone) and `demo` (controller plus pre-packaged Prometheus / Grafana agents). `--profile demo` is selected because UC3 (observability-augmented diagnosis) reuses the demo profile's pre-packaged Prometheus / Grafana agents already wired by the controller — see [`../docs/architecture-kagent-workshop-scenarios-2026-04-28.md`](../docs/architecture-kagent-workshop-scenarios-2026-04-28.md) L300 for the routing rationale. If a future UC drops the observability hook, `--profile minimal` becomes a viable downgrade with ~30 s shaved from the install path.

### `kagent` namespace + ModelConfig timing

The CLI installs into the `kagent` namespace by default. Any per-scenario `ModelConfig` (e.g. `artemis-llm` consumed by UC1+) is provisioned by the scenario that needs it, not by UC0 — UC0's verify step accepts zero or one ModelConfig in the `kagent` namespace as healthy.

## References

- **Convention:** [`../docs/tour-content-conventions.md`](../docs/tour-content-conventions.md) §`Prep tours`, §`The 4 beats`, and §`The no-spoiler rule` (sub-rule *No meta-references in prose*).
- **Stories:** [`../docs/stories/STORY-033.md`](../docs/stories/STORY-033.md) (UC0 install + tour); [`../docs/stories/STORY-034.md`](../docs/stories/STORY-034.md) (relocation of audit notes from `tour.json` to this README).
- **kagent v0.9.0 release:** root [`README.md`](../README.md) "Install kagent" section.
- **Naming vocabulary:** [`../docs/artemis-naming.md`](../docs/artemis-naming.md).
