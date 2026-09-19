import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/visual',
  testMatch: '**/*.visual.pw.ts',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: 'list',
  snapshotPathTemplate: '{testDir}/__screenshots__/{arg}-{platform}{ext}',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    viewport: { width: 1280, height: 820 },
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/tests/visual/fbd.html',
    reuseExistingServer: true,
  },
});
