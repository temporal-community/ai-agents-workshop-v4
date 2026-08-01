---
slug: environment-setup
id: ""
type: challenge
title: Environment Setup
teaser: Verify the sandbox is healthy before the first demo.
notes:
- type: text
  contents: |-
    # Welcome

    A Temporal dev server is running in your sandbox. Four progressive
    demos take a single-agent OpenAI Agents SDK workflow to a multi-language,
    multi-framework agent system.

    Each demo adds one thing. You see before and after in the Temporal Web UI.

    The blue buttons in these instructions are clickable. Click any to jump
    to that tab.
tabs:
- title: Terminal
  type: terminal
  hostname: workshop
  workdir: /root/workshop
- title: Temporal UI
  type: service
  hostname: workshop
  port: 8233
- title: Network Control Panel
  type: service
  hostname: workshop
  port: 5000
difficulty: basic
timelimit: 600
---

# Environment Setup

> [!NOTE]
> **Sandbox tabs:**
> - [button label="Terminal" background="#444CE7"](tab-0) - your working terminal
> - [button label="Temporal UI" background="#444CE7"](tab-1) - Temporal Web UI
> - [button label="Network Control Panel" background="#444CE7"](tab-2) - proxy toggles for fault-tolerance demos

## Check the Temporal server

Click the [button label="Terminal" background="#444CE7"](tab-0) tab.

```bash,run
temporal operator cluster health
```

You should see:

```bash,nocopy
SERVING
```

Click the [button label="Temporal UI" background="#444CE7"](tab-1) tab. An empty workflow list means the server is healthy and no workflows have run yet.

## Verify your tools

```bash,run
python --version && uv --version && temporal --version && node --version && java -version
```

## Confirm your LLM access

No API key to set up. The sandbox injects an OpenAI key for you at startup. Confirm it landed:

```bash,run
echo "$OPENAI_API_KEY"
```

You should see a key value starting with `sk-`. Every terminal tab you open from here inherits it automatically, so the demos work out of the box.

## Check the Network Control Panel

Click the [button label="Network Control Panel" background="#444CE7"](tab-2) tab. All four services should show green. Your facilitator uses this panel to toggle external services on and off during demos to show Temporal's retry behavior.

## Explore the workshop

```bash,run
ls /root/workshop
```

Four demo directories, one per challenge ahead. Each is self-contained with its own dependencies and task queue. Each one also has an `exercise/` folder where you'll write code, and a `solution/` folder with the finished version. If you get stuck in any demo, diff your `exercise/` work against its `solution/` folder to see exactly what's different.

> [!NOTE]
> **Why Instruqt only?** This workshop's environment is intentionally heavy: a pinned F1 data server, a Java + Maven toolchain for the later demos, and a network proxy with its own CA certificate for the fault-injection demos. That combination is easy to get wrong locally. This sandbox is the supported path. If you want to run the demos on your own machine later, the companion code repo's README documents the local setup, but it's unsupported. Environment issues (language runtime versions, missing dependencies, port conflicts) are yours to troubleshoot.

Click **Check** when you're ready to continue.
