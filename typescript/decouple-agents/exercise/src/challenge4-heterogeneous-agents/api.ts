// ABOUTME: The cross-language Nexus contract. The handler for this service is written in Python.
// TypeScript and Python share no code — only the strings and JSON shapes declared here.

import * as nexus from 'nexus-rpc';

/**
 * Wire shapes. The field names are the contract: Python's dataclass fields are
 * `question` and `answer`, so these must be too.
 */
export interface AskRequest {
  question: string;
}

export interface AskResponse {
  answer: string;
}

/**
 * Every name below has a byte-for-byte counterpart in
 * `python-travel-planner/travel_planner_service.py`:
 *
 *   service name    'TravelPlannerService'  <-> @nexusrpc.service class TravelPlannerService
 *   operation name  'ask_travel_planner'    <-> ask_travel_planner: nexusrpc.Operation[...]
 *   request field   question                <-> AskRequest.question
 *   response field  answer                  <-> AskResponse.answer
 */
export const travelPlannerService = nexus.service('TravelPlannerService', {
  // TODO 12: Declare the operation:
  //   askTravelPlanner: nexus.operation<AskRequest, AskResponse>({ name: 'ask_travel_planner' })
  // The property name is yours; `name` is the wire contract and must match the
  // Python attribute exactly. Get it wrong and the call fails at the endpoint,
  // not at compile time — no compiler checks across a language boundary.
});

/** Endpoint name; the server routes it to the Python Worker's Task Queue. */
export const TRAVEL_PLANNER_ENDPOINT = 'c4-travel-planner';

/** Task Queue the Python Worker polls. Referenced only when creating the endpoint. */
export const PYTHON_TRAVEL_PLANNER_TASK_QUEUE = 'c4-python-travel-planner-tq';
