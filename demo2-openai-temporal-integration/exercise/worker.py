# ABOUTME: Intro module worker — registers the ToolsWorkflow and tool activities.
# Uses the OpenAIAgentsPlugin so the Agents SDK can run durably inside the workflow.

import asyncio
from datetime import timedelta

# Client: connects to the Temporal server to start, signal, and query workflows.
from temporalio.client import Client
from temporalio.contrib.openai_agents import (
    ModelActivityParameters,
    OpenAIAgentsPlugin,
)
from temporalio.envconfig import ClientConfig
from temporalio.worker import Worker

from tool_activities import (
    get_coordinates,
    get_ip_address,
    get_location_info,
    get_weather,
)
from tools_workflow import ToolsWorkflow

TASK_QUEUE = "openai-agents-python-task-queue"


async def main() -> None:
    config = ClientConfig.load_client_connect_config()
    config.setdefault("target_host", "localhost:7233")

    # Plugin that makes the OpenAI Agents SDK's LLM calls and tool calls run as Temporal activities automatically — no manual execute_activity calls needed.
    plugin = OpenAIAgentsPlugin(
        model_params=ModelActivityParameters(
            # Start-to-close timeout: max time Temporal allows one activity attempt to run.
            start_to_close_timeout=timedelta(seconds=60),
        )
    )

    client = await Client.connect(**config, plugins=[plugin])

    # Worker: polls a task queue and executes the workflow/activity code registered here.
    worker = Worker(
        client,
        # Task queue: the named queue a worker polls and a client targets to run this workflow/activity.
        task_queue=TASK_QUEUE,
        workflows=[ToolsWorkflow],
        activities=[
            get_ip_address,
            get_location_info,
            get_coordinates,
            get_weather,
        ],
    )
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
