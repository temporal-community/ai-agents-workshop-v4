// ABOUTME: Challenge 2 Worker — same wiring as challenge 1; the human-in-the-loop state lives in the Workflow.
// Nothing extra is registered for the pause: askUser is an inline tool, not an Activity.

import { NativeConnection, Worker } from '@temporalio/worker';
import * as activities from '../shared/weatherActivities';
import { agentsBundlerOptions, openAIAgentsPlugin } from '../shared/workerOptions';
import { TASK_QUEUE } from './workflows';

async function run(): Promise<void> {
  const connection = await NativeConnection.connect({ address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233' });

  try {
    const worker = await Worker.create({
      connection,
      taskQueue: TASK_QUEUE,
      workflowsPath: require.resolve('./workflows'),
      activities,
      plugins: [openAIAgentsPlugin()],
      bundlerOptions: agentsBundlerOptions,
    });

    console.log(`Challenge 2 Worker polling ${TASK_QUEUE}`);
    await worker.run();
  } finally {
    await connection.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
