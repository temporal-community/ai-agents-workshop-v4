// ABOUTME: Challenge 2 starter — relays the agent's questions to a terminal and its answers back.
// Poll the Query for a pending question; deliver the answer with an Update.

import { Client, Connection, type WorkflowHandle } from '@temporalio/client';
import { nanoid } from 'nanoid';
import * as readline from 'node:readline/promises';
import { modelName } from '../shared/modelProvider';
import { openAIAgentsPlugin } from '../shared/workerOptions';
import { humanInTheLoopWorkflow, pendingQuestionQuery, provideUserInputUpdate, TASK_QUEUE } from './workflows';

const POLL_INTERVAL_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Poll for questions while the run is in flight.
 *
 * The Workflow may sit here for as long as the human takes. It is not running
 * during that time — closing this terminal and reconnecting later with
 * `--workflow-id <id>` picks the conversation up exactly where it stopped.
 */
async function converse(handle: WorkflowHandle<typeof humanInTheLoopWorkflow>): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const finished = handle.result();
  let done = false;
  finished.catch(() => undefined).finally(() => (done = true));

  try {
    console.log('Agent is working...');
    while (!done) {
      const question = await handle.query(pendingQuestionQuery).catch(() => null);
      if (question !== null) {
        const answer = await rl.question(`\nAgent asks: ${question}\nYour answer: `);
        // executeUpdate waits for the handler to run, so a rejected answer —
        // one the validator refuses — comes back as an error here rather than
        // disappearing the way a Signal would.
        await handle.executeUpdate(provideUserInputUpdate, { args: [answer] });
        console.log('Agent is working...');
      }
      await Promise.race([finished.catch(() => undefined), sleep(POLL_INTERVAL_MS)]);
    }
    return await finished;
  } finally {
    rl.close();
  }
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const reconnectIndex = args.indexOf('--workflow-id');
  const workflowId = reconnectIndex >= 0 ? args[reconnectIndex + 1] : undefined;
  const question = reconnectIndex >= 0 ? undefined : (args[0] ?? 'Should I pack a raincoat for the next race?');

  const connection = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233' });
  const client = new Client({ connection, plugins: [openAIAgentsPlugin()] });

  const handle =
    workflowId !== undefined
      ? client.workflow.getHandle<typeof humanInTheLoopWorkflow>(workflowId)
      : await client.workflow.start(humanInTheLoopWorkflow, {
          taskQueue: TASK_QUEUE,
          workflowId: `c2-hitl-${nanoid()}`,
          args: [{ question: question as string, model: modelName() }],
        });

  console.log(`Workflow: ${handle.workflowId}`);
  console.log(await converse(handle));
  await connection.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
