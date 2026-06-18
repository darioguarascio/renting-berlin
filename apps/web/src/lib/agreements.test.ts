import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  findFirstConversation,
  findManyConversations,
  findFirstAgreement,
  findFirstUser,
  findFirstListing,
  selectGroupBy,
  insertReturning,
  updateReturning,
  sendMessage,
  enqueueAgreementJob,
} = vi.hoisted(() => ({
  findFirstConversation: vi.fn(),
  findManyConversations: vi.fn(),
  findFirstAgreement: vi.fn(),
  findFirstUser: vi.fn(),
  findFirstListing: vi.fn(),
  selectGroupBy: vi.fn(),
  insertReturning: vi.fn(),
  updateReturning: vi.fn(),
  sendMessage: vi.fn(),
  enqueueAgreementJob: vi.fn(),
}));

vi.mock('../db', () => ({
  db: {
    query: {
      conversations: { findFirst: findFirstConversation, findMany: findManyConversations },
      agreements: { findFirst: findFirstAgreement },
      users: { findFirst: findFirstUser },
      listings: { findFirst: findFirstListing },
    },
    insert: vi.fn(() => ({
      values: vi.fn(() => ({ returning: insertReturning })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(() => ({ returning: updateReturning })) })),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({ groupBy: selectGroupBy })),
      })),
    })),
  },
}));

vi.mock('./messages', () => ({ sendMessage }));
vi.mock('./agreement-events', () => ({ enqueueAgreementJob }));

import {
  actOnAgreement,
  getAgreementContractMarkdown,
  getConversationAgreementContext,
  proposeAgreement,
  rejectOtherListingConversations,
  renderAgreementContractPreview,
} from './agreements';

const conversation = {
  id: 'conv_1',
  listingId: 'listing_1',
  tenantRequestId: null,
  publisherId: 'pub_1',
  inquirerId: 'inq_1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-02'),
};

const listing = {
  id: 'listing_1',
  title: 'Bright flat',
  publisherId: 'pub_1',
  availableFrom: new Date('2026-02-01T12:00:00Z'),
  availableTo: new Date('2027-02-01T12:00:00Z'),
  costs: { rentPerMonth: 1200, deposit: 2400 },
};

function agreementRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'agr_1',
    conversationId: 'conv_1',
    listingId: 'listing_1',
    proposerId: 'pub_1',
    counterpartyId: 'inq_1',
    status: 'proposed',
    title: 'Rental agreement',
    monthlyRent: 1200,
    deposit: 2400,
    startDate: new Date('2026-02-01T12:00:00Z'),
    endDate: null,
    terms: null,
    proposerSignatureName: 'Pat Owner',
    proposerSignedAt: new Date('2026-01-10T10:00:00Z'),
    counterpartySignatureName: null,
    counterpartySignedAt: null,
    declineReason: null,
    resolvedAt: null,
    createdAt: new Date('2026-01-10T10:00:00Z'),
    updatedAt: new Date('2026-01-10T10:00:00Z'),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sendMessage.mockResolvedValue(undefined);
  selectGroupBy.mockResolvedValue([]);
  enqueueAgreementJob.mockResolvedValue(undefined);
});

describe('getConversationAgreementContext', () => {
  it('throws for unknown conversations', async () => {
    findFirstConversation.mockResolvedValue(undefined);
    await expect(getConversationAgreementContext('conv_x', 'pub_1')).rejects.toThrow(
      'Conversation not found',
    );
  });

  it('throws for non-participants', async () => {
    findFirstConversation.mockResolvedValue(conversation);
    await expect(getConversationAgreementContext('conv_1', 'stranger')).rejects.toThrow(
      'Not a participant',
    );
  });

  it('builds landlord context with listing defaults and rejectable count', async () => {
    findFirstConversation.mockResolvedValue(conversation);
    findFirstUser.mockResolvedValue({ name: 'Sam Tenant' });
    findFirstListing.mockResolvedValue(listing);
    findFirstAgreement.mockResolvedValue(undefined);
    findManyConversations.mockResolvedValue([
      conversation,
      { ...conversation, id: 'conv_2', inquirerId: 'inq_2' },
    ]);
    selectGroupBy.mockResolvedValue([{ conversationId: 'conv_2' }]);

    const ctx = await getConversationAgreementContext('conv_1', 'pub_1');

    expect(ctx?.conversation.viewerIsLandlord).toBe(true);
    expect(ctx?.canPropose).toBe(true);
    expect(ctx?.rejectableCount).toBe(1);
    expect(ctx?.defaults.monthlyRent).toBe(1200);
    expect(ctx?.defaults.deposit).toBe(2400);
    expect(ctx?.defaults.startDate).toBe('2026-02-01');
    expect(ctx?.agreement).toBeNull();
  });

  it('marks canPropose false when an agreement is live', async () => {
    findFirstConversation.mockResolvedValue(conversation);
    findFirstUser.mockResolvedValue({ name: 'Sam Tenant' });
    findFirstListing.mockResolvedValue(listing);
    findFirstAgreement.mockResolvedValue(agreementRow({ status: 'signed' }));

    const ctx = await getConversationAgreementContext('conv_1', 'pub_1');

    expect(ctx?.canPropose).toBe(false);
    expect(ctx?.agreement?.status).toBe('signed');
  });

  it('handles seeker conversations without a listing', async () => {
    findFirstConversation.mockResolvedValue({
      ...conversation,
      listingId: null,
      tenantRequestId: 'req_1',
    });
    findFirstUser.mockResolvedValue({ name: 'Landlord' });
    findFirstAgreement.mockResolvedValue(undefined);

    const ctx = await getConversationAgreementContext('conv_1', 'inq_1');

    expect(ctx?.conversation.contextKind).toBe('seeker');
    expect(ctx?.conversation.viewerIsLandlord).toBe(false);
    expect(ctx?.rejectableCount).toBe(0);
    expect(ctx?.defaults.monthlyRent).toBe(0);
  });
});

describe('proposeAgreement', () => {
  beforeEach(() => {
    findFirstConversation.mockResolvedValue(conversation);
    findFirstAgreement.mockResolvedValue(undefined);
    insertReturning.mockResolvedValue([agreementRow()]);
  });

  it('rejects when a live agreement already exists', async () => {
    findFirstAgreement.mockResolvedValue(agreementRow({ status: 'proposed' }));
    await expect(
      proposeAgreement('conv_1', 'pub_1', {
        title: 'Rental agreement',
        monthlyRent: 1200,
        deposit: null,
        startDate: '2026-02-01',
        endDate: null,
        signatureName: 'Pat Owner',
        rejectOthers: false,
      }),
    ).rejects.toThrow('already in progress');
  });

  it('rejects when the end date precedes the start date', async () => {
    await expect(
      proposeAgreement('conv_1', 'pub_1', {
        title: 'Rental agreement',
        monthlyRent: 1200,
        deposit: null,
        startDate: '2026-02-01',
        endDate: '2026-01-01',
        signatureName: 'Pat Owner',
        rejectOthers: false,
      }),
    ).rejects.toThrow('End date cannot be before the start date');
  });

  it('creates an agreement and posts a system message', async () => {
    const dto = await proposeAgreement('conv_1', 'pub_1', {
      title: 'Rental agreement',
      monthlyRent: 1200,
      deposit: 2400,
      startDate: '2026-02-01',
      endDate: null,
      signatureName: 'Pat Owner',
      rejectOthers: false,
    });

    expect(dto.status).toBe('proposed');
    expect(dto.viewerIsProposer).toBe(true);
    expect(insertReturning).toHaveBeenCalledOnce();
    expect(sendMessage).toHaveBeenCalledWith(
      'conv_1',
      'pub_1',
      expect.stringContaining('Proposed'),
      { metadata: { type: 'agreement', agreementId: 'agr_1', event: 'proposed' } },
    );
  });

  it('also declines other applicants when the landlord opts in', async () => {
    findManyConversations.mockResolvedValue([
      conversation,
      { ...conversation, id: 'conv_2', inquirerId: 'inq_2' },
    ]);
    selectGroupBy.mockResolvedValue([{ conversationId: 'conv_2' }]);
    findFirstListing.mockResolvedValue(listing);

    await proposeAgreement('conv_1', 'pub_1', {
      title: 'Rental agreement',
      monthlyRent: 1200,
      deposit: null,
      startDate: '2026-02-01',
      endDate: null,
      signatureName: 'Pat Owner',
      rejectOthers: true,
      rejectMessage: 'Taken, sorry!',
    });

    expect(sendMessage).toHaveBeenCalledWith('conv_2', 'pub_1', 'Taken, sorry!');
  });
});

describe('actOnAgreement', () => {
  it('throws when the agreement is missing', async () => {
    findFirstAgreement.mockResolvedValue(undefined);
    await expect(actOnAgreement('agr_x', 'inq_1', { action: 'sign', signatureName: 'Sam Tenant' })).rejects.toThrow(
      'Agreement not found',
    );
  });

  it('throws for non-participants', async () => {
    findFirstAgreement.mockResolvedValue(agreementRow());
    await expect(
      actOnAgreement('agr_1', 'stranger', { action: 'sign', signatureName: 'Sam Tenant' }),
    ).rejects.toThrow('Not a participant');
  });

  it('throws when the agreement is no longer pending', async () => {
    findFirstAgreement.mockResolvedValue(agreementRow({ status: 'signed' }));
    await expect(
      actOnAgreement('agr_1', 'inq_1', { action: 'sign', signatureName: 'Sam Tenant' }),
    ).rejects.toThrow('can no longer be changed');
  });

  it('lets the counterparty sign to make it binding', async () => {
    findFirstAgreement.mockResolvedValue(agreementRow());
    updateReturning.mockResolvedValue([
      agreementRow({
        status: 'signed',
        counterpartySignatureName: 'Sam Tenant',
        counterpartySignedAt: new Date('2026-01-11T10:00:00Z'),
        resolvedAt: new Date('2026-01-11T10:00:00Z'),
      }),
    ]);

    const dto = await actOnAgreement('agr_1', 'inq_1', { action: 'sign', signatureName: 'Sam Tenant' });

    expect(dto.status).toBe('signed');
    expect(dto.counterpartySignatureName).toBe('Sam Tenant');
    expect(sendMessage).toHaveBeenCalledWith(
      'conv_1',
      'inq_1',
      expect.stringContaining('Signed'),
      { metadata: { type: 'agreement', agreementId: 'agr_1', event: 'signed' } },
    );
  });

  it('freezes the contract and enqueues the PDF worker on signing', async () => {
    findFirstAgreement.mockResolvedValue(agreementRow());
    updateReturning.mockResolvedValue([
      agreementRow({
        status: 'signed',
        counterpartySignatureName: 'Sam Tenant',
        counterpartySignedAt: new Date('2026-01-11T10:00:00Z'),
        resolvedAt: new Date('2026-01-11T10:00:00Z'),
      }),
    ]);
    findFirstConversation.mockResolvedValue(conversation);
    findFirstUser.mockResolvedValue({ name: 'Pat Owner', email: 'pat@example.com' });
    findFirstListing.mockResolvedValue(listing);

    await actOnAgreement('agr_1', 'inq_1', { action: 'sign', signatureName: 'Sam Tenant' });

    expect(enqueueAgreementJob).toHaveBeenCalledWith({ type: 'signed', agreementId: 'agr_1' });
  });

  it('still signs even if the contract finalisation fails', async () => {
    findFirstAgreement.mockResolvedValue(agreementRow());
    updateReturning.mockResolvedValue([agreementRow({ status: 'signed' })]);
    findFirstConversation.mockResolvedValue(conversation);
    findFirstUser.mockResolvedValue({ name: 'Pat Owner', email: 'pat@example.com' });
    findFirstListing.mockResolvedValue(listing);
    enqueueAgreementJob.mockRejectedValueOnce(new Error('redis down'));

    const dto = await actOnAgreement('agr_1', 'inq_1', { action: 'sign', signatureName: 'Sam Tenant' });

    expect(dto.status).toBe('signed');
  });

  it('prevents the proposer from signing', async () => {
    findFirstAgreement.mockResolvedValue(agreementRow());
    await expect(
      actOnAgreement('agr_1', 'pub_1', { action: 'sign', signatureName: 'Pat Owner' }),
    ).rejects.toThrow('Only the other party can sign');
  });

  it('lets the counterparty decline', async () => {
    findFirstAgreement.mockResolvedValue(agreementRow());
    updateReturning.mockResolvedValue([
      agreementRow({ status: 'declined', declineReason: 'No thanks', resolvedAt: new Date() }),
    ]);

    const dto = await actOnAgreement('agr_1', 'inq_1', { action: 'decline', reason: 'No thanks' });

    expect(dto.status).toBe('declined');
    expect(dto.declineReason).toBe('No thanks');
  });

  it('prevents the proposer from declining', async () => {
    findFirstAgreement.mockResolvedValue(agreementRow());
    await expect(actOnAgreement('agr_1', 'pub_1', { action: 'decline' })).rejects.toThrow(
      'proposer can withdraw',
    );
  });

  it('lets the proposer withdraw', async () => {
    findFirstAgreement.mockResolvedValue(agreementRow());
    updateReturning.mockResolvedValue([agreementRow({ status: 'withdrawn', resolvedAt: new Date() })]);

    const dto = await actOnAgreement('agr_1', 'pub_1', { action: 'withdraw' });

    expect(dto.status).toBe('withdrawn');
    expect(sendMessage).toHaveBeenCalledWith(
      'conv_1',
      'pub_1',
      expect.stringContaining('Withdrew'),
      { metadata: { type: 'agreement', agreementId: 'agr_1', event: 'withdrawn' } },
    );
  });

  it('prevents the counterparty from withdrawing', async () => {
    findFirstAgreement.mockResolvedValue(agreementRow());
    await expect(actOnAgreement('agr_1', 'inq_1', { action: 'withdraw' })).rejects.toThrow(
      'Only the proposer can withdraw',
    );
  });
});

describe('renderAgreementContractPreview', () => {
  it('renders contract markdown with the parties and rent', async () => {
    findFirstConversation.mockResolvedValue(conversation);
    findFirstUser.mockResolvedValue({ name: 'Pat Owner', email: 'pat@example.com' });
    findFirstListing.mockResolvedValue(listing);

    const markdown = await renderAgreementContractPreview('conv_1', 'pub_1', {
      monthlyRent: 1200,
      deposit: 2400,
      startDate: '2026-02-01',
      endDate: null,
      contract: { propertyAddress: 'Test St 1', disabledClauses: ['pets'] },
    });

    expect(typeof markdown).toBe('string');
    expect(markdown).toContain('Pat Owner');
    expect(markdown).toContain('Test St 1');
  });

  it('rejects non-participants', async () => {
    findFirstConversation.mockResolvedValue(conversation);
    await expect(
      renderAgreementContractPreview('conv_1', 'stranger', { monthlyRent: 0, deposit: null }),
    ).rejects.toThrow('Not a participant');
  });
});

describe('getAgreementContractMarkdown', () => {
  it('returns null for unknown agreements', async () => {
    findFirstAgreement.mockResolvedValue(undefined);
    expect(await getAgreementContractMarkdown('agr_x', 'pub_1')).toBeNull();
  });

  it('returns null for non-participants', async () => {
    findFirstAgreement.mockResolvedValue(agreementRow({ contractMarkdown: '# doc' }));
    expect(await getAgreementContractMarkdown('agr_1', 'stranger')).toBeNull();
  });

  it('returns the stored markdown for a participant', async () => {
    findFirstAgreement.mockResolvedValue(agreementRow({ contractMarkdown: '# doc' }));
    expect(await getAgreementContractMarkdown('agr_1', 'inq_1')).toBe('# doc');
  });
});

describe('rejectOtherListingConversations', () => {
  it('throws when the listing is not owned by the user', async () => {
    findFirstListing.mockResolvedValue(undefined);
    await expect(
      rejectOtherListingConversations('listing_1', 'pub_1', {}),
    ).rejects.toThrow('Listing not found');
  });

  it('sends the default message to active other conversations', async () => {
    findFirstListing.mockResolvedValue(listing);
    findManyConversations.mockResolvedValue([
      { ...conversation, id: 'conv_2', inquirerId: 'inq_2' },
      { ...conversation, id: 'conv_3', inquirerId: 'inq_3' },
    ]);
    selectGroupBy.mockResolvedValue([{ conversationId: 'conv_2' }, { conversationId: 'conv_3' }]);

    const result = await rejectOtherListingConversations('listing_1', 'pub_1', {
      exceptConversationId: 'conv_1',
    });

    expect(result.count).toBe(2);
    expect(sendMessage).toHaveBeenCalledTimes(2);
  });

  it('keeps going when an individual send fails', async () => {
    findFirstListing.mockResolvedValue(listing);
    findManyConversations.mockResolvedValue([
      { ...conversation, id: 'conv_2', inquirerId: 'inq_2' },
      { ...conversation, id: 'conv_3', inquirerId: 'inq_3' },
    ]);
    selectGroupBy.mockResolvedValue([{ conversationId: 'conv_2' }, { conversationId: 'conv_3' }]);
    sendMessage.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(undefined);

    const result = await rejectOtherListingConversations('listing_1', 'pub_1', { message: 'Bye' });

    expect(result.count).toBe(1);
  });

  it('returns zero when there are no other active conversations', async () => {
    findFirstListing.mockResolvedValue(listing);
    findManyConversations.mockResolvedValue([conversation]);

    const result = await rejectOtherListingConversations('listing_1', 'pub_1', {
      exceptConversationId: 'conv_1',
    });

    expect(result.count).toBe(0);
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
