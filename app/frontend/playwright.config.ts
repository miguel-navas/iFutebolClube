import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.E2E_PORT ?? 3000);

export default defineConfig({
  testDir: './tests',
  testIgnore: '**/preview/**',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run dev -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Permite usar um Chromium já instalado (E2E_CHROMIUM=/caminho/chrome).
        launchOptions: process.env.E2E_CHROMIUM
          ? { executablePath: process.env.E2E_CHROMIUM }
          : {},
      },
    },
  ],
});
