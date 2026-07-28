---
slug: heterogeneous-agents-different-sdks
id: dt0rx8urtvry
type: challenge
title: 'Demo 6a: Heterogeneous Agents - Different SDKs'
teaser: A Strands agent joins the OpenAI specialists. Same orchestrator, different
  framework, visible trade-off in the event history.
notes:
- type: text
  contents: |-
    # What if a specialist was built with a completely different framework?

    Demo 5 had two specialists, both using the OpenAI Agents SDK. Demo 6a
    adds a third: a travel planner built with Strands Agents SDK.

    Zero Temporal imports in the travel planner. The orchestrator doesn't
    care what framework its specialists use.
- type: text
  contents: |-
    # The durability trade-off, made visible

    OpenAI agents: per-step durability. Every LLM call and every tool call
    is its own Temporal activity. If a worker dies mid-loop, only the
    failing step retries.

    Strands agent: coarse-grained durability. The entire agent loop is one
    activity. If the worker dies, the whole loop restarts.

    Same orchestrator. Same Temporal primitives. Fundamentally different
    visibility in the event history.
tabs:
- id: ypgwuxt0kziq
  title: Worker PA
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo6a-different-sdks/exercise
- id: fpbdqvlxagej
  title: Worker F1
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo6a-different-sdks/exercise
- id: af8skzp4kqnl
  title: Starter
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo6a-different-sdks/exercise
- id: xyhiebpqolsq
  title: Temporal UI
  type: service
  hostname: workshop
  port: 8233
- id: tildfwfxblec
  title: Network Control Panel
  type: service
  hostname: workshop
  port: 5000
- id: i13kgascdn3j
  title: Editor
  type: service
  hostname: workshop
  path: /?folder=/root/workshop/demo6a-different-sdks
  port: 8080
difficulty: basic
timelimit: 1800
enhanced_loading: null
---

# Demo 6a: Heterogeneous Agents - Different SDKs

> [!NOTE]
> **Tabs:** [button label="Worker PA" background="#444CE7"](tab-0) [button label="Worker F1" background="#444CE7"](tab-1) [button label="Starter" background="#444CE7"](tab-2) [button label="Temporal UI" background="#444CE7"](tab-3) [button label="Network Control Panel" background="#444CE7"](tab-4) [button label="Editor" background="#444CE7"](tab-5)

## What Changed

Click the [button label="Editor" background="#444CE7"](tab-5) tab. Key files in `demo6a-different-sdks`:

- `travel_planner.py` - the Strands travel agent. **Zero Temporal imports.** Could be a library vendored from another team's codebase.
- `travel_planner_activity.py` - a single `@activity.defn` wrapper. It lazy-imports `travel_planner` and calls `run()`. About 10 lines.
- `personal_assistant.py` - now wires three tools: weather (child workflow), F1 (Nexus), and travel planner (direct activity).

> [!NOTE]
> **Hands-on:** Do your coding in the `exercise/` directory. Want to see the working code? Peek at `solution/`.

## Write the Wrapper

In the [button label="Editor" background="#444CE7"](tab-5) tab, open `exercise/travel_planner_activity.py` and `exercise/personal_assistant.py`. Follow the `TODO` comments in each file.

The orchestrator's `TODO` offers three timeouts for the travel tool. Only one is right. The whole Strands loop runs inside that one activity, so ask yourself what the timeout has to cover.

> **Picked wrong?** The starter will hang instead of failing. Check the [button label="Worker PA" background="#444CE7"](tab-0) terminal and the [button label="Temporal UI" background="#444CE7"](tab-3):
>
> - The `ask_travel_planner` activity times out and retries, over and over, never finishing - the timeout is shorter than one pass of the Strands agent. Wrapping an external agent as a single activity means the timeout has to cover its entire loop, not one LLM call.
> - `Activity must have start_to_close_timeout or schedule_to_close_timeout` - Temporal will not schedule an activity with no bound on an attempt.

Stuck? Compare against `solution/travel_planner_activity.py` and `solution/personal_assistant.py`.

## Start the Workers

Click the [button label="Worker PA" background="#444CE7"](tab-0) terminal.

```bash,run
uv run python -m worker_pa
```

Click the [button label="Worker F1" background="#444CE7"](tab-1) terminal.

```bash,run
uv run python -m worker_f1
```

Each prints a `PA worker running:` / `F1 worker running:` banner like demo 5, then keeps running. If either fails on `OPENAI_API_KEY not set`, open a fresh terminal tab.

## Run It

Click the [button label="Starter" background="#444CE7"](tab-2) terminal.

```bash,run
uv run python -m start_workflow "When is the next F1 race, what's the weather there right now, and what should I know about visiting?"
```

You should see a final answer covering the race, the weather, and travel advice, after a few seconds.

> **Predict before you look:** the travel planner's entire Strands loop - every internal LLM call, every internal tool call - becomes how many entries in the orchestrator's event history? One, or one per internal step? Check the next section.

## The Contrast

Open the orchestrator workflow in the [button label="Temporal UI" background="#444CE7"](tab-3) and compare to demo 5:

- Weather: `StartChildWorkflowExecution` (same as demo 5)
- F1: `NexusOperationScheduled` / `NexusOperationCompleted` (same as demo 5)
- Travel planner: **a single `ScheduleActivityTask: ask_travel_planner`** - the entire Strands loop, all its LLM calls and tool calls, inside one opaque event

That contrast is the point.

<div style="border:1px solid #333;border-radius:8px;padding:16px;background:#111;color:#eee;font-family:sans-serif;max-width:680px;margin:16px 0;">
<div style="font-size:13px;color:#8b8fa3;margin-bottom:8px;">🖱️ TRY ME: toggle between the two durability shapes</div>
<div style="text-align:center;margin-bottom:10px;">
  <button id="dur-fine-btn" onclick="document.getElementById('dur-fine').style.display='block';document.getElementById('dur-coarse').style.display='none';this.style.background='#1e5f3a';document.getElementById('dur-coarse-btn').style.background='#242832';" style="padding:8px 16px;border:none;border-radius:6px 0 0 6px;background:#1e5f3a;color:#fff;cursor:pointer;">Per-step (OpenAI Agents)</button><button id="dur-coarse-btn" onclick="document.getElementById('dur-coarse').style.display='block';document.getElementById('dur-fine').style.display='none';this.style.background='#5f1e3a';document.getElementById('dur-fine-btn').style.background='#242832';" style="padding:8px 16px;border:none;border-radius:0 6px 6px 0;background:#242832;color:#fff;cursor:pointer;">Coarse (Strands)</button>
</div>
<div id="dur-fine" style="display:block;">
  <div style="display:flex;gap:6px;justify-content:center;flex-wrap:wrap;">
    <div style="padding:8px 10px;border-radius:6px;background:#1e3a5f;font-size:12px;">LLM call</div>
    <div style="padding:8px 10px;border-radius:6px;background:#1e5f3a;font-size:12px;">Tool call</div>
    <div style="padding:8px 10px;border-radius:6px;background:#1e3a5f;font-size:12px;">LLM call</div>
    <div style="padding:8px 10px;border-radius:6px;background:#1e5f3a;font-size:12px;">Tool call</div>
    <div style="padding:8px 10px;border-radius:6px;background:#1e3a5f;font-size:12px;">LLM call</div>
  </div>
  <p style="font-size:14px;color:#c8ccd8;margin-top:10px;">Five separate activities. If the worker dies after the second tool call, only that step retries - everything before it stays done.</p>
</div>
<div id="dur-coarse" style="display:none;">
  <div style="display:flex;justify-content:center;">
    <div style="padding:16px 24px;border-radius:6px;background:#5f1e3a;font-size:13px;text-align:center;">ScheduleActivityTask: ask_travel_planner<br><small style="color:#c8ccd8;">(LLM call → tool call → LLM call → tool call → LLM call, all inside)</small></div>
  </div>
  <p style="font-size:14px;color:#c8ccd8;margin-top:10px;">One opaque activity. If the worker dies mid-loop, the whole loop restarts from the beginning - the price of a framework with zero Temporal imports.</p>
</div>
</div>

## Try More Prompts

Click the [button label="Starter" background="#444CE7"](tab-2) terminal.

```bash,run
uv run python -m start_workflow "Tell me about Monaco as a travel destination."
```

```bash,run
uv run python -m start_workflow "What's the current weather at the locations of the next two F1 races?"
```

Click **Check** when you've run at least one workflow that invokes the travel planner.
