import { expect, test } from '@playwright/test';

for (const onlyRenderVisibleElements of [false, true]) {
  test(`renders the production FBD workload within budget with culling ${onlyRenderVisibleElements ? 'on' : 'off'}`, async ({ page }) => {
    await page.goto(`/tests/visual/fbd.html?fixture=benchmark&cull=${onlyRenderVisibleElements ? '1' : '0'}`);
    await expect(page.locator('html')).toHaveAttribute('data-fbd-ready', 'true');
    const renderMs = Number(await page.locator('html').getAttribute('data-fbd-render-ms'));

    expect(await page.locator('.react-flow__node').count()).toBe(150);
    console.info(`FBD render (culling ${onlyRenderVisibleElements ? 'on' : 'off'}): ${renderMs.toFixed(1)} ms`);
    expect(renderMs).toBeLessThan(200);
  });
}

test('keeps cached sheet switching and active viewport interaction within budget', async ({ page }) => {
  await page.goto('/tests/visual/fbd.html?fixture=benchmark');
  await expect(page.locator('html')).toHaveAttribute('data-fbd-ready', 'true');

  const switchMs = await page.evaluate(async () => {
    const tabs = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    tabs[1].click();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const startedAt = performance.now();
    tabs[0].click();
    await new Promise<void>((resolve) => {
      const check = () => {
        if (document.querySelectorAll('.react-flow__node').length === 150) resolve();
        else requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
    return performance.now() - startedAt;
  });
  console.info(`FBD cached sheet switch: ${switchMs.toFixed(1)} ms`);
  expect(switchMs).toBeLessThan(150);

  const fps = await page.evaluate(async () => {
    const pane = document.querySelector('.react-flow__pane');
    if (!pane) throw new Error('expected React Flow pane');
    const startedAt = performance.now();
    let frames = 0;
    await new Promise<void>((resolve) => {
      const step = () => {
        frames += 1;
        pane.dispatchEvent(new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: frames % 2 === 0 ? 8 : -8,
          clientX: 640,
          clientY: 410,
        }));
        if (performance.now() - startedAt >= 500) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    return frames / ((performance.now() - startedAt) / 1_000);
  });
  console.info(`FBD active viewport: ${fps.toFixed(1)} FPS`);
  expect(fps).toBeGreaterThanOrEqual(30);
});
