import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildFBDConnectorIndex,
  buildFBDSheetLayout,
  FBD_GRID_TO_SVG_SCALE,
  layoutFBDElement,
  measureFBDElement,
  routeFBDConnection,
  type FBDPortLayout,
} from '../../src/layout';
import { parseString } from '../../src/parsers';
import type {
  NormalizedFBDConnector,
  NormalizedFBDBody,
  NormalizedFBDSheet,
} from '../../src/types';

const fixturePath = join(__dirname, '../fixtures/l5x/fbd-level-control-v35.L5X');

function levelControlBody(): NormalizedFBDBody {
  const result = parseString(readFileSync(fixturePath, 'utf8'), 'l5x');
  expect(result).toMatchObject({ success: true, status: 'complete' });
  const body = result.data?.programs[0]?.routines.find((routine) => routine.name === 'MainFBD')?.fbd;
  if (!body) throw new Error('expected normalized level-control FBD body');
  return body;
}

function connector(
  id: string,
  name: string | undefined,
  connectorType: 'input' | 'output',
): NormalizedFBDConnector {
  return {
    kind: 'connector',
    connectorType,
    id,
    name,
    position: { x: '10', y: '10' },
    ports: ['value'],
  };
}

function connectorSheet(...elements: NormalizedFBDConnector[]): NormalizedFBDSheet {
  return {
    number: { value: '1', source: 'declared' },
    name: { value: 'Sheet 1', source: 'fallback' },
    descriptions: [],
    elements,
    connections: [],
    attachments: [],
  };
}

function port(
  x: number,
  y: number,
  direction: 'input' | 'output',
): FBDPortLayout {
  return {
    port: {
      id: direction === 'input' ? 'In' : 'Out',
      label: direction,
      direction,
      side: direction === 'input' ? 'left' : 'right',
      order: 0,
      defaultVisible: true,
      visible: true,
    },
    point: { x, y },
  };
}

describe('FBD layout', () => {
  it('uses one documented grid unit per SVG unit and preserves source anchors', () => {
    const block = levelControlBody().sheets[0].elements.find(
      (element) => element.kind === 'block' && element.instruction === 'ADD'
    );
    if (!block) throw new Error('expected ADD block');

    const layout = layoutFBDElement(block);
    expect(FBD_GRID_TO_SVG_SCALE).toBe(1);
    expect(layout?.bounds).toMatchObject({ x: 300, y: 100 });
    expect(measureFBDElement(block).width).toBeGreaterThanOrEqual(140);
  });

  it('places explicit ports deterministically on their declared sides and order', () => {
    const block = levelControlBody().sheets[0].elements.find(
      (element) => element.kind === 'block' && element.instruction === 'ADD'
    );
    if (!block) throw new Error('expected ADD block');
    const layout = layoutFBDElement(block);
    if (!layout) throw new Error('expected positioned ADD block');

    expect(layout.ports.map((port) => [port.port.id, port.port.side, port.port.order])).toEqual([
      ['SourceA', 'left', 0],
      ['SourceB', 'left', 1],
      ['Dest', 'right', 0],
    ]);
    expect(layout.ports.filter((port) => port.port.side === 'left').map((port) => port.point.y))
      .toEqual([...layout.ports.filter((port) => port.port.side === 'left').map((port) => port.point.y)].sort((a, b) => a - b));
  });

  it('centers implicit reference and connector terminals on the element edge', () => {
    const result = parseString(
      readFileSync(join(__dirname, '../fixtures/l5x/fbd-v35.L5X'), 'utf8'),
      'l5x',
    );
    const basicBody = result.data?.programs[0]?.routines.find((routine) => routine.name === 'FBDLogic')?.fbd;
    if (!basicBody) throw new Error('expected basic FBD body');
    const terminals = [...levelControlBody().sheets, ...basicBody.sheets]
      .flatMap((sheet) => sheet.elements).filter(
      (element) => element.kind === 'reference' || element.kind === 'connector'
    );

    for (const terminal of terminals) {
      const layout = layoutFBDElement(terminal);
      if (!layout) throw new Error('expected positioned terminal');
      expect(layout.ports).toHaveLength(1);
      expect(layout.ports[0].point.y).toBe(layout.bounds.y + layout.bounds.height / 2);
      expect([layout.bounds.x, layout.bounds.x + layout.bounds.width]).toContain(layout.ports[0].point.x);
      const emitsValue = terminal.kind === 'reference'
        ? terminal.referenceType === 'input'
        : terminal.connectorType === 'input';
      expect(layout.ports[0].port.direction).toBe(emitsValue ? 'output' : 'input');
      expect(layout.ports[0].point.x).toBe(emitsValue
        ? layout.bounds.x + layout.bounds.width
        : layout.bounds.x);
    }
  });

  it('lays out and routes the complete two-sheet level-control fixture', () => {
    const body = levelControlBody();
    const layouts = body.sheets.map(buildFBDSheetLayout);
    const elements = body.sheets.flatMap((sheet) => sheet.elements);
    const connections = body.sheets.flatMap((sheet) => sheet.connections);

    expect(body.sheets).toHaveLength(2);
    expect(elements.filter((element) => element.kind === 'block')).toHaveLength(9);
    expect(elements.filter((element) => element.kind === 'reference')).toHaveLength(2);
    expect(elements.filter((element) => element.kind === 'connector')).toHaveLength(2);
    expect(connections.filter((connection) => connection.kind === 'wire')).toHaveLength(11);
    expect(connections.filter((connection) => connection.kind === 'feedback-wire')).toHaveLength(2);
    expect(layouts.map((layout) => layout.connections.length)).toEqual([10, 3]);
    expect(layouts.flatMap((layout) => layout.diagnostics)).toEqual([]);
    expect(layouts[0].connections.filter((connection) => connection.routeKind === 'feedback')).toHaveLength(2);
    expect(layouts.every((layout) => layout.bounds.width > 0 && layout.bounds.height > 0)).toBe(true);
    expect(
      elements.find((element) => element.kind === 'block' && element.instruction === 'DEDT')
    ).toMatchObject({ arrays: [{ name: 'StorageArray', operand: 'DEDT_01array' }] });
  });

  it('routes forward, backward, crossing, and feedback connections with deterministic orthogonal paths', () => {
    const bounds = { x: 40, y: 60, width: 900, height: 500 };
    const forward = routeFBDConnection(port(100, 100, 'output'), port(400, 200, 'input'), 'wire', 0, bounds);
    const crossing = routeFBDConnection(port(100, 220, 'output'), port(400, 80, 'input'), 'wire', 1, bounds);
    const backward = routeFBDConnection(port(500, 260, 'output'), port(200, 140, 'input'), 'wire', 2, bounds);
    const feedback = routeFBDConnection(port(800, 300, 'output'), port(80, 120, 'input'), 'feedback-wire', 3, bounds);

    expect([forward.routeKind, crossing.routeKind, backward.routeKind, feedback.routeKind]).toEqual([
      'forward', 'forward', 'backward', 'feedback',
    ]);
    expect(forward.points[1].x).toBe(crossing.points[1].x);
    expect(forward.points[1].y).not.toBe(crossing.points[1].y);
    expect(backward.points.some((point) => point.y < bounds.y)).toBe(true);
    expect(feedback.points.some((point) => point.y > bounds.y + bounds.height)).toBe(true);
    for (const route of [forward, crossing, backward, feedback]) {
      route.points.slice(1).forEach((point, index) => {
        const previous = route.points[index];
        expect(point.x === previous.x || point.y === previous.y).toBe(true);
      });
    }
  });

  it('omits connections that reference ambiguous duplicate element IDs', () => {
    const source = levelControlBody().sheets[0];
    const input = source.elements.find((element) => element.kind === 'reference');
    const destination = source.elements.find(
      (element) => element.kind === 'block' && element.instruction === 'SUB'
    );
    if (!input || !destination) throw new Error('expected fixture endpoints');
    const sheet: NormalizedFBDSheet = {
      ...source,
      elements: [input, { ...input, position: { x: '180', y: '420' } }, destination],
      connections: [{
        kind: 'wire',
        from: { elementId: input.id, port: 'value' },
        to: { elementId: destination.id, port: 'SourceA' },
      }],
    };

    const layout = buildFBDSheetLayout(sheet);
    expect(layout.connections).toEqual([]);
    expect(layout.diagnostics).toContainEqual(expect.objectContaining({
      code: 'FBD_LAYOUT_DUPLICATE_ELEMENT_ID',
      elementId: input.id,
    }));
  });

  it('builds one exact, case-sensitive routine connector relationship without a cross-sheet route', () => {
    const body = levelControlBody();
    const index = buildFBDConnectorIndex(body.sheets);

    expect(index.diagnostics).toEqual([]);
    expect(index.relationships).toEqual([
      expect.objectContaining({
        name: 'TankLevel',
        producer: expect.objectContaining({ sheetIndex: 0, element: expect.objectContaining({ id: '1' }) }),
        consumers: [expect.objectContaining({ sheetIndex: 1, element: expect.objectContaining({ id: '10' }) })],
      }),
    ]);
    expect(body.sheets.every((sheet) =>
      sheet.connections.every((connection) => connection.from.elementId !== '1' && connection.to.elementId !== '10')
    )).toBe(true);
  });

  it('diagnoses blank, ambiguous, unmatched, and case-variant connector groups', () => {
    const index = buildFBDConnectorIndex([
      connectorSheet(
        connector('1', undefined, 'output'),
        connector('2', 'TankLevel', 'output'),
        connector('3', 'TankLevel', 'output'),
        connector('4', 'tanklevel', 'input'),
        connector('5', 'Orphan', 'input'),
      ),
    ]);

    expect(index.relationships).toEqual([]);
    expect(index.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'FBD_CONNECTOR_BLANK_NAME',
      'FBD_CONNECTOR_CASE_VARIANT',
      'FBD_CONNECTOR_AMBIGUOUS_SOURCE',
      'FBD_CONNECTOR_UNMATCHED',
      'FBD_CONNECTOR_UNMATCHED',
    ]);
  });

  it('produces byte-identical deterministic layout and routes across repeated runs', () => {
    const sheet = levelControlBody().sheets[0];
    expect(JSON.stringify(buildFBDSheetLayout(sheet))).toBe(JSON.stringify(buildFBDSheetLayout(sheet)));
  });
});
