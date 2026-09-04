# ABOUTME: Sandbox image for "Build AI Agents That Survive Failure (TypeScript)".
# Bakes in: Node 22, Python 3.10 + uv, the Temporal CLI, code-server, the whole
# workshop tree, and every dependency both trees need - so the first command an
# attendee runs in the lab is fast rather than a five-minute install.
#
# BUILD CONTEXT IS `typescript/`, NOT THE REPO ROOT.
# The ignore file that keeps node_modules and .venv out of the context is
# `typescript/.dockerignore`; a .dockerignore only applies at the root of the
# build context, which is why it lives there and not next to this file.
#
#   cd typescript
#   docker build --platform linux/amd64 \
#       -f sandbox/Dockerfile \
#       -t nadvolod/ai-agents-workshop-v4-ts-sandbox:latest .
#   docker push nadvolod/ai-agents-workshop-v4-ts-sandbox:latest
#   docker buildx imagetools inspect \
#       nadvolod/ai-agents-workshop-v4-ts-sandbox:latest --format '{{.Manifest.Digest}}'
#
# Then paste that digest into `instruqt/config.yml`, which pins by digest on
# purpose. `--platform linux/amd64` is not optional: an arm64 image (the default
# on Apple Silicon) fails on Instruqt with an empty container log and no other
# symptom.
#
# The workshop lands at /root/workshop/decouple-agents and stays there. Nothing
# is staged at lab start: /root comes from the image, the sandbox is one
# attendee's for its lifetime, and copying ~1 GB of node_modules out of /opt
# just to break the image's hardlinks would put minutes on the lab-start path
# to achieve nothing.

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV WORKSHOP=/root/workshop/decouple-agents
ENV PYTHONUNBUFFERED=1
# `uv run` re-resolves the lockfile by default, which would need the network at
# lab start. The venvs below are built from these exact lockfiles, so tell uv to
# trust them and just use the venv.
ENV UV_FROZEN=1

# ── 1. System packages ────────────────────────────────────────────────────────
# GCP regional mirror: Instruqt sandboxes run in GCP and the default archive is
# noticeably flakier from there.
RUN echo "deb http://us-central1.gce.archive.ubuntu.com/ubuntu jammy main restricted universe multiverse" > /etc/apt/sources.list \
    && echo "deb http://us-central1.gce.archive.ubuntu.com/ubuntu jammy-updates main restricted universe multiverse" >> /etc/apt/sources.list \
    && echo "deb http://us-central1.gce.archive.ubuntu.com/ubuntu jammy-backports main restricted universe multiverse" >> /etc/apt/sources.list \
    && echo "deb http://security.ubuntu.com/ubuntu jammy-security main restricted universe multiverse" >> /etc/apt/sources.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        wget \
        git \
        unzip \
        gnupg \
        bash-completion \
        procps \
        build-essential \
        python3.10 \
        python3.10-venv \
        python3-pip \
    && update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1 \
    && update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── 2. Node.js 22 ─────────────────────────────────────────────────────────────
# The workshop's package.json declares @types/node ^22 and the Temporal
# TypeScript SDK 1.23 targets an active LTS line.
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && node --version

# ── 3. uv (for challenge 4's Python Strands Worker) ───────────────────────────
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh \
    && uv --version

# ── 4. Temporal CLI ───────────────────────────────────────────────────────────
RUN curl -sSf https://temporal.download/cli.sh | sh \
    && ln -sf /root/.temporalio/bin/temporal /usr/local/bin/temporal \
    && temporal --version

ENV PATH="${PATH}:/root/.temporalio/bin"

# ── 5. Workshop source ────────────────────────────────────────────────────────
# Both trees: exercise/ (the attendee's) and solution/ (the reference). One
# editor tab opens the parent directory, so both must be present.
COPY decouple-agents/ /root/workshop/decouple-agents/

# ── 6. Node dependencies, both trees ──────────────────────────────────────────
# Separate layers so a failure names the tree that failed.
RUN cd "${WORKSHOP}/exercise" && npm ci --no-audit --no-fund
RUN cd "${WORKSHOP}/solution" && npm ci --no-audit --no-fund

# ── 7. Python dependencies, both trees ────────────────────────────────────────
# Challenge 4's travel specialist. Only the solution tree's copy is ever edited
# by the attendee (it is not - the Python side is finished), but both trees get
# a venv so `uv run python worker.py` is instant in either.
RUN cd "${WORKSHOP}/exercise/python-travel-planner" && uv sync --frozen
RUN cd "${WORKSHOP}/solution/python-travel-planner" && uv sync --frozen

# ── 8. Typecheck both trees at BUILD time ─────────────────────────────────────
# A broken port fails the image build instead of the workshop.
#
# The exercise tree typechecks with every TODO still open, by design: an
# unfinished TODO is a stub that throws at runtime, never a compile error. If
# this step ever fails on exercise/, that property has been broken - fix the
# code, do not delete this line, because an attendee whose editor is full of red
# squiggles cannot tell their own mistake from the workshop's.
RUN cd "${WORKSHOP}/exercise" && npm run typecheck
RUN cd "${WORKSHOP}/solution" && npm run typecheck

# ── 9. code-server ────────────────────────────────────────────────────────────
# Two of these settings are load-bearing, not preferences:
#
#   security.workspace.trust.enabled: false
#       Without it the workbench tries to render the trust prompt inside the
#       Instruqt tab's iframe and the attendee gets a blank page.
#
#   files.autoSave: afterDelay
#       Every assignment tells the attendee the editor saves as they type. If
#       that is not true they run stale code and blame their own edits.
#
# The directory below is the --user-data-dir the track's setup-workshop passes
# explicitly. Keep the two in sync.
RUN curl -fsSL https://code-server.dev/install.sh | sh \
    && mkdir -p /root/.local/share/code-server/User \
    && printf '%s\n' \
       '{' \
       '    "security.workspace.trust.enabled": false,' \
       '    "files.autoSave": "afterDelay",' \
       '    "files.autoSaveDelay": 500,' \
       '    "workbench.colorTheme": "Default Dark+",' \
       '    "workbench.startupEditor": "none",' \
       '    "explorer.compactFolders": false,' \
       '    "editor.fontSize": 14,' \
       '    "editor.tabSize": 2,' \
       '    "editor.minimap.enabled": false,' \
       '    "typescript.tsdk": "/root/workshop/decouple-agents/exercise/node_modules/typescript/lib"' \
       '}' \
       > /root/.local/share/code-server/User/settings.json

# ── 10. Shell environment ─────────────────────────────────────────────────────
# Every terminal tab is a fresh shell. The track's setup-workshop appends one
# more line here at lab start, sourcing the LiteLLM credentials it mints.
RUN echo '' >> /etc/bash.bashrc \
    && echo '# Workshop environment' >> /etc/bash.bashrc \
    && echo 'export PATH=$PATH:/root/.temporalio/bin:/usr/local/bin' >> /etc/bash.bashrc \
    && echo 'export TEMPORAL_ADDRESS="127.0.0.1:7233"' >> /etc/bash.bashrc \
    && echo 'export TEMPORAL_NAMESPACE="default"' >> /etc/bash.bashrc \
    && echo 'export PYTHONUNBUFFERED=1' >> /etc/bash.bashrc \
    && echo 'export UV_FROZEN=1' >> /etc/bash.bashrc \
    && echo '[ -f /usr/share/bash-completion/bash_completion ] && . /usr/share/bash-completion/bash_completion' >> /etc/bash.bashrc

RUN echo '' >> /root/.bashrc \
    && echo '# Source workshop environment' >> /root/.bashrc \
    && echo '[ -f /etc/bash.bashrc ] && . /etc/bash.bashrc' >> /root/.bashrc

WORKDIR /root/workshop/decouple-agents

# Keep PID 1 alive. Without a CMD this image inherits ubuntu:22.04's
# CMD ["/bin/bash"]; started with no TTY, bash reads EOF on stdin and exits, so
# the container dies with status 0 before the tab proxy can reach any port. The
# failure mode is silent and misleading - every tab returns an error while
# terraform, the setup script and every lifecycle script all report success,
# because lifecycle scripts do not go through the proxy. `instruqt track test`
# passes for the same reason.
CMD ["sleep", "infinity"]
