// ABOUTME: Challenge 4 Workers — orchestrator plus the TypeScript weather specialist.
// No travel Activities and no Nexus handler here: that specialist is a separate Python Worker.

import { NativeConnection, Worker } from '@temporalio/worker';
import * as weatherActivities from '../shared/weatherActivities';
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

    const specialistWorker = await Worker.create({
      connection,
      taskQueue: SPECIALIST_TASK_QUEUE,
      workflowsPath: require.resolve('./workflows'),
      activities: weatherActivities,
      plugins: [openAIAgentsPlugin()],
      bundlerOptions: agentsBundlerOptions,
    });

    console.log(`Challenge 4 Workers polling ${ORCHESTRATOR_TASK_QUEUE} and ${SPECIALIST_TASK_QUEUE}`);
    console.log('The travel specialist runs in python-travel-planner/ — start it separately.');
    await Promise.all([orchestratorWorker.run(), specialistWorker.run()]);
  } finally {
    await connection.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
