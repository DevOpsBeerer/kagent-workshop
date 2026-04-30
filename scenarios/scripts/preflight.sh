#!/usr/bin/env bash
# scripts/preflight.sh — author dev-loop preflight (FR-004).
# Validates Docker, kubectl, kind, helm presence + the four kagent.dev CRDs
# in the current cluster context. Exits non-zero with actionable messages.
#
# Run from the scenarios/ root:
#   ./scripts/preflight.sh        # or:  make preflight

set -euo pipefail

if [[ -t 1 ]]; then
  GREEN=$'\033[0;32m'; RED=$'\033[0;31m'; YEL=$'\033[0;33m'; RST=$'\033[0m'
else
  GREEN=""; RED=""; YEL=""; RST=""
fi

errors=0
warnings=0

ok()   { printf "%s✓%s %s\n" "$GREEN" "$RST" "$1"; }
fail() { printf "%s✗%s %s\n" "$RED"   "$RST" "$1" >&2; errors=$((errors+1)); }
warn() { printf "%s!%s %s\n" "$YEL"   "$RST" "$1" >&2; warnings=$((warnings+1)); }

require_bin() {
  local bin=$1 install_hint=$2
  if command -v "$bin" >/dev/null 2>&1; then
    ok "$bin: $(command -v "$bin")"
  else
    fail "$bin missing — install: $install_hint"
  fi
}

echo "── binaries ──"
require_bin docker  "https://docs.docker.com/get-docker/"
require_bin kubectl "https://kubernetes.io/docs/tasks/tools/"
require_bin kind    "https://kind.sigs.k8s.io/docs/user/quick-start/#installation"
require_bin helm    "https://helm.sh/docs/intro/install/"
if command -v kagent >/dev/null 2>&1; then
  ok "kagent: $(command -v kagent)"
else
  warn "kagent CLI not on PATH — required to follow tour 'commands' steps; install: https://kagent.dev"
fi

echo "── docker daemon ──"
if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    ok "docker daemon reachable"
  else
    fail "docker daemon not reachable — start Docker Desktop or 'sudo systemctl start docker'"
  fi
fi

echo "── kubernetes context ──"
if command -v kubectl >/dev/null 2>&1 && kubectl cluster-info >/dev/null 2>&1; then
  ctx=$(kubectl config current-context 2>/dev/null || echo "<unknown>")
  ok "current context: $ctx"

  echo "── kagent CRDs ──"
  # Required minimum for this workshop: every UC references Agent + ModelConfig;
  # UC4 additionally references ToolServer. (kagent does not ship a `tools.kagent.dev`
  # CRD — tools are declared inline on the Agent CRD or via ToolServer.)
  required_crds=(agents.kagent.dev modelconfigs.kagent.dev toolservers.kagent.dev)
  for crd in "${required_crds[@]}"; do
    if kubectl get crd "$crd" >/dev/null 2>&1; then
      ok "CRD present: $crd"
    else
      fail "CRD missing: $crd — run 'make kagent-install' (pins kagent v0.9.0)"
    fi
  done
else
  fail "no reachable Kubernetes context — run 'make kind-up && make kagent-install' first"
fi

echo
if [[ $errors -gt 0 ]]; then
  printf "%spreflight failed: %d error(s), %d warning(s)%s\n" "$RED" "$errors" "$warnings" "$RST" >&2
  exit 1
fi
printf "%spreflight passed%s (%d warning(s))\n" "$GREEN" "$RST" "$warnings"
