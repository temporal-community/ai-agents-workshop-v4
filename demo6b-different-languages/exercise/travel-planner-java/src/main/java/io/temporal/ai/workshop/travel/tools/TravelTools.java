// ABOUTME: Travel-planner tools as a dual-annotated interface (Temporal activity + Spring AI tool).
// The @Tool/@ToolParam metadata is what the model sees; @ActivityInterface makes each call durable.
package io.temporal.ai.workshop.travel.tools;

import io.temporal.activity.ActivityInterface;
import io.temporal.activity.ActivityMethod;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;

// Activity: a durable, retryable unit of non-deterministic work (I/O, API calls) — here, one per LLM call and one per tool call, giving the Java travel planner per-step durability.
@ActivityInterface
public interface TravelTools {

    @ActivityMethod
    @Tool(
            description =
                    "Get a Wikipedia summary for a topic — useful for cities, countries, regions, attractions.")
    String getWikipediaSummary(
            @ToolParam(description = "The article title to look up, e.g. \"Monaco\", \"Suzuka Circuit\".")
                    String topic);

    @ActivityMethod
    @Tool(
            description =
                    "Get country background information — currency, languages, region, capital, timezones.")
    String getCountryInfo(
            @ToolParam(description = "Country name, e.g. \"Monaco\", \"Italy\", \"Japan\".") String country);
}
