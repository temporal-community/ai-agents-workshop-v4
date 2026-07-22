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

### LLM access (per-attendee keys via the secret broker)

Attendees never supply an API key, and there's no shared key either. The track declares one team-scoped secret, `TEMPORAL_LITELLM_BROKER_SECRET` (an HMAC signing key, not an LLM credential). At lab start, `track_scripts/setup-workshop` downloads the `secret-broker` CLI and runs `secret-broker litellm --duration=1d --budget=5`, which mints a **short-lived, per-attendee, budget-capped key** (1-day TTL, $5 cap) to a managed LiteLLM gateway and writes OpenAI-compatible env vars into the attendee shell. The workshop code uses the OpenAI SDK normally; `OPENAI_BASE_URL` routes calls through the gateway, which holds the real upstream credentials centrally. The setup also patches the network control panel so the OpenAI toggle disrupts the gateway host.

Per-attendee keys are the right model for large or public workshops: one attendee's key leaking or exhausting its budget doesn't affect anyone else, and there's no shared OpenAI rate limit to contend with. The track id sent to the broker is the track's own slug (`INSTRUQT_LITELLM_TRACK_ID` defaults to `INSTRUQT_TRACK_SLUG`), and no per-track allowlist registration is required. This matches the sibling `temporal-python-ai-agents-v3` track. `TEMPORAL_LITELLM_BROKER_SECRET` must be set in Track Settings > Secrets (it's team-scoped, so it's shared across Temporal's tracks).

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
