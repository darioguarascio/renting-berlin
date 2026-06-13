import { and, desc, eq, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { messageTemplates } from '../db/schema';
import {
  defaultTemplateLabel,
  type MessageTemplate,
  type MessageTemplateKind,
} from '../types/message-template';

export type { MessageTemplate, MessageTemplateKind };
export { defaultTemplateLabel };

function toTemplate(row: typeof messageTemplates.$inferSelect): MessageTemplate {
  return {
    id: row.id,
    label: row.label,
    body: row.body,
    kind: row.kind,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listMessageTemplates(
  userId: string,
  kind?: MessageTemplateKind,
): Promise<MessageTemplate[]> {
  const rows = await db.query.messageTemplates.findMany({
    where: kind
      ? and(
          eq(messageTemplates.userId, userId),
          or(eq(messageTemplates.kind, kind), eq(messageTemplates.kind, 'general')),
        )
      : eq(messageTemplates.userId, userId),
    orderBy: [desc(messageTemplates.updatedAt)],
  });
  return rows.map(toTemplate);
}

export async function createMessageTemplate(
  userId: string,
  input: { label: string; body: string; kind?: MessageTemplateKind },
): Promise<MessageTemplate> {
  const label = input.label.trim();
  const body = input.body.trim();
  if (!label) throw new Error('Template name is required');
  if (!body) throw new Error('Template body is required');

  const [row] = await db
    .insert(messageTemplates)
    .values({
      id: nanoid(),
      userId,
      label,
      body,
      kind: input.kind ?? 'general',
    })
    .returning();

  return toTemplate(row);
}

export async function deleteMessageTemplate(userId: string, templateId: string): Promise<boolean> {
  const result = await db
    .delete(messageTemplates)
    .where(and(eq(messageTemplates.id, templateId), eq(messageTemplates.userId, userId)))
    .returning({ id: messageTemplates.id });
  return result.length > 0;
}

export async function saveMessageAsTemplate(
  userId: string,
  body: string,
  options: { saveAsTemplate?: boolean; templateLabel?: string; kind?: MessageTemplateKind },
): Promise<MessageTemplate | null> {
  if (!options.saveAsTemplate) return null;
  const trimmed = body.trim();
  if (!trimmed) return null;

  return createMessageTemplate(userId, {
    label: options.templateLabel?.trim() || defaultTemplateLabel(trimmed),
    body: trimmed,
    kind: options.kind ?? 'general',
  });
}
