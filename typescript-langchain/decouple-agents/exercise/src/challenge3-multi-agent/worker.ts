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

    // The specialist Worker polls its own Task Queue and registers the
    // specialists' Activities. The orchestrator Worker above registers none of
    // them, because it reaches the specialists only as Child Workflows. That
    // boundary is what lets two teams deploy on their own schedules. Sharing
    // one process here only saves a terminal.
    //
    // Delete this Worker and nothing errors. Every Child Workflow is scheduled
    // onto a queue nobody polls, so it sits in `Running` and the client waits
    // with no output.
    const specialistWorker = await Worker.create({
      connection,
      taskQueue: SPECIALIST_TASK_QUEUE,
      workflowsPath: require.resolve('./workflows'),
      activities: { ...weatherActivities, ...travelActivities },
      plugins: [openAIAgentsPlugin()],
      bundlerOptions: agentsBundlerOptions,
    });

    // Both Workers run in this process, so both queues are polled at once.
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
