#!/usr/bin/env bash
# ABOUTME: Codespaces start hook. Codespaces-only. Nothing under instruqt/ reads
# this file, and this file reads nothing from instruqt/track_scripts/, so the two
# environments cannot break each other.
#
# Derived from instruqt/track_scripts/setup-workshop, minus:
#   - the LiteLLM secret broker (Codespaces uses a plain OPENAI_API_KEY secret)
#   - code-server (Codespaces is already VS Code)
#
# Deliberately no `set -e`: a half-started container an attendee can still work
# in beats a failed postStart with no shell.
set -uo pipefail

log() { printf '  %s\n' "$*"; }

# Guard on "is the port already serving", not "is a process whose command line
# contains this string running". pgrep -f happily matches unrelated command
# lines (the VS Code server's, or a shell that merely mentions the name), which
# silently skips starting the service.
listening() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && exec 3<&-; }

# 1. Stage the four demos the workshop walks through into a writable copy.
#    cp breaks the image's uv hardlinks, so staging only what is used keeps this
#    to ~700 MB instead of ~1.4 GB. The other three stay readable in
#    /opt/workshop and can be copied by hand if anyone wants them.
STAGED_DEMOS=(
    demo2-openai-temporal-integration
    demo4-hitl
    demo5-multi-agent
    demo6b-different-languages
)

if [ ! -d "$HOME/workshop" ]; then
    log "staging demos into ~/workshop (one time, ~30s)"
    mkdir -p "$HOME/workshop"
    for demo in "${STAGED_DEMOS[@]}"; do
        cp -r "/opt/workshop/${demo}" "$HOME/workshop/${demo}" && log "  ${demo}"
    done
else
    log "~/workshop already staged"
fi

# 2. Network control panel, for the fault-injection demos.
#    /etc/bash.bashrc points HTTP_PROXY at 127.0.0.1:8888, so mitmdump must be
#    up or outbound calls from an interactive shell will hang.
mkdir -p "$HOME/proxy/static"
cp -r /opt/proxy/* "$HOME/proxy/" 2>/dev/null || true

if ! listening 8888; then
    nohup mitmdump --listen-port 8888 --set block_global=false \
        -s "$HOME/proxy/toggle_addon.py" > /tmp/proxy.log 2>&1 &
    log "mitmproxy started on 8888"
fi

if ! listening 5000; then
    nohup /opt/mitmproxy-venv/bin/python "$HOME/proxy/controlpanel.py" \
        > /tmp/controlpanel.log 2>&1 &
    log "control panel started on 5000"
fi

# 3. Temporal dev server.
if ! listening 7233; then
    nohup temporal server start-dev \
        --ip 0.0.0.0 \
        --db-filename "$HOME/temporal.db" \
        --log-level warn > /tmp/temporal-server.log 2>&1 &
    log "Temporal dev server starting (7233 gRPC, 8233 UI)"
fi

# 4. Architecture diagrams, served from /opt/workshop so they work regardless of
#    what was staged. Ports match the Instruqt track for consistency.
for spec in "8090:demo5-multi-agent:arch-5" \
            "8091:demo6b-different-languages:arch-6b" \
            "8092:demo4-hitl:arch-4" \
            "8093:demo6a-different-sdks:arch-6a"; do
    port="${spec%%:*}"; rest="${spec#*:}"; demo="${rest%%:*}"; dir="${rest#*:}"
    mkdir -p "$HOME/$dir"
    cp "/opt/workshop/${demo}/architecture.html" "$HOME/$dir/index.html" 2>/dev/null || true
    if ! listening "$port"; then
        nohup python3 -m http.server "$port" --directory "$HOME/$dir" \
            > "/tmp/arch-${port}.log" 2>&1 &
    fi
done
log "architecture diagrams on 8090, 8091, 8092, 8093"

# 5. Wait for Temporal, then register the Nexus endpoints demos 5 and 6b need.
for _ in $(seq 1 60); do
    if temporal operator cluster health --address 127.0.0.1:7233 >/dev/null 2>&1; then
        log "Temporal server healthy"
        break
    fi
    sleep 1
done

for spec in "f1-expert:f1-expert-agent-tq" \
            "f1-expert-d6:f1-expert-agent-tq" \
            "travel-planner:travel-planner-agent-tq"; do
    temporal operator nexus endpoint create \
        --name "${spec%%:*}" \
        --target-namespace default \
        --target-task-queue "${spec#*:}" \
        --address 127.0.0.1:7233 >/dev/null 2>&1 || true
done
log "Nexus endpoints registered"

# 6. The one thing an attendee has to supply.
if [ -z "${OPENAI_API_KEY:-}" ]; then
    cat <<'WARN'

  ────────────────────────────────────────────────────────────────────────
  OPENAI_API_KEY is not set. Every demo calls OpenAI and will fail without
  it. Add it as a Codespaces secret, then rebuild or restart this Codespace:

      https://github.com/settings/codespaces

  ────────────────────────────────────────────────────────────────────────

WARN
else
    log "OPENAI_API_KEY is set"
fi

log "ready. Instructions: .devcontainer/RUNBOOK.md"
