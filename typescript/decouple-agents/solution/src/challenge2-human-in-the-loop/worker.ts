// ABOUTME: Challenge 2 Worker — the weather Activities plus the approval-gated bookTrip Activity.
// Nothing here knows about the pause: the approval mechanism lives entirely in the Workflow.

import { NativeConnection, Worker } from '@temporalio/worker';
import * as weatherActivities from '../shared/weatherActivities';
import { agentsBundlerOptions, openAIAgentsPlugin } from '../shared/workerOptions';
import * as bookingActivities from './activities';
import { TASK_QUEUE } from './workflows';

async function run(): Promise<void> {
  const connection = await NativeConnection.connect({ address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233' });

  try {
    const worker = await Worker.create({
      connection,
      taskQueue: TASK_QUEUE,
      workflowsPath: require.resolve('./workflows'),
      activities: { ...weatherActivities, ...bookingActivities },
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
