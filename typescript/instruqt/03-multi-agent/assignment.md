---
slug: multi-agent
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
    # Two boundaries, deliberately different

    The weather specialist is reached as a Child Workflow. The caller
    names the Workflow function and the Task Queue it runs on - a tight
    coupling, and fine inside one team.

    The travel specialist is reached over a Nexus Operation. The caller
    names an endpoint and an operation, and nothing else. It does not know
    the Workflow type, the Namespace, the Task Queue - or, as the next
    challenge shows, the language.
tabs:
- title: Workers
  type: terminal
  hostname: workshop
  workdir: /root/workshop/decouple-agents/exercise
- title: Client
  type: terminal
  hostname: workshop
  workdir: /root/workshop/decouple-agents/exercise
- title: Temporal UI
  type: service
  hostname: workshop
  port: 8233
- title: Editor
  type: service
  hostname: workshop
  path: /?folder=/root/workshop/decouple-agents
  port: 8080
difficulty: basic
timelimit: 2400
---

# Multi-Agent

> [!NOTE]
> **Your tabs.**
> - [button label="Workers" background="#444CE7"](tab-0) - one process, two Workers, two Task Queues.
> - [button label="Client" background="#444CE7"](tab-1) - registers the Nexus endpoint, then asks a question.
> - [button label="Temporal UI" background="#444CE7"](tab-2) - Event History. This is where the challenge pays off.
> - [button label="Editor" background="#444CE7"](tab-3) - VS Code, open on the whole workshop.

> [!WARNING]
> You work in `exercise/`. `solution/` sits beside it with identical filenames - check the editor's title bar before you type.

This challenge needs **TODO 1** (`exercise/src/shared/modelProvider.ts`) and **TODO 2** (`exercise/src/shared/weatherTools.ts`) from challenge 1.

## The shape you are building

Three Workflow Executions per question, on two Task Queues:

| Agent | Task Queue | Reached by | Event in the caller's history |
|---|---|---|---|
| Triage orchestrator | `c3-orchestrator-tq` | the client | - |
| Weather specialist | `c3-specialists-tq` | Child Workflow | `StartChildWorkflowExecution` |
| Travel specialist | `c3-specialists-tq` | Nexus Operation | `NexusOperationScheduled` |

The orchestrator's agent code cannot tell the two apart. Both are just tools it can call.

## The four TODOs

**TODO 9** - `exercise/src/shared/childWorkflowAsTool.ts`

Make the tool start a Child Workflow. The Agents SDK ships wrappers for turning an Activity into a tool; a Child Workflow needs one of your own, and this is it. Every call the model makes here becomes a full Workflow Execution with its own history, its own retries and its own Task Queue.

Read the TODO's warning about the Workflow ID. Workflow code must produce the same values on replay as it did the first time, so `Math.random()` is a correctness bug, not a style preference.

**TODO 10** - `exercise/src/challenge3-multi-agent/handler.ts`

The callee side of the Nexus contract. A Workflow-run Operation starts a Workflow and completes when that Workflow does - however long it takes - and the caller sees a single scheduled/completed pair for the whole thing.

**TODO 11** - `exercise/src/challenge3-multi-agent/workflows.ts`

The caller side. Build the travel tool as a Nexus Operation instead of the local stub. Compare it line by line with the Child Workflow tool right above it: that one names a Workflow function and a Task Queue, this one names an endpoint and an operation. That difference is the whole point, and the next challenge cashes it in.

**TODO 12** - `exercise/src/challenge3-multi-agent/worker.ts`

A second Worker, on the specialists' Task Queue, carrying the specialists' Activities and the Nexus handler. It lives in the same process here only for convenience - it is a separate deployment in every way that matters.

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

The client first prints `Created Nexus endpoint c3-travel-planner -> c3-specialists-tq`. An endpoint is server-side routing: a name callers use, resolved to a Namespace and a Task Queue. Creating it is normally an operator action - the client does it here so you do not have to leave the terminal.

Then you get one answer combining conditions in Monaco and what the place is like.

> **If it hangs with no output for a minute:** TODO 12 is the usual cause. With only the orchestrator Worker running, the specialists' Task Queue has nobody polling it, so the Child Workflow and the Nexus Operation are scheduled and simply never picked up. Look in the [button label="Temporal UI" background="#444CE7"](tab-2) tab - a Workflow stuck in `Running` with a pending task and no Worker is the signature.

> **Predict before you look:** you are about to see three Workflow Executions. One specialist will appear in the orchestrator's history as a Child Workflow and one as a Nexus Operation. Which is which - and could you tell from the orchestrator's agent code?

## Read the Event History

Click the [button label="Temporal UI" background="#444CE7"](tab-2) tab. There are **three** Executions from that one question.

Open the orchestrator's history:

- `StartChildWorkflowExecution` -> `ChildWorkflowExecutionStarted` -> `ChildWorkflowExecutionCompleted` for the weather specialist
- `NexusOperationScheduled` -> `NexusOperationStarted` -> `NexusOperationCompleted` for the travel specialist
- the model calls that decided to route, and the one that composed the final answer

Then open the two specialist Executions. Each has its own complete history: its own model calls, its own tool Activities, its own retry behaviour. A failure inside the weather specialist is a fact about the weather specialist, not about the request.

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

That one needs only the travel specialist. Check the orchestrator's history: no `StartChildWorkflowExecution` at all. The triage agent routed to one specialist because that is all the question needed.

Click **Check** when you have run at least one question through both specialists.
