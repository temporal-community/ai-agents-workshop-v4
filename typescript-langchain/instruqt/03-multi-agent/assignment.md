---
slug: multi-agent
id: jrablxnbyyfu
type: challenge
title: Multi-Agent
teaser: A triage agent that answers nothing itself. Two specialists, two Workflow
  Executions, two different ways of reaching them.
notes:
- type: text
  contents: |-
    # One agent with twelve tools is a monolith

    Give one agent every tool you own and you get a long system prompt, a
    model that picks the wrong tool, a deploy that touches everything, and
    an Event History nobody can read.

    Split it. A triage agent that routes, and specialists that each know
    one domain and own their own tools.
- type: text
  contents: |-
    # Who decides what runs at the same time?

    Each specialist runs as its own Workflow Execution, started by the
    orchestrator as a Child Workflow.

    When a question names three cities, you do not want three round trips
    one after another. You want all three at once - and that is a decision
    your code makes, not one the model makes for you. It is an ordinary
    `Promise.all` over three Child Workflows.

    Doing it in a loop instead costs three times the wall-clock and looks
    identical in the code and in the Event History. You only find it in the
    latency graph.
tabs:
- id: hkonrpgtl7am
  title: Workers
  type: terminal
  hostname: workshop
  workdir: /root/workshop/decouple-agents/exercise
- id: loeezxd7lqzv
  title: Client
  type: terminal
  hostname: workshop
  workdir: /root/workshop/decouple-agents/exercise
- id: xhstnrejlu7v
  title: Temporal UI
  type: service
  hostname: workshop
  port: 8233
- id: ra3sdajvyge2
  title: Editor
  type: service
  hostname: workshop
  path: /?folder=/root/workshop/decouple-agents
  port: 8080
difficulty: basic
timelimit: 2400
enhanced_loading: null
---

# Multi-Agent

> [!NOTE]
> **Your tabs.**
> - [button label="Workers" background="#444CE7"](tab-0) - one process, two Workers, two Task Queues.
> - [button label="Client" background="#444CE7"](tab-1) - asks a question.
> - [button label="Temporal UI" background="#444CE7"](tab-2) - Event History. This is where the challenge pays off.
> - [button label="Editor" background="#444CE7"](tab-3) - VS Code, open on the whole workshop.

> [!WARNING]
> You work in `exercise/`. `solution/` sits beside it with identical filenames - check the editor's title bar before you type.

This challenge needs **TODO 1** (`exercise/src/shared/modelProvider.ts`) and **TODO 2** (`exercise/src/shared/weatherTools.ts`) from challenge 1.

## The shape you are building

Several Workflow Executions per question, on two Task Queues:

| Agent | Task Queue | Reached by | Event in the caller's history |
|---|---|---|---|
| Triage orchestrator | `c3-orchestrator-tq` | the client | - |
| Weather specialist | `c3-specialists-tq` | Child Workflow | `StartChildWorkflowExecution` |
| Travel specialist | `c3-specialists-tq` | Child Workflow | `StartChildWorkflowExecution` |

Every specialist is a Workflow Execution of its own: its own history, its own retries, its own
Task Queue. The orchestrator's agent code sees only tools.

## The four TODOs

**TODO 9** - `exercise/src/shared/childWorkflowAsTool.ts`

Make the tool start a Child Workflow. The Agents SDK ships a wrapper for turning an Activity into a tool; a Child Workflow needs one of your own, and this is it. Every call the model makes here becomes a full Workflow Execution with its own history, its own retries and its own Task Queue.

Read the TODO's warning about the Workflow ID. Workflow code must produce the same values on replay as it did the first time, so `Math.random()` is a correctness bug, not a style preference.

**TODO 10** - `exercise/src/challenge3-multi-agent/workflows.ts`

The travel specialist, reached the same way as the weather one. Once it is done, both specialists are Child Workflows on one queue - one deployment, owned by one team, independent of the orchestrator.

**TODO 11** - `exercise/src/challenge3-multi-agent/workflows.ts`

Fan out. One tool, several cities, all their Child Workflows running at the same time.

This is the one place in the workshop where **the Workflow decides the concurrency, not the model**. The model calls the tool once; what happens inside is ordinary deterministic code. Awaiting in a loop instead would be the anti-pattern - identical work, identical history, N times the latency.

**TODO 12** - `exercise/src/challenge3-multi-agent/worker.ts`

A second Worker, on the specialists' Task Queue, carrying the specialists' Activities. It lives in the same process here only for convenience - it is a separate deployment in every way that matters.

> Stuck? The same files under `solution/` are the answer.

## Start the Workers

Click the [button label="Workers" background="#444CE7"](tab-0) terminal.

```bash,run
npm run c3:worker
```

It prints `Challenge 3 Workers polling c3-orchestrator-tq and c3-specialists-tq` and then keeps running.

## Run it

Click the [button label="Client" background="#444CE7"](tab-1) terminal.

```bash,run
npm run c3:client -- "What's the weather in Monaco, and what should I know about visiting?"
```

You get one answer combining conditions in Monaco and what the place is like.

> **If it hangs with no output for a minute:** TODO 12 is the usual cause. With only the orchestrator Worker running, the specialists' Task Queue has nobody polling it, so every Child Workflow is scheduled and never picked up. Look in the [button label="Temporal UI" background="#444CE7"](tab-2) tab - a Workflow stuck in `Running` with a pending task and no Worker is the signature. It is also what an unpolled queue looks like in production.

## Read the Event History

Click the [button label="Temporal UI" background="#444CE7"](tab-2) tab. There are **three** Executions from that one question.

Open the orchestrator's history:

- `StartChildWorkflowExecution` -> `ChildWorkflowExecutionStarted` -> `ChildWorkflowExecutionCompleted`, once per specialist
- the model calls that decided to route, and the one that composed the final answer

Then open the two specialist Executions. Each has its own complete history: its own model calls, its own tool Activities, its own retry behaviour. A failure inside the weather specialist is a fact about the weather specialist, not about the request.

## Watch the fan-out

Now the parallel path. Click the [button label="Client" background="#444CE7"](tab-1) terminal.

```bash,run
npm run c3:client -- "Compare the weather in Barcelona, Tokyo and Reykjavik."
```

> **Predict before you look:** three cities. How many Workflow Executions, and does the answer take three times as long as one city?

<details>
<summary>Answer</summary>

Four Executions - the orchestrator plus one weather specialist per city - and it takes roughly as long as a single city, not three times as long.

In the [button label="Temporal UI" background="#444CE7"](tab-2) tab, sort by start time. The three specialists start within moments of each other rather than in sequence, because `Promise.all` started them all before awaiting any of them. In the orchestrator's history you can see the same thing: three `StartChildWorkflowExecution` events in a row, and only then the completions.

Change that `Promise.all` to an `await` inside a `for` loop and the history looks almost identical - same events, same order - while the wall-clock triples. That is what makes this anti-pattern easy to ship: it is invisible in the code review and invisible in the Event History. You find it in the latency graph.

</details>

## Break it: how far does a failure spread?

**1.** In the [button label="Client" background="#444CE7"](tab-1) terminal, ask something that needs both specialists:

```bash,run
npm run c3:client -- "What's the weather in Reykjavik, and what should I know about visiting Iceland?"
```

**2.** While it is running, go to the [button label="Workers" background="#444CE7"](tab-0) terminal and press **Ctrl+C**. Both Workers die at once - orchestrator and specialists.

**3.** Look at the [button label="Temporal UI" background="#444CE7"](tab-2) tab. All three Executions are still **Running**, each frozen at whatever step it had reached. They stopped at different points, because they are genuinely independent.

**4.** Before you restart anything:

> The orchestrator is waiting on a Child Workflow that is itself waiting on an Activity. Three histories, three positions. When Workers come back, who tells the orchestrator where to resume?

<details>
<summary>Answer</summary>

Nobody has to. Each Execution carries its own answer.

Every one of the three is resumed the same way and independently: a Worker picks up its Workflow Task, replays that Execution's own history to rebuild its state, and continues from the first step that has no recorded result. The orchestrator does not need to know how far the child got, only that it has not completed yet - and when it does, that completion arrives as an event in the orchestrator's history like any other.

Which is the operational argument for splitting agents across Workflow boundaries, on top of the architectural one. Written as three function calls in one process, a failure anywhere unwinds the whole request and the model calls you already paid for go with it. Here the blast radius of a failure is the specialist that owns the thing that failed.

</details>

**5.** Restart both Workers in the [button label="Workers" background="#444CE7"](tab-0) terminal:

```bash,run
npm run c3:worker
```

All three Executions resume, the orchestrator gets both answers, and the [button label="Client" background="#444CE7"](tab-1) terminal prints the combined reply.

## Try more prompts

Click the [button label="Client" background="#444CE7"](tab-1) terminal.

```bash,run
npm run c3:client -- "What should I know about visiting Suzuka Circuit?"
```

That one needs only the travel specialist. Check the orchestrator's history: one `StartChildWorkflowExecution`, not two. The triage agent routed to one specialist because that is all the question needed.

Click **Check** when you have run at least one question through both specialists.

---

**Please share your feedback so we can make better content for you.** The **Feedback**
tab takes a few seconds, and it is the only way we find out which parts of this landed.
