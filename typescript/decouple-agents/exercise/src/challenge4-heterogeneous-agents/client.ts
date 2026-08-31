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
    // TODO 15: Call `connection.operatorService.createNexusEndpoint({ spec: {
    //   name: TRAVEL_PLANNER_ENDPOINT,
    //   target: { worker: { namespace, taskQueue: PYTHON_TRAVEL_PLANNER_TASK_QUEUE } },
    // } })`.
    // This one line is the entire language boundary: the endpoint the Workflow
    // addresses now resolves to the Task Queue the Python Worker polls. No
    // Workflow code changes.
    console.log(`TODO 15: point ${TRAVEL_PLANNER_ENDPOINT} at ${PYTHON_TRAVEL_PLANNER_TASK_QUEUE}`);
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
