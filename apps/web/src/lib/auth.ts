import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import * as schema from '../db/schema';
import { getSiteUrl } from './site-url';

function getTrustedOrigins(): string[] {
  const base = getSiteUrl();
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

function isOAuthProviderEnabled(provider: 'google' | 'github'): boolean {
  if (provider === 'google') {
    return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  }
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
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
      enabled: isOAuthProviderEnabled('google'),
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID ?? '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET ?? '',
      enabled: isOAuthProviderEnabled('github'),
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
  baseURL: getSiteUrl(),
});

export type Session = typeof auth.$Infer.Session;

export const OAUTH_PROVIDERS = ['google', 'github'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export function getEnabledOAuthProviders(): OAuthProvider[] {
  return OAUTH_PROVIDERS.filter(isOAuthProviderEnabled);
}
