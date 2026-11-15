import { defineConfig, devices } from '@playwright/test';

// Testa o site já compilado, servido como na publicação (fallback para index.html).
const port = Number(process.env.E2E_PREVIEW_PORT ?? 4173);

export default defineConfig({
  testDir: './tests/preview',
  reporter: 'list',
  use: { baseURL: `http://localhost:${port}` },
  webServer: {
    command: `npm run build && npm run preview -- --port ${port} --strictPort`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: process.env.E2E_CHROMIUM ? { executablePath: process.env.E2E_CHROMIUM } : {},
      },
    },
  ],
});
