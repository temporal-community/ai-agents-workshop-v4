# Python travel planner

A [Strands Agents SDK](https://strandsagents.com/) travel planner, lifted unchanged from the
Python workshop (`demo6a-different-sdks/exercise/travel_planner.py`) and put behind a Temporal
**Nexus Operation** so the TypeScript orchestrator in challenge 4 can call it.

| File | What it is |
|---|---|
| `travel_planner.py` | The Strands agent. Zero Temporal imports — another team's code. |
| `travel_planner_service.py` | The Nexus contract, the Workflow, the Activity that runs the agent, and the Operation handler. |
| `worker.py` | A plain Temporal Python Worker on `c4-python-travel-planner-tq`. |

## The contract

TypeScript and Python share no code. These strings are the entire agreement:

| | TypeScript (`src/challenge4-heterogeneous-agents/api.ts`) | Python (`travel_planner_service.py`) |
|---|---|---|
| Service name | `nexus.service('TravelPlannerService', …)` | `@nexusrpc.service class TravelPlannerService` |
| Operation name | `nexus.operation({ name: 'ask_travel_planner' })` | attribute `ask_travel_planner` |
| Request | `interface AskRequest { question: string }` | `@dataclass class AskRequest: question: str` |
| Response | `interface AskResponse { answer: string }` | `@dataclass class AskResponse: answer: str` |
| Endpoint → queue | endpoint `c4-travel-planner` | Worker on `c4-python-travel-planner-tq` |

## Run

```bash
uv sync
export OPENAI_API_KEY=...      # injected by the lab
export OPENAI_BASE_URL=...     # optional; any OpenAI-compatible endpoint
export OPENAI_MODEL=gpt-4o     # optional
uv run python worker.py
```

## Durability, honestly

Strands has no Temporal integration, so the whole agent loop runs inside a single Activity.
Temporal retries that Activity if the Worker dies, but every LLM and tool call inside it re-runs.
Compare with the TypeScript specialists, where the OpenAI Agents plugin makes each model call its
own Activity. Coarse durability from an agent nobody wrote with Temporal in mind is still a real
win — and the orchestrator cannot tell the difference.
