import { loadTestFixturesFromDb, type TestFixtures } from '../fixtures/seed';

export async function loadTestFixtures(): Promise<TestFixtures> {
  return loadTestFixturesFromDb();
}
