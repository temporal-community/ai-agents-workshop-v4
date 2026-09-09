# ABOUTME: The Python travel-planner Worker — the far side of the language boundary.
# It shares no code with the TypeScript orchestrator, only the contract in travel_planner_service.py.

import asyncio
import os

from temporalio.client import Client
from temporalio.contrib.deepagents import DeepAgentsPlugin
from temporalio.worker import Worker

from travel_planner_service import TASK_QUEUE, TravelPlannerAgentWorkflow


def build_model(model_name: str):
    """Turn the model NAME the Workflow shipped into a real client, Worker-side.

    This is the seam that points Deep Agents at the lab's OpenAI-compatible
    gateway instead of api.openai.com. The Workflow never sees the key, so no
    credential is written to Event History.
    """
    from langchain.chat_models import init_chat_model

    kwargs = {"api_key": os.environ["OPENAI_API_KEY"]}
    base_url = os.environ.get("OPENAI_BASE_URL")
    if base_url:
        kwargs["base_url"] = base_url
    return init_chat_model(model_name, **kwargs)


async def main() -> None:
    if not os.environ.get("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY is not set.")

    # A client-level plugin: the SDK propagates it to any Worker built from this
    # Client, so it is added on exactly one side.
    plugin = DeepAgentsPlugin(
        model_provider=build_model,
        # travel_planner imports httpx, which the default passthrough does not
        # cover. Without these the Workflow sandbox rejects the import.
        passthrough_modules=["travel_planner", "httpx"],
    )

    client = await Client.connect(
        os.environ.get("TEMPORAL_ADDRESS", "localhost:7233"),
        namespace=os.environ.get("TEMPORAL_NAMESPACE", "default"),
        plugins=[plugin],
    )

    # No activities= list: the plugin registers the deepagents.* Activities that
    # carry every model call and every tool_as_activity tool.
    worker = Worker(
        client,
        task_queue=TASK_QUEUE,
        workflows=[TravelPlannerAgentWorkflow],
    )

    print(f"Python travel-planner Worker polling {TASK_QUEUE}")
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
