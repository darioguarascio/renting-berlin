import { eq } from 'drizzle-orm';
import { closeDb, db } from '../db';
import { userNotificationPreferences, users } from '../db/schema';
import { notifyProductNewsEmail } from '../lib/user-notifications';

async function sendProductNews() {
  const titleFlagIndex = process.argv.indexOf('--title');
  const bodyFlagIndex = process.argv.indexOf('--body');
  const linkFlagIndex = process.argv.indexOf('--link');
  const dryRun = process.argv.includes('--dry-run');

  const title = titleFlagIndex !== -1 ? process.argv[titleFlagIndex + 1] : '';
  const body = bodyFlagIndex !== -1 ? process.argv[bodyFlagIndex + 1] : '';
  const link = linkFlagIndex !== -1 ? process.argv[linkFlagIndex + 1] : '/dashboard';

  if (!title || !body || title.startsWith('-') || body.startsWith('-')) {
    throw new Error('Usage: send-product-news --title "..." --body "..." [--link /dashboard] [--dry-run]');
  }

  const recipients = await db
    .select({ userId: users.id, email: users.email })
    .from(users)
    .innerJoin(userNotificationPreferences, eq(userNotificationPreferences.userId, users.id))
    .where(eq(userNotificationPreferences.notifyProductNews, true));

  const enabled = recipients.filter((row) => row.email);
  console.log(`Found ${enabled.length} users opted in to product news`);

  if (dryRun) {
    for (const row of enabled.slice(0, 5)) {
      console.log(`  - ${row.email}`);
    }
    if (enabled.length > 5) {
      console.log(`  ... and ${enabled.length - 5} more`);
    }
    return;
  }

  let sent = 0;
  for (const row of enabled) {
    await notifyProductNewsEmail({
      userId: row.userId,
      title,
      body,
      link,
    });
    sent += 1;
  }

  console.log(`Queued product news for ${sent} users`);
}

sendProductNews()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
