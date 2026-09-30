// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { FBDDiffDiagram } from '../../src/components';
import { buildFBDDiffArtwork } from '../../src/components/fbd/fbdDiffLayout';
import { buildFBDSheetLayout } from '../../src/layout';
import { parseString } from '../../src/parsers';
import { changedFBDRevision } from '../fixtures/fbdDiff';
import type { NormalizedFBDBody } from '../../src/types';

function body(): NormalizedFBDBody {
  return parseString(
    readFileSync(join(__dirname, '../fixtures/l5x/fbd-level-control-v35.L5X'), 'utf8'),
    'l5x'
  ).data!.programs[0].routines[0].fbd!;
}
beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

describe('FBD diff visualization', () => {
  it('shows body metadata even when both bodies contain no sheets', () => {
    const oldBody = { ...body(), sheets: [] };
    const newBody = structuredClone(oldBody);
    newBody.orientation.value = 'Portrait';
    const html = renderToStaticMarkup(createElement(FBDDiffDiagram, { oldBody, newBody }));
    expect(html).toContain('Landscape');
    expect(html).toContain('Portrait');
    expect(html).toContain('No FBD sheets available');
  });

  it('retains labels for extended element families and degraded bindings', () => {
    const source = readFileSync(
      join(__dirname, '../fixtures/l5x/fbd-render-elements-v35.L5X'),
      'utf8'
    );
    const oldBody = parseString(source, 'l5x').data!.programs[0].routines[0].fbd!;
    oldBody.sheets[0].elements.push({
      kind: 'placeholder',
      id: '987',
      position: { x: '40', y: '800' },
      sourceKind: 'ProtectedAOI',
      ports: [],
      reasonCodes: ['unresolved-metadata'],
      bindings: [{ name: 'InOut', argument: 'OldTag' }],
    });
    const newBody = structuredClone(oldBody);
    const placeholder = newBody.sheets[0].elements.at(-1)!;
    if (placeholder.kind === 'placeholder') placeholder.bindings![0].argument = 'NewTag';
    const html = renderToStaticMarkup(createElement(FBDDiffDiagram, { oldBody, newBody }));
    expect(html).toContain('fbd-diff-element-add-on-instruction');
    expect(html).toContain('fbd-diff-element-routine-control');
    expect(html).toContain('InOut: OldTag');
    expect(html).toContain('InOut: NewTag');
  });

  it('renders both full revisions at their source coordinates, with both label values on the canvas', () => {
    const oldBody = body(),
      newBody = changedFBDRevision(oldBody);
    const html = renderToStaticMarkup(createElement(FBDDiffDiagram, { oldBody, newBody }));
    expect(html).toContain('data-view="overlay"');
    expect(html).toContain('FlowIntoTank_Revised');
    expect(html).toContain('>FlowIntoTank</text>');
    expect(html).toContain('>ADD_01</text>');
    expect(html).toContain('>ADD_02</text>');
    expect(html.match(/class="fbd-diff-element /g)).toHaveLength(
      oldBody.sheets[0].elements.length + newBody.sheets[0].elements.length
    );
    expect(html).toContain('data-element-id="5" data-source-x="40"');
    expect(html).toContain('data-element-id="5" data-source-x="140"');
    expect(html).toContain('Level control — revised feed and output');
  });

  it('keeps both copies of unchanged labels and avoids all label collisions', () => {
    const original = body();
    const layout = buildFBDSheetLayout(original.sheets[0]);
    const artwork = buildFBDDiffArtwork(layout, layout);
    expect(artwork.labels.filter((label) => label.text === 'ADD_01')).toHaveLength(2);
    for (let i = 0; i < artwork.labels.length; i++) {
      const a = artwork.labels[i];
      for (const b of artwork.labels.slice(i + 1)) {
        expect(
          a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
        ).toBe(false);
      }
    }
    expect(artwork.older).toBe(layout);
    expect(artwork.newer).toBe(layout);
  });

  it('switches to side-by-side and pairs reordered sheets by source number', async () => {
    const oldBody = body(),
      newBody = changedFBDRevision(oldBody);
    newBody.sheets.reverse();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => root.render(createElement(FBDDiffDiagram, { oldBody, newBody })));
    const select = container.querySelector('select')!;
    expect(select.selectedOptions[0].textContent).toBe('Sheet 2');
    const button = [...container.querySelectorAll('button')].find(
      (item) => item.textContent === 'Side by side'
    )!;
    await act(async () => button.click());
    expect(container.querySelector('.fbd-diff')?.getAttribute('data-view')).toBe('side-by-side');
    expect(container.querySelectorAll('.fbd-diff-artwork')).toHaveLength(2);
    await act(async () => {
      select.selectedIndex = 1;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    });
    expect(container.textContent).toContain('Level control — revised feed and output');
    await act(async () => root.unmount());
    container.remove();
  });

  it('forces separate-version rendering for missing or duplicate sheet identity', () => {
    const oldBody = body(),
      newBody = body();
    newBody.sheets[0].number.source = 'fallback';
    const html = renderToStaticMarkup(createElement(FBDDiffDiagram, { oldBody, newBody }));
    expect(html).toContain('data-view="side-by-side"');
    expect(html).toContain('missing or duplicate source sheet number');
    expect(html).toContain('unpaired newer');
    expect(html).toContain('No sheet in this version');
  });

  it('renders added or removed sheets in their version color and reports degraded content', () => {
    const newBody = body();
    newBody.sheets[0].elements.push({
      kind: 'placeholder',
      sourceKind: 'Unknown',
      ports: [],
      reasonCodes: ['missing-position'],
    });
    const html = renderToStaticMarkup(createElement(FBDDiffDiagram, { newBody }));
    expect(html).toContain('fbd-diff-layer fbd-diff-newer');
    expect(html).not.toContain('fbd-diff-layer fbd-diff-older');
    expect(html).toContain('comparison diagnostics');
    expect(html).toContain('has no usable position');
    const removed = renderToStaticMarkup(createElement(FBDDiffDiagram, { oldBody: body() }));
    expect(removed).toContain('fbd-diff-layer fbd-diff-older');
    expect(removed).not.toContain('fbd-diff-layer fbd-diff-newer');
  });
});
