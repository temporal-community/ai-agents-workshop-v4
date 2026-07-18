# ABOUTME: Personal-assistant team's Temporal wrapping of the third-party Strands travel planner.
# The Strands agent itself is unchanged — we just wrap its run() in a single activity.

from temporalio import activity


@activity.defn
async def ask_travel_planner(question: str) -> str:
    """Delegate a travel-planning question to the travel planner specialist.

    The travel planner can summarize destinations and look up country context
    (currency, languages, region, capital). Pass the full question as plain
    English.

    Args:
        question: The travel-planning question to answer.
    """
    # TODO: Write a single `@activity.defn` wrapper. It should lazy-import
    # `travel_planner` (keeps the heavy Strands+boto3 dependency tree out of
    # any workflow's imports_passed_through resolution) and call `run()` on
    # it, returning the result. About 10 lines.
    raise NotImplementedError("TODO: lazy-import travel_planner and call run()")
