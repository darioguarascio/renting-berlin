from __future__ import annotations

import re
from dataclasses import dataclass

from ...config import MODERATION_USE_ML

SPAM_PATTERNS = [
    re.compile(r"\b(viagra|cialis|casino|forex|crypto giveaway|work from home)\b", re.I),
    re.compile(r"\b(click here|limited time|act now|100% free)\b", re.I),
    re.compile(r"(\bhttps?://[^\s]+\b.*){3,}", re.I),
    re.compile(r"(.)\1{12,}"),
    re.compile(r"\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b"),
]

PROFANITY = {
    "fuck",
    "shit",
    "bitch",
    "asshole",
    "cunt",
    "dick",
    "porn",
    "xxx",
    "nazi",
}

TOXICITY_THRESHOLD = 0.65
SPAM_SCORE_THRESHOLD = 0.55

_toxicity_pipeline = None


@dataclass
class ModerationVerdict:
    approved: bool
    score: float
    labels: list[str]


def _load_toxicity_pipeline():
    if not MODERATION_USE_ML:
        return None
    try:
        from transformers import pipeline

        return pipeline("text-classification", model="unitary/toxic-bert")
    except Exception as err:
        print(f"Text ML moderation unavailable, using rules only: {err}")
        return None


def _get_toxicity_pipeline():
    global _toxicity_pipeline
    if _toxicity_pipeline is None:
        _toxicity_pipeline = _load_toxicity_pipeline()
    return _toxicity_pipeline


def rule_based_text_score(text: str) -> ModerationVerdict:
    labels: list[str] = []
    score = 0.0
    normalized = text.strip()

    if not normalized:
        return ModerationVerdict(True, 0.0, [])

    for pattern in SPAM_PATTERNS:
        if pattern.search(normalized):
            labels.append("spam_pattern")
            score = max(score, 0.75)

    words = re.findall(r"[a-z']+", normalized.lower())
    profanity_hits = [word for word in words if word in PROFANITY]
    if profanity_hits:
        labels.append("profanity")
        score = max(score, 0.6 + min(len(profanity_hits) * 0.05, 0.3))

    letters = re.sub(r"[^a-zA-Z]", "", normalized)
    if len(letters) >= 20:
        caps = len(re.sub(r"[^A-Z]", "", letters)) / len(letters)
        if caps >= 0.65:
            labels.append("excessive_caps")
            score = max(score, 0.45)

    if len(words) >= 30 and len(set(words)) / max(len(words), 1) < 0.35:
        labels.append("repetitive")
        score = max(score, 0.5)

    return ModerationVerdict(score < SPAM_SCORE_THRESHOLD, score, labels)


def moderate_text(text: str) -> ModerationVerdict:
    rules = rule_based_text_score(text)
    classifier = _get_toxicity_pipeline()
    if not classifier:
        return rules

    try:
        output = classifier(text[:512], top_k=None)
        toxic_labels = [
            item
            for item in output
            if item["label"] != "non-toxic" and item["score"] >= TOXICITY_THRESHOLD
        ]
        if not toxic_labels:
            return rules

        ml_score = max(item["score"] for item in toxic_labels)
        labels = list(dict.fromkeys([*rules.labels, *(item["label"] for item in toxic_labels)]))
        score = max(rules.score, ml_score)
        return ModerationVerdict(not toxic_labels and rules.approved, score, labels)
    except Exception:
        return rules
