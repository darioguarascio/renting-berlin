import os

REDIS_URL = os.environ.get("REDIS_URL", "")
DATABASE_URL = os.environ.get("DATABASE_URL", "")

CLICKHOUSE_URL = os.environ.get("CLICKHOUSE_URL", "")
CLICKHOUSE_DATABASE = os.environ.get("CLICKHOUSE_DATABASE", "renting_berlin")
CLICKHOUSE_USER = os.environ.get("CLICKHOUSE_USER", "default")
CLICKHOUSE_PASSWORD = os.environ.get("CLICKHOUSE_PASSWORD", "")

UPLOADS_DIR = os.environ.get("UPLOADS_DIR", "public/uploads")

SITE_URL = os.environ.get("SITE_URL") or os.environ.get("BETTER_AUTH_URL") or "http://localhost:4321"
SITE_URL = SITE_URL.rstrip("/")

MODERATION_USE_ML = os.environ.get("MODERATION_USE_ML", "0") == "1"

SMTP_HOST = os.environ.get("SMTP_HOST", "")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_SECURE = os.environ.get("SMTP_SECURE", "0") == "1"
SMTP_USER = os.environ.get("SMTP_USER", "")
SMTP_PASS = os.environ.get("SMTP_PASS", "")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "")

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.environ.get("TELEGRAM_CHAT_ID", "")

REDIS_KEYS = {
    "profile_view_events": "profile_views:events",
    "profile_view_workers": "profile-view-workers",
    "notification_events": "notifications:events",
    "notification_workers": "notification-workers",
    "email_events": "emails:events",
    "email_workers": "email-workers",
    "moderation_events": "moderation:events",
    "moderation_workers": "moderation-workers",
    "telegram_events": "telegram:events",
    "telegram_workers": "telegram-workers",
    "listings_index": "listings:active",
    "geo_index": "listings:geo",
}

LISTING_PATH_SEP = "--"
