// @ts-check
import { defineConfig } from 'astro/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import node from '@astrojs/node';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const siteUrl = process.env.SITE_URL || process.env.BETTER_AUTH_URL;
const normalizedSiteUrl = siteUrl?.trim().replace(/\/$/, '');

function getAllowedDomains() {
  if (!normalizedSiteUrl) {
    return [
      { hostname: 'localhost', protocol: 'http' },
      { hostname: '127.0.0.1', protocol: 'http' },
    ];
  }

  try {
    const parsed = new URL(normalizedSiteUrl);
    return [
      {
        hostname: parsed.hostname,
        protocol: parsed.protocol.replace(':', ''),
        ...(parsed.port ? { port: parsed.port } : {}),
      },
    ];
  } catch {
    return [{}];
  }
}

// https://astro.build/config
export default defineConfig({
  output: 'server',
  ...(normalizedSiteUrl ? { site: normalizedSiteUrl } : {}),

  security: {
    allowedDomains: getAllowedDomains(),
  },

  server: {
    host: process.env.HOST ?? false,
    port: Number(process.env.PORT ?? 4321),
  },

  vite: {
    envDir: rootDir,
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['better-auth', '@clickhouse/client'],
    },
  },

  integrations: [react()],

  adapter: node({
    mode: 'middleware',
  }),
});