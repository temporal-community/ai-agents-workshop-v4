# Exercise

Work through the `TODO`s in order. They are numbered `1..14` across the whole tree, in the order you
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
| 6a | `src/challenge2-human-in-the-loop/workflows.ts` | `askUser` publishes the question and parks on `wf.condition`. |
| 6b | `src/challenge2-human-in-the-loop/workflows.ts` | Query handler returning the pending question. |
| 6c | `src/challenge2-human-in-the-loop/workflows.ts` | Update handler + validator that delivers the answer. |
| 7 | `src/challenge2-human-in-the-loop/client.ts` | Poll the Query, read stdin, send the Update. |

## Challenge 3 — multi-agent

| # | File | What you write |
|---|---|---|
| 8 | `src/shared/childWorkflowAsTool.ts` | Run the specialist with `wf.executeChild`. |
| 9 | `src/challenge3-multi-agent/handler.ts` | The `WorkflowRunOperationHandler` behind the Nexus Operation. |
| 10 | `src/challenge3-multi-agent/workflows.ts` | Build the travel tool with `nexusOperationAsTool`. |
| 11 | `src/challenge3-multi-agent/worker.ts` | A second Worker for the specialists' Task Queue. |

## Challenge 4 — heterogeneous agents

| # | File | What you write |
|---|---|---|
| 12 | `src/challenge4-heterogeneous-agents/api.ts` | Declare the operation matching Python's `ask_travel_planner`. |
| 13 | `src/challenge4-heterogeneous-agents/workflows.ts` | Point the travel tool at the Nexus Operation. |
| 14 | `src/challenge4-heterogeneous-agents/client.ts` | Create the endpoint targeting the Python Worker's Task Queue. |

The Python side in `python-travel-planner/` is finished — read it, run it, do not edit it.

Stuck? The same file in `../solution/` is the answer.
