// ABOUTME: Challenge 3 Workers — one process, two Workers, two Task Queues.
// The split is the point: orchestrator and specialists are separately deployable.

import { NativeConnection, Worker } from '@temporalio/worker';
import * as weatherActivities from '../shared/weatherActivities';
import * as travelActivities from '../shared/travelActivities';
import { agentsBundlerOptions, openAIAgentsPlugin } from '../shared/workerOptions';
import { ORCHESTRATOR_TASK_QUEUE, SPECIALIST_TASK_QUEUE } from './workflows';

async function run(): Promise<void> {
  const connection = await NativeConnection.connect({ address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233' });

  try {
    const orchestratorWorker = await Worker.create({
      connection,
      taskQueue: ORCHESTRATOR_TASK_QUEUE,
      workflowsPath: require.resolve('./workflows'),
      plugins: [openAIAgentsPlugin()],
      bundlerOptions: agentsBundlerOptions,
    });

    // TODO 8: Create a second Worker on `SPECIALIST_TASK_QUEUE` with the same
    // `workflowsPath`, `plugins` and `bundlerOptions`, plus
    // `activities: { ...weatherActivities, ...travelActivities }`. Then run both
    // with `await Promise.all([orchestratorWorker.run(), specialistWorker.run()])`
    // in place of the single `.run()` below.
    //
    // The specialists are a separate deployment: their own queue, their own
    // Activities. With only the orchestrator running, every Child Workflow is
    // scheduled and never picked up — the lab hangs with no error, which is
    // exactly what an unpolled Task Queue looks like in production.
    console.log(`Challenge 3 Workers polling ${ORCHESTRATOR_TASK_QUEUE} and ${SPECIALIST_TASK_QUEUE}`);
    await orchestratorWorker.run();
  } finally {
    await connection.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
