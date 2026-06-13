import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { GET as getConversation, POST as postMessage, DELETE as deleteConversation } from '../../pages/api/conversations/[id]/index';
import { GET as listConversations, POST as createConversation } from '../../pages/api/conversations/index';
import { resetConversationData } from '../fixtures/reset';
import { loadTestFixtures } from '../integration/setup';
import { callApi, signInCookie } from '../helpers/api';
import type { TestFixtures } from '../fixtures/seed';

describe('conversations API (integration)', () => {
  let fixtures: TestFixtures;
  let seekerCookie: string;
  let landlordCookie: string;
  let strangerCookie: string;

  beforeAll(async () => {
    fixtures = await loadTestFixtures();
    seekerCookie = await signInCookie(fixtures.seeker.email, fixtures.seeker.password);
    landlordCookie = await signInCookie(fixtures.landlord.email, fixtures.landlord.password);
    strangerCookie = await signInCookie(fixtures.stranger.email, fixtures.stranger.password);
  });

  beforeEach(async () => {
    await resetConversationData();
  });

  it('rejects unauthenticated list requests', async () => {
    const { status } = await callApi(listConversations);
    expect(status).toBe(401);
  });

  it('creates a listing conversation with initial message', async () => {
    const { status, json } = await callApi<{ id: string; existing?: boolean }>(createConversation, {
      method: 'POST',
      cookie: seekerCookie,
      url: 'http://localhost/api/conversations',
      body: {
        listingId: fixtures.listing.id,
        body: 'Hello, is this flat still available?',
        templateKind: 'inquiry',
      },
    });

    expect(status).toBe(201);
    expect(json.id).toBeTruthy();

    const list = await callApi<{ items: Array<{ id: string; listing: { title: string; href: string } | null }> }>(
      listConversations,
      { cookie: seekerCookie, url: 'http://localhost/api/conversations' },
    );

    expect(list.status).toBe(200);
    const row = list.json.items.find((item) => item.id === json.id);
    expect(row?.listing?.title).toBe(fixtures.listing.title);
    expect(row?.listing?.href).toBe(fixtures.listing.href);
  });

  it('returns listing context in thread detail', async () => {
    const created = await callApi<{ id: string }>(createConversation, {
      method: 'POST',
      cookie: seekerCookie,
      url: 'http://localhost/api/conversations',
      body: {
        listingId: fixtures.listing.id,
        body: 'Following up on the listing.',
      },
    });

    const { status, json } = await callApi<{
      listing: { title: string; slug: string } | null;
      otherUser: { profileHref: string | null; handle: string | null; activeListingCount: number } | null;
      messages: Array<{ body: string; isMine: boolean }>;
    }>(getConversation, {
      cookie: seekerCookie,
      params: { id: created.json.id },
      url: `http://localhost/api/conversations/${created.json.id}`,
    });

    expect(status).toBe(200);
    expect(json.listing?.title).toBe(fixtures.listing.title);
    expect(json.listing?.slug).toBe(fixtures.listing.href);
    expect(json.otherUser?.profileHref).toBe(`/u/${fixtures.landlord.handle}`);
    expect(json.otherUser?.handle).toBe(fixtures.landlord.handle);
    expect(json.otherUser?.activeListingCount).toBeGreaterThanOrEqual(1);
    expect(json.messages.some((message) => message.body.includes('Following up'))).toBe(true);
  });

  it('allows landlord to read seeker messages as unread then marks them read', async () => {
    const created = await callApi<{ id: string }>(createConversation, {
      method: 'POST',
      cookie: seekerCookie,
      url: 'http://localhost/api/conversations',
      body: {
        listingId: fixtures.listing.id,
        body: 'Can I visit tomorrow?',
      },
    });

    const thread = await callApi<{ messages: Array<{ isMine: boolean; readAt?: string | null }> }>(
      getConversation,
      {
        cookie: landlordCookie,
        params: { id: created.json.id },
        url: `http://localhost/api/conversations/${created.json.id}`,
      },
    );

    expect(thread.status).toBe(200);
    const incoming = thread.json.messages.find((message) => !message.isMine);
    expect(incoming).toBeTruthy();
  });

  it('posts a reply in an existing conversation', async () => {
    const created = await callApi<{ id: string }>(createConversation, {
      method: 'POST',
      cookie: seekerCookie,
      url: 'http://localhost/api/conversations',
      body: {
        listingId: fixtures.listing.id,
        body: 'Initial inquiry',
      },
    });

    const reply = await callApi<{ body: string; isMine: boolean }>(postMessage, {
      method: 'POST',
      cookie: landlordCookie,
      params: { id: created.json.id },
      url: `http://localhost/api/conversations/${created.json.id}`,
      body: { body: 'Yes, happy to show you around.' },
    });

    expect(reply.status).toBe(200);
    expect(reply.json.body).toBe('Yes, happy to show you around.');
    expect(reply.json.isMine).toBe(true);
  });

  it('creates a seeker-profile conversation with context link', async () => {
    const { status, json } = await callApi<{ id: string }>(createConversation, {
      method: 'POST',
      cookie: landlordCookie,
      url: 'http://localhost/api/conversations',
      body: {
        tenantRequestId: fixtures.seekerProfile.id,
        body: 'Your profile looks like a good fit for our WG.',
        templateKind: 'outreach',
      },
    });

    expect(status).toBe(201);

    const list = await callApi<{ items: Array<{ seekerProfile: { title: string; href: string } | null }> }>(
      listConversations,
      { cookie: landlordCookie, url: 'http://localhost/api/conversations' },
    );

    const row = list.json.items.find((item) => item.seekerProfile?.title === fixtures.seekerProfile.title);
    expect(row?.seekerProfile?.href).toBe(fixtures.seekerProfile.href);
    expect(json.id).toBeTruthy();
  });

  it('deletes a conversation for participants', async () => {
    const created = await callApi<{ id: string }>(createConversation, {
      method: 'POST',
      cookie: seekerCookie,
      url: 'http://localhost/api/conversations',
      body: {
        listingId: fixtures.listing.id,
        body: 'Please delete this thread after reading.',
      },
    });

    const deleted = await callApi(deleteConversation, {
      method: 'DELETE',
      cookie: seekerCookie,
      params: { id: created.json.id },
      url: `http://localhost/api/conversations/${created.json.id}`,
    });

    expect(deleted.status).toBe(204);

    const thread = await callApi(getConversation, {
      cookie: seekerCookie,
      params: { id: created.json.id },
      url: `http://localhost/api/conversations/${created.json.id}`,
    });

    expect(thread.status).toBe(404);
  });

  it('forbids deleting a conversation for non-participants', async () => {
    const created = await callApi<{ id: string }>(createConversation, {
      method: 'POST',
      cookie: seekerCookie,
      url: 'http://localhost/api/conversations',
      body: {
        listingId: fixtures.listing.id,
        body: 'Private landlord thread',
      },
    });

    const forbidden = await callApi(deleteConversation, {
      method: 'DELETE',
      cookie: strangerCookie,
      params: { id: created.json.id },
      url: `http://localhost/api/conversations/${created.json.id}`,
    });

    expect(forbidden.status).toBe(403);
  });
});
