---
slug: human-in-the-loop
id: 3ehkkyuwgkvy
type: challenge
title: Human in the loop
teaser: The agent proposes something irreversible and stops. A Signal from a human
  releases it, and the paused conversation resumes in a fresh Execution.
notes:
- type: text
  contents: |-
    # Some tool calls should not happen unsupervised

    Reading an API is one thing. Spending someone's money is another.

    An agent that can book a trip needs a person between the model's
    decision and the side effect. That person may take five minutes, or go
    to lunch and come back tomorrow.
- type: text
  contents: |-
    # Four pieces, and none of them is a poll

    A tool marked `needsApproval` does not run. The Agents SDK stops the
    run and hands back an interruption, with the whole conversation
    serialized as a `RunState`.

    The Workflow parks on a `condition`. It is Running and holding nothing:
    no thread, no Worker, no memory.

    A Signal carries the human's verdict in.

    Then `continueAsNew` starts a fresh Execution carrying the serialized
    run, so a Workflow that waited a week does not carry a week of
    history.
tabs:
- id: sfvvqm0dlq9k
  title: Worker
  type: terminal
  hostname: workshop
  workdir: /root/workshop/decouple-agents/exercise
- id: ug3723vxuopi
  title: Client
  type: terminal
  hostname: workshop
  workdir: /root/workshop/decouple-agents/exercise
- id: 0zf2onfx3fxh
  title: Temporal UI
  type: service
  hostname: workshop
  port: 8233
- id: xzvcohplyw5t
  title: Editor
  type: service
  hostname: workshop
  path: /?folder=/root/workshop/decouple-agents
  port: 8080
- id: ljjjak8dglhd
  title: Parked Workflow
  type: service
  hostname: workshop
  path: /
  port: 8090
difficulty: basic
timelimit: 2400
enhanced_loading: null
---

# Human in the loop

> [!NOTE]
> Your tabs.
> - [button label="Worker" background="#444CE7"](tab-0) runs this challenge's Worker.
> - [button label="Client" background="#444CE7"](tab-1) starts the request and is where you approve it.
> - [button label="Temporal UI" background="#444CE7"](tab-2) shows Event History.
> - [button label="Editor" background="#444CE7"](tab-3) is VS Code, open on the whole workshop.

> [!WARNING]
> You work in `exercise/`. `solution/` sits beside it with identical filenames, so check the editor's title bar before you type.

## First, watch it misbehave

Change nothing yet. The agent already has a `bookTrip` tool and nobody is supervising it.

In the [button label="Worker" background="#444CE7"](tab-0) terminal:

```bash,run
npm run c2:worker
```

Then in the [button label="Client" background="#444CE7"](tab-1) terminal:

```bash,run
npm run c2:client -- "Book me a trip to Barcelona on 2026-09-15."
```

It asks `Approve the booking? [y/N]`. Answer **n**.

Find that Workflow in the [button label="Temporal UI" background="#444CE7"](tab-2) tab. It is **Completed**, and its history holds a `bookTrip` Activity with a confirmation number in the result.

You said no and it booked anyway. The client asked you after the agent had already acted, because nothing in the Workflow was waiting for your answer.

## The three TODOs

The resume branch is written for you. Read it first. It runs in the second Execution, and it makes the handoff you are about to write easier to follow.

TODO 3 in `exercise/src/challenge2-human-in-the-loop/workflows.ts`. One property on the `bookTrip` tool definition. With it the Agents SDK refuses to run the tool, ends the run early, and hands back an interruption describing what the model wanted to do.

TODO 4 in the same file. Park, then hand off, in two lines.

- `condition()` completes the Workflow Task and the Worker walks away. Nothing polls, nothing is scheduled, and the state lives on the Temporal server.
- `continueAsNew` closes this Execution and starts a fresh one under the same Workflow ID with a short new history, so a run that waited three days resumes as cheaply as one that waited three seconds.

TODO 5 in `exercise/src/challenge2-human-in-the-loop/client.ts`. Deliver the verdict as a Signal. A Signal is one-way and does not wait for a reply, which is the right shape for "I approve this".

> Stuck? The same files under `solution/` are the answer. Fell behind? Copy the previous challenge's finished code and carry on.
>
> ```bash,run
> cp /root/workshop/decouple-agents/solution/src/challenge1-durable-agent/*.ts \
>    /root/workshop/decouple-agents/exercise/src/challenge1-durable-agent/
> ```

## Run it properly

Press **Ctrl+C** in the [button label="Worker" background="#444CE7"](tab-0) terminal so the Worker picks up your edits, then:

```bash,run
npm run c2:worker
```

In the [button label="Client" background="#444CE7"](tab-1) terminal:

```bash,run
npm run c2:client -- "Book me a trip to Barcelona on 2026-09-15."
```

Before you answer, check the [button label="Temporal UI" background="#444CE7"](tab-2) tab. The Workflow is **Running** with no pending Activity Tasks at all. It has stopped on purpose and is costing nothing.

Answer **y** in the [button label="Client" background="#444CE7"](tab-1) terminal and the agent prints its confirmation.

## Read the Event History

Find that Workflow ID in the [button label="Temporal UI" background="#444CE7"](tab-2) tab. Two Executions sit under it.

The first one:

- runs the model and the weather tools
- has no `bookTrip` Activity, because the tool never executed
- ends with `WorkflowExecutionSignaled`, your approval, then `WorkflowExecutionContinuedAsNew`

The second one:

- starts fresh, with the serialized run as its input
- runs the `bookTrip` Activity exactly once
- ends with one last model call composing the answer

The gap before the Signal is however long you took to decide. It cost nothing.

## Break it

**1.** In the [button label="Client" background="#444CE7"](tab-1) terminal, start a fresh request:

```bash,run
npm run c2:client -- "Book me a trip to Tokyo on 2026-11-02."
```

**2.** Answer **n**. The client prints the Workflow ID and the command to release it later. Copy that ID.

**3.** Press **Ctrl+C** in the [button label="Worker" background="#444CE7"](tab-0) terminal. No Worker is running for this challenge now.

**4.** The [button label="Temporal UI" background="#444CE7"](tab-2) tab still shows the Workflow as **Running**.

**5.** Before you bring anything back, answer this:

> No process is holding this conversation and no timer is counting down. What exactly is "Running"?

<details>
<summary>Answer</summary>

A row on the Temporal server, and a history of everything that happened up to the pause.

Open the [button label="Parked Workflow" background="#444CE7"](tab-4) tab and step through its four frames. The Worker lane is empty in frame two, and that emptiness is the answer. `condition(...)` is not a sleep and not a poll. When the Workflow reached it, the Worker finished its Workflow Task and forgot the Workflow existed. Nothing is scheduled, nothing waits on a socket, and no memory is consumed per parked run. That is why ten thousand pending approvals are unremarkable and a thread-per-approval design is not.

The Signal wakes it. The server schedules a Workflow Task, and any Worker on that Task Queue replays the history to rebuild state and carries on from the line after the `condition`. It need not be the Worker that started the run.

This is also why the human can take as long as they need. A system that gives up on them, or asks twice, stops getting used.

</details>

**6.** Start a Worker again in the [button label="Worker" background="#444CE7"](tab-0) terminal:

```bash,run
npm run c2:worker
```

**7.** In the [button label="Client" background="#444CE7"](tab-1) terminal, release the parked run with the ID you copied:

```bash
npm run c2:client -- --approve <workflow-id-from-step-2>
```

Answer **y**. The booking goes through and the answer prints, in a brand new Worker process that has never seen this conversation.

Click **Check** when you have approved at least one booking.
