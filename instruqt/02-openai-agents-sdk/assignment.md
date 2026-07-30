---
slug: openai-agents-sdk
id: fcltf6zbrfhd
type: challenge
title: 'Demo 2: OpenAI Agents SDK + Temporal'
teaser: The same agent, but the SDK drives the loop. Durability becomes automatic.
notes:
- type: text
  contents: |-
    # What if you didn't have to write the loop?

    Demo 1 was ~50 lines of explicit loop logic. What if a single function
    call replaced all of it, and Temporal durability still applied to every
    step inside?

    That's the OpenAI Agents SDK + Temporal integration. One line replaces
    the loop. Every LLM call and every tool invocation still becomes a
    Temporal activity - automatically.
- type: text
  contents: |-
    # The trade-off

    Tools must now be @activity.defn functions rather than plain Python.
    They gain durability but they're no longer Temporal-agnostic.

    The developer writes standard SDK code. Temporal durability is free.
tabs:
- id: 31rcl28ut32k
  title: Worker
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo2-openai-temporal-integration/exercise
- id: qglx40kbt9zk
  title: Starter
  type: terminal
  hostname: workshop
  workdir: /root/workshop/demo2-openai-temporal-integration/exercise
- id: e3elkflqcjty
  title: Temporal UI
  type: service
  hostname: workshop
  port: 8233
- id: xu508dgplvoa
  title: Network Control Panel
  type: service
  hostname: workshop
  port: 5000
- id: efhnipg7vbyx
  title: Editor
  type: service
  hostname: workshop
  path: /?folder=/root/workshop/demo2-openai-temporal-integration
  port: 8080
difficulty: basic
timelimit: 1800
enhanced_loading: null
---

# Demo 2: OpenAI Agents SDK + Temporal

> [!NOTE]
> **Your tabs.** The same five as demo 1, each pointed at this demo's folder and task queue:
> - [button label="Worker" background="#444CE7"](tab-0) - runs the worker process; it stays blocked while it polls
> - [button label="Starter" background="#444CE7"](tab-1) - where you launch workflows
> - [button label="Temporal UI" background="#444CE7"](tab-2) - the event history of every workflow you run
> - [button label="Network Control Panel" background="#444CE7"](tab-3) - toggle external services off to force failures
> - [button label="Editor" background="#444CE7"](tab-4) - VS Code, opened on this demo's folder
>
> Later demos add tabs as the system grows:
> - **Architecture** (demos 4, 5, 6a, 6b) - a diagram of that demo's files, classes, and task queues
> - **Worker PA** and **Worker F1** (demo 5 onward) - the single Worker tab splits into one per worker process, once specialists run on their own task queues
> - **Java Worker** (demo 6b) - the Spring AI travel planner, running on the JVM

## What Changed

Click the [button label="Editor" background="#444CE7"](tab-4) tab. Key files in `demo2-openai-temporal-integration`:

- `tools_workflow.py` - the entire agentic loop is now one line: `result = await Runner.run(agent, input=question)`
- `tool_activities.py` - tools are `@activity.defn` functions. `activity_as_tool(...)` wraps each one for the SDK.
- `worker.py` - the `OpenAIAgentsPlugin` is registered on both client and worker. It installs the model-execution activity and interceptors automatically.

> [!NOTE]
> **Hands-on:** Do your coding in the `exercise/` directory. Want to see the working code? Peek at `solution/`.

## Write the Agent

In the [button label="Editor" background="#444CE7"](tab-4) tab, open `exercise/tools_workflow.py` and follow the `TODO` in the `run` method.

Stuck? Compare against `solution/tools_workflow.py` in the [button label="Editor" background="#444CE7"](tab-4) tab.

## Start the Worker

Click the [button label="Worker" background="#444CE7"](tab-0) terminal.

```bash,run
uv run python -m worker
```

The worker starts polling its task queue and keeps running. It prints no startup banner and does not return you to the prompt. That blocked terminal is the worker doing its job. Leave it running and move on.

> **If it fails:** `OPENAI_API_KEY not set` means the key didn't carry into this terminal - open a fresh tab and re-check. Port or task-queue conflicts are unlikely here since each demo uses its own queue, but if a demo1 worker is still running, it's harmless - they don't interfere.

## Run It

Click the [button label="Starter" background="#444CE7"](tab-1) terminal.

```bash,run
uv run python -m start_workflow "What is the weather in Tokyo?"
```

You should see a final answer describing Tokyo's current weather, printed after a few seconds.

## Watch the Event History

Click the [button label="Temporal UI" background="#444CE7"](tab-2) tab. Look at a completed workflow. `invoke_model_activity` appears as its own named entry - the SDK's model calls are now first-class Temporal activities alongside the tool calls.

> **Compare to demo 1:** demo 1's event history had one LLM-call activity per loop iteration, hand-dispatched by your own code. This one has `invoke_model_activity` entries instead - same idea, but the SDK's `Runner.run()` is what's calling them now, not your `while True` loop. Same durability, one line of code.

## Break It: The Durability Test

Do all five steps.

**1. Turn off the service.** Click the [button label="Network Control Panel" background="#444CE7"](tab-3) tab and toggle **Weather** off.

**2. Run a workflow.** Click the [button label="Starter" background="#444CE7"](tab-1) terminal:

```bash,run
uv run python -m start_workflow "What is the weather in London?"
```

**3. Observe.** Switch to the [button label="Temporal UI" background="#444CE7"](tab-2) tab and open the running workflow:

- Status is still **Running**.
- The `get_weather` activity is **Retrying**, attempts climbing with a growing backoff.
- The `invoke_model_activity` entries before it are still **Completed**.
- Your [button label="Worker" background="#444CE7"](tab-0) terminal shows the `503` from the proxy on each attempt - the failure is real and it is reaching your code.

**4. Answer this question.** Before you turn the service back on:

> Your workflow code is one line: `result = await Runner.run(agent, input=question)`. You wrote no retry loop, no `try`/`except`, no backoff. So who is retrying this tool call?

<details>
<summary>Answer</summary>

Temporal is - and the SDK has no idea anything went wrong.

`activity_as_tool(get_weather, ...)` turned that tool into a Temporal activity, and every activity carries a retry policy by default. The `503` fails the activity, the Temporal server schedules the next attempt, and `Runner.run()` is simply still `await`ing a call that hasn't returned yet.

From the agent framework's point of view this is one slow tool call. From your point of view it's a retry policy you never had to write. That's the trade the plugin makes for you.
</details>

**5. Let it finish.** Toggle **Weather** back on in the [button label="Network Control Panel" background="#444CE7"](tab-3). The next attempt succeeds, `Runner.run()` returns, and the [button label="Starter" background="#444CE7"](tab-1) prints London's weather - from the same workflow execution you started before the outage.

## Summary

Demo 1 and demo 2 build the same agent with the same durability. The only thing that changed is who writes the loop. It's the classic build-vs-adopt-a-framework tradeoff:

| | Demo 1 (hand-written) | Demo 2 (SDK) |
|---|---|---|
| Who writes the loop | You (`while True`) | `Runner.run()` |
| Lines of orchestration code | ~50 | 1 |
| Durability | You wire each `execute_activity` | `activity_as_tool` + plugin do it |
| Flexibility | Total; framework-agnostic | Bounded by the SDK's conventions |
| Maintenance burden | Yours | The SDK's |

### Who writes the loop

Demo 1, you write the loop by hand:

```python,nocopy
while True:
    llm_result = await workflow.execute_activity(openai_responses.create, ...)
    item = llm_result.output[0]
    if item.type == "function_call":
        tool_output = await self._handle_function_call(item, llm_result, input_list)
        input_list.append({"type": "function_call_output", ...})
    else:
        return llm_result.output_text
```

Demo 2, the SDK's Runner owns the loop:

```python,nocopy
result = await Runner.run(agent, input=question)
return result.final_output
```

### Lines of orchestration code

Demo 1 also needs a tool-dispatch helper, part of the ~50 lines you maintain:

```python,nocopy
async def _handle_function_call(self, item, llm_result, input_list):
    args = json.loads(item.arguments) if isinstance(item.arguments, str) else item.arguments
    tool_output = await workflow.execute_activity(
        item.name, args, start_to_close_timeout=timedelta(seconds=30),
    )
    return tool_output
```

Demo 2 replaces all of it with one call:

```python,nocopy
result = await Runner.run(agent, input=question)
```

### Durability

Demo 1, you make each LLM call and tool call durable by dispatching it as an activity yourself:

```python,nocopy
llm_result = await workflow.execute_activity(openai_responses.create, ...)
tool_output = await workflow.execute_activity(item.name, args, ...)
```

Demo 2, the wrapper turns each tool into an activity:

```python,nocopy
tools=[
    activity_as_tool(get_weather, start_to_close_timeout=timedelta(seconds=30)),
    ...
]
```

And the plugin (registered in `worker.py`) turns every LLM call into an activity too:

```python,nocopy
plugin = OpenAIAgentsPlugin(model_params=ModelActivityParameters(...))
client = await Client.connect(**config, plugins=[plugin])
```

Click **Check** when you've run at least one workflow successfully.
