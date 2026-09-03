FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
# Railway/Cloud Run inject $PORT and route to it; fall back to 8000 locally.
# `sh -c` is required — the exec form would not expand ${PORT}.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
