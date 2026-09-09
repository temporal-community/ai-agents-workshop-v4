---
slug: durable-agent
id: iilyux6txnoh
type: challenge
title: The OpenAI Agents SDK, made durable
teaser: An ordinary Agents SDK agent, running inside a Temporal Workflow. Every LLM
  call and every tool call becomes an Activity.
notes:
- type: text
  contents: |-
    # An agent is a loop. Loops die with the process.

    An OpenAI Agents SDK agent runs a loop: ask the model, run the tool it
    asked for, feed the result back, repeat. The whole loop lives in memory.

    Kill the process at turn four and you lose turn four, the three turns
    you already paid the model for, and any tool call that already changed
    something in the outside world.

    Author: [Nikolay Advolodkin](https://www.linkedin.com/in/nikolayadvolodkin/), Staff Developer Advocate
- type: text
  contents: |-
    # The change is one object

    Swap the SDK's `Runner` for `TemporalOpenAIRunner`. The loop runs
    unchanged, but the runner now dispatches every model call and every
    tool call as a Temporal Activity. Temporal records each one in Event
    History, retries it on failure, and on replay hands back the recorded
    result instead of calling again.

    The agent code never imports Temporal.
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

# The OpenAI Agents SDK, made durable

> [!NOTE]
> Your tabs.
> - [button label="Worker" background="#444CE7"](tab-0) runs the Worker. It blocks while it polls.
> - [button label="Client" background="#444CE7"](tab-1) starts Workflows.
> - [button label="Temporal UI" background="#444CE7"](tab-2) shows Event History.
> - [button label="Editor" background="#444CE7"](tab-3) is VS Code, open on the whole workshop.

## Where the code lives

The [button label="Editor" background="#444CE7"](tab-3) tab opens `decouple-agents`. You work in `exercise/`, and every file path in this track starts there. `solution/` is the same tree, finished, for when you are stuck. The editor saves as you type and the Worker runs the TypeScript directly, so there is no save step and nothing to compile.

> [!WARNING]
> Both trees show in the file tree with identical filenames. Check the path in the editor's title bar before you type. Editing `solution/` leaves `exercise/` broken.

## First, watch it break

`exercise/src/challenge0-the-loop/agent-loop.ts` is a plain agent with no Temporal in it, just the `openai` client and two functions that fetch coordinates and weather. Open it in the [button label="Editor" background="#444CE7"](tab-3) tab and find this near the bottom:

```ts,nocopy
while (!done) {
  const response = await callModel(messages);           // network I/O
  if (response.toolCalls) {
    const results = await runTools(response.toolCalls); // network I/O
    messages.push(...results);
  } else {
    done = true;
  }
}
```

Those two `await`s are the only lines in the file that touch anything outside the process. Everything else is bookkeeping that lives in one Node process's heap for as long as that process runs. The conversation is a local variable.

Run it in the [button label="Worker" background="#444CE7"](tab-0) terminal. It compares three cities, prints a running token total per turn, and pauses a few seconds between turns so you have a window to interrupt. Press **Ctrl+C** once the total reaches three or four model calls.

```bash,run
npm run c0:loop
```

You get a receipt:

```text,nocopy
  model calls paid for and lost   3
  tool calls already executed     3
  tokens billed, then discarded   2016
```

Three kinds of loss. The model calls completed and will be invoiced. The tool calls here were reads, so repeating them only wastes time, but swap the weather lookup for something that charges a card and that second line starts to matter. Prompt tokens climb every turn, because turn four re-sends turns one through three, so dying late costs more than dying early.

Run it again and watch it start from turn one. The new process has never heard of the turns you already paid for, because `messages` went with the old heap.

```bash,run
npm run c0:loop
```

The [button label="Temporal UI" background="#444CE7"](tab-2) tab is empty. Nothing you ran left a trace outside a process that no longer exists.

## The two TODOs

Both sit on the line they change, and `exercise/README.md` has the index. The provider and the tool wrappers are already written for you.

TODO 1 in `exercise/src/challenge1-durable-agent/workflows.ts`. Replace the SDK's `Runner` with `TemporalOpenAIRunner`. Same agent object, same loop, same tools, except the loop now runs inside a Workflow, its state lands in Event History, and every model and tool call goes out to an Activity.

TODO 2a in `worker.ts` and TODO 2b in `client.ts`. Register the plugin in both places. On the Worker it installs the Activity that model calls are dispatched to, and without it the Workflow sends LLM calls nowhere. On the Client it carries the run configuration and trace context into the Workflow through a header set at start time, which the Worker's copy cannot do for it.

> Stuck? The same file under `solution/` is the answer.

## Start the Worker

In the [button label="Worker" background="#444CE7"](tab-0) terminal:

```bash,run
npm run c1:worker
```

It prints `Challenge 1 Worker polling c1-durable-agent-tq` and then sits there, polling. Leave it and move on.

> If it exits instead, read the error. A TypeScript error means an edit did not compile, and the file path in the message tells you which one.

## Run it

In the [button label="Client" background="#444CE7"](tab-1) terminal:

```bash,run
npm run c1:client -- "What is the weather in Barcelona?"
```

A few seconds later you get Barcelona's current conditions in plain text.

> If it fails inside the Workflow before any model call, TODO 1 is still open. The SDK's `Runner` reaches for the network from inside the Workflow sandbox, which a Workflow is not allowed to do.

> If the Workflow starts and then nothing happens, TODO 2a is still open. Model calls are going to an Activity that no Worker registered, so they sit unclaimed.

## Read the Event History

Open the Workflow you just ran in the [button label="Temporal UI" background="#444CE7"](tab-2) tab. The loop is written down there:

- one `invokeModelActivity` per model turn, each its own Activity
- one Activity per tool call, `getCoordinates` then `getWeather`
- the two alternate, because that is what an agentic loop does

You wrote none of it. `TemporalOpenAIRunner` dispatched every one.

## Break it

**1.** In the [button label="Client" background="#444CE7"](tab-1) terminal, start a question big enough to need several turns:

```bash,run
npm run c1:client -- "Compare the weather in Barcelona, Tokyo and Reykjavik right now."
```

**2.** While it is still thinking, kill the Worker in the [button label="Worker" background="#444CE7"](tab-0) terminal with **Ctrl+C**. The entire agent runtime is now gone mid-conversation.

**3.** Find the Workflow in the [button label="Temporal UI" background="#444CE7"](tab-2) tab. It is still **Running**, the Client is still waiting, and nothing has failed.

**4.** Before you bring the Worker back, answer this:

> The process holding the conversation is dead. When a new Worker picks this up, does the model get asked those first few questions a second time, and does the bill get paid twice?

<details>
<summary>Answer</summary>

No. Every completed model call and tool call is already an event in this Workflow's history, with its result attached.

When a Worker picks the Workflow up again it replays. It runs your Workflow code from the top, and each time the code reaches a call that already has a result in history, Temporal hands back the recorded value instead of making the call. Replay is fast, local and free. The first live call is the one that was in flight when you killed the Worker.

That is the claim behind "durable agent". A crash costs you the step that was running, and nothing else.

</details>

**5.** Restart the Worker in the [button label="Worker" background="#444CE7"](tab-0) terminal:

```bash,run
npm run c1:worker
```

The conversation resumes where it stopped and the [button label="Client" background="#444CE7"](tab-1) terminal prints the comparison, from the same Workflow Execution you started before the crash.

## What you built

| | Plain Agents SDK | With Temporal |
|---|---|---|
| Where the conversation lives | process memory | Event History on the server |
| Cost of a crash mid-run | the whole run | the one step in flight |
| Retries on a failing tool | you write them | the Activity's retry policy |
| Lines of agent code changed | | the `Runner` you construct |

Click **Check** when your agent has answered at least one question.
