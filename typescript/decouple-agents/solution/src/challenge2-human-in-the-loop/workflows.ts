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
      pendingQuestion = question;
      wf.log.info('Waiting for a human answer', { question });

      // The Workflow parks here. The Workflow Task completes, the Worker moves
      // on to other work, and the state lives on the Temporal server. Nothing
      // is polling and nothing is being paid for; the Worker could be replaced
      // entirely and the run would resume from history when the answer lands.
      await wf.condition(() => answer !== null);

      const received = answer as string;
      pendingQuestion = null;
      answer = null;
      return received;
    },
  });

  wf.setHandler(pendingQuestionQuery, () => pendingQuestion);

  wf.setHandler(
    provideUserInputUpdate,
    (userInput: string) => {
      answer = userInput;
    },
    {
      // The validator takes the SAME arguments as the handler. Give it a
      // different arity and TypeScript infers `Args = []`, silently selects the
      // wrong `setHandler` overload, and the handler stops typechecking.
      validator: (userInput: string) => {
        if (pendingQuestion === null) {
          throw new Error('The agent is not waiting for input right now.');
        }
        if (userInput.trim().length === 0) {
          throw new Error('Answer must not be empty.');
        }
      },
    },
  );

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
