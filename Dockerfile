FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12.13 AS builder
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

RUN python -m venv .venv
COPY requirements.txt ./
# Install CPU-only torch first to avoid pulling in CUDA libraries
RUN .venv/bin/pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
# Install remaining deps, excluding torch since it's already installed
RUN grep -v "^torch" requirements.txt | .venv/bin/pip install --no-cache-dir -r /dev/stdin

FROM python:3.12.13-slim
WORKDIR /app
COPY --from=builder /app/.venv .venv/
COPY main.py .
COPY --from=frontend /app/frontend/dist ./frontend/dist
COPY --from=frontend /app/frontend/node_modules ./frontend/node_modules

CMD ["/app/.venv/bin/fastapi", "run", "main.py", "--host", "0.0.0.0", "--port", "8080"]
