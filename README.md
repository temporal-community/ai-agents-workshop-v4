# AI Agents Python Workshop

A series of progressive demos that build an AI agent in Python using the [OpenAI Agents SDK](https://openai.github.io/openai-agents-python/) and [Temporal](https://temporal.io/) for durable execution. Each demo builds on the previous one, adding a single new capability so you can see what each Temporal primitive buys you.

Every demo is self-contained: its own `pyproject.toml`, its own task queue, its own worker. You can work through them in order, or jump into one that matches what you want to learn.

Each demo has two subfolders: `exercise/` (a few TODOs stubbed out for you to fill in — the one new capability that demo adds) and `solution/` (the finished, working version). Write your own code in `exercise/`; if you get stuck, diff it against `solution/` to see exactly what's different. This repo also doubles as the source for a hands-on Instruqt lab — see [`instruqt/`](instruqt/) for the track definition.

## Demos

| Demo | What's new | Read this first |
|---|---|---|
| [`demo1-agentic-loop`](demo1-agentic-loop/) | A hand-written agentic loop as a Temporal workflow. Calls OpenAI's Responses API from an activity, dispatches tools via a dynamic activity, loops until the model stops asking for tool calls. | [`demo1-agentic-loop/README.md`](demo1-agentic-loop/README.md) |
| [`demo2-openai-temporal-integration`](demo2-openai-temporal-integration/) | Same agent, reimplemented with the OpenAI Agents SDK and Temporal's `temporalio.contrib.openai_agents` plugin. The SDK's `Runner` drives the loop; Temporal makes every LLM call and tool call an activity automatically. Workflow becomes one-line. | [`demo2-openai-temporal-integration/README.md`](demo2-openai-temporal-integration/README.md) |
| [`demo3-mcp`](demo3-mcp/) | Adds an MCP (Model Context Protocol) tool server for Formula 1 race data. MCP operations are dispatched as Temporal activities via `StatelessMCPServerProvider`. The agent now chains F1 tools with weather tools. | [`demo3-mcp/README.md`](demo3-mcp/README.md) |
| [`demo4-hitl`](demo4-hitl/) | Human-in-the-loop. The agent can pause mid-execution to ask the user a question via an in-workflow `ask_user` tool, a Temporal signal for the response, and queries for the starter to poll. | [`demo4-hitl/README.md`](demo4-hitl/README.md) |
| [`demo5-multi-agent`](demo5-multi-agent/) | Multi-agent orchestration. A personal-assistant agent delegates to two specialist sub-agents (weather, F1 expert), invoking one via Temporal child workflow and the other via Nexus. | [`demo5-multi-agent/README.md`](demo5-multi-agent/README.md) |
| [`demo6a-different-sdks`](demo6a-different-sdks/) | Heterogeneity axis 1 — **different frameworks**. Adds a third specialist (travel planner) built with the Strands Agents SDK alongside demo5's OpenAI Agents SDK specialists. Two frameworks (both Python) behind one orchestrator, and a deliberate contrast between per-step durability (with Temporal's framework contrib) and coarse-grained, single-activity durability (without). | [`demo6a-different-sdks/README.md`](demo6a-different-sdks/README.md) |
| [`demo6b-different-languages`](demo6b-different-languages/) | Heterogeneity axis 2 — **a different language**. The travel planner is reimplemented in **Java with Spring AI**, invoked from the Python orchestrator over the same Nexus boundary the F1 expert uses. Shows that the orchestration is language-agnostic, and that a cross-language specialist can still get per-step durability via Temporal's Spring AI integration. | [`demo6b-different-languages/README.md`](demo6b-different-languages/README.md) |

## How to work through the workshop

Each demo's README is a self-contained walkthrough. The rough shape every time:

1. Start a Temporal dev server once (`temporal server start-dev`). All demos connect to `localhost:7233`.
2. Set `OPENAI_API_KEY` in your shell.
3. `cd demo<N>-…/exercise && uv sync` (or `solution/` to run the finished reference directly)
4. Fill in the TODOs in `exercise/` (see that demo's README for what's missing)
5. Run the worker in one terminal: `uv run python -m worker`
6. Run a workflow in another: `uv run python -m start_workflow "<your prompt>"`

Every demo uses a distinct Temporal task queue, so workers can run side-by-side without interfering with each other.

## Prerequisites

- **Python 3.10+**
- **[uv](https://docs.astral.sh/uv/)** — `brew install uv` on macOS.
- **[Temporal CLI](https://docs.temporal.io/cli)** — `brew install temporal` on macOS.
- **OpenAI API key** — set as `OPENAI_API_KEY`.
- **F1 MCP server** (demos 3–6) — a Node.js + Python hybrid that wraps [FastF1](https://docs.fastf1.dev/). Expected at `~/Projects/Temporal/AI/MCP/f1-mcp-server/`; override with `F1_MCP_SERVER_HOME`. See each demo's README for details.
- **JDK 21+ and Maven** (demo6b only) — the travel planner is a Java + Spring AI worker. A Maven wrapper (`./mvnw`) is included, so a system Maven is optional.

## Observing what Temporal gives you

All demos are Temporal workflows, so you can watch them in the Temporal Web UI at http://localhost:8233. The comparisons between demos are most interesting in that UI — demo2's tool calls appear as activities automatically, demo3 adds MCP listTools/callTool activities, demo4 shows a workflow that suspends durably on `wait_condition` and later receives a signal, and demo6a puts per-step (OpenAI Agents) and single-activity (Strands) durability side by side. demo6b goes further: the Java travel planner runs as its own workflow with per-step LLM/tool activities, all driven by a Python orchestrator across a Nexus boundary.

Demos 2–6 also send traces to OpenAI's trace dashboard at https://platform.openai.com/traces, so you can see the agent's reasoning alongside the Temporal-side history.

## Project layout

```
ai-agents-workshop-v4/
├── README.md                                  # this file
├── instruqt/                                  # Instruqt track definition (assignment.md per challenge, Dockerfile, etc.)
├── demo1-agentic-loop/
│   ├── exercise/                              # TODOs for you to fill in
│   └── solution/                              # finished reference
├── demo2-openai-temporal-integration/
│   ├── exercise/
│   └── solution/
├── demo3-mcp/
│   ├── exercise/
│   └── solution/
├── demo4-hitl/
│   ├── exercise/
│   └── solution/
├── demo5-multi-agent/
│   ├── exercise/
│   └── solution/
├── demo6a-different-sdks/                      # heterogeneity axis 1: different frameworks
│   ├── exercise/
│   └── solution/
└── demo6b-different-languages/                 # heterogeneity axis 2: different language (Java/Spring AI)
    ├── exercise/
    │   └── travel-planner-java/                # Java + Spring AI travel-planner worker (Nexus)
    └── solution/
        └── travel-planner-java/
```

## Instruqt track

This repo is also the source for a hands-on Instruqt lab: eight challenges (an environment-setup prologue plus one per demo) that walk an attendee through the same progression in a browser-based sandbox, no local setup required.

```
instruqt/
├── track.yml                                        # track metadata, lab_config, loading messages
├── config.yml                                        # sandbox container reference + secrets
├── justfile                                          # create/push/pull/validate/test recipes
├── track_scripts/
│   ├── setup-workshop                                # track-level: starts services, injects secrets, warms caches
│   └── cleanup-workshop
├── docker/
│   ├── Dockerfile                                    # sandbox image
│   ├── warmup_f1_cache.py                            # pre-warms FastF1 data at build time
│   └── proxy/                                        # mitmproxy addon + Flask control panel
├── 00-environment-setup/
├── 01-agentic-loop/
├── 02-openai-agents-sdk/
├── 03-mcp-tools/
├── 04-human-in-the-loop/
├── 05-multi-agent/
├── 06-heterogeneous-agents-different-sdks/
└── 07-heterogeneous-agents-different-languages/
    ├── assignment.md                                 # challenge instructions + tab definitions
    ├── setup-workshop                                 # stages that chapter's code, kills straggler processes
    ├── check-workshop                                 # verifies the attendee completed the challenge
    ├── solve-workshop                                 # simulates a learner for `instruqt track test`
    └── cleanup-workshop
```

### What the sandbox image bakes in

- Python 3.10 + `uv`, JDK 21 (Temurin), Node.js 20, the Temporal CLI
- All seven demos' `exercise/` and `solution/` dependencies, pre-synced with `uv sync`
- A pinned clone of the [F1 MCP server](https://github.com/rakeshgangwar/f1-mcp-server) with a pre-warmed FastF1 cache for the current season
- `mitmproxy` with a trusted CA cert, used by the network control panel to fault-inject external calls during demos
- Maven dependencies for demo6b's Java + Spring AI travel planner
- `code-server` (VS Code in the browser), pre-configured with a dark theme and no workspace-trust prompt

### Tab inventory per challenge

Every challenge has a **Temporal UI** tab (port 8233) and a **Network Control Panel** tab (port 5000, a Flask app that toggles the mitmproxy addon per external service). Coding challenges add a **Worker** terminal, a **Starter** terminal, and an **Editor** tab (`type: service` on port 8080, deep-linked into `code-server` via `?folder=` to that demo's directory). `code-server` is used instead of the native `type: code` tab so attendees get real syntax highlighting and cross-file navigation (go-to-definition, symbol search) while editing.

### LLM access (per-attendee keys via the LiteLLM secret broker)

Attendees never supply an API key, and there is no shared key. Every attendee gets their own short-lived, budget-capped key to a managed LiteLLM gateway, minted at lab start. This section explains how it works end to end and how to debug it, because the setup is easy to get wrong and its failures show up as an unhelpful "Failed to start track" error.

#### The one secret you need

The track declares exactly one secret in `config.yml`:

```yaml
secrets:
- name: TEMPORAL_LITELLM_BROKER_SECRET
```

`TEMPORAL_LITELLM_BROKER_SECRET` is **not an OpenAI key**. It's an HMAC signing secret the broker uses to authenticate the sandbox's request. It is **team-scoped** in Instruqt (Team Settings > Secrets), so it already exists and is shared across all of Temporal's tracks. You do not set a per-track value, and there is no OpenAI key to rotate per workshop. It must be present, or setup aborts immediately with `TEMPORAL_LITELLM_BROKER_SECRET is not set`.

#### What happens at lab start

`track_scripts/setup-workshop` does this (see `mint_litellm_token`):

1. Downloads the `secret-broker` CLI installer from S3 (`SECRET_BROKER_BASE_URL`) and installs it. `curl` retries up to 10 times, so a transient network blip self-heals.
2. Runs `secret-broker litellm --duration=1d --budget=5`. The CLI signs a request with `TEMPORAL_LITELLM_BROKER_SECRET`, calls the broker, and the broker mints a **per-attendee LiteLLM virtual key** scoped to this track, valid for 1 day, capped at $5 of spend.
3. Writes OpenAI-compatible env vars (`OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL`, plus the `SPRING_AI_*` equivalents for demo6b's Java worker) to `/root/.litellm-env`, which every attendee terminal inherits.

The workshop code is unchanged: it uses the OpenAI SDK normally. The trick is `OPENAI_BASE_URL`, which points at the LiteLLM gateway (`litellm-instruqt.tmprl-demo.cloud`) instead of `api.openai.com`. The gateway holds the real upstream OpenAI credentials centrally; they never touch a sandbox. `setup-workshop` also patches the network control panel (`patch_runtime_proxy_config`) so the "OpenAI" fault-injection toggle disrupts the gateway host.

#### Configuration knobs (all have defaults, override via track env vars)

| Variable | Default | Purpose |
|---|---|---|
| `SECRET_BROKER_BASE_URL` | S3 bucket URL | Where the `secret-broker` installer is fetched from |
| `SECRET_BROKER_VERSION` | `main` | Installer version/channel |
| `LITELLM_KEY_DURATION` | `1d` | TTL of each minted key |
| `LITELLM_MAX_BUDGET` | `5` | Per-key spend cap in USD |
| `INSTRUQT_LITELLM_TRACK_ID` | the track slug (`INSTRUQT_TRACK_SLUG`) | Track id sent to the broker |
| `OPENAI_MODEL` | `gpt-4o` | Model the demos request through the gateway |
| `LITELLM_PROXY_HOST` | `litellm-instruqt.tmprl-demo.cloud` | Gateway host the proxy panel toggles |

#### Why per-attendee keys (not one shared OpenAI key)

For a small, trusted run (~10 people) a single shared `OPENAI_API_KEY` secret works. At scale (say 250 people) it does not: one shared key hits OpenAI's per-org rate limits under synchronized load, and the key is readable in every attendee's sandbox, so it is a leak and abuse liability. Per-attendee keys fix both: each key has its own budget and rate scope, one attendee cannot starve or bill the others, and a leaked key is capped at $5 and expires in a day. That is why this track uses the broker rather than a shared key, and it matches the sibling `temporal-python-ai-agents-v3` track.

#### Troubleshooting (lessons learned the hard way)

- **"Failed to start track" / "Could not start track: expected status 'started', but got 'stopped'."** The mint runs under `set -e`, so *any* failure in `setup-workshop` aborts the entire lab start. To see the real cause, run `instruqt track test` from the `instruqt/` directory: on failure it prints the setup log, including the exact `curl`/broker error. (On success it prints nothing, which is why you only see detail when it breaks.)
- **`instruqt track test` runs your LOCAL track files, not the deployed track.** You can validate a `setup-workshop` change before pushing. Handy, but also means a green local test does not prove the *deployed* track is fixed until you push.
- **No allowlist registration is required.** The current `secret-broker` CLI mints against the track's own slug (`INSTRUQT_LITELLM_TRACK_ID` defaults to `INSTRUQT_TRACK_SLUG`). Earlier broker versions required each track id to be pre-registered on the broker; symptoms of that era were **HTTP 404** (track id not on the allowlist) and **HTTP 422** (request rejected, e.g. a stale/borrowed track id or an exhausted per-track key quota). If you see those, you are likely on an old setup script or pointing at a track id the broker does not accept. Do **not** work around it by borrowing another track's id (we tried; it 422'd once quota was hit). Fix the setup script instead.
- **The image is not involved.** The `secret-broker` installer is fetched from S3 at runtime, and `setup-workshop` is part of the track definition. Changing any of this needs only `instruqt track push`, never a sandbox image rebuild.
- **Do not silently fall back to a shared `OPENAI_API_KEY`** for anything beyond a tiny internal test. If the broker is down, prefer fixing the broker path over shipping a shared key to a large audience (see the scaling note above).

### Network control panel

The control panel toggles four external services on and off mid-demo so attendees can watch Temporal retry a failing activity and resume once the service comes back: OpenAI, the F1 MCP server, IP geolocation, and weather. It's driven by `docker/proxy/controlpanel.py` and `docker/proxy/toggle_addon.py`, both started by `track_scripts/setup-workshop`.

### Instruqt CLI workflow

```bash
just validate       # instruqt track validate
just push           # instruqt track push
just pull           # instruqt track pull (populates server-assigned ids)
just test           # instruqt track test (runs check/solve scripts end to end)
```

First-time track creation:

```bash
just create                      # registers the slug server-side, once
cd instruqt && instruqt track push --force
cd - && just pull
git add instruqt/ && git commit -m "Pin Instruqt track and tab ids"
```

### Known issues

- **F1 MCP server commit pin.** `docker/Dockerfile` clones `rakeshgangwar/f1-mcp-server` at a pinned commit (`F1_MCP_COMMIT` build arg). Refresh it periodically with `git ls-remote https://github.com/rakeshgangwar/f1-mcp-server HEAD`.
- **Local `F1_MCP_SERVER_HOME` path.** The top-level README's prerequisites list a local path (`~/Projects/Temporal/AI/MCP/f1-mcp-server/`) for running demos outside Instruqt. Inside the sandbox this is overwritten to `/opt/f1-mcp-server` — don't assume the checked-in demo READMEs describe the sandbox path.
- **Undocumented `track.yml` fields.** `lab_config.override_challenge_layout`, `default_layout`, and `default_layout_sidebar_size` work in production but aren't part of Instruqt's published schema; they're carried over from prior tracks.
- **`code-server` runs with `--auth none`.** It's reachable only through Instruqt's per-attendee sandbox proxy (not directly from the internet), so this is the accepted tradeoff for a disposable, single-attendee workshop VM — but it's worth knowing it's an unauthenticated VS Code instance if anything about the sandbox's network exposure model changes.

## Related

This workshop has a [Java / Spring AI sibling](https://github.com/temporal-community/springio-agents-springai-temporal) that covers the same progression using Spring AI instead of the OpenAI Agents SDK. The two implementations diverge in interesting ways where the frameworks differ — see `docs/research/tool-execution-strategies-java-vs-python.md` for one such comparison.
