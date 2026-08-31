// ABOUTME: The Nexus contract for the travel specialist — service name, operation name, payload shapes.
// Caller and handler share this file today; challenge 4 keeps the contract and moves the handler to Python.

import * as nexus from 'nexus-rpc';

/** What the orchestrator sends across the boundary. */
export interface AskRequest {
  question: string;
}

/** What comes back. */
export interface AskResponse {
  answer: string;
}

/**
 * A Nexus Service is a named, typed contract. Unlike a Child Workflow — which
 * couples the caller to the callee's Workflow type, Namespace and Task Queue —
 * the caller here knows only an endpoint name and this interface.
 */
export const travelPlannerService = nexus.service('TravelPlannerService', {
  // The property name is for TypeScript; `name` is what goes on the wire.
  askTravelPlanner: nexus.operation<AskRequest, AskResponse>({ name: 'ask_travel_planner' }),
});

/** Endpoint the orchestrator addresses. Maps to a Namespace + Task Queue at the server. */
export const TRAVEL_PLANNER_ENDPOINT = 'c3-travel-planner';
