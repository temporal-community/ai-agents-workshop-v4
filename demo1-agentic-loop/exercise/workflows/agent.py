from temporalio import workflow
from datetime import timedelta

import json

with workflow.unsafe.imports_passed_through():
    from tools import get_tools
    from helpers import tool_helpers
    from activities import openai_responses

@workflow.defn
class AgentWorkflow:
    @workflow.run
    async def run(self, input: str) -> str:

        input_list = [{"type": "message", "role": "user", "content": input}]

        # The agentic loop - the loop most frameworks hide from you.
        #
        # Call the LLM. Check if it wants a tool. Call the tool. Feed the
        # result back. Repeat until the model returns a final answer.
        #
        # TODO: Implement the loop below. On each iteration you need to:
        #
        #   1. Call the LLM as a Temporal activity. The LLM call talks to an
        #      external service and is non-deterministic, so it must run as
        #      an activity - never call it directly from workflow code.
        #      Use:
        #        llm_result = await workflow.execute_activity(
        #            openai_responses.create,
        #            openai_responses.OpenAIResponsesRequest(
        #                model="gpt-3.5-turbo",
        #                instructions=tool_helpers.HELPFUL_AGENT_SYSTEM_INSTRUCTIONS,
        #                input=input_list,
        #                tools=get_tools(),
        #            ),
        #            start_to_close_timeout=timedelta(seconds=60),
        #        )
        #
        #   2. Look at llm_result.output[0] (this simple example only ever
        #      produces one output item). The model either chose to call a
        #      tool (item.type == "function_call") or it produced a final
        #      message.
        #
        #   3. If it's a tool call: dispatch it with
        #      self._handle_function_call(item, llm_result, input_list),
        #      then append the tool's result back onto input_list as a
        #      {"type": "function_call_output", "call_id": item.call_id,
        #      "output": tool_output} entry so the model can see it on the
        #      next iteration. Then loop again (continue to the top of
        #      while True).
        #
        #   4. If it's not a tool call: log it and return
        #      llm_result.output_text - that's the final answer, and it
        #      ends the loop.
        while True:
            workflow.logger.info("=" * 80)

            raise NotImplementedError(
                "TODO: implement the agentic loop body - call the "
                "openai_responses.create activity, inspect "
                "llm_result.output[0] to see whether the model wants a "
                "tool (item.type == 'function_call') or is done, dispatch "
                "the tool call via self._handle_function_call(...) and "
                "append its output to input_list when a tool was chosen, "
                "and return llm_result.output_text once the model responds "
                "with a plain message."
            )


    async def _handle_function_call(self, item, llm_result, input_list):
        # serialize the LLM output - the decision the LLM made to call a tool
        i = llm_result.output[0]
        input_list += [
            i.model_dump() if hasattr(i, "model_dump") else i
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
