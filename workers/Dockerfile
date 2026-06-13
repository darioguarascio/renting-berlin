# syntax=docker/dockerfile:1

FROM python:3.12-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends tini \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu \
  && pip install --no-cache-dir -r requirements.txt

COPY renting_berlin_workers ./renting_berlin_workers

ENV PYTHONUNBUFFERED=1
ENV UPLOADS_DIR=/app/uploads

RUN mkdir -p /app/uploads \
  && useradd --create-home --uid 1000 worker \
  && chown -R worker:worker /app

USER worker

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python3", "-m", "renting_berlin_workers", "notifications"]
