import { describe, expect, it, vi, beforeEach } from 'vitest';

const { findFirst, deleteWhere } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  deleteWhere: vi.fn(),
}));

vi.mock('../db', () => ({
  db: {
    query: {
      conversations: { findFirst },
    },
    delete: vi.fn(() => ({ where: deleteWhere })),
  },
}));

import { deleteConversation } from './messages';

describe('deleteConversation', () => {
  beforeEach(() => {
    findFirst.mockReset();
    deleteWhere.mockReset();
    deleteWhere.mockResolvedValue(undefined);
  });

  it('throws when conversation does not exist', async () => {
    findFirst.mockResolvedValue(null);

    await expect(deleteConversation('conv_missing', 'user_1')).rejects.toThrow('Conversation not found');
    expect(deleteWhere).not.toHaveBeenCalled();
  });

  it('throws when user is not a participant', async () => {
    findFirst.mockResolvedValue({
      id: 'conv_1',
      publisherId: 'pub_1',
      inquirerId: 'inq_1',
    });

    await expect(deleteConversation('conv_1', 'stranger')).rejects.toThrow('Not a participant');
    expect(deleteWhere).not.toHaveBeenCalled();
  });

  it('deletes when user is the publisher', async () => {
    findFirst.mockResolvedValue({
      id: 'conv_1',
      publisherId: 'pub_1',
      inquirerId: 'inq_1',
    });

    await deleteConversation('conv_1', 'pub_1');
    expect(deleteWhere).toHaveBeenCalledOnce();
  });

  it('deletes when user is the inquirer', async () => {
    findFirst.mockResolvedValue({
      id: 'conv_1',
      publisherId: 'pub_1',
      inquirerId: 'inq_1',
    });

    await deleteConversation('conv_1', 'inq_1');
    expect(deleteWhere).toHaveBeenCalledOnce();
  });
});
