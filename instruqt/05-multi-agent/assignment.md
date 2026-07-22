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
  type: code
  hostname: workshop
  path: /root/workshop/demo5-multi-agent
difficulty: basic
timelimit: 1800
enhanced_loading: null
---

# Demo 5: Multi-Agent Orchestration

> [!NOTE]
> **Tabs:** [button label="Worker PA" background="#444CE7"](tab-0) [button label="Worker F1" background="#444CE7"](tab-1) [button label="Starter" background="#444CE7"](tab-2) [button label="Temporal UI" background="#444CE7"](tab-3) [button label="Network Control Panel" background="#444CE7"](tab-4) [button label="Editor" background="#444CE7"](tab-5)

## What Changed

Click the [button label="Editor" background="#444CE7"](tab-5) tab. Key files in `demo5-multi-agent`:

- `personal_assistant.py` - the orchestrator. Uses `child_workflow_as_tool` for weather and `nexus_operation_as_tool` for F1.
- `weather_agent.py` - runs as its own workflow on `weather-agent-tq`.
- `f1_expert_agent.py` - runs as its own workflow on `f1-expert-agent-tq`. Also defines the Nexus service interface and handler.
- `worker_pa.py` - orchestrator + weather agent (two task queues, one process).
- `worker_f1.py` - F1 expert + Nexus handler (separate process, separate plugin config).

## Wire Up the Orchestrator

Open `exercise/personal_assistant.py`. One TODO stub: build `weather_tool` with `child_workflow_as_tool` and `f1_tool` with `nexus_operation_as_tool`, then wire both into the orchestrator Agent's tools list.

Stuck? Compare against `solution/personal_assistant.py` in the [button label="Editor" background="#444CE7"](tab-5) tab.

## Start the Workers

Click the [button label="Worker PA" background="#444CE7"](tab-0) terminal.

```bash,run
uv run python -m worker_pa
```

You should see:

```bash,nocopy
Started worker on task queue: orchestrator-tq
Started worker on task queue: weather-agent-tq
```

Click the [button label="Worker F1" background="#444CE7"](tab-1) terminal.

```bash,run
uv run python -m worker_f1
```

You should see:

```bash,nocopy
Started worker on task queue: f1-expert-agent-tq
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
<div style="font-size:13px;color:#8b8fa3;margin-bottom:8px;">🖱️ TRY ME: click a specialist to see its shape in the orchestrator's history</div>
<div style="display:flex;gap:12px;justify-content:center;align-items:center;flex-wrap:wrap;">
  <div style="text-align:center;padding:14px;border-radius:8px;background:#242832;min-width:140px;">🧭 Orchestrator<br><small>orchestrator-tq</small></div>
  <div style="font-size:20px;color:#8b8fa3;">→</div>
  <div class="ma-specialist" data-shape="StartChildWorkflowExecution" data-note="Weather runs as a real child workflow. Parent-child semantics apply: trace context propagates automatically, and it shows as StartChildWorkflowExecution / ChildWorkflowExecutionStarted / ...Completed in the parent's history. Built for same-namespace parent-child relationships." style="text-align:center;padding:14px;border-radius:8px;background:#1e3a5f;cursor:pointer;min-width:140px;">🌤 Weather Agent<br><small>weather-agent-tq</small></div>
  <div class="ma-specialist" data-shape="NexusOperationScheduled" data-note="F1 expert is called as a Nexus operation. Designed for cross-namespace (or cross-cluster) boundaries with a clean typed interface, it shows as NexusOperationScheduled / NexusOperationStarted / ...Completed in the parent's history - a different shape for a different kind of boundary." style="text-align:center;padding:14px;border-radius:8px;background:#5f1e3a;cursor:pointer;min-width:140px;">🏎 F1 Expert<br><small>f1-expert-agent-tq</small></div>
</div>
<div id="ma-note" style="margin-top:14px;min-height:56px;font-size:14px;color:#c8ccd8;">Click either specialist above. Same result from the orchestrator's point of view - different event-history shape underneath.</div>
</div>
<script>
document.querySelectorAll('.ma-specialist').forEach(function(el){
  el.addEventListener('click', function(){
    document.getElementById('ma-note').innerHTML = '<strong>' + el.getAttribute('data-shape') + '</strong>: ' + el.getAttribute('data-note');
    document.querySelectorAll('.ma-specialist').forEach(function(s){ s.style.outline = ''; });
    el.style.outline = '2px solid #fff';
  });
});
</script>

## Try More Prompts

Click the [button label="Starter" background="#444CE7"](tab-2) terminal.

```bash,run
uv run python -m start_workflow "What's the current weather at the locations of the next two F1 races?"
```

```bash,run
uv run python -m start_workflow "When is the next F1 race?"
```

Click **Check** when you've run at least one workflow successfully.
