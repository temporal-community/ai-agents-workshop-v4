# ABOUTME: The Python half of the cross-language contract — the Workflow the TypeScript orchestrator starts.
# Every name here has a byte-for-byte counterpart in ../src/challenge4-heterogeneous-agents/api.ts.

from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from temporalio import workflow
from temporalio.contrib.deepagents import create_temporal_deep_agent, tool_as_activity

# Imported at module scope with no workflow.unsafe.imports_passed_through() guard.
# DeepAgentsPlugin configures the Workflow sandbox to pass the LangChain import
# tree through, and worker.py adds this module and httpx to that list.
import travel_planner

# Must match PYTHON_TRAVEL_PLANNER_TASK_QUEUE in
# ../src/challenge4-heterogeneous-agents/api.ts.
TASK_QUEUE = "c4-python-travel-planner-tq"


# Plain dataclasses, not Pydantic: the default JSON payload converter maps them
# to and from the flat objects the TypeScript caller sends. The FIELD NAMES are
# the wire contract.
@dataclass
class AskRequest:
    question: str
    model: str = "gpt-4o"


@dataclass
class AskResponse:
    answer: str


@workflow.defn
class TravelPlannerAgentWorkflow:
    """Started by the TypeScript orchestrator as a Child Workflow.

    The class name is the Workflow type on the wire. TypeScript names it as a
    string in api.ts, because there is no Python code for it to import.
    """

    @workflow.run
    async def run(self, request: AskRequest) -> AskResponse:
        # The agent's control loop runs HERE, inside the Workflow, and replays
        # deterministically. Every LLM call and every I/O tool call leaves the
        # Workflow as an Activity, so a Worker crash costs one step rather than
        # the whole conversation.
        #
        # The model is named, not built: the Workflow ships only the string, and
        # the Worker's model_provider constructs the real client. Credentials
        # never enter Workflow inputs or Event History.
        agent = create_temporal_deep_agent(
            model=f"openai:{request.model}",
            system_prompt=travel_planner.SYSTEM_PROMPT,
            tools=[
                tool_as_activity(t, start_to_close_timeout=timedelta(seconds=30))
                for t in travel_planner.TOOLS
            ],
            activity_options={"start_to_close_timeout": timedelta(minutes=2)},
        )

        result = await agent.ainvoke(
            {"messages": [{"role": "user", "content": request.question}]}
        )
        return AskResponse(answer=result["messages"][-1].content)
