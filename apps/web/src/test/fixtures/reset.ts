import { sql } from 'drizzle-orm';
import { db } from '../../db';

const TRUNCATE_SQL = sql`
  TRUNCATE TABLE
    notifications,
    stay_claims,
    stay_offer_audience,
    stay_offers,
    connection_invites,
    connections,
    messages,
    conversations,
    message_templates,
    saved_searches,
    profile_views,
    listing_views,
    feedback,
    rental_transactions,
    favorites,
    tenant_requests,
    listings,
    user_notification_preferences,
    sessions,
    accounts,
    verifications,
    reserved_handles,
    users
  CASCADE
`;

export async function resetTestDatabase(): Promise<void> {
  await db.execute(TRUNCATE_SQL);
}

export async function resetConversationData(): Promise<void> {
  await db.execute(sql`TRUNCATE messages, conversations CASCADE`);
}
