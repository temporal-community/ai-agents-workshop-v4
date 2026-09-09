# TypeScript port, LangChain edition — maintainer notes

Not learner-facing. The lab's Editor tab is rooted at `decouple-agents/`, so nothing
here reaches an attendee.

## Provenance

`decouple-agents/` is the TypeScript port of the Python workshop in the repository
root, drawn from `demo2-openai-temporal-integration`, `demo4-hitl`,
`demo5-multi-agent`, `demo6a-different-sdks` and `demo6b-different-languages`. It is
a rewrite, not a transliteration.

The four challenges map to those demos as: 1 <- demo2, 2 <- demo4, 3 <- demo5,
4 <- demo6b's premise with a Python travel planner as the specialist.

## Relationship to `typescript/`

`typescript/` is the first edition and stays as the working backup: it uses Nexus for
both specialist boundaries and a Strands agent on the Python side, and its Instruqt
Track is published and digest-pinned. This directory is a standalone second edition,
not a replacement. Changing one must not touch the other.

Two things differ deliberately:

- **No Nexus.** Both specialists are Child Workflows, and challenge 4 crosses to Python
  by naming a Workflow type as a string on the Python Worker's Task Queue. See ADR 0004
  in `temporalio/temporal-devdays-ts` for why - it is a delivery decision, not a
  technical one, and the ADR records what the change costs as well as what it buys.
- **LangChain Deep Agents instead of Strands** on the Python side, via
  `temporalio.contrib.deepagents`. That integration is Pre-release. It is a real
  upgrade to the lesson: the Python specialist now gets one Activity per model call,
  matching the TypeScript side, where the Strands version ran its whole loop inside a
  single Activity.

Challenge 3 also gains a parallel fan-out tool, which is the only place in the workshop
where the Workflow rather than the model decides what runs concurrently.

## Why the learner-facing files never mention that

An attendee has not taken the Python edition. Telling them this is a port of it is
noise at best. Keep `decouple-agents/README.md`, every TODO comment, and every
Instruqt assignment standalone.

Challenge 4 legitimately discusses TypeScript and Python as two languages in one
architecture. That is the system under test, not another edition of the workshop.

## Deliberate differences from the Python original

- **No MCP.** Demos 3-6 depend on a Node F1 MCP server installed at a local path via
  `F1_MCP_SERVER_HOME`, which is not reproducible in a lab. The specialists are
  weather and travel instead, which also makes challenge 4 a swap of exactly one
  specialist. `@temporalio/openai-agents` does ship MCP providers, so this could
  return as a fifth challenge.
- **No network control panel.** The Python track ships a mitmproxy fault injector and
  per-demo diagram servers on ports 5000 and 8090-8093. Each challenge here breaks a
  Worker with Ctrl+C instead, which needs no extra infrastructure and, in challenge 4,
  makes a sharper point: killing only the Python runtime.
- **Challenge 4 crosses to Python, not Java.** See ADR 0003 in
  temporalio/temporal-devdays-ts.
