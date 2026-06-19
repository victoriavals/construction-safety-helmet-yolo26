FROM python:3.11-slim

# ffmpeg untuk re-encode video ke H.264; libgl1 untuk OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libgl1 && rm -rf /var/lib/apt/lists/*

# User non-root (uid 1000) — praktik baik & sesuai rekomendasi HF Spaces.
RUN useradd -m -u 1000 appuser

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HOME=/home/appuser \
    YOLO_CONFIG_DIR=/home/appuser/.config/Ultralytics \
    MPLCONFIGDIR=/home/appuser/.config/matplotlib \
    YOLO_AUTOINSTALL=false \
    MODEL_PATH=model/best.pt

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Siapkan direktori tulis untuk ultralytics/matplotlib & serahkan kepemilikan ke user non-root.
RUN mkdir -p /home/appuser/.config/Ultralytics /home/appuser/.config/matplotlib \
    && chown -R appuser:appuser /app /home/appuser

USER appuser

# HF Spaces mengharapkan app pada port 7860
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
