// ABOUTME: Challenge 1 — an OpenAI Agents SDK agent whose LLM calls and tool calls are Temporal Activities.
// The agentic loop is the SDK's; the durability is Temporal's.

import { Agent } from '@openai/agents-core';
import { TemporalOpenAIRunner } from '@temporalio/openai-agents/workflow';
import { weatherTools } from '../shared/weatherTools';
import type { AgentRequest } from '../shared/types';

/** Task Queue this challenge's Worker polls and its client targets. */
export const TASK_QUEUE = 'c1-durable-agent-tq';

const INSTRUCTIONS = `
You are a helpful weather assistant. Use the provided tools whenever they would
help you answer accurately — geocode a city before asking for its forecast, and
fall back to the caller's IP address when the user says "here" or "where I am".
When you have enough information, answer in plain text.
`.trim();

export async function weatherAgentWorkflow(request: AgentRequest): Promise<string> {
  // Ordinary Agents SDK code. Nothing here knows about Temporal.
  const agent = new Agent({
    name: 'WeatherAgent',
    instructions: INSTRUCTIONS,
    tools: weatherTools(),
  });

  // TemporalOpenAIRunner stands in for the Agents SDK's own `Runner`. Same
  // loop, same agent object — but every model call is dispatched to the model
  // Activity the plugin registered, so a Worker crash mid-conversation costs
  // at most the one step that was in flight.
  const result = await new TemporalOpenAIRunner().run(agent, request.question, {
    runConfig: { model: request.model },
  });

  return result.finalOutput ?? '';
}
