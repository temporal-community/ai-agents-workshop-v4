---
slug: heterogeneous-agents
type: challenge
title: Heterogeneous Agents
teaser: The travel specialist is now Python, built with a different agent framework,
  behind the same Nexus Operation. The orchestrator never finds out.
notes:
- type: text
  contents: |-
    # Real systems are not written in one language

    The team that owns travel planning already has an agent. It is
    Python, it is built on the Strands Agents SDK, and it has never heard
    of Temporal or of your orchestrator.

    You are not going to rewrite it, and they are not going to rewrite it
    for you.
- type: text
  contents: |-
    # The contract is strings and JSON

    A Nexus Operation is a name, an argument shape and a result shape.
    None of those is a language.

    The TypeScript orchestrator and the Python handler share zero code.
    They agree on a service name, an operation name, and two field names -
    and nothing checks that agreement at compile time, because no compiler
    can see both sides.
tabs:
- title: TypeScript Workers
  type: terminal
  hostname: workshop
  workdir: /root/workshop/decouple-agents/exercise
- title: Python Worker
  type: terminal
  hostname: workshop
  workdir: /root/workshop/decouple-agents/exercise/python-travel-planner
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

# Heterogeneous Agents

> [!NOTE]
> **Your tabs.** Three processes this time, because two of them are different runtimes.
> - [button label="TypeScript Workers" background="#444CE7"](tab-0) - orchestrator and the weather specialist.
> - [button label="Python Worker" background="#444CE7"](tab-1) - the travel specialist, on the far side of the Nexus boundary.
> - [button label="Client" background="#444CE7"](tab-2) - points the endpoint at Python, then asks a question.
> - [button label="Temporal UI" background="#444CE7"](tab-3) - Event History, in both languages.
> - [button label="Editor" background="#444CE7"](tab-4) - VS Code, open on the whole workshop.

> [!WARNING]
> You work in `exercise/`. `solution/` sits beside it with identical filenames - check the editor's title bar before you type.

This challenge needs **TODO 1** (`exercise/src/shared/modelProvider.ts`), **TODO 2** (`exercise/src/shared/weatherTools.ts`) and **TODO 9** (`exercise/src/shared/childWorkflowAsTool.ts`) from the earlier challenges.

## What changed since the last challenge

| | Challenge 3 | Challenge 4 |
|---|---|---|
| Travel specialist language | TypeScript | **Python** |
| Travel specialist framework | OpenAI Agents SDK | **Strands Agents SDK** |
| How the orchestrator reaches it | Nexus Operation | Nexus Operation |
| Orchestrator agent code | - | unchanged |
| Durability inside the specialist | one Activity per model call and per tool call | one Activity for the whole loop |

The third row is why the fourth row is possible.

## Read the other side first

Open the [button label="Editor" background="#444CE7"](tab-4) tab and read `exercise/python-travel-planner/`. It is finished - read it, run it, do not edit it.

- `travel_planner.py` - a Strands agent with two tools. Zero Temporal imports. This is the file that already existed.
- `travel_planner_service.py` - the Nexus service, a Workflow, an Activity that runs the agent, and the Operation handler.
- `worker.py` - a plain Temporal Python Worker on `c4-python-travel-planner-tq`.

Note what `travel_planner_service.py` does with the agent: it calls the whole loop inside one Activity. Strands has no Temporal integration, so there is no way to make each model call its own Activity. That is a real limitation and the README in that folder is blunt about it - but it is still durable, and it is still reachable.

## The three TODOs

**TODO 13** - `exercise/src/challenge4-heterogeneous-agents/api.ts`

Declare the operation on the TypeScript side of the contract. The property name is yours; the wire name has to match the Python attribute character for character. Get it wrong and nothing complains until the call is rejected at the endpoint, at runtime. The comment above it lists all four names that must line up.

**TODO 14** - `exercise/src/challenge4-heterogeneous-agents/workflows.ts`

Build the travel tool as a Nexus Operation - the same call you wrote in challenge 3, against this challenge's service and endpoint. Look at what you are writing. There is nothing in it that says "Python". That is the entire point of the challenge, and it is why the orchestrator's agent code is byte-identical to the previous one.

**TODO 15** - `exercise/src/challenge4-heterogeneous-agents/client.ts`

Create the endpoint, targeting the Task Queue the Python Worker polls. This one line is the whole language boundary: the name the Workflow addresses now resolves to a Python process. Nothing in any Workflow changes.

> Stuck? The same files under `solution/` are the answer.

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

> **If the travel half fails with an endpoint error:** TODO 15 is still open, so the endpoint the Workflow addresses does not exist yet. If the endpoint resolves but the operation is rejected, check TODO 13 against the Python attribute name.

> **Predict before you look:** compare the orchestrator's history with the one from the previous challenge. How much of it do you expect to have changed, now that the specialist behind that endpoint is a different language running a different agent framework?

## Read the Event History

Click the [button label="Temporal UI" background="#444CE7"](tab-3) tab.

**The orchestrator** shows exactly what it showed before: `StartChildWorkflowExecution` for weather, `NexusOperationScheduled` / `NexusOperationCompleted` for travel. Nothing marks one of these as crossing a runtime boundary, because from the orchestrator's side nothing does.

**`TravelPlannerAgentWorkflow`** is the Execution behind that Nexus Operation, and it is a Python Workflow. Open it. It contains exactly one Activity, `run_travel_planner`, and that single Activity is the entire Strands agent loop - every model call and both tool calls, invisible, inside one event.

Put the two specialists side by side:

| | Weather specialist (TypeScript) | Travel specialist (Python) |
|---|---|---|
| Model calls in history | one Activity each | none visible |
| Tool calls in history | one Activity each | none visible |
| Whole agent loop | many events | one event |
| Cost of a Worker crash mid-loop | the one step in flight | the whole conversation |

Coarse durability from an agent nobody wrote with Temporal in mind is a worse deal than fine-grained durability. It is a far better deal than no durability, and it took no changes to their code.

## Break it: kill the language you do not control

**1.** In the [button label="Client" background="#444CE7"](tab-2) terminal, ask something that needs both specialists:

```bash,run
npm run c4:client -- "What is the weather in Reykjavik, and what should I know about visiting Iceland?"
```

**2.** As soon as it starts, go to the [button label="Python Worker" background="#444CE7"](tab-1) terminal and press **Ctrl+C**. The TypeScript Workers in tab-0 are untouched.

**3.** Look at the [button label="Temporal UI" background="#444CE7"](tab-3) tab:

- the orchestrator is **Running**, its `NexusOperationStarted` recorded with no completion after it
- `TravelPlannerAgentWorkflow` is **Running**, its `run_travel_planner` Activity with no result
- the weather side is unaffected and may already be **Completed**

**4.** Before you restart it:

> The Python process is gone. What gets redone when it comes back, and what does not?

<details>
<summary>Answer</summary>

The Strands loop redoes all of it. That Activity had no result recorded, so when a Python Worker returns the Activity is retried from the beginning - every model call and both tool calls, paid for again. One Activity for the whole loop is exactly what that costs.

Everything else redoes nothing. The orchestrator's history already holds the weather specialist's completed result, and the orchestrator itself never notices the outage: it is parked on a Nexus Operation that has not completed, which looks the same to it as one that is merely slow.

And the direction that surprises people: it works the other way too. Had you killed the TypeScript Workers instead, after the Python side completed, the `NexusOperationCompleted` event would already be in the orchestrator's history - so replay hands the answer back locally and no call crosses the process, language or Namespace boundary a second time.

That is worth being precise about, because it is not a property of Nexus. The completion is an event, in the same sense that an Activity result is an event and a Signal is an event. Every mechanism in this workshop - the durable agent, the human approval, the child specialist, the cross-language call - is that one idea wearing different clothes.

</details>

**5.** Restart the Python Worker in the [button label="Python Worker" background="#444CE7"](tab-1) terminal:

```bash,run
uv run python worker.py
```

The Activity is retried, the Strands agent answers, the Nexus Operation completes, and the [button label="Client" background="#444CE7"](tab-2) terminal prints one reply assembled from two languages.

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
