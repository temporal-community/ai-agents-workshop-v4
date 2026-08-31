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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set. The lab injects it at runtime; export it before starting.');
  }

  // Optional: when unset the provider talks to api.openai.com.
  const baseURL = process.env.OPENAI_BASE_URL;

  return new OpenAIProvider({
    apiKey,
    baseURL,
    // Chat Completions is the lowest common denominator across
    // OpenAI-compatible gateways; the Responses API is not.
    useResponses: false,
  });
}
