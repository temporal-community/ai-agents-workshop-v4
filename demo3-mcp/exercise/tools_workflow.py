# ABOUTME: Workflow that combines weather activity-tools with an F1 MCP server.
# The agentic loop is driven by the Agents SDK; Temporal makes both tool paths durable.

from __future__ import annotations

from datetime import timedelta

from temporalio import workflow
from temporalio.contrib.openai_agents.workflow import (
    activity_as_tool,
    stateless_mcp_server,
)

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
You have access to weather tools (geocoding, current weather) and Formula 1 race data tools (schedules, results, standings).
When you have enough information to fully answer, provide your final response as plain text.
Today's date is {date}.
"""


# Workflow: durable, replayable orchestration logic.
@workflow.defn
class AgentWorkflow:
    # Entry point Temporal calls to start the workflow.
    @workflow.run
    async def run(self, question: str) -> str:
        # workflow.now() is deterministic under replay, unlike datetime.now().
        today = workflow.now().strftime("%Y-%m-%d")

        agent = Agent(
            name="Agent",
            instructions=SYSTEM_PROMPT.format(date=today),
            model="gpt-4o",
            # TODO: Hand the agent the F1 MCP server registered on the worker,
            # so each MCP tool call becomes its own durable, retryable Temporal
            # activity. Exactly one of the three lines marked (A) / (B) / (C)
            # is correct - two are here, the third is inside the tools list
            # below. Uncomment only the correct one.
            #
            # The name is how the workflow looks up a provider the worker
            # registered; check what the worker calls it. Pick wrong and the
            # workflow will not complete - the Worker terminal names the mistake.
            #
            # --- (A) ---
            # mcp_servers=[stateless_mcp_server(name="f1-data", cache_tools_list=True)],
            #
            # --- (B) ---
            # mcp_servers=[stateless_mcp_server(name="f1", cache_tools_list=True)],
            tools=[
                # --- (C) ---
                # stateless_mcp_server(name="f1-data", cache_tools_list=True),

                # Wraps a Temporal activity as an agent-SDK tool call, so every tool invocation becomes a durable, retryable Temporal activity.
                activity_as_tool(
                    # Start-to-close timeout: max time Temporal allows one activity attempt to run.
                    get_ip_address, start_to_close_timeout=timedelta(seconds=30)
                ),
                activity_as_tool(
                    get_location_info, start_to_close_timeout=timedelta(seconds=30)
                ),
                activity_as_tool(
                    get_coordinates, start_to_close_timeout=timedelta(seconds=30)
                ),
                activity_as_tool(
                    get_weather, start_to_close_timeout=timedelta(seconds=30)
                ),
            ],
        )

        result = await Runner.run(agent, input=question)
        return result.final_output
