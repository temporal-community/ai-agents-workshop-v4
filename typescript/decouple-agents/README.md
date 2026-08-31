# Decouple your agents — TypeScript

Four challenges that take an OpenAI Agents SDK agent from "a script that dies with its process"
to "a fleet of specialists, in two languages, that survive anything".

This is the TypeScript port of the Python workshop in the repository root
(`demo2-openai-temporal-integration`, `demo4-hitl`, `demo5-multi-agent`, `demo6a-different-sdks`,
`demo6b-different-languages`). It is a rewrite, not a transliteration.

```
decouple-agents/
├── exercise/    <- you work here; the teaching moments are numbered TODOs
└── solution/    <- the same tree, finished
```

## The four challenges

| # | Challenge | The move |
|---|---|---|
| 1 | **The OpenAI Agents SDK, made durable** | Swap the SDK's `Runner` for `TemporalOpenAIRunner`. LLM calls and tool calls become Temporal Activities. |
| 2 | **Human in the loop** | The agent calls `askUser`, the Workflow parks on a `condition`, a human answers with a Workflow Update, the run resumes. |
| 3 | **Multi-agent** | A triage agent routes to two specialists — one over a Child Workflow, one over Nexus. Each is its own Workflow Execution on its own Task Queue. |
| 4 | **Heterogeneous agents** | The travel specialist is now **Python** (Strands Agents SDK) behind the same Nexus Operation. The TypeScript orchestrator does not change. |

## Setup

Prerequisites: Node 20+, the [Temporal CLI](https://docs.temporal.io/cli), and for challenge 4
Python 3.10+ with [uv](https://docs.astral.sh/uv/).

```bash
temporal server start-dev          # UI at http://localhost:8233
cd exercise && npm ci              # or cd solution && npm ci
```

Model credentials arrive from the environment. Never hardcode a key.

```bash
export OPENAI_API_KEY=...          # injected by the lab
export OPENAI_BASE_URL=...         # optional; any OpenAI-compatible endpoint
export OPENAI_MODEL=gpt-4o         # optional, defaults to gpt-4o
```

`OPENAI_API_KEY` and `OPENAI_BASE_URL` are read in the Worker and Client processes.
`OPENAI_MODEL` is read by the Client and travels to the Workflow as data — Workflow code runs in a
deterministic sandbox and has no environment to read.

## Running each challenge

Every challenge is a Worker in one terminal and a client in another.

```bash
# Challenge 1
npm run c1:worker
npm run c1:client "What is the weather in Barcelona?"

# Challenge 2 — answer the agent's question in the client terminal
npm run c2:worker
npm run c2:client "Should I pack a raincoat for the next race?"
npm run c2:client -- --workflow-id c2-hitl-xxxx     # reconnect to a waiting run

# Challenge 3 — the client registers the Nexus endpoint on first run
npm run c3:worker
npm run c3:client "What's the weather in Monaco, and what should I know about visiting?"

# Challenge 4 — three processes: TypeScript Workers, Python Worker, client
npm run c4:worker
(cd python-travel-planner && uv sync && uv run python worker.py)
npm run c4:client "What should I know about visiting Monaco, and what is the weather there?"
```

## What to look for in the Temporal UI

- **Challenge 1** — one Workflow, and inside it one `InvokeModelActivity` per LLM turn plus one
  Activity per tool call. Kill the Worker mid-run and restart it: the conversation resumes from
  history and no completed step is paid for twice.
- **Challenge 2** — while the agent waits for the human the Workflow is *Running* and costing
  nothing. No Worker is holding it.
- **Challenge 3** — `StartChildWorkflowExecution` for the weather specialist,
  `NexusOperationScheduled` for the travel specialist, and two more Workflow Executions on the
  specialist Task Queue.
- **Challenge 4** — the orchestrator's history is unchanged from challenge 3, but the Workflow
  behind the Nexus Operation is a Python one. The one Activity in it is the entire Strands loop.

## Layout

```
solution/
├── package.json, tsconfig.json
├── python-travel-planner/            Python Nexus handler for challenge 4
└── src/
    ├── shared/
    │   ├── types.ts                  AgentRequest: what every agent Workflow takes
    │   ├── modelProvider.ts          OpenAI-compatible provider, built from env
    │   ├── workerOptions.ts          OpenAIAgentsPlugin + the Workflow bundler tweak
    │   ├── weatherActivities.ts      four network calls, as Activities
    │   ├── travelActivities.ts       two network calls, as Activities
    │   ├── weatherTools.ts           those Activities, as agent tools
    │   ├── travelTools.ts            those Activities, as agent tools
    │   └── childWorkflowAsTool.ts    a Child Workflow, as an agent tool
    ├── challenge1-durable-agent/     workflows.ts, worker.ts, client.ts
    ├── challenge2-human-in-the-loop/ workflows.ts, worker.ts, client.ts
    ├── challenge3-multi-agent/       api.ts, handler.ts, workflows.ts, worker.ts, client.ts
    └── challenge4-heterogeneous-agents/ api.ts, workflows.ts, worker.ts, client.ts
```

## References

- [Temporal + OpenAI Agents SDK (TypeScript)](https://docs.temporal.io/develop/typescript/integrations/openai-agents)
- [samples-typescript/openai-agents](https://github.com/temporalio/samples-typescript/tree/main/openai-agents)
- [samples-typescript/nexus-hello](https://github.com/temporalio/samples-typescript/tree/main/nexus-hello)
