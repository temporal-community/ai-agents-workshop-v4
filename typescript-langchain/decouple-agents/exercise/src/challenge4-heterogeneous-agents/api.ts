// ABOUTME: The cross-language contract. The Workflow behind these names is written in Python.
// TypeScript and Python share no code — only the strings and JSON shapes declared here.

/**
 * Wire shapes. The field names are the contract: Python's dataclass fields are
 * `question`, `model` and `answer`, so these must be too.
 */
export interface AskRequest {
  question: string;
  model?: string;
}

export interface AskResponse {
  answer: string;
}

/**
 * The remote Workflow's signature, declared locally.
 *
 * There is no Python code to import, so the caller states the shape it expects
 * and the type system holds it to that. If Python changes its dataclass and this
 * does not, nothing fails at compile time — it fails at run time, in the payload
 * converter. That is the cost of a boundary a compiler cannot see across.
 */
export type PythonTravelPlannerWorkflow = (request: AskRequest) => Promise<AskResponse>;

/**
 * Every name below has a byte-for-byte counterpart in
 * `python-travel-planner/travel_planner_service.py`:
 *
 *   workflow type   'TravelPlannerAgentWorkflow'  <-> @workflow.defn class TravelPlannerAgentWorkflow
 *   task queue      'c4-python-travel-planner-tq' <-> TASK_QUEUE in worker.py
 *   request fields  question, model               <-> AskRequest.question, AskRequest.model
 *   response field  answer                        <-> AskResponse.answer
 */
export const PYTHON_TRAVEL_PLANNER_WORKFLOW = 'TravelPlannerAgentWorkflow';

/** Task Queue the Python Worker polls. Naming it is what selects the language. */
export const PYTHON_TRAVEL_PLANNER_TASK_QUEUE = 'c4-python-travel-planner-tq';
