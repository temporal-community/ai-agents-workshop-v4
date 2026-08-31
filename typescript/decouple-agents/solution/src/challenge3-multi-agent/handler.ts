// ABOUTME: The travel specialist's Nexus Operation handler — the callee side of the contract.
// Registered on the specialist Worker; challenge 4 replaces this whole file with a Python Worker.

import * as nexus from 'nexus-rpc';
import * as temporalNexus from '@temporalio/nexus';
import { nanoid } from 'nanoid';
import { travelPlannerService, type AskRequest, type AskResponse } from './api';
import { travelSpecialistWorkflow } from './workflows';

export const travelPlannerServiceHandler = nexus.serviceHandler(travelPlannerService, {
  /**
   * A Workflow-run Operation: the Operation completes when the Workflow it
   * started completes, however long that takes. The caller's Workflow sees one
   * NexusOperationScheduled / NexusOperationCompleted pair.
   */
  askTravelPlanner: new temporalNexus.WorkflowRunOperationHandler<AskRequest, AskResponse>(
    async (ctx, input: AskRequest) =>
      await temporalNexus.startWorkflow(ctx, travelSpecialistWorkflow, {
        // The specialist team owns its own model choice. This code runs in the
        // Worker process, not the Workflow sandbox, so it may read the
        // environment.
        args: [{ question: input.question, model: process.env.OPENAI_MODEL }],
        workflowId: `travel-specialist-${nanoid()}`,
        // Task Queue defaults to the one this Operation was handled on.
      }),
  ),
});
