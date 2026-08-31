// ABOUTME: Challenge 4 — the same TypeScript orchestrator, with a Python specialist behind Nexus.
// Compared with challenge 3, only the endpoint the travel tool addresses has changed.

import { Agent, tool } from '@openai/agents-core';
import { TemporalOpenAIRunner } from '@temporalio/openai-agents/workflow';
import z from 'zod';
import { childWorkflowAsTool } from '../shared/childWorkflowAsTool';
import { weatherTools } from '../shared/weatherTools';
import type { AgentRequest } from '../shared/types';
import { travelPlannerService, TRAVEL_PLANNER_ENDPOINT } from './api';

export const ORCHESTRATOR_TASK_QUEUE = 'c4-orchestrator-tq';
export const SPECIALIST_TASK_QUEUE = 'c4-specialists-tq';

const TRIAGE_INSTRUCTIONS = `
You are a triage assistant. You do not answer domain questions yourself; you
route them to a specialist and then compose the reply.

- askWeatherSpecialist: forecasts and current conditions anywhere in the world.
- askTravelPlanner: destinations, countries, what to know before visiting.

A question can need both. Call each relevant specialist with the full question
in plain English, then combine what they say into one short answer.
`.trim();

const WEATHER_INSTRUCTIONS = `
You are a weather forecasting specialist. Geocode a city before asking for its
forecast, and use the caller's IP address when the user means "here".
Answer concisely, in plain text.
`.trim();

/** Still a TypeScript Child Workflow — unchanged from challenge 3. */
export async function weatherSpecialistWorkflow(request: AgentRequest): Promise<string> {
  const agent = new Agent({ name: 'WeatherSpecialist', instructions: WEATHER_INSTRUCTIONS, tools: weatherTools() });
  const result = await new TemporalOpenAIRunner().run(agent, request.question, {
    runConfig: { model: request.model },
  });
  return result.finalOutput ?? '';
}

export async function triageAgentWorkflow(request: AgentRequest): Promise<string> {
  const weatherTool = childWorkflowAsTool({
    name: 'askWeatherSpecialist',
    description: 'Delegate a weather question to the weather specialist. Pass the full question in plain English.',
    workflow: weatherSpecialistWorkflow,
    taskQueue: SPECIALIST_TASK_QUEUE,
    model: request.model,
    workflowExecutionTimeout: '5 minutes',
  });

  // TODO 14: Build this with `nexusOperationAsTool(...)` against
  // `travelPlannerService.operations.askTravelPlanner` and
  // `TRAVEL_PLANNER_ENDPOINT` — the same call you wrote in challenge 3.
  // Nothing about it says "Python". The handler behind this endpoint is a
  // Python Worker running a Strands Agents SDK planner; the orchestrator cannot
  // tell, and does not need to.
  const travelTool = tool({
    name: 'askTravelPlanner',
    description:
      'Delegate a destination or country question to the travel specialist. Pass the full question in plain English.',
    parameters: z.object({ question: z.string().describe('The travel question, in plain English') }),
    execute: async ({ question }) => {
      throw new Error(`TODO 14: reach the Python travel planner over Nexus (${question})`);
    },
  });

  const agent = new Agent({
    name: 'TriageAgent',
    instructions: TRIAGE_INSTRUCTIONS,
    tools: [weatherTool, travelTool],
  });

  const result = await new TemporalOpenAIRunner().run(agent, request.question, {
    runConfig: { model: request.model },
  });
  return result.finalOutput ?? '';
}
