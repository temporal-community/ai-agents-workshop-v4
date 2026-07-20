import asyncio

from temporalio.client import Client
from temporalio.contrib.pydantic import pydantic_data_converter
from temporalio.envconfig import ClientConfig
from temporalio.worker import Worker

from activities import openai_responses, tool_invoker
from workflows.agent import AgentWorkflow


async def main():
    config = ClientConfig.load_client_connect_config()
    config.setdefault("target_host", "localhost:7233")
    # Client: connects to the Temporal server to start, signal, and query workflows.
    client = await Client.connect(
        **config,
        # Data converter: (de)serializes workflow/activity payloads — this one adds typed dataclass/pydantic support.
        data_converter=pydantic_data_converter,
    )

    # Worker: polls a task queue and executes the workflow/activity code registered here.
    worker = Worker(
        client,
        # Task queue: the named queue a worker polls and a client targets to run this workflow/activity.
        task_queue="tool-invoking-agent-python-task-queue",
        workflows=[AgentWorkflow],
        activities=[
            openai_responses.create,
            tool_invoker.dynamic_tool_activity,
        ],
    )
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
