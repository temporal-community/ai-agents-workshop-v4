# ABOUTME: HITL workflow — combines weather activity-tools, F1 MCP tools, and an inline ask_user tool.
# ask_user runs inside the workflow (not as an activity) so it can await workflow.wait_condition.

from __future__ import annotations

from datetime import timedelta

from temporalio import workflow
from temporalio.contrib.openai_agents.workflow import (
    activity_as_tool,
    stateless_mcp_server,
)

with workflow.unsafe.imports_passed_through():
    # Pre-import pydantic internals so the sandbox snapshots them before the
    # first workflow task — avoids "Module X imported after initial workflow
    # load" warnings once the Agents SDK constructs its pydantic models.
    import annotated_types  # noqa: F401
    import pydantic_core  # noqa: F401
    import pydantic_core.core_schema  # noqa: F401

    from agents import Agent, Runner, function_tool

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
If the user's request is ambiguous or you need more information, use the ask_user tool to ask them a question.
When you have enough information to fully answer, provide your final response as plain text.
Today's date is {date}.
"""


# Workflow: durable, replayable orchestration logic.
@workflow.defn
class AgentWorkflow:
    def __init__(self) -> None:
        # HITL state — mutated by the ask_user tool and the signal handler.
        self._input_needed: bool = False
        self._question: str = ""
        self._user_input: str = ""

    # Entry point Temporal calls to start the workflow.
    @workflow.run
    async def run(self, question: str) -> str:
        today = workflow.now().strftime("%Y-%m-%d")

        # Inline tool: captures `self`, sets workflow state, and awaits
        # workflow.wait_condition — so it must run in the workflow loop,
        # not in an activity. @function_tool awaits async functions in the
        # caller's context, so Runner.run will invoke this right here.
        @function_tool
        async def ask_user(question_text: str) -> str:
            """Ask the user a question when you need clarification or more information.

            Args:
                question_text: The question to ask the user.
            """
            # TODO: ask_user sets workflow state and awaits wait_condition.
            # The workflow is suspended - durably - holding no threads, no
            # memory.
            #
            # 1. Set self._question = question_text
            # 2. Set self._input_needed = True
            # 3. await workflow.wait_condition(lambda: not self._input_needed)
            # 4. Read the answer back from self._user_input
            # 5. Reset self._question and self._user_input so subsequent
            #    ask_user calls start clean, then return the answer.
            raise NotImplementedError("TODO: implement ask_user's wait/signal choreography")

        f1 = stateless_mcp_server(name="f1-data", cache_tools_list=True)

        agent = Agent(
            name="Agent",
            instructions=SYSTEM_PROMPT.format(date=today),
            model="gpt-4o",
            mcp_servers=[f1],
            tools=[
                # Wraps a Temporal activity as an agent-SDK tool call, so every tool invocation becomes a durable, retryable Temporal activity.
                # Start-to-close timeout: max time Temporal allows one activity attempt to run.
                activity_as_tool(
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
                ask_user,
            ],
        )

        result = await Runner.run(agent, input=question)
        return result.final_output

    # Signal: an async message that can wake a suspended workflow and mutate its state.
    @workflow.signal
    def provide_user_input(self, user_input: str) -> None:
        """Deliver the user's response to a pending ask_user call."""
        # TODO: provide_user_input is a signal. It delivers your answer and
        # unblocks the wait_condition.
        #
        # 1. Set self._user_input = user_input
        # 2. Set self._input_needed = False
        raise NotImplementedError("TODO: implement provide_user_input signal handler")

    # Query: a read-only, side-effect-free snapshot of workflow state; doesn't append to history.
    @workflow.query
    def is_input_needed(self) -> bool:
        return self._input_needed

    @workflow.query
    def get_pending_question(self) -> str:
        return self._question
