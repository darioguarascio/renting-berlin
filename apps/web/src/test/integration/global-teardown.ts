import { closeTestDatabase } from '../fixtures/close-db';

export default async function globalTeardown() {
  await closeTestDatabase();
}
