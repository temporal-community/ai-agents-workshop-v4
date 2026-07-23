# ABOUTME: Personal-assistant team's Temporal wrapping of the third-party Strands travel planner.
# The Strands agent itself is unchanged — we just wrap its run() in a single activity.

from temporalio import activity


# Activity: a durable, retryable unit of non-deterministic work (I/O, API calls) — here it wraps an entire third-party agent loop as ONE opaque activity.
@activity.defn
async def ask_travel_planner(question: str) -> str:
    """Delegate a travel-planning question to the travel planner specialist.

    The travel planner can summarize destinations and look up country context
    (currency, languages, region, capital). Pass the full question as plain
    English.

    Args:
        question: The travel-planning question to answer.
    """
    # TODO: Uncomment the body below to lazy-import the Strands travel planner
    # and delegate the question to it. The lazy import keeps the heavy
    # Strands+boto3 dependency tree out of any workflow's
    # imports_passed_through resolution; it runs once in the activity thread
    # when the first activity of this type fires on a worker.
    #
    # import travel_planner
    #
    # activity.logger.info("Travel planner question: %s", question)
    # return await travel_planner.run(question)
