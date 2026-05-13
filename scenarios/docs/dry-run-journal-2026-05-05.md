# Workshop dry-run journal, 2026-05-05

**Operator:** Clément Raussin
**Environment:** local kind cluster `kagent-workshop`, kagent v0.9.0 (`--profile demo`), OpenAI provider.
**Branch / HEAD:** `main` @ `c04569a`.
**Reference:** NFR-003 reproduction, STORY-028 (M5 dry-run). Absorbs the cross-author repro ACs deferred on STORY-014 / 017 / 031 / 032 / 033.

## Goal

Walk UC0 → UC4 as a participant. Capture every friction (broken step, scary error, unclear prose, missing artefact). No fix in this journal; triage to stories, convention updates, or bundled commits happens at the end of the walk-through.

## Severity legend

- `info` : observation, no action needed.
- `nit` : small polish (typo, prose tweak).
- `issue` : degrades the participant UX, needs a story or fix.
- `blocker` : tour cannot proceed without a fix.

## Cross-cutting observations

| Time | Severity | Observation | Proposed action |
|------|----------|-------------|-----------------|
| 16:30 | nit | Operator style preference: no em dashes (`—`, U+2014) in any new prose (tour text, README bodies, commit messages, journal entries). Use commas, colons, parentheses, semicolons, or sentence breaks. | Memory saved (`feedback_em_dash`). Going forward, all generated prose drops em dashes. Existing repo content (UC titles, shipped convention bodies, story docs) is not retroactively scrubbed unless explicitly asked. |
| 16:42 | issue | Tour `explanation` blocks are too dense. Too much prose around what the participant is supposed to do or has just done, the actionable bits (commands, expected output cues, post-mortem) get drowned. The participant has to read a paragraph to find the next click. Across UCs the same pattern repeats: lore framing + mechanism explanation + rationale, all crammed into the explanation. | Convention update at triage. Rule: tour `explanation` is a tight pedagogical lead, not a doc body. Suggested structure per beat: 1 short sentence framing the action, then a bulleted list of what to look at or expect, then maybe one sentence of payoff or caveat. Background / rationale lives in the UC README's Author notes. Could also enforce a soft length cap (e.g. ~80 words per explanation, with overflow flagged in PR review). Spawn `STORY-042` (tour explanation density pass + convention rule) at triage. |

## UC0, Install kagent

| Time | Step | Severity | Observation | Proposed action |
|------|------|----------|-------------|-----------------|
| 16:30 | After Step 3 (Verify the installation) | issue | UC0 ends with `kubectl` checks but the participant never sees the kagent dashboard for themselves. UC1 then jumps straight into "open the dashboard and chat", which can feel abrupt. Want a final step that explicitly opens the dashboard from VS Code (click the tour command button) so the participant gets a visual confirmation that the install worked. | Add a Step 4 to `uc0/tour.json`: a single command that opens the dashboard (`kagent dashboard` or button-based opener), with prose telling the participant to click the run button in the tour pane and observe the UI loading in their browser. Spawn `STORY-036` (UC0 dashboard bridge step) at triage. |

## UC1, ImagePullBackOff

| Time | Step | Severity | Observation | Proposed action |
|------|------|----------|-------------|-----------------|
| 16:31 | Beat 2 (Mission status check) and broader narrative | issue | Lore prose is fun and lands, but the tech tutorial signal could be tighter. Once the friction is observed (pod not Running), the prose should also name the user-visible impact in tutorial terms, e.g. "an Artemis crew member tried to reach mission-control and got an inaccessible response", then return to the lore. Stays a tech tutorial, just bridges to it cleanly. | Light prose tightening across Beat 2 in UC1+ (and the Mission status check beat in general). Either bundle into `STORY-037` (UC1 prose tightening for tech signal) or apply as a small direct commit if the change is mechanical. Possibly a convention rule addendum: "Beat 2 names a user-visible symptom alongside the lore". |
| 16:32 | Beat 3 (Call the agent for help) | issue | Beat 3 is too compressed for the workshop's first agent invocation. One step that says "open dashboard, paste prompt" skips the discovery the participant needs. Proposed multi-step sequence: <br><br> (a) Explore the agent in the dashboard, hit the "edit" button to see its config (model, tools, prompt). <br> (b) `kubectl` parity check: `kubectl get agents -A` then `kubectl get agent <name> -n <ns> -o yaml`. Same config as the UI, just in CRD form. Demonstrates the equivalence between dashboard view and CRD source of truth. <br> (c) Open the agent's chat surface, say hello first (politeness anchor for the participant). <br> (d) Paste the precise diagnostic prompt so the agent finds the bug. <br> (e) Follow-up verification prompt to confirm the fix worked. <br> (f) Open question: can the agent apply the fix itself (image tag update) instead of the participant editing the deployment by hand? Spike required on the agent's write capabilities. If too painful, drop this step; otherwise it becomes the wow moment. | Convention update: allow Beat 3 to be multi-step for pedagogically rich UCs (currently the convention pins Beat 3 at exactly 1 step). Spawn `STORY-038` (UC1 Beat 3 expansion) covering (a) through (e) at minimum, with (f) as a separate spike-then-decide sub-task. |

## UC2, Pod Pending (CPU request)

| Time | Step | Severity | Observation | Proposed action |
|------|------|----------|-------------|-----------------|
| 16:38 | Beat 3 (Call the agent for help, CLI invoke variant) | issue | `kagent invoke --agent ... --task '...'` dumps the full A2A Task JSON: `artifacts`, `contextId`, the entire `history` (every tool call + every tool response), `metadata`, `status`. The actual one-sentence diagnosis is buried at the very bottom inside `artifacts[0].parts[0].text`. From a terminal-reader perspective the output is a wall of JSON, the participant either misses the answer or fights the output for a minute. Also raises a meta question: what realistic ops scenario actually uses `kagent invoke` raw on the terminal like this? More likely scripted (pipe to `jq`, automation) than interactive. Today's UC2 Beat 3 promises "operational CLI parity with UC1's chat" but the output mostly disproves the promise. | Two paths to pick at triage. (a) Tactical fix: pipe the invocation through `jq` to extract only the final answer, e.g. `kagent invoke ... \| jq -r '.artifacts[0].parts[-1].text'`. Keeps the "CLI is a real path" pedagogy but makes the output usable. Optionally a second command that prints the JSON for the curious. (b) Strategic rethink: drop raw `kagent invoke` from UC2 Beat 3 and replace with a realistic scripted use case (e.g. "an on-call script that pipes the diagnosis into a Slack/email/log", or batch mode over multiple namespaces). Updates the convention's "CLI invoke variant" definition if we go (b). Spawn `STORY-039` (UC2 Beat 3 CLI output) at triage. |

## UC3, OOMKilled + Grafana

| Time | Step | Severity | Observation | Proposed action |
|------|------|----------|-------------|-----------------|
| 16:39 | Beat 4 (`What we'd have done by hand` or wherever the dashboard URL surfaces) | issue | The agent returns a dashboard URL of the form `http://localhost:8082/agents/kagent/artemis-rover-telemetry-debugger/chat/d/efly2rk3j9xc0b/4167a0a`. Clicking gives a 404. The URL embeds a Grafana dashboard id (`efly2rk3j9xc0b`) inside what looks like a kagent chat path; the kagent UI doesn't proxy or redirect to Grafana on this kind setup. Working around with `kubectl port-forward` to Grafana directly: the dashboard is reachable that way. So the dashboard exists in Grafana, the URL synthesis in the agent's response is just wrong (or assumes a topology the kind env doesn't satisfy). | Likely the `kagent-grafana-mcp` tool composes the URL with the kagent UI as base. Two fixes. (a) Patch the tool / its config to emit a direct Grafana URL (`http://localhost:<grafana-port>/d/<dashboard-id>/...`) and add a port-forward command to the tour so the link is clickable as-is. (b) Add an explicit "port-forward Grafana" step to UC3 Beat 1 or Beat 4 with an explanatory note ("on workshop slices this is handled by ingress; on kind you forward manually"). Spawn `STORY-040` (UC3 Grafana URL fix or port-forward step) at triage. |
| 16:40 | UC3 dashboard content (after manual port-forward) | blocker | Grafana is up, the dashboard is created by the agent, but every panel is empty: no data. The whole UC3 demonstration (see the leak grow in the dashboard, observe the OOMKill correlation) falls flat. Suspects, ranked: (1) Prometheus isn't scraping the `lunar-rover-telemetry` pod (missing ServiceMonitor / wrong labels / wrong port); (2) the agent's dashboard PromQL doesn't match any live series (e.g. metric name drift between the app and the query); (3) the time window of the dashboard is wider than the leak window so the data exists but isn't visible at the default range. | Diagnose by hand at triage. `kubectl get servicemonitor -A` to verify the scrape config, then the Prometheus UI (`/graph`) to check the series exists, then the dashboard PromQL vs. the actual metric names exposed by the rover-telemetry container. Blocker because UC3 pedagogically depends on a populated dashboard; without it the participant has nothing to see. Spawn `STORY-041` (UC3 dashboard data pipeline) at triage; if the root cause is in the agent's tool config, that's the patch surface, otherwise it's a ServiceMonitor / scrape config fix in `infra/observability/`. |

## UC4, Multi-agent coordinator + custom MCP

| Time | Step | Severity | Observation | Proposed action |
|------|------|----------|-------------|-----------------|
| 16:45 | Beat 1, first command `kmcp build ... -t registry.workshop.qcs.ovh/$WORKSHOP_PARTICIPANT_LOGIN/artemis-bulb-mcp:v0.1.0 --push` | blocker | `$WORKSHOP_PARTICIPANT_LOGIN` is unset on local kind, the tag interpolates to `registry.workshop.qcs.ovh//artemis-bulb-mcp:v0.1.0` (double slash), Docker rejects with `invalid reference format`. Tour stops dead at step 1. The variable is provided by `workshop-infrastructure` on the participant slice; on kind / local it is the author's responsibility. Currently nothing in the tour or README signals that. | Three options at triage. (a) Defensive check in Beat 1: refuse to proceed if `WORKSHOP_PARTICIPANT_LOGIN` is empty, print a one-liner with a suggested default (`export WORKSHOP_PARTICIPANT_LOGIN=dryrun`). (b) Inline fallback in the command: `${WORKSHOP_PARTICIPANT_LOGIN:-dryrun}` directly in the tag. (c) Prepend a "set the variable" step to the tour and document the prereq in `uc4/README.md`. Spawn `STORY-043` (UC4 WORKSHOP_PARTICIPANT_LOGIN prereq) at triage, blocker priority. |
| 16:46 | UC4 intro + Beat 1 explanation | issue | Even before the failed command, the intro and Beat 1 explanation are heavy. The participant has to wade through a long paragraph before getting to the action. Reinforces the cross-cutting density issue (16:42). UC4 is the workshop climax: prose load matters more here than anywhere else. | Treat as a UC4 instance of the cross-cutting density rule. Bundle into `STORY-042` (tour explanation density pass), priority UC4 first then UC1 to UC3. |

## Summary

11 observations logged across 1 cross-cutting bucket and 5 UCs (UC4 walk-through cut short at Beat 1 by `STORY-043`'s blocker; UC4 downstream coverage will resume once that story closes).

- `blocker`: 2 (UC3 dashboard data pipeline, UC4 env var prereq).
- `issue`: 6 (UC0 dashboard bridge, UC1 framing tightening, UC1 Beat 3 expansion, UC2 CLI output, UC3 Grafana URL, tour density cross-cutting).
- `nit`: 1 (no em dashes preference, saved to memory).
- `info`: 0.

## Follow-ups / triage

Triage closed on 2026-05-05. Each observation promoted as follows; eight new stories created in **Sprint 6 / M6** (post-dry-run patch sprint, 2026-05-06 → 2026-05-15, 26 pts committed, 30 pts capacity).

| Source row | Severity | Promoted to | Title |
|------------|----------|-------------|-------|
| Cross-cutting 16:30 | nit | feedback memory (no story) | `feedback_em_dash` saved; applied to all generated prose going forward; existing repo prose not retro-scrubbed. |
| Cross-cutting 16:42 + UC4 16:46 | issue | [`STORY-042`](stories/STORY-042.md) | Tour explanation density convention rule + density pass across all 5 UCs. |
| UC0 16:30 | issue | [`STORY-036`](stories/STORY-036.md) | UC0 dashboard bridge step (add step 4 that opens the kagent dashboard). |
| UC1 16:31 | issue | [`STORY-037`](stories/STORY-037.md) | UC1 framing: name the user-visible symptom alongside the lore (also touches UC2). |
| UC1 16:32 | issue | [`STORY-038`](stories/STORY-038.md) | UC1 Beat 3 expansion (UI explore, kubectl parity, chat, verify, optional self-fix spike). |
| UC2 16:38 | issue | [`STORY-039`](stories/STORY-039.md) | UC2 Beat 3 CLI output (pipe to jq or refit to a realistic scripted scenario). |
| UC3 16:39 | issue | [`STORY-040`](stories/STORY-040.md) | UC3 Grafana dashboard URL fix or port-forward step. |
| UC3 16:40 | **blocker** | [`STORY-041`](stories/STORY-041.md) | UC3 dashboard data pipeline (empty panels). |
| UC4 16:45 | **blocker** | [`STORY-043`](stories/STORY-043.md) | UC4 `WORKSHOP_PARTICIPANT_LOGIN` prereq hardening. |

### Sprint 6 priority queue

1. **`STORY-041`** (UC3 data pipeline) and **`STORY-043`** (UC4 env var) first: both blockers, gate the rest of the dry-run.
2. **`STORY-036`** (UC0 dashboard) and **`STORY-040`** (UC3 URL) next: small, unblock visible payoff.
3. **`STORY-042`** (density pass) in parallel with **`STORY-037`**, **`STORY-038`**, **`STORY-039`** (UC-specific prose touches) so the density convention rule lands together with its application.

### Resumption plan

Once `STORY-043` lands, resume the dry-run journal at UC4 Beat 1 with a fresh kind cluster (`scripts/reset-kind.sh` → `make uc0-up` → walk UC0 → UC1 → UC2 → UC3 → UC4). Any new findings get appended to this journal under each UC's section with a fresh timestamp; the triage process repeats.
