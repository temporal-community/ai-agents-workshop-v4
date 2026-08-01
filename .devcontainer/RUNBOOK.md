# Workshop runbook (Codespaces)

Four demos. Each adds one capability, so the interesting part is always the
diff against the one before.

Everything is pre-installed. No `uv sync`, no `mvn install`, no Temporal server
to start. Open a terminal and go.

**Before you start:** `OPENAI_API_KEY` must be set as a Codespaces secret. If
the startup log warned you it was missing, add it at
<https://github.com/settings/codespaces> and restart the Codespace.

## Where things are

| | |
|---|---|
| Your working copy | `~/workshop/<demo>/exercise` (edit here) |
| Reference solution | `~/workshop/<demo>/solution` |
| All seven demos, read-only | `/opt/workshop/` |
| Temporal UI | port **8233** (Ports panel, or the notification) |
| Network Control Panel | port **5000** |
| Architecture diagrams | **8092** demo 4, **8090** demo 5, **8091** demo 6b |

Open ports from the **Ports** panel in the bottom pane. Each demo uses its own
task queue, so leaving old workers running is harmless.

## Demo 2 — OpenAI Agents SDK + Temporal

`~/workshop/demo2-openai-temporal-integration/exercise`

```bash
uv run python -m worker                                        # terminal 1
uv run python -m start_workflow "What is the weather in Tokyo?"   # terminal 2
```

**Look at:** the Temporal UI event history. Every LLM call and every tool call is
its own activity, and you wrote none of that dispatch code.

**The point:** `Runner.run()` replaces ~50 lines of hand-written agentic loop.
The durability is identical. The cost is that tools must now be
`@activity.defn` functions rather than plain Python.

## Demo 4 — Human-in-the-loop

`~/workshop/demo4-hitl/exercise`

```bash
uv run python -m worker                                                              # terminal 1
uv run python -m start_workflow "What's the weather like where I'm traveling to this weekend?"   # terminal 2
```

The agent stops and asks you a question. Answer it in terminal 2.

**Look at:** the workflow sitting in `wait_condition`, holding no thread and no
memory, then resuming the instant your signal lands.

**The point:** `ask_user` sets state and awaits; `provide_user_input` is a signal;
two queries let the starter poll. Suspended durably, not blocked.

## Demo 5 — Multi-agent orchestration

`~/workshop/demo5-multi-agent/exercise` — needs **three** terminals.

```bash
uv run python -m worker_pa                                                            # terminal 1
uv run python -m worker_f1                                                            # terminal 2
uv run python -m start_workflow "When is the next F1 race and what's the weather there right now?"   # terminal 3
```

**Look at:** the parent's event history. The weather agent appears as
`StartChildWorkflowExecution`, the F1 expert as `NexusOperationScheduled`. Same
result, two different shapes. Diagram on port **8090**.

**The point:** each specialist is a real workflow execution. The orchestrator
does not care which invocation pattern each one uses.

## Demo 6b — A specialist in another language

`~/workshop/demo6b-different-languages/exercise` — needs **four** terminals.

```bash
cd travel-planner-java && ./mvnw spring-boot:run                       # terminal 1 (Java, slowest to boot)
uv run python -m worker_pa                                             # terminal 2
uv run python -m worker_f1                                             # terminal 3
uv run python -m start_workflow "What should I know about visiting Monaco?"   # terminal 4
```

Wait for the Java worker to print that it has started before running the starter.

**Look at:** the travel planner's own workflow, with per-step LLM and tool
activities, driven from Python across a Nexus boundary. Diagram on port **8091**.

**The point:** the orchestration is language-agnostic. Python and Java share no
code and agree only on string names and JSON shapes, and the Java specialist
still gets per-step durability.

## The durability test (worth doing at least once)

1. Start a workflow.
2. Kill the worker mid-run: `Ctrl-C`, or `pkill -f "python -m worker"`.
3. Look at the Temporal UI. The workflow is still there, waiting.
4. Restart the worker.
5. It resumes from where it stopped. No lost work, no replayed side effects.

The **Network Control Panel** on port 5000 does the same thing to external
services: toggle OpenAI or the F1 server off mid-run and watch Temporal retry
the activity, then succeed once you toggle it back.

## If something misbehaves

| Symptom | Fix |
|---|---|
| `OPENAI_API_KEY not set` | Codespaces secret, then restart the Codespace |
| Outbound calls hang | mitmproxy holds `HTTP_PROXY`; `bash .devcontainer/start.sh` restarts it |
| Temporal UI won't open | check the Ports panel for 8233; `tail /tmp/temporal-server.log` |
| Worker won't start, port in use | a worker from an earlier demo is running; `pkill -f "python -m worker"` |
| Anything else | re-run `bash .devcontainer/start.sh`, it is idempotent |
