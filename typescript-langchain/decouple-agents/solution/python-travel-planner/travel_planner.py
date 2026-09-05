# ABOUTME: The travel planning agent's tools and prompt. Plain LangChain — no Temporal imports.
# Another team's agent, imported as-is and not modified.

from urllib.parse import quote

import httpx
from langchain_core.tools import tool


@tool
async def wikipedia_summary(topic: str) -> str:
    """Get a Wikipedia summary for a topic — useful for cities, countries, regions, attractions.

    Args:
        topic: The article title to look up (e.g. "Monaco", "Kyoto", "Patagonia").
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://en.wikipedia.org/api/rest_v1/page/summary/{quote(topic)}",
            timeout=5.0,
        )
        response.raise_for_status()
        return response.text


@tool
async def country_info(country: str) -> str:
    """Get country background information — currency, languages, region, capital, timezones.

    Args:
        country: Country name (e.g. "Monaco", "Italy", "Singapore", "Japan").
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://restcountries.com/v3.1/name/{quote(country)}",
            timeout=5.0,
        )
        response.raise_for_status()
        return response.text


SYSTEM_PROMPT = """
You are a travel planning specialist. Help users understand destinations:
their context (Wikipedia summary), country background (language, currency,
region), and high-level practical information.

If users are not asking about a specific destination, do not guess, instead
ask for more specific information.

Use the provided tools as needed. Answer concisely as plain text.
"""

# Both tools do network I/O, so both become Temporal Activities. The Workflow
# wraps them with tool_as_activity; nothing here knows that.
TOOLS = [wikipedia_summary, country_info]
