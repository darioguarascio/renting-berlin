export interface MessageAttachment {
  url: string;
  name: string;
  mimeType: string;
}

export function isImageAttachment(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}
