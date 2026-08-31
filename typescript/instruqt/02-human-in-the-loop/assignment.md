---
slug: human-in-the-loop
type: challenge
title: Human in the Loop
teaser: The agent proposes something irreversible and stops. A Signal from a human
  releases it, and the paused conversation resumes in a fresh Execution.
notes:
- type: text
  contents: |-
    # Some tool calls should not happen unsupervised

    Reading an API is one thing. Spending someone's money is another.

    An agent that can book a trip needs a person between the model's
    decision and the side effect - and that person may take five minutes,
    or go to lunch and come back tomorrow.
- type: text
  contents: |-
    # Four pieces, and none of them is a poll

    A tool marked `needsApproval` does not run. The Agents SDK stops the
    run and hands back an interruption, with the whole conversation
    serialized as a `RunState`.

    The Workflow parks on a `condition`. It is Running, and it is holding
    nothing: no thread, no Worker, no memory.

    A Signal carries the human's verdict in.

    Then `continueAsNew` starts a fresh Execution carrying the serialized
    run, so a Workflow that waited a week does not carry a week of history.
tabs:
- title: Worker
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

# Human in the Loop

> [!NOTE]
> **Your tabs.**
> - [button label="Worker" background="#444CE7"](tab-0) - the Worker for this challenge's Task Queue.
> - [button label="Client" background="#444CE7"](tab-1) - starts the request, and is where you approve it.
> - [button label="Temporal UI" background="#444CE7"](tab-2) - Event History.
> - [button label="Editor" background="#444CE7"](tab-3) - VS Code, open on the whole workshop.

> [!WARNING]
> You work in `exercise/`. `solution/` is the finished copy and is right next to it in the file tree with all the same filenames - check the editor's title bar before you type.

This challenge needs **TODO 1** (`exercise/src/shared/modelProvider.ts`) and **TODO 2** (`exercise/src/shared/weatherTools.ts`) from the previous challenge. Those two files are shared by all four. If you skipped the previous challenge, do them now.

## First, watch it misbehave

Change nothing yet. The agent already has a `bookTrip` tool and nobody is supervising it.

Click the [button label="Worker" background="#444CE7"](tab-0) terminal.

```bash,run
npm run c2:worker
```

Then the [button label="Client" background="#444CE7"](tab-1) terminal.

```bash,run
npm run c2:client -- "Book me a trip to Barcelona on 2026-09-15."
```

It asks `Approve the booking? [y/N]`. Answer **n**.

Now open the [button label="Temporal UI" background="#444CE7"](tab-2) tab and find that Workflow. It is **Completed**. Its history contains a `bookTrip` Activity, with a confirmation number in the result.

You said no. It booked the trip anyway. The prompt was theatre - the client asked you *after* the agent had already acted, because nothing in the Workflow was waiting for your answer.

## The five TODOs

**TODO 6** - `exercise/src/challenge2-human-in-the-loop/workflows.ts`

One property on the `bookTrip` tool definition. It is the difference between the two behaviours you are comparing: with it, the Agents SDK refuses to execute the tool, ends the run early, and hands back an interruption describing what the model wanted to do.

**TODO 7a** - `exercise/src/challenge2-human-in-the-loop/workflows.ts`

The resume branch, which runs in the *second* Execution: rehydrate the serialized run, mark the interruptions approved, and let the loop carry on. Note what does not happen here - the earlier turns are not replayed to the model. The conversation resumes mid-tool-call.

**TODO 7b** - `exercise/src/challenge2-human-in-the-loop/workflows.ts`

Park the Workflow until the approval arrives. This is the line worth staring at: the Workflow Task completes and the Worker walks away. Nothing polls, nothing is scheduled, and the state lives on the Temporal server. You could delete every Worker in the fleet and the parked run would be waiting when new ones came up.

**TODO 7c** - `exercise/src/challenge2-human-in-the-loop/workflows.ts`

Hand the paused run to a fresh Execution. `continueAsNew` closes the current Execution and starts a new one under the same Workflow ID with a short new history - the reason a Workflow that waited three days is no more expensive to resume than one that waited three seconds.

**TODO 8** - `exercise/src/challenge2-human-in-the-loop/client.ts`

Deliver the verdict as a Signal. The choice of primitive is the lesson: a Signal is one-way and does not wait for a reply, which is exactly the shape of "I approve this" - a fact, not a question.

> Stuck? The same files under `solution/` are the answer.

## Run it properly

Restart the Worker so it picks up your edits. In the [button label="Worker" background="#444CE7"](tab-0) terminal press **Ctrl+C**, then:

```bash,run
npm run c2:worker
```

In the [button label="Client" background="#444CE7"](tab-1) terminal:

```bash,run
npm run c2:client -- "Book me a trip to Barcelona on 2026-09-15."
```

This time, before you answer, switch to the [button label="Temporal UI" background="#444CE7"](tab-2) tab. The Workflow is **Running** and there are no pending Activity Tasks at all. It has stopped, on purpose, and is costing nothing.

Go back to the [button label="Client" background="#444CE7"](tab-1) terminal and answer **y**. The agent finishes and prints its confirmation.

## Read the Event History

Back in the [button label="Temporal UI" background="#444CE7"](tab-2) tab, find the Workflow ID you just ran. There are **two Executions under it**.

The first one:

- runs the model and the weather tools
- has **no** `bookTrip` Activity - the tool never executed
- ends with `WorkflowExecutionSignaled` (your approval) followed immediately by `WorkflowExecutionContinuedAsNew`

The second one:

- starts fresh, with the serialized run as its input
- contains the `bookTrip` Activity, running exactly once
- ends with one last model call composing the answer

The gap between the Signal and everything before it is however long you took to decide. It cost nothing.

## Break it: nobody is holding this

**1.** In the [button label="Client" background="#444CE7"](tab-1) terminal, start a fresh request:

```bash,run
npm run c2:client -- "Book me a trip to Tokyo on 2026-11-02."
```

**2.** Answer **n**. The client prints the Workflow ID and the command to release it later. Copy that ID.

**3.** Go to the [button label="Worker" background="#444CE7"](tab-0) terminal and press **Ctrl+C**. There is now no Worker running for this challenge at all.

**4.** Check the [button label="Temporal UI" background="#444CE7"](tab-2) tab. The Workflow is still **Running**.

**5.** Before you bring anything back, answer this:

> There is no process anywhere holding this conversation, and no timer counting down. What exactly is "Running"?

<details>
<summary>Answer</summary>

A row on the Temporal server, and a history of everything that happened up to the pause.

`condition(...)` is not a sleep and not a poll. When the Workflow reached it, the Worker finished its Workflow Task and forgot the Workflow existed. Nothing is scheduled, nothing is waiting on a socket, nothing consumes memory per parked run. That is why a queue of ten thousand pending approvals is unremarkable and a thread-per-pending-approval design is not.

The Signal is what wakes it. When one arrives the server schedules a Workflow Task, some Worker - any Worker on that Task Queue, not the one that started it - replays the history to rebuild state and carries on from the line after the `condition`.

This is also why the human can take as long as they need. Their attention is the one input an agent cannot retry its way around, and a system that gives up on them, or asks twice, stops getting used.

</details>

**6.** Start a Worker again in the [button label="Worker" background="#444CE7"](tab-0) terminal:

```bash,run
npm run c2:worker
```

**7.** In the [button label="Client" background="#444CE7"](tab-1) terminal, release the parked run with the ID you copied:

```bash
npm run c2:client -- --approve <workflow-id-from-step-2>
```

Answer **y**. The booking goes through and the answer prints - in a brand new Worker process that has never seen this conversation before.

Click **Check** when you have approved at least one booking.
