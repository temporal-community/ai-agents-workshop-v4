# Human in the Loop

Builds on the OpenAI Agents SDK weather agent in two ways. The agent can look up Formula 1 race data through a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) tool server and chain it with those weather tools. It can also pause mid-execution to ask you a question, wait for your answer, and continue.

## What this adds

The OpenAI Agents SDK weather agent exposes four weather tools as Temporal activities, wrapped via `activity_as_tool(...)` so the SDK's `Runner` can call them. Once you give it a goal, it runs to completion on its own.

This demo keeps those weather tools and adds:

- **An F1 MCP server.** An external tool server, `f1-mcp-server`, provides race schedules, results, and standings. Temporal's `StatelessMCPServerProvider` dispatches each MCP operation (`listTools`, `callTool`) as its own activity, so those calls are durable, retryable, and visible in workflow history next to the weather activities.
- **Human-in-the-loop.** The agent can pause, ask you a question, wait for your response, and continue with that information. Several prompts below are ambiguous on purpose ("which race?", "which Portland?") so you can see the pause.

### F1 tools via MCP

The F1 MCP server is **a local subprocess**, not a remote service. The worker spawns it on demand and communicates with it over **stdio** (line-delimited JSON-RPC on the child process's stdin/stdout). No HTTP, no port, no separate server to keep running. When a workflow tick needs an F1 tool, the contrib's stateless provider connects, calls, and cleans up — the subprocess lives only for the duration of one MCP operation.

- **`StatelessMCPServerProvider`** (from `temporalio.contrib.openai_agents`) — registered on the worker under the name `"f1-data"`. Each `list_tools()` / `call_tool()` becomes a Temporal activity that connects, calls, and cleans up. No persistent connection between workflow ticks.
- **`stateless_mcp_server("f1-data")`** (workflow-side) — returns a handle that the agent passes to `Agent(mcp_servers=[...])`. Calls go through the activities the provider registered.
- **`MCPServerStdio`** — the Agents SDK's stdio transport. Configured here to launch `bash -c "source $F1_MCP_SERVER_HOME/.venv/bin/activate && node $F1_MCP_SERVER_HOME/build/index.js"` so the F1 server's Node entrypoint can shell out to Python (FastF1).
- **`OpenAIAgentsPlugin(mcp_server_providers=[...])`** — wires the provider's activities into the worker automatically. No manual activity registration for MCP.

The weather tools and the F1 tools both run as Temporal activities. Each MCP call is a durable, observable unit in the workflow history, with retry policy support.

### Human in the loop

The HITL mechanism uses three Temporal primitives — an in-workflow tool, a signal, and two queries:

**1. The `ask_user` tool** is defined *inside* the workflow's `run()` method as an `@function_tool`-decorated async closure. It's **not** a Temporal activity. The OpenAI Agents SDK awaits `@function_tool`-decorated async functions in the caller's context, so this tool runs directly in the workflow's event loop. When the LLM decides it needs more information, it calls this tool with a question. The tool:
- Sets `self._question = "..."` and `self._input_needed = True`
- Blocks on `await workflow.wait_condition(lambda: not self._input_needed)` — durably suspending the workflow

**2. The signal** `provide_user_input` delivers the user's response. The handler sets `self._user_input` and flips `self._input_needed = False`, unblocking the `wait_condition` so the tool returns the answer and the agent loop continues.

**3. The queries** `is_input_needed` and `get_pending_question` let the starter poll the workflow to detect when input is required and what question to surface.

### What happens while waiting for the user

When `workflow.wait_condition()` suspends the workflow, **no worker resources are consumed**. The workflow task completes, the worker is free to handle other work, and the workflow state is held durably by the Temporal server. The worker could even restart — when the signal arrives, the server schedules a new workflow task, the workflow replays, and execution resumes exactly where it left off.

### The starter

The starter starts the workflow asynchronously, then enters a polling loop:

- Every 2 seconds, it queries the workflow to check if input is needed.
- If yes, it prints the agent's question, reads the user's response from stdin, and sends it as a signal.
- A background `asyncio` task awaits the workflow result; when it completes, the loop exits and prints the result.

It also supports reconnecting to a workflow that's already waiting:

```bash
uv run python -m start_workflow --workflow-id hitl-agent-<uuid>
```

### Tools

**Weather tools (the same four activities):**

| Tool | API | Purpose |
|------|-----|---------|
| `get_ip_address` | icanhazip.com | Get the caller's public IP address |
| `get_location_info` | ip-api.com | Get city, country, lat/lon for an IP address |
| `get_coordinates` | Open-Meteo Geocoding | Get lat/lon for a city name |
| `get_weather` | Open-Meteo Forecast | Get current temperature, weather code, and wind speed |

**F1 tools (provided by the MCP server):**

| Tool | Purpose |
|------|---------|
| `get_event_schedule` | F1 race calendar for a season |
| `get_event_info` | Details about a specific Grand Prix |
| `get_session_results` | Race / qualifying / practice session results |
| `get_driver_info` | Driver information for a session |
| `analyze_driver_performance` | Lap times and performance metrics |
| `compare_drivers` | Compare multiple drivers in a session |
| `get_telemetry` | Vehicle telemetry for a lap |
| `get_championship_standings` | Driver and constructor standings |

**In-workflow tool (new in this demo):**

| Tool | Kind | Purpose |
|------|------|---------|
| `ask_user` | in-workflow `@function_tool` | Pause and ask the user a question |

## Prerequisites

- **Python 3.10+**
- **uv** — `brew install uv` (macOS) or see [uv docs](https://docs.astral.sh/uv/)
- **Node.js 18+** — needed to run the F1 MCP server's TypeScript entrypoint
- **Temporal CLI** — `brew install temporal` (macOS) or see [Temporal CLI docs](https://docs.temporal.io/cli)
- **OpenAI API key** — set as `OPENAI_API_KEY` environment variable
- **F1 MCP server** — installed locally, see [Install the F1 MCP server](#install-the-f1-mcp-server) below

## Install the F1 MCP server

This is a one-time setup. The worker launches the server as a local subprocess each time it needs to call an F1 tool, but the server itself is a Node.js + Python hybrid that you have to clone, build, and provision a Python venv for ahead of time.

### 1. Clone the repository

Pick a directory you'd like to keep the server in. Anywhere is fine; the worker locates it via the `F1_MCP_SERVER_HOME` environment variable below.

```bash
git clone https://github.com/rakeshgangwar/f1-mcp-server.git
cd f1-mcp-server
```

### 2. Build the Node.js side

```bash
npm install
npm run build
```

This produces the `build/index.js` entrypoint that the worker spawns.

### 3. Provision the Python side

The Node.js entrypoint shells out to `python3` (within the activated venv) to run [FastF1](https://github.com/theOehrly/Fast-F1) for the actual data lookups. Create a venv inside the project and install the Python deps:

```bash
uv venv
source .venv/bin/activate
uv pip install fastf1 pandas numpy
deactivate
```

The worker activates this venv on each invocation via the launch command shown in the [F1 tools via MCP](#f1-tools-via-mcp) section above.

### 4. Point the worker at the install location

```bash
export F1_MCP_SERVER_HOME=/absolute/path/to/f1-mcp-server
```

If you leave it unset, the worker falls back to `~/Projects/Temporal/AI/MCP/f1-mcp-server`. Add the export to your shell profile if you want a different location persisted across sessions. The worker reads this variable at startup and bakes it into the `MCPServerStdio` launch command.

## Running

### 1. Start the Temporal dev server

```bash
temporal server start-dev
```

### 2. Set your OpenAI API key (both terminals)

```bash
export OPENAI_API_KEY=sk-...
```

### 3. Install dependencies

From `demo4-hitl/`:

```bash
uv sync
```

### 4. Start the worker

```bash
uv run python -m worker
```

The worker connects with the `OpenAIAgentsPlugin` (configured with the F1 MCP provider), registers `AgentWorkflow`, the four weather activities, and the auto-generated MCP activities, then polls the `hitl-agent-python-task-queue` task queue. Leave this running.

### 5. Start a workflow

In a second terminal (also from `demo4-hitl/`):

```bash
uv run python -m start_workflow "Should I bring rain gear to the F1 race?"
```

The agent will ask which race you mean, wait for your response, then look up the weather.

### Example prompts

```bash
# Ambiguous — agent will ask which race
uv run python -m start_workflow "Should I bring rain gear to the F1 race?"

# Ambiguous location
uv run python -m start_workflow "What's the weather in Portland?"

# Clear enough — agent may not need to ask
uv run python -m start_workflow "What is the weather at the Monaco Grand Prix this year?"

# Multi-step with clarification
uv run python -m start_workflow "Help me plan what to pack for the race"
```

### Reconnecting to a waiting workflow

If you close the starter terminal while the agent is waiting for input, the workflow keeps running on the server. Reconnect with:

```bash
uv run python -m start_workflow --workflow-id hitl-agent-<uuid>
```

Find the workflow ID in the Temporal UI at [http://localhost:8233](http://localhost:8233).

### Observing the workflow

In the Temporal UI, running workflows show:

- `invoke_model_activity` — LLM calls.
- Weather activities (`get_coordinates`, `get_weather`, etc.) — the `@activity.defn` tools.
- `f1-data-list-tools` / `f1-data-call-tool-v2` — F1 MCP operations.
- Signal events (`provide_user_input`) when the user responds.
- While the workflow is paused on `wait_condition`, it shows as "Running" but consumes no worker resources.
