---
slug: heterogeneous-agents-different-languages
id: vm5iwoklkhqc
type: challenge
title: 'Demo 6b: Heterogeneous Agents - Different Languages'
teaser: The travel planner moves to Java and Spring AI. Per-step durability across
  a language boundary, over Nexus.
notes:
- type: text
  contents: |-
    # What if a specialist was written in a completely different language?

    Demo 6a showed different frameworks, same language. Demo 6b shows a
    different language entirely: the travel planner is reimplemented in
    Java with Spring AI.

    The Python orchestrator reaches it over Nexus - the same boundary it
    already uses for the F1 expert. The Java side shares no code with
    Python. They agree only on string names and JSON shapes.
- type: text
  contents: |-
    # The payoff: per-step durability across the language boundary

    In demo 6a the Strands travel planner was one opaque activity. The
    entire loop lived inside one event.

    In demo 6b the Spring AI travel planner gets per-step durability.
    Every LLM call and every tool call is its own Temporal activity -
    exactly like the OpenAI Agents SDK specialists.

    Compare the two histories side by side.
tabs:
- id: jk6wyakcueq7
  title: Java Worker
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo6b-different-languages/exercise/travel-planner-java
- id: n9ffeuwu2acu
  title: Worker PA
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo6b-different-languages/exercise
- id: ycxqxzewm3yg
  title: Worker F1
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo6b-different-languages/exercise
- id: xv6pjormhtjr
  title: Starter
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo6b-different-languages/exercise
- id: ew0eepcvrwxl
  title: Temporal UI
  type: service
  hostname: workshop
  port: 8233
- id: x0ce7tdgsxwf
  title: Network Control Panel
  type: service
  hostname: workshop
  port: 5000
- id: r5q2o5unbfxv
  title: Editor
  type: service
  hostname: workshop
  path: /?folder=/root/workshop/demo6b-different-languages
  port: 8080
difficulty: basic
timelimit: 2400
enhanced_loading: null
---

# Demo 6b: Heterogeneous Agents - Different Languages

> [!NOTE]
> **Tabs:** [button label="Java Worker" background="#444CE7"](tab-0) [button label="Worker PA" background="#444CE7"](tab-1) [button label="Worker F1" background="#444CE7"](tab-2) [button label="Starter" background="#444CE7"](tab-3) [button label="Temporal UI" background="#444CE7"](tab-4) [button label="Network Control Panel" background="#444CE7"](tab-5) [button label="Editor" background="#444CE7"](tab-6)

## What Changed from 6a

| | demo6a | demo6b |
|---|---|---|
| Travel planner language | Python | Java |
| Travel planner framework | Strands Agents SDK | Spring AI |
| Invocation from orchestrator | direct activity | Nexus operation |
| Durability of travel agent | coarse (whole loop = one activity) | per-step (each LLM/tool call = one activity) |

## Wire Up the Nexus Call

In the [button label="Editor" background="#444CE7"](tab-6) tab, open `exercise/personal_assistant.py` and follow the `TODO`.

Stuck? Compare against `solution/personal_assistant.py`.

## Start the Java Worker

Click the [button label="Java Worker" background="#444CE7"](tab-0) terminal. Dependencies were pre-fetched in the image so this starts in seconds.

```bash,run
./mvnw spring-boot:run
```

First you'll see Maven build output (`[INFO] Scanning for projects...`, then a `test-compile` phase). The banner is turned off (`banner-mode: "off"` in `application.yaml`), so watch for the `Started WorkerApplication in N seconds` line near the end of the log - that's the worker up and polling the `travel-planner-agent-tq` task queue.

> **If it fails:** a port-already-in-use error means a previous run's process is still bound - stop it with **Ctrl+C** in this tab and retry. Dependencies were pre-fetched in the image, so a slow first build usually means the image cache was skipped; retry once.

## Start the Python Workers

Click the [button label="Worker PA" background="#444CE7"](tab-1) terminal.

```bash,run
uv run python -m worker_pa
```

Click the [button label="Worker F1" background="#444CE7"](tab-2) terminal.

```bash,run
uv run python -m worker_f1
```

Each prints a `PA worker running:` / `F1 worker running:` banner, then keeps running. `OPENAI_API_KEY not set` means the key didn't carry into this terminal.

## Run It

Click the [button label="Starter" background="#444CE7"](tab-3) terminal.

```bash,run
uv run python -m start_workflow "What should I know about visiting Monaco?"
```

You should see travel advice about Monaco after a few seconds - now served by the Java worker instead of the demo6a Strands agent.

> **Predict before you look:** demo 6a's travel planner showed up as one opaque `ScheduleActivityTask` event. Given that the Java side uses Spring AI (not the Strands SDK), do you expect the same single-event shape, or something closer to the OpenAI Agents SDK's per-step activities? Check the next section.

## The Key Comparison

Open the [button label="Temporal UI" background="#444CE7"](tab-4) tab.

In the **orchestrator** history, the travel planner path now shows `NexusOperationScheduled` / `NexusOperationCompleted` instead of a single opaque activity event.

Then find the **`TravelPlannerAgentWorkflow`** on `travel-planner-agent-tq`. Its history shows per-step activities: a `ChatModelActivity` for each LLM call, individual activities for each tool call. That's Spring AI giving the Java agent the same per-step durability the OpenAI Agents SDK gives the Python agents.

<div style="border:1px solid #333;border-radius:8px;padding:16px;background:#111;color:#eee;font-family:sans-serif;max-width:680px;margin:16px 0;">
<div style="font-size:13px;color:#8b8fa3;margin-bottom:8px;">🖱️ TRY ME: click each demo to see how the travel planner's durability changed</div>
<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
  <div class="lang-demo" data-detail="Python + Strands, called as a direct activity. Whole loop = one ScheduleActivityTask: ask_travel_planner. A worker crash mid-loop restarts the entire travel-planning conversation from scratch." style="text-align:center;padding:12px;border-radius:8px;background:#5f1e3a;cursor:pointer;min-width:150px;">demo 6a<br><small>Python · Strands · direct activity</small></div>
  <div style="font-size:20px;color:#8b8fa3;align-self:center;">→</div>
  <div class="lang-demo" data-detail="Java + Spring AI, called over Nexus - the same boundary the F1 expert already uses. The orchestrator sees NexusOperationScheduled/Completed, and the TravelPlannerAgentWorkflow's own history shows a ChatModelActivity per LLM call and a separate activity per tool call. A worker crash mid-loop only retries the step that was running." style="text-align:center;padding:12px;border-radius:8px;background:#1e5f3a;cursor:pointer;min-width:150px;">demo 6b<br><small>Java · Spring AI · Nexus</small></div>
</div>
<div id="lang-note" style="margin-top:14px;min-height:56px;font-size:14px;color:#c8ccd8;">Same specialist, same job - travel advice. Click either box to see what changed in its event-history shape and crash-recovery story.</div>
</div>
<script>
document.querySelectorAll('.lang-demo').forEach(function(el){
  el.addEventListener('click', function(){
    document.getElementById('lang-note').textContent = el.getAttribute('data-detail');
    document.querySelectorAll('.lang-demo').forEach(function(s){ s.style.outline = ''; });
    el.style.outline = '2px solid #fff';
  });
});
</script>

## Try More Prompts

Click the [button label="Starter" background="#444CE7"](tab-3) terminal.

```bash,run
uv run python -m start_workflow "What's the weather at the next F1 race and what should I know about visiting the destination?"
```

```bash,run
uv run python -m start_workflow "When is the next F1 race?"
```

Click **Check** when you've run at least one workflow that invokes the Java travel planner.
