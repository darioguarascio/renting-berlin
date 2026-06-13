// @ts-check
import { defineConfig } from 'astro/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';
import node from '@astrojs/node';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// https://astro.build/config
export default defineConfig({
  output: 'server',

  vite: {
    envDir: rootDir,
    plugins: [tailwindcss()],
    ssr: {
      noExternal: ['better-auth'],
    },
  },

  integrations: [react()],

  adapter: node({
    mode: 'standalone',
  }),
});