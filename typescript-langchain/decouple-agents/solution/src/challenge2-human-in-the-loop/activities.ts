// ABOUTME: The one Activity behind challenge 2's approval-gated tool.
// It stands in for a real booking system: the side effect a human wants to see before it happens.

/** Reserve a trip. Runs only after a human has approved the agent's proposal. */
export async function bookTrip(input: { destination: string; departureDate: string }): Promise<string> {
  // A real implementation would call a reservation API here. What matters for
  // the workshop is that this is an Activity: it runs once, its result is
  // recorded in history, and no replay ever books the trip twice.
  return JSON.stringify({
    status: 'confirmed',
    destination: input.destination,
    departureDate: input.departureDate,
    reference: `TRIP-${input.destination.slice(0, 3).toUpperCase()}-${input.departureDate.replace(/-/g, '')}`,
  });
}
