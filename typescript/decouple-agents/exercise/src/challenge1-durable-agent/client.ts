// ABOUTME: Challenge 1 starter — runs one weatherAgentWorkflow and prints the answer.

import { Client, Connection } from '@temporalio/client';
import { nanoid } from 'nanoid';
import { modelName } from '../shared/modelProvider';
import { openAIAgentsPlugin } from '../shared/workerOptions';
import { TASK_QUEUE, weatherAgentWorkflow } from './workflows';

async function run(): Promise<void> {
  const question = process.argv[2] ?? 'What is the weather in Barcelona?';

  const connection = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233' });

  // TODO 5: Register `openAIAgentsPlugin()` here too. On the Client the plugin
  // propagates the model Activity configuration and the agent trace context
  // into the Workflow through a Workflow start header — the Worker's copy
  // cannot do that for it.
  const client = new Client({ connection });

  const result = await client.workflow.execute(weatherAgentWorkflow, {
    taskQueue: TASK_QUEUE,
    workflowId: `c1-weather-agent-${nanoid()}`,
    args: [{ question, model: modelName() }],
  });

  console.log(result);
  await connection.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
