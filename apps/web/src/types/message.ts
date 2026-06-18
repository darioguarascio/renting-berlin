export interface MessageAttachment {
  url: string;
  name: string;
  mimeType: string;
}

/** Structured payload that turns a message into an actionable card in the thread. */
export type MessageMetadata = {
  type: 'agreement';
  agreementId: string;
  /** Lifecycle event this message announced; the card always opens the live agreement. */
  event: 'proposed' | 'signed' | 'declined' | 'withdrawn';
};

export function isImageAttachment(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}
