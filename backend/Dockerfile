FROM python:3.12-slim
WORKDIR /app
COPY requirements.lock .
RUN pip install --no-cache-dir -r requirements.lock
COPY app.py signin.html signin.js signin-interface.js ./
COPY brand/dockit-32.png ./brand/dockit-32.png
RUN useradd --create-home app
USER app
ENV PORT=8080
CMD ["sh", "-c", "exec uvicorn app:app --host 0.0.0.0 --port ${PORT}"]
