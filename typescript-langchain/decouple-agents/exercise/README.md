# Exercise

Work through the `TODO`s in order. They are numbered `1..15` across the whole tree, in the order you
meet them. Each one sits on the code it changes. `npx tsc --noEmit` passes at every point — a TODO
you have not done yet is a stub that throws at runtime, not a compile error.

Setup, run commands and what to look for in the Temporal UI are in [`../README.md`](../README.md).

## Challenge 1 — the OpenAI Agents SDK, made durable

| # | File | What you write |
|---|---|---|
| 1 | `src/shared/modelProvider.ts` | Build the `OpenAIProvider` from `OPENAI_API_KEY` / `OPENAI_BASE_URL`. |
| 2 | `src/shared/weatherTools.ts` | Wrap `getCoordinates` and `getWeather` with `activityAsTool`. |
| 3 | `src/challenge1-durable-agent/workflows.ts` | Replace the SDK's `Runner` with `TemporalOpenAIRunner`. |
| 4 | `src/challenge1-durable-agent/worker.ts` | Register `OpenAIAgentsPlugin` on the Worker. |
| 5 | `src/challenge1-durable-agent/client.ts` | Register it on the Client too. |

## Challenge 2 — human in the loop

| # | File | What you write |
|---|---|---|
| 6 | `src/challenge2-human-in-the-loop/workflows.ts` | Mark the `bookTrip` tool `needsApproval: true`. |
| 7a | `src/challenge2-human-in-the-loop/workflows.ts` | Resume branch: `RunState.fromString`, approve each interruption, re-run. |
| 7b | `src/challenge2-human-in-the-loop/workflows.ts` | Park on `condition(() => approved)` when the run was interrupted. |
| 7c | `src/challenge2-human-in-the-loop/workflows.ts` | `continueAsNew` carrying `result.state.toString()`. |
| 8 | `src/challenge2-human-in-the-loop/client.ts` | Send the `approve` Signal. |

## Challenge 3 — multi-agent

| # | File | What you write |
|---|---|---|
| 9 | `src/shared/childWorkflowAsTool.ts` | Run the specialist with `wf.executeChild`. |
| 10 | `src/challenge3-multi-agent/workflows.ts` | Reach the travel specialist with `childWorkflowAsTool`. |
| 11 | `src/challenge3-multi-agent/workflows.ts` | Fan out across cities with `Promise.all`. |
| 12 | `src/challenge3-multi-agent/worker.ts` | A second Worker for the specialists' Task Queue. |

## Challenge 4 — heterogeneous agents

| # | File | What you write |
|---|---|---|
| 13 | `src/challenge4-heterogeneous-agents/workflows.ts` | Start the Python Workflow by type name with `wf.executeChild`. |

The Python side in `python-travel-planner/` is finished — read it, run it, do not edit it.

Stuck? The same file in `../solution/` is the answer.
