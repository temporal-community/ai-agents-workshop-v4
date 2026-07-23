# ABOUTME: Workflow that runs an OpenAI Agents SDK Agent, with tools wired as Temporal activities.
# The agentic loop is driven by the Agents SDK; Temporal provides durable execution.

from __future__ import annotations

from datetime import timedelta

from temporalio import workflow
# Wraps a Temporal activity as an agent-SDK tool call, so every tool invocation becomes a durable, retryable Temporal activity.
from temporalio.contrib.openai_agents.workflow import activity_as_tool

with workflow.unsafe.imports_passed_through():
    # Pre-import pydantic internals so the sandbox snapshots them before the
    # first workflow task. Without this, the Agents SDK's pydantic models get
    # loaded lazily on first Agent(...) construction, and the sandbox logs
    # "Module X was imported after initial workflow load" warnings.
    import annotated_types  # noqa: F401
    import pydantic_core  # noqa: F401
    import pydantic_core.core_schema  # noqa: F401

    from agents import Agent, Runner

    from tool_activities import (
        get_coordinates,
        get_ip_address,
        get_location_info,
        get_weather,
    )


SYSTEM_PROMPT = """
You are a helpful assistant. Use the provided tools to help accomplish the user's goal.
Always use tools when they would help answer the question accurately.
When you have enough information to fully answer, provide your final response as plain text.
"""


# Workflow: durable, replayable orchestration logic.
@workflow.defn
class ToolsWorkflow:
    # Entry point Temporal calls to start the workflow.
    @workflow.run
    async def run(self, question: str) -> str:
        # TODO: Uncomment the block below to build the Agent and run it.
        # It constructs an Agent whose four tools are Temporal activities wrapped
        # by activity_as_tool, then hands control to the SDK: Runner.run drives
        # the entire agentic loop in one line and returns the final answer.
        # Delete the `pass` placeholder once you uncomment.
        pass

        # agent = Agent(
        #     name="Agent",
        #     instructions=SYSTEM_PROMPT,
        #     model="gpt-4o",
        #     tools=[
        #         activity_as_tool(
        #             get_ip_address, start_to_close_timeout=timedelta(seconds=30)
        #         ),
        #         activity_as_tool(
        #             get_location_info, start_to_close_timeout=timedelta(seconds=30)
        #         ),
        #         activity_as_tool(
        #             get_coordinates, start_to_close_timeout=timedelta(seconds=30)
        #         ),
        #         activity_as_tool(
        #             get_weather, start_to_close_timeout=timedelta(seconds=30)
        #         ),
        #     ],
        # )
        #
        # result = await Runner.run(agent, input=question)
        # return result.final_output
