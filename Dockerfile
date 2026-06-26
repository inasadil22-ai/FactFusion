FROM python:3.10-slim

WORKDIR /app

# Install system-level dependencies needed by OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 \
    libgl1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements straight from root level
COPY requirements.txt .

# Clear and standard installation of all requirements
# (Make sure opencv-python-headless and gunicorn are inside requirements.txt)
RUN pip install --no-cache-dir -r requirements.txt

# Copy all backend files into container workspace
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

# HF Spaces requires port 7860
EXPOSE 7860

# Run via gunicorn with safe timeouts
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--timeout", "300", "--workers", "1", "--threads", "4", "server:app"]