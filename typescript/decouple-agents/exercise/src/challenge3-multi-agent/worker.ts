// ABOUTME: Challenge 3 Workers — one process, two Workers, two Task Queues.
// The split is the point: orchestrator and specialists are separately deployable.

import { NativeConnection, Worker } from '@temporalio/worker';
import * as weatherActivities from '../shared/weatherActivities';
import * as travelActivities from '../shared/travelActivities';
import { agentsBundlerOptions, openAIAgentsPlugin } from '../shared/workerOptions';
import { travelPlannerServiceHandler } from './handler';
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

    // TODO 12: Create a second Worker on `SPECIALIST_TASK_QUEUE` with the same
    // `workflowsPath`, `plugins` and `bundlerOptions`, plus
    // `activities: { ...weatherActivities, ...travelActivities }` and
    // `nexusServices: [travelPlannerServiceHandler]`. Then run both Workers with
    // `Promise.all`. The specialists are a separate deployment: their own queue,
    // their own Activities, their own Nexus endpoint target.
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
