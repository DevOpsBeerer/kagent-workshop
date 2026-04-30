# Tour content conventions

**Source of truth** for the structure of every `uc<N>/tour.json` in this repo. Every tour story (STORY-013 / 016 / 020 / 026) cites FR-006; this doc is the operational form of that FR.

> Workshop participants do not read this doc. They follow the rendered tour in their VS Code workshop-tour extension. This doc is for the two repo authors writing those tours.

## Why this convention

Business objective #3 from the product brief is **"render the value of an agent vs. a kubectl-only workflow visible to the participant"**. The convention below is what makes that visibility measurable: every tour contains both modes side-by-side, in the same scenario, on the same cluster, with the same evidence — so the participant feels the friction of one approach and the relief of the other in the same minute.

If the agent goes first, the contrast disappears. If the CLI baseline goes alone, the participant only learns kubectl.

## The 3 beats

Every `uc<N>/tour.json` has exactly these three beats. They can each span multiple `steps[]` entries — UC2 and UC3 typically use 2–3 CLI-baseline steps because the manual diagnosis takes more than one command. UC4 collapses the CLI baseline because the multi-symptom mess **is** the friction (the participant has already lived through UC1/UC2/UC3 manually).

```
[CLI baseline ──► Now ask the agent ──► What did the agent do better?]
   1..N steps        exactly 1 step             exactly 1 step
```

| Beat | Title shape (literal or close)                          | Purpose                                                                                                                | What goes inside `commands` / `fileEdits`                                                                  |
| ---- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1    | `CLI baseline — …`                                      | Walk the participant through the manual diagnosis. Friction is the point — this is the "before" picture.               | `commands[]` with each `kubectl` invocation as one button. UC1's tour also `fileEdits.create`s `uc1/manifests/deployment.yaml` to apply the broken state. |
| 2    | `Now ask the agent`                                     | Hand the same problem to the kagent agent and let it work. Single invocation, one synthesis.                           | One `commands[]` entry: `kagent invoke <agent-name> --message '<question>'`. UC4 invokes the coordinator. |
| 3    | `What did the agent do better?`                         | Name the contrast in plain language. Time saved, correlation done, dashboard auto-generated, multi-agent fan-out, etc. | No `commands` or `fileEdits` — pure `explanation` markdown.                                                |

The titles can be lightly Artemis-themed (e.g. `CLI baseline — listen to mission-control`) but must keep the beat label recognisable. The `workshop-tour` extension renders the titles verbatim.

## Tour-level structure

Locked across all four UCs:

```json
{
  "id":          "kagent-uc<N>-<symptom>",
  "title":       "<Artemis-themed scenario title>",
  "description": "<one-sentence summary>",
  "steps":       [ /* the 3 beats above, expanded */ ]
}
```

| Field         | Convention                                                                                            | Example                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `id`          | `kagent-uc<N>-<symptom>` — kebab-case, stable, never reused. Locked per-UC in the root README's UC index. | `kagent-uc1-imagepullbackoff`, `kagent-uc4-coordinator`                                  |
| `title`       | Artemis-themed; ≤ 80 chars; English (NFR-009).                                                        | "Mission control's roster fails to come online"                                          |
| `description` | One sentence summarising the diagnostic target and the agent's role.                                  | "Diagnose an `ImagePullBackOff` on the Artemis mission-control deployment with the help of `artemis-mission-control-debugger`." |
| `steps[]`     | The 3 beats, expanded as needed. Minimum 3 step objects; UC2/UC3 typically 5–6.                       | see below                                                                                |

## Worked example (UC1 — `ImagePullBackOff`)

The fragment below is what the three beats look like inside `uc1/tour.json`. It validates against `schemas/workshop-tour.schema.json` (`make validate-tours` clean) and is the M2 starting point for STORY-013.

### Beat 1 — CLI baseline (1 step)

```json
{
  "title": "CLI baseline — listen to mission-control",
  "explanation": "Mission control's deploy never came up. Run the three commands below in order. Notice that you'll be holding three separate pieces of evidence — the pod's phase, the failing container's reason, and the recent events — and you'll have to piece them together yourself before you can name a root cause.",
  "commands": [
    { "label": "List pods",        "command": "kubectl get pods -n artemis-uc1" },
    { "label": "Describe the pod", "command": "kubectl describe pod -n artemis-uc1 -l app=mission-control" },
    { "label": "Recent events",    "command": "kubectl get events -n artemis-uc1 --sort-by=.lastTimestamp" }
  ]
}
```

### Beat 2 — Now ask the agent (exactly 1 step)

```json
{
  "title": "Now ask the agent",
  "explanation": "Hand the same problem to `artemis-mission-control-debugger`. The agent has the same tools the CLI exposed (`get pod`, `describe pod`, `get events`) — the difference is that it correlates them for you and synthesises a single statement of root cause.",
  "commands": [
    {
      "label": "Ask the agent",
      "command": "kagent invoke artemis-mission-control-debugger --message 'The mission-control pod in the artemis-uc1 namespace is not coming up. Diagnose it.'"
    }
  ]
}
```

### Beat 3 — Contrast recap (exactly 1 step)

```json
{
  "title": "What did the agent do better?",
  "explanation": "In the CLI baseline you ran three commands and had to combine the pod's `Waiting` phase, the container's `ImagePullBackOff` reason, and the kubelet's repeated pull-failed events to reach a verdict — three pieces of state, mentally joined. The agent ran the same three tools and returned a single sentence: `the deploy targets mission-control:v999, which was never published`. Multiply that saving by the dozen incidents an on-call rotation sees in a week — that's the value proposition the workshop is selling."
}
```

## Cross-cutting rules

- **Self-contained steps (NFR-010).** Every `commands[]` entry must run as-is in the participant's VS Code server terminal: `kubectl` and the `kagent` CLI are on `PATH`, kubeconfig is pre-wired to the participant's vCluster slice. No "first set `KUBECONFIG=…`" or "first export `LOGIN=…`" preconditions outside what the step itself does. If a step needs an env value, set it inside the step's `commands[]` (e.g. `KUBECONFIG=… kubectl …`) or apply it via `fileEdits`.
- **English copy (NFR-009).** All `title` and `explanation` text is English. No translation pipeline ships with the workshop.
- **No hidden state across steps.** A later step must not rely on a shell variable set by an earlier step's `commands` (each command runs independently in the workshop-tour extension).
- **`fileEdits` are committed-state-aware.** A `create` with `overwrite: false` (the default) errors if the file exists — used in UC1 step 1 to apply `uc1/manifests/deployment.yaml`. Use `overwrite: true` only when intentionally clobbering, and explain why in the step's `explanation`.
- **Markdown in `explanation`.** Headings, lists, fenced code blocks all render. Inline code with backticks is the right choice for resource names — keeps the Artemis vocabulary consistent with `docs/artemis-naming.md`.
- **No secrets.** No login, token, kubeconfig, or LLM credential anywhere in `commands` or `fileEdits.content`. `gitleaks` is wired to fail PR CI on any leak (NFR-011, STORY-011).
- **Tour ID is stable.** Once a `uc<N>/tour.json` ships its `id`, that string lives in `workshop-infrastructure`'s distribution config and in the participant's `.workshop-tour/state.json`. Never rename — only the tour's content evolves.

## Validation

`make validate-tours` (root `Makefile`) runs `ajv-cli` against `schemas/workshop-tour.schema.json` over every `uc<N>/tour.json`. CI blocks merge on any violation. Run it locally before opening a PR.

```bash
make validate-tours
# → validate-tours: validating 4 tour file(s) against schemas/workshop-tour.schema.json
```

## Quick checklist for a new tour story

When implementing STORY-013 / 016 / 020 / 026:

- [ ] `id` matches the locked value in the root README's UC index.
- [ ] `title` is Artemis-themed and ≤ 80 chars.
- [ ] At least one `CLI baseline — …` step opens the tour.
- [ ] Exactly one `Now ask the agent` step in the middle.
- [ ] Exactly one `What did the agent do better?` step closes the tour.
- [ ] Every `commands[].command` runs as-is in the VS Code server terminal (NFR-010).
- [ ] All copy is English (NFR-009).
- [ ] `make validate-tours` clean on a local run.
- [ ] No secrets anywhere in `commands` or `fileEdits.content` (NFR-011).
