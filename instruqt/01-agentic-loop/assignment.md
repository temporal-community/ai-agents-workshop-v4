---
slug: agentic-loop
id: vdvkh3wmfng4
type: challenge
title: 'Demo 1: The Hand-Written Agentic Loop'
teaser: Build an agentic loop from scratch as a Temporal workflow. Watch it survive
  a failure mid-run.
notes:
- type: text
  contents: |-
    # What happens when the worker dies mid-execution?

    Your agent was halfway through a multi-step tool chain when the process
    crashed. The LLM had already answered. A tool had already run. Where
    is that work now?

    In a plain Python script: gone. Start over.

    In a Temporal workflow: every step is recorded. The next worker picks
    up exactly where the last one left off.
- type: text
  contents: |-
    # The loop most frameworks hide from you

    Call the LLM. Check if it wants a tool. Call the tool. Feed the result
    back. Repeat until the model returns a final answer.

    Demo 1 makes that loop explicit, written by hand as a Temporal workflow.
    The LLM call is one activity. Each tool dispatch is another. Every step
    appears in the event history.
tabs:
- id: xkk86anvxhdt
  title: Worker
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo1-agentic-loop/exercise
- id: vjifb9kwn5wq
  title: Starter
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo1-agentic-loop/exercise
- id: ry4phhbyngl0
  title: Temporal UI
  type: service
  hostname: workshop
  port: 8233
- id: tavjdlf1myuw
  title: Network Control Panel
  type: service
  hostname: workshop
  port: 5000
- id: hdladectcmw7
  title: Editor
  type: code
  hostname: workshop
  path: /root/workshop/demo1-agentic-loop
difficulty: basic
timelimit: 1800
enhanced_loading: null
---

# Demo 1: The Hand-Written Agentic Loop

> [!NOTE]
> **Tabs:** [button label="Worker" background="#444CE7"](tab-0) [button label="Starter" background="#444CE7"](tab-1) [button label="Temporal UI" background="#444CE7"](tab-2) [button label="Network Control Panel" background="#444CE7"](tab-3) [button label="Editor" background="#444CE7"](tab-4)

## The Code

Click the [button label="Editor" background="#444CE7"](tab-4) tab. Key files in `demo1-agentic-loop`:

- `workflows/agent.py` - the `while True` loop: call LLM, dispatch tool if needed, repeat until done
- `activities/openai_responses.py` - the LLM activity
- `activities/tool_invoker.py` - a single dynamic activity that routes to whichever tool the LLM chose
- `tools/` - four weather tools: `get_ip_address`, `get_location_info`, `get_coordinates`, `get_weather`

## Write the Loop

Open `exercise/workflows/agent.py`. The loop body is a `TODO` stub - your job is to write the four steps described above: call the LLM activity, check whether the result is a tool call, dispatch the tool, feed the output back into `input_list`, and repeat until the model returns a final message.

Stuck? Compare your work against `solution/workflows/agent.py` in the [button label="Editor" background="#444CE7"](tab-4) tab - same file, fully implemented.

## Start the Worker

Click the [button label="Worker" background="#444CE7"](tab-0) terminal.

```bash,run
uv run python -m worker
```

You should see:

```bash,nocopy
Started worker on task queue: tool-invoking-agent-python-task-queue
```

> **If it fails:** `ModuleNotFoundError` means `uv sync` hasn't run yet in this directory - it runs automatically the first time, but if you see this, run `uv sync` by hand. `OPENAI_API_KEY not set` means the key from Environment Setup didn't carry into this terminal - open a fresh terminal tab and re-check `echo $OPENAI_API_KEY`.

## Run It

Click the [button label="Starter" background="#444CE7"](tab-1) terminal.

```bash,run
uv run python -m start_workflow "What is the weather in Barcelona?"
```

You should see a final answer printed after a few seconds, describing the current weather in Barcelona.

> **If it hangs:** no worker is polling the task queue - go back to the [button label="Worker" background="#444CE7"](tab-0) tab and confirm it's still running. If it exited, restart it before trying again.

## Watch the Event History

Switch to the [button label="Temporal UI" background="#444CE7"](tab-2) tab while the workflow runs. Click into it and you'll see each LLM call and each tool invocation as a separate activity in the event history - the full decision trail of the agent.

> **Predict before you look:** the prompt needed IP lookup, location lookup, coordinates, and weather - four tool calls plus the LLM reasoning between each. How many activities do you expect in the event history? Now check - were you right?

## The Durability Point

Before running the next prompt, click the [button label="Network Control Panel" background="#444CE7"](tab-3) and disable **Weather**. Then click the [button label="Starter" background="#444CE7"](tab-1) and run:

```bash,run
uv run python -m start_workflow "What is the weather where I am right now?"
```

Watch the activity fail and retry in the [button label="Temporal UI" background="#444CE7"](tab-2). Go back to the [button label="Network Control Panel" background="#444CE7"](tab-3), re-enable **Weather**, and watch the workflow resume.

Click **Check** when you've run at least one workflow successfully.
