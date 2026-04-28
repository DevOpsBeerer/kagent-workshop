# Vendored schemas

External schemas this repo validates against. Copies are kept verbatim — never patched locally — so a re-vendor is a clean overwrite.

## `workshop-tour.schema.json`

The draft-07 JSON schema consumed by the `workshop-tour` VS Code extension. Every `uc<N>/tour.json` in this repo must validate against this file (FR-002).

| Field | Value |
|---|---|
| Source repo | [`workshop-vscode-ext/workshop-tour`](../../../workshop-vscode-ext/workshop-tour) (sibling project) |
| Source path | `.workshop-tour/tour.schema.json` |
| Source repo HEAD when vendored | `930e44e6f65f75a04eb756b00b01c20b287f5e0b` (branch `main`) |
| Content sha256 | `5d88eaeb10704571c839e168621ac11bb4f9647d2edbf25f447e919c1c65ce90` |
| Vendored on | 2026-04-28 |
| Vendored by | STORY-002 |

**Caveat — file untracked at source on this date.** When this schema was vendored, the source file was *not yet committed* in the `workshop-tour` repo (`git status` reported it as untracked). The provenance row above pins the source repo HEAD and the file's content sha256 instead of a per-file commit hash. When the sibling repo commits the schema, replace the HEAD row with the per-file commit hash and re-verify the sha256.

### Re-vendoring

```bash
cp ../../../workshop-vscode-ext/workshop-tour/.workshop-tour/tour.schema.json schemas/workshop-tour.schema.json
sha256sum schemas/workshop-tour.schema.json   # update this README
make validate-tours                           # ensure no UC tour broke
```

If the schema introduces breaking changes, every existing `uc<N>/tour.json` must be updated in the same change — `make validate-tours` is the gate.

## Validation

`make validate-tours` (root `Makefile`) runs `ajv-cli` against this schema over every `uc<N>/tour.json`. CI blocks merge on any violation.
