# ABOUTME: The Python travel-planner Worker — the far side of the Nexus boundary.
# It shares no code with the TypeScript orchestrator, only the contract in travel_planner_service.py.

import asyncio
import os

from temporalio.client import Client
from temporalio.worker import Worker

from travel_planner_service import (
    TravelPlannerAgentWorkflow,
    TravelPlannerServiceHandler,
    run_travel_planner,
)

# Must match PYTHON_TRAVEL_PLANNER_TASK_QUEUE in
# ../src/challenge4-heterogeneous-agents/api.ts — the endpoint the TypeScript
# client creates routes to this queue.
TASK_QUEUE = "c4-python-travel-planner-tq"


async def main() -> None:
    if not os.environ.get("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is not set.")

    client = await Client.connect(
        os.environ.get("TEMPORAL_ADDRESS", "localhost:7233"),
        namespace=os.environ.get("TEMPORAL_NAMESPACE", "default"),
    )

    worker = Worker(
        client,
        task_queue=TASK_QUEUE,
        workflows=[TravelPlannerAgentWorkflow],
        activities=[run_travel_planner],
        nexus_service_handlers=[TravelPlannerServiceHandler()],
    )

    print(f"Python travel-planner Worker polling {TASK_QUEUE}")
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
