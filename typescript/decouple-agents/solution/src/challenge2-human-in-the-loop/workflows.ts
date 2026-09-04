// ABOUTME: Challenge 2 — the agent proposes an irreversible action and stops until a human approves.
// The pause is an approval interruption; the approval is a Signal; the resume is continueAsNew.

import { Agent, RunState, tool } from '@openai/agents-core';
import { TemporalOpenAIRunner } from '@temporalio/openai-agents/workflow';
import { condition, continueAsNew, defineSignal, proxyActivities, setHandler } from '@temporalio/workflow';
import z from 'zod';
import { weatherTools } from '../shared/weatherTools';
import type { AgentRequest } from '../shared/types';
import type * as activities from './activities';

/** Task Queue this challenge's Worker polls and its client targets. */
export const TASK_QUEUE = 'c2-human-in-the-loop-tq';

/** The human's verdict. A Signal is the right shape: it is a fact, not a question. */
export const approveSignal = defineSignal('approve');

/** What the Workflow takes. `resumeFromRunState` is set only by continueAsNew. */
export interface ApprovalInput extends AgentRequest {
  /** A serialized `RunState`, handed from the run that was interrupted to the run that resumes it. */
  resumeFromRunState?: string;
}

const { bookTrip } = proxyActivities<typeof activities>({ startToCloseTimeout: '1 minute' });

const INSTRUCTIONS = `
You are a travel assistant. Use the weather tools to check conditions at the
destination, then call bookTrip to reserve the trip. Never claim a trip is
booked unless the bookTrip tool has returned a confirmation.
Answer in plain text.
`.trim();

function buildAgent(): Agent {
  const bookTripTool = tool({
    name: 'bookTrip',
    description: 'Reserve a trip. Spends the user money, so it requires human approval.',
    parameters: z.object({
      destination: z.string().describe('City to travel to.'),
      departureDate: z.string().describe('Departure date as YYYY-MM-DD.'),
    }),
    // The one line that makes this human-in-the-loop. When the model asks for
    // this tool, the Agents SDK does not run it: the run stops and hands back
    // an interruption instead.
    needsApproval: true,
    execute: async ({ destination, departureDate }) => await bookTrip({ destination, departureDate }),
  });

  return new Agent({
    name: 'TripAssistant',
    instructions: INSTRUCTIONS,
    tools: [...weatherTools(), bookTripTool],
  });
}

export async function tripApprovalWorkflow(input: ApprovalInput): Promise<string> {
  const agent = buildAgent();
  const runner = new TemporalOpenAIRunner();

  // Second Execution: a human already approved, and the paused run arrived as a
  // string. Rehydrate it, mark every pending approval granted, and let the loop
  // carry on from exactly where it stopped — the earlier turns are not repeated
  // and not paid for again.
  if (input.resumeFromRunState !== undefined) {
    const state = await RunState.fromString(agent, input.resumeFromRunState);
    for (const interruption of state.getInterruptions()) {
      state.approve(interruption);
    }
    const resumed = await runner.run(agent, state, { runConfig: { model: input.model } });
    return resumed.finalOutput ?? '';
  }

  let approved = false;
  setHandler(approveSignal, () => {
    approved = true;
  });

  const result = await runner.run(agent, input.question, { runConfig: { model: input.model } });

  // Nothing needed approval — the agent answered without proposing a booking.
  if (result.interruptions.length === 0) {
    return result.finalOutput ?? '';
  }

  // The Workflow parks here. The Workflow Task completes, the Worker moves on
  // to other work, and the state lives on the Temporal server. Nothing polls
  // and nothing is paid for; the Worker could be replaced entirely and the run
  // would still resume when the Signal lands.
  await condition(() => approved);

  // Hand the paused run to a fresh Execution with a fresh, short history.
  // `result.state.toString()` is the whole agent conversation, serialized —
  // which is why the resumed run can pick up mid-tool-call.
  await continueAsNew<typeof tripApprovalWorkflow>({ ...input, resumeFromRunState: result.state.toString() });
  throw new Error('unreachable');
}
