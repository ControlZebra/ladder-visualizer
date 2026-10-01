// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { diffFBD } from '../../src/diff';
import { FBDDiagram, FBDDiffDiagram } from '../../src/components';
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

  it('keeps neutral context with changed values and moved blocks at source coordinates', () => {
    const oldBody = body(),
      newBody = changedFBDRevision(oldBody);
    const html = renderToStaticMarkup(createElement(FBDDiffDiagram, { oldBody, newBody }));
    expect(html).toContain('data-view="overlay"');
    expect(html).toContain('FlowIntoTank_Revised');
    expect(html).toContain('>FlowIntoTank</text>');
    expect(html).toContain('>ADD_01</text>');
    expect(html).toContain('>ADD_02</text>');
    expect(html.match(/class="fbd-diff-element /g)).toHaveLength(
      oldBody.sheets[0].elements.length + 2
    );
    expect(html).toContain('data-element-id="5" data-source-x="40"');
    expect(html).toContain('data-element-id="5" data-source-x="140"');
    expect(html).toContain('Level control — revised feed and output');
  });

  it('draws unchanged geometry and labels once in neutral colors', () => {
    const original = body();
    const layout = buildFBDSheetLayout(original.sheets[0]);
    const artwork = buildFBDDiffArtwork(layout, layout, diffFBD(original, original).sheets[0]);
    expect(artwork.labels.filter((label) => label.text === 'ADD_01')).toHaveLength(1);
    for (let i = 0; i < artwork.labels.length; i++) {
      const a = artwork.labels[i];
      for (const b of artwork.labels.slice(i + 1)) {
        expect(
          a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y
        ).toBe(false);
      }
    }
    expect(artwork.outlines).toHaveLength(layout.elements.length);
    expect(
      [...artwork.outlines, ...artwork.pins, ...artwork.paths, ...artwork.labels].every(
        (part) => part.tone === 'neutral'
      )
    ).toBe(true);
  });

  it('colors changed fields and rerouted wires while retaining neutral frames and unchanged fields', () => {
    const oldBody = body(),
      newBody = changedFBDRevision(oldBody);
    const oldLayout = buildFBDSheetLayout(oldBody.sheets[0]),
      newLayout = buildFBDSheetLayout(newBody.sheets[0]);
    const comparison = diffFBD(oldBody, newBody).sheets[0];
    const artwork = buildFBDDiffArtwork(oldLayout, newLayout, comparison);
    expect(
      artwork.outlines.filter((part) => part.value.element.id === '2').map((part) => part.tone)
    ).toEqual(['neutral']);
    expect(
      artwork.labels.filter((label) => label.text === 'ADD').map((label) => label.tone)
    ).toEqual(['neutral']);
    expect(artwork.labels.find((label) => label.text === 'ADD_01')?.tone).toBe('older');
    expect(artwork.labels.find((label) => label.text === 'ADD_02')?.tone).toBe('newer');
    expect(
      artwork.outlines.filter((part) => part.value.element.id === '5').map((part) => part.tone)
    ).toEqual(['older', 'newer']);
    expect(
      artwork.labels
        .filter((label) => label.text === 'LDLG_01')
        .map((label) => label.tone)
        .sort()
    ).toEqual(['newer', 'older']);
    expect(artwork.outlines.find((part) => part.value.element.id === '100')?.tone).toBe('newer');
    const rerouted = oldLayout.connections.find((wire) => wire.connection.to.elementId === '5')!;
    const newRoute = newLayout.connections.find((wire) => wire.connection.to.elementId === '5')!;
    expect(newRoute.path).not.toBe(rerouted.path);
    expect(artwork.paths.find((part) => part.value.path === rerouted.path)?.tone).toBe('older');
    expect(artwork.paths.find((part) => part.value.path === newRoute.path)?.tone).toBe('newer');
  });

  it('shows deleted elements red and preserves full color in a separate-version view', () => {
    const oldBody = body(),
      newBody = structuredClone(oldBody);
    newBody.sheets[0].elements = newBody.sheets[0].elements.filter((element) => element.id !== '0');
    const oldLayout = buildFBDSheetLayout(oldBody.sheets[0]);
    const overlay = buildFBDDiffArtwork(
      oldLayout,
      buildFBDSheetLayout(newBody.sheets[0]),
      diffFBD(oldBody, newBody).sheets[0]
    );
    expect(overlay.outlines.find((part) => part.value.element.id === '0')?.tone).toBe('older');
    const separate = buildFBDDiffArtwork(oldLayout);
    expect(
      [...separate.outlines, ...separate.pins, ...separate.paths, ...separate.labels].every(
        (part) => part.tone === 'older'
      )
    ).toBe(true);
  });

  it('retains both reference shapes when the direction changes in place', () => {
    const oldBody = body(),
      newBody = structuredClone(oldBody);
    const reference = newBody.sheets[0].elements.find((element) => element.kind === 'reference')!;
    if (reference.kind !== 'reference') throw new Error('Expected reference');
    reference.referenceType = reference.referenceType === 'input' ? 'output' : 'input';
    const artwork = buildFBDDiffArtwork(
      buildFBDSheetLayout(oldBody.sheets[0]),
      buildFBDSheetLayout(newBody.sheets[0]),
      diffFBD(oldBody, newBody).sheets[0]
    );
    expect(
      artwork.outlines
        .filter((part) => part.value.element.id === reference.id)
        .map((part) => part.tone)
    ).toEqual(['older', 'newer']);
  });

  it('keeps old and new port labels with reordered pins', () => {
    const oldBody = body(),
      newBody = structuredClone(oldBody);
    const block = newBody.sheets[0].elements.find((element) => element.id === '2')!;
    const inputs = block.ports.filter((port) => port.direction === 'input');
    [inputs[0].order, inputs[1].order] = [inputs[1].order, inputs[0].order];
    const artwork = buildFBDDiffArtwork(
      buildFBDSheetLayout(oldBody.sheets[0]),
      buildFBDSheetLayout(newBody.sheets[0]),
      diffFBD(oldBody, newBody).sheets[0]
    );
    for (const port of inputs) {
      expect(
        artwork.labels
          .filter((label) => label.elementId === '2' && label.text === port.label)
          .map((label) => label.tone)
          .sort()
      ).toEqual(['newer', 'older']);
    }
  });

  it('uses identical terminal shapes and pins in regular and unchanged comparison views', () => {
    const original = body();
    for (const sheetIndex of [0, 1]) {
      const singleSheet = { ...original, sheets: [original.sheets[sheetIndex]] };
      const regular = document.createElement('div'),
        comparison = document.createElement('div');
      regular.innerHTML = renderToStaticMarkup(createElement(FBDDiagram, { body: singleSheet }));
      comparison.innerHTML = renderToStaticMarkup(
        createElement(FBDDiffDiagram, { oldBody: singleSheet, newBody: singleSheet })
      );
      for (const selector of ['.fbd-reference-shape', '.fbd-connector-shape', '.fbd-port-pin']) {
        const shapes = (root: Element) =>
          [...root.querySelectorAll(selector)].map((element) => element.outerHTML);
        expect(shapes(comparison)).toEqual(shapes(regular));
      }
    }
  });

  it('makes unchanged metadata neutral only in overlay mode', () => {
    const oldBody = body(),
      newBody = changedFBDRevision(oldBody);
    const root = document.createElement('div');
    root.innerHTML = renderToStaticMarkup(createElement(FBDDiffDiagram, { oldBody, newBody }));
    expect(root.querySelectorAll('[data-field="name"] [data-tone="neutral"]')).toHaveLength(1);
    expect(root.querySelectorAll('[data-field="description:0"] [data-tone="older"]')).toHaveLength(
      1
    );
    expect(root.querySelectorAll('[data-field="description:0"] [data-tone="newer"]')).toHaveLength(
      1
    );
    root.innerHTML = renderToStaticMarkup(
      createElement(FBDDiffDiagram, { oldBody, newBody, initialView: 'side-by-side' })
    );
    expect(root.querySelectorAll('[data-tone="neutral"]')).toHaveLength(0);
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
    expect(html).toContain('data-tone="newer"');
    expect(html).not.toContain('class="fbd-diff-label" data-tone="older"');
    expect(html).toContain('comparison diagnostics');
    expect(html).toContain('has no usable position');
    const removed = renderToStaticMarkup(createElement(FBDDiffDiagram, { oldBody: body() }));
    expect(removed).toContain('class="fbd-diff-label" data-tone="older"');
    expect(removed).not.toContain('class="fbd-diff-label" data-tone="newer"');
  });
});
