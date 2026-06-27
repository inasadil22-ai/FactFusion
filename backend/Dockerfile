FROM python:3.10-slim

WORKDIR /app
ARG CACHE_BUST=3

# System dependencies for OpenCV / Headless environment
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# 1. Sabse pehle requirements copy karke install karein
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 2. Poora backend folder container ke andar copy karein
COPY backend/ ./backend/
COPY README.md .
COPY config.py .
COPY database.py .
COPY model_service.py .
COPY multimodal_service.py .
COPY xai_service.py .
COPY download_models.py .
COPY settings.json .
COPY test_atlas.py .

# 3. Code execution path set karein (Taake python ko server module mil jaye)
ENV PYTHONPATH=/app/backend:/app

EXPOSE 7860

# 4. Gunicorn ko exact path batayein ke server:app backend folder ke andar hai
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--timeout", "300", "--workers", "1", "--threads", "4", "backend.server:app"]