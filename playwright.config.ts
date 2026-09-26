import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

// .env.test.local mantém o Supabase local; .env.local pode apontar para a nuvem.
config({ path: '.env.test.local' });
config({ path: '.env.local' });

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1,
  globalTeardown: './tests/e2e/global-teardown.ts',
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000/login',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
