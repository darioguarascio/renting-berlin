import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { auth } from '../lib/auth';
import { DEV_LANDLORD, DEV_SEEKER } from '../lib/dev-user';
import { db } from '../db';
import { conversations, listings, messages, tenantRequests, users } from '../db/schema';
import { warmListingCache } from '../lib/search';
import { seoSlug } from '../lib/urls';
import { setUserHandle } from '../lib/user-handle';

const SAMPLE_LISTINGS = [
  {
    title: 'Bright room in Kreuzberg WG',
    shortCode: 'rbk7k2mn',
    legacySlug: 'bright-room-kreuzberg-wg',
    category: 'shared_room' as const,
    rentType: 'long_term' as const,
    neighborhood: 'kreuzberg',
    address: 'Oranienstraße, 10999 Berlin',
    lat: 52.4993,
    lng: 13.4232,
    sizeSqm: 18,
    rooms: 1,
    rentPerMonth: 650,
    anmeldungAvailable: true,
    schufaRequired: false,
    photo: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
    description: 'Sunny room in a friendly 3-person WG. Shared kitchen and bathroom. Close to Görlitzer Park.',
  },
  {
    title: '2-room flat in Prenzlauer Berg',
    shortCode: 'pzb4m8qt',
    legacySlug: '2-room-flat-prenzlauer-berg',
    category: 'full_flat' as const,
    rentType: 'long_term' as const,
    neighborhood: 'prenzlauer-berg',
    address: 'Kastanienallee, 10435 Berlin',
    lat: 52.5394,
    lng: 13.4094,
    sizeSqm: 58,
    rooms: 2,
    rentPerMonth: 1350,
    anmeldungAvailable: true,
    schufaRequired: true,
    photo: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    description: 'Charming Altbau with high ceilings, balcony, and fitted kitchen. Quiet courtyard building.',
  },
  {
    title: 'Furnished studio in Mitte',
    shortCode: 'mit3n9vx',
    legacySlug: 'furnished-studio-mitte',
    category: 'full_flat' as const,
    rentType: 'short_term' as const,
    neighborhood: 'mitte',
    address: 'Torstraße, 10119 Berlin',
    lat: 52.529,
    lng: 13.401,
    sizeSqm: 32,
    rooms: 1,
    rentPerMonth: 1100,
    anmeldungAvailable: false,
    schufaRequired: false,
    photo: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
    description: 'Fully furnished studio available for 3–6 months. Perfect for newcomers. All utilities included.',
  },
  {
    title: 'Spacious room near Neukölln canal',
    shortCode: 'nkl2c5hw',
    legacySlug: 'room-neukolln-canal',
    category: 'shared_room' as const,
    rentType: 'long_term' as const,
    neighborhood: 'neukolln',
    address: 'Maybachufer, 12047 Berlin',
    lat: 52.487,
    lng: 13.428,
    sizeSqm: 22,
    rooms: 1,
    rentPerMonth: 580,
    anmeldungAvailable: true,
    schufaRequired: false,
    photo: 'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800&q=80',
    description: 'Large room in a 4-person WG with garden access. Weekly cleaning included.',
  },
  {
    title: 'Modern 3-room in Friedrichshain',
    shortCode: 'fsh8r1kp',
    legacySlug: 'modern-3-room-friedrichshain',
    category: 'full_flat' as const,
    rentType: 'long_term' as const,
    neighborhood: 'friedrichshain',
    address: 'Warschauer Straße, 10243 Berlin',
    lat: 52.505,
    lng: 13.449,
    sizeSqm: 78,
    rooms: 3,
    rentPerMonth: 1680,
    anmeldungAvailable: true,
    schufaRequired: true,
    photo: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    description: 'Newly renovated flat with elevator, dishwasher, and bike storage. 5 min from U-Bahn.',
  },
  {
    title: 'Budget room in Wedding',
    shortCode: 'wed5b2jr',
    legacySlug: 'budget-room-wedding',
    category: 'shared_room' as const,
    rentType: 'long_term' as const,
    neighborhood: 'wedding',
    address: 'Müllerstraße, 13349 Berlin',
    lat: 52.554,
    lng: 13.343,
    sizeSqm: 14,
    rooms: 1,
    rentPerMonth: 420,
    anmeldungAvailable: false,
    schufaRequired: false,
    photo: 'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&q=80',
    description: 'Affordable room in a quiet WG. No Anmeldung but great for short stays while searching.',
  },
];

type SeekerSeed = {
  handle: string;
  legacySlug: string;
  title: string;
  userName: string;
  userEmail: string;
  category: 'full_flat' | 'shared_room';
  rentType: 'long_term' | 'short_term';
  budgetMin: number;
  budgetMax: number;
  neighborhoods: string[];
  householdType: 'single' | 'couple';
  nationality: string;
  birthYear: number;
  occupation: string;
  isStudent: boolean;
  monthlyIncome: number;
  hasSchufa: boolean;
  anmeldungNeeded: boolean;
  hasPets: boolean;
  isSmoker: boolean;
  needsBedLinens: boolean;
  languages: string[];
  description: string;
  photo?: string;
  roomsMin?: number;
  sizeMin?: number;
};

const SAMPLE_SEEKERS: SeekerSeed[] = [
  {
    handle: 'dev_seeker',
    legacySlug: 'seeker-dev-kreuzberg-room',
    title: 'Software engineer looking for room in Kreuzberg',
    userName: 'Dev Seeker',
    userEmail: DEV_SEEKER.email,
    category: 'shared_room',
    rentType: 'long_term',
    budgetMin: 600,
    budgetMax: 850,
    neighborhoods: ['kreuzberg', 'neukolln', 'friedrichshain'],
    householdType: 'single',
    nationality: 'US',
    birthYear: 1994,
    occupation: 'Software engineer',
    isStudent: false,
    monthlyIncome: 4200,
    hasSchufa: true,
    anmeldungNeeded: true,
    hasPets: false,
    isSmoker: false,
    needsBedLinens: false,
    languages: ['english', 'german'],
    description:
      'Relocated to Berlin for work at a startup in Mitte. Quiet, tidy, and used to WG life. Looking for a long-term room with Anmeldung from April.',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80',
  },
  {
    handle: 'emma_luca',
    legacySlug: 'seeker-couple-prenzlauer-berg',
    title: 'Couple seeking 2-room flat in Prenzlauer Berg',
    userName: 'Emma & Luca',
    userEmail: 'emma.seeker@renting.berlin',
    category: 'full_flat',
    rentType: 'long_term',
    budgetMin: 1200,
    budgetMax: 1600,
    neighborhoods: ['prenzlauer-berg', 'mitte', 'friedrichshain'],
    householdType: 'couple',
    nationality: 'IT',
    birthYear: 1991,
    occupation: 'Marketing manager',
    isStudent: false,
    monthlyIncome: 5800,
    hasSchufa: true,
    anmeldungNeeded: true,
    hasPets: false,
    isSmoker: false,
    needsBedLinens: true,
    languages: ['english', 'italian', 'german'],
    description:
      'Italian couple, both employed full-time. We work hybrid and need a calm 2-room flat. Non-smokers, no pets. Happy to provide SCHUFA and employment contracts.',
    photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80',
    roomsMin: 2,
    sizeMin: 50,
  },
  {
    handle: 'yuki_berlin',
    legacySlug: 'seeker-student-neukolln-wg',
    title: 'Master student looking for WG room in Neukölln',
    userName: 'Yuki Tanaka',
    userEmail: 'yuki.seeker@renting.berlin',
    category: 'shared_room',
    rentType: 'long_term',
    budgetMin: 450,
    budgetMax: 650,
    neighborhoods: ['neukolln', 'kreuzberg', 'wedding'],
    householdType: 'single',
    nationality: 'OTHER',
    birthYear: 2001,
    occupation: 'University student',
    isStudent: true,
    monthlyIncome: 1200,
    hasSchufa: false,
    anmeldungNeeded: true,
    hasPets: false,
    isSmoker: false,
    needsBedLinens: true,
    languages: ['english', 'german', 'other'],
    description:
      'TU Berlin master student, third semester. I cook a lot of Japanese food but keep shared spaces clean. Need Anmeldung for my visa renewal. Quiet after 22:00.',
    photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80',
  },
  {
    handle: 'marco_silva',
    legacySlug: 'seeker-designer-mitte-flat',
    title: 'Designer seeking furnished flat in Mitte',
    userName: 'Marco Silva',
    userEmail: 'marco.seeker@renting.berlin',
    category: 'full_flat',
    rentType: 'short_term',
    budgetMin: 900,
    budgetMax: 1300,
    neighborhoods: ['mitte', 'kreuzberg', 'schoneberg'],
    householdType: 'single',
    nationality: 'BR',
    birthYear: 1996,
    occupation: 'Product designer',
    isStudent: false,
    monthlyIncome: 3800,
    hasSchufa: true,
    anmeldungNeeded: false,
    hasPets: true,
    isSmoker: false,
    needsBedLinens: false,
    languages: ['english', 'portuguese', 'spanish'],
    description:
      'Brazilian designer on a 6-month contract. One small cat (well behaved). Looking for a furnished 1-bedroom for a short-term stay. Can provide references from previous landlords in Lisbon.',
    photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80',
    roomsMin: 1,
    sizeMin: 35,
  },
  {
    handle: 'amina_hassan',
    legacySlug: 'seeker-nurse-wedding-room',
    title: 'Nurse looking for affordable room near Wedding',
    userName: 'Amina Hassan',
    userEmail: 'amina.seeker@renting.berlin',
    category: 'shared_room',
    rentType: 'long_term',
    budgetMin: 400,
    budgetMax: 550,
    neighborhoods: ['wedding', 'mitte', 'pankow'],
    householdType: 'single',
    nationality: 'EG',
    birthYear: 1998,
    occupation: 'Nurse',
    isStudent: false,
    monthlyIncome: 2900,
    hasSchufa: true,
    anmeldungNeeded: true,
    hasPets: false,
    isSmoker: false,
    needsBedLinens: true,
    languages: ['english', 'arabic', 'german'],
    description:
      'Shift worker at Charité — early mornings and late evenings. Need a peaceful WG with respectful flatmates. SCHUFA and employment proof available.',
    photo: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80',
  },
];

async function ensureAuthUser(email: string, password: string, name: string): Promise<string> {
  try {
    await auth.api.signUpEmail({ body: { email, password, name } });
  } catch {
    // account may already exist
  }

  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (user) return user.id;

  const id = nanoid();
  await db.insert(users).values({ id, name, email, emailVerified: true });
  return id;
}

async function ensureDisplayUser(name: string, email: string): Promise<string> {
  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) return existing.id;

  const id = nanoid();
  await db.insert(users).values({ id, name, email, emailVerified: false });
  return id;
}

async function seedListings(publisherId: string) {
  for (const sample of SAMPLE_LISTINGS) {
    const slug = seoSlug(sample.title);
    const exists = await db.query.listings.findFirst({ where: eq(listings.shortCode, sample.shortCode) });
    if (exists) continue;

    const legacy = await db.query.listings.findFirst({ where: eq(listings.slug, sample.legacySlug) });
    if (legacy) {
      await db
        .update(listings)
        .set({ slug, shortCode: sample.shortCode })
        .where(eq(listings.id, legacy.id));
      continue;
    }

    await db
      .insert(listings)
      .values({
        id: nanoid(),
        slug,
        shortCode: sample.shortCode,
        publisherId,
        title: sample.title,
        status: 'active',
        category: sample.category,
        rentType: sample.rentType,
        availableFrom: new Date(),
        availableTo: null,
        sizeSqm: sample.sizeSqm,
        rooms: sample.rooms,
        onlineViewingAvailable: true,
        anmeldungAvailable: sample.anmeldungAvailable,
        schufaRequired: sample.schufaRequired,
        address: sample.address,
        neighborhood: sample.neighborhood,
        lat: sample.lat,
        lng: sample.lng,
        approximateLocation: false,
        costs: {
          rentPerMonth: sample.rentPerMonth,
          utilities: 120,
          deposit: sample.rentPerMonth * 2,
        },
        descriptions: {
          apartment: sample.description,
          location: `Located in ${sample.neighborhood}, Berlin.`,
        },
        requiredDocuments: sample.schufaRequired ? ['schufa', 'proof_of_income'] : ['passport'],
        equipment: ['fitted_kitchen', 'washing_machine', 'balcony'],
        photoUrls: [sample.photo],
        publishedAt: new Date(),
      });
  }
}

async function seedSeekers() {
  const now = new Date();
  for (const seeker of SAMPLE_SEEKERS) {
    const seekerId =
      seeker.userEmail === DEV_SEEKER.email
        ? await ensureAuthUser(seeker.userEmail, DEV_SEEKER.password, seeker.userName)
        : await ensureDisplayUser(seeker.userName, seeker.userEmail);

    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, seekerId),
      columns: { handle: true },
    });
    if (!existingUser?.handle) {
      await setUserHandle(seekerId, seeker.handle);
    }

    const exists = await db.query.tenantRequests.findFirst({
      where: eq(tenantRequests.slug, seeker.legacySlug),
    });
    if (exists) continue;

    await db
      .insert(tenantRequests)
      .values({
        id: nanoid(),
        slug: seeker.legacySlug,
        seekerId,
        title: seeker.title,
        status: 'active',
        category: seeker.category,
        rentType: seeker.rentType,
        budgetMin: seeker.budgetMin,
        budgetMax: seeker.budgetMax,
        desiredNeighborhoods: seeker.neighborhoods,
        availableFrom: now,
        availableTo: null,
        sizeMin: seeker.sizeMin ?? null,
        roomsMin: seeker.roomsMin ?? null,
        anmeldungNeeded: seeker.anmeldungNeeded,
        hasSchufa: seeker.hasSchufa,
        householdType: seeker.householdType,
        monthlyIncome: seeker.monthlyIncome,
        hasPets: seeker.hasPets,
        nationality: seeker.nationality,
        birthYear: seeker.birthYear,
        needsBedLinens: seeker.needsBedLinens,
        occupation: seeker.occupation,
        isStudent: seeker.isStudent,
        isSmoker: seeker.isSmoker,
        spokenLanguages: seeker.languages,
        description: seeker.description,
        photoUrls: seeker.photo ? [seeker.photo] : [],
        publishedAt: now,
        updatedAt: now,
      });
  }
}

async function seedSampleConversation(landlordId: string, seekerId: string) {
  const listing = await db.query.listings.findFirst({
    where: eq(listings.shortCode, 'rbk7k2mn'),
  });
  if (!listing) return;

  const existing = await db.query.conversations.findFirst({
    where: eq(conversations.listingId, listing.id),
  });
  if (existing) return;

  const conversationId = nanoid();
  const hour = 60 * 60 * 1000;

  await db.insert(conversations).values({
    id: conversationId,
    listingId: listing.id,
    publisherId: landlordId,
    inquirerId: seekerId,
    updatedAt: new Date(),
  });

  const thread = [
    { senderId: seekerId, body: 'Hi! Is the room in Kreuzberg still available? I saw your listing on renting.berlin.', ago: 48 * hour },
    { senderId: landlordId, body: 'Hello! Yes, it is still free from April. Would you like to schedule a viewing?', ago: 36 * hour },
    { senderId: seekerId, body: 'That would be great. I\'m available this weekend — Saturday afternoon works best for me.', ago: 24 * hour },
    { senderId: landlordId, body: 'Perfect — how about Saturday at 3pm? I\'ll send you the exact address in a DM.', ago: 12 * hour },
    { senderId: seekerId, body: 'Saturday 3pm works. I\'ll bring my SCHUFA and employment contract. See you then!', ago: 2 * hour },
  ];

  for (const msg of thread) {
    await db.insert(messages).values({
      id: nanoid(),
      conversationId,
      senderId: msg.senderId,
      body: msg.body,
      createdAt: new Date(Date.now() - msg.ago),
      readAt: msg.senderId === landlordId ? new Date() : null,
    });
  }

  console.log('Seeded sample conversation for Kreuzberg room listing');
}

async function seed() {
  const landlordId = await ensureAuthUser(
    DEV_LANDLORD.email,
    DEV_LANDLORD.password,
    DEV_LANDLORD.name,
  );
  const seekerId = await ensureAuthUser(
    DEV_SEEKER.email,
    DEV_SEEKER.password,
    DEV_SEEKER.name,
  );

  await seedListings(landlordId);

  for (const sample of SAMPLE_LISTINGS) {
    await db
      .update(listings)
      .set({ publisherId: landlordId })
      .where(eq(listings.shortCode, sample.shortCode));
  }

  await seedSeekers();

  const count = await warmListingCache();
  console.log(`Seeded ${SAMPLE_LISTINGS.length} listings, warmed ${count} in Redis cache`);
  console.log(`Seeded ${SAMPLE_SEEKERS.length} seeker profiles`);

  await seedSampleConversation(landlordId, seekerId);

  console.log('');
  console.log('  Dev accounts (password: devdevdev):');
  console.log(`  Seeker:   ${DEV_SEEKER.email}`);
  console.log(`  Landlord: ${DEV_LANDLORD.email}`);
  console.log('');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
