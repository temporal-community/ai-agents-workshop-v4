# ABOUTME: Personal assistant orchestrator — delegates to two specialist sub-agents.
# Weather agent invoked via Temporal child workflow; F1 expert via Nexus.

from __future__ import annotations

from datetime import timedelta

from temporalio import workflow
from temporalio.contrib.openai_agents.workflow import nexus_operation_as_tool

with workflow.unsafe.imports_passed_through():
    import annotated_types  # noqa: F401
    import pydantic_core  # noqa: F401
    import pydantic_core.core_schema  # noqa: F401

    from agents import Agent, Runner

    from child_workflow_tool import child_workflow_as_tool
    from f1_expert_agent import F1ExpertService
    from weather_agent import WeatherAgentWorkflow


SYSTEM_PROMPT = """
You are a helpful personal assistant. You have two specialist sub-agents
available as tools:

- ask_weather_agent: a weather forecasting specialist with access to
  geocoding and current-weather tools. Use it for any weather question.
- ask_f1_expert: a Formula 1 expert with access to F1 race schedules,
  results, driver and constructor standings, and circuit telemetry. Use
  it for any F1 question.

For questions that span both domains (e.g. "what's the weather at the
next F1 race?"), call both specialists and combine their answers.

When you have enough information, give the user a concise final answer
in plain text. Today's date is {date}.
"""


@workflow.defn
class PersonalAssistantWorkflow:
    @workflow.run
    async def run(self, question: str) -> str:
        today = workflow.now().strftime("%Y-%m-%d")

        # TODO: Build the weather tool with `child_workflow_as_tool` for
        # WeatherAgentWorkflow.run, named "ask_weather_agent", running on
        # task_queue="weather-agent-tq" with a reasonable execution_timeout.
        # See personal_assistant.py — "the orchestrator. Uses
        # `child_workflow_as_tool` for weather and `nexus_operation_as_tool`
        # for F1."
        weather_tool = None

        # TODO: Build the F1 tool with `nexus_operation_as_tool` for
        # F1ExpertService.ask_f1_expert, service=F1ExpertService,
        # endpoint="f1-expert", with a reasonable schedule_to_close_timeout.
        # Don't forget to set f1_tool.description — the contrib helper has
        # no description hook, so the LLM needs it set directly on the
        # FunctionTool to know when to choose this tool.
        f1_tool = None

        agent = Agent(
            name="PersonalAssistant",
            instructions=SYSTEM_PROMPT.format(date=today),
            model="gpt-4o",
            tools=[weather_tool, f1_tool],
        )
        result = await Runner.run(agent, input=question)
        return result.final_output
