from __future__ import annotations

import os
from dataclasses import dataclass

from PIL import Image

from ...config import MODERATION_USE_ML, UPLOADS_DIR
from .text import ModerationVerdict

NSFW_THRESHOLD = 0.7

_nsfw_pipeline = None


def _load_nsfw_pipeline():
    if not MODERATION_USE_ML:
        return None
    try:
        from transformers import pipeline

        return pipeline("image-classification", model="AdamCodd/vit-base-nsfw-detector")
    except Exception as err:
        print(f"Image ML moderation unavailable: {err}")
        return None


def _get_nsfw_pipeline():
    global _nsfw_pipeline
    if _nsfw_pipeline is None:
        _nsfw_pipeline = _load_nsfw_pipeline()
    return _nsfw_pipeline


def upload_path_from_url(url: str) -> str | None:
    if not url.startswith("/uploads/"):
        return None
    filename = os.path.basename(url)
    if ".." in filename:
        return None
    return os.path.join(UPLOADS_DIR, filename)


def moderate_image_file(file_path: str) -> ModerationVerdict:
    classifier = _get_nsfw_pipeline()
    if not classifier:
        return ModerationVerdict(True, 0.0, [])

    try:
        image = Image.open(file_path).convert("RGB")
        output = classifier(image)
        nsfw_hits = [
            item for item in output if item["label"].lower() == "nsfw" and item["score"] >= NSFW_THRESHOLD
        ]
        if not nsfw_hits:
            return ModerationVerdict(True, 0.0, [])

        score = max(item["score"] for item in nsfw_hits)
        return ModerationVerdict(False, score, [item["label"].lower() for item in nsfw_hits])
    except Exception as err:
        print(f"Image moderation failed for {file_path}: {err}")
        return ModerationVerdict(True, 0.0, [])


def moderate_image_url(photo_url: str) -> ModerationVerdict:
    file_path = upload_path_from_url(photo_url)
    if not file_path:
        return ModerationVerdict(True, 0.0, [])
    return moderate_image_file(file_path)
