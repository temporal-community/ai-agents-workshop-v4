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

    // Read this one rather than write it — it is the deployment boundary of
    // this challenge, in code.
    //
    // The specialist Worker polls its own Task Queue and carries its own
    // Activities. The orchestrator Worker above registers none of them: it
    // reaches the specialists only as Child Workflows, so the two can be built,
    // deployed and scaled by different teams. They share this process because
    // one terminal is easier than two, and for no other reason.
    //
    // Delete this Worker and nothing errors. Every Child Workflow is scheduled
    // onto a queue nobody polls, so it sits in `Running` forever and the client
    // hangs with no output — exactly what an unpolled Task Queue looks like in
    // production.
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
