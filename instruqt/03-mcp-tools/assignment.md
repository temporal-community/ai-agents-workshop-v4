---
slug: mcp-tools
id: eixdwgq1mcnb
type: challenge
title: 'Demo 3: MCP Tool Servers'
teaser: Add a Formula 1 data server via MCP. Each tool call becomes a durable Temporal
  activity automatically.
notes:
- type: text
  contents: |-
    # What if your agent's tools lived on a separate server?

    Model Context Protocol (MCP) is a standard for connecting AI agents to
    external tool servers. Any team can publish a tool server. Any agent can
    consume it without importing a library.

    Demo 3 adds an F1 race data server alongside the existing weather tools.
    The agent can now chain F1 data with weather data in a single workflow.
- type: text
  contents: |-
    # Every MCP call is a Temporal activity

    StatelessMCPServerProvider routes every MCP operation through Temporal.
    Each listTools and callTool becomes its own activity in the workflow
    history - durable, retryable, observable - without extra code from you.
tabs:
- id: ulbyf3gigvst
  title: Worker
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo3-mcp/exercise
- id: xw03sdytqtnh
  title: Starter
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo3-mcp/exercise
- id: vjjnetdkfrn5
  title: Temporal UI
  type: service
  hostname: workshop
  port: 8233
- id: kbxte9sbqok0
  title: Network Control Panel
  type: service
  hostname: workshop
  port: 5000
- id: tp4mmajg6cdu
  title: Editor
  type: service
  hostname: workshop
  path: /?folder=/root/workshop/demo3-mcp
  port: 8080
difficulty: basic
timelimit: 1500
enhanced_loading: null
---

# Demo 3: MCP Tool Servers

## What Changed

Click the [button label="Editor" background="#444CE7"](tab-4) tab. Key files in `demo3-mcp`:

- `worker.py` - a `StatelessMCPServerProvider` is registered with the plugin. It launches the F1 MCP server process and wraps its operations as Temporal activities automatically.
- `tools_workflow.py` - `stateless_mcp_server("f1-data")` gives the agent a handle to the MCP server. Eight F1 tools appear alongside the four weather tools.

> [!NOTE]
> **Hands-on:** Do your coding in the `exercise/` directory. Want to see the working code? Peek at `solution/`.

## Wire Up the MCP Server

Open `exercise/worker.py` and `exercise/tools_workflow.py` in the [button label="Editor" background="#444CE7"](tab-4) tab and follow the `TODO` in each.

The workflow's `TODO` offers three ways to hand the MCP server to the agent. Only one is right. The worker file tells you what the server is registered as, so read it first.

> **Picked wrong?** The starter will hang instead of failing, because Temporal retries a failing workflow task forever. Check the [button label="Worker" background="#444CE7"](tab-0) terminal:
>
> - `Activity function f1-stateless-list-tools ... is not registered on this worker` - the name you asked for does not match the name the worker registered the provider under. That name is the lookup key between the two.
> - `Unsupported tool type: f1-data-stateless` - an MCP server is not a tool. It goes in `mcp_servers`, and the agent then discovers its tools at runtime.

Stuck? Compare against `solution/worker.py` and `solution/tools_workflow.py`.

## Start the Worker

Click the [button label="Worker" background="#444CE7"](tab-0) terminal.

```bash,run
uv run python -m worker
```

The worker starts polling its task queue and keeps running. It prints no startup banner and does not return you to the prompt. That blocked terminal is the worker doing its job. Leave it running and move on.

> **If it fails:** an F1 MCP server startup error usually means it's still spawning - wait a few seconds and check the worker log again before restarting. `OPENAI_API_KEY not set` means the key didn't carry into this terminal.

## Run It

Click the [button label="Starter" background="#444CE7"](tab-1) terminal.

```bash,run
uv run python -m start_workflow "When is the next F1 race and what's the weather there right now?"
```

> [!NOTE]
> The first workflow may take 15-30 seconds on F1 tool calls while FastF1 fetches session data. Subsequent runs are fast from the local cache.

You should see a final answer combining the next race's date/location with current weather there.

## Watch the Event History

Click the [button label="Temporal UI" background="#444CE7"](tab-2) tab. Three kinds of activity entries are listed in the workflow history:

- `invoke_model_activity` - LLM reasoning steps
- Weather activities (`get_coordinates`, `get_weather`, etc.)
- `f1-data-list-tools` and `f1-data-call-tool-v2` - MCP operations, each a durable activity

> **Predict before you look:** this prompt needs F1 schedule data AND weather data for that location - two tool families chained together. Which activity type do you expect to appear first in the history, an F1 operation or a weather one? Check the history - does the model's tool-choice order match your prediction?

## Break It: The Durability Test

Do all five steps.

**1. Turn off the service.** Click the [button label="Network Control Panel" background="#444CE7"](tab-3) tab and toggle **Weather** off. Leave **OpenAI** on - you want the agent still able to reason.

**2. Run a workflow.** Click the [button label="Starter" background="#444CE7"](tab-1) terminal. Use a prompt that needs the MCP server *and* the weather tools:

```bash,run
uv run python -m start_workflow "When is the next F1 race and what's the weather there right now?"
```

**3. Observe.** Switch to the [button label="Temporal UI" background="#444CE7"](tab-2) tab and open the running workflow:

- Status is still **Running**.
- The `get_weather` activity is **Retrying**.
- `f1-data-list-tools` and `f1-data-call-tool-v2` are **Completed** - the MCP work finished before the weather call was ever attempted.

**4. Answer this question.** Before you turn the service back on:

> The MCP operations already succeeded, and the F1 MCP server is a whole separate process the worker spawned. While the weather activity retries, is that MCP server being asked to answer the same questions again?

<details>
<summary>Answer</summary>

No. It is not called again.

`f1-data-list-tools` and `f1-data-call-tool-v2` are Temporal activities like any other, and their results are recorded in the event history. On replay those results are handed back from the history, not re-fetched from the MCP server.

This matters more than it looks. MCP servers are frequently stateful, slow, rate-limited, or backed by something you pay per call for - here, FastF1 pulling session data. Wrapping MCP operations as activities means a failure *elsewhere* in the agent never costs you a second round-trip to them.
</details>

**5. Let it finish.** Toggle **Weather** back on in the [button label="Network Control Panel" background="#444CE7"](tab-3). The weather call succeeds on its next attempt and the agent produces the combined race-and-weather answer - without re-querying F1 data.

## Try More Prompts

Click the [button label="Starter" background="#444CE7"](tab-1) terminal.

```bash,run
uv run python -m start_workflow "What is the 2026 F1 race calendar?"
```

```bash,run
uv run python -m start_workflow "What were the results of the last Monaco Grand Prix?"
```

Click **Check** when you've run at least one workflow successfully.
