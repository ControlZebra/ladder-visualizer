import { expect, test } from '@playwright/test';

for (const sheet of [0, 1]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`level-control sheet ${sheet + 1} ${theme}`, async ({ page }) => {
      await page.goto(`/tests/visual/fbd.html?sheet=${sheet}&theme=${theme}`);
      const stage = page.locator('#stage');
      await expect(stage.locator('.fbd-diagram')).toHaveCount(1);
      await expect(stage).toHaveScreenshot(`fbd-sheet-${sheet + 1}-${theme}.png`, {
        animations: 'disabled',
      });
    });
  }
}
