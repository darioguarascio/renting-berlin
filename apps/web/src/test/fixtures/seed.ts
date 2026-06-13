import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../../db';
import { listings, tenantRequests, users } from '../../db/schema';
import { auth } from '../../lib/auth';
import { listingHref, seoSlug } from '../../lib/urls';
import { setUserHandle } from '../../lib/user-handle';
import {
  TEST_LANDLORD,
  TEST_LISTING,
  TEST_SEEKER,
  TEST_SEEKER_PROFILE,
  TEST_STRANGER,
} from './constants';
import { resetTestDatabase } from './reset';

export interface TestFixtures {
  landlord: { id: string; email: string; password: string; handle: string };
  seeker: { id: string; email: string; password: string; handle: string };
  stranger: { id: string; email: string; password: string; handle: string };
  listing: { id: string; title: string; href: string; shortCode: string };
  seekerProfile: { id: string; title: string; href: string; slug: string };
}

async function ensureUser(
  input: { email: string; password: string; name: string; handle: string },
): Promise<string> {
  try {
    await auth.api.signUpEmail({
      body: { email: input.email, password: input.password, name: input.name },
    });
  } catch {
    // account may already exist between runs
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (!user) throw new Error(`Failed to create test user: ${input.email}`);

  const currentHandle = user.handle;
  if (!currentHandle) {
    await setUserHandle(user.id, input.handle);
  } else if (currentHandle !== input.handle) {
    throw new Error(`Test user ${input.email} has unexpected handle ${currentHandle}`);
  }

  await db
    .update(users)
    .set({ emailVerified: true, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  return user.id;
}

export async function seedTestFixtures(): Promise<TestFixtures> {
  await resetTestDatabase();

  const landlordId = await ensureUser(TEST_LANDLORD);
  const seekerId = await ensureUser(TEST_SEEKER);
  const strangerId = await ensureUser(TEST_STRANGER);

  const listingSlug = seoSlug(TEST_LISTING.title);
  const listingId = nanoid();

  await db.insert(listings).values({
    id: listingId,
    slug: listingSlug,
    shortCode: TEST_LISTING.shortCode,
    publisherId: landlordId,
    title: TEST_LISTING.title,
    status: 'active',
    category: 'full_flat',
    rentType: 'long_term',
    availableFrom: new Date(),
    availableTo: null,
    sizeSqm: 45,
    rooms: 2,
    onlineViewingAvailable: false,
    anmeldungAvailable: true,
    schufaRequired: false,
    address: 'Teststraße 1, 10115 Berlin',
    neighborhood: 'mitte',
    lat: 52.52,
    lng: 13.405,
    approximateLocation: false,
    costs: { rentPerMonth: 1200, utilities: 150, deposit: 2400 },
    descriptions: { apartment: 'Integration test listing.' },
    requiredDocuments: [],
    equipment: [],
    photoUrls: [],
    publishedAt: new Date(),
  });

  const seekerProfileId = nanoid();
  await db.insert(tenantRequests).values({
    id: seekerProfileId,
    slug: TEST_SEEKER_PROFILE.slug,
    seekerId,
    title: TEST_SEEKER_PROFILE.title,
    status: 'active',
    category: 'shared_room',
    rentType: 'long_term',
    budgetMin: 500,
    budgetMax: 800,
    desiredNeighborhoods: ['mitte', 'kreuzberg'],
    availableFrom: new Date(),
    availableTo: null,
    anmeldungNeeded: true,
    hasSchufa: true,
    householdType: 'single',
    description: 'Integration test seeker profile.',
    photoUrls: [],
    spokenLanguages: ['english'],
    publishedAt: new Date(),
  });

  return {
    landlord: {
      id: landlordId,
      email: TEST_LANDLORD.email,
      password: TEST_LANDLORD.password,
      handle: TEST_LANDLORD.handle,
    },
    seeker: {
      id: seekerId,
      email: TEST_SEEKER.email,
      password: TEST_SEEKER.password,
      handle: TEST_SEEKER.handle,
    },
    stranger: {
      id: strangerId,
      email: TEST_STRANGER.email,
      password: TEST_STRANGER.password,
      handle: TEST_STRANGER.handle,
    },
    listing: {
      id: listingId,
      title: TEST_LISTING.title,
      href: listingHref(listingSlug, TEST_LISTING.shortCode),
      shortCode: TEST_LISTING.shortCode,
    },
    seekerProfile: {
      id: seekerProfileId,
      title: TEST_SEEKER_PROFILE.title,
      href: `/u/${TEST_SEEKER.handle}`,
      slug: TEST_SEEKER_PROFILE.slug,
    },
  };
}

export async function loadTestFixturesFromDb(): Promise<TestFixtures> {
  const [landlord, seeker, stranger, listing, seekerProfile] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.email, TEST_LANDLORD.email) }),
    db.query.users.findFirst({ where: eq(users.email, TEST_SEEKER.email) }),
    db.query.users.findFirst({ where: eq(users.email, TEST_STRANGER.email) }),
    db.query.listings.findFirst({ where: eq(listings.shortCode, TEST_LISTING.shortCode) }),
    db.query.tenantRequests.findFirst({ where: eq(tenantRequests.slug, TEST_SEEKER_PROFILE.slug) }),
  ]);

  if (!landlord || !seeker || !stranger || !listing || !seekerProfile) {
    throw new Error(
      'Test fixtures are missing. Run npm run test:integration (or test:db:seed) before integration tests.',
    );
  }

  return {
    landlord: {
      id: landlord.id,
      email: TEST_LANDLORD.email,
      password: TEST_LANDLORD.password,
      handle: TEST_LANDLORD.handle,
    },
    seeker: {
      id: seeker.id,
      email: TEST_SEEKER.email,
      password: TEST_SEEKER.password,
      handle: TEST_SEEKER.handle,
    },
    stranger: {
      id: stranger.id,
      email: TEST_STRANGER.email,
      password: TEST_STRANGER.password,
      handle: TEST_STRANGER.handle,
    },
    listing: {
      id: listing.id,
      title: listing.title,
      href: listingHref(listing.slug, listing.shortCode),
      shortCode: listing.shortCode,
    },
    seekerProfile: {
      id: seekerProfile.id,
      title: seekerProfile.title,
      href: `/u/${TEST_SEEKER.handle}`,
      slug: seekerProfile.slug,
    },
  };
}
