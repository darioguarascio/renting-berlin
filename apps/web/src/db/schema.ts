import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import type { AgreementContractConfig } from '../lib/agreement-schema';
import type { MessageMetadata } from '../types/message';

export const listingCategoryEnum = pgEnum('listing_category', ['full_flat', 'shared_room', 'swap']);
export const rentTypeEnum = pgEnum('rent_type', ['long_term', 'short_term', 'overnight']);
export const listingStatusEnum = pgEnum('listing_status', ['draft', 'active', 'paused', 'closed']);
export const listingSourceEnum = pgEnum('listing_source', ['native', 'external']);
export const householdTypeEnum = pgEnum('household_type', [
  'single',
  'couple',
  'family_1_kid',
  'family_2_kids',
  'family_3_plus_kids',
]);
export const savedSearchTypeEnum = pgEnum('saved_search_type', ['listings', 'tenant_requests']);
export const emailDigestEnum = pgEnum('email_digest', ['instant', 'daily', 'weekly']);
export const messageTemplateKindEnum = pgEnum('message_template_kind', ['inquiry', 'outreach', 'general']);
export const seekerVisibilityEnum = pgEnum('seeker_visibility', [
  'everyone',
  'visited_listings',
  'favorited_listings',
  'messaged_listings',
  'nobody',
]);
export const moderationStatusEnum = pgEnum('moderation_status', ['pending', 'approved', 'flagged']);
export const agreementStatusEnum = pgEnum('agreement_status', [
  'proposed',
  'signed',
  'declined',
  'withdrawn',
]);
export const moderationEntityTypeEnum = pgEnum('moderation_entity_type', [
  'listing',
  'tenant_request',
  'image',
  'message',
]);
export const moderationFieldEnum = pgEnum('moderation_field', [
  'title',
  'description',
  'photo',
  'body',
  'attachment',
]);
export const connectionStatusEnum = pgEnum('connection_status', ['pending', 'accepted', 'blocked']);
export const stayOfferStatusEnum = pgEnum('stay_offer_status', ['open', 'taken', 'closed', 'cancelled']);
export const stayOfferVisibilityEnum = pgEnum('stay_offer_visibility', ['connections', 'selected']);
export const stayClaimStatusEnum = pgEnum('stay_claim_status', [
  'interested',
  'accepted',
  'declined',
  'withdrawn',
]);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  handle: text('handle').unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  lastAuthProvider: text('last_auth_provider'),
  lastOffersVisitAt: timestamp('last_offers_visit_at', { withTimezone: true }),
  lastNotificationsVisitAt: timestamp('last_notifications_visit_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** Handles claimed once are never released, even after account deletion. */
export const reservedHandles = pgTable('reserved_handles', {
  handle: text('handle').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
  claimedAt: timestamp('claimed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  idToken: text('id_token'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const listings = pgTable(
  'listings',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    shortCode: text('short_code').notNull().unique(),
    publisherId: text('publisher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    status: listingStatusEnum('status').notNull().default('draft'),
    category: listingCategoryEnum('category').notNull(),
    rentType: rentTypeEnum('rent_type').notNull(),
    availableFrom: timestamp('available_from', { withTimezone: true }).notNull(),
    availableTo: timestamp('available_to', { withTimezone: true }),
    sizeSqm: integer('size_sqm').notNull(),
    rooms: integer('rooms').notNull(),
    floorLevel: integer('floor_level'),
    onlineViewingAvailable: boolean('online_viewing_available').notNull().default(false),
    anmeldungAvailable: boolean('anmeldung_available').notNull().default(false),
    schufaRequired: boolean('schufa_required').notNull().default(false),
    address: text('address').notNull(),
    neighborhood: text('neighborhood').notNull(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    approximateLocation: boolean('approximate_location').notNull().default(false),
    hidePublisherName: boolean('hide_publisher_name').notNull().default(false),
    hideReviewerNames: boolean('hide_reviewer_names').notNull().default(false),
    costs: jsonb('costs').notNull().$type<{
      rentPerMonth: number;
      utilities?: number;
      deposit?: number;
      equipmentFee?: number;
      other?: number;
    }>(),
    descriptions: jsonb('descriptions').notNull().$type<{
      apartment?: string;
      location?: string;
      misc?: string;
    }>(),
    requiredDocuments: jsonb('required_documents').notNull().$type<string[]>().default([]),
    requiredDocumentsOther: text('required_documents_other'),
    equipment: jsonb('equipment').notNull().$type<string[]>().default([]),
    photoUrls: jsonb('photo_urls').notNull().$type<string[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    moderationStatus: moderationStatusEnum('moderation_status').notNull().default('approved'),
    sourceType: listingSourceEnum('source_type').notNull().default('native'),
    externalUrl: text('external_url'),
    externalProvider: text('external_provider'),
    externalSourceId: text('external_source_id'),
    externalSyncedAt: timestamp('external_synced_at', { withTimezone: true }),
  },
  (table) => [
    index('listings_status_idx').on(table.status),
    index('listings_moderation_status_idx').on(table.moderationStatus),
    index('listings_neighborhood_idx').on(table.neighborhood),
    index('listings_rent_type_idx').on(table.rentType),
    index('listings_category_idx').on(table.category),
    index('listings_publisher_idx').on(table.publisherId),
    index('listings_source_type_idx').on(table.sourceType),
    uniqueIndex('listings_slug_short_code_idx').on(table.slug, table.shortCode),
    uniqueIndex('listings_external_source_idx').on(table.externalProvider, table.externalSourceId),
  ],
);

export const favorites = pgTable(
  'favorites',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('favorites_user_listing_idx').on(table.userId, table.listingId)],
);

export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id')
    .notNull()
    .references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: text('sender_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  body: text('body').notNull(),
  attachments: jsonb('attachments').notNull().$type<{ url: string; name: string; mimeType: string }[]>().default([]),
  metadata: jsonb('metadata').$type<MessageMetadata>(),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const rentalTransactions = pgTable('rental_transactions', {
  id: text('id').primaryKey(),
  listingId: text('listing_id')
    .notNull()
    .references(() => listings.id, { onDelete: 'cascade' }),
  landlordId: text('landlord_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tenantId: text('tenant_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  startDate: timestamp('start_date', { withTimezone: true }),
  endDate: timestamp('end_date', { withTimezone: true }),
  feedbackDueAt: timestamp('feedback_due_at', { withTimezone: true }),
  status: text('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const feedback = pgTable('feedback', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id')
    .notNull()
    .references(() => rentalTransactions.id, { onDelete: 'cascade' }),
  authorId: text('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  subjectId: text('subject_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tenantRequests = pgTable(
  'tenant_requests',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    seekerId: text('seeker_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    status: listingStatusEnum('status').notNull().default('draft'),
    category: listingCategoryEnum('category').notNull(),
    rentType: rentTypeEnum('rent_type').notNull(),
    budgetMin: integer('budget_min').notNull(),
    budgetMax: integer('budget_max').notNull(),
    desiredNeighborhoods: jsonb('desired_neighborhoods').notNull().$type<string[]>().default([]),
    availableFrom: timestamp('available_from', { withTimezone: true }).notNull(),
    availableTo: timestamp('available_to', { withTimezone: true }),
    sizeMin: integer('size_min'),
    roomsMin: integer('rooms_min'),
    anmeldungNeeded: boolean('anmeldung_needed').notNull().default(false),
    hasSchufa: boolean('has_schufa').notNull().default(false),
    householdType: householdTypeEnum('household_type').notNull().default('single'),
    monthlyIncome: integer('monthly_income'),
    hasPets: boolean('has_pets').notNull().default(false),
    nationality: text('nationality'),
    birthYear: integer('birth_year'),
    needsBedLinens: boolean('needs_bed_linens').notNull().default(false),
    occupation: text('occupation'),
    isStudent: boolean('is_student').notNull().default(false),
    isSmoker: boolean('is_smoker').notNull().default(false),
    spokenLanguages: jsonb('spoken_languages').notNull().$type<string[]>().default([]),
    description: text('description').notNull(),
    photoUrls: jsonb('photo_urls').notNull().$type<string[]>().default([]),
    visibility: seekerVisibilityEnum('visibility').notNull().default('everyone'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    moderationStatus: moderationStatusEnum('moderation_status').notNull().default('approved'),
  },
  (table) => [
    index('tenant_requests_status_idx').on(table.status),
    index('tenant_requests_moderation_status_idx').on(table.moderationStatus),
    index('tenant_requests_seeker_idx').on(table.seekerId),
    index('tenant_requests_rent_type_idx').on(table.rentType),
    index('tenant_requests_category_idx').on(table.category),
  ],
);

export const conversations = pgTable(
  'conversations',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id').references(() => listings.id, { onDelete: 'cascade' }),
    tenantRequestId: text('tenant_request_id').references(() => tenantRequests.id, {
      onDelete: 'cascade',
    }),
    publisherId: text('publisher_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    inquirerId: text('inquirer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('conversations_listing_inquirer_idx')
      .on(table.listingId, table.inquirerId)
      .where(sql`${table.listingId} is not null`),
    uniqueIndex('conversations_seeker_inquirer_idx')
      .on(table.tenantRequestId, table.inquirerId)
      .where(sql`${table.tenantRequestId} is not null`),
  ],
);

export const messageTemplates = pgTable(
  'message_templates',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    body: text('body').notNull(),
    kind: messageTemplateKindEnum('kind').notNull().default('general'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('message_templates_user_idx').on(table.userId)],
);

/**
 * Beta: digital rental agreements signed by both parties inside a conversation.
 * The proposer signs on creation; the agreement becomes binding once the
 * counterparty also signs.
 */
export const agreements = pgTable(
  'agreements',
  {
    id: text('id').primaryKey(),
    conversationId: text('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    listingId: text('listing_id').references(() => listings.id, { onDelete: 'set null' }),
    proposerId: text('proposer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    counterpartyId: text('counterparty_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: agreementStatusEnum('status').notNull().default('proposed'),
    title: text('title').notNull(),
    monthlyRent: integer('monthly_rent').notNull(),
    deposit: integer('deposit'),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }),
    terms: text('terms'),
    proposerSignatureName: text('proposer_signature_name').notNull(),
    proposerSignedAt: timestamp('proposer_signed_at', { withTimezone: true }).notNull().defaultNow(),
    counterpartySignatureName: text('counterparty_signature_name'),
    counterpartySignedAt: timestamp('counterparty_signed_at', { withTimezone: true }),
    declineReason: text('decline_reason'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    /** Editable contract inputs (clauses toggled off, property/keys/bank details…). */
    contractConfig: jsonb('contract_config').$type<AgreementContractConfig>(),
    /** Rendered sublease contract markdown, frozen when both parties have signed. */
    contractMarkdown: text('contract_markdown'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('agreements_conversation_idx').on(table.conversationId),
    index('agreements_listing_idx').on(table.listingId),
  ],
);

export const listingViews = pgTable(
  'listing_views',
  {
    id: text('id').primaryKey(),
    listingId: text('listing_id')
      .notNull()
      .references(() => listings.id, { onDelete: 'cascade' }),
    viewerId: text('viewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    firstViewedAt: timestamp('first_viewed_at', { withTimezone: true }).notNull().defaultNow(),
    lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('listing_views_listing_viewer_idx').on(table.listingId, table.viewerId),
    index('listing_views_viewer_idx').on(table.viewerId),
  ],
);

export const profileViews = pgTable(
  'profile_views',
  {
    id: text('id').primaryKey(),
    profileUserId: text('profile_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    viewerId: text('viewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    firstViewedAt: timestamp('first_viewed_at', { withTimezone: true }).notNull().defaultNow(),
    lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('profile_views_profile_viewer_idx').on(table.profileUserId, table.viewerId),
    index('profile_views_profile_user_idx').on(table.profileUserId),
  ],
);

export const savedSearches = pgTable(
  'saved_searches',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: savedSearchTypeEnum('type').notNull(),
    name: text('name').notNull(),
    filters: jsonb('filters').notNull().$type<Record<string, unknown>>(),
    filterHash: text('filter_hash').notNull(),
    notifyEnabled: boolean('notify_enabled').notNull().default(true),
    lastKnownIds: jsonb('last_known_ids').notNull().$type<string[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('saved_searches_user_hash_idx').on(table.userId, table.filterHash),
    index('saved_searches_user_idx').on(table.userId),
    index('saved_searches_type_idx').on(table.type),
  ],
);

export const userNotificationPreferences = pgTable('user_notification_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  inAppEnabled: boolean('in_app_enabled').notNull().default(true),
  emailEnabled: boolean('email_enabled').notNull().default(true),
  notifyMessages: boolean('notify_messages').notNull().default(true),
  notifySavedSearches: boolean('notify_saved_searches').notNull().default(true),
  notifyProfileViews: boolean('notify_profile_views').notNull().default(true),
  notifyListingUpdates: boolean('notify_listing_updates').notNull().default(true),
  notifyProductNews: boolean('notify_product_news').notNull().default(false),
  emailDigest: emailDigestEnum('email_digest').notNull().default('instant'),
  quietHoursEnabled: boolean('quiet_hours_enabled').notNull().default(false),
  quietHoursStart: text('quiet_hours_start'),
  quietHoursEnd: text('quiet_hours_end'),
  acceptInquiries: boolean('accept_inquiries').notNull().default(true),
  preferredContactHours: text('preferred_contact_hours'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const moderationResults = pgTable(
  'moderation_results',
  {
    id: text('id').primaryKey(),
    entityType: moderationEntityTypeEnum('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    field: moderationFieldEnum('field').notNull(),
    score: doublePrecision('score').notNull(),
    labels: jsonb('labels').notNull().$type<string[]>().default([]),
    approved: boolean('approved').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('moderation_results_entity_idx').on(table.entityType, table.entityId)],
);

/**
 * Shared in-app notification inbox. Every feature (saved searches, circle,
 * house-sitting, …) writes here. `dedupeKey` makes inserts idempotent.
 */
export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    link: text('link').notNull(),
    dedupeKey: text('dedupe_key'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('notifications_user_idx').on(table.userId),
    index('notifications_user_unread_idx').on(table.userId, table.readAt),
    uniqueIndex('notifications_dedupe_idx')
      .on(table.userId, table.dedupeKey)
      .where(sql`${table.dedupeKey} is not null`),
  ],
);

export const emailTrackingEventTypeEnum = pgEnum('email_tracking_event_type', ['open', 'click']);

export const emailSends = pgTable(
  'email_sends',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    toEmail: text('to_email').notNull(),
    category: text('category').notNull(),
    subject: text('subject').notNull(),
    links: jsonb('links').notNull().$type<string[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('email_sends_user_idx').on(table.userId),
    index('email_sends_category_idx').on(table.category),
    index('email_sends_created_at_idx').on(table.createdAt),
  ],
);

export const emailTrackingEvents = pgTable(
  'email_tracking_events',
  {
    id: text('id').primaryKey(),
    sendId: text('send_id')
      .notNull()
      .references(() => emailSends.id, { onDelete: 'cascade' }),
    type: emailTrackingEventTypeEnum('type').notNull(),
    linkIndex: integer('link_index'),
    userAgent: text('user_agent'),
    ipAddress: text('ip_address'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('email_tracking_events_send_idx').on(table.sendId),
    index('email_tracking_events_type_idx').on(table.type),
  ],
);

/**
 * Closed-group social graph. A single row represents the relationship between
 * two users; `areConnected` checks both directions. Connections are formed by
 * accepting an invite link (invite-only), never by public discovery.
 */
export const connections = pgTable(
  'connections',
  {
    id: text('id').primaryKey(),
    requesterId: text('requester_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    addresseeId: text('addressee_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: connectionStatusEnum('status').notNull().default('accepted'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('connections_pair_idx').on(table.requesterId, table.addresseeId),
    index('connections_requester_idx').on(table.requesterId),
    index('connections_addressee_idx').on(table.addresseeId),
  ],
);

/** Shareable invite links used to grow a user's closed circle. */
export const connectionInvites = pgTable(
  'connection_invites',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    inviterId: text('inviter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: text('label'),
    maxUses: integer('max_uses'),
    usedCount: integer('used_count').notNull().default(0),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index('connection_invites_inviter_idx').on(table.inviterId)],
);

/**
 * "My place is free in this time" — an informal, non-public offer visible only
 * to the host's connections. Deliberately lighter than `listings`.
 */
export const stayOffers = pgTable(
  'stay_offers',
  {
    id: text('id').primaryKey(),
    hostId: text('host_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    note: text('note'),
    locationLabel: text('location_label').notNull(),
    /** Address / key handover / door code — revealed only to the accepted guest. */
    accessDetails: text('access_details'),
    availableFrom: timestamp('available_from', { withTimezone: true }).notNull(),
    availableTo: timestamp('available_to', { withTimezone: true }).notNull(),
    status: stayOfferStatusEnum('status').notNull().default('open'),
    visibility: stayOfferVisibilityEnum('visibility').notNull().default('connections'),
    autoAcceptFirst: boolean('auto_accept_first').notNull().default(false),
    takenByUserId: text('taken_by_user_id').references(() => users.id, { onDelete: 'set null' }),
    photoUrls: jsonb('photo_urls').notNull().$type<string[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('stay_offers_host_idx').on(table.hostId),
    index('stay_offers_status_idx').on(table.status),
  ],
);

/** Explicit audience subset, used only when a stay offer's visibility = 'selected'. */
export const stayOfferAudience = pgTable(
  'stay_offer_audience',
  {
    offerId: text('offer_id')
      .notNull()
      .references(() => stayOffers.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
  },
  (table) => [uniqueIndex('stay_offer_audience_idx').on(table.offerId, table.userId)],
);

/**
 * "I want to take it." Claims queue by `createdAt` (first-come-first-serve).
 * The host accepts one, which atomically blocks the rest.
 */
export const stayClaims = pgTable(
  'stay_claims',
  {
    id: text('id').primaryKey(),
    offerId: text('offer_id')
      .notNull()
      .references(() => stayOffers.id, { onDelete: 'cascade' }),
    claimantId: text('claimant_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: stayClaimStatusEnum('status').notNull().default('interested'),
    message: text('message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    respondedAt: timestamp('responded_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('stay_claims_offer_claimant_idx').on(table.offerId, table.claimantId),
    index('stay_claims_offer_created_idx').on(table.offerId, table.createdAt),
  ],
);
