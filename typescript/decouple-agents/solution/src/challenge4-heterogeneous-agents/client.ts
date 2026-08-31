// ABOUTME: Challenge 4 starter — points the Nexus endpoint at the Python Worker, then asks one question.

import { Client, Connection } from '@temporalio/client';
import { nanoid } from 'nanoid';
import { modelName } from '../shared/modelProvider';
import { openAIAgentsPlugin } from '../shared/workerOptions';
import { PYTHON_TRAVEL_PLANNER_TASK_QUEUE, TRAVEL_PLANNER_ENDPOINT } from './api';
import { ORCHESTRATOR_TASK_QUEUE, triageAgentWorkflow } from './workflows';

/**
 * The only place the language boundary is visible: the endpoint targets the
 * Task Queue the Python Worker polls. Nothing in the Workflow code changes.
 */
async function ensureEndpoint(connection: Connection, namespace: string): Promise<void> {
  try {
    await connection.operatorService.createNexusEndpoint({
      spec: {
        name: TRAVEL_PLANNER_ENDPOINT,
        target: { worker: { namespace, taskQueue: PYTHON_TRAVEL_PLANNER_TASK_QUEUE } },
      },
    });
    console.log(`Created Nexus endpoint ${TRAVEL_PLANNER_ENDPOINT} -> ${PYTHON_TRAVEL_PLANNER_TASK_QUEUE} (Python)`);
  } catch (err) {
    if (!String((err as { message?: string }).message).includes('already')) throw err;
  }
}

async function run(): Promise<void> {
  const question = process.argv[2] ?? 'What should I know about visiting Monaco, and what is the weather there?';

  const connection = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233' });
  const namespace = process.env.TEMPORAL_NAMESPACE ?? 'default';
  await ensureEndpoint(connection, namespace);

  const client = new Client({ connection, namespace, plugins: [openAIAgentsPlugin()] });

  const result = await client.workflow.execute(triageAgentWorkflow, {
    taskQueue: ORCHESTRATOR_TASK_QUEUE,
    workflowId: `c4-triage-${nanoid()}`,
    args: [{ question, model: modelName() }],
  });

  console.log(result);
  await connection.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
