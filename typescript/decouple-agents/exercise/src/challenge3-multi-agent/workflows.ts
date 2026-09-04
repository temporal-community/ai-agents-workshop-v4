// ABOUTME: Challenge 3 — a triage agent that routes to two specialists, each its own Workflow Execution.
// Weather goes over a Child Workflow; travel goes over Nexus.

import { Agent, tool } from '@openai/agents-core';
import { TemporalOpenAIRunner } from '@temporalio/openai-agents/workflow';
import z from 'zod';
import { childWorkflowAsTool } from '../shared/childWorkflowAsTool';
import { weatherTools } from '../shared/weatherTools';
import { travelTools } from '../shared/travelTools';
import type { AgentRequest } from '../shared/types';
import { travelPlannerService, TRAVEL_PLANNER_ENDPOINT, type AskResponse } from './api';

/** The orchestrator's Task Queue. */
export const ORCHESTRATOR_TASK_QUEUE = 'c3-orchestrator-tq';
/** The specialists' Task Queue — a different team, a different deployment. */
export const SPECIALIST_TASK_QUEUE = 'c3-specialists-tq';

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

/** Specialist 2. Reached over Nexus, so its Workflow type is invisible to the caller. */
export async function travelSpecialistWorkflow(request: AgentRequest): Promise<AskResponse> {
  const agent = new Agent({ name: 'TravelSpecialist', instructions: TRAVEL_INSTRUCTIONS, tools: travelTools() });
  const result = await new TemporalOpenAIRunner().run(agent, request.question, {
    runConfig: { model: request.model },
  });
  return { answer: result.finalOutput ?? '' };
}

export async function triageAgentWorkflow(request: AgentRequest): Promise<string> {
  // Child Workflow: the orchestrator names the Workflow function and its Task
  // Queue. History records StartChildWorkflowExecution / ...Completed.
  const weatherTool = childWorkflowAsTool({
    name: 'askWeatherSpecialist',
    description: 'Delegate a weather question to the weather specialist. Pass the full question in plain English.',
    workflow: weatherSpecialistWorkflow,
    taskQueue: SPECIALIST_TASK_QUEUE,
    model: request.model,
    workflowExecutionTimeout: '5 minutes',
  });

  // TODO 11: Build this tool with `nexusOperationAsTool(...)` instead — add it
  // to the `@temporalio/openai-agents/workflow` import already at the top:
  //   operation  travelPlannerService.operations.askTravelPlanner
  //   definition same name/description, `parameters` a JSON schema with a
  //              required string `question`
  //   options    { service: travelPlannerService, endpoint: TRAVEL_PLANNER_ENDPOINT,
  //                scheduleToCloseTimeout: '5 minutes' }
  // Contrast it with the Child Workflow tool above: there the caller names the
  // Workflow function and its Task Queue. Here it names only an endpoint and an
  // operation, which is what lets challenge 4 swap the implementation language.
  const travelTool = tool({
    name: 'askTravelPlanner',
    description:
      'Delegate a destination or country question to the travel specialist. Pass the full question in plain English.',
    parameters: z.object({ question: z.string().describe('The travel question, in plain English') }),
    execute: async ({ question }) => {
      throw new Error(`TODO 11: reach the travel specialist over Nexus (${question})`);
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
