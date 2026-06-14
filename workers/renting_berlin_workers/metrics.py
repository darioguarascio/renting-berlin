from __future__ import annotations

import logging
import os
import time
from contextlib import contextmanager

from prometheus_client import REGISTRY, Counter, Gauge, Histogram, start_http_server

logger = logging.getLogger(__name__)

WORKER_NAME = "unknown"

workerUp = Gauge(
    "worker_up",
    "Whether the worker process is running",
    ["worker"],
    registry=REGISTRY,
)

workerJobsProcessedTotal = Counter(
    "worker_jobs_processed_total",
    "Total jobs processed by workers",
    ["worker", "stream", "status"],
    registry=REGISTRY,
)

workerJobDurationSeconds = Histogram(
    "worker_job_duration_seconds",
    "Job processing duration in seconds",
    ["worker", "stream"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120),
    registry=REGISTRY,
)

workerRedisErrorsTotal = Counter(
    "worker_redis_errors_total",
    "Redis connection errors in workers",
    ["worker", "stream"],
    registry=REGISTRY,
)

emailsTotal = Counter(
    "emails_total",
    "Email lifecycle events in workers",
    ["worker", "event", "status"],
    registry=REGISTRY,
)

emailSendDurationSeconds = Histogram(
    "email_send_duration_seconds",
    "SMTP send duration in seconds",
    ["worker", "event", "status"],
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60),
    registry=REGISTRY,
)

emailsBufferedTotal = Counter(
    "emails_buffered_total",
    "Emails buffered for digest or quiet hours",
    ["worker", "event"],
    registry=REGISTRY,
)

emailsFlushedTotal = Counter(
    "emails_flushed_total",
    "Buffered emails flushed and sent",
    ["worker"],
    registry=REGISTRY,
)


def metrics_enabled() -> bool:
    return os.environ.get("METRICS_ENABLED", "1") != "0"


def configure_worker(worker_name: str) -> None:
    global WORKER_NAME
    WORKER_NAME = worker_name


def start_metrics_server(worker_name: str) -> None:
    configure_worker(worker_name)
    if not metrics_enabled():
        logger.info("Metrics disabled for worker %s", worker_name)
        return

    port = int(os.environ.get("METRICS_PORT", "9090"))
    start_http_server(port, addr="0.0.0.0", registry=REGISTRY)
    workerUp.labels(worker=worker_name).set(1)
    logger.info("Metrics server listening on 0.0.0.0:%s (worker=%s)", port, worker_name)


@contextmanager
def observe_job(stream_key: str):
    start = time.perf_counter()
    status = "success"
    try:
        yield
    except Exception:
        status = "error"
        raise
    finally:
        if not metrics_enabled():
            return
        duration = time.perf_counter() - start
        labels = {"worker": WORKER_NAME, "stream": stream_key, "status": status}
        workerJobsProcessedTotal.labels(**labels).inc()
        workerJobDurationSeconds.labels(worker=WORKER_NAME, stream=stream_key).observe(duration)


def record_redis_error(stream_key: str) -> None:
    if not metrics_enabled():
        return
    workerRedisErrorsTotal.labels(worker=WORKER_NAME, stream=stream_key).inc()


def record_email(event: str, status: str, duration_seconds: float | None = None) -> None:
    if not metrics_enabled():
        return
    emailsTotal.labels(worker=WORKER_NAME, event=event or "unknown", status=status).inc()
    if duration_seconds is not None:
        emailSendDurationSeconds.labels(
            worker=WORKER_NAME,
            event=event or "unknown",
            status=status,
        ).observe(duration_seconds)


def record_email_buffered(event: str) -> None:
    if not metrics_enabled():
        return
    emailsBufferedTotal.labels(worker=WORKER_NAME, event=event or "unknown").inc()


def record_email_flush(count: int) -> None:
    if not metrics_enabled():
        return
    if count > 0:
        emailsFlushedTotal.labels(worker=WORKER_NAME).inc(count)
