// ABOUTME: The travel specialist's Nexus Operation handler — the callee side of the contract.
// Registered on the specialist Worker; challenge 4 replaces this whole file with a Python Worker.

import * as nexus from 'nexus-rpc';
import * as temporalNexus from '@temporalio/nexus';
import { nanoid } from 'nanoid';
import { travelPlannerService, type AskRequest, type AskResponse } from './api';
import { travelSpecialistWorkflow } from './workflows';

export const travelPlannerServiceHandler = nexus.serviceHandler(travelPlannerService, {
  // TODO 10: Replace this stub with
  // `new temporalNexus.WorkflowRunOperationHandler<AskRequest, AskResponse>(...)`
  // whose delegate calls `temporalNexus.startWorkflow(ctx, travelSpecialistWorkflow, …)`
  // with `args: [{ question: input.question, model: process.env.OPENAI_MODEL }]`
  // and a `workflowId` of `travel-specialist-${nanoid()}`.
  // A Workflow-run Operation completes when the Workflow it started completes,
  // however long that takes; the caller sees one NexusOperationScheduled /
  // NexusOperationCompleted pair. This delegate runs in the Worker process, not
  // a Workflow sandbox, so it may read the environment and use nanoid.
  askTravelPlanner: async (_ctx, _input: AskRequest): Promise<AskResponse> => {
    throw new Error('TODO 10: start travelSpecialistWorkflow from this Nexus Operation.');
  },
});
