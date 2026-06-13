import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!testDatabaseUrl) {
  throw new Error('TEST_DATABASE_URL is required for integration tests');
}

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/test/integration/setup.ts'],
    globalTeardown: './src/test/integration/global-teardown.ts',
    include: ['src/**/*.integration.test.ts'],
    fileParallelism: false,
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    hookTimeout: 30_000,
    testTimeout: 30_000,
    teardownTimeout: 10_000,
    forceExit: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
    },
  },
  envDir: rootDir,
  env: {
    DATABASE_URL: testDatabaseUrl,
    TEST_DATABASE_URL: testDatabaseUrl,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET ?? 'test-secret-integration',
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4321',
    NODE_ENV: 'test',
  },
});
