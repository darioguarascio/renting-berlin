import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';

function getTrustedOrigins(): string[] {
  const base = process.env.BETTER_AUTH_URL ?? 'http://localhost:4321';
  const extra =
    process.env.BETTER_AUTH_TRUSTED_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];

  const devDefaults =
    process.env.NODE_ENV !== 'production'
      ? ['http://localhost:*', 'http://127.0.0.1:*']
      : [];

  return [...new Set([base, ...devDefaults, ...extra])];
}

function getAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('BETTER_AUTH_SECRET is required in production');
  }
  return 'dev-only-not-for-production';
}

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      enabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
      enabled: Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
    },
  },
  user: {
    additionalFields: {
      lastAuthProvider: {
        type: 'string',
        required: false,
      },
    },
  },
  trustedOrigins: getTrustedOrigins(),
  secret: getAuthSecret(),
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4321',
});

export type Session = typeof auth.$Infer.Session;
