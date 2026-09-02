// ABOUTME: Challenge 1 Worker — hosts the agent Workflow and the four weather Activities.
// Registering OpenAIAgentsPlugin here is what turns the SDK's model calls into Activities.

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
      // The plugin registers the model Activity that TemporalOpenAIRunner
      // dispatches to, and installs the interceptors that carry agent trace
      // context through Temporal.
      plugins: [openAIAgentsPlugin()],
      bundlerOptions: agentsBundlerOptions,
    });

    console.log(`Challenge 1 Worker polling ${TASK_QUEUE}`);
    await worker.run();
  } finally {
    await connection.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
