// ABOUTME: The single input shape every agent Workflow in this workshop accepts.
// `model` travels with the request because Workflow code cannot read process.env.

/** What every agent Workflow takes: a question, plus the model to answer it with. */
export interface AgentRequest {
  /** The user's question, in plain English. */
  question: string;
  /**
   * Model name resolved by the client from `OPENAI_MODEL`.
   *
   * Workflow code runs in a deterministic sandbox with no access to the
   * process environment, so the name is passed in as data and forwarded to the
   * runner via `runConfig.model`.
   */
  model?: string;
}
