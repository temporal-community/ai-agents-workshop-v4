// ABOUTME: Challenge 3 starter — runs one triage conversation against the orchestrator.

import { Client, Connection } from '@temporalio/client';
import { nanoid } from 'nanoid';
import { modelName } from '../shared/modelProvider';
import { openAIAgentsPlugin } from '../shared/workerOptions';
import { ORCHESTRATOR_TASK_QUEUE, triageAgentWorkflow } from './workflows';

async function run(): Promise<void> {
  const question = process.argv[2] ?? "What's the weather in Monaco, and what should I know about visiting?";

  const connection = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233' });
  const namespace = process.env.TEMPORAL_NAMESPACE ?? 'default';

  const client = new Client({ connection, namespace, plugins: [openAIAgentsPlugin()] });

  const result = await client.workflow.execute(triageAgentWorkflow, {
    taskQueue: ORCHESTRATOR_TASK_QUEUE,
    workflowId: `c3-triage-${nanoid()}`,
    args: [{ question, model: modelName() }],
  });

  console.log(result);
  await connection.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
