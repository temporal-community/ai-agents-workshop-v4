// ABOUTME: Challenge 2 — the agent stops mid-run to ask a human, then resumes where it left off.
// The pause is a Workflow condition; the human's answer arrives as a Workflow Update.

import { Agent, tool } from '@openai/agents-core';
import { TemporalOpenAIRunner } from '@temporalio/openai-agents/workflow';
import * as wf from '@temporalio/workflow';
import z from 'zod';
import { weatherTools } from '../shared/weatherTools';
import type { AgentRequest } from '../shared/types';

/** Task Queue this challenge's Worker polls and its client targets. */
export const TASK_QUEUE = 'c2-human-in-the-loop-tq';

/** Read-only peek at what the agent is waiting to be told. `null` when it is working. */
export const pendingQuestionQuery = wf.defineQuery<string | null>('pendingQuestion');

/**
 * Delivers the human's answer.
 *
 * An Update rather than a Signal because the caller wants an answer to
 * "did that land?": a Signal is fire-and-forget and would silently vanish if
 * the agent were not actually waiting.
 */
export const provideUserInputUpdate = wf.defineUpdate<void, [string]>('provideUserInput');

const INSTRUCTIONS = `
You are a helpful travel and weather assistant. Use the provided tools whenever
they would help you answer accurately.

If the request is ambiguous — an unqualified city name, a trip with no
destination, "the race" with no race named — call the askUser tool with a
single, specific question rather than guessing. Ask at most one question at a
time.

When you have enough information, answer in plain text. Today is {date}.
`.trim();

export async function humanInTheLoopWorkflow(request: AgentRequest): Promise<string> {
  // Human-in-the-loop state, owned by the Workflow and therefore durable.
  let pendingQuestion: string | null = null;
  let answer: string | null = null;

  /**
   * An inline tool, not an Activity. The Agents SDK awaits an inline tool's
   * `execute` in the caller's context — which here is the Workflow — so this
   * function may use Workflow APIs. An Activity could not: it runs in a Worker
   * thread with no access to Workflow state.
   */
  const askUser = tool({
    name: 'askUser',
    description: 'Ask the human a clarifying question and wait for their answer before continuing.',
    parameters: z.object({
      question: z.string().describe('One specific question for the human.'),
    }),
    execute: async ({ question }) => {
      // TODO 6a: Publish the question (`pendingQuestion = question`), then park
      // on `await wf.condition(() => answer !== null)` and return the answer,
      // clearing both variables so a second askUser call starts clean.
      // Parking here completes the Workflow Task: the Worker moves on, the
      // state lives on the server, nothing polls and nothing is paid for.
      throw new Error(`TODO 6a: wait for a human answer to: ${question}`);
    },
  });

  // TODO 6b: Answer `pendingQuestionQuery` with the current `pendingQuestion`.
  // A Query is a read-only peek at Workflow state; it adds nothing to history,
  // which is what makes it safe to poll.

  // TODO 6c: Handle `provideUserInputUpdate` by assigning `answer`, and give it
  // a validator that rejects an answer when `pendingQuestion === null` or the
  // text is empty. The validator must take the SAME arguments as the handler:
  // give it a different arity and TypeScript infers `Args = []`, silently picks
  // the wrong `setHandler` overload, and the handler stops typechecking.

  const agent = new Agent({
    name: 'AssistantWithHuman',
    instructions: INSTRUCTIONS.replace('{date}', wf.workflowInfo().startTime.toISOString().slice(0, 10)),
    tools: [...weatherTools(), askUser],
  });

  const result = await new TemporalOpenAIRunner().run(agent, request.question, {
    runConfig: { model: request.model },
  });

  return result.finalOutput ?? '';
}
