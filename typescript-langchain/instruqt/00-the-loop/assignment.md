---
slug: the-loop
id: ""
type: challenge
title: The Loop, and What It Costs
teaser: An agentic loop in eighty lines of plain TypeScript. Run it, kill it halfway,
  and read off the tokens you paid for and cannot get back.
notes:
- type: text
  contents: |-
    # An agent is a loop

    Ask the model. Run whatever tool it asked for. Hand the result back.
    Ask again. Stop when it answers instead of asking.

    Every agent framework you have used is that loop with conveniences
    bolted on. This challenge strips the conveniences off so there is
    nothing between you and the four lines that matter.
- type: text
  contents: |-
    # Nothing to write, something to break

    There are no TODOs here. You will run a script, interrupt it partway
    through a conversation, and count what the interruption cost.

    The number on the screen is the point. Every model call the loop had
    already made was billed, and none of it survives the process exiting.
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
timelimit: 1800
enhanced_loading: null
---

# The Loop, and What It Costs

> [!NOTE]
> **Your tabs.**
> - [button label="Worker" background="#444CE7"](tab-0) - the terminal you run everything in for this challenge.
> - [button label="Client" background="#444CE7"](tab-1) - a second terminal. Later challenges need both; this one does not.
> - [button label="Temporal UI" background="#444CE7"](tab-2) - open it once, at the very end.
> - [button label="Editor" background="#444CE7"](tab-3) - VS Code, open on the whole workshop.
>
> The tabs keep the same names and the same order in every challenge, so the strip never shifts under you mid-track. In this one the first terminal is doing all the work.

## There is nothing to fill in here

Every other challenge in this track hands you TODOs. This one hands you a script and asks you to watch it, then to break it on purpose.

Read the output carefully. The rest of the workshop is an answer to what you are about to see.

## Where the code lives

The [button label="Editor" background="#444CE7"](tab-3) tab opens `decouple-agents`, which holds two complete trees:

- `exercise/` - **you work here** from the next challenge onward.
- `solution/` - the same tree, finished.

For this challenge the file is byte-for-byte identical in both, because there is nothing to complete. Open it:

`exercise/src/challenge0-the-loop/agent-loop.ts`

Scroll it top to bottom. It is one file. It imports the `openai` client and two async functions that fetch coordinates and weather. That is the whole agent.

## The four lines that are the agent

Find this near the bottom of the file:

```ts
while (!done) {
  const response = await callModel(messages);           // ← network I/O
  if (response.toolCalls) {
    const results = await runTools(response.toolCalls); // ← network I/O
    messages.push(...results);
  } else {
    done = true;
  }
}
```

Two `await`s. Those two lines are the only places in the file that touch anything outside this process: one sends the conversation to a model on the far side of the internet, the other calls a weather API.

Everything else is bookkeeping. `messages` is an array. `done` is a boolean. The token counters are numbers. All of it lives in one Node process's heap and nowhere else, for exactly as long as that process is alive.

Hold onto that: **the conversation is a local variable.**

## Run it

Click the [button label="Worker" background="#444CE7"](tab-0) terminal.

```bash,run
npm run c0:loop
```

The default question asks it to compare three cities, which forces it to work city by city and take several turns.

Watch the transcript. Each turn prints:

- which turn it is, and how many messages of context went into the request
- `tokens` for that single call - prompt, completion, total
- `RUNNING TOTAL` - every model call, every tool call, and every token since the script started
- each tool call as it fires, with the arguments the model chose and a slice of what came back

Between turns it pauses for four seconds and says so. That pause is not real: it exists only so a human has a window to interrupt the run. A real agent would sprint through this in a couple of seconds.

Let it finish. The last block is the bill for one complete answer.

## Now kill it

Start the same run again:

```bash,run
npm run c0:loop
```

This time, when `RUNNING TOTAL` reaches **three or four model calls**, press **Ctrl+C**.

You get a receipt:

```text
^C  killed mid-conversation.

  model calls paid for and lost   3
  tool calls already executed     3
  tokens billed, then discarded   2016
```

Read the three numbers, and read them as three different kinds of loss.

**Model calls paid for and lost.** Every one of those completed. The provider metered them and will invoice them. The reasoning they bought is gone.

**Tool calls already executed.** These were reads, so re-running them is merely wasteful. Swap the weather lookup for something that charges a card, ships an order, or files a ticket, and "already executed" stops being a rounding error.

**Tokens billed, then discarded.** Notice the prompt tokens climbing every turn in the transcript. Turn 4 re-sends everything from turns 1 through 3, so a long conversation is not four cheap calls - it is four increasingly expensive ones. Dying late costs more than dying early.

## Where did the conversation go

> The process is dead. Where is the transcript of those three turns?

<details>
<summary>Answer</summary>

Nowhere.

It was `messages`, a `const` in `main()`. When the process exited, the heap went with it. There is no file, no database row, no log you could reconstruct it from - nothing in the script ever wrote it down, because nothing in the script was asked to.

That is not a bug in this script. It is what "in memory" means, and it is true of every agent loop that has not been given somewhere else to keep its state.

</details>

## Pay for it a second time

```bash,run
npm run c0:loop
```

Turn 1. The same first question, the same first tool call, the same first tokens. The three turns you already bought buy you nothing, because the new process has never heard of them.

Do this arithmetic on your own workload before you go on. An agent that dies one turn from the end and restarts from scratch does not cost you one turn - it costs you the whole conversation, again, at full price, and the deeper the conversation the worse the ratio gets.

## What a crash actually takes

| What the process was holding | Where it is after Ctrl+C |
|---|---|
| The message transcript | gone with the heap |
| Which turn the loop was on | gone |
| Results of tool calls that already ran | gone; the side effects are not |
| Money already spent on completed model calls | spent |
| Any way to resume | there was never one |

Now click the [button label="Temporal UI" background="#444CE7"](tab-2) tab. It is empty. Nothing you have run in this challenge left a trace anywhere outside a process that no longer exists. Leave the tab open.

## The question to carry into the next challenge

None of what you just saw is a mistake in the code. The loop is correct. It does exactly what an agentic loop is supposed to do, and it loses everything the moment its process does, because a local variable is the only place it was ever told to put things.

So, before you move on:

> What would have to be true for a crash at turn four to cost you turn four - and nothing else?

Not "how do I avoid crashing." Processes get killed, machines get recycled, deploys roll. Assume the crash. What would have to change about where this loop keeps its state for the crash to stop being expensive?

Hold that question. The next challenge is the answer to it, and this same loop is still in there.

Click **Check** when you have run the loop, killed it partway, and read your receipt.
