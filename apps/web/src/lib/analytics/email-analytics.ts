import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../../db';
import { emailSends, emailTrackingEvents } from '../../db/schema';
import { clickhouseConfigured, getClickHouse } from '../clickhouse/client';

type EmailSendRecord = {
  id: string;
  links: string[];
};

async function createEmailSendPg(
  input: {
    toEmail: string;
    userId?: string | null;
    category: string;
    subject: string;
    links: string[];
  },
  id = nanoid(),
): Promise<string> {
  await db.insert(emailSends).values({
    id,
    userId: input.userId ?? null,
    toEmail: input.toEmail,
    category: input.category,
    subject: input.subject,
    links: input.links,
  });
  return id;
}

async function getEmailSendCh(sendId: string): Promise<EmailSendRecord | null> {
  if (!clickhouseConfigured()) return null;

  try {
    const ch = await getClickHouse();
    if (!ch) return null;

    const result = await ch.query({
      query: `
        SELECT id, links
        FROM email_sends
        WHERE id = {sendId:String}
        LIMIT 1
      `,
      query_params: { sendId },
      format: 'JSONEachRow',
    });
    const rows = await result.json<{ id: string; links: string[] }>();
    return rows[0] ?? null;
  } catch (error) {
    console.warn('[email] ClickHouse send lookup failed:', error);
    return null;
  }
}

async function getEmailSendPg(sendId: string): Promise<EmailSendRecord | null> {
  const send = await db.query.emailSends.findFirst({ where: eq(emailSends.id, sendId) });
  if (!send) return null;
  return { id: send.id, links: send.links };
}

async function recordEmailEventPg(input: {
  sendId: string;
  type: 'open' | 'click';
  linkIndex?: number | null;
  userAgent: string | null;
  ipAddress: string | null;
}): Promise<void> {
  await db.insert(emailTrackingEvents).values({
    id: nanoid(),
    sendId: input.sendId,
    type: input.type,
    linkIndex: input.linkIndex ?? null,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });
}

export async function createEmailSend(input: {
  toEmail: string;
  userId?: string | null;
  category: string;
  subject: string;
  links: string[];
}): Promise<string> {
  const id = nanoid();
  await createEmailSendPg(input, id);

  if (clickhouseConfigured()) {
    try {
      const ch = await getClickHouse();
      if (ch) {
        await ch.insert({
          table: 'email_sends',
          values: [
            {
              id,
              user_id: input.userId ?? null,
              to_email: input.toEmail,
              category: input.category,
              subject: input.subject,
              links: input.links,
              created_at: new Date(),
            },
          ],
          format: 'JSONEachRow',
        });
      }
    } catch (error) {
      console.warn('[email] ClickHouse send mirror failed:', error);
    }
  }

  return id;
}

export async function getEmailSend(sendId: string): Promise<EmailSendRecord | null> {
  const pg = await getEmailSendPg(sendId);
  if (pg) return pg;

  return getEmailSendCh(sendId);
}

export async function recordEmailEvent(input: {
  sendId: string;
  type: 'open' | 'click';
  linkIndex?: number | null;
  userAgent: string | null;
  ipAddress: string | null;
}): Promise<void> {
  if (clickhouseConfigured()) {
    try {
      const ch = await getClickHouse();
      if (ch) {
        await ch.insert({
          table: 'email_events',
          values: [
            {
              id: nanoid(),
              send_id: input.sendId,
              event_type: input.type,
              link_index: input.linkIndex ?? null,
              user_agent: input.userAgent,
              ip_address: input.ipAddress,
              created_at: new Date(),
            },
          ],
          format: 'JSONEachRow',
        });
        return;
      }
    } catch (error) {
      console.warn('[email] ClickHouse event mirror failed:', error);
    }
  }

  await recordEmailEventPg(input);
}
