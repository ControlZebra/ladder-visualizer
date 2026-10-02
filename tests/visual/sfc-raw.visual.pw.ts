import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';

test('selects complete SFC source for routines under different program owners', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const fixture = join(import.meta.dirname, '../fixtures/l5x/sfc-raw-v35.L5X');
  const source = readFileSync(fixture, 'utf8');
  await page.goto('/');
  await page.locator('input[type=file]').setInputFiles(fixture);
  const navigator = page.locator('aside');
  await navigator.getByText('First', { exact: true }).locator('..').locator('div').first().click();
  await navigator.getByText('Sequence', { exact: true }).click();
  const xml = page.getByRole('region', { name: 'Sequence XML source' }).locator('code');
  const start = source.indexOf('<Routine Name="Sequence" Type=');
  await expect(xml).toHaveText(source.slice(start, source.indexOf('<Routine Name="Empty"', start)).trimEnd());
  await expect(page.getByText('SFC Visualization Not Supported')).toHaveCount(0);

  await navigator.getByText('Second', { exact: true }).locator('..').locator('div').first().click();
  await navigator.getByText('Sequence', { exact: true }).nth(1).click();
  await expect(xml).toHaveText('<Routine Name="Sequence" Type="SFC"><SFCContent SheetOrientation="Portrait"><Step ID="99" X="0" Y="0" /></SFCContent></Routine>');

  await navigator.getByText('Empty', { exact: true }).click();
  await expect(page.getByRole('region', { name: 'Empty XML source' }).locator('code'))
    .toHaveText('<Routine Name="Empty" Type="SFC" />');
  expect(errors).toEqual([]);
});
