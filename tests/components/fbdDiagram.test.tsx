// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { buildFBDFlowModel, FBDDiagram } from '../../src/components/fbd/FBDDiagram';
import { buildFBDSheetLayout } from '../../src/layout';
import { parseString } from '../../src/parsers';
import { DARK_THEME, DEFAULT_THEME, type NormalizedFBDBody } from '../../src/types';
import { withFunctionElement } from '../fixtures/fbdRenderElements';

const fixtureDirectory = join(__dirname, '../fixtures/l5x');

function fixtureBody(fixture: string, routineName: string): NormalizedFBDBody {
  const result = parseString(readFileSync(join(fixtureDirectory, fixture), 'utf8'), 'l5x');
  const body = result.data?.programs[0]?.routines.find((routine) => routine.name === routineName)?.fbd;
  if (!body) throw new Error('expected normalized level-control FBD body');
  return body;
}

const levelControlBody = () => fixtureBody('fbd-level-control-v35.L5X', 'MainFBD');
function renderElementsBody(): NormalizedFBDBody {
  const source = withFunctionElement(readFileSync(
    join(fixtureDirectory, 'fbd-render-elements-v35.L5X'),
    'utf8',
  ));
  const result = parseString(source, 'l5x');
  const body = result.data?.programs[0]?.routines.find(
    (routine) => routine.name === 'Elements',
  )?.fbd;
  if (!body) throw new Error('expected normalized Elements FBD body');
  return body;
}

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

function flowModel(body: NormalizedFBDBody, sheetIndex = 0) {
  return buildFBDFlowModel(buildFBDSheetLayout(body.sheets[sheetIndex]), DEFAULT_THEME);
}

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const [red, green, blue] = channels.map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

describe('FBDDiagram', () => {
  it('renders sheet topology through the real parser result with wires below elements', () => {
    const body = levelControlBody();
    const markup = renderToStaticMarkup(createElement(FBDDiagram, { body, sheetIndex: 0 }));
    const model = flowModel(body);

    expect(markup.match(/class="fbd-element fbd-element-block"/g)).toHaveLength(7);
    expect(markup.match(/class="fbd-port-pin /g)?.length).toBeGreaterThan(0);
    expect(model.edges.filter((edge) => edge.className === 'fbd-connection fbd-connection-wire')).toHaveLength(8);
    expect(model.edges.filter((edge) => edge.className === 'fbd-connection fbd-connection-feedback-wire')).toHaveLength(2);
    expect(model.edges.filter((edge) => edge.style?.strokeDasharray !== undefined)).toHaveLength(0);
    expect(model.edges.filter((edge) => edge.data && 'endpoints' in edge.data)).toHaveLength(0);
    expect(markup).toContain('StorageArray');
    expect(markup).toContain('DEDT_01array');
    expect(markup).toContain('class="fbd-port-label" style="color:#666666');
    expect(markup).toContain(
      '<span class="fbd-binding-value" style="color:#000000">DEDT_01array</span>',
    );
    expect(markup).toContain(
      '<strong class="fbd-instruction-title" style="color:#000000">DEDT</strong>',
    );
    expect(markup).toContain(
      '<span class="fbd-instruction-subtitle" style="color:#000000">DEDT_01</span>',
    );
    expect(markup).toContain('--fbd-node-background:color-mix(in srgb, #f0f0f0 50%, #ffffff)');
    expect(markup).toContain('background:var(--fbd-node-background)');
    expect(markup).toContain('data-connector-relationship-count="1"');
    expect(markup).toContain('class="react-flow');
  });

  it('renders the second sheet and accepts the dark theme', () => {
    const body = levelControlBody();
    const markup = renderToStaticMarkup(createElement(FBDDiagram, {
      body,
      sheetIndex: 1,
      theme: DARK_THEME,
      width: 900,
      height: 600,
    }));
    const model = flowModel(body, 1);

    expect(markup.match(/class="fbd-element fbd-element-block"/g)).toHaveLength(2);
    expect(model.edges.filter((edge) => edge.className === 'fbd-connection fbd-connection-wire')).toHaveLength(3);
    expect(markup).toContain('background:#1e1e1e');
    expect(markup).toContain('class="react-flow dark"');
    expect(markup).toContain('width:900px');
    expect(markup).toContain('height:600px');
  });

  it('falls back to the first sheet for a non-finite requested index', () => {
    const markup = renderToStaticMarkup(
      <FBDDiagram body={levelControlBody()} sheetIndex={Number.NaN} />,
    );

    expect(markup).toContain('data-sheet-number="1"');
    expect(markup).toContain('aria-selected="true" tabindex="0"');
  });

  it('renders source-ordered accessible tabs with one active sheet and native controls', () => {
    const body = levelControlBody();
    const namedBody = {
      ...body,
      sheets: body.sheets.map((sheet, index) => ({
        ...sheet,
        number: { value: String(index + 7), source: 'declared' as const },
        name: {
          value: index === 0 ? 'SourceCustomOne' : 'SourceCustomTwo',
          source: 'declared' as const,
        },
      })),
    };
    const markup = renderToStaticMarkup(<FBDDiagram body={namedBody} />);

    expect(markup.match(/role="tab"/g)).toHaveLength(2);
    expect(markup.indexOf('Sheet 1')).toBeLessThan(markup.indexOf('Sheet 2'));
    expect(markup).toContain('role="tablist" aria-label="Function block diagram sheets"');
    expect(markup).toContain('aria-selected="true" tabindex="0"');
    expect(markup).toContain('aria-selected="false" tabindex="-1"');
    expect(markup.match(/role="tabpanel"/g)).toHaveLength(2);
    expect(markup.match(/role="tabpanel"[^>]*hidden=""/g)).toHaveLength(1);
    expect(markup).toContain('9 elements and 10 connections.');
    expect(markup).not.toContain('Warning:');
    expect(markup).not.toContain('SourceCustomOne');
    expect(markup).not.toContain('SourceCustomTwo');
    expect(markup).not.toContain('TankAgitator');

    expect(markup.match(/react-flow__controls-zoomin/g)).toHaveLength(1);
    expect(markup.match(/react-flow__controls-zoomout/g)).toHaveLength(1);
    expect(markup.match(/react-flow__controls-fitview/g)).toHaveLength(1);
    expect(markup).toContain('aria-label="Zoom In"');
    expect(markup).toContain('aria-label="Zoom Out"');
    expect(markup).toContain('aria-label="Fit View"');
    expect(markup).not.toContain('react-flow__controls-interactive');
    expect(markup).not.toContain('Toggle Interactivity');
  });

  it('activates and focuses tabs with arrow, Home, and End keys', async () => {
    const onSheetIndexChange = vi.fn();
    const container = document.createElement('div');
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <FBDDiagram
          body={levelControlBody()}
          width={900}
          height={600}
          onSheetIndexChange={onSheetIndexChange}
        />,
      );
    });

    const tabs = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
    expect(tabs).toHaveLength(2);

    await act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].tabIndex).toBe(0);
    expect(document.activeElement).toBe(tabs[1]);
    expect(container.querySelector('.fbd-diagram')?.getAttribute('data-sheet-number')).toBe('2');
    expect(container.textContent).toContain('TankAgitator');

    await act(async () => {
      tabs[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }));
    });
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(document.activeElement).toBe(tabs[0]);

    await act(async () => {
      tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    });
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(onSheetIndexChange.mock.calls.map(([index]) => index)).toEqual([1, 0, 1]);

    await act(async () => root.unmount());
    container.remove();
  });

  it('preserves a user-selected tab when an equivalent body object is supplied', async () => {
    const body = levelControlBody();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<FBDDiagram body={body} width={900} height={600} />);
    });
    await act(async () => {
      container.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click();
    });

    const equivalentBody = {
      ...body,
      sheets: body.sheets.map((candidate) => ({ ...candidate })),
    };
    await act(async () => {
      root.render(<FBDDiagram body={equivalentBody} width={900} height={600} />);
    });

    const tabs = container.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
    expect(container.querySelector('.fbd-diagram')?.getAttribute('data-sheet-number')).toBe('2');

    await act(async () => root.unmount());
  });

  it('switches a changed sheetIndex before publishing diagnostics', async () => {
    const sourceBody = levelControlBody();
    const body: NormalizedFBDBody = {
      ...sourceBody,
      diagnostics: [
        {
          code: 'FBD_UNKNOWN_INSTRUCTION',
          message: 'First sheet diagnostic.',
          severity: 'warning',
          sheetIndex: 0,
        },
        {
          code: 'FBD_UNKNOWN_INSTRUCTION',
          message: 'Second sheet diagnostic.',
          severity: 'warning',
          sheetIndex: 1,
        },
      ],
    };
    const firstDiagnostics = vi.fn();
    const changedDiagnostics = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <FBDDiagram
          body={body}
          sheetIndex={0}
          width={900}
          height={600}
          onDiagnostics={firstDiagnostics}
        />,
      );
    });
    await act(async () => {
      root.render(
        <FBDDiagram
          body={body}
          sheetIndex={1}
          width={900}
          height={600}
          onDiagnostics={changedDiagnostics}
        />,
      );
    });

    expect(changedDiagnostics).toHaveBeenCalledTimes(1);
    expect(changedDiagnostics.mock.calls[0][0]).toEqual(expect.arrayContaining([
      expect.objectContaining({ sheetIndex: 1 }),
    ]));
    expect(changedDiagnostics.mock.calls[0][0]).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ sheetIndex: 0 }),
    ]));
    expect(container.querySelector('.fbd-diagram')?.getAttribute('data-sheet-number')).toBe('2');

    await act(async () => root.unmount());
  });

  it('lazily lays out each sheet once when it is first visited', async () => {
    const body = levelControlBody();
    let inactiveConnectionsReads = 0;
    const inactiveSheet = { ...body.sheets[1] };
    Object.defineProperty(inactiveSheet, 'connections', {
      configurable: true,
      enumerable: true,
      get: () => {
        inactiveConnectionsReads += 1;
        return body.sheets[1].connections;
      },
    });
    const lazyBody = { ...body, sheets: [body.sheets[0], inactiveSheet] };
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<FBDDiagram body={lazyBody} width={900} height={600} />);
    });
    expect(inactiveConnectionsReads).toBe(0);

    await act(async () => {
      container.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click();
    });
    const readsAfterFirstVisit = inactiveConnectionsReads;
    expect(readsAfterFirstVisit).toBeGreaterThan(0);

    await act(async () => {
      container.querySelectorAll<HTMLButtonElement>('[role="tab"]')[0].click();
    });
    await act(async () => {
      container.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click();
    });
    expect(inactiveConnectionsReads).toBe(readsAfterFirstVisit);

    await act(async () => root.unmount());
  });

  it('keeps diagnostics out of the visualizer banner', () => {
    const markup = renderToStaticMarkup(<FBDDiagram body={renderElementsBody()} />);

    expect(markup).not.toContain('fbd-diagnostic-summary');
    expect(markup).not.toContain('Warning:');
  });

  it('defines visible focus and reduced-motion styles for tabs and native controls', () => {
    const styles = readFileSync(join(__dirname, '../../src/styles/index.css'), 'utf8');

    expect(styles).toContain('.fbd-sheet-tab:focus-visible');
    expect(styles).toContain('.react-flow__controls-button:focus-visible');
    expect(styles).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styles).toContain('animation-duration: 0.01ms !important');
  });

  it.each([
    ['light', DEFAULT_THEME],
    ['dark', DARK_THEME],
  ])('keeps %s FBD text, diagnostics, and focus tokens contrast-safe', (_name, theme) => {
    expect(contrastRatio(theme.boxTextColor, theme.bgPrimary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.addressColor, theme.bgPrimary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.contactNCColor, theme.bgPrimary)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(theme.powerRailColor, theme.bgPrimary)).toBeGreaterThanOrEqual(3);
  });

  it('renders both IRef and ORef implicit terminal directions', () => {
    const body = fixtureBody('fbd-v35.L5X', 'FBDLogic');
    const markup = renderToStaticMarkup(createElement(FBDDiagram, {
      body,
    }));

    expect(markup.match(/class="fbd-element fbd-element-reference"/g)).toHaveLength(2);
    expect(markup).toContain('data-terminal-type="input"');
    expect(markup).toContain('data-terminal-type="output"');
    expect(flowModel(body).edges.filter((edge) => edge.className === 'fbd-connection fbd-connection-wire')).toHaveLength(1);
  });

  it('renders function, AOI, routine-control, wrapped text, attachment, and placeholder families', () => {
    const body = renderElementsBody();
    const markup = renderToStaticMarkup(createElement(FBDDiagram, {
      body,
    }));

    expect(markup).toContain('class="fbd-element fbd-element-function"');
    expect(markup).toContain('class="fbd-element fbd-element-add-on-instruction"');
    expect(markup.match(/class="fbd-element fbd-element-routine-control"/g)).toHaveLength(3);
    expect(markup).toContain('class="fbd-element fbd-element-text-box"');
    expect(markup).toContain('class="fbd-element fbd-element-placeholder"');
    expect(flowModel(body).edges.filter((edge) => edge.className === 'fbd-attachment')).toHaveLength(1);
    expect(markup).toContain('data-attachment-count="1"');
    expect(markup).toContain('State');
    expect(markup).toContain('ValveState');
    expect(markup).toContain('InputA, InputB');
    expect(markup).toContain('ReturnA, ReturnB');
    expect(markup.match(/class="fbd-text-line"/g)?.length).toBeGreaterThan(1);
    expect(markup).toContain('GSV');
    expect(markup).toContain('ID 9');
    expect(markup).toContain('unsupported semantics');
  });

  it('uses distinct terminal silhouettes and primary operand text for every terminal type', () => {
    const referenceMarkup = renderToStaticMarkup(createElement(FBDDiagram, {
      body: fixtureBody('fbd-v35.L5X', 'FBDLogic'),
    }));
    const connectorMarkup = renderToStaticMarkup(createElement(FBDDiagram, {
      body: levelControlBody(),
      sheetIndex: 0,
    }));

    expect(referenceMarkup).toContain('fbd-terminal-node');
    expect(referenceMarkup).toContain('fbd-reference-shape');
    expect(referenceMarkup).toContain(
      '<span class="fbd-terminal-label" style="color:#000000">Input</span>',
    );
    expect(referenceMarkup).toContain(
      '<span class="fbd-terminal-label" style="color:#000000">Output</span>',
    );
    expect(connectorMarkup).toContain('fbd-terminal-node');
    expect(connectorMarkup).toContain('fbd-connector-shape fbd-connector-target');
    expect(connectorMarkup).toContain(
      '<span class="fbd-terminal-label" style="color:#000000">TankLevel</span>',
    );
    const inputConnectorMarkup = renderToStaticMarkup(createElement(FBDDiagram, {
      body: levelControlBody(),
      sheetIndex: 1,
    }));
    expect(inputConnectorMarkup).toContain('fbd-connector-shape fbd-connector-source');
    expect(inputConnectorMarkup).toContain(
      '<span class="fbd-terminal-label" style="color:#000000">TankLevel</span>',
    );
  });

  it('keeps malformed and unknown positioned raw elements visible as canonical placeholders', () => {
    const source = readFileSync(
      join(fixtureDirectory, 'fbd-render-elements-v35.L5X'),
      'utf8',
    )
      .replace(
        '<Block Type="ADD" ID="3" X="220" Y="40" />',
        '<Block ID="bad" X="220" Y="40" />',
      )
      .replace(
        '<GSV ID="9" X="20" Y="420" Object="WallClockTime" />',
        '<FutureBlock ID="9" X="20" Y="420" />',
      );
    const result = parseString(source, 'l5x');
    const body = result.data?.programs[0]?.routines.find(
      (routine) => routine.name === 'Elements',
    )?.fbd;
    if (!body) throw new Error('expected malformed raw FBD body');

    const markup = renderToStaticMarkup(<FBDDiagram body={body} />);
    expect(markup.match(/class="fbd-element fbd-element-placeholder"/g)).toHaveLength(2);
    expect(markup).toContain('ID bad');
    expect(markup).toContain('invalid id');
    expect(markup).toContain('FutureBlock');
    expect(markup).toContain('unknown kind, unresolved metadata');
  });

  it('reports stable parser, connector, and layout diagnostics through the callback', async () => {
    const body = renderElementsBody();
    const malformed = {
      ...body,
      sheets: [{
        ...body.sheets[0],
        connections: [
          ...body.sheets[0].connections,
          {
            kind: 'wire' as const,
            from: { elementId: '404', port: 'value' },
            to: { elementId: '3', port: 'SourceA' },
          },
        ],
      }],
    };
    const onDiagnostics = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(<FBDDiagram body={malformed} onDiagnostics={onDiagnostics} />);
    });

    expect(onDiagnostics).toHaveBeenCalledTimes(1);
    expect(onDiagnostics.mock.calls[0][0].map((diagnostic: { code: string }) => diagnostic.code))
      .toEqual([
        'FBD_PLACEHOLDER_ELEMENT',
        'FBD_LAYOUT_MISSING_ELEMENT',
      ]);
    await act(async () => root.unmount());
  });

  it('isolates an unexpected sheet failure behind a canonical fallback', () => {
    const body = renderElementsBody();
    const malformed = {
      ...body,
      sheets: [{ ...body.sheets[0], elements: null }],
    } as unknown as NormalizedFBDBody;

    const markup = renderToStaticMarkup(<FBDDiagram body={malformed} />);
    expect(markup).toContain('data-render-failure="FBD_RENDER_SHEET_FAILURE"');
    expect(markup).toContain('role="alert"');
    expect(markup).toContain('Unable to render FBD sheet');
  });
});
