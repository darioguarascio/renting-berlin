export type MessageTemplateKind = 'inquiry' | 'outreach' | 'general';

export interface MessageTemplate {
  id: string;
  label: string;
  body: string;
  kind: MessageTemplateKind;
  createdAt: string;
  updatedAt: string;
}

export function defaultTemplateLabel(body: string): string {
  const line = body.trim().split('\n')[0] ?? '';
  const trimmed = line.trim();
  if (trimmed.length <= 48) return trimmed || 'Untitled template';
  return `${trimmed.slice(0, 45)}…`;
}
