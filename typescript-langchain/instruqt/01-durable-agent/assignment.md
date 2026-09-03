---
slug: durable-agent
id: iilyux6txnoh
type: challenge
title: The OpenAI Agents SDK, Made Durable
teaser: An ordinary Agents SDK agent, running inside a Temporal Workflow. Every LLM
  call and every tool call becomes an Activity.
notes:
- type: text
  contents: |-
    # An agent is a loop. Loops die with the process.

    An OpenAI Agents SDK agent runs a loop: ask the model, run the tool it
    asked for, feed the result back, repeat. It is a good loop. It is also
    entirely in memory.

    Kill the process at turn four and turn four is gone - along with the
    three turns you already paid the model for, and any tool call that
    already changed something in the outside world.
- type: text
  contents: |-
    # The change is one object

    Swap the SDK's `Runner` for `TemporalOpenAIRunner` and the loop keeps
    its shape, but every model call and every tool call is dispatched as a
    Temporal Activity: recorded in Event History, retried on failure, and
    replayed from history rather than re-executed.

    The agent code does not learn about Temporal. It just stops being
    something you can lose.
tabs:
- id: ebvxwynodlgy
  title: Worker
  type: terminal
  hostname: workshop
  workdir: /root/workshop/decouple-agents/exercise
- id: wlh3bitcryvp
  title: Client
  type: terminal
  hostname: workshop
  workdir: /root/workshop/decouple-agents/exercise
- id: cjxzncuqitss
  title: Temporal UI
  type: service
  hostname: workshop
  port: 8233
- id: 1krgmktmzt4e
  title: Editor
  type: service
  hostname: workshop
  path: /?folder=/root/workshop/decouple-agents
  port: 8080
difficulty: basic
timelimit: 2400
enhanced_loading: null
---

# The OpenAI Agents SDK, Made Durable

> [!NOTE]
> **Your tabs.**
> - [button label="Worker" background="#444CE7"](tab-0) - runs the Worker process. It blocks while it polls; that is it working.
> - [button label="Client" background="#444CE7"](tab-1) - where you start Workflows.
> - [button label="Temporal UI" background="#444CE7"](tab-2) - the Event History of everything you run.
> - [button label="Editor" background="#444CE7"](tab-3) - VS Code, open on the whole workshop.

## Where the code lives

The [button label="Editor" background="#444CE7"](tab-3) tab opens `decouple-agents`, which holds two complete trees:

- `exercise/` - **you work here.** Every file path in this track starts with `exercise/`.
- `solution/` - the same tree, finished. Look when you are stuck.

The editor saves as you type, so there is no save step. There is also nothing to compile: the Worker runs the TypeScript directly.

> [!WARNING]
> Both trees are visible in the file tree and their files have identical names. Check the path in the editor's title bar before you type. Editing `solution/` teaches you nothing and leaves `exercise/` broken.

## The five TODOs

Work through them in order. They are numbered across the whole tree, and each sits on the exact line it changes. `exercise/README.md` has the index.

**TODO 1** - `exercise/src/shared/modelProvider.ts`

Build the OpenAI-compatible provider from the environment. Nothing in this workshop runs until this one is done, because every challenge routes its model calls through it. The lab has already injected a per-attendee key and gateway URL into your terminals; the reason it is read here, and only here, is that a hardcoded key gets committed and the lab's key is different every time anyway.

**TODO 2** - `exercise/src/shared/weatherTools.ts`

Three of the four weather Activities are already presented to the model as tools. Wrap the last one. Look at what `activityAsTool` is doing to the three above it: the model sees a tool, but the thing that actually runs is a Temporal Activity, scheduled by the Workflow and executed by the Worker.

**TODO 3** - `exercise/src/challenge1-durable-agent/workflows.ts`

The line that matters. Replace the SDK's own `Runner` with `TemporalOpenAIRunner`. Same agent object, same loop - but now each model call leaves history behind it.

**TODO 4** - `exercise/src/challenge1-durable-agent/worker.ts`

Register the plugin on the Worker. It installs the Activity that model calls are dispatched *to*. Without it the Workflow has somewhere to send LLM calls and nothing listening.

**TODO 5** - `exercise/src/challenge1-durable-agent/client.ts`

Register the plugin on the Client too. It is not redundant: the Client is what carries the run configuration and trace context into the Workflow, through a header set at start time. The Worker's copy cannot do that on the Workflow's behalf.

> Stuck on any of them? The same file under `solution/` is the answer.

## Start the Worker

Click the [button label="Worker" background="#444CE7"](tab-0) terminal.

```bash,run
npm run c1:worker
```

It prints `Challenge 1 Worker polling c1-durable-agent-tq` and then sits there. That is correct - it is polling. Leave it and move on.

> **If it exits instead:** read the error. `TODO 1: build the OpenAIProvider from the environment` means TODO 1 is still open. A TypeScript error means an edit did not compile - the file path in the message tells you which one.

## Run it

Click the [button label="Client" background="#444CE7"](tab-1) terminal.

```bash,run
npm run c1:client -- "What is the weather in Barcelona?"
```

A few seconds later you get Barcelona's current conditions in plain text.

> **If the agent finds the city but cannot say what the weather is:** TODO 2 is still open. It can locate a place happily - those three tools are already wired - but it has no way to fetch a forecast.

## Read the Event History

Click the [button label="Temporal UI" background="#444CE7"](tab-2) tab and open the Workflow you just ran.

You are looking for the shape of the loop, written down:

- one `invokeModelActivity` per model turn - the LLM calls, each its own Activity
- one Activity per tool call the model made - `getCoordinates`, then `getWeather`
- they alternate, because that is what an agentic loop is

None of this is code you wrote. `TemporalOpenAIRunner` dispatched every one of them.

## Break it

The claim is that this agent survives losing its process. Test it.

**1.** In the [button label="Client" background="#444CE7"](tab-1) terminal, start a question big enough to need several turns:

```bash,run
npm run c1:client -- "Compare the weather in Barcelona, Tokyo and Reykjavik right now."
```

**2.** While it is still thinking, go to the [button label="Worker" background="#444CE7"](tab-0) terminal and kill the Worker with **Ctrl+C**. That is the entire agent runtime, gone mid-conversation.

**3.** Switch to the [button label="Temporal UI" background="#444CE7"](tab-2) tab and find the Workflow. Its status is still **Running**. The Client in tab-1 is still waiting. Nothing has failed.

**4.** Before you bring the Worker back, answer this:

> The process holding the conversation is dead. When a new Worker picks this up, does the model get asked those first few questions a second time - and does the bill get paid twice?

<details>
<summary>Answer</summary>

No. Every completed model call and tool call is already an event in this Workflow's history, with its result attached.

When a Worker picks the Workflow up again it *replays*: it runs your Workflow code from the top, but each time the code reaches a call that already has a result in history, Temporal hands back the recorded value instead of making the call. Replay is fast, local and free. The first live call is the one that was in flight when you killed the Worker.

Which is the actual claim behind "durable agent". Not that nothing crashes - that a crash costs you exactly the step that was running.

</details>

**5.** Restart the Worker in the [button label="Worker" background="#444CE7"](tab-0) terminal:

```bash,run
npm run c1:worker
```

Within a few seconds the conversation resumes where it stopped and the [button label="Client" background="#444CE7"](tab-1) terminal prints the comparison - from the same Workflow Execution you started before the crash.

## What you built

| | Plain Agents SDK | With Temporal |
|---|---|---|
| Where the conversation lives | process memory | Event History on the server |
| Cost of a crash mid-run | the whole run | the one step in flight |
| Retries on a failing tool | you write them | the Activity's retry policy |
| Lines of agent code changed | - | the `Runner` you construct |

Click **Check** when your agent has answered at least one question.
