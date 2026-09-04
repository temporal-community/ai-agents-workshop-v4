// ABOUTME: Builds the OpenAI-compatible ModelProvider from environment variables.
// Runs in Worker and Client processes only — never inside the Workflow sandbox.

import { OpenAIProvider } from '@openai/agents-openai';
import type { ModelProvider } from '@openai/agents-core';

/**
 * Model name the client stamps onto each request.
 *
 * Read here (in a plain Node process) rather than in Workflow code: the
 * Workflow sandbox has no environment.
 */
export function modelName(): string {
  return process.env.OPENAI_MODEL ?? 'gpt-4o';
}

/**
 * Construct the ModelProvider the OpenAI Agents plugin hands to the model
 * Activity.
 *
 * Credentials come from the environment and nothing else — the lab injects
 * them at runtime through an OpenAI-compatible broker, so never hardcode a key
 * and never commit one.
 */
export function createModelProvider(): ModelProvider {
  // TODO 1: Return `new OpenAIProvider({ apiKey, baseURL, useResponses: false })`
  // built from `process.env.OPENAI_API_KEY` and the optional
  // `process.env.OPENAI_BASE_URL`, throwing if the key is missing.
  // Read them here and nowhere else: a hardcoded key would be committed, and
  // the lab injects a different one at runtime. `useResponses: false` keeps the
  // provider on Chat Completions, which every OpenAI-compatible gateway speaks.
  throw new Error('TODO 1: build the OpenAIProvider from the environment.');
}
