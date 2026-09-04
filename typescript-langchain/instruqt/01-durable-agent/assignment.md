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

    **Author:** [Nikolay Advolodkin](https://www.linkedin.com/in/nikolayadvolodkin/), Staff Developer Advocate
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

## First, watch it break

Before you fix anything, see what you are fixing. There is a plain agent in the
tree with no Temporal in it at all - one file, the `openai` client, and two
functions that fetch coordinates and weather.

Open `exercise/src/challenge0-the-loop/agent-loop.ts` in the
[button label="Editor" background="#444CE7"](tab-3) tab and find this near the
bottom:

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

Two `await`s. They are the only lines in the file that touch anything outside
this process. Everything else is bookkeeping: `messages` is an array, `done` is a
boolean, the counters are numbers. All of it lives in one Node process's heap for
exactly as long as that process is alive.

**The conversation is a local variable.** Hold onto that.

Run it in the [button label="Worker" background="#444CE7"](tab-0) terminal:

```bash,run
npm run c0:loop
```

It compares three cities, so it takes several turns. Each turn prints its token
usage and a running total. It pauses a few seconds between turns - that pause is
artificial, and it is there only so you have a window to interrupt.

Now run it again and press **Ctrl+C** once the running total reaches three or
four model calls:

```bash,run
npm run c0:loop
```

You get a receipt:

```text,nocopy
  model calls paid for and lost   3
  tool calls already executed     3
  tokens billed, then discarded   2016
```

Three different kinds of loss. The model calls completed and will be invoiced.
The tool calls here were reads, so repeating them is merely wasteful - swap the
weather lookup for something that charges a card and "already executed" stops
being a rounding error. And the prompt tokens climb every turn, because turn four
re-sends turns one through three, so dying late costs more than dying early.

Run it a third time and watch it start from turn one. The turns you already paid
for buy you nothing, because the new process has never heard of them.

> **Where did the conversation go?** Nowhere. It was `messages`, a local in
> `main()`. When the process exited, the heap went with it. That is not a bug in
> the script - it is what "in memory" means, and it is true of every agent loop
> that has not been given somewhere else to keep its state.

Check the [button label="Temporal UI" background="#444CE7"](tab-2) tab: empty.
Nothing you just ran left a trace outside a process that no longer exists.

The rest of this challenge changes that, and it changes it by moving the loop -
not the I/O - somewhere that survives.

## The two TODOs

Both sit on the exact line they change. `exercise/README.md` has the index.

The provider and the tool wrappers are already written for you. They are plumbing
- reading a key from the environment, describing a function to a model - and
neither is what this challenge is about.

**TODO 1** - `exercise/src/challenge1-durable-agent/workflows.ts`

The line that matters, and the one the loop you just broke has been waiting for.
Replace the SDK's own `Runner` with `TemporalOpenAIRunner`. Same agent object,
same loop, same tools - but the loop now runs inside a Workflow and every model
call is dispatched out to an Activity.

That is the whole integration: the bookkeeping moves across the boundary, the
network I/O stays on the other side of it.

**TODO 2a** and **TODO 2b** - `worker.ts`, then `client.ts`

Register the plugin, in two places. On the Worker it installs the Activity that
model calls are dispatched *to* - without it the Workflow has somewhere to send
LLM calls and nothing listening. On the Client it carries the run configuration
and trace context into the Workflow through a header set at start time, which the
Worker's copy cannot do on the Workflow's behalf.

> Stuck? The same file under `solution/` is the answer.

## Start the Worker

Click the [button label="Worker" background="#444CE7"](tab-0) terminal.

```bash,run
npm run c1:worker
```

It prints `Challenge 1 Worker polling c1-durable-agent-tq` and then sits there. That is correct - it is polling. Leave it and move on.

> **If it exits instead:** read the error. A TypeScript error means an edit did not compile, and the file path in the message tells you which one.

## Run it

Click the [button label="Client" background="#444CE7"](tab-1) terminal.

```bash,run
npm run c1:client -- "What is the weather in Barcelona?"
```

A few seconds later you get Barcelona's current conditions in plain text.

> **If the run fails inside the Workflow before any model call:** TODO 1 is still
> open. The SDK's own `Runner` reaches for the network from inside the Workflow
> sandbox, which is exactly what a Workflow is not allowed to do.

> **If the Workflow starts and then nothing happens:** TODO 2a is still open. The
> Workflow is dispatching model calls to an Activity that no Worker has
> registered, so they sit there unclaimed.

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
