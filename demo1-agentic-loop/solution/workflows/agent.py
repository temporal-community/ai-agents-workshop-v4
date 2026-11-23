from temporalio import workflow
from datetime import timedelta

import json

# Marks these imports as side-effect-free so the workflow sandbox allows them without re-validating determinism.
with workflow.unsafe.imports_passed_through():
    from tools import get_tools
    from helpers import tool_helpers
    from activities import openai_responses

# Workflow: durable, replayable orchestration logic.
@workflow.defn
class AgentWorkflow:
    # Entry point Temporal calls to start the workflow.
    @workflow.run
    async def run(self, input: str) -> str:

        input_list = [{"type": "message", "role": "user", "content": input}]

        # The agentic loop
        while True:
            workflow.logger.info("=" * 80)

            # consult the LLM
            # Activity: a durable, retryable unit of non-deterministic work (I/O, API calls).
            llm_result = await workflow.execute_activity(
                openai_responses.create,
                openai_responses.OpenAIResponsesRequest(
                    model="gpt-5.6-terra",
                    instructions=tool_helpers.HELPFUL_AGENT_SYSTEM_INSTRUCTIONS,
                    input=input_list,
                    tools=get_tools(),
                ),
                # Start-to-close timeout: max time Temporal allows one activity attempt to run.
                start_to_close_timeout=timedelta(seconds=60),
            )

            # For this simple example, the model either chooses a single function
            # call or responds with a message. Reasoning models may put a reasoning
            # item ahead of that decision, so skip it.
            item = next(o for o in llm_result.output if o.type != "reasoning")

            # if the result is a tool call, call the tool
            if item.type == "function_call":
                tool_output = await self._handle_function_call(item, llm_result, input_list)

                # add the tool call result to the input list for context
                input_list.append({
                    "type": "function_call_output",
                    "call_id": item.call_id,
                    "output": tool_output,
                })

            # if the result is not a tool call we will just respond with a message
            else:
                workflow.logger.info(
                    "No tools chosen, responding with a message: %s",
                    llm_result.output_text,
                )
                return llm_result.output_text


    async def _handle_function_call(self, item, llm_result, input_list):
        # serialize the LLM output - the decision the LLM made to call a tool
        input_list += [
            item.model_dump() if hasattr(item, "model_dump") else item
        ]
        # execute dynamic activity with the tool name chosen by the LLM
        # and the arguments crafted by the LLM
        args = json.loads(item.arguments) if isinstance(item.arguments, str) else item.arguments

        tool_output = await workflow.execute_activity(
            item.name,
            args,
            start_to_close_timeout=timedelta(seconds=30),
        )

        workflow.logger.info("Made a tool call to %s", item.name)

        return tool_output
 