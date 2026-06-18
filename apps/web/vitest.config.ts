import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['src/**/*.integration.test.ts'],
    clearMocks: true,
    // Serial execution — one file at a time, one worker process (easier on CPU/RAM).
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'json', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/lib/**/*.ts', 'src/types/**/*.ts'],
      exclude: [
        'src/**/*.{test,spec}.{ts,tsx}',
        'src/**/*.integration.test.ts',
        'src/test/**',
        'src/types/search-view.ts',
        'src/lib/moderation-handlers.ts',
        'src/lib/auth.ts',
        'src/lib/auth-actions.ts',
        'src/lib/auth-client.ts',
        'src/lib/redis.ts',
        'src/lib/queue-stream.ts',
        'src/lib/email.ts',
        'src/lib/email-events.ts',
        'src/lib/notification-events.ts',
        'src/lib/telegram-events.ts',
        'src/lib/moderation-events.ts',
        'src/lib/profile-view-events.ts',
        'src/lib/agreement-events.ts',
        'src/lib/dev-user.ts',
        'src/lib/storage.ts',
        'src/lib/get-neighborhood-listing-stats.ts',
        'src/lib/session.ts',
        'src/lib/user-has-listing.ts',
        'src/lib/listing-views.ts',
        'src/lib/moderation/image-scorer.ts',
        'src/lib/user-public-profile.ts',
        'src/lib/seeker-profile-visibility.ts',
        'src/lib/feedback.ts',
        'src/lib/rental-checkout.ts',
        'src/lib/profile-views.ts',
        'src/lib/analytics/**',
        'src/lib/clickhouse/**',
        'src/lib/email/send.ts',
        'src/lib/email/tracking.ts',
      ],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(path.dirname(fileURLToPath(import.meta.url)), './src'),
    },
  },
  envDir: rootDir,
});
