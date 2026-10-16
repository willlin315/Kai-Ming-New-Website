FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend ./backend
COPY content/people.json content/blog-posts.json ./content/
RUN useradd --create-home cms
USER cms
CMD ["sh", "-c", "uvicorn backend.asgi:app --host 0.0.0.0 --port ${PORT:-8000}"]
