#!/usr/bin/env bash
# Copy every uc*/tour.json into .workshop-tour/, ordered, named ucN-tour.json.
# Existing .workshop-tour/*.json files are removed first so the destination
# reflects exactly the UCs present in the repo.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dest="${repo_root}/.workshop-tour"

mkdir -p "${dest}"
rm -f "${dest}"/*.json

shopt -s nullglob
tours=("${repo_root}"/uc*/tour.json)
shopt -u nullglob

if (( ${#tours[@]} == 0 )); then
    echo "sync-workshop-tour: no uc*/tour.json found — nothing to copy."
    exit 0
fi

IFS=$'\n' tours=($(printf '%s\n' "${tours[@]}" | sort -V))
unset IFS

for src in "${tours[@]}"; do
    uc_dir="$(basename "$(dirname "${src}")")"
    if [[ ! "${uc_dir}" =~ ^uc[0-9]+$ ]]; then
        echo "sync-workshop-tour: skipping unexpected path '${src}'." >&2
        continue
    fi
    out="${dest}/${uc_dir}-tour.json"
    cp -f "${src}" "${out}"
    echo "sync-workshop-tour: ${uc_dir}/tour.json → .workshop-tour/${uc_dir}-tour.json"
done
