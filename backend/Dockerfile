FROM python:3.10-slim

WORKDIR /app
ARG CACHE_BUST=3

# System dependencies for OpenCV / Headless environment
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# 1. Install requirements first (better layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. Copy everything else — flat layout, no backend/ subfolder.
#    All .py files (server.py, model_service.py, multimodal_service.py,
#    xai_service.py, download_models.py, config.py, database.py) and any
#    other root-level assets live directly in /app.
COPY . .

EXPOSE 7860

# 3. server.py sits at the root now, so it's just server:app — no
#    PYTHONPATH or package-path tricks required.
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--timeout", "300", "--workers", "1", "--threads", "4", "server:app"]