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
    // TODO 6: Add `needsApproval: true` here. It is the one line that makes
    // this human-in-the-loop: when the model asks for this tool the Agents SDK
    // does not run it, it stops the run and hands back an interruption.
    // Run the challenge before you add it and watch the agent book unsupervised.
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

  if (input.resumeFromRunState !== undefined) {
    // TODO 7a: This is the second Execution: a human approved and the paused run
    // arrived as a string. Rehydrate it with
    // `await RunState.fromString(agent, input.resumeFromRunState)`, call
    // `state.approve(interruption)` for each `state.getInterruptions()`, then
    // `await runner.run(agent, state, { runConfig: { model: input.model } })`
    // and return its `finalOutput`. The earlier turns are not repeated — the
    // loop carries on from exactly where it stopped.
    throw new Error('TODO 7a: rehydrate the run from input.resumeFromRunState.');
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

  // TODO 7b: Park until the human approves: `await condition(() => approved)`.
  // The Workflow Task completes, the Worker moves on to other work, and the
  // state lives on the Temporal server. Nothing polls and nothing is paid for;
  // the Worker could be replaced entirely and the run would still resume.

  // TODO 7c: Then hand the paused run to a fresh Execution with a fresh, short
  // history: `await continueAsNew<typeof tripApprovalWorkflow>({ ...input,
  // resumeFromRunState: result.state.toString() })`. That string is the whole
  // agent conversation, serialized — which is why the resumed run can pick up
  // mid-tool-call.
  //
  // Nothing after continueAsNew ever runs, but TypeScript cannot see that, so
  // finish the function with `throw new Error('unreachable')` or you get
  // "Function lacks ending return statement" (TS2366).
  throw new Error('TODO 7b and 7c: wait for the approve Signal, then continue as new.');
}
