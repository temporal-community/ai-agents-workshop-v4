# AI Agents Webinar

A focused, hands-on course for building durable AI agents in Python with
[OpenAI](https://platform.openai.com/docs/api-reference/responses), the
[OpenAI Agents SDK](https://openai.github.io/openai-agents-python/), and
[Temporal](https://temporal.io/). The webinar contains three progressive modules:

| Module | Topic | Code |
|---|---|---|
| 1 | Native Temporal AI Agent: implement the agentic loop directly as a durable workflow | [`demo1-agentic-loop`](demo1-agentic-loop/) |
| 2 | Human-in-the-loop: pause an agent, collect input, and resume with Signals and Queries | [`demo4-hitl`](demo4-hitl/) |
| 3 | Multi-agent orchestration: delegate to specialists with child workflows and Nexus | [`demo5-multi-agent`](demo5-multi-agent/) |

Each module contains an `exercise/` directory for attendees and a `solution/`
directory with the completed reference implementation.

The accompanying webinar deck is available at
[`assets/Replay 2026_ Production-ready Agents with OpenAI Agents SDK and Temporal.pdf`](assets/Replay%202026_%20Production-ready%20Agents%20with%20OpenAI%20Agents%20SDK%20and%20Temporal.pdf).

## Prerequisites

- Python 3.10+
- [`uv`](https://docs.astral.sh/uv/)
- [Temporal CLI](https://docs.temporal.io/cli)
- An OpenAI API key exposed as `OPENAI_API_KEY`
- Node.js 18+ and the F1 MCP server for modules 2 and 3

## Run a module locally

Start the Temporal development server once:

```bash
temporal server start-dev
```

In another terminal, choose a module and either its exercise or solution:

```bash
cd demo1-agentic-loop/exercise
uv sync
export OPENAI_API_KEY=sk-...
uv run python -m worker
```

Then start a workflow from a second terminal in the same directory:

```bash
uv run python -m start_workflow "What is the weather in Tokyo?"
```

The module READMEs contain their exact worker layout, prompts, and setup steps.
Open the Temporal Web UI at [http://localhost:8233](http://localhost:8233) to
inspect workflow histories while the examples run.

## F1 MCP server (modules 2 and 3)

The human-in-the-loop and multi-agent modules use the
[`f1-mcp-server`](https://github.com/rakeshgangwar/f1-mcp-server) as a local
subprocess. Install it once:

```bash
git clone https://github.com/rakeshgangwar/f1-mcp-server.git
cd f1-mcp-server
npm install
npm run build
uv venv
source .venv/bin/activate
uv pip install fastf1 pandas numpy
deactivate
export F1_MCP_SERVER_HOME="$PWD"
```

Persist `F1_MCP_SERVER_HOME` in your shell profile if you plan to run the
modules repeatedly.

## Instruqt course

The `instruqt/` directory defines a three-challenge browser-based course:

```text
instruqt/
├── 01-native-temporal-ai-agent/
├── 02-human-in-the-loop/
├── 03-multi-agent/
├── docker/
├── track_scripts/
├── config.yml
└── track.yml
```

The fork uses the new `ai-agents-webinar` track slug and intentionally contains
no inherited Instruqt IDs or checksum. This keeps the first publish isolated
from the source workshop. Register and initialize the new track from the
Instruqt directory:

```bash
cd instruqt
just create
just init
```

After Instruqt assigns the track, challenge, and tab IDs, pull and commit them:

```bash
just pull
git add .
git commit -m "Pin Instruqt webinar IDs"
```

For later updates:

```bash
just validate
just test
just push
```

The sandbox image contains only the three webinar modules. Build it from the
repository root:

```bash
cd ..
docker buildx build --platform linux/amd64 \
  -f instruqt/docker/Dockerfile \
  -t docker.io/nadvolod/ai-agents-webinar-sandbox:latest --push .
```

## Push this fork

The checked-out branch is intended for a new repository named
`ai-agents-webinar`. Once that empty repository exists, keep the source project
as `upstream` and push this branch to the new `origin`:

```bash
git remote rename origin upstream
git remote add origin git@github.com:<owner>/ai-agents-webinar.git
git push -u origin codex/ai-agents-webinar
```

Replace `<owner>` with the target GitHub account or organization.

## Author and inspiration

Created by [Nikolay Advolodkin](https://www.linkedin.com/in/nikolayadvolodkin/),
with inspiration from [Cornelia Davis' original AI Agents Workshop](https://github.com/temporal-community/ai-agents-workshop-python).
