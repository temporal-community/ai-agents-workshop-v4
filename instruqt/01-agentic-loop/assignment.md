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
  type: service
  hostname: workshop
  path: /?folder=/root/workshop/demo1-agentic-loop
  port: 8080
difficulty: basic
timelimit: 1800
enhanced_loading: null
---

# Demo 1: The Hand-Written Agentic Loop

## Why

An agentic loop is the engine behind every AI agent. Most frameworks hide it from you. Module 1 makes you write it by hand, so you see exactly what it is:

- Call the LLM with the conversation and available tools
- Check whether the model asked for a tool
- Run the tool, feed the result back into the conversation
- Repeat until the model returns a plain text answer

> [!NOTE]
> **Hands-on:** Do your coding in the `exercise/` directory. Want to see the working code? Peek at `solution/`.

## The Code

Click the [button label="Editor" background="#444CE7"](tab-4) tab. Key files in `demo1-agentic-loop`:

- `workflows/agent.py` - the `while True` loop: call LLM, dispatch tool if needed, repeat until done
- `activities/openai_responses.py` - the LLM activity
- `activities/tool_invoker.py` - a single dynamic activity that routes to whichever tool the LLM chose
- `tools/` - four weather tools: `get_ip_address`, `get_location_info`, `get_coordinates`, `get_weather`

## Write the Loop

In the [button label="Editor" background="#444CE7"](tab-4) tab, open `exercise/workflows/agent.py` and follow the `TODO`.

Stuck? Compare your work against `solution/workflows/agent.py` in the same tab, fully implemented.

## Start the Worker

Click the [button label="Worker" background="#444CE7"](tab-0) terminal.

```bash,run
uv run python -m worker
```

The worker starts polling its task queue and keeps running. It prints no startup banner and does not return you to the prompt. That blocked terminal is the worker doing its job. Leave it running and move on.

> **If it fails:** `ModuleNotFoundError` means `uv sync` hasn't run yet in this directory - it runs automatically the first time, but if you see this, run `uv sync` by hand. `OPENAI_API_KEY not set` means the auto-provisioned key didn't carry into this terminal - open a fresh terminal tab and re-check `echo $OPENAI_API_KEY`.

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

## Break It: The Durability Test

Do all five steps. This is the point of the whole workshop.

**1. Turn off the service.** Click the [button label="Network Control Panel" background="#444CE7"](tab-3) tab and toggle **Weather** off. The proxy now returns `503` for every call to `api.open-meteo.com`.

**2. Run a workflow.** Click the [button label="Starter" background="#444CE7"](tab-1) terminal:

```bash,run
uv run python -m start_workflow "What is the weather where I am right now?"
```

The starter does not return. Leave it.

**3. Observe.** Switch to the [button label="Temporal UI" background="#444CE7"](tab-2) tab and open the running workflow. Find these three things:

- The workflow status is still **Running** - it did not fail.
- The `get_weather` activity is in **Retrying**, with an attempt counter climbing and a growing backoff between attempts.
- Every activity *before* it - the LLM calls, `get_ip_address`, `get_location_info`, `get_coordinates` - is still marked **Completed**. Their results are in the history.

**4. Answer this question.** Before you turn the service back on, commit to an answer:

> The LLM has already answered several times and three tools have already run. When the weather call finally succeeds, does your `while True` loop start over from the first LLM call?

<details>
<summary>Answer</summary>

No. Nothing before the failure re-executes.

When the retry succeeds, Temporal rebuilds your workflow's state by **replaying** the recorded history. Each `await workflow.execute_activity(...)` that already completed returns its recorded result instantly - the LLM is not called again, and the three tools are not called again. Your loop is fast-forwarded to exactly the iteration it was on, and only the weather call actually runs.

The LLM tokens you already paid for stay paid for once.
</details>

**5. Let it finish.** Go back to the [button label="Network Control Panel" background="#444CE7"](tab-3) and toggle **Weather** back on. Within one retry interval the activity succeeds, the loop continues, and your [button label="Starter" background="#444CE7"](tab-1) terminal prints the final answer.

You never restarted the workflow. You never re-ran the prompt. The outage lasted as long as you left the toggle off, and the agent simply waited through it.

Click **Check** when you've run at least one workflow successfully.
