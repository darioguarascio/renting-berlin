import path from 'node:path';
import { closeDb } from '../db';
import { archiveOldListings, parseArchivePolicyFromArgs } from '../lib/listing-archive';

function describeDatabaseTarget(): string {
  const url = process.env.DATABASE_URL;
  if (!url) return 'unknown (DATABASE_URL not set)';
  try {
    const normalized = url.replace(/^postgres:/, 'postgresql:');
    const parsed = new URL(normalized);
    const db = parsed.pathname.replace(/^\//, '') || 'postgres';
    return `${parsed.hostname}:${parsed.port || '5432'}/${db}`;
  } catch {
    return 'unknown (invalid DATABASE_URL)';
  }
}

async function main() {
  const options = parseArchivePolicyFromArgs(process.argv);
  const uploadsDir =
    process.env.UPLOADS_DIR ?? path.join(process.cwd(), 'public', 'uploads');

  console.log(`Target database: ${describeDatabaseTarget()}`);
  console.log(
    options.dryRun
      ? 'Dry run: no writes or file deletions'
      : `Archiving with uploads dir ${uploadsDir}`,
  );

  const result = await archiveOldListings({
    ...options,
    uploadsDir,
  });

  console.log(
    `${options.dryRun ? 'Would archive' : 'Archived'} ${result.archived} listings in ${result.batches} batch(es)`,
  );
  console.log(`Deleted ${result.filesDeleted} local upload file(s)`);
  console.log('By reason:', result.byReason);
  if (result.localPhotoUrls.length > 0) {
    console.log(`Local photos touched: ${result.localPhotoUrls.length}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await closeDb();
  });
