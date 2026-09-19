import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/performance',
  testMatch: '**/*.performance.pw.ts',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4174',
    browserName: 'chromium',
    viewport: { width: 1280, height: 820 },
  },
  webServer: {
    command: 'npm run preview:performance',
    url: 'http://127.0.0.1:4174/tests/visual/fbd.html',
    reuseExistingServer: false,
  },
});
