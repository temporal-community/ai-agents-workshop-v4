// ABOUTME: The weather Activities, presented to the model as OpenAI Agents SDK tools.
// Imported by Workflow code only — activityAsTool schedules Activities, it does not import them.

import { activityAsTool } from '@temporalio/openai-agents/workflow';
import type { Tool } from '@openai/agents-core';
import type * as activities from './weatherActivities';

/**
 * `activityAsTool` gives the model a tool whose implementation is a Temporal
 * Activity. Each call the model makes becomes a ScheduleActivityTask in the
 * calling Workflow's history: independently retried, and replayed from history
 * rather than re-executed.
 *
 * Note the Activity module is imported `as type` only. The Workflow never runs
 * the Activity code; it schedules the Activity by name, and the Worker runs it.
 */
export function weatherTools(): Tool[] {
  const startToCloseTimeout = '30 seconds';

  return [
    activityAsTool<typeof activities.getIpAddress>(
      {
        name: 'getIpAddress',
        description: "Get the public IP address of the machine running the agent. Use it to work out where 'here' is.",
        parameters: { type: 'object', properties: {}, required: [], additionalProperties: false },
      },
      { startToCloseTimeout },
    ),
    activityAsTool<typeof activities.getLocationInfo>(
      {
        name: 'getLocationInfo',
        description: 'Get city, region, country, latitude and longitude for an IP address.',
        parameters: {
          type: 'object',
          properties: { ipAddress: { type: 'string', description: 'An IPv4 or IPv6 address' } },
          required: ['ipAddress'],
          additionalProperties: false,
        },
      },
      { startToCloseTimeout },
    ),
    // TODO 2: The agent can find out where the caller is, but it cannot answer a
    // weather question yet. Wrap the two remaining Activities the same way:
    //   - `getCoordinates` — parameter `city` (string)
    //   - `getWeather`     — parameters `latitude` and `longitude` (numbers)
    // The `parameters` schema is what the model sees, so describe each field.
  ];
}
