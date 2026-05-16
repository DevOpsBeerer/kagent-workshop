#!/usr/bin/env bash
# Build the participant-facing workshop distribution under `dist/workshop/`.
#
# Copies a whitelist of participant-facing paths from the repo root into
# `dist/workshop/`, excluding the BMAD audit trail, internal planning docs,
# and build artefacts. Workshop-infrastructure pulls the repo at the freeze
# tag, runs this script, then rsyncs `dist/workshop/` into each participant's
# coder PVC.
#
# Authoritative whitelist + exclusion rationale: see ../DISTRIBUTION.md.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dest="${repo_root}/dist/workshop"

# Participant-facing paths to copy. Strict whitelist — only the 5 UC
# scenario packages (tour.json + manifests/ + agents/) and the shared
# observability infra. Every other repo path (apps/, mcp/, Makefile,
# schemas/, scripts/, docs/, BMAD audit trail) stays author-facing and
# is NOT shipped to participants.
#
# Workshop-infrastructure pre-applies the agent CRDs + the observability
# bundle + the bulb MCP per-vCluster; participants drive only the
# tour-side `kubectl apply -f uc<N>/manifests/` commands. Agent CRDs ship
# in the distribution for participant transparency (they can read the
# Agent spec to understand what tools their debugger has) but they don't
# apply them themselves.
includes=(
    "uc0"
    "uc1"
    "uc2"
    "uc3"
    "uc4"
    "infra"
    # UC4's Beat 1 runs `kmcp build --push` against this directory to build
    # the bulb MCP image and publish it to the workshop registry, then
    # `kmcp deploy` to bring it up on the participant's vCluster.
    "mcp"
)

# Patterns excluded from every directory copy. Includes the standard
# build-artefact / VCS / IDE / secrets exclusions plus per-UC `README.md`
# (READMEs are author-facing — the tour itself is the participant-facing
# narrative).
excludes=(
    "_README.md"
    ".git"
    ".gitkeep"
    ".github"
    ".idea"
    ".vscode"
    ".venv"
    ".pytest_cache"
    "__pycache__"
    "*.pyc"
    "*.pyo"
    "*.pyd"
    "*.egg-info"
    "node_modules"
    "*.tsbuildinfo"
    ".DS_Store"
    "Thumbs.db"
    ".env"
    ".env.*"
    "kubeconfig"
    "kubeconfig.*"
    "*.kubeconfig"
    ".workshop-tour"     # author-local preview output of sync-workshop-tour.sh
    "dist"                # this script's own output dir
)

# Sanity check.
if [[ ! -d "${repo_root}/uc1" ]]; then
    echo "build-workshop-distribution: not in the scenarios repo root (no uc1/)." >&2
    exit 1
fi

if ! command -v rsync >/dev/null 2>&1; then
    echo "build-workshop-distribution: rsync is required but not installed." >&2
    exit 1
fi

echo "build-workshop-distribution: building distribution at ${dest}"

# Reset the destination so the build is reproducible (no stale leftovers).
rm -rf "${dest}"
mkdir -p "${dest}"

# Build the rsync exclude flag set once.
exclude_args=()
for pattern in "${excludes[@]}"; do
    exclude_args+=( "--exclude=${pattern}" )
done

for path in "${includes[@]}"; do
    src="${repo_root}/${path}"
    if [[ ! -e "${src}" ]]; then
        echo "build-workshop-distribution: WARNING — '${path}' does not exist; skipping." >&2
        continue
    fi

    dest_parent="${dest}/$(dirname "${path}")"
    mkdir -p "${dest_parent}"

    if [[ -d "${src}" ]]; then
        # Trailing slash on src copies contents into dest/<path>/.
        rsync -a "${exclude_args[@]}" "${src}/" "${dest}/${path}/"
        echo "  + ${path}/  (recursive, excludes applied)"
    else
        cp -p "${src}" "${dest_parent}/"
        echo "  + ${path}"
    fi
done

# Populate `.workshop-tour/` inside the distribution — same shape as
# `scripts/sync-workshop-tour.sh` produces at the repo root for author dev,
# but here as part of the participant artefact so the workshop-tour VS Code
# extension finds its tour files at the conventional location.
tour_dest="${dest}/.workshop-tour"
mkdir -p "${tour_dest}"
rm -f "${tour_dest}"/*.json

shopt -s nullglob
tour_files=("${dest}"/uc*/tour.json)
shopt -u nullglob

if (( ${#tour_files[@]} == 0 )); then
    echo "build-workshop-distribution: WARNING — no uc*/tour.json under ${dest}; .workshop-tour/ left empty." >&2
else
    IFS=$'\n' tour_files=($(printf '%s\n' "${tour_files[@]}" | sort -V))
    unset IFS
    for src in "${tour_files[@]}"; do
        uc_dir="$(basename "$(dirname "${src}")")"
        if [[ ! "${uc_dir}" =~ ^uc[0-9]+$ ]]; then
            echo "build-workshop-distribution: WARNING — skipping unexpected path '${src}'." >&2
            continue
        fi
        cp -f "${src}" "${tour_dest}/${uc_dir}-tour.json"
        echo "  + .workshop-tour/${uc_dir}-tour.json"
    done
fi

# Drop a small marker so workshop-infrastructure can detect "this is a built
# distribution, not an arbitrary checkout".
{
    echo "# kagent-workshop-scenarios — built workshop distribution"
    echo "#"
    echo "# Built at: $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
    if command -v git >/dev/null 2>&1 && git -C "${repo_root}" rev-parse HEAD >/dev/null 2>&1; then
        echo "# From commit: $(git -C "${repo_root}" rev-parse HEAD)"
        echo "# From tag(s): $(git -C "${repo_root}" tag --points-at HEAD | paste -sd ' ')"
        echo "# Branch: $(git -C "${repo_root}" branch --show-current)"
    fi
    echo "#"
    echo "# See ../DISTRIBUTION.md in the source repo for the consumption recipe."
} > "${dest}/.workshop-distribution-info"

# Summary.
echo ""
echo "build-workshop-distribution: done."
echo "  output:  ${dest}"
echo "  size:    $(du -sh "${dest}" | cut -f1)"
echo "  files:   $(find "${dest}" -type f | wc -l)"
echo ""
echo "To deploy to each participant's coder PVC, rsync this directory:"
echo "  rsync -avh --delete ${dest}/ <coder-pvc-mount>/workshop/"
