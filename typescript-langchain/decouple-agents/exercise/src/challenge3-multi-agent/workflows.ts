// ABOUTME: Challenge 3 — a triage agent that routes to specialists, each its own Workflow Execution.
// Both specialists are Child Workflows; the fan-out tool runs several of them at once.

import { Agent, tool } from '@openai/agents-core';
import { TemporalOpenAIRunner } from '@temporalio/openai-agents/workflow';
import * as wf from '@temporalio/workflow';
import z from 'zod';
import { childWorkflowAsTool } from '../shared/childWorkflowAsTool';
import { weatherTools } from '../shared/weatherTools';
import { travelTools } from '../shared/travelTools';
import type { AgentRequest } from '../shared/types';

/** The orchestrator's Task Queue. */
export const ORCHESTRATOR_TASK_QUEUE = 'c3-orchestrator-tq';
/** The specialists' Task Queue — a different team, a different deployment. */
export const SPECIALIST_TASK_QUEUE = 'c3-specialists-tq';

const TRIAGE_INSTRUCTIONS = `
You are a triage assistant. You do not answer domain questions yourself; you
route them to a specialist and then compose the reply.

- askWeatherSpecialist: forecasts and current conditions for ONE place.
- askTravelPlanner: destinations, countries, what to know before visiting.
- compareWeatherAcrossCities: current conditions for SEVERAL places at once.
  Use this whenever the question names more than one city, rather than calling
  askWeatherSpecialist repeatedly.

A question can need more than one specialist. Call each relevant one with the
full question in plain English, then combine what they say into one short answer.
`.trim();

const WEATHER_INSTRUCTIONS = `
You are a weather forecasting specialist. Geocode a city before asking for its
forecast, and use the caller's IP address when the user means "here".
Answer concisely, in plain text.
`.trim();

const TRAVEL_INSTRUCTIONS = `
You are a travel planning specialist. Explain destinations: what the place is,
and the country background a visitor needs — language, currency, region.
If no specific destination is named, say so rather than guessing.
Answer concisely, in plain text.
`.trim();

/** Specialist 1. Reached as a Child Workflow: same cluster, parent/child semantics. */
export async function weatherSpecialistWorkflow(request: AgentRequest): Promise<string> {
  const agent = new Agent({ name: 'WeatherSpecialist', instructions: WEATHER_INSTRUCTIONS, tools: weatherTools() });
  const result = await new TemporalOpenAIRunner().run(agent, request.question, {
    runConfig: { model: request.model },
  });
  return result.finalOutput ?? '';
}

/** Specialist 2. Also a Child Workflow, on the same specialists' Task Queue. */
export async function travelSpecialistWorkflow(request: AgentRequest): Promise<string> {
  const agent = new Agent({ name: 'TravelSpecialist', instructions: TRAVEL_INSTRUCTIONS, tools: travelTools() });
  const result = await new TemporalOpenAIRunner().run(agent, request.question, {
    runConfig: { model: request.model },
  });
  return result.finalOutput ?? '';
}

export async function triageAgentWorkflow(request: AgentRequest): Promise<string> {
  // The weather specialist is already wired. Read this one before you write the
  // next: it names a Workflow function and a Task Queue, and nothing else.
  const weatherTool = childWorkflowAsTool({
    name: 'askWeatherSpecialist',
    description: 'Delegate a weather question to the weather specialist. Pass the full question in plain English.',
    workflow: weatherSpecialistWorkflow,
    taskQueue: SPECIALIST_TASK_QUEUE,
    model: request.model,
    workflowExecutionTimeout: '5 minutes',
  });

  // TODO 7: Replace this stub with a `childWorkflowAsTool({ ... })` call, the
  // same shape as `weatherTool` above but pointing at `travelSpecialistWorkflow`.
  // Keep the name and description below — the model routes on them.
  // Both specialists then run on SPECIALIST_TASK_QUEUE, as one deployment owned
  // by one team.
  const travelTool = tool({
    name: 'askTravelPlanner',
    description:
      'Delegate a destination or country question to the travel specialist. Pass the full question in plain English.',
    parameters: z.object({ question: z.string().describe('The travel question, in plain English') }),
    execute: async ({ question }) => {
      throw new Error(`TODO 7: reach the travel specialist as a Child Workflow (${question})`);
    },
  });

  // TODO 8: Make this fan out. Start one Child Workflow per city and run them
  // all at once with `Promise.all(cities.map(...))`, then return one line per
  // city as `${city}: ${answer}`.
  //
  // Use `wf.executeChild(weatherSpecialistWorkflow, { args, workflowId,
  // taskQueue, workflowExecutionTimeout })` — `wf` is imported at the top.
  // Build each `workflowId` with `wf.uuid4()`, never `Math.random()`: Workflow
  // code has to replay identically.
  //
  // The point of the TODO: awaiting in a loop is the anti-pattern. Same work,
  // same history, N times the latency. Parallelism here is a decision the
  // Workflow makes, not one the model makes for you.
  const compareTool = tool({
    name: 'compareWeatherAcrossCities',
    description: 'Get current conditions for several cities at once. Use for any question naming more than one city.',
    parameters: z.object({
      cities: z.array(z.string()).describe('The cities to compare, e.g. ["Barcelona", "Tokyo"]'),
    }),
    execute: async ({ cities }) => {
      throw new Error(`TODO 8: fan out across ${cities.length} cities with Promise.all`);
    },
  });

  const agent = new Agent({
    name: 'TriageAgent',
    instructions: TRIAGE_INSTRUCTIONS,
    tools: [weatherTool, travelTool, compareTool],
  });

  const result = await new TemporalOpenAIRunner().run(agent, request.question, {
    runConfig: { model: request.model },
  });
  return result.finalOutput ?? '';
}
