import { closeDb } from '../../db';

export async function closeTestDatabase(): Promise<void> {
  await closeDb();
}
