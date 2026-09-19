// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { FBDDiagram } from '../../src/components/svg/FBDDiagram';
import { parseString } from '../../src/parsers';
import { DARK_THEME, type NormalizedFBDBody } from '../../src/types';
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
});

describe('FBDDiagram', () => {
  it('renders sheet topology through the real parser result with wires below elements', () => {
    const markup = renderToStaticMarkup(createElement(FBDDiagram, { body: levelControlBody(), sheetIndex: 0 }));

    expect(markup.match(/class="fbd-element fbd-element-block"/g)).toHaveLength(7);
    expect(markup.match(/class="fbd-connection fbd-connection-wire"/g)).toHaveLength(8);
    expect(markup.match(/class="fbd-connection fbd-connection-feedback-wire"/g)).toHaveLength(2);
    expect(markup).toContain('stroke-dasharray="6 4"');
    expect(markup).toContain('StorageArray: DEDT_01array');
    expect(markup.indexOf('class="fbd-connections"')).toBeLessThan(markup.indexOf('class="fbd-elements"'));
    expect(markup).toContain('data-connector-relationship-count="1"');
  });

  it('renders the second sheet and accepts the dark theme', () => {
    const markup = renderToStaticMarkup(createElement(FBDDiagram, {
      body: levelControlBody(),
      sheetIndex: 1,
      theme: DARK_THEME,
      width: 900,
      height: 600,
    }));

    expect(markup.match(/class="fbd-element fbd-element-block"/g)).toHaveLength(2);
    expect(markup.match(/class="fbd-connection fbd-connection-wire"/g)).toHaveLength(3);
    expect(markup).toContain('background-color:#1e1e1e');
    expect(markup).toContain('width="900"');
    expect(markup).toContain('height="600"');
  });

  it('renders both IRef and ORef implicit terminal directions', () => {
    const markup = renderToStaticMarkup(createElement(FBDDiagram, {
      body: fixtureBody('fbd-v35.L5X', 'FBDLogic'),
    }));

    expect(markup.match(/class="fbd-element fbd-element-reference"/g)).toHaveLength(2);
    expect(markup).toContain('data-terminal-type="input"');
    expect(markup).toContain('data-terminal-type="output"');
    expect(markup.match(/class="fbd-connection fbd-connection-wire"/g)).toHaveLength(1);
  });

  it('renders function, AOI, routine-control, wrapped text, attachment, and placeholder families', () => {
    const markup = renderToStaticMarkup(createElement(FBDDiagram, {
      body: renderElementsBody(),
    }));

    expect(markup).toContain('class="fbd-element fbd-element-function"');
    expect(markup).toContain('class="fbd-element fbd-element-add-on-instruction"');
    expect(markup.match(/class="fbd-element fbd-element-routine-control"/g)).toHaveLength(3);
    expect(markup).toContain('class="fbd-element fbd-element-text-box"');
    expect(markup).toContain('class="fbd-element fbd-element-placeholder"');
    expect(markup).toContain('class="fbd-attachment"');
    expect(markup).toContain('data-attachment-count="1"');
    expect(markup).toContain('State: ValveState');
    expect(markup).toContain('InputA, InputB');
    expect(markup).toContain('ReturnA, ReturnB');
    expect(markup.match(/class="fbd-text-line"/g)?.length).toBeGreaterThan(1);
    expect(markup).toContain('GSV');
    expect(markup).toContain('ID 9');
    expect(markup).toContain('unsupported semantics');
  });

  it('uses distinct reference and connector silhouettes from the source element types', () => {
    const referenceMarkup = renderToStaticMarkup(createElement(FBDDiagram, {
      body: fixtureBody('fbd-v35.L5X', 'FBDLogic'),
    }));
    const connectorMarkup = renderToStaticMarkup(createElement(FBDDiagram, {
      body: levelControlBody(),
      sheetIndex: 0,
    }));

    expect(referenceMarkup).toContain('class="fbd-terminal-shape fbd-reference-shape"');
    expect(connectorMarkup).toContain('class="fbd-terminal-shape fbd-connector-shape"');
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
        'FBD_MISSING_SHEET_NAME',
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
    expect(markup).toContain('Unable to render FBD sheet');
  });
});
