The files in this directory are not part of the agent implementation. Instead,
they represent tools made available to the agent at runtime, similar to
registering MCP tools with an agent client. This sample keeps its tool registry
in these files and loads the tools defined when the agent starts.

The tools, however, are completely abstracted away from the agent.

Note that the agentic loop calls an activity by the name of the tool selected by the LLM and this
activity invocation is handled by the tool_invoker dynamic activity.

To add or swap tools, edit `tools/__init__.py` to register handlers and OpenAI tool schemas.
