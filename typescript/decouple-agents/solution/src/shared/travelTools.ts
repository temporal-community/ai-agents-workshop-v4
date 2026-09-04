// ABOUTME: The travel Activities, presented to the model as OpenAI Agents SDK tools.
// Used by the TypeScript travel specialist in challenge 3; challenge 4 replaces it with Python.

import { activityAsTool } from '@temporalio/openai-agents/workflow';
import type { Tool } from '@openai/agents-core';
import type * as activities from './travelActivities';

export function travelTools(): Tool[] {
  const startToCloseTimeout = '30 seconds';

  return [
    activityAsTool<typeof activities.getWikipediaSummary>(
      {
        name: 'getWikipediaSummary',
        description: 'Get a Wikipedia summary for a city, country, region, circuit or landmark.',
        parameters: {
          type: 'object',
          properties: {
            topic: { type: 'string', description: 'Article title, e.g. "Monaco" or "Suzuka Circuit"' },
          },
          required: ['topic'],
          additionalProperties: false,
        },
      },
      { startToCloseTimeout },
    ),
    activityAsTool<typeof activities.getCountryInfo>(
      {
        name: 'getCountryInfo',
        description: 'Get country background: capital, currencies, languages, region and timezones.',
        parameters: {
          type: 'object',
          properties: { country: { type: 'string', description: 'Country name, e.g. "Japan"' } },
          required: ['country'],
          additionalProperties: false,
        },
      },
      { startToCloseTimeout },
    ),
  ];
}
