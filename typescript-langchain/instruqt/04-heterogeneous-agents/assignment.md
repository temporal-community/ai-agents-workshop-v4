---
slug: heterogeneous-agents
id: hbvlhahqx95v
type: challenge
title: Heterogeneous agents
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
    They agree on four names, and nothing checks that agreement at compile
    time, because no compiler can see both sides.
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
- id: nfrunsrxg8ct
  title: Architecture
  type: service
  hostname: workshop
  path: /heterogeneous-agents.html
  port: 8090
difficulty: basic
timelimit: 2400
enhanced_loading: null
---
# Heterogeneous agents

> [!NOTE]
> Three processes this time, because two of them are different runtimes.
> - [button label="TypeScript Workers" background="#444CE7"](tab-0) runs the orchestrator and the weather specialist.
> - [button label="Python Worker" background="#444CE7"](tab-1) runs the travel specialist.
> - [button label="Client" background="#444CE7"](tab-2) asks a question.
> - [button label="Temporal UI" background="#444CE7"](tab-3) shows Event History for both.
> - [button label="Editor" background="#444CE7"](tab-4) is VS Code. You work in `exercise/`, so check the title bar before you type.
> - [button label="Architecture" background="#444CE7"](tab-5) diagrams the three processes.

This challenge builds on challenge 3's specialists.

| | Challenge 3 | Challenge 4 |
|---|---|---|
| Travel specialist language | TypeScript | Python |
| Travel specialist framework | OpenAI Agents SDK | LangChain Deep Agents |
| How the orchestrator reaches it | Child Workflow | Child Workflow |
| Orchestrator agent code | | unchanged |

The third row is why the fourth row is possible.

Open the [button label="Architecture" background="#444CE7"](tab-5) tab: three Worker processes, three Task Queues, two languages, one Namespace. Click **Play data flow**, then click the two delegation edges. One names a Workflow function, the other names a string, and that difference is this challenge.

## Read the other side first

`exercise/python-travel-planner/` is finished. Read it and run it, but do not edit it.

- `travel_planner.py` has two tools and a prompt, plain LangChain, zero Temporal imports. This is the file that already existed.
- `travel_planner_service.py` has the Workflow the orchestrator starts, plus the request and response shapes.
- `worker.py` runs a Temporal Python Worker on `c4-python-travel-planner-tq`, carrying `DeepAgentsPlugin`.

<details>
<summary>Two details in there worth knowing, though TODO 8 does not depend on them</summary>

The agent loop runs inside the Workflow. `create_temporal_deep_agent` builds the agent in Workflow code, the loop replays deterministically, and every model call and I/O tool call leaves as an Activity.

The model is named, never built. The Workflow ships the string `openai:gpt-4o` and `build_model` in `worker.py` turns it into a real client Worker-side, which is why no API key reaches Workflow input or Event History.

</details>

> `temporalio.contrib.deepagents` is **Pre-release**. The shape it teaches is stable. The exact API may still move before it is GA.

## The one TODO

**TODO 8** in `exercise/src/challenge4-heterogeneous-agents/workflows.ts`. Reach the Python specialist.

Read `api.ts` first. It is finished, and it is the entire agreement between the two languages: a Workflow type, a Task Queue, and two field shapes. No compiler sees both sides, so getting one of those four names wrong fails at run time in the payload converter.

Then look at what you write. Nothing in it says "Python". Naming a Workflow type as a string rather than importing a function is the only concession to the language boundary, and it is why the orchestrator's agent code is byte-identical to challenge 3's.

> Stuck? `solution/` has the answer. Behind? Catch up with:
>
> ```bash,run
> cp /root/workshop/decouple-agents/solution/src/challenge3-multi-agent/*.ts \
>    /root/workshop/decouple-agents/exercise/src/challenge3-multi-agent/
> ```

## Start all three processes

In the [button label="TypeScript Workers" background="#444CE7"](tab-0) terminal:

```bash,run
npm run c4:worker
```

Then the [button label="Python Worker" background="#444CE7"](tab-1) terminal. Its dependencies are already in the image, so this starts in seconds and prints `Python travel-planner Worker polling c4-python-travel-planner-tq`.

```bash,run
uv run python worker.py
```

Then ask in the [button label="Client" background="#444CE7"](tab-2) terminal. You get one answer, with the weather from a TypeScript specialist and the destination background from a Python one.

```bash,run
npm run c4:client -- "What should I know about visiting Monaco, and what is the weather there?"
```

<details>
<summary>If it fails</summary>

- **The Python Worker exits with `OPENAI_API_KEY is not set`.** The credentials the lab minted did not reach this shell. Open a fresh terminal tab and try again.
- **The travel half hangs and never completes.** The Python Worker is not polling, or it is polling a different queue. A Child Workflow scheduled on a queue nobody serves sits in `Running` forever with no error anywhere. Check that tab-1 is still up, then check the Task Queue name in `api.ts` against `TASK_QUEUE` in `travel_planner_service.py`.
- **It fails immediately with a payload or attribute error.** The four names in `api.ts` and the Python dataclasses have drifted apart. That is the compile-time check you do not get.

</details>

## Read the Event History

Open the [button label="Temporal UI" background="#444CE7"](tab-3) tab.

The orchestrator shows what it showed in challenge 3, one `StartChildWorkflowExecution` for weather and one for travel. Nothing marks either as crossing a runtime boundary, because from the orchestrator's side neither does.

`TravelPlannerAgentWorkflow` is the Execution behind the second one, and it is a Python Workflow. Open it. The agent loop is written out as events, one Activity per model call and one per tool call, alternating, the same shape as the TypeScript specialists.

| | Weather specialist (TypeScript) | Travel specialist (Python) |
|---|---|---|
| Framework | OpenAI Agents SDK | LangChain Deep Agents |
| Integration | `@temporalio/openai-agents` | `temporalio.contrib.deepagents` |
| Model calls in history | one Activity each | one Activity each |
| Tool calls in history | one Activity each | one Activity each |
| Cost of a Worker crash mid-loop | the one step in flight | the one step in flight |

Two languages, two agent frameworks, one durability guarantee, and neither team changed their agent code to get it.

## Break it

**1.** Ask something that needs both specialists:

```bash,run
npm run c4:client -- "What is the weather in Reykjavik, and what should I know about visiting Iceland?"
```

**2.** As soon as it starts, press **Ctrl+C** in the [button label="Python Worker" background="#444CE7"](tab-1) terminal. The TypeScript Workers are untouched.

**3.** In the [button label="Temporal UI" background="#444CE7"](tab-3) tab:

- the orchestrator is **Running**, with `ChildWorkflowExecutionStarted` recorded and no completion after it
- `TravelPlannerAgentWorkflow` is **Running**, frozen at whichever Activity was in flight
- the weather side is unaffected and may already be **Completed**

Before you restart it:

> The Python process is gone mid-conversation. What gets redone when it comes back, and what does not?

<details>
<summary>Answer</summary>

One step. The model calls and tool calls that already completed are events in that Workflow's history with their results attached, so replay hands each recorded answer straight back. Only the call that was in flight is made again.

That is the answer you got in challenge 1 about a TypeScript agent, and it did not change. Both integrations put the agent's control loop inside a Workflow and every nondeterministic call outside it in an Activity, so the guarantee follows from that arrangement rather than from the framework.

The orchestrator redoes nothing. Its history already holds the weather specialist's completed result, and it never notices the outage, because a Child Workflow that has not completed looks the same to it as one that is merely slow.

Killing the TypeScript Workers instead, after the Python side completed, works the same way. `ChildWorkflowExecutionCompleted` is already in the orchestrator's history, so replay hands the answer back locally. A Child Workflow's completion is an event, in the same sense that an Activity result and a Signal are events. The durable agent, the human approval, the parallel fan-out and the cross-language call all run on that one mechanism.

</details>

**4.** Restart the Python Worker:

```bash,run
uv run python worker.py
```

The in-flight step is retried, the agent finishes, and the [button label="Client" background="#444CE7"](tab-2) terminal prints one reply assembled from two languages.

## Try more prompts

```bash,run
npm run c4:client -- "What should I know about visiting Suzuka Circuit?"
```

```bash,run
npm run c4:client -- "What is the weather in Tokyo right now?"
```

The second never touches the Python Worker. Its terminal stays quiet, because the triage agent had no reason to route there.

Click **Check** when you have run at least one question that reached the Python travel planner.

---

Please share your feedback so we can make better content for you. The **Feedback** tab takes a few seconds, and it is how we find out which parts of this landed.
