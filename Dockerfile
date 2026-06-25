FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
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

# Download model weights from HuggingFace once at build time
RUN .venv/bin/python -c "\
from huggingface_hub import hf_hub_download; \
hf_hub_download(repo_id='m2rads/tinychess', filename='model_params.pt', revision='v0.0.9', local_dir='/app/models')"

FROM python:3.12.13-slim
WORKDIR /app
ENV MODEL_PATH=models/model_params.pt
COPY --from=builder /app/.venv .venv/
COPY --from=builder /app/models ./models
COPY main.py .
COPY --from=frontend /app/frontend/dist ./frontend/dist
COPY --from=frontend /app/frontend/node_modules ./frontend/node_modules

CMD ["/app/.venv/bin/fastapi", "run", "main.py", "--host", "0.0.0.0", "--port", "8080"]
