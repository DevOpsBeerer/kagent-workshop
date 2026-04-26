# syntax=docker/dockerfile:1.7

# ============================================================================
# Stage 1 — Build the React SPA with Vite
# ============================================================================
FROM node:24-alpine AS frontend-build
WORKDIR /app/frontend

RUN corepack enable && corepack prepare pnpm@10 --activate

COPY frontend/package.json frontend/pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

COPY frontend/ ./
RUN pnpm build

# ============================================================================
# Stage 2 — Python runtime serving FastAPI + the built SPA
# ============================================================================
FROM python:3.12-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    LIGHT_MANAGER_STATIC_DIR=/app/static \
    LIGHT_MANAGER_DB_PATH=/data/light-manager.db

COPY backend/pyproject.toml ./pyproject.toml
COPY backend/app ./app
RUN pip install --no-cache-dir .

COPY --from=frontend-build /app/frontend/dist ./static

RUN mkdir -p /data

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/health').status == 200 else 1)" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
