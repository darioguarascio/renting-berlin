import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findFirstListing,
  findFirstConversation,
  findFirstRequest,
  findFirstMessage,
  findManyConversations,
  findManyMessages,
  findManyListings,
  findManyRequests,
  findManyUsers,
  findFirstUser,
  insertReturning,
  updateWhere,
  deleteWhere,
  selectOrderBy,
  selectWhere,
  getNotificationPreferences,
  saveMessageAsTemplate,
  getUserPublicProfileInfos,
  notifyListingActivityEmail,
  notifyNewMessageEmail,
} = vi.hoisted(() => ({
  findFirstListing: vi.fn(),
  findFirstConversation: vi.fn(),
  findFirstRequest: vi.fn(),
  findFirstMessage: vi.fn(),
  findManyConversations: vi.fn(),
  findManyMessages: vi.fn(),
  findManyListings: vi.fn(),
  findManyRequests: vi.fn(),
  findManyUsers: vi.fn(),
  findFirstUser: vi.fn(),
  insertReturning: vi.fn(),
  updateWhere: vi.fn(),
  deleteWhere: vi.fn(),
  selectOrderBy: vi.fn(),
  selectWhere: vi.fn(),
  getNotificationPreferences: vi.fn(),
  saveMessageAsTemplate: vi.fn(),
  getUserPublicProfileInfos: vi.fn(),
  notifyListingActivityEmail: vi.fn(),
  notifyNewMessageEmail: vi.fn(),
}));

vi.mock('../db', () => ({
  db: {
    query: {
      listings: { findFirst: findFirstListing, findMany: findManyListings },
      conversations: { findFirst: findFirstConversation, findMany: findManyConversations },
      tenantRequests: { findFirst: findFirstRequest, findMany: findManyRequests },
      messages: { findFirst: findFirstMessage, findMany: findManyMessages },
      users: { findMany: findManyUsers, findFirst: findFirstUser },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: insertReturning,
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: updateWhere,
      })),
    })),
    delete: vi.fn(() => ({
      where: deleteWhere,
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: selectOrderBy,
          then(onFulfilled: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) {
            return Promise.resolve(selectWhere()).then(onFulfilled, onRejected);
          },
        })),
      })),
    })),
  },
}));

vi.mock('./notification-preferences', () => ({
  getNotificationPreferences,
}));

vi.mock('./message-templates', () => ({
  saveMessageAsTemplate,
}));

vi.mock('./user-public-profile', () => ({
  getUserPublicProfileInfos,
}));

vi.mock('./user-notifications', () => ({
  notifyListingActivityEmail,
  notifyNewMessageEmail,
}));

import {
  deleteConversation,
  getConversationWithMessages,
  getOrCreateListingConversation,
  getOrCreateSeekerConversation,
  getUnreadCount,
  listConversationsForUser,
  sendMessage,
  startConversationWithMessage,
} from './messages';

const conversation = {
  id: 'conv_1',
  listingId: 'listing_1',
  tenantRequestId: null,
  publisherId: 'pub_1',
  inquirerId: 'inq_1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

describe('getOrCreateListingConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getNotificationPreferences.mockResolvedValue({ acceptInquiries: true });
  });

  it('throws when listing is missing', async () => {
    findFirstListing.mockResolvedValue(null);
    await expect(getOrCreateListingConversation('listing_1', 'inq_1')).rejects.toThrow('Listing not found');
  });

  it('throws when messaging own listing', async () => {
    findFirstListing.mockResolvedValue({ id: 'listing_1', publisherId: 'inq_1' });
    await expect(getOrCreateListingConversation('listing_1', 'inq_1')).rejects.toThrow('Cannot message your own listing');
  });

  it('throws when publisher is not accepting inquiries', async () => {
    findFirstListing.mockResolvedValue({ id: 'listing_1', publisherId: 'pub_1' });
    getNotificationPreferences.mockResolvedValue({ acceptInquiries: false });
    await expect(getOrCreateListingConversation('listing_1', 'inq_1')).rejects.toThrow('not accepting new inquiries');
  });

  it('returns an existing conversation', async () => {
    findFirstListing.mockResolvedValue({ id: 'listing_1', publisherId: 'pub_1' });
    findFirstConversation.mockResolvedValue(conversation);

    await expect(getOrCreateListingConversation('listing_1', 'inq_1')).resolves.toEqual(conversation);
    expect(insertReturning).not.toHaveBeenCalled();
  });

  it('creates a new listing conversation', async () => {
    findFirstListing.mockResolvedValue({ id: 'listing_1', publisherId: 'pub_1' });
    findFirstConversation.mockResolvedValue(null);
    insertReturning.mockResolvedValue([conversation]);

    await expect(getOrCreateListingConversation('listing_1', 'inq_1')).resolves.toEqual(conversation);
  });
});

describe('getOrCreateSeekerConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getNotificationPreferences.mockResolvedValue({ acceptInquiries: true });
  });

  it('throws when seeker profile is missing', async () => {
    findFirstRequest.mockResolvedValue(null);
    await expect(getOrCreateSeekerConversation('req_1', 'inq_1')).rejects.toThrow('Seeker profile not found');
  });

  it('throws when messaging own profile', async () => {
    findFirstRequest.mockResolvedValue({ id: 'req_1', seekerId: 'inq_1', status: 'active' });
    await expect(getOrCreateSeekerConversation('req_1', 'inq_1')).rejects.toThrow('Cannot message your own profile');
  });

  it('throws when seeker profile is inactive', async () => {
    findFirstRequest.mockResolvedValue({ id: 'req_1', seekerId: 'seeker_1', status: 'draft' });
    await expect(getOrCreateSeekerConversation('req_1', 'inq_1')).rejects.toThrow('not active');
  });

  it('creates a seeker conversation', async () => {
    findFirstRequest.mockResolvedValue({ id: 'req_1', seekerId: 'seeker_1', status: 'active' });
    findFirstConversation.mockResolvedValue(null);
    insertReturning.mockResolvedValue([{ ...conversation, listingId: null, tenantRequestId: 'req_1' }]);

    await expect(getOrCreateSeekerConversation('req_1', 'inq_1')).resolves.toMatchObject({
      tenantRequestId: 'req_1',
    });
  });
});

describe('sendMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFirstConversation.mockResolvedValue(conversation);
    insertReturning.mockResolvedValue([{ id: 'msg_1', body: 'Hello' }]);
    updateWhere.mockResolvedValue(undefined);
    saveMessageAsTemplate.mockResolvedValue(undefined);
  });

  it('rejects empty messages', async () => {
    await expect(sendMessage('conv_1', 'inq_1', '   ')).rejects.toThrow('Message cannot be empty');
  });

  it('rejects non-participants', async () => {
    await expect(sendMessage('conv_1', 'stranger', 'Hello')).rejects.toThrow('Not a participant');
  });

  it('stores a message and optionally saves a template', async () => {
    await sendMessage('conv_1', 'inq_1', 'Hello there', {
      saveAsTemplate: true,
      templateLabel: 'Intro',
      templateKind: 'inquiry',
    });

    expect(insertReturning).toHaveBeenCalledOnce();
    expect(saveMessageAsTemplate).toHaveBeenCalledOnce();
  });

  it('infers outreach templates for seeker conversations', async () => {
    findFirstConversation.mockResolvedValue({
      ...conversation,
      listingId: null,
      tenantRequestId: 'req_1',
    });

    await sendMessage('conv_1', 'inq_1', 'Hello there', { saveAsTemplate: true });

    expect(saveMessageAsTemplate).toHaveBeenCalledWith(
      'inq_1',
      'Hello there',
      expect.objectContaining({ kind: 'outreach' }),
    );
  });

  it('emails the publisher about the first listing inquiry', async () => {
    selectWhere.mockResolvedValue([{ count: 1 }]);
    findFirstUser.mockResolvedValue({ name: 'Inquirer' });
    findFirstListing.mockResolvedValue({
      id: 'listing_1',
      title: 'Bright flat',
      slug: 'bright-flat',
      shortCode: 'abc12345',
    });

    await sendMessage('conv_1', 'inq_1', 'Is it still available?');

    await vi.waitFor(() => {
      expect(notifyListingActivityEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          publisherId: 'pub_1',
          title: 'New inquiry on Bright flat',
        }),
      );
    });
    expect(notifyNewMessageEmail).not.toHaveBeenCalled();
  });

  it('emails the other participant for follow-up messages', async () => {
    selectWhere.mockResolvedValue([{ count: 2 }]);
    findFirstUser.mockResolvedValue({ name: 'Publisher' });

    await sendMessage('conv_1', 'pub_1', 'Thanks for reaching out');

    await vi.waitFor(() => {
      expect(notifyNewMessageEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: 'inq_1',
          senderName: 'Publisher',
          conversationId: 'conv_1',
        }),
      );
    });
    expect(notifyListingActivityEmail).not.toHaveBeenCalled();
  });
});

describe('startConversationWithMessage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getNotificationPreferences.mockResolvedValue({ acceptInquiries: true });
    findFirstListing.mockResolvedValue({ id: 'listing_1', publisherId: 'pub_1' });
    findFirstConversation.mockResolvedValue(conversation);
    findFirstMessage.mockResolvedValue(null);
    insertReturning.mockResolvedValue([{ id: 'msg_1' }]);
    updateWhere.mockResolvedValue(undefined);
  });

  it('validates input', async () => {
    await expect(startConversationWithMessage({ userId: 'inq_1', body: '   ' })).rejects.toThrow(
      'Message cannot be empty',
    );
    await expect(
      startConversationWithMessage({ userId: 'inq_1', listingId: 'listing_1', tenantRequestId: 'req_1', body: 'Hi' }),
    ).rejects.toThrow('Provide only listingId or tenantRequestId');
  });

  it('returns existing conversations without sending a duplicate opener', async () => {
    findFirstMessage.mockResolvedValue({ id: 'msg_existing' });

    await expect(
      startConversationWithMessage({ userId: 'inq_1', listingId: 'listing_1', body: 'Hello' }),
    ).resolves.toEqual({ id: 'conv_1', existing: true });
  });

  it('starts a new conversation with the first message', async () => {
    await expect(
      startConversationWithMessage({ userId: 'inq_1', listingId: 'listing_1', body: 'Hello' }),
    ).resolves.toEqual({ id: 'conv_1', existing: false });
  });
});

describe('listConversationsForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyConversations.mockResolvedValue([conversation]);
    findManyListings.mockResolvedValue([
      {
        id: 'listing_1',
        title: 'Bright flat',
        slug: 'bright-flat',
        shortCode: 'abc12345',
        photoUrls: ['/uploads/a.jpg'],
      },
    ]);
    findManyRequests.mockResolvedValue([]);
    findManyUsers.mockResolvedValue([
      { id: 'pub_1', name: 'Publisher', image: null, handle: 'publisher' },
      { id: 'inq_1', name: 'Inquirer', image: null, handle: 'inquirer' },
    ]);
    selectOrderBy.mockResolvedValue([{ id: 'msg_1', conversationId: 'conv_1', body: 'Hi', attachments: [], createdAt: new Date('2026-01-03') }]);
    getUserPublicProfileInfos.mockResolvedValue(new Map());
  });

  it('maps listing conversations for the inbox', async () => {
    const rows = await listConversationsForUser('inq_1');

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      contextKind: 'listing',
      listing: { title: 'Bright flat' },
      lastMessage: 'Hi',
    });
  });

  it('maps seeker conversations for the inbox', async () => {
    findManyConversations.mockResolvedValue([
      { ...conversation, listingId: null, tenantRequestId: 'req_1' },
    ]);
    findManyListings.mockResolvedValue([]);
    findManyRequests.mockResolvedValue([{ id: 'req_1', title: 'Looking in Mitte' }]);
    findManyUsers.mockResolvedValue([
      { id: 'pub_1', name: 'Seeker', image: null, handle: 'seeker_handle' },
      { id: 'inq_1', name: 'Landlord', image: null, handle: 'landlord' },
    ]);
    selectOrderBy.mockResolvedValue([
      { id: 'msg_1', conversationId: 'conv_1', body: '', attachments: [{ url: '/uploads/a.pdf', name: 'a.pdf', mimeType: 'application/pdf' }], createdAt: new Date('2026-01-03') },
    ]);
    getUserPublicProfileInfos.mockResolvedValue(new Map());

    const rows = await listConversationsForUser('inq_1');

    expect(rows[0]).toMatchObject({
      contextKind: 'seeker',
      seekerProfile: { title: 'Looking in Mitte', href: '/u/seeker_handle' },
      lastMessage: '📎 Attachment',
    });
  });
});

describe('getConversationWithMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFirstConversation.mockResolvedValue(conversation);
    findFirstListing.mockResolvedValue({
      id: 'listing_1',
      title: 'Bright flat',
      slug: 'bright-flat',
      shortCode: 'abc12345',
      photoUrls: [],
    });
    findManyMessages.mockResolvedValue([
      {
        id: 'msg_1',
        body: 'Hello',
        attachments: [],
        senderId: 'inq_1',
        createdAt: new Date('2026-01-03'),
        readAt: null,
      },
    ]);
    updateWhere.mockResolvedValue(undefined);
    getUserPublicProfileInfos.mockResolvedValue(new Map());
  });

  it('returns null for unknown conversations', async () => {
    findFirstConversation.mockResolvedValue(null);
    expect(await getConversationWithMessages('missing', 'inq_1')).toBeNull();
  });

  it('returns null for non-participants', async () => {
    expect(await getConversationWithMessages('conv_1', 'stranger')).toBeNull();
  });

  it('loads messages for participants', async () => {
    const thread = await getConversationWithMessages('conv_1', 'inq_1');

    expect(thread?.messages).toHaveLength(1);
    expect(thread?.messages[0]?.isMine).toBe(true);
  });
});

describe('getUnreadCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns zero when user has no conversations', async () => {
    findManyConversations.mockResolvedValue([]);
    expect(await getUnreadCount('user_1')).toBe(0);
  });

  it('counts unread messages from other participants', async () => {
    findManyConversations.mockResolvedValue([conversation]);
    selectWhere.mockResolvedValue([{ count: 3 }]);

    expect(await getUnreadCount('inq_1')).toBe(3);
  });
});

describe('deleteConversation', () => {
  beforeEach(() => {
    findFirstConversation.mockReset();
    deleteWhere.mockReset();
    deleteWhere.mockResolvedValue(undefined);
  });

  it('throws when conversation does not exist', async () => {
    findFirstConversation.mockResolvedValue(null);

    await expect(deleteConversation('conv_missing', 'user_1')).rejects.toThrow('Conversation not found');
    expect(deleteWhere).not.toHaveBeenCalled();
  });

  it('throws when user is not a participant', async () => {
    findFirstConversation.mockResolvedValue(conversation);

    await expect(deleteConversation('conv_1', 'stranger')).rejects.toThrow('Not a participant');
    expect(deleteWhere).not.toHaveBeenCalled();
  });

  it('deletes when user is the publisher', async () => {
    findFirstConversation.mockResolvedValue(conversation);

    await deleteConversation('conv_1', 'pub_1');
    expect(deleteWhere).toHaveBeenCalledOnce();
  });

  it('deletes when user is the inquirer', async () => {
    findFirstConversation.mockResolvedValue(conversation);

    await deleteConversation('conv_1', 'inq_1');
    expect(deleteWhere).toHaveBeenCalledOnce();
  });
});
