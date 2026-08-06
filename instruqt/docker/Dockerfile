# ABOUTME: Sandbox image for the Durable AI Agents Webinar.
# Bakes in: Python 3.10 + uv, Node.js 20, Temporal CLI, the three webinar
# modules and their Python deps, F1 MCP server, FastF1 cache, mitmproxy,
# the network control panel, and code-server.
#
# Build context must be the ai-agents-webinar repository root.
#
# The lab-start setup-workshop script stages /opt/workshop -> /root/workshop,
# starts background services, and injects the OPENAI_API_KEY secret.

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive
ENV WORKSPACE=/opt/workshop
ENV F1_MCP_HOME=/opt/f1-mcp-server
ENV PYTHONUNBUFFERED=1

# ── 1. System packages ────────────────────────────────────────────────────────
# Use GCP regional mirror for reliability inside GCP-hosted Instruqt sandboxes.
RUN echo "deb http://us-central1.gce.archive.ubuntu.com/ubuntu jammy main restricted universe multiverse" > /etc/apt/sources.list \
    && echo "deb http://us-central1.gce.archive.ubuntu.com/ubuntu jammy-updates main restricted universe multiverse" >> /etc/apt/sources.list \
    && echo "deb http://us-central1.gce.archive.ubuntu.com/ubuntu jammy-backports main restricted universe multiverse" >> /etc/apt/sources.list \
    && echo "deb http://security.ubuntu.com/ubuntu jammy-security main restricted universe multiverse" >> /etc/apt/sources.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        curl \
        wget \
        git \
        unzip \
        build-essential \
        ca-certificates \
        gnupg \
        bash-completion \
        python3.10 \
        python3.10-venv \
        python3-pip \
    && update-alternatives --install /usr/bin/python python /usr/bin/python3.10 1 \
    && update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.10 1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── 2. uv ─────────────────────────────────────────────────────────────────────
RUN curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh

# ── 3. Node.js 20 ─────────────────────────────────────────────────────────────
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── 4. Temporal CLI ───────────────────────────────────────────────────────────
RUN curl -sSf https://temporal.download/cli.sh | sh \
    && ln -sf /root/.temporalio/bin/temporal /usr/local/bin/temporal

ENV PATH="${PATH}:/root/.temporalio/bin"

# ── 5. Webinar source ─────────────────────────────────────────────────────────
# Each module has an exercise/ and a completed solution/ subfolder.
COPY demo2-openai-temporal-integration/ /opt/workshop/demo2-openai-temporal-integration/
COPY demo4-hitl/ /opt/workshop/demo4-hitl/
COPY demo5-multi-agent/ /opt/workshop/demo5-multi-agent/

# ── 6. Python deps (exercise/ and solution/ each need their own) ───────────────
RUN for demo in demo2-openai-temporal-integration demo4-hitl demo5-multi-agent; do \
        for variant in exercise solution; do \
            (cd "/opt/workshop/${demo}/${variant}" && uv sync); \
        done; \
    done

# ── 7. F1 MCP server (pinned commit) ──────────────────────────────────────────
# COMMIT PIN: Update this SHA before each workshop by running:
#   git ls-remote https://github.com/rakeshgangwar/f1-mcp-server HEAD
ARG F1_MCP_COMMIT=73b95ecf75fcabbd25c68c3a57e784e529beb421

RUN git clone https://github.com/rakeshgangwar/f1-mcp-server.git "${F1_MCP_HOME}" \
    && cd "${F1_MCP_HOME}" \
    && git checkout "${F1_MCP_COMMIT}" \
    && sed -i "s|fastf1.Cache.enable_cache.*|import os\n_cache_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'cache')\nos.makedirs(_cache_dir, exist_ok=True)\nfastf1.Cache.enable_cache(_cache_dir)|" python/f1_data.py \
    && npm install \
    && npm run build \
    && python3 -m venv .venv \
    && .venv/bin/pip install --upgrade pip \
    && .venv/bin/pip install fastf1 pandas numpy

ENV F1_MCP_SERVER_HOME=/opt/f1-mcp-server

# ── 8. Pre-warm FastF1 cache ──────────────────────────────────────────────────
COPY instruqt/docker/warmup_f1_cache.py /tmp/warmup_f1_cache.py
RUN mkdir -p "${F1_MCP_HOME}/cache" \
    && "${F1_MCP_HOME}/.venv/bin/python" /tmp/warmup_f1_cache.py || echo "FastF1 cache warm failed (non-fatal)"

# ── 9. mitmproxy + CA cert ────────────────────────────────────────────────────
RUN python3 -m venv /opt/mitmproxy-venv \
    && /opt/mitmproxy-venv/bin/pip install --upgrade pip \
    && /opt/mitmproxy-venv/bin/pip install mitmproxy flask \
    && ln -sf /opt/mitmproxy-venv/bin/mitmdump /usr/local/bin/mitmdump

# Generate CA cert, trust it system-wide, and append to certifi bundles.
RUN mitmdump --listen-port 8889 --set block_global=false & \
    sleep 5 && kill %1 2>/dev/null || true; \
    cp /root/.mitmproxy/mitmproxy-ca-cert.pem \
       /usr/local/share/ca-certificates/mitmproxy-ca.crt \
    && update-ca-certificates \
    && MITM_CA=/root/.mitmproxy/mitmproxy-ca-cert.pem; \
    for demo in demo2-openai-temporal-integration demo4-hitl demo5-multi-agent; do \
        for variant in exercise solution; do \
            bundle="/opt/workshop/${demo}/${variant}/.venv/lib/python3.10/site-packages/certifi/cacert.pem"; \
            [ -f "$bundle" ] && cat "$MITM_CA" >> "$bundle" && echo "Patched certifi in ${demo}/${variant}"; \
        done; \
    done

# ── 10. Network control panel ─────────────────────────────────────────────────
RUN mkdir -p /opt/proxy/static
COPY instruqt/docker/proxy/toggle_addon.py /opt/proxy/toggle_addon.py
COPY instruqt/docker/proxy/controlpanel.py /opt/proxy/controlpanel.py
COPY instruqt/docker/proxy/state.json      /opt/proxy/state.json
COPY instruqt/docker/proxy/static/         /opt/proxy/static/

# ── 11. code-server ───────────────────────────────────────────────────────────
RUN curl -fsSL https://code-server.dev/install.sh | sh \
    && mkdir -p /root/.local/share/code-server/User \
    && printf '{\n    "workbench.colorTheme": "Default Dark+",\n    "workbench.startupEditor": "none",\n    "security.workspace.trust.enabled": false,\n    "editor.fontSize": 14,\n    "editor.tabSize": 4,\n    "workbench.activityBar.visible": false\n}\n' \
       > /root/.local/share/code-server/User/settings.json

# ── 12. Shell environment ─────────────────────────────────────────────────────
RUN echo '' >> /etc/bash.bashrc \
    && echo '# Workshop environment' >> /etc/bash.bashrc \
    && echo 'export PATH=$PATH:/root/.temporalio/bin:/usr/local/bin' >> /etc/bash.bashrc \
    && echo 'export TEMPORAL_ADDRESS="127.0.0.1:7233"' >> /etc/bash.bashrc \
    && echo 'export F1_MCP_SERVER_HOME=/opt/f1-mcp-server' >> /etc/bash.bashrc \
    && echo 'export PYTHONUNBUFFERED=1' >> /etc/bash.bashrc \
    && echo 'export HTTP_PROXY="http://127.0.0.1:8888"' >> /etc/bash.bashrc \
    && echo 'export HTTPS_PROXY="http://127.0.0.1:8888"' >> /etc/bash.bashrc \
    && echo 'export NO_PROXY="127.0.0.1,localhost"' >> /etc/bash.bashrc \
    && echo 'export SSL_CERT_FILE=/etc/ssl/certs/ca-certificates.crt' >> /etc/bash.bashrc \
    && echo 'export REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt' >> /etc/bash.bashrc \
    && echo 'export NODE_EXTRA_CA_CERTS="/root/.mitmproxy/mitmproxy-ca-cert.pem"' >> /etc/bash.bashrc \
    && echo '[ -f /usr/share/bash-completion/bash_completion ] && . /usr/share/bash-completion/bash_completion' >> /etc/bash.bashrc

RUN echo '' >> /root/.bashrc \
    && echo '# Source workshop environment' >> /root/.bashrc \
    && echo '[ -f /etc/bash.bashrc ] && . /etc/bash.bashrc' >> /root/.bashrc

WORKDIR /root

# Keep PID 1 alive. This image had no CMD, so it inherited ubuntu:22.04's
# CMD ["/bin/bash"]; started without a TTY, bash reads EOF on stdin and exits
# immediately, so the container dies with status 0 before the tab proxy can
# reach any port. The failure mode is silent and misleading: every tab returns
# HTTP 572 while terraform, the track setup script and every challenge script
# all log success, because lifecycle scripts do not go through the proxy.
# `instruqt track test` passes for the same reason. Verified 2026-08-01 by
# running the image with no TTY and watching it exit 0 in under a second.
CMD ["sleep", "infinity"]
