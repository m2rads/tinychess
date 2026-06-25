FROM node:20-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim
WORKDIR /app

# Install CPU-only torch to keep image size manageable (no GPU on free tier)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
# dist contains the built frontend, node_modules needed to serve cm-chessboard assets
COPY --from=frontend /app/frontend/dist ./frontend/dist
COPY --from=frontend /app/frontend/node_modules ./frontend/node_modules

EXPOSE 8000
CMD ["fastapi", "run", "main.py", "--host", "0.0.0.0", "--port", "8000"]
