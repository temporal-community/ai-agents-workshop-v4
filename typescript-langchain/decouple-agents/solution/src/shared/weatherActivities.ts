// ABOUTME: Temporal Activities behind the weather agent's tools — every one is a network call.
// Each takes a single object argument, which is the shape `activityAsTool` derives its schema from.

/**
 * Every Activity here is `async`. `proxyActivities` (which `activityAsTool`
 * uses under the hood) only sees Promise-returning functions; a synchronous
 * export is silently typed away and the Workflow fails to compile at the call
 * site with `Type 'Symbol' has no call signatures`.
 */

async function getJson(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`${url} responded ${response.status} ${response.statusText}`);
  }
  return await response.text();
}

/** Public IP address of the machine running this Worker. */
export async function getIpAddress(_input: Record<string, never>): Promise<string> {
  const response = await fetch('https://icanhazip.com', { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`icanhazip.com responded ${response.status}`);
  }
  return (await response.text()).trim();
}

/** City, region, country and coordinates for an IP address. */
export async function getLocationInfo(input: { ipAddress: string }): Promise<string> {
  return await getJson(`http://ip-api.com/json/${encodeURIComponent(input.ipAddress)}`);
}

/** Latitude and longitude for a city name. */
export async function getCoordinates(input: { city: string }): Promise<string> {
  const body = await getJson(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(input.city)}&count=1`,
  );

  // Open-Meteo omits `results` entirely when it cannot match the query. That
  // reads as success to a model, which then retries the identical call and
  // burns turns. Hand back an unambiguous miss instead.
  const parsed = JSON.parse(body) as { results?: unknown[] };
  if (!parsed.results || parsed.results.length === 0) {
    return JSON.stringify({
      error: 'no_match',
      query: input.city,
      hint: `No location matched '${input.city}'. Try just the city name, or check the spelling.`,
    });
  }
  return body;
}

/** Current temperature (Fahrenheit), weather code and wind speed for a coordinate pair. */
export async function getWeather(input: { latitude: number; longitude: number }): Promise<string> {
  return await getJson(
    'https://api.open-meteo.com/v1/forecast' +
      `?latitude=${input.latitude}&longitude=${input.longitude}` +
      '&current=temperature_2m,weather_code,wind_speed_10m' +
      '&temperature_unit=fahrenheit',
  );
}
