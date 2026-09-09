// ABOUTME: Temporal Activities behind the travel specialist's tools.
// Challenge 4 retires these in favour of the Python travel planner Workflow.

async function getJson(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`${url} responded ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

/** Wikipedia summary for a place, circuit or landmark. */
export async function getWikipediaSummary(input: { topic: string }): Promise<string> {
  return await getJson(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(input.topic)}`);
}

/** Country background: capital, currencies, languages, region, timezones. */
export async function getCountryInfo(input: { country: string }): Promise<string> {
  return await getJson(
    `https://restcountries.com/v3.1/name/${encodeURIComponent(input.country)}` +
      '?fields=name,capital,currencies,languages,region,subregion,timezones',
  );
}
