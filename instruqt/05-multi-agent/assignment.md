---
slug: multi-agent
id: rxgcngqixygm
type: challenge
title: 'Demo 5: Multi-Agent Orchestration'
teaser: Three agents, three workflows. A personal assistant delegates to specialists
  via child workflow and Nexus.
notes:
- type: text
  contents: |-
    # What if each specialist were its own workflow?

    Demo 4 was one workflow, one agent. Demo 5 introduces agent-as-workflow:
    each specialist is a real Temporal workflow execution, not an inline function.

    Two different invocation patterns. Two different visibility profiles in
    the Temporal UI. One orchestrator that doesn't care which pattern each
    specialist uses.
- type: text
  contents: |-
    # Child workflows vs. Nexus

    The weather agent is a child workflow. Parent-child semantics, trace
    context propagates, shows as StartChildWorkflowExecution in the parent.

    The F1 expert is a Nexus operation. Designed for cross-namespace
    boundaries, clean typed interface, shows as NexusOperationScheduled
    in the parent.

    Same result from the orchestrator's point of view. Different shapes
    in the event history.
tabs:
- id: hx6jhpz5nbvh
  title: Worker PA
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo5-multi-agent/exercise
- id: g9ziyqybjjrj
  title: Worker F1
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo5-multi-agent/exercise
- id: yj5yjnquaygz
  title: Starter
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo5-multi-agent/exercise
- id: eh9k2exhtlvz
  title: Temporal UI
  type: service
  hostname: workshop
  port: 8233
- id: qerxtnbnpbg8
  title: Network Control Panel
  type: service
  hostname: workshop
  port: 5000
- id: uzhfldcmiky9
  title: Editor
  type: service
  hostname: workshop
  path: /?folder=/root/workshop/demo5-multi-agent
  port: 8080
- id: rqplaghcpsvf
  title: Architecture
  type: service
  hostname: workshop
  path: /
  port: 8090
difficulty: basic
timelimit: 1800
enhanced_loading: null
---

# Demo 5: Multi-Agent Orchestration

## See the Big Picture First

Before you touch code, open the [button label="Architecture" background="#444CE7"](tab-6) tab to inspect how this demo fits together: every file, class, and method, grouped by the three task queues and two worker processes.

Click any box to trace what it calls and what calls it. Then press **Play data flow** to watch the request `"What's the weather at the next F1 race?"` move through the orchestrator, out to both specialists (child workflow and Nexus), and back.

## What Changed

Click the [button label="Editor" background="#444CE7"](tab-5) tab. Key files in `demo5-multi-agent`:

- `personal_assistant.py` - the orchestrator. Uses `child_workflow_as_tool` for weather and `nexus_operation_as_tool` for F1.
- `weather_agent.py` - runs as its own workflow on `weather-agent-tq`.
- `f1_expert_agent.py` - runs as its own workflow on `f1-expert-agent-tq`. Also defines the Nexus service interface and handler.
- `worker_pa.py` - orchestrator + weather agent (two task queues, one process).
- `worker_f1.py` - F1 expert + Nexus handler (separate process, separate plugin config).

> [!NOTE]
> **Hands-on:** Do your coding in the `exercise/` directory. Want to see the working code? Peek at `solution/`.

## Wire Up the Orchestrator

In the [button label="Editor" background="#444CE7"](tab-5) tab, open `exercise/personal_assistant.py` and follow the `TODO`s to uncomment the two specialist tools and wire them into the orchestrator.

Stuck? Compare against `solution/personal_assistant.py`.

## Start the Workers

Click the [button label="Worker PA" background="#444CE7"](tab-0) terminal.

```bash,run
uv run python -m worker_pa
```

You should see:

```bash,nocopy
PA worker running:
  - weather-agent-tq (WeatherAgentWorkflow)
  - orchestrator-tq (PersonalAssistantWorkflow)
```

The worker keeps running after that banner. Leave it and open the next terminal.

Click the [button label="Worker F1" background="#444CE7"](tab-1) terminal.

```bash,run
uv run python -m worker_f1
```

You should see:

```bash,nocopy
F1 worker running:
  - f1-expert-agent-tq (F1ExpertAgentWorkflow + Nexus handler)
  - plugin: add_temporal_spans=False (Nexus trace gap workaround)
```

> **If either fails:** `OPENAI_API_KEY not set` means the key didn't carry into this terminal. If Nexus endpoint errors appear, the track setup registers them automatically - retry after both workers are up.

## Run It

Click the [button label="Starter" background="#444CE7"](tab-2) terminal.

```bash,run
uv run python -m start_workflow "When is the next F1 race and what's the weather there right now?"
```

You should see a final answer combining the race date/location and current weather there, after a few seconds.

> **Predict before you look:** you're about to see three separate workflow executions instead of one. Which one do you expect to show `StartChildWorkflowExecution`, and which one `NexusOperationScheduled` - the weather call or the F1 call? Check the Web UI in the next step.

## The Key Moment

Click the [button label="Temporal UI" background="#444CE7"](tab-3) tab. Look for **three separate workflow executions**:

- The **orchestrator** on `orchestrator-tq`. Its history shows `StartChildWorkflowExecution` for weather and `NexusOperationScheduled` for F1.
- A separate **WeatherAgentWorkflow** on `weather-agent-tq`.
- A separate **F1ExpertAgentWorkflow** on `f1-expert-agent-tq`.

Each specialist is independently observable, independently retryable, and could run on a different team's infrastructure.

<div style="border:1px solid #333;border-radius:8px;padding:16px;background:#111;color:#eee;font-family:sans-serif;max-width:680px;margin:16px 0;">
<div style="font-size:13px;color:#8b8fa3;margin-bottom:12px;">🖱️ TRY ME: expand a specialist to see its shape in the orchestrator's history</div>
<div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;">
  <div style="text-align:center;padding:14px;border-radius:8px;background:#242832;min-width:130px;align-self:center;">🧭 Orchestrator<br><small>orchestrator-tq</small></div>
  <div style="font-size:20px;color:#8b8fa3;align-self:center;">→</div>
  <details style="flex:1;min-width:220px;background:#1e3a5f;border-radius:8px;">
    <summary style="padding:14px;cursor:pointer;text-align:center;">🌤 Weather Agent<br><small>weather-agent-tq</small></summary>
    <div style="padding:0 14px 14px;font-size:13px;color:#c8ccd8;"><strong>StartChildWorkflowExecution</strong> — Weather runs as a real child workflow. Parent-child semantics apply: trace context propagates automatically, and it shows as StartChildWorkflowExecution / ChildWorkflowExecutionStarted / ...Completed in the parent's history. Built for same-namespace parent-child relationships.</div>
  </details>
  <details style="flex:1;min-width:220px;background:#5f1e3a;border-radius:8px;">
    <summary style="padding:14px;cursor:pointer;text-align:center;">🏎 F1 Expert<br><small>f1-expert-agent-tq</small></summary>
    <div style="padding:0 14px 14px;font-size:13px;color:#c8ccd8;"><strong>NexusOperationScheduled</strong> — F1 expert is called as a Nexus operation. Designed for cross-namespace (or cross-cluster) boundaries with a clean typed interface, it shows as NexusOperationScheduled / NexusOperationStarted / ...Completed in the parent's history. A different shape for a different kind of boundary.</div>
  </details>
</div>
<div style="margin-top:12px;font-size:13px;color:#c8ccd8;">Same result from the orchestrator's point of view. Different event-history shape underneath.</div>
</div>

## Try More Prompts

Click the [button label="Starter" background="#444CE7"](tab-2) terminal.

```bash,run
uv run python -m start_workflow "What's the current weather at the locations of the next two F1 races?"
```

```bash,run
uv run python -m start_workflow "When is the next F1 race?"
```

Click **Check** when you've run at least one workflow successfully.
