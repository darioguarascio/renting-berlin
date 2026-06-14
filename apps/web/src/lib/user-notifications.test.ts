import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findFirstUser, buildNotificationEmail, deliverEmailJob } = vi.hoisted(() => ({
  findFirstUser: vi.fn(),
  buildNotificationEmail: vi.fn(),
  deliverEmailJob: vi.fn(),
}));

vi.mock('../db', () => ({
  db: {
    query: {
      users: { findFirst: findFirstUser },
    },
  },
}));

vi.mock('./email/send', () => ({
  buildNotificationEmail,
}));

vi.mock('./email-delivery', () => ({
  deliverEmailJob,
}));

vi.mock('./site-url', () => ({
  getSiteUrl: () => 'https://renting.berlin',
}));

import {
  notifyListingActivityEmail,
  notifyNewMessageEmail,
  notifyProductNewsEmail,
  notifyProfileViewEmail,
} from './user-notifications';

describe('notifyNewMessageEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildNotificationEmail.mockResolvedValue({
      userId: 'user_2',
      to: 'user@example.com',
      subject: 'New message',
      text: 'text',
      html: 'html',
      event: 'messages',
    });
    deliverEmailJob.mockResolvedValue(undefined);
  });

  it('builds and delivers a message notification', async () => {
    await notifyNewMessageEmail({
      recipientId: 'user_2',
      senderName: 'Alex',
      conversationId: 'conv_1',
      preview: 'Hello there',
    });

    expect(buildNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user_2',
        category: 'messages',
        title: 'New message from Alex',
        link: '/messages/conv_1',
      }),
    );
    expect(deliverEmailJob).toHaveBeenCalledOnce();
  });

  it('uses a default preview and truncates long messages', async () => {
    await notifyNewMessageEmail({
      recipientId: 'user_2',
      senderName: 'Alex',
      conversationId: 'conv_1',
      preview: '   ',
    });
    expect(buildNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ body: 'New message' }),
    );

    const longPreview = 'x'.repeat(200);
    await notifyNewMessageEmail({
      recipientId: 'user_2',
      senderName: 'Alex',
      conversationId: 'conv_1',
      preview: longPreview,
    });
    expect(buildNotificationEmail).toHaveBeenLastCalledWith(
      expect.objectContaining({ body: `${'x'.repeat(177)}…` }),
    );
  });
});

describe('notifyProfileViewEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildNotificationEmail.mockResolvedValue({
      userId: 'seeker_1',
      to: 'seeker@example.com',
      subject: 'Profile view',
      text: 'text',
      html: 'html',
      event: 'profile_views',
    });
    deliverEmailJob.mockResolvedValue(undefined);
  });

  it('notifies when the profile owner has a handle', async () => {
    findFirstUser
      .mockResolvedValueOnce({ handle: 'seeker_1' })
      .mockResolvedValueOnce({ name: 'Landlord', handle: 'landlord_1' });

    await notifyProfileViewEmail({ profileUserId: 'seeker_1', viewerId: 'landlord_1' });

    expect(buildNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'seeker_1',
        category: 'profile_views',
        body: '@landlord_1 viewed your profile.',
      }),
    );
  });

  it('skips when the profile owner has no public handle', async () => {
    findFirstUser.mockResolvedValueOnce({ handle: null }).mockResolvedValueOnce({ name: 'Landlord', handle: null });

    await notifyProfileViewEmail({ profileUserId: 'seeker_1', viewerId: 'landlord_1' });

    expect(buildNotificationEmail).not.toHaveBeenCalled();
  });

  it('uses the viewer name when no handle is available', async () => {
    findFirstUser
      .mockResolvedValueOnce({ handle: 'seeker_1' })
      .mockResolvedValueOnce({ name: 'Landlord Name', handle: null });

    await notifyProfileViewEmail({ profileUserId: 'seeker_1', viewerId: 'landlord_1' });

    expect(buildNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Landlord Name viewed your profile.',
      }),
    );
  });

  it('skips when the viewer no longer exists', async () => {
    findFirstUser.mockResolvedValueOnce({ handle: 'seeker_1' }).mockResolvedValueOnce(null);

    await notifyProfileViewEmail({ profileUserId: 'seeker_1', viewerId: 'missing' });

    expect(buildNotificationEmail).not.toHaveBeenCalled();
  });
});

describe('notifyListingActivityEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildNotificationEmail.mockResolvedValue({
      userId: 'pub_1',
      to: 'pub@example.com',
      subject: 'Listing update',
      text: 'text',
      html: 'html',
      event: 'listing_updates',
    });
    deliverEmailJob.mockResolvedValue(undefined);
  });

  it('delivers listing activity emails', async () => {
    await notifyListingActivityEmail({
      publisherId: 'pub_1',
      title: 'Listing paused',
      body: 'Bright flat is no longer visible.',
      link: '/listings/bright-flat--abc12345',
    });

    expect(buildNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'listing_updates',
        title: 'Listing paused',
      }),
    );
    expect(deliverEmailJob).toHaveBeenCalledOnce();
  });
});

describe('notifyProductNewsEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildNotificationEmail.mockResolvedValue({
      userId: 'user_1',
      to: 'user@example.com',
      subject: 'News',
      text: 'text',
      html: 'html',
      event: 'product_news',
    });
    deliverEmailJob.mockResolvedValue(undefined);
  });

  it('defaults product news links to the dashboard', async () => {
    await notifyProductNewsEmail({
      userId: 'user_1',
      title: 'New feature',
      body: 'Try saved searches.',
    });

    expect(buildNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'product_news',
        link: '/dashboard',
      }),
    );
  });

  it('uses a custom product news link when provided', async () => {
    await notifyProductNewsEmail({
      userId: 'user_1',
      title: 'New feature',
      body: 'Try saved searches.',
      link: '/offers',
    });

    expect(buildNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        link: '/offers',
      }),
    );
  });
});
