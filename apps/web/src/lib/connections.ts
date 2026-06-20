import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../db';
import { connectionInvites, connections, users } from '../db/schema';
import { notifyUser } from './notifications';
import { getSiteUrl } from './site-url';

export interface ConnectionUser {
  connectionId: string;
  userId: string;
  name: string;
  handle: string | null;
  image: string | null;
  since: string;
}

export interface InviteRecord {
  id: string;
  code: string;
  label: string | null;
  url: string;
  usedCount: number;
  maxUses: number | null;
  expiresAt: string | null;
  createdAt: string;
}

export function inviteUrl(code: string): string {
  return `${getSiteUrl()}/invite/${code}`;
}

function toInviteRecord(row: typeof connectionInvites.$inferSelect): InviteRecord {
  return {
    id: row.id,
    code: row.code,
    label: row.label,
    url: inviteUrl(row.code),
    usedCount: row.usedCount,
    maxUses: row.maxUses,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Returns the set of user ids the given user is connected to (accepted, either direction). */
export async function getConnectionUserIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ requesterId: connections.requesterId, addresseeId: connections.addresseeId })
    .from(connections)
    .where(
      and(
        eq(connections.status, 'accepted'),
        or(eq(connections.requesterId, userId), eq(connections.addresseeId, userId)),
      ),
    );
  return rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
}

export async function areConnected(a: string, b: string): Promise<boolean> {
  if (a === b) return true;
  const row = await db.query.connections.findFirst({
    where: and(
      eq(connections.status, 'accepted'),
      or(
        and(eq(connections.requesterId, a), eq(connections.addresseeId, b)),
        and(eq(connections.requesterId, b), eq(connections.addresseeId, a)),
      ),
    ),
  });
  return Boolean(row);
}

export async function listConnections(userId: string): Promise<ConnectionUser[]> {
  const rows = await db
    .select({
      connectionId: connections.id,
      requesterId: connections.requesterId,
      addresseeId: connections.addresseeId,
      createdAt: connections.createdAt,
    })
    .from(connections)
    .where(
      and(
        eq(connections.status, 'accepted'),
        or(eq(connections.requesterId, userId), eq(connections.addresseeId, userId)),
      ),
    )
    .orderBy(connections.createdAt);

  const otherIds = rows.map((r) => (r.requesterId === userId ? r.addresseeId : r.requesterId));
  if (otherIds.length === 0) return [];

  const people = await db.query.users.findMany({
    where: (table, { inArray }) => inArray(table.id, otherIds),
    columns: { id: true, name: true, handle: true, image: true },
  });
  const byId = new Map(people.map((p) => [p.id, p]));

  return rows.map((r) => {
    const otherId = r.requesterId === userId ? r.addresseeId : r.requesterId;
    const person = byId.get(otherId);
    return {
      connectionId: r.connectionId,
      userId: otherId,
      name: person?.name ?? 'Unknown',
      handle: person?.handle ?? null,
      image: person?.image ?? null,
      since: r.createdAt.toISOString(),
    };
  });
}

export async function createInvite(
  inviterId: string,
  opts: { label?: string; maxUses?: number | null; expiresInDays?: number | null } = {},
): Promise<InviteRecord> {
  const code = nanoid(12);
  const expiresAt =
    opts.expiresInDays && opts.expiresInDays > 0
      ? new Date(Date.now() + opts.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

  const [row] = await db
    .insert(connectionInvites)
    .values({
      id: nanoid(),
      code,
      inviterId,
      label: opts.label?.trim() || null,
      maxUses: opts.maxUses ?? null,
      expiresAt,
    })
    .returning();
  return toInviteRecord(row);
}

export async function listInvites(inviterId: string): Promise<InviteRecord[]> {
  const rows = await db.query.connectionInvites.findMany({
    where: and(eq(connectionInvites.inviterId, inviterId), isNull(connectionInvites.revokedAt)),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
  return rows.map(toInviteRecord);
}

export async function revokeInvite(inviterId: string, id: string): Promise<boolean> {
  const result = await db
    .update(connectionInvites)
    .set({ revokedAt: new Date() })
    .where(and(eq(connectionInvites.id, id), eq(connectionInvites.inviterId, inviterId)))
    .returning({ id: connectionInvites.id });
  return result.length > 0;
}

export type InviteAcceptResult =
  | { ok: true; alreadyConnected: boolean; inviter: { name: string; handle: string | null } }
  | { ok: false; reason: 'not_found' | 'expired' | 'exhausted' | 'self' };

export async function getInvitePreview(
  code: string,
): Promise<{ inviterName: string; inviterHandle: string | null; valid: boolean } | null> {
  const invite = await db.query.connectionInvites.findFirst({
    where: eq(connectionInvites.code, code),
  });
  if (!invite) return null;
  const inviter = await db.query.users.findFirst({
    where: eq(users.id, invite.inviterId),
    columns: { name: true, handle: true },
  });
  if (!inviter) return null;
  const valid =
    !invite.revokedAt &&
    (!invite.expiresAt || invite.expiresAt.getTime() > Date.now()) &&
    (invite.maxUses == null || invite.usedCount < invite.maxUses);
  return { inviterName: inviter.name, inviterHandle: inviter.handle, valid };
}

export async function acceptInvite(code: string, userId: string): Promise<InviteAcceptResult> {
  const invite = await db.query.connectionInvites.findFirst({
    where: eq(connectionInvites.code, code),
  });
  if (!invite || invite.revokedAt) return { ok: false, reason: 'not_found' };
  if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) {
    return { ok: false, reason: 'expired' };
  }
  if (invite.maxUses != null && invite.usedCount >= invite.maxUses) {
    return { ok: false, reason: 'exhausted' };
  }
  if (invite.inviterId === userId) return { ok: false, reason: 'self' };

  const inviter = await db.query.users.findFirst({
    where: eq(users.id, invite.inviterId),
    columns: { name: true, handle: true },
  });
  if (!inviter) return { ok: false, reason: 'not_found' };

  if (await areConnected(invite.inviterId, userId)) {
    return { ok: true, alreadyConnected: true, inviter };
  }

  await db
    .insert(connections)
    .values({
      id: nanoid(),
      requesterId: invite.inviterId,
      addresseeId: userId,
      status: 'accepted',
      respondedAt: new Date(),
    })
    .onConflictDoNothing();

  await db
    .update(connectionInvites)
    .set({ usedCount: sql`${connectionInvites.usedCount} + 1` })
    .where(eq(connectionInvites.id, invite.id));

  const joiner = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { name: true, handle: true },
  });
  const joinerLabel = joiner?.handle ? `@${joiner.handle}` : joiner?.name ?? 'Someone';
  await notifyUser({
    userId: invite.inviterId,
    event: 'connections',
    type: 'connection_accepted',
    title: 'New connection',
    body: `${joinerLabel} joined your circle.`,
    link: '/circle',
  });

  return { ok: true, alreadyConnected: false, inviter };
}

export async function removeConnection(userId: string, connectionId: string): Promise<boolean> {
  const result = await db
    .delete(connections)
    .where(
      and(
        eq(connections.id, connectionId),
        or(eq(connections.requesterId, userId), eq(connections.addresseeId, userId)),
      ),
    )
    .returning({ id: connections.id });
  return result.length > 0;
}
