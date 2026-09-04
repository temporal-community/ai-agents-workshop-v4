---
slug: heterogeneous-agents
id: hbvlhahqx95v
type: challenge
title: Heterogeneous Agents
teaser: The travel specialist is now Python, built on LangChain Deep Agents, started
  as an ordinary Child Workflow. The orchestrator never finds out.
notes:
- type: text
  contents: |-
    # Real systems are not written in one language

    The team that owns travel planning already has an agent. It is
    Python, it is built on LangChain Deep Agents, and it has never heard
    of your orchestrator.

    You are not going to rewrite it, and they are not going to rewrite it
    for you.
- type: text
  contents: |-
    # The contract is strings and JSON

    A Child Workflow call is a workflow type, a task queue, an argument
    shape and a result shape. None of those is a language.

    The TypeScript orchestrator and the Python worker share zero code.
    They agree on four names - and nothing checks that agreement at
    compile time, because no compiler can see both sides.
tabs:
- id: lyg7xtyj7s9n
  title: TypeScript Workers
  type: terminal
  hostname: workshop
  workdir: /root/workshop/decouple-agents/exercise
- id: 2oek5mifudyr
  title: Python Worker
  type: terminal
  hostname: workshop
  workdir: /root/workshop/decouple-agents/exercise/python-travel-planner
- id: 4rh8fnmted3r
  title: Client
  type: terminal
  hostname: workshop
  workdir: /root/workshop/decouple-agents/exercise
- id: 9oyhpe62yhvx
  title: Temporal UI
  type: service
  hostname: workshop
  port: 8233
- id: aebbhajceiw0
  title: Editor
  type: service
  hostname: workshop
  path: /?folder=/root/workshop/decouple-agents
  port: 8080
- title: Architecture
  type: service
  hostname: workshop
  path: /heterogeneous-agents.html
  port: 8090
difficulty: basic
timelimit: 2400
enhanced_loading: null
---

# Heterogeneous Agents

> [!NOTE]
> **Your tabs.** Three processes this time, because two of them are different runtimes.
> - [button label="TypeScript Workers" background="#444CE7"](tab-0) - orchestrator and the weather specialist.
> - [button label="Python Worker" background="#444CE7"](tab-1) - the travel specialist, in the other language.
> - [button label="Client" background="#444CE7"](tab-2) - asks a question.
> - [button label="Temporal UI" background="#444CE7"](tab-3) - Event History, in both languages.
> - [button label="Editor" background="#444CE7"](tab-4) - VS Code, open on the whole workshop.

> [!WARNING]
> You work in `exercise/`. `solution/` sits beside it with identical filenames - check the editor's title bar before you type.

This challenge builds on challenge 3's specialists.

## See the shape before you change it

Open the [button label="Architecture" background="#444CE7"](tab-5) tab. Three
Worker processes, three Task Queues, two languages, one Namespace.

Click **Play data flow** and follow one question end to end: the triage agent
picks a specialist, the call crosses into Python by Workflow type name, the Deep
Agent runs its own loop over there, and the answer comes back. Then click the two
delegation edges and compare them - one names a Workflow function, the other names
a string. That difference is this challenge.

## What changed since the last challenge

| | Challenge 3 | Challenge 4 |
|---|---|---|
| Travel specialist language | TypeScript | **Python** |
| Travel specialist framework | OpenAI Agents SDK | **LangChain Deep Agents** |
| How the orchestrator reaches it | Child Workflow | Child Workflow |
| Orchestrator agent code | - | unchanged |

The third row is why the fourth row is possible.

## Read the other side first

Open the [button label="Editor" background="#444CE7"](tab-4) tab and read `exercise/python-travel-planner/`. It is finished - read it, run it, do not edit it.

- `travel_planner.py` - two tools and a prompt, plain LangChain. Zero Temporal imports. This is the file that already existed.
- `travel_planner_service.py` - the Workflow the orchestrator starts, and the request/response shapes.
- `worker.py` - a Temporal Python Worker on `c4-python-travel-planner-tq`, carrying `DeepAgentsPlugin`.

Two things in there are worth your attention before you write any TypeScript.

**The agent loop runs inside the Workflow.** `create_temporal_deep_agent` builds the agent in Workflow code; the loop replays deterministically, and every model call and every I/O tool call leaves as an Activity. That is the same guarantee the TypeScript specialists get, reached through a different integration.

**The model is named, never built.** The Workflow ships the string `openai:gpt-4o`. `worker.py` turns that into a real client, Worker-side, in `build_model`. That is why no API key ever reaches Workflow input or Event History - and it is also the seam that points the agent at the lab's gateway instead of the public API.

> `temporalio.contrib.deepagents` is **Pre-release**. The shape it teaches is stable; the exact API may still move before it is GA.

## The one TODO

**TODO 9** - `exercise/src/challenge4-heterogeneous-agents/workflows.ts`

Reach the Python specialist.

Read `exercise/src/challenge4-heterogeneous-agents/api.ts` first. It is finished, and it is the entire agreement between the two languages: a Workflow type, a Task Queue, and two field shapes. Four names, and nothing checks them at compile time, because no compiler can see both sides. Get one wrong and it fails at run time in the payload converter, not at build time.

Then look at what you write. There is nothing in it that says "Python". Naming a Workflow type as a **string** rather than importing a function is the only concession to the boundary - and that is exactly why the orchestrator's agent code is byte-identical to the previous challenge's.

> Stuck? The same file under `solution/` is the answer.

> **Fell behind?** Copy the previous challenge's finished code into your tree and
> carry on - nothing here depends on you having typed it yourself:
>
> ```bash,run
> cp /root/workshop/decouple-agents/solution/src/challenge3-multi-agent/*.ts \
>    /root/workshop/decouple-agents/exercise/src/challenge3-multi-agent/
> ```


## Start all three processes

Click the [button label="TypeScript Workers" background="#444CE7"](tab-0) terminal.

```bash,run
npm run c4:worker
```

Click the [button label="Python Worker" background="#444CE7"](tab-1) terminal. Its dependencies are already installed in the image, so this starts in seconds.

```bash,run
uv run python worker.py
```

It prints `Python travel-planner Worker polling c4-python-travel-planner-tq` and keeps running.

> **If it exits with `OPENAI_API_KEY is not set`:** the credentials the lab minted did not reach this shell. Open a fresh terminal tab and try again.

## Run it

Click the [button label="Client" background="#444CE7"](tab-2) terminal.

```bash,run
npm run c4:client -- "What should I know about visiting Monaco, and what is the weather there?"
```

You get one answer: the weather from a TypeScript specialist, the destination background from a Python one.

> **If the travel half hangs and never completes:** the Python Worker is not polling, or it is polling a different queue. A Child Workflow scheduled on a queue nobody serves sits in `Running` forever with no error anywhere - check tab-1 is still up, and check the Task Queue name in `api.ts` against `TASK_QUEUE` in `travel_planner_service.py`.

> **If it fails immediately with a payload or attribute error:** the four names in `api.ts` and the Python dataclasses have drifted apart. That is the compile-time check you do not get.

> **Predict before you look:** compare the orchestrator's history with the one from the previous challenge. How much of it do you expect to have changed, now that the specialist behind that call is a different language running a different agent framework?

## Read the Event History

Click the [button label="Temporal UI" background="#444CE7"](tab-3) tab.

**The orchestrator** shows exactly what it showed before: `StartChildWorkflowExecution` for weather, `StartChildWorkflowExecution` for travel. Nothing marks one of these as crossing a runtime boundary, because from the orchestrator's side nothing does.

**`TravelPlannerAgentWorkflow`** is the Execution behind the second one, and it is a Python Workflow. Open it. You will see the agent loop written out as events: one Activity per model call, one per tool call, alternating - the same shape as the TypeScript specialists, produced by a different integration in a different language.

Put the two specialists side by side:

| | Weather specialist (TypeScript) | Travel specialist (Python) |
|---|---|---|
| Framework | OpenAI Agents SDK | LangChain Deep Agents |
| Integration | `@temporalio/openai-agents` | `temporalio.contrib.deepagents` |
| Model calls in history | one Activity each | one Activity each |
| Tool calls in history | one Activity each | one Activity each |
| Cost of a Worker crash mid-loop | the one step in flight | the one step in flight |

Two languages, two agent frameworks, one durability guarantee. Neither team changed their agent code to get it.

## Break it: kill the language you do not control

**1.** In the [button label="Client" background="#444CE7"](tab-2) terminal, ask something that needs both specialists:

```bash,run
npm run c4:client -- "What is the weather in Reykjavik, and what should I know about visiting Iceland?"
```

**2.** As soon as it starts, go to the [button label="Python Worker" background="#444CE7"](tab-1) terminal and press **Ctrl+C**. The TypeScript Workers in tab-0 are untouched.

**3.** Look at the [button label="Temporal UI" background="#444CE7"](tab-3) tab:

- the orchestrator is **Running**, its `ChildWorkflowExecutionStarted` recorded with no completion after it
- `TravelPlannerAgentWorkflow` is **Running**, frozen at whichever Activity was in flight
- the weather side is unaffected and may already be **Completed**

**4.** Before you restart it:

> The Python process is gone mid-conversation. What gets redone when it comes back, and what does not?

<details>
<summary>Answer</summary>

One step. The model calls and tool calls that already completed are events in that Workflow's history with their results attached, so replay hands each recorded answer straight back. Only the call that was actually in flight is made again.

This is the answer you would have got in challenge 1, about a TypeScript agent, and it is worth noticing that it did not change. The integration is different - `temporalio.contrib.deepagents` rather than `@temporalio/openai-agents` - and the language is different, but both put the agent's control loop inside a Workflow and every nondeterministic call outside it in an Activity. The guarantee follows from that shape, not from the framework.

Everything else redoes nothing. The orchestrator's history already holds the weather specialist's completed result, and the orchestrator itself never notices the outage: it is parked on a Child Workflow that has not completed, which looks the same to it as one that is merely slow.

And the direction that surprises people: it works the other way too. Had you killed the TypeScript Workers instead, after the Python side completed, `ChildWorkflowExecutionCompleted` would already be in the orchestrator's history - so replay hands the answer back locally and nothing crosses the process or language boundary a second time.

That is worth being precise about, because it is not a property of Child Workflows. The completion is an event, in the same sense that an Activity result is an event and a Signal is an event. Every mechanism in this workshop - the durable agent, the human approval, the parallel fan-out, the cross-language call - is that one idea wearing different clothes.

</details>

**5.** Restart the Python Worker in the [button label="Python Worker" background="#444CE7"](tab-1) terminal:

```bash,run
uv run python worker.py
```

The in-flight step is retried, the agent finishes, the Child Workflow completes, and the [button label="Client" background="#444CE7"](tab-2) terminal prints one reply assembled from two languages.

## Try more prompts

Click the [button label="Client" background="#444CE7"](tab-2) terminal.

```bash,run
npm run c4:client -- "What should I know about visiting Suzuka Circuit?"
```

```bash,run
npm run c4:client -- "What is the weather in Tokyo right now?"
```

The second one never touches the Python Worker. Its terminal stays quiet, because the triage agent had no reason to route there.

Click **Check** when you have run at least one question that reached the Python travel planner.

---

**Please share your feedback so we can make better content for you.** The **Feedback**
tab takes a few seconds, and it is the only way we find out which parts of this landed.
