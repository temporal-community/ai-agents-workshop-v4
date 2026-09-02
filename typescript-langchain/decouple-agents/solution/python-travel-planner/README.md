# Python travel planner

A [LangChain Deep Agents](https://github.com/langchain-ai/deepagents) travel planner, made
durable by Temporal and started by the TypeScript orchestrator in challenge 4 as an ordinary
**Child Workflow**.

| File | What it is |
|---|---|
| `travel_planner.py` | The agent's tools and prompt. Plain LangChain — zero Temporal imports. |
| `travel_planner_service.py` | The Workflow the orchestrator starts, and the request/response shapes. |
| `worker.py` | A Temporal Python Worker on `c4-python-travel-planner-tq`, carrying the plugin. |

## The contract

TypeScript and Python share no code. These four things are the entire agreement:

| | TypeScript (`src/challenge4-heterogeneous-agents/api.ts`) | Python (`travel_planner_service.py`) |
|---|---|---|
| Workflow type | `'TravelPlannerAgentWorkflow'` | `@workflow.defn class TravelPlannerAgentWorkflow` |
| Task Queue | `'c4-python-travel-planner-tq'` | `TASK_QUEUE` |
| Request | `interface AskRequest { question, model }` | `@dataclass class AskRequest` |
| Response | `interface AskResponse { answer }` | `@dataclass class AskResponse` |

No compiler checks across this boundary. Change a name on one side only and it fails at run
time, in the payload converter — not at build time.

## Run

```bash
uv sync
export OPENAI_API_KEY=...      # injected by the lab
export OPENAI_BASE_URL=...     # optional; any OpenAI-compatible endpoint
export OPENAI_MODEL=gpt-4o     # optional
uv run python worker.py
```

Python 3.11 or newer. Deep Agents sets that floor; on 3.10 the dependency group resolves to
nothing and `uv sync` installs none of it, silently.

## Durability

`DeepAgentsPlugin` makes the agent's control loop run *inside* the Workflow, replaying
deterministically, while every LLM call and every I/O tool call leaves as an Activity. A Worker
crash mid-conversation costs the one step that was in flight, not the whole run — the same
guarantee the TypeScript specialists get from the OpenAI Agents plugin.

The model is named, never built, in Workflow code. The Workflow ships the string `openai:gpt-4o`;
`worker.py`'s `build_model` turns it into a real client Worker-side, which is why no API key ever
reaches Event History.

> `temporalio.contrib.deepagents` is **Pre-release** and its API may change before it stabilises.
