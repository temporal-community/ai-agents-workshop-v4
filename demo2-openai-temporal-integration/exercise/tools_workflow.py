# ABOUTME: Workflow that runs an OpenAI Agents SDK Agent, with tools wired as Temporal activities.
# The agentic loop is driven by the Agents SDK; Temporal provides durable execution.

from __future__ import annotations

from datetime import timedelta

from temporalio import workflow
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


@workflow.defn
class ToolsWorkflow:
    @workflow.run
    async def run(self, question: str) -> str:
        # TODO: Construct an `Agent` (from the `agents` package) named "Agent",
        # with `instructions=SYSTEM_PROMPT` and `model="gpt-4o"`. Give it a
        # `tools=[...]` list built by wrapping each of the four tool activities
        # (get_ip_address, get_location_info, get_coordinates, get_weather)
        # with `activity_as_tool(fn, start_to_close_timeout=timedelta(seconds=30))`.
        raise NotImplementedError("TODO: construct the Agent with its tools")

        # TODO: With the Agent SDK, the entire agentic loop collapses into one
        # line: `result = await Runner.run(agent, input=question)`. Call it,
        # then return `result.final_output`.
