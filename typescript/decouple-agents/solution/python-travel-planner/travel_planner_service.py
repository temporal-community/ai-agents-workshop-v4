# ABOUTME: The Python half of the cross-language Nexus contract — service, workflow, activity, handler.
# Every name here has a byte-for-byte counterpart in ../src/challenge4-heterogeneous-agents/api.ts.

from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import timedelta

import nexusrpc
from nexusrpc.handler import service_handler
from temporalio import activity, nexus, workflow


# Plain dataclasses, not Pydantic: the default JSON payload converter maps them
# to and from the flat objects the TypeScript caller sends. The FIELD NAMES are
# the wire contract.
@dataclass
class AskRequest:
    question: str


@dataclass
class AskResponse:
    answer: str


@nexusrpc.service
class TravelPlannerService:
    """The contract. The class name is the service name on the wire.

    TypeScript declares the same pair in api.ts:
        nexus.service('TravelPlannerService', {
          askTravelPlanner: nexus.operation<AskRequest, AskResponse>({ name: 'ask_travel_planner' }),
        })
    """

    # The attribute name is the operation name on the wire.
    ask_travel_planner: nexusrpc.Operation[AskRequest, AskResponse]


@activity.defn
async def run_travel_planner(question: str) -> str:
    """Run the whole Strands agent loop inside one Activity.

    Strands has no Temporal integration, so durability here is coarse: Temporal
    retries the Activity if the Worker dies, but every LLM and tool call inside
    the loop re-runs. That is the trade-off for wrapping an agent nobody wrote
    with Temporal in mind — and it is still a great deal better than nothing.
    """
    # Imported lazily so the Strands dependency tree stays out of the Workflow
    # sandbox's import path.
    import travel_planner

    activity.logger.info("Travel planner question: %s", question)
    return await travel_planner.run(question)


@workflow.defn
class TravelPlannerAgentWorkflow:
    @workflow.run
    async def run(self, request: AskRequest) -> AskResponse:
        answer = await workflow.execute_activity(
            run_travel_planner,
            request.question,
            start_to_close_timeout=timedelta(minutes=5),
        )
        return AskResponse(answer=answer)


@service_handler(service=TravelPlannerService)
class TravelPlannerServiceHandler:
    @nexus.workflow_run_operation
    async def ask_travel_planner(
        self,
        ctx: nexus.WorkflowRunOperationContext,
        request: AskRequest,
    ) -> nexus.WorkflowHandle[AskResponse]:
        # This runs in the Worker process, outside any Workflow, so an ordinary
        # uuid4 is fine here.
        return await ctx.start_workflow(
            TravelPlannerAgentWorkflow.run,
            request,
            id=f"travel-planner-{uuid.uuid4()}",
        )
