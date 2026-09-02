// ABOUTME: Challenge 1 — an OpenAI Agents SDK agent whose LLM calls and tool calls are Temporal Activities.
// The agentic loop is the SDK's; the durability is Temporal's.

import { Agent, Runner } from '@openai/agents-core';
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

  // TODO 3: This is the Agents SDK's own Runner — the whole conversation lives
  // in this process and dies with it. Swap it for `TemporalOpenAIRunner` from
  // `@temporalio/openai-agents/workflow`, passing the model as
  // `{ runConfig: { model: request.model } }` on `run(...)`. Same loop, same
  // agent object, but every model call is dispatched to the model Activity the
  // plugin registered, so a Worker crash mid-conversation costs at most the one
  // step that was in flight.
  const result = await new Runner({ model: request.model }).run(agent, request.question);

  return result.finalOutput ?? '';
}
