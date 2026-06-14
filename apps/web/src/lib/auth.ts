import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { captcha, magicLink } from 'better-auth/plugins';
import { db } from '../db';
import * as schema from '../db/schema';
import { sendBrandedEmail } from './email/send';
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

function getTurnstileAllowedHostnames(): string[] {
  try {
    const host = new URL(getSiteUrl()).hostname;
    const hosts = [host];
    if (process.env.NODE_ENV !== 'production') {
      hosts.push('localhost', '127.0.0.1');
    }
    return hosts;
  } catch {
    return ['localhost'];
  }
}

function getAuthPlugins() {
  const plugins = [
    magicLink({
      expiresIn: 60 * 15,
      sendMagicLink: async ({ email, url }) => {
        await sendBrandedEmail({
          to: email,
          category: 'magic_link',
          content: {
            subject: 'Sign in to renting.berlin',
            preview: 'Your secure sign-in link is ready.',
            title: 'Sign in to renting.berlin',
            paragraphs: [
              'Click the button below to sign in. This link expires in 15 minutes.',
              'If you did not request this email, you can safely ignore it.',
            ],
            cta: { label: 'Sign in to renting.berlin', href: url },
          },
        });
      },
    }),
  ];

  const turnstileSecret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (turnstileSecret) {
    plugins.push(
      captcha({
        provider: 'cloudflare-turnstile',
        secretKey: turnstileSecret,
        endpoints: ['/sign-in/magic-link'],
        allowedHostnames: getTurnstileAllowedHostnames(),
      }),
    );
  }

  return plugins;
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
  plugins: getAuthPlugins(),
});

export type Session = typeof auth.$Infer.Session;

export const OAUTH_PROVIDERS = ['google', 'github'] as const;
export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export function getEnabledOAuthProviders(): OAuthProvider[] {
  return OAUTH_PROVIDERS.filter(isOAuthProviderEnabled);
}
