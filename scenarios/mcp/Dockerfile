# Multi-stage build for the artemis-bulb-mcp MCP server (kmcp + uv).
#
# CMD + HEALTHCHECK adjusted from the kmcp scaffolding (STORY-023):
# - kmcp default CMD is stdio mode (good for local dev / Claude Desktop / Cursor);
#   wrong for a Kubernetes Pod. We default to FastMCP's HTTP transport on
#   0.0.0.0:8080 so the matching Service can reach it and kagent's RemoteMCPServer
#   reconciler can probe /mcp.
# - kmcp default HEALTHCHECK probes `python -c "import src.main"` — only verifies
#   module-loadability, not that the HTTP server is alive. We replace it with a
#   urllib-based GET against /mcp so the healthcheck signals "TCP+HTTP layer is
#   actually serving" rather than "the import didn't crash".
FROM python:3.12-slim as builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Set working directory
WORKDIR /app

# Copy dependency files first for layer caching.
# Deliberately do NOT copy `.python-version`: the kmcp scaffolding gitignores
# it, so a fresh clone (and therefore the workshop bundle assembled by
# `scripts/build-workshop-distribution.sh` from a fresh clone in the
# workshop-infrastructure init container) doesn't contain the file. The
# legacy Docker builder treats a `COPY .python-versio[n] ./` glob with no
# match as an error, so the conditional-glob shape `uv.loc[k]` uses doesn't
# work for an always-absent file. `pyproject.toml`'s `requires-python =
# ">=3.12"` is uv's canonical hint anyway; `.python-version` is redundant
# given the `python:3.12-slim` base.
COPY pyproject.toml ./
COPY README.md ./

# Copy lockfile if it exists, otherwise generate it
COPY uv.loc[k] ./
RUN if [ -f uv.lock ]; then \
        echo "Using existing lockfile"; \
        uv sync --frozen --no-dev --no-cache; \
    else \
        echo "Generating lockfile and installing dependencies"; \
        uv sync --no-dev --no-cache; \
    fi

# Copy source code
COPY src/ ./src/
COPY kmcp.yaml ./

# Production stage
FROM python:3.12-slim

# Install uv in production
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Create non-root user
RUN groupadd -r mcpuser && useradd -r -g mcpuser mcpuser

# Set working directory
WORKDIR /app

# Copy virtual environment and application from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/src /app/src
COPY --from=builder /app/kmcp.yaml /app/kmcp.yaml
COPY --from=builder /app/pyproject.toml /app/pyproject.toml

# Make sure scripts in .venv are usable
ENV PATH="/app/.venv/bin:$PATH"

# Install runtime dependencies only
RUN apt-get update && apt-get install -y \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Change ownership to non-root user
RUN chown -R mcpuser:mcpuser /app

# Switch to non-root user
USER mcpuser

# Expose port (if needed for HTTP transport)
EXPOSE 8080

# Health check — actually probe the HTTP endpoint, not just import the module.
# urllib raises on connection-refused / timeout; on HTTP-level errors it returns
# the response (which is what we want — kubelet treats reachable-but-non-2xx as
# alive). FastMCP's /mcp returns a non-2xx for plain GETs but the connection
# being accepted at all proves the server is up.
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/mcp', timeout=2)" \
    || exit 1

# Set environment variables.
# MCP_TRANSPORT_MODE=http makes main.py default to FastMCP's HTTP transport even
# if Deployment overrides CMD without re-passing --transport.
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    MCP_TRANSPORT_MODE=http \
    HOST=0.0.0.0 \
    PORT=8080

# Default command — HTTP transport, bound to all interfaces so kubelet probes
# and in-cluster Service traffic can both reach it.
CMD ["python", "src/main.py", "--transport", "http", "--host", "0.0.0.0", "--port", "8080"]
