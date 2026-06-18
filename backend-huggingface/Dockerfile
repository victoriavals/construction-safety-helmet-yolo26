FROM python:3.11-slim

# ffmpeg untuk re-encode video ke H.264; libgl1 untuk OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libgl1 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

ENV MODEL_PATH=model/best.pt
# HF Spaces mengharapkan app pada port 7860
EXPOSE 7860
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]
