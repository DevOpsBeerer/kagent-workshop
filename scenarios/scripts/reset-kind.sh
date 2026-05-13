#!/usr/bin/env bash
# Nuke and recreate the local kind cluster used for workshop dry-runs.
# Leaves the cluster empty so the participant flow (UC0 → UC4) starts
# from zero. Does NOT install kagent — that's UC0's job.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cluster_name="kagent-workshop"
kind_config="${repo_root}/scripts/kind-config.yaml"

command -v kind    >/dev/null 2>&1 || { echo "reset-kind: kind CLI not found on PATH" >&2; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "reset-kind: kubectl not found on PATH"  >&2; exit 1; }
[ -f "${kind_config}" ] || { echo "reset-kind: kind config not found at ${kind_config}" >&2; exit 1; }

if kind get clusters 2>/dev/null | grep -qx "${cluster_name}"; then
    echo "reset-kind: deleting existing cluster '${cluster_name}'"
    kind delete cluster --name "${cluster_name}"
else
    echo "reset-kind: no existing cluster '${cluster_name}' — skipping delete"
fi

echo "reset-kind: creating cluster '${cluster_name}' from $(realpath --relative-to="${repo_root}" "${kind_config}" 2>/dev/null || echo "${kind_config}")"
kind create cluster --name "${cluster_name}" --config "${kind_config}"

if [ -x "${repo_root}/scripts/sync-workshop-tour.sh" ]; then
    "${repo_root}/scripts/sync-workshop-tour.sh"
fi

cat <<'EOF'

reset-kind: ready — empty cluster, kagent not yet installed.

Next:
  1. Open this workspace in VS Code.
  2. Command Palette → 'Workshop Tour: Reset Progress' (clears any
     cached step state from a previous run — kept in workspaceState,
     not on disk, so this script can't wipe it for you).
  3. Run UC0 first (Install kagent), then UC1 → UC4.
EOF
