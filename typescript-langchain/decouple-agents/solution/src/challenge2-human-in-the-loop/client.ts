// ABOUTME: Challenge 2 starter — starts a trip request, then approves it from a human's keyboard.
// `--approve <workflowId>` releases a run that is already parked, from a fresh terminal.

import { Client, Connection, type WorkflowHandle } from '@temporalio/client';
import { nanoid } from 'nanoid';
import * as readline from 'node:readline/promises';
import { modelName } from '../shared/modelProvider';
import { openAIAgentsPlugin } from '../shared/workerOptions';
import { approveSignal, TASK_QUEUE, tripApprovalWorkflow } from './workflows';

async function approve(handle: WorkflowHandle): Promise<boolean> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log('\nThe agent may propose a booking. Until you answer, the Workflow is parked:');
    console.log('open http://localhost:8233 and note it is Running while no Worker holds it.\n');
    const reply = await rl.question('Approve the booking? [y/N] ');
    if (!reply.trim().toLowerCase().startsWith('y')) {
      console.log(`Not approved. The Workflow stays parked; release it later with:`);
      console.log(`  npm run c2:client -- --approve ${handle.workflowId}`);
      return false;
    }
  } finally {
    rl.close();
  }

  // A Signal, not an Update: the human is stating a fact, not asking a question,
  // and does not need to wait for the agent to finish reacting to it.
  await handle.signal(approveSignal);
  console.log('Approved. Resuming the agent run...');
  return true;
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const approveIndex = args.indexOf('--approve');
  const existingId = approveIndex >= 0 ? args[approveIndex + 1] : undefined;
  const question = args[0] && approveIndex < 0 ? args[0] : 'Book me a trip to Barcelona on 2026-09-15.';

  const connection = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS ?? 'localhost:7233' });
  const client = new Client({ connection, plugins: [openAIAgentsPlugin()] });

  const handle =
    existingId !== undefined
      ? client.workflow.getHandle<typeof tripApprovalWorkflow>(existingId)
      : await client.workflow.start(tripApprovalWorkflow, {
          taskQueue: TASK_QUEUE,
          workflowId: `c2-approval-${nanoid()}`,
          args: [{ question, model: modelName() }],
        });

  console.log(`Workflow: ${handle.workflowId}`);

  if (await approve(handle)) {
    console.log(await handle.result());
  }
  await connection.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
