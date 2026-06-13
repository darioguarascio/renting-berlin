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

export const listingCategoryEnum = pgEnum('listing_category', ['full_flat', 'shared_room']);
export const rentTypeEnum = pgEnum('rent_type', ['long_term', 'short_term', 'overnight']);
export const listingStatusEnum = pgEnum('listing_status', ['draft', 'active', 'paused', 'closed']);
export const householdTypeEnum = pgEnum('household_type', ['single', 'couple']);
export const savedSearchTypeEnum = pgEnum('saved_search_type', ['listings', 'tenant_requests']);
export const emailDigestEnum = pgEnum('email_digest', ['instant', 'daily', 'weekly']);
export const messageTemplateKindEnum = pgEnum('message_template_kind', ['inquiry', 'outreach', 'general']);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  handle: text('handle').unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  lastAuthProvider: text('last_auth_provider'),
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
    onlineViewingAvailable: boolean('online_viewing_available').notNull().default(false),
    anmeldungAvailable: boolean('anmeldung_available').notNull().default(false),
    schufaRequired: boolean('schufa_required').notNull().default(false),
    address: text('address').notNull(),
    neighborhood: text('neighborhood').notNull(),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    approximateLocation: boolean('approximate_location').notNull().default(false),
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
    equipment: jsonb('equipment').notNull().$type<string[]>().default([]),
    photoUrls: jsonb('photo_urls').notNull().$type<string[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    index('listings_status_idx').on(table.status),
    index('listings_neighborhood_idx').on(table.neighborhood),
    index('listings_rent_type_idx').on(table.rentType),
    index('listings_category_idx').on(table.category),
    index('listings_publisher_idx').on(table.publisherId),
    uniqueIndex('listings_slug_short_code_idx').on(table.slug, table.shortCode),
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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => [
    index('tenant_requests_status_idx').on(table.status),
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

export const searchNotifications = pgTable(
  'search_notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    savedSearchId: text('saved_search_id')
      .notNull()
      .references(() => savedSearches.id, { onDelete: 'cascade' }),
    searchType: savedSearchTypeEnum('search_type').notNull(),
    itemId: text('item_id').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    link: text('link').notNull(),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('search_notifications_user_idx').on(table.userId),
    index('search_notifications_user_unread_idx').on(table.userId, table.readAt),
    uniqueIndex('search_notifications_unique_item_idx').on(table.savedSearchId, table.itemId),
  ],
);
