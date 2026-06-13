export type ModerationVerdict = {
  approved: boolean;
  score: number;
  labels: string[];
};

const SPAM_PATTERNS: RegExp[] = [
  /\b(viagra|cialis|casino|forex|crypto giveaway|work from home)\b/i,
  /\b(click here|limited time|act now|100% free)\b/i,
  /(\bhttps?:\/\/[^\s]+\b.*){3,}/i,
  /(.)\1{12,}/,
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
];

const PROFANITY = new Set([
  'fuck',
  'shit',
  'bitch',
  'asshole',
  'cunt',
  'dick',
  'porn',
  'xxx',
  'nazi',
]);

const SPAM_SCORE_THRESHOLD = 0.55;

function ruleBasedTextScore(text: string): ModerationVerdict {
  const labels: string[] = [];
  let score = 0;

  const normalized = text.trim();
  if (!normalized) {
    return { approved: true, score: 0, labels: [] };
  }

  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(normalized)) {
      labels.push('spam_pattern');
      score = Math.max(score, 0.75);
    }
  }

  const words = normalized.toLowerCase().match(/[a-z']+/g) ?? [];
  const profanityHits = words.filter((word) => PROFANITY.has(word));
  if (profanityHits.length > 0) {
    labels.push('profanity');
    score = Math.max(score, 0.6 + Math.min(profanityHits.length * 0.05, 0.3));
  }

  const letters = normalized.replace(/[^a-zA-Z]/g, '');
  if (letters.length >= 20) {
    const caps = letters.replace(/[^A-Z]/g, '').length / letters.length;
    if (caps >= 0.65) {
      labels.push('excessive_caps');
      score = Math.max(score, 0.45);
    }
  }

  const uniqueWordRatio = new Set(words).size / Math.max(words.length, 1);
  if (words.length >= 30 && uniqueWordRatio < 0.35) {
    labels.push('repetitive');
    score = Math.max(score, 0.5);
  }

  return {
    approved: score < SPAM_SCORE_THRESHOLD,
    score,
    labels,
  };
}

export async function moderateText(text: string): Promise<ModerationVerdict> {
  return ruleBasedTextScore(text);
}
