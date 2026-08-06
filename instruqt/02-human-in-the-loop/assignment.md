---
slug: human-in-the-loop
type: challenge
title: 'Module 2: Human-in-the-Loop'
teaser: The agent pauses mid-execution to ask you a question. A Temporal signal resumes
  it.
notes:
- type: text
  contents: |-
    # What if the agent needs to ask you something before it can continue?

    The workflow is running. The agent realizes it doesn't have enough
    information to proceed. It needs your input right now, mid-execution.

    In a plain Python script, you'd have to restart. In Temporal, the
    workflow suspends with no worker resources consumed - and resumes the
    instant you answer.
- type: text
  contents: |-
    # Three Temporal primitives working together

    ask_user sets workflow state and awaits wait_condition. The workflow
    is suspended - durably - holding no threads, no memory.

    provide_user_input is a signal. It delivers your answer and unblocks
    the wait_condition.

    Two queries let the starter poll: is_input_needed and
    get_pending_question. The starter asks the question on the terminal
    and sends your answer as a signal.
tabs:
- title: Worker
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo4-hitl/exercise
- title: Starter
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo4-hitl/exercise
- title: Temporal UI
  type: service
  hostname: workshop
  port: 8233
- title: Network Control Panel
  type: service
  hostname: workshop
  port: 5000
- title: Editor
  type: service
  hostname: workshop
  path: /?folder=/root/workshop/demo4-hitl
  port: 8080
- title: Architecture
  type: service
  hostname: workshop
  path: /
  port: 8092
difficulty: basic
timelimit: 1800
enhanced_loading: null
---

# Module 2: Human-in-the-Loop

## See the Big Picture First

Before you touch code, open the [button label="Architecture" background="#444CE7"](tab-5) tab to inspect how this demo fits together: every file, class, and method on the single task queue, inside the single worker process.

Click any box to trace what it calls and what calls it. Pay attention to the amber path - `ask_user`, `wait_condition`, the signal, and the two queries. Then press **Play data flow** to watch the request `"Should I bring rain gear to the F1 race?"` stop mid-run to ask you a question and resume from the signal.

## What Changed

Click the [button label="Editor" background="#444CE7"](tab-4) tab. Key files in `demo4-hitl`:

- `tools_workflow.py` - an `ask_user` `@function_tool` is defined inside `run()` as a closure. It sets `self._input_needed = True` and blocks on `await workflow.wait_condition(...)`. The signal handler flips the flag to unblock it.
- `start_workflow.py` - polls queries every 2 seconds. When `is_input_needed` is True, it prints the question, reads your response, and sends it as a signal.

> [!NOTE]
> **Hands-on:** Do your coding in the `exercise/` directory. Want to see the working code? Peek at `solution/`.

## Write the Suspension

In the [button label="Editor" background="#444CE7"](tab-4) tab, open `exercise/tools_workflow.py` and follow the `TODO`s to uncomment the two blocks.

Stuck? Compare against `solution/tools_workflow.py`.

## Start the Worker

Click the [button label="Worker" background="#444CE7"](tab-0) terminal.

```bash,run
uv run python -m worker
```

The worker starts polling its task queue and keeps running. It prints no startup banner and does not return you to the prompt. That blocked terminal is the worker doing its job. Leave it running and move on.

> **If it fails:** `OPENAI_API_KEY not set` means the key didn't carry into this terminal.

## Run It

Click the [button label="Starter" background="#444CE7"](tab-1) terminal. The agent can't answer without knowing your destination - it will pause and ask you.

```bash,run
uv run python -m start_workflow "What's the weather like where I'm traveling to this weekend?"
```

Type your destination when prompted and press Enter.

> **If the prompt never shows:** the starter polls queries every 2 seconds - give it a few seconds. If it still doesn't appear, confirm the worker in tab-0 is still running.

> **Predict before you look:** while the workflow is paused waiting for your answer, is it consuming a worker thread or activity slot? Now check the Web UI in the next step - were you right?

## Watch the Suspension

Click the [button label="Temporal UI" background="#444CE7"](tab-2) tab while the workflow waits. The status shows **Running** but there are no pending activity tasks. The workflow is suspended on `wait_condition` - no worker threads consumed.

When you respond, a new event appears in the history: the signal arrives, `wait_condition` unblocks, and the agent continues.

<div style="border:1px solid #333;border-radius:8px;padding:16px;background:#111;color:#eee;font-family:sans-serif;max-width:640px;margin:16px 0;">
<div style="font-size:13px;color:#8b8fa3;margin-bottom:12px;">🖱️ TRY ME: expand each stage to see what's happening underneath it</div>
<div style="display:flex;flex-direction:column;gap:8px;">
  <details style="background:#1e3a5f;border-radius:6px;">
    <summary style="padding:10px;cursor:pointer;">▶ Running <small>— agent reasoning</small></summary>
    <div style="padding:0 12px 12px;font-size:13px;color:#c8ccd8;">The ask_user tool sets self._input_needed = True and calls workflow.wait_condition(...). The workflow task completes here — no thread is held.</div>
  </details>
  <details style="background:#4a3b1e;border-radius:6px;">
    <summary style="padding:10px;cursor:pointer;">⏸ Suspended <small>— wait_condition</small></summary>
    <div style="padding:0 12px 12px;font-size:13px;color:#c8ccd8;">Status still shows Running in the Web UI, but there are zero pending activity tasks. No worker CPU, no memory held for this wait — just a durable marker in the event history.</div>
  </details>
  <details style="background:#5f1e3a;border-radius:6px;">
    <summary style="padding:10px;cursor:pointer;">📨 Signal <small>— provide_user_input</small></summary>
    <div style="padding:0 12px 12px;font-size:13px;color:#c8ccd8;">provide_user_input signal arrives, sets self._user_input and flips self._input_needed to False. That's the only thing that can unblock wait_condition — not a timer, not a poll.</div>
  </details>
  <details style="background:#1e5f3a;border-radius:6px;">
    <summary style="padding:10px;cursor:pointer;">▶ Resumed <small>— agent continues</small></summary>
    <div style="padding:0 12px 12px;font-size:13px;color:#c8ccd8;">wait_condition returns, ask_user returns the answer to the agent loop, and the LLM resumes reasoning with the new information — same workflow, same history, picked up exactly where it left off.</div>
  </details>
</div>
</div>

## Break It: The Durability Test

A human already gave this workflow something it cannot regenerate: an answer only they knew. Now break the network underneath it.

**1. Turn off the service.** Click the [button label="Network Control Panel" background="#444CE7"](tab-3) tab and toggle **Weather** off.

**2. Run a workflow.** Click the [button label="Starter" background="#444CE7"](tab-1) terminal:

```bash,run
uv run python -m start_workflow "What's the weather like where I'm traveling to this weekend?"
```

The agent pauses and asks for your destination. Type a city and press Enter - answer it exactly once.

**3. Observe.** Switch to the [button label="Temporal UI" background="#444CE7"](tab-2) tab and open the running workflow:

- Status is still **Running**.
- The history shows the `provide_user_input` signal you sent, recorded as a permanent event.
- After it, the weather activity is **Retrying**.

**4. Answer this question.** Before you turn the service back on:

> Your typed destination lives only in the workflow's history - there is no database behind this demo. As the weather activity retries, will the agent prompt you for that destination again?

<details>
<summary>Answer</summary>

No. You answer once, no matter how long the outage lasts.

The signal is an event in the history, exactly like a completed activity result. On every replay, `wait_condition` sees the flag already flipped and `ask_user` returns your recorded answer immediately - it never blocks again, so the starter never re-prompts.

This is what makes human-in-the-loop practical. Human attention is the most expensive input an agent can take, and the *only* one it cannot retry on its own. A system that re-asks after every downstream hiccup trains people to abandon it.
</details>

**5. Let it finish.** Toggle **Weather** back on in the [button label="Network Control Panel" background="#444CE7"](tab-3). The activity succeeds on its next attempt and the agent answers using the destination you typed before the outage.

## Reconnect to a Waiting Workflow

If you interrupt the worker with **Ctrl+C** while the agent is waiting, the workflow keeps running on the server. Find the workflow ID in the [button label="Temporal UI" background="#444CE7"](tab-2), then reconnect by starting the worker again and running the starter with the workflow ID:

```bash
uv run python -m start_workflow --workflow-id <workflow-id-from-ui>
```

Click **Check** when you've completed a full interaction with the agent.
