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
    expect(markup).toContain('width:900px');
    expect(markup).toContain('height:600px');
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

  it('uses distinct reference and connector silhouettes from the source element types', () => {
    const referenceMarkup = renderToStaticMarkup(createElement(FBDDiagram, {
      body: fixtureBody('fbd-v35.L5X', 'FBDLogic'),
    }));
    const connectorMarkup = renderToStaticMarkup(createElement(FBDDiagram, {
      body: levelControlBody(),
      sheetIndex: 0,
    }));

    expect(referenceMarkup).toContain('fbd-reference-shape');
    expect(connectorMarkup).toContain('fbd-connector-shape fbd-connector-target');
    const inputConnectorMarkup = renderToStaticMarkup(createElement(FBDDiagram, {
      body: levelControlBody(),
      sheetIndex: 1,
    }));
    expect(inputConnectorMarkup).toContain('fbd-connector-shape fbd-connector-source');
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
