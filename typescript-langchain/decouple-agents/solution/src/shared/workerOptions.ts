// ABOUTME: Worker/Client wiring shared by all four challenges.
// Owns the OpenAIAgentsPlugin construction and the Workflow bundler tweak it needs.

import { OpenAIAgentsPlugin } from '@temporalio/openai-agents';
import type { WorkerOptions } from '@temporalio/worker';
import { createModelProvider } from './modelProvider';

type BundlerOptions = NonNullable<WorkerOptions['bundlerOptions']>;

/**
 * The plugin that makes the OpenAI Agents SDK durable.
 *
 * Registered on the Worker it installs the model Activity that every LLM call
 * is routed through; registered on the Client it propagates the run
 * configuration and trace context into the Workflow. Both sides need it.
 */
export function openAIAgentsPlugin(): OpenAIAgentsPlugin {
  return new OpenAIAgentsPlugin({
    modelProvider: createModelProvider(),
    // Regular Activities, not local ones: the point of the workshop is to see
    // each LLM call land in Workflow history as its own Activity.
    modelParams: { startToCloseTimeout: '2 minutes' },
  });
}

/**
 * The Agents SDK ships `browser`-conditioned ESM that webpack picks by default
 * when bundling Workflow code. Forcing `require` first gives the bundler the
 * CommonJS build the Workflow sandbox can actually load.
 */
export const agentsBundlerOptions: BundlerOptions = {
  webpackConfigHook: (config) => ({
    ...config,
    resolve: {
      ...config.resolve,
      conditionNames: ['require', 'browser', 'default'],
    },
  }),
};
