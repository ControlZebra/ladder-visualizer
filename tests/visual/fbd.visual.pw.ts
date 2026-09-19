import { expect, test } from '@playwright/test';

test('refits the viewport when the selected sheet changes', async ({ page }) => {
  await page.goto('/preview/fbd.html');
  const pane = page.locator('.react-flow__pane');
  const viewport = page.locator('.react-flow__viewport');
  const bounds = await pane.boundingBox();
  if (!bounds) throw new Error('expected React Flow pane bounds');

  const initialTransform = await viewport.getAttribute('style');
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width / 2 + 180, bounds.y + bounds.height / 2 + 120);
  await page.mouse.up();
  await expect.poll(() => viewport.getAttribute('style')).not.toBe(initialTransform);
  const pannedTransform = await viewport.getAttribute('style');

  await page.locator('.preview-field select').nth(1).selectOption('1');
  await expect(page.locator('.fbd-diagram')).toHaveAttribute('data-sheet-number', '2');
  await expect.poll(() => viewport.getAttribute('style')).not.toBe(pannedTransform);
});

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

for (const theme of ['light', 'dark'] as const) {
  test(`extended element families ${theme}`, async ({ page }) => {
    await page.goto(`/tests/visual/fbd.html?fixture=elements&theme=${theme}`);
    const stage = page.locator('#stage');
    await expect(stage.locator('.fbd-element-function')).toHaveCount(1);
    await expect(stage.locator('.fbd-element-add-on-instruction')).toHaveCount(1);
    await expect(stage.locator('.fbd-element-routine-control')).toHaveCount(3);
    await expect(stage.locator('.fbd-element-placeholder')).toHaveCount(1);
    await expect(stage).toHaveScreenshot(`fbd-element-families-${theme}.png`, {
      animations: 'disabled',
    });
  });
}
