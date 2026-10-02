import { expect, test } from '@playwright/test';

for (const theme of ['light', 'dark']) {
  test(`FBD overlay ${theme}: both versions, labels, pan and zoom`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.goto(`/tests/visual/fbd-diff.html?theme=${theme}`);
    await expect(page.locator('.fbd-diff-element[data-tone="neutral"]')).not.toHaveCount(0);
    await expect(
      page.locator('.fbd-diff-label').getByText('ADD_01', { exact: true })
    ).toBeVisible();
    await expect(
      page.locator('.fbd-diff-label').getByText('ADD_02', { exact: true })
    ).toBeVisible();
    const clippedLabels = await page.locator('.fbd-diff-label').evaluateAll(
      (labels) =>
        labels.filter((label) => {
          const text = label.querySelector('text')!.getBBox();
          const rect = label.querySelector('rect')!.getBBox();
          return (
            text.x < rect.x - 0.01 ||
            text.y < rect.y - 0.01 ||
            text.x + text.width > rect.x + rect.width + 0.01 ||
            text.y + text.height > rect.y + rect.height + 0.01
          );
        }).length
    );
    expect(clippedLabels).toBe(0);
    await expect(page.locator('#stage')).toHaveScreenshot(`fbd-diff-overlay-${theme}.png`, {
      animations: 'disabled',
    });
    const viewport = page.locator('.react-flow__viewport');
    const initial = await viewport.getAttribute('style');
    await page.getByRole('button', { name: 'Zoom In' }).click();
    await expect.poll(() => viewport.getAttribute('style')).not.toBe(initial);
    const zoomed = await viewport.getAttribute('style');
    await page.mouse.move(650, 450);
    await page.mouse.down();
    await page.mouse.move(720, 500);
    await page.mouse.up();
    await expect.poll(() => viewport.getAttribute('style')).not.toBe(zoomed);
    await page.getByRole('button', { name: 'Side by side' }).click();
    await expect(page.locator('.fbd-diff-artwork')).toHaveCount(2);
    await expect(page.locator('.fbd-diff-artwork [data-tone="neutral"]')).toHaveCount(0);
    await expect(page.locator('#stage')).toHaveScreenshot(`fbd-diff-separate-${theme}.png`, {
      animations: 'disabled',
    });
    expect(errors).toEqual([]);
  });
}

test('sheet matching, fallback and keyboard controls', async ({ page }) => {
  await page.goto('/tests/visual/fbd-diff.html?ambiguous');
  await expect(page.getByRole('button', { name: 'Overlay', exact: true })).toBeDisabled();
  await expect(page.locator('.fbd-diff')).toHaveAttribute('data-view', 'side-by-side');
  await expect(page.locator('.fbd-diff-diagnostics')).toContainText(
    'missing or duplicate source sheet number'
  );
  await expect(page.locator('option')).toHaveCount(4);
  await page.goto('/tests/visual/fbd-diff.html?reordered');
  await expect(page.locator('select option:checked')).toHaveText('Sheet 2');
  await page.getByRole('combobox').selectOption({ label: 'Sheet 1' });
  await page.getByRole('button', { name: 'Side by side' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.fbd-diff')).toHaveAttribute('data-view', 'side-by-side');
  await expect(page.locator('.fbd-diff-metadata-row')).toContainText('revised feed');
  await page.goto('/tests/visual/fbd-diff.html?added');
  await page.getByRole('combobox').selectOption({ label: 'Sheet 3 — added' });
  await expect(page.locator('.fbd-diff-element')).not.toHaveCount(0);
  await expect(page.locator('.fbd-diff-element:not([data-tone="newer"])')).toHaveCount(0);
  await page.getByRole('combobox').selectOption({ label: 'Sheet 2 — removed' });
  await expect(page.locator('.fbd-diff-element:not([data-tone="older"])')).toHaveCount(0);
});

for (const width of [768, 390]) {
  test(`responsive comparison at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/tests/visual/fbd-diff.html?degraded');
    await expect(page.locator('.fbd-diff-element-placeholder')).toHaveCount(1);
    await page.getByRole('button', { name: 'Side by side' }).click();
    await expect(page.locator('.fbd-diff-canvas')).toHaveCount(2);
    const overflowing = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth
    );
    expect(overflowing).toBe(false);
    await expect(page.locator('#stage')).toHaveScreenshot(`fbd-diff-${width}.png`, {
      animations: 'disabled',
    });
  });
}

test('wide glyphs stay inside measured labels in both comparison modes', async ({ page }) => {
  await page.goto('/tests/visual/fbd-diff.html?wide-label');
  for (const mode of ['Overlay', 'Side by side']) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    for (const text of ['WWWWWWWWWW', 'MMMMMMMMMM']) {
      const label = page
        .locator('.fbd-diff-label')
        .filter({ has: page.getByText(text, { exact: true }) });
      await expect(label).toBeVisible();
      const contained = await label.evaluate((element) => {
        const text = element.querySelector('text')!.getBBox(),
          rect = element.querySelector('rect')!.getBBox();
        return (
          text.x >= rect.x &&
          text.y >= rect.y &&
          text.x + text.width <= rect.x + rect.width &&
          text.y + text.height <= rect.y + rect.height
        );
      });
      expect(contained).toBe(true);
    }
  }
});

for (const direction of ['grow', 'shrink']) {
  test(`automatic operand sizing keeps both frame and pin positions: ${direction}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 950 });
    await page.goto(`/tests/visual/fbd-diff.html?resize=${direction}`);
    const frames = page.locator('.fbd-diff-element[data-element-id="2"]');
    await expect(frames).toHaveCount(2);
    await expect(
      page.locator('.fbd-diff-element[data-element-id="2"][data-tone="neutral"]')
    ).toHaveCount(0);
    for (const tone of ['older', 'newer']) {
      await expect(
        page.locator(`.fbd-diff-pin[data-tone="${tone}"] .fbd-port-pin[data-port-id="Dest"]`)
      ).toBeVisible();
    }
    await expect(page.locator('#stage')).toHaveScreenshot(`fbd-diff-resize-${direction}.png`, {
      animations: 'disabled',
    });
  });
}
