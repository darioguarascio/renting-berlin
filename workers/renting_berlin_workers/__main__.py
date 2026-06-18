from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

from .config import REDIS_KEYS
from .db import close_connection
from .metrics import start_metrics_server
from .services.agreements import process_agreement_job
from .services.email import process_email_job
from .services.email_worker import run_email_worker
from .services.moderation_handler import process_moderation_job
from .services.notifications import process_notification_job
from .services.profile_views import process_profile_view_job
from .services.telegram import process_telegram_job, run_telegram_worker
from .stream_worker import run_stream_worker

WORKERS = {
    "notifications": {
        "stream": REDIS_KEYS["notification_events"],
        "group": REDIS_KEYS["notification_workers"],
        "handler": lambda _id, data: process_notification_job(data),
        "env_name": "NOTIFICATION_WORKER_NAME",
    },
    "emails": {
        "stream": REDIS_KEYS["email_events"],
        "group": REDIS_KEYS["email_workers"],
        "handler": lambda _id, data: process_email_job(data),
        "env_name": "EMAIL_WORKER_NAME",
        "runner": "emails",
    },
    "moderation": {
        "stream": REDIS_KEYS["moderation_events"],
        "group": REDIS_KEYS["moderation_workers"],
        "handler": lambda _id, data: process_moderation_job(data),
        "env_name": "MODERATION_WORKER_NAME",
        "batch_size": 3,
    },
    "profile-views": {
        "stream": REDIS_KEYS["profile_view_events"],
        "group": REDIS_KEYS["profile_view_workers"],
        "handler": lambda _id, data: process_profile_view_job(data),
        "env_name": "PROFILE_VIEW_WORKER_NAME",
    },
    "telegram": {
        "stream": REDIS_KEYS["telegram_events"],
        "group": REDIS_KEYS["telegram_workers"],
        "handler": lambda _id, data: process_telegram_job(data),
        "env_name": "TELEGRAM_WORKER_NAME",
        "runner": "telegram",
    },
    "agreements": {
        "stream": REDIS_KEYS["agreement_events"],
        "group": REDIS_KEYS["agreement_workers"],
        "handler": lambda _id, data: process_agreement_job(data),
        "env_name": "AGREEMENT_WORKER_NAME",
    },
}


def main(argv: list[str] | None = None) -> int:
    repo_root = Path(__file__).resolve().parents[2]
    load_dotenv(repo_root / ".env")
    load_dotenv()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    parser = argparse.ArgumentParser(description="renting.berlin background worker")
    parser.add_argument(
        "worker",
        choices=sorted(WORKERS.keys()),
        help="which worker stream to consume",
    )
    args = parser.parse_args(argv)

    config = WORKERS[args.worker]

    start_metrics_server(args.worker)

    try:
        if config.get("runner") == "telegram":
            run_telegram_worker(
                config["stream"],
                config["group"],
                batch_size=config.get("batch_size", 10),
                consumer_name=os.environ.get(config["env_name"]),
            )
        elif config.get("runner") == "emails":
            run_email_worker(
                config["stream"],
                config["group"],
                batch_size=config.get("batch_size", 10),
                consumer_name=os.environ.get(config["env_name"]),
            )
        else:
            run_stream_worker(
                config["stream"],
                config["group"],
                config["handler"],
                batch_size=config.get("batch_size", 10),
                consumer_name=os.environ.get(config["env_name"]),
            )
    finally:
        close_connection()

    return 0


if __name__ == "__main__":
    sys.exit(main())
