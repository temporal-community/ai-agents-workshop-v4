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
  // Both specialists are Child Workflows. The orchestrator names a Workflow
  // function and a Task Queue, and history records StartChildWorkflowExecution /
  // ChildWorkflowExecutionCompleted for each one.
  const weatherTool = childWorkflowAsTool({
    name: 'askWeatherSpecialist',
    description: 'Delegate a weather question to the weather specialist. Pass the full question in plain English.',
    workflow: weatherSpecialistWorkflow,
    taskQueue: SPECIALIST_TASK_QUEUE,
    model: request.model,
    workflowExecutionTimeout: '5 minutes',
  });

  const travelTool = childWorkflowAsTool({
    name: 'askTravelPlanner',
    description:
      'Delegate a destination or country question to the travel specialist. Pass the full question in plain English.',
    workflow: travelSpecialistWorkflow,
    taskQueue: SPECIALIST_TASK_QUEUE,
    model: request.model,
    workflowExecutionTimeout: '5 minutes',
  });

  // Parallel execution, decided by the Workflow rather than by the model.
  //
  // The model chooses to call this tool once; the fan-out inside it is ordinary
  // deterministic Workflow code. Every city starts its own Child Workflow and
  // they run at the same time, so three cities cost about the wall-clock of one.
  // Promise.all is the whole mechanism — there is no Temporal-specific API here.
  //
  // Awaiting in a loop would be the anti-pattern: same work, same history,
  // N times the latency.
  const compareTool = tool({
    name: 'compareWeatherAcrossCities',
    description: 'Get current conditions for several cities at once. Use for any question naming more than one city.',
    parameters: z.object({
      cities: z.array(z.string()).describe('The cities to compare, e.g. ["Barcelona", "Tokyo"]'),
    }),
    execute: async ({ cities }) => {
      const answers = await Promise.all(
        cities.map((city) =>
          wf.executeChild(weatherSpecialistWorkflow, {
            args: [{ question: `What is the current weather in ${city}?`, model: request.model }],
            // wf.uuid4(), never Math.random(): Workflow code must replay identically.
            workflowId: `weather-${city.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${wf.uuid4()}`,
            taskQueue: SPECIALIST_TASK_QUEUE,
            workflowExecutionTimeout: '5 minutes',
          }),
        ),
      );
      return cities.map((city, i) => `${city}: ${answers[i]}`).join('\n');
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
