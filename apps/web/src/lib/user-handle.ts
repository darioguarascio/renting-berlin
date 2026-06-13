import { eq } from 'drizzle-orm';
import { db } from '../db';
import { reservedHandles, users } from '../db/schema';
import { isValidHandle, normalizeHandle } from './urls';

export async function getUserByHandle(handle: string) {
  const normalized = normalizeHandle(handle);
  if (!isValidHandle(normalized)) return null;
  return db.query.users.findFirst({ where: eq(users.handle, normalized) });
}

export async function getUserHandle(userId: string): Promise<string | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { handle: true },
  });
  return user?.handle ?? null;
}

export async function isHandleAvailable(handle: string): Promise<boolean> {
  const normalized = normalizeHandle(handle);
  if (!isValidHandle(normalized)) return false;

  const [reserved, existingUser] = await Promise.all([
    db.query.reservedHandles.findFirst({ where: eq(reservedHandles.handle, normalized) }),
    db.query.users.findFirst({ where: eq(users.handle, normalized), columns: { id: true } }),
  ]);

  return !reserved && !existingUser;
}

export async function setUserHandle(userId: string, handleInput: string) {
  const handle = normalizeHandle(handleInput);
  if (!isValidHandle(handle)) {
    throw new Error('Handle must be 3–30 characters, start with a letter, and use only lowercase letters, numbers, and underscores');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { handle: true },
  });
  if (!user) throw new Error('User not found');

  if (user.handle) {
    if (user.handle === handle) return user.handle;
    throw new Error('Your handle is permanent and cannot be changed');
  }

  const available = await isHandleAvailable(handle);
  if (!available) throw new Error('This handle is already taken');

  await db.transaction(async (tx) => {
    await tx.insert(reservedHandles).values({
      handle,
      userId,
      claimedAt: new Date(),
    });
    await tx
      .update(users)
      .set({ handle, updatedAt: new Date() })
      .where(eq(users.id, userId));
  });

  return handle;
}

export async function requireUserHandle(userId: string): Promise<string> {
  const handle = await getUserHandle(userId);
  if (!handle) {
    throw new Error('Set your account handle before posting a seeker profile');
  }
  return handle;
}
