# ABOUTME: CLI starter for the webinar intro — submits a ToolsWorkflow and prints the result.

import asyncio
import sys
import uuid
from datetime import timedelta

from agents import trace
# Client: connects to the Temporal server to start, signal, and query workflows.
from temporalio.client import Client
from temporalio.contrib.openai_agents import (
    ModelActivityParameters,
    OpenAIAgentsPlugin,
)
from temporalio.envconfig import ClientConfig

from tools_workflow import ToolsWorkflow

TASK_QUEUE = "openai-agents-python-task-queue"


async def main() -> None:
    # Plugin that makes the OpenAI Agents SDK's LLM calls and tool calls run as Temporal activities automatically — no manual execute_activity calls needed.
    plugin = OpenAIAgentsPlugin(
        model_params=ModelActivityParameters(
            # Start-to-close timeout: max time Temporal allows one activity attempt to run.
            start_to_close_timeout=timedelta(seconds=60),
        )
    )

    config = ClientConfig.load_client_connect_config()
    config.setdefault("target_host", "localhost:7233")
    client = await Client.connect(**config, plugins=[plugin])

    query = (
        sys.argv[1]
        if len(sys.argv) > 1
        else "What is the weather in Tokyo?"
    )

    # Opening a trace here propagates a trace context to the workflow via the
    # plugin's interceptor. Without it, the workflow's executeWorkflow span
    # would be created with no parent trace and the Agents SDK would log
    # "No active trace" plus a 400 when exporting to OpenAI.
    with trace("ToolsWorkflow"):
        # Starts a new workflow execution and waits for its result.
        result = await client.execute_workflow(
            ToolsWorkflow.run,
            query,
            id=f"openai-agents-demo-{uuid.uuid4()}",
            # Task queue: the named queue a worker polls and a client targets to run this workflow/activity.
            task_queue=TASK_QUEUE,
        )
    print(f"Result: {result}")


if __name__ == "__main__":
    asyncio.run(main())
