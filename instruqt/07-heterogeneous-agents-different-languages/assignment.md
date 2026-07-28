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
- id: 2lqvil08tu99
  title: Architecture
  type: service
  hostname: workshop
  path: /
  port: 8091
difficulty: basic
timelimit: 2400
enhanced_loading: null
---

# Demo 6b: Heterogeneous Agents - Different Languages

## See the Big Picture First

Before you touch code, open the [button label="Architecture" background="#444CE7"](tab-7) tab to see how this demo fits together: three specialists behind one Python orchestrator, grouped by their four task queues and three worker processes (two Python, one Java).

The rose path is the one that matters here: the travel planner is reached over a **cross-language Nexus boundary** (Python to Java). Click any box to trace what it calls, or press **Play data flow** to watch a request fan out to all three specialists and back.

## What Changed from 6a

| | demo6a | demo6b |
|---|---|---|
| Travel planner language | Python | Java |
| Travel planner framework | Strands Agents SDK | Spring AI |
| Invocation from orchestrator | direct activity | Nexus operation |
| Durability of travel agent | coarse (whole loop = one activity) | per-step (each LLM/tool call = one activity) |

> [!NOTE]
> **Hands-on:** Do your coding in the `exercise/` directory. Want to see the working code? Peek at `solution/`.

## Wire Up the Nexus Call

In the [button label="Editor" background="#444CE7"](tab-6) tab, open `exercise/personal_assistant.py` and follow the `TODO`.

Stuck? Compare against `solution/personal_assistant.py`.

## Start the Java Worker

Click the [button label="Java Worker" background="#444CE7"](tab-0) terminal. Dependencies were pre-fetched in the image so this starts in seconds.

```bash,run
./mvnw spring-boot:run
```

You should see Maven build output, then Spring Boot startup logs ending in `Started WorkerApplication`:

```text
[INFO] Scanning for projects...
[INFO]
[INFO] ------------< io.temporal.ai.workshop:travel-planner-java >-------------
[INFO] Building travel-planner-java 0.1.0
[INFO] --------------------------------[ jar ]---------------------------------
[INFO]
[INFO] >>> spring-boot:3.5.12:run (default-cli) > test-compile @ travel-planner-java >>>
...
INFO  io.temporal.ai.workshop.travel.WorkerApplication : Starting WorkerApplication
INFO  i.t.s.WorkerFactory                              : Started Worker Factory
INFO  io.temporal.ai.workshop.travel.WorkerApplication : Started WorkerApplication in 4.2 seconds
```

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
<div style="font-size:13px;color:#8b8fa3;margin-bottom:12px;">🖱️ TRY ME: expand each demo to see how the travel planner's durability changed</div>
<div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;">
  <details style="flex:1;min-width:240px;background:#5f1e3a;border-radius:8px;">
    <summary style="padding:12px;cursor:pointer;text-align:center;">demo 6a<br><small>Python · Strands · direct activity</small></summary>
    <div style="padding:0 12px 12px;font-size:13px;color:#c8ccd8;">Python + Strands, called as a direct activity. Whole loop = one ScheduleActivityTask: ask_travel_planner. A worker crash mid-loop restarts the entire travel-planning conversation from scratch.</div>
  </details>
  <div style="font-size:20px;color:#8b8fa3;align-self:center;">→</div>
  <details style="flex:1;min-width:240px;background:#1e5f3a;border-radius:8px;">
    <summary style="padding:12px;cursor:pointer;text-align:center;">demo 6b<br><small>Java · Spring AI · Nexus</small></summary>
    <div style="padding:0 12px 12px;font-size:13px;color:#c8ccd8;">Java + Spring AI, called over Nexus — the same boundary the F1 expert already uses. The orchestrator sees NexusOperationScheduled/Completed, and the TravelPlannerAgentWorkflow's own history shows a ChatModelActivity per LLM call and a separate activity per tool call. A worker crash mid-loop only retries the step that was running.</div>
  </details>
</div>
<div style="margin-top:12px;font-size:13px;color:#c8ccd8;">Same specialist, same job — travel advice. Different event-history shape and crash-recovery story underneath.</div>
</div>

## Try More Prompts

Click the [button label="Starter" background="#444CE7"](tab-3) terminal.

```bash,run
uv run python -m start_workflow "What's the weather at the next F1 race and what should I know about visiting the destination?"
```

```bash,run
uv run python -m start_workflow "When is the next F1 race?"
```

Click **Check** when you've run at least one workflow that invokes the Java travel planner.
