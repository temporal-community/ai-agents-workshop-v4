// ABOUTME: Challenge 3 starter — registers the Nexus endpoint, then runs one triage conversation.

import { Client, Connection } from '@temporalio/client';
import { nanoid } from 'nanoid';
import { modelName } from '../shared/modelProvider';
import { openAIAgentsPlugin } from '../shared/workerOptions';
import { TRAVEL_PLANNER_ENDPOINT } from './api';
import { ORCHESTRATOR_TASK_QUEUE, SPECIALIST_TASK_QUEUE, triageAgentWorkflow } from './workflows';

/**
 * An endpoint is server-side routing: a name the caller uses, resolved to a
 * Namespace and Task Queue. Creating it is an operator action — done here for
 * convenience, and equivalent to
 * `temporal operator nexus endpoint create --name ... --target-task-queue ...`.
 */
async function ensureEndpoint(connection: Connection, namespace: string): Promise<void> {
  try {
    await connection.operatorService.createNexusEndpoint({
      spec: {
        name: TRAVEL_PLANNER_ENDPOINT,
        target: { worker: { namespace, taskQueue: SPECIALIST_TASK_QUEUE } },
      },
    });
    console.log(`Created Nexus endpoint ${TRAVEL_PLANNER_ENDPOINT} -> ${SPECIALIST_TASK_QUEUE}`);
  } catch (err) {
    if (!String((err as { message?: string }).message).includes('already')) throw err;
  }
}

async function run(): Promise<void> {
  const question = process.argv[2] ?? "What's the weather in Monaco, and what should I know about visiting?";

  const connection = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233' });
  const namespace = process.env.TEMPORAL_NAMESPACE ?? 'default';
  await ensureEndpoint(connection, namespace);

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
