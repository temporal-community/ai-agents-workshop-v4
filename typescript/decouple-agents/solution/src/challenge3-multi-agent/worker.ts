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

    // The specialist Worker owns the specialists' Activities and hosts the
    // Nexus Service handler. The endpoint the orchestrator addresses resolves
    // to this Task Queue.
    const specialistWorker = await Worker.create({
      connection,
      taskQueue: SPECIALIST_TASK_QUEUE,
      workflowsPath: require.resolve('./workflows'),
      activities: { ...weatherActivities, ...travelActivities },
      nexusServices: [travelPlannerServiceHandler],
      plugins: [openAIAgentsPlugin()],
      bundlerOptions: agentsBundlerOptions,
    });

    console.log(`Challenge 3 Workers polling ${ORCHESTRATOR_TASK_QUEUE} and ${SPECIALIST_TASK_QUEUE}`);
    await Promise.all([orchestratorWorker.run(), specialistWorker.run()]);
  } finally {
    await connection.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
