---
slug: multi-agent
id: jrablxnbyyfu
type: challenge
title: Multi-agent
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
    one after another. You want all three at once, and your code decides
    that rather than the model. It is an ordinary `Promise.all` over three
    Child Workflows.

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
# Multi-agent

> [!NOTE]
> Same tabs, except [button label="Workers" background="#444CE7"](tab-0) now runs one process with two Workers on two Task Queues. Then [button label="Client" background="#444CE7"](tab-1), [button label="Temporal UI" background="#444CE7"](tab-2) where this challenge pays off, and [button label="Editor" background="#444CE7"](tab-3). You work in `exercise/`, so check the editor's title bar before you type.

## The shape you are building

Several Workflow Executions per question, on two Task Queues.

| Agent | Task Queue | Reached by | Event in the caller's history |
|---|---|---|---|
| Triage orchestrator | `c3-orchestrator-tq` | the client | |
| Weather specialist | `c3-specialists-tq` | Child Workflow | `StartChildWorkflowExecution` |
| Travel specialist | `c3-specialists-tq` | Child Workflow | `StartChildWorkflowExecution` |

Every specialist is a Workflow Execution of its own, with its own history and retries. The orchestrator's agent code sees only tools.

## The three TODOs

The `childWorkflowAsTool` helper in `shared/` is written for you. It uses `wf.uuid4()` rather than `Math.random()`, because Workflow code must produce the same values on replay as it did the first time.

**TODO 6** in `exercise/src/challenge3-multi-agent/workflows.ts`. The travel specialist, reached the same way as the weather one. Both then sit on one queue as Child Workflows: one deployment, one team, independent of the orchestrator.

**TODO 7** in the same file. Fan out: one tool, several cities, all their Child Workflows running at once. This is the one place in the workshop where the Workflow decides the concurrency instead of the model. The model calls the tool once; what happens inside is ordinary deterministic code.

**TODO 8** in `worker.ts`. A second Worker on the specialists' Task Queue, carrying their Activities. It shares this process for convenience only, and is a separate deployment in every way that matters.

> Stuck? `solution/` has the answers. Behind? Catch up with:
>
> ```bash,run
> cp /root/workshop/decouple-agents/solution/src/challenge2-human-in-the-loop/*.ts \
>    /root/workshop/decouple-agents/exercise/src/challenge2-human-in-the-loop/
> ```

## Run it

Start the Workers. It prints `Challenge 3 Workers polling c3-orchestrator-tq and c3-specialists-tq` and keeps running.

```bash,run
npm run c3:worker
```

Then in the [button label="Client" background="#444CE7"](tab-1) terminal:

```bash,run
npm run c3:client -- "What's the weather in Monaco, and what should I know about visiting?"
```

You get one answer, conditions in Monaco plus what the place is like.

> Hangs with no output for a minute? TODO 8 is the usual cause. With only the orchestrator Worker running, nobody polls the specialists' Task Queue, so every Child Workflow is scheduled and never picked up. A Workflow stuck in `Running` with a pending task and no Worker looks the same in production.

## Read the Event History

Open the [button label="Temporal UI" background="#444CE7"](tab-2) tab. That one question produced three Executions. The orchestrator's history holds:

- the model call that decided the routing
- per specialist, `StartChildWorkflowExecution`, `ChildWorkflowExecutionStarted`, `ChildWorkflowExecutionCompleted`
- the model call that composed the answer

Then open the two specialist Executions. A failure inside the weather specialist is a fact about the weather specialist, not about the request.

## Watch the fan-out

```bash,run
npm run c3:client -- "Compare the weather in Barcelona, Tokyo and Reykjavik."
```

> Predict before you look. Three cities. How many Workflow Executions, and does the answer take three times as long as one city?

<details>
<summary>Answer</summary>

Four Executions, the orchestrator plus one weather specialist per city, and it takes about as long as a single city.

Sort by start time in the [button label="Temporal UI" background="#444CE7"](tab-2) tab. The three specialists start within moments of each other rather than in sequence, because `Promise.all` started them all before awaiting any of them. The orchestrator's history shows the same thing, three `StartChildWorkflowExecution` events in a row and only then the completions.

Swap the `Promise.all` for an `await` in a `for` loop and those same events arrive in the same order while the wall-clock triples.

</details>

## Break it

**1.** Ask something that needs both specialists:

```bash,run
npm run c3:client -- "What's the weather in Reykjavik, and what should I know about visiting Iceland?"
```

**2.** While it runs, press **Ctrl+C** in the [button label="Workers" background="#444CE7"](tab-0) terminal. Both Workers die at once.

**3.** All three Executions are still **Running**, each frozen at whatever step it had reached. They stopped at different points, because they are independent. Before you restart anything:

> The orchestrator is waiting on a Child Workflow that is itself waiting on an Activity. Three histories, three positions. When Workers come back, who tells the orchestrator where to resume?

<details>
<summary>Answer</summary>

Nobody has to. Each Execution carries its own answer.

All three resume the same way and independently. A Worker picks up the Workflow Task, replays that Execution's own history to rebuild its state, and continues from the first step with no recorded result. The orchestrator only needs to know that the child has not completed yet, and when it does, that completion arrives as an event in its history like any other.

Written as three function calls in one process, a failure anywhere unwinds the whole request and takes the model calls you already paid for with it. Here a failure stops the one specialist that owns the thing that failed.

</details>

**4.** Restart both Workers:

```bash,run
npm run c3:worker
```

All three resume, the orchestrator gets both answers, and the [button label="Client" background="#444CE7"](tab-1) terminal prints the combined reply.

## Try one more prompt

```bash,run
npm run c3:client -- "What should I know about visiting Suzuka Circuit?"
```

That one needs only the travel specialist, so the orchestrator's history holds one `StartChildWorkflowExecution` rather than two.

Click **Check** when you have run at least one question through both specialists.

---

Please share your feedback so we can make better content for you. The **Feedback** tab takes a few seconds, and it is how we find out which parts of this landed.
