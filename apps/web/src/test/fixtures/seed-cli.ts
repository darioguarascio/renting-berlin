import { closeTestDatabase } from './close-db';
import { seedTestFixtures } from './seed';

try {
  const fixtures = await seedTestFixtures();
  console.log('Test database seeded.');
  console.log(`  Landlord:  ${fixtures.landlord.email}`);
  console.log(`  Seeker:    ${fixtures.seeker.email}`);
  console.log(`  Listing:   ${fixtures.listing.title}`);
  console.log(`  Profile:   ${fixtures.seekerProfile.title}`);
  await closeTestDatabase();
} catch (error) {
  console.error('Failed to seed test database:', error);
  await closeTestDatabase().catch(() => undefined);
  process.exit(1);
}
