# Heterogeneous agent orchestration: a different language

Extends the [multi-agent orchestrator](../demo5-multi-agent/) with a third specialist written in a different language. The weather forecaster and the F1 expert stay as they were: Python, the OpenAI Agents SDK, per-step durability. The new travel planner is **Java with [Spring AI](https://docs.spring.io/spring-ai/reference/)**, and the Python orchestrator drives it over the same **Temporal Nexus** boundary it already uses for the F1 expert.

The point: the orchestration is language-agnostic. A Java agent and two Python agents sit behind one Python orchestrator, and — because the Java side uses Temporal's Spring AI integration — the cross-language specialist still gets **per-step durability** (every LLM call and tool call is its own Temporal activity), just like the Python OpenAI Agents specialists.

One way to add that specialist is to wrap its whole agent loop in a single Temporal activity. The activity is durable — Temporal retries it if the worker dies — but a crash mid-loop restarts the conversation from scratch, and the orchestrator's history shows one opaque event. This demo does the other thing: the travel planner is its own workflow, and each step inside it is its own activity.

## Architecture

```
                            ┌─────────────────────────────────────┐
                            │  PersonalAssistantWorkflow  (Python) │
                            │  (task queue: orchestrator-tq)       │
                            └────┬─────────────┬──────────────┬────┘
                                 │             │              │
                  child workflow │     Nexus   │       Nexus  │  (cross-language)
                                 ▼             ▼              ▼
       ┌────────────────────────────┐ ┌──────────────────┐ ┌─────────────────────────────┐
       │  WeatherAgentWorkflow       │ │ F1ExpertAgent-   │ │  TravelPlannerAgentWorkflow  │
       │  weather-agent-tq           │ │ Workflow         │ │  travel-planner-agent-tq     │
       │  [Python · OpenAI Agents]   │ │ f1-expert-       │ │  [JAVA · Spring AI]          │
       │                             │ │   agent-tq       │ │                              │
       │                             │ │ [Python · OpenAI]│ │  TemporalChatClient drives   │
       │                             │ │ endpoint:        │ │  a per-step durable loop.    │
       │                             │ │  f1-expert-d6    │ │  endpoint: travel-planner    │
       └─────────────┬───────────────┘ └─────────┬────────┘ └──────────────┬──────────────┘
                     │                           │                          │
            activity_as_tool             stateless_mcp_server     @Tool activity stubs
                     │                           │                          │
       ┌─────────────▼────────────┐  ┌───────────▼──────────┐    ┌──────────▼────────────┐
       │  4 weather activities    │  │  F1 MCP server       │    │  2 travel activities  │
       │  (httpx → public APIs)   │  │  (stdio) → 8 tools   │    │  (Wikipedia + REST    │
       └──────────────────────────┘  └──────────────────────┘    │   Countries)          │
                                                                 └───────────────────────┘
```

The weather and F1 paths are the same ones from the multi-agent orchestrator. What is new is the travel planner: a **Java workflow reached over Nexus** (Spring AI, per-step durability), rather than one activity that wraps the whole agent loop.

## Two ways to host the travel planner

| | One activity wrapping the loop | This demo |
|---|---|---|
| Agent framework | any SDK, no Temporal integration | **Spring AI + Temporal integration** |
| Invocation | single activity (`activity_as_tool`) | **Nexus** (`nexus_operation_as_tool`) |
| Durability of the travel agent | coarse (one activity wraps the whole loop) | **per-step** (each LLM/tool call is an activity) |
| Where it runs | the PA worker (`orchestrator-tq`) | a separate Java worker (`travel-planner-agent-tq`) |

## The cross-language Nexus contract

The Python caller and the Java handler never share code — they agree on **strings and JSON shapes**:

| | Python (`travel_planner_service.py`) | Java (`TravelPlannerService.java`) |
|---|---|---|
| Service name | `TravelPlannerService` (class name) | `@Service(name = "TravelPlannerService")` |
| Operation name | `ask_travel_planner` (attribute) | `@Operation(name = "ask_travel_planner")` |
| Request | Pydantic `AskRequest{ question: str }` | POJO `@JsonProperty("question")` |
| Response | Pydantic `AskResponse{ answer: str }` | POJO `@JsonProperty("answer")` |
| Endpoint → queue | `endpoint="travel-planner"` | worker `task-queue: travel-planner-agent-tq` |

The Python side defines only the *caller stub* (the `@nexusrpc.service` interface) — there's no Python handler. The Nexus endpoint routes the call to whatever worker polls the target task queue, which here is the Java worker.

## Prerequisites

- Python 3.10+, [uv](https://docs.astral.sh/uv/), the [Temporal CLI](https://docs.temporal.io/cli), and `OPENAI_API_KEY`, as in the earlier demos.
- The **F1 MCP server** from the [human-in-the-loop install](../demo4-hitl/README.md#install-the-f1-mcp-server). The worker looks for it at `~/Projects/Temporal/AI/MCP/f1-mcp-server/`, or at `F1_MCP_SERVER_HOME` if you set that.
- **JDK 21+** for the Java travel planner. A Maven wrapper (`./mvnw`) is included, so a system Maven install is optional.

## Running it

You'll use four terminals (Java worker, two Python workers, and the starter). Start the Temporal dev server once:

### 0. Temporal dev server + API key

```bash
temporal server start-dev          # UI at http://localhost:8233
export OPENAI_API_KEY=sk-...        # in every terminal that runs a worker or the starter
```

### 1. Register the two Nexus endpoints (one-time)

```bash
temporal operator nexus endpoint create \
    --name f1-expert-d6 \
    --target-namespace default \
    --target-task-queue f1-expert-agent-tq

temporal operator nexus endpoint create \
    --name travel-planner \
    --target-namespace default \
    --target-task-queue travel-planner-agent-tq
```

Each `--name` must match the `endpoint=` argument in `personal_assistant.py`. Re-running after an endpoint already exists fails harmlessly.

### 2. Start the Java travel-planner worker (terminal 1)

```bash
cd travel-planner-java
./mvnw spring-boot:run
```

This builds the Spring Boot app and starts a Temporal worker on `travel-planner-agent-tq` hosting `TravelPlannerAgentWorkflow` + the `TravelPlannerService` Nexus handler. The first build downloads dependencies; subsequent runs are fast.

### 3. Start the Python workers (terminals 2 and 3)

```bash
cd demo6b-different-languages
uv sync
uv run python -m worker_pa     # orchestrator-tq + weather-agent-tq
uv run python -m worker_f1     # f1-expert-agent-tq + F1 Nexus handler
```

`worker_pa` runs the orchestrator and the weather agent. The travel planner is not registered on that worker — it lives in the Java worker.

### 4. Run the orchestrator (terminal 4)

```bash
cd demo6b-different-languages

# Travel-only — exercises the Java path:
uv run python -m start_workflow "What should I know about visiting Monaco?"

# F1-only — Python Nexus path, same as the multi-agent orchestrator:
uv run python -m start_workflow "When is the next F1 race?"

# Cross-domain — fans out to all three specialists, including the Java one:
uv run python -m start_workflow "What's the weather at the next F1 race and what should I know about visiting the destination?"
```

## What to observe in the Temporal UI

- The **`PersonalAssistantWorkflow`** history shows a `StartNexusOperation` / `NexusOperationCompleted` pair for the `travel-planner` endpoint, right alongside the F1 expert's Nexus operation and the weather child workflow.
- On **`travel-planner-agent-tq`**, a `TravelPlannerAgentWorkflow` execution appears — started by the Java Nexus handler. Its history contains **per-step activities**: the Spring AI model call (`ChatModelActivity`, from `temporal-spring-ai`) and one activity per tool call (`getWikipediaSummary` / `getCountryInfo`). That per-step history is the payoff of using the Spring AI integration instead of wrapping the whole agent in one activity.

## Per-worker plugin configuration (Python side)

Same split as the [multi-agent orchestrator](../demo5-multi-agent/README.md#per-worker-plugin-configuration): `worker_pa.py` keeps `add_temporal_spans=True` (trace context flows from the starter through the weather child workflow), while `worker_f1.py` uses `add_temporal_spans=False` because the contrib doesn't yet propagate trace context across Nexus. The Java travel planner, also behind Nexus, likewise appears as its own trace root in the OpenAI dashboard — expected, not a bug. See [`docs/research/openai-agents-plugin-starter-trace-requirement.md`](../docs/research/openai-agents-plugin-starter-trace-requirement.md).

## Note on running this alongside the different-SDKs workshop

`demo6a-different-sdks` reuses the `orchestrator-tq`, `weather-agent-tq`, and `f1-expert-agent-tq` task-queue names. Run one workshop at a time so the workers do not compete for the same queues.
