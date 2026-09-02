// ABOUTME: Wraps a specialist Workflow as an OpenAI Agents tool, invoked as a Temporal Child Workflow.
// The Child Workflow counterpart of activityAsTool, which the SDK ships but this does not.

import { tool, type Tool } from '@openai/agents-core';
import * as wf from '@temporalio/workflow';
import type { Duration } from '@temporalio/common';
import z from 'zod';
import type { AgentRequest } from './types';

export interface ChildWorkflowAsToolOptions {
  /** Tool name the model sees. */
  name: string;
  /** Tool description the model routes on. */
  description: string;
  /** The specialist Workflow function. */
  workflow: (request: AgentRequest) => Promise<string>;
  /** Task Queue the specialist's Worker polls. */
  taskQueue: string;
  /** Model name to forward to the specialist. */
  model?: string;
  /** Ceiling on the whole specialist run. */
  workflowExecutionTimeout?: Duration;
}

/**
 * Every invocation becomes its own durable Workflow Execution, visible in the
 * caller's history as StartChildWorkflowExecution / ChildWorkflowExecutionCompleted.
 * The specialist keeps its own event history, its own retries and its own
 * Task Queue — so the team that owns it can deploy it independently.
 */
export function childWorkflowAsTool(options: ChildWorkflowAsToolOptions): Tool {
  return tool({
    name: options.name,
    description: options.description,
    parameters: z.object({
      question: z.string().describe('The full question for the specialist, in plain English.'),
    }),
    execute: async ({ question }) => {
      // TODO 9: Start the specialist with `wf.executeChild(options.workflow, …)`
      // and return its result. Pass `args: [{ question, model: options.model }]`,
      // a `workflowId` built from `options.name` and `wf.uuid4()` (never
      // `Math.random()` — Workflow code must replay identically), plus
      // `taskQueue` and `workflowExecutionTimeout` from `options`.
      throw new Error(`TODO 9: run ${options.workflow.name} as a Child Workflow (${question})`);
    },
  });
}
