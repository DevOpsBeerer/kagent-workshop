# apps/lunar-rover-telemetry/Dockerfile — UC3 + UC4 source app variant (FR-007).
# Forked from apps/_skeleton/Dockerfile; adds the lunar-rover-telemetry default
# identity and inherits the same multi-stage shape.

# syntax=docker/dockerfile:1.7

# ---------- builder ----------
FROM --platform=linux/amd64 python:3.12-slim AS builder

WORKDIR /build

# Use an isolated prefix so `--copy` to runtime is straightforward.
ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_ROOT_USER_ACTION=ignore

COPY pyproject.toml ./
COPY main.py ./

RUN python -m pip install --upgrade pip \
 && python -m pip install --prefix=/install .

# ---------- runtime ----------
FROM --platform=linux/amd64 python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_IDENTITY="lunar-rover-telemetry" \
    PORT=8000


RUN apt update && apt install curl -y

# Non-root user
RUN groupadd --system --gid 10001 app \
 && useradd  --system --uid 10001 --gid 10001 --home-dir /app --shell /sbin/nologin app

WORKDIR /app

# Copy installed packages + the app module from the builder
COPY --from=builder /install /usr/local
COPY --from=builder /build/main.py ./

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD python -c "import urllib.request, sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=2).status == 200 else 1)" \
  || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
