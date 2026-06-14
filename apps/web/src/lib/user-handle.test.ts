import { describe, expect, it, vi, beforeEach } from 'vitest';

const {
  findFirstUser,
  findFirstReserved,
  insertReserved,
  updateUser,
  transaction,
} = vi.hoisted(() => ({
  findFirstUser: vi.fn(),
  findFirstReserved: vi.fn(),
  insertReserved: vi.fn(),
  updateUser: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('../db', () => ({
  db: {
    query: {
      users: { findFirst: findFirstUser },
      reservedHandles: { findFirst: findFirstReserved },
    },
    transaction,
  },
}));

import { getUserByHandle, getUserHandle, isHandleAvailable, requireUserHandle, setUserHandle } from './user-handle';
import { HANDLE_MIN_LENGTH } from './urls';

describe('getUserHandle', () => {
  beforeEach(() => {
    findFirstUser.mockReset();
  });

  it('returns stored handle', async () => {
    findFirstUser.mockResolvedValue({ handle: 'my_handle' });
    await expect(getUserHandle('user_1')).resolves.toBe('my_handle');
  });

  it('returns null when unset', async () => {
    findFirstUser.mockResolvedValue({ handle: null });
    await expect(getUserHandle('user_1')).resolves.toBeNull();
  });
});

describe('getUserByHandle', () => {
  beforeEach(() => {
    findFirstUser.mockReset();
  });

  it('returns null for invalid handles', async () => {
    await expect(getUserByHandle('ab')).resolves.toBeNull();
  });

  it('loads users by normalized handle', async () => {
    findFirstUser.mockResolvedValue({ id: 'user_1', handle: 'my_handle' });
    await expect(getUserByHandle('@My_Handle')).resolves.toMatchObject({ id: 'user_1' });
  });
});

describe('requireUserHandle', () => {
  beforeEach(() => {
    findFirstUser.mockReset();
  });

  it('throws when handle is missing', async () => {
    findFirstUser.mockResolvedValue({ handle: null });
    await expect(requireUserHandle('user_1')).rejects.toThrow('Set your account handle');
  });

  it('returns the handle when set', async () => {
    findFirstUser.mockResolvedValue({ handle: 'my_handle' });
    await expect(requireUserHandle('user_1')).resolves.toBe('my_handle');
  });
});

describe('isHandleAvailable', () => {
  beforeEach(() => {
    findFirstReserved.mockReset();
    findFirstUser.mockReset();
  });

  it('rejects invalid handles', async () => {
    expect(await isHandleAvailable('ab')).toBe(false);
    expect(findFirstReserved).not.toHaveBeenCalled();
  });

  it('returns false when handle is reserved', async () => {
    findFirstReserved.mockResolvedValue({ handle: 'taken_handle' });
    findFirstUser.mockResolvedValue(null);

    expect(await isHandleAvailable('taken_handle')).toBe(false);
  });

  it('returns false when handle is assigned to a user', async () => {
    findFirstReserved.mockResolvedValue(null);
    findFirstUser.mockResolvedValue({ id: 'user_1' });

    expect(await isHandleAvailable('active_user')).toBe(false);
  });

  it('returns true when handle is free', async () => {
    findFirstReserved.mockResolvedValue(null);
    findFirstUser.mockResolvedValue(null);

    expect(await isHandleAvailable('free_handle')).toBe(true);
  });
});

describe('setUserHandle', () => {
  beforeEach(() => {
    findFirstUser.mockReset();
    findFirstReserved.mockReset();
    transaction.mockReset();
    insertReserved.mockResolvedValue(undefined);
    updateUser.mockResolvedValue(undefined);
    transaction.mockImplementation(async (fn) =>
      fn({
        insert: vi.fn(() => ({ values: insertReserved })),
        update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateUser })) })),
      }),
    );
  });

  it('returns existing handle without updating when unchanged', async () => {
    findFirstUser.mockResolvedValue({ handle: 'my_handle' });

    await expect(setUserHandle('user_1', 'my_handle')).resolves.toBe('my_handle');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects handle changes', async () => {
    findFirstUser.mockResolvedValue({ handle: 'old_handle' });

    await expect(setUserHandle('user_1', 'new_handle')).rejects.toThrow('permanent');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('claims a new handle in a transaction', async () => {
    findFirstUser.mockResolvedValueOnce({ handle: null });
    findFirstReserved.mockResolvedValue(null);
    findFirstUser.mockResolvedValueOnce(null);

    await expect(setUserHandle('user_1', 'new_handle')).resolves.toBe('new_handle');
    expect(transaction).toHaveBeenCalledOnce();
    expect(insertReserved).toHaveBeenCalledWith({
      handle: 'new_handle',
      userId: 'user_1',
      claimedAt: expect.any(Date),
    });
  });

  it('rejects taken handles', async () => {
    findFirstUser.mockResolvedValue({ handle: null });
    findFirstReserved.mockResolvedValue({ handle: 'taken_handle' });

    await expect(setUserHandle('user_1', 'taken_handle')).rejects.toThrow('already taken');
    expect(transaction).not.toHaveBeenCalled();
  });
});
