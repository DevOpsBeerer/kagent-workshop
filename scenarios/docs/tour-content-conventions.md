# Tour content conventions

**Source of truth** for the structure of every `uc<N>/tour.json` in this repo. Every tour story (STORY-013 / 016 / 020 / 026 / 031 / 032) cites FR-006; this doc is the operational form of that FR.

> Workshop participants do not read this doc. They follow the rendered tour in their VS Code workshop-tour extension. This doc is for the two repo authors writing those tours.

## Why this convention

Business objective #3 from the product brief is **"render the value of an agent vs. a kubectl-only workflow visible to the participant"**. The convention below is what makes that visibility measurable.

The participant must reach the moment of friction *before* knowing the answer. If the tour announces the bug in step 1, the agent's payoff disappears: by the time they invoke the agent, they already know what's wrong. The workshop's central demonstration — *one synthesis instead of N commands* — only lands when the friction is **discovered**, not **declared**.

Each tour therefore frames the scenario as an Artemis mission the participant is operating, not as a debug exercise the tour walks them through. The bug is real, the cluster's evidence is honest, but the prose never pre-announces it.

## The 4 beats

Every `uc<N>/tour.json` has these four beats in order. Beat 1 is exactly one step; Beat 2 is one or more steps (UC2 uses two, UC3 typically uses two or three); Beats 3 and 4 are exactly one step each. UC4 is allowed to compress Beat 2 — by the time the participant reaches UC4 they have already lived UC1/UC2/UC3 manually, so the multi-symptom mess **is** the friction.

```
[Mission setup] ──► [Mission status check] ──► [Call the agent] ──► [Manual recap]
   1 step              1..N steps                 exactly 1 step       exactly 1 step
```

| Beat | Title shape                                          | Purpose                                                                                                                            | What goes inside `commands` / `fileEdits`                                                                                                                                                  |
| ---- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1    | `Mission setup — …`                                  | Frame the deployment as an Artemis mission objective. **No mention of what is wrong.** Drop manifests via `fileEdits` and apply.   | `fileEdits.create` (`overwrite: true`) for all `uc<N>/manifests/*.yaml`; `commands[]` with one `kubectl apply -f uc<N>/manifests/`.                                                       |
| 2    | `Mission status check — …`                           | Walk the participant through the manual diagnosis as if checking on a live mission. Friction emerges naturally — pod is not Running, mission at risk. | `commands[]` with each `kubectl` invocation as one button. Multiple steps allowed (UC2/UC3 typically 2–3).                                                                                  |
| 3    | `Call the agent for help` (UI/chat or CLI invoke)    | Hand the problem to the kagent agent. UC1 = **UI/chat** (open dashboard, paste prompt). UC2/UC4 = **CLI invoke**. UC3 hybrid.       | UC1: one `commands[]` entry that opens the kagent UI, plus a markdown block with the exact prompt to paste. UC2/UC4: one `kagent invoke …` entry.                                          |
| 4    | `What we'd have done by hand`                        | Manual recap. List the `kubectl` commands the agent ran on the participant's behalf, framed as friction-the-participant-skipped.   | No `commands[]`, no `fileEdits` — pure markdown.                                                                                                                                            |

The titles can be lightly Artemis-themed (e.g. `Mission setup — bring today's roster online`) but must keep the beat label recognisable. The `workshop-tour` extension renders the titles verbatim.

The 4-beat is a **refinement** of the 3-step *kubectl-way → agent-way → contrast* claim in PRD §147, not a contradiction: Beat 1 is the silent prelude added in front, Beats 2–4 are the renamed CLI baseline / agent step / contrast.

## The no-spoiler rule

Beat 1's `explanation` describes what the deployment is *meant* to do, never what is *wrong* with it. Banned vocabulary in Beat 1: `broken`, `deliberately`, `intentionally`, `synthetic`, `fault`, `bug`, `wrong`, `error`, `fail`, `unsafe`, `blocked`, `taint`. Concrete bug specifics (image-tag values like `:v999`, taint keys, etc.) are off-limits in Beat 1.

The cluster will tell the truth if the participant asks it. A curious participant who runs `kubectl get jobs -n artemis-uc2` mid-tour will discover the bootstrap Job exists; that's acceptable — it does not invalidate the diagnostic exercise (the participant still has to find the taint on the node and connect it to the Pending pod). The rule applies to **tour content**, not to cluster state.

The same rule extends to the YAML *body* the participant doesn't read but might glance at: keep technical-intent comments inside `uc<N>/manifests/*.yaml` for authors (they are essential context for repo maintenance), and rely on the convention plus the no-spoiler rule on the **tour text** to keep the narrative arc honest.

**Bad** — current `uc1/tour.json` step 1 (slated for replacement by STORY-031):

> "the **deployment.yaml** intentionally references a tag that never shipped (`mission-control:v999`), so this will reproduce the on-call ticket you're about to investigate."

**Good** — target replacement (STORY-031 will deliver):

> "Mission control is bringing today's on-shift roster online for the Artemis pad shift. Apply the manifests below to deploy `mission-control` to your vCluster — namespace, service, deployment. Once the apply completes, the roster should be reachable."

## Beat 3 invocation: UI/chat vs CLI invoke

Beat 3 has exactly one step. The UC declares **one** invocation mode:

- **UI/chat** — the participant opens the kagent web dashboard and pastes the prompt into the chat surface. Used by **UC1** as the participant's first contact with kagent.
- **CLI invoke** — the participant runs `kagent invoke --agent <name> --namespace <ns> --task '<prompt>'` from the terminal. Used by **UC2** and **UC4** to demonstrate that kagent is also addressable from the operational CLI ops already use.
- **Hybrid** — UC3 may combine UI/chat with auxiliary surfaces (the agent-generated Grafana dashboard URL is opened by the participant in retrospect). Beat 3 still resolves to one declared step; the dashboard URL surfaces in Beat 4.

### UI/chat variant (UC1)

The Beat 3 step contains exactly one `commands[]` entry that opens the kagent dashboard, and the step's `explanation` includes a fenced markdown block with the exact prompt to paste. The tour story (STORY-031) freezes the exact form: a kagent CLI dashboard helper if v0.9.0 ships one that backgrounds cleanly, otherwise a `kubectl port-forward -n kagent svc/kagent-ui … &` chained with `open http://localhost:…` to honour NFR-010 *self-contained step*. Whichever wins, document the choice in a one-line comment in the step's `explanation` so future authors know.

Example prompt block:

> The mission-control pod in the artemis-uc1 namespace is not coming up. Diagnose it.

The participant reads the agent's response in the chat surface. The step does not capture stdout.

### CLI invoke variant (UC2, UC4)

The Beat 3 step contains exactly one `commands[]` entry of the form:

```
kagent invoke --agent <agent-name> --namespace <ns> --task '<prompt>'
```

The agent's response prints to the terminal. The step's `explanation` should still surface the prompt for transparency (markdown block), even though the prompt is also embedded in the command — this lets the participant copy-paste-modify if they want to re-run the agent with a different question.

## Manual recap (Beat 4)

Beat 4 is pure markdown — no `commands[]`, no `fileEdits`. It enumerates the `kubectl` commands the agent ran on the participant's behalf, framed as **friction the participant skipped**. The same evidence the agent joined is named, the same contrast is drawn, but the rhetoric flips from *describing what the agent did* to *describing what the participant did not have to do*.

The lift is rhetorical, not technical: the same evidence is named, the same contrast is drawn. The friction is now the *protagonist the participant skipped* rather than *the achievement of the agent*. Multiplied across the dozen incidents an on-call rotation handles in a week, that's the value the workshop is selling.

UC1 worked example prose (matches what STORY-031 will deliver) appears in [Worked example](#worked-example-uc1--imagepullbackoff) below.

## Tour-level structure

Locked across all four UCs:

```json
{
  "id":          "kagent-uc<N>-<symptom>",
  "title":       "<Artemis-themed scenario title>",
  "description": "<one-sentence summary>",
  "steps":       [ /* the 4 beats above, expanded */ ]
}
```

| Field         | Convention                                                                                            | Example                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `id`          | `kagent-uc<N>-<symptom>` — kebab-case, stable, never reused. Locked per-UC in the root README's UC index. | `kagent-uc1-imagepullbackoff`, `kagent-uc4-coordinator`                                  |
| `title`       | Artemis-themed; ≤ 80 chars; English (NFR-009).                                                        | "UC1 — Mission control's roster fails to come online"                                    |
| `description` | One sentence summarising the diagnostic target and the agent's role. May reference what the agent corrects in retrospect, but Beat 1's body still owes no spoiler. | "Diagnose an `ImagePullBackOff` on the Artemis mission-control deployment with the help of `artemis-mission-control-debugger`."  |
| `steps[]`     | The 4 beats, expanded as needed. Minimum 4 step objects; UC2/UC3 typically 5–6 (Beat 2 multi-step).   | see worked example below                                                                  |

## Worked example (UC1 — `ImagePullBackOff`)

The fragments below are the four beats as they will appear in `uc1/tour.json` after STORY-031 lands. They validate against `schemas/workshop-tour.schema.json` (`make validate-tours` clean). For brevity the Beat 1 `fileEdits` array is summarised — STORY-031 lifts the exact contents of the M2 `uc1/tour.json` (`uc1/manifests/00-namespace.yaml`, `10-service.yaml`, `20-deployment.yaml` with `overwrite: true`) verbatim into the new step. The manifest contents do not change.

### Beat 1 — Mission setup (1 step)

```json
{
  "title": "Mission setup — bring today's roster online",
  "explanation": "Mission control is bringing today's on-shift roster online for the Artemis pad shift. Apply the manifests below to deploy `mission-control` to your vCluster — namespace, service, deployment. Once the apply completes, the roster should be reachable on the cluster.\n\nThe three files are dropped into your workspace by this step (`fileEdits`), then applied with a single `kubectl apply -f`.",
  "fileEdits": [
    { "type": "create", "path": "uc1/manifests/00-namespace.yaml",  "overwrite": true, "content": "<namespace yaml — identical to M2>" },
    { "type": "create", "path": "uc1/manifests/10-service.yaml",    "overwrite": true, "content": "<service yaml — identical to M2>" },
    { "type": "create", "path": "uc1/manifests/20-deployment.yaml", "overwrite": true, "content": "<deployment yaml — identical to M2>" }
  ],
  "commands": [
    { "label": "Apply the manifests", "command": "kubectl apply -f uc1/manifests/" }
  ]
}
```

### Beat 2 — Mission status check (1 step)

```json
{
  "title": "Mission status check — listen to mission-control",
  "explanation": "Mission control should be online by now. Verify by walking the usual on-call sweep — pod state, container status, recent events. Run the three commands below in order. Give the kubelet ~30 s to settle before checking the pod state.",
  "commands": [
    { "label": "List pods",        "command": "kubectl get pods -n artemis-uc1" },
    { "label": "Describe the pod", "command": "kubectl describe pod -n artemis-uc1 -l app=mission-control" },
    { "label": "Recent events",    "command": "kubectl get events -n artemis-uc1 --sort-by=.lastTimestamp" }
  ]
}
```

### Beat 3 — Call the agent for help (UI/chat, exactly 1 step)

```json
{
  "title": "Call the agent for help",
  "explanation": "The roster is stuck and the pad shift starts soon. Hand the diagnosis to **`artemis-mission-control-debugger`** in the kagent dashboard. Run the command below to open the dashboard, then paste the prompt into the chat surface:\n\n> The mission-control pod in the artemis-uc1 namespace is not coming up. Diagnose it.\n\nThe agent has the same Kubernetes read tools you used above (`get pod`, `describe pod`, `get events`) — the difference is that it correlates them in one synthesis. Read the agent's response directly in the chat.",
  "commands": [
    { "label": "Open the kagent dashboard", "command": "<frozen by STORY-031 spike — see Beat 3 invocation section>" }
  ]
}
```

### Beat 4 — What we'd have done by hand (exactly 1 step)

```json
{
  "title": "What we'd have done by hand",
  "explanation": "If you had done this manually, you would have typed three commands:\n\n```bash\nkubectl get pods -n artemis-uc1\nkubectl describe pod -n artemis-uc1 -l app=mission-control\nkubectl get events -n artemis-uc1 --sort-by=.lastTimestamp\n```\n\n…and joined three pieces of evidence yourself: the pod's `Waiting` phase, the container's `ImagePullBackOff` reason, and the kubelet's repeated pull-failed events. The agent ran the same three tools and returned a single sentence of root cause: **the deploy targets `mission-control:v999`, which was never published**. You didn't type those three commands.\n\nMultiplied across the dozen incidents an on-call rotation handles in a week, that's the value the workshop is selling. UC2 will scale this up to multi-resource correlation; UC3 to external observability; UC4 to multi-agent fan-out."
}
```

## Cross-cutting rules

- **Self-contained steps (NFR-010).** Every `commands[]` entry must run as-is in the participant's VS Code server terminal: `kubectl` and the `kagent` CLI are on `PATH`, kubeconfig is pre-wired to the participant's vCluster slice. No "first set `KUBECONFIG=…`" preconditions outside what the step itself does. If a step needs an env value, set it inside the step's `commands[]` (e.g. `KUBECONFIG=… kubectl …`) or apply it via `fileEdits`.
- **English copy (NFR-009).** All `title` and `explanation` text is English. No translation pipeline ships with the workshop.
- **No hidden state across steps.** A later step must not rely on a shell variable set by an earlier step's `commands` (each command runs independently in the workshop-tour extension).
- **`fileEdits` are committed-state-aware.** A `create` with `overwrite: false` (the default) errors if the file exists. Beat 1's manifest drops use `overwrite: true` and explain why in the step's `explanation`.
- **Markdown in `explanation`.** Headings, lists, fenced code blocks all render. Inline code with backticks is the right choice for resource names — keeps the Artemis vocabulary consistent with `docs/artemis-naming.md`.
- **No secrets.** No login, token, kubeconfig, or LLM credential anywhere in `commands` or `fileEdits.content`. `gitleaks` is wired to fail PR CI on any leak (NFR-011, STORY-011).
- **Tour ID is stable.** Once a `uc<N>/tour.json` ships its `id`, that string lives in `workshop-infrastructure`'s distribution config and in the participant's `.workshop-tour/state.json`. Never rename — only the tour's content evolves.

## Validation

`make validate-tours` (root `Makefile`) runs `ajv-cli` against `schemas/workshop-tour.schema.json` over every `uc<N>/tour.json`. CI blocks merge on any violation. Run it locally before opening a PR.

```bash
make validate-tours
# → validate-tours: validating N tour file(s) against schemas/workshop-tour.schema.json
```

The schema is structural (it constrains `id`, `title`, `description`, `steps[]` shapes) and **does not** enforce the 4-beat narrative. Beat ordering, no-spoiler rule, invocation variant, and manual recap framing are checked by **author cross-review** at PR time (NFR-008), not by the schema.

## Quick checklist for a new tour story

When implementing STORY-013 / 016 / 020 / 026 / 031 / 032 (or any future tour):

- [ ] `id` matches the locked value in the root README's UC index.
- [ ] `title` is Artemis-themed and ≤ 80 chars.
- [ ] **Beat 1 — `Mission setup — …`** is exactly one step. The explanation contains none of the banned words (`broken`, `deliberately`, `intentionally`, `synthetic`, `fault`, `bug`, `wrong`, `error`, `fail`, `unsafe`, `blocked`, `taint`) and no concrete bug specifics (image tags, taint keys, etc.). The deployment is framed as a mission objective.
- [ ] **Beat 2 — `Mission status check — …`** is one or more steps. Copy frames each as a status verification; the friction is *discovered*, not announced.
- [ ] **Beat 3 — `Call the agent for help`** is exactly one step. The UC's invocation variant (UI/chat vs CLI invoke vs hybrid) is declared in the step explanation, and the exact prompt to paste/run is surfaced as a markdown block.
- [ ] **Beat 4 — `What we'd have done by hand`** is exactly one step. No `commands[]`, no `fileEdits`. The recap names the manual `kubectl` commands as friction the participant skipped.
- [ ] Every `commands[].command` runs as-is in the VS Code server terminal (NFR-010).
- [ ] All copy is English (NFR-009).
- [ ] `make validate-tours` clean on a local run.
- [ ] No secrets anywhere in `commands` or `fileEdits.content` (NFR-011).
- [ ] PR cross-reviewed by the other author before merge (NFR-008).
