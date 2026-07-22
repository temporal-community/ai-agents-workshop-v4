---
slug: openai-agents-sdk
id: fcltf6zbrfhd
type: challenge
title: 'Demo 2: OpenAI Agents SDK + Temporal'
teaser: The same agent, but the SDK drives the loop. Durability becomes automatic.
notes:
- type: text
  contents: |-
    # What if you didn't have to write the loop?

    Demo 1 was ~50 lines of explicit loop logic. What if a single function
    call replaced all of it, and Temporal durability still applied to every
    step inside?

    That's the OpenAI Agents SDK + Temporal integration. One line replaces
    the loop. Every LLM call and every tool invocation still becomes a
    Temporal activity - automatically.
- type: text
  contents: |-
    # The trade-off

    Tools must now be @activity.defn functions rather than plain Python.
    They gain durability but they're no longer Temporal-agnostic.

    The developer writes standard SDK code. Temporal durability is free.
tabs:
- id: 31rcl28ut32k
  title: Worker
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo2-openai-temporal-integration/exercise
- id: qglx40kbt9zk
  title: Starter
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo2-openai-temporal-integration/exercise
- id: e3elkflqcjty
  title: Temporal UI
  type: service
  hostname: workshop
  port: 8233
- id: xu508dgplvoa
  title: Network Control Panel
  type: service
  hostname: workshop
  port: 5000
- id: efhnipg7vbyx
  title: Editor
  type: service
  hostname: workshop
  path: /?folder=/root/workshop/demo2-openai-temporal-integration
  port: 8080
difficulty: basic
timelimit: 1800
enhanced_loading: null
---

# Demo 2: OpenAI Agents SDK + Temporal

> [!NOTE]
> **Tabs:** [button label="Worker" background="#444CE7"](tab-0) [button label="Starter" background="#444CE7"](tab-1) [button label="Temporal UI" background="#444CE7"](tab-2) [button label="Network Control Panel" background="#444CE7"](tab-3) [button label="Editor" background="#444CE7"](tab-4)

## What Changed

Click the [button label="Editor" background="#444CE7"](tab-4) tab. Key files in `demo2-openai-temporal-integration`:

- `tools_workflow.py` - the entire agentic loop is now one line: `result = await Runner.run(agent, input=question)`
- `tool_activities.py` - tools are `@activity.defn` functions. `activity_as_tool(...)` wraps each one for the SDK.
- `worker.py` - the `OpenAIAgentsPlugin` is registered on both client and worker. It installs the model-execution activity and interceptors automatically.

## Write the Agent

Open `exercise/tools_workflow.py`. Two TODO stubs are waiting: construct the `Agent` with its four tools wrapped via `activity_as_tool`, then replace the whole hand-written loop with the one-line `Runner.run(agent, input=question)` call.

Stuck? Compare against `solution/tools_workflow.py` in the [button label="Editor" background="#444CE7"](tab-4) tab.

## Start the Worker

Click the [button label="Worker" background="#444CE7"](tab-0) terminal.

```bash,run
uv run python -m worker
```

You should see:

```bash,nocopy
Started worker on task queue: openai-agents-python-task-queue
```

> **If it fails:** `OPENAI_API_KEY not set` means the key didn't carry into this terminal - open a fresh tab and re-check. Port or task-queue conflicts are unlikely here since each demo uses its own queue, but if a demo1 worker is still running, it's harmless - they don't interfere.

## Run It

Click the [button label="Starter" background="#444CE7"](tab-1) terminal.

```bash,run
uv run python -m start_workflow "What is the weather in Tokyo?"
```

You should see a final answer describing Tokyo's current weather, printed after a few seconds.

## Watch the Event History

Click the [button label="Temporal UI" background="#444CE7"](tab-2) tab. Look at a completed workflow. `InvokeModelActivity` appears as its own named entry - the SDK's model calls are now first-class Temporal activities alongside the tool calls.

> **Compare to demo 1:** demo 1's event history had one LLM-call activity per loop iteration, hand-dispatched by your own code. This one has `InvokeModelActivity` entries instead - same idea, but the SDK's `Runner.run()` is what's calling them now, not your `while True` loop. Same durability, one line of code.

## Break It

Before running the next prompt, click the [button label="Network Control Panel" background="#444CE7"](tab-3) and disable **Weather**. Then click the [button label="Starter" background="#444CE7"](tab-1) and run:

```bash,run
uv run python -m start_workflow "What is the weather in London?"
```

Watch the weather activities fail and retry in the [button label="Temporal UI" background="#444CE7"](tab-2). Go back to the [button label="Network Control Panel" background="#444CE7"](tab-3), re-enable **Weather**, and watch the workflow succeed.

Click **Check** when you've run at least one workflow successfully.
