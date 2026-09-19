import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildFBDConnectorIndex,
  buildFBDSheetLayout,
  FBD_GRID_TO_SVG_SCALE,
  FBD_PORT_PIN_EXTENT,
  FBD_WIRE_OBSTACLE_GAP,
  FBD_WIRE_SEPARATION,
  getFBDElementFooterLabels,
  layoutFBDElement,
  measureFBDElement,
  routeFBDConnection,
  type FBDPortLayout,
} from '../../src/layout';
import { parseString } from '../../src/parsers';
import type {
  NormalizedFBDConnector,
  NormalizedFBDBody,
  NormalizedFBDElement,
  NormalizedFBDSheet,
} from '../../src/types';
import { withFunctionElement } from '../fixtures/fbdRenderElements';

const fixturePath = join(__dirname, '../fixtures/l5x/fbd-level-control-v35.L5X');

function fixtureBody(fixture: string, routineName: string): NormalizedFBDBody {
  const result = parseString(
    readFileSync(join(__dirname, `../fixtures/l5x/${fixture}`), 'utf8'),
    'l5x',
  );
  const body = result.data?.programs[0]?.routines.find(
    (routine) => routine.name === routineName,
  )?.fbd;
  if (!body) throw new Error(`expected normalized ${routineName} FBD body`);
  return body;
}

function levelControlBody(): NormalizedFBDBody {
  const result = parseString(readFileSync(fixturePath, 'utf8'), 'l5x');
  expect(result).toMatchObject({ success: true, status: 'complete' });
  const body = result.data?.programs[0]?.routines.find((routine) => routine.name === 'MainFBD')?.fbd;
  if (!body) throw new Error('expected normalized level-control FBD body');
  return body;
}

function renderElementsBody(): NormalizedFBDBody {
  const source = withFunctionElement(readFileSync(
    join(__dirname, '../fixtures/l5x/fbd-render-elements-v35.L5X'),
    'utf8',
  ));
  const result = parseString(source, 'l5x');
  const body = result.data?.programs[0]?.routines.find(
    (routine) => routine.name === 'Elements',
  )?.fbd;
  if (!body) throw new Error('expected normalized Elements FBD body');
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

function positiveCollinearOverlap(
  first: readonly [{ x: number; y: number }, { x: number; y: number }],
  second: readonly [{ x: number; y: number }, { x: number; y: number }],
): boolean {
  const [firstStart, firstEnd] = first;
  const [secondStart, secondEnd] = second;
  const firstHorizontal = firstStart.y === firstEnd.y;
  const secondHorizontal = secondStart.y === secondEnd.y;
  if (firstHorizontal !== secondHorizontal) return false;
  if (firstHorizontal) {
    return firstStart.y === secondStart.y
      && Math.min(Math.max(firstStart.x, firstEnd.x), Math.max(secondStart.x, secondEnd.x))
        - Math.max(Math.min(firstStart.x, firstEnd.x), Math.min(secondStart.x, secondEnd.x)) > 0;
  }
  return firstStart.x === secondStart.x
    && Math.min(Math.max(firstStart.y, firstEnd.y), Math.max(secondStart.y, secondEnd.y))
      - Math.max(Math.min(firstStart.y, firstEnd.y), Math.min(secondStart.y, secondEnd.y)) > 0;
}

function expectNoWireOverlapExceptSharedConnectorStubs(
  layout: ReturnType<typeof buildFBDSheetLayout>,
) {
  layout.connections.forEach((connection, connectionIndex) => {
    const segments = connection.points.slice(1).map(
      (point, index) => [connection.points[index], point] as const,
    );
    layout.connections.slice(connectionIndex + 1).forEach((otherConnection) => {
      const otherSegments = otherConnection.points.slice(1).map(
        (point, index) => [otherConnection.points[index], point] as const,
      );
      const sharedSource = connection.connection.from.elementId
          === otherConnection.connection.from.elementId
        && connection.source.port.id === otherConnection.source.port.id;
      const sharedDestination = connection.connection.to.elementId
          === otherConnection.connection.to.elementId
        && connection.destination.port.id === otherConnection.destination.port.id;

      segments.forEach((segment, segmentIndex) => {
        otherSegments.forEach((otherSegment, otherSegmentIndex) => {
          const sharedSourceStub = sharedSource && segmentIndex === 0 && otherSegmentIndex === 0;
          const sharedDestinationStub = sharedDestination
            && segmentIndex === segments.length - 1
            && otherSegmentIndex === otherSegments.length - 1;
          if (!sharedSourceStub && !sharedDestinationStub) {
            expect(positiveCollinearOverlap(segment, otherSegment)).toBe(false);
          }
        });
      });
    });
  });
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
    expect(measureFBDElement(block).width).toBeGreaterThanOrEqual(70);
  });

  it('uses a compact minimum width and center separator gap for instruction nodes', () => {
    const compact = measureFBDElement({
      kind: 'routine-control',
      operation: 'JSR',
      id: 'compact',
      position: { x: '10', y: '10' },
      inputParameters: [],
      returnParameters: [],
    });
    const pairedLabels = measureFBDElement({
      kind: 'function',
      instruction: 'F',
      id: 'paired-labels',
      position: { x: '10', y: '10' },
      ports: [
        {
          id: 'In',
          label: 'Input',
          direction: 'input',
          side: 'left',
          order: 0,
          defaultVisible: true,
          visible: true,
        },
        {
          id: 'Out',
          label: 'Output',
          direction: 'output',
          side: 'right',
          order: 0,
          defaultVisible: true,
          visible: true,
        },
      ],
    });

    expect(compact.width).toBe(70);
    expect(pairedLabels.width).toBe('Input'.length * 7 + 'Output'.length * 7 + 36);
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
      expect(layout.ports[0].point).toEqual({
        x: Number(terminal.position?.x),
        y: Number(terminal.position?.y),
      });
    }
  });

  it('treats IREF, OREF, ICON, and OCON source coordinates as their pin anchors', () => {
    const terminals: NormalizedFBDElement[] = [
      {
        kind: 'reference', referenceType: 'input', id: '1', operand: 'IREF',
        position: { x: '160', y: '100' }, ports: ['value'],
      },
      {
        kind: 'reference', referenceType: 'output', id: '2', operand: 'OREF',
        position: { x: '520', y: '140' }, ports: ['value'],
      },
      {
        kind: 'connector', connectorType: 'input', id: '3', name: 'ICON',
        position: { x: '160', y: '180' }, ports: ['value'],
      },
      {
        kind: 'connector', connectorType: 'output', id: '4', name: 'OCON',
        position: { x: '520', y: '220' }, ports: ['value'],
      },
    ];

    terminals.forEach((terminal) => {
      const layout = layoutFBDElement(terminal);
      expect(layout?.ports[0].point).toEqual({
        x: Number(terminal.position?.x),
        y: Number(terminal.position?.y),
      });
    });
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
    layouts.flatMap((layout) => layout.connections).forEach((connection) => {
      connection.points.slice(1).forEach((point, index) => {
        const previous = connection.points[index];
        expect(point.x === previous.x || point.y === previous.y).toBe(true);
      });
    });
    expect(layouts.every((layout) => layout.bounds.width > 0 && layout.bounds.height > 0)).toBe(true);
    expect(
      elements.find((element) => element.kind === 'block' && element.instruction === 'DEDT')
    ).toMatchObject({ arrays: [{ name: 'StorageArray', operand: 'DEDT_01array' }] });
  });

  it('lays out every extended element family and a valid text attachment', () => {
    const sheet = renderElementsBody().sheets[0];
    const layout = buildFBDSheetLayout(sheet);

    expect(sheet.elements.map((element) => element.kind)).toEqual([
      'reference',
      'reference',
      'reference',
      'function',
      'add-on-instruction',
      'placeholder',
      'routine-control',
      'routine-control',
      'routine-control',
      'text-box',
    ]);
    expect(layout.elements).toHaveLength(10);
    expect(layout.connections).toHaveLength(5);
    expect(layout.attachments).toHaveLength(1);
    expect(layout.attachments[0]).toMatchObject({
      attachment: { fromElementId: '10', toElementId: '4' },
      from: { element: { kind: 'text-box', id: '10' } },
      to: { element: { kind: 'add-on-instruction', id: '4' } },
    });
    expect(layout.attachments[0].path).toMatch(/^M /);
    expect(layout.diagnostics).toEqual([]);
  });

  it('auto-sizes Rockwell text boxes whose declared width is zero', () => {
    const textBox: NormalizedFBDElement = {
      kind: 'text-box',
      id: '21',
      position: { x: '280', y: '20' },
      width: '0',
      text: 'Calculate the\nincremental net flow\ninto/out of the tank.',
    };
    const autoSized = measureFBDElement(textBox);
    const omittedWidth = measureFBDElement({ ...textBox, width: undefined });

    expect(autoSized).toEqual(omittedWidth);
    expect(autoSized.width).toBeGreaterThanOrEqual(120);
    expect(autoSized.height).toBe(72);
  });

  it('sizes instruction frames for their longest rendered footer label', () => {
    const source = renderElementsBody().sheets[0];
    const footerElements = source.elements.filter(
      (element) => element.kind === 'add-on-instruction' || element.kind === 'routine-control',
    );

    for (const element of footerElements) {
      const longestFooter = Math.max(
        ...getFBDElementFooterLabels(element).map((label) => label.length * 7 + 24),
      );
      expect(measureFBDElement(element).width).toBeGreaterThanOrEqual(longestFooter);
    }
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
    expect(forward.points[0]).toEqual({ x: 100 + FBD_PORT_PIN_EXTENT, y: 100 });
    expect(forward.points.at(-1)).toEqual({ x: 400 - FBD_PORT_PIN_EXTENT, y: 200 });
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

  it('routes around expanded node bounds including decorative D-shaped pins', () => {
    const blocker = { x: 250, y: 40, width: 100, height: 120 };
    const expandedBlocker = {
      x: blocker.x - FBD_PORT_PIN_EXTENT - FBD_WIRE_OBSTACLE_GAP,
      y: blocker.y - FBD_WIRE_OBSTACLE_GAP,
      width: blocker.width + (FBD_PORT_PIN_EXTENT + FBD_WIRE_OBSTACLE_GAP) * 2,
      height: blocker.height + FBD_WIRE_OBSTACLE_GAP * 2,
    };
    const route = routeFBDConnection(
      port(100, 100, 'output'),
      port(500, 100, 'input'),
      'wire',
      0,
      { x: 80, y: 40, width: 440, height: 120 },
      [blocker],
    );

    expect(route.points.some((point) => (
      point.y === expandedBlocker.y
      || point.y === expandedBlocker.y + expandedBlocker.height
    ))).toBe(true);
    route.points.slice(2, -1).forEach((point, index) => {
      const previous = route.points[index + 1];
      if (previous.y === point.y && point.y > expandedBlocker.y
        && point.y < expandedBlocker.y + expandedBlocker.height) {
        const segmentStart = Math.min(previous.x, point.x);
        const segmentEnd = Math.max(previous.x, point.x);
        expect(segmentEnd <= expandedBlocker.x
          || segmentStart >= expandedBlocker.x + expandedBlocker.width).toBe(true);
      }
      if (previous.x === point.x && point.x > expandedBlocker.x
        && point.x < expandedBlocker.x + expandedBlocker.width) {
        const segmentStart = Math.min(previous.y, point.y);
        const segmentEnd = Math.max(previous.y, point.y);
        expect(segmentEnd <= expandedBlocker.y
          || segmentStart >= expandedBlocker.y + expandedBlocker.height).toBe(true);
      }
    });
  });

  it('keeps every level-control wire clear of every expanded element obstacle', () => {
    for (const sheet of levelControlBody().sheets) {
      const layout = buildFBDSheetLayout(sheet);
      const obstacles = layout.elements.map(({ bounds }) => ({
        x: bounds.x - FBD_PORT_PIN_EXTENT - FBD_WIRE_OBSTACLE_GAP,
        y: bounds.y - FBD_WIRE_OBSTACLE_GAP,
        width: bounds.width + (FBD_PORT_PIN_EXTENT + FBD_WIRE_OBSTACLE_GAP) * 2,
        height: bounds.height + FBD_WIRE_OBSTACLE_GAP * 2,
      }));

      for (const connection of layout.connections) {
        const interior = connection.points.slice(1, -1);
        interior.slice(1).forEach((point, index) => {
          const previous = interior[index];
          for (const obstacle of obstacles) {
            if (previous.y === point.y && point.y > obstacle.y
              && point.y < obstacle.y + obstacle.height) {
              const segmentStart = Math.min(previous.x, point.x);
              const segmentEnd = Math.max(previous.x, point.x);
              expect(segmentEnd <= obstacle.x
                || segmentStart >= obstacle.x + obstacle.width).toBe(true);
            }
            if (previous.x === point.x && point.x > obstacle.x
              && point.x < obstacle.x + obstacle.width) {
              const segmentStart = Math.min(previous.y, point.y);
              const segmentEnd = Math.max(previous.y, point.y);
              expect(segmentEnd <= obstacle.y
                || segmentStart >= obstacle.y + obstacle.height).toBe(true);
            }
          }
        });
      }
    }
  });

  it('separates coincident wire segments except at a shared D-connector stub', () => {
    for (const sheet of levelControlBody().sheets) {
      expectNoWireOverlapExceptSharedConnectorStubs(buildFBDSheetLayout(sheet));
    }

    const source = levelControlBody().sheets[0];
    const repeatedConnection = source.connections[1];
    const repeatedLayout = buildFBDSheetLayout({
      ...source,
      connections: [repeatedConnection, repeatedConnection, ...source.connections],
    });
    expectNoWireOverlapExceptSharedConnectorStubs(repeatedLayout);
    const repeatedRoutes = repeatedLayout.connections.slice(0, 2);
    expect(repeatedRoutes[0].points).not.toEqual(repeatedRoutes[1].points);
    expect(FBD_WIRE_SEPARATION).toBeGreaterThan(0);
  });

  it('keeps large Studio-exported obstacle sets within a bounded routing cost', () => {
    const obstacleCount = 200;
    const obstacles = Array.from({ length: obstacleCount }, (_value, index) => ({
      x: 150 + index * 20,
      y: -index,
      width: 10,
      height: 200 + index * 2,
    }));
    const startedAt = performance.now();
    const route = routeFBDConnection(
      port(100, 100, 'output'),
      port(150 + obstacleCount * 20 + 100, 100, 'input'),
      'wire',
      0,
      { x: 80, y: -obstacleCount, width: obstacleCount * 20 + 200, height: 600 },
      obstacles,
    );
    const elapsed = performance.now() - startedAt;

    expect(route.points.length).toBeGreaterThan(3);
    expect(elapsed).toBeLessThan(2_000);
  }, 3_000);

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

  it('diagnoses unplaceable elements and duplicate ports in stable source order', () => {
    const source = renderElementsBody().sheets[0];
    const functionElement = source.elements.find(
      (element) => element.kind === 'function',
    );
    const placeholder = source.elements.find(
      (element) => element.kind === 'placeholder',
    );
    if (!functionElement || !placeholder) throw new Error('expected renderer fixture elements');
    const duplicatePort: NormalizedFBDElement = {
      ...functionElement,
      ports: [...functionElement.ports, { ...functionElement.ports[0], order: 2 }],
    };
    const unplaceable: NormalizedFBDElement = {
      ...placeholder,
      id: '99',
      position: { x: '20' },
      reasonCodes: ['missing-position'],
    };
    const sheet: NormalizedFBDSheet = {
      ...source,
      elements: [unplaceable, duplicatePort],
      connections: [],
      attachments: [],
    };

    const layout = buildFBDSheetLayout(sheet);
    expect(layout.elements.map((element) => element.element.kind)).toEqual(['function']);
    expect(layout.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'FBD_LAYOUT_UNPLACEABLE_ELEMENT',
      'FBD_LAYOUT_DUPLICATE_PORT_ID',
    ]);
    expect(layout.diagnostics).toEqual([
      expect.objectContaining({ elementId: '99' }),
      expect.objectContaining({ elementId: '3', portId: 'SourceA' }),
    ]);
  });

  it('omits only unsafe connections and reports endpoint failures in connection order', () => {
    const source = renderElementsBody().sheets[0];
    const input = source.elements.find(
      (element) => element.kind === 'reference' && element.referenceType === 'input',
    );
    const functionElement = source.elements.find((element) => element.kind === 'function');
    if (!input || !functionElement) throw new Error('expected renderer fixture endpoints');
    const sheet: NormalizedFBDSheet = {
      ...source,
      elements: [input, functionElement],
      connections: [
        {
          kind: 'wire',
          from: { elementId: '404', port: 'value' },
          to: { elementId: '3', port: 'SourceA' },
        },
        {
          kind: 'wire',
          from: { elementId: '1', port: 'value' },
          to: { elementId: '3', port: 'Missing' },
        },
        {
          kind: 'wire',
          from: { elementId: '3', port: 'SourceA' },
          to: { elementId: '3', port: 'SourceB' },
        },
      ],
      attachments: [],
    };

    const layout = buildFBDSheetLayout(sheet);
    expect(layout.connections).toEqual([]);
    expect(layout.diagnostics.map((diagnostic) => [diagnostic.code, diagnostic.connectionIndex]))
      .toEqual([
        ['FBD_LAYOUT_MISSING_ELEMENT', 0],
        ['FBD_LAYOUT_MISSING_PORT', 1],
        ['FBD_LAYOUT_INVALID_DIRECTION', 2],
      ]);
  });

  it('keeps neighboring topology while rejecting invalid attachment sources and targets', () => {
    const source = renderElementsBody().sheets[0];
    const input = source.elements.find(
      (element) => element.kind === 'reference' && element.referenceType === 'input',
    );
    const target = source.elements.find((element) => element.kind === 'add-on-instruction');
    const note = source.elements.find((element) => element.kind === 'text-box');
    if (!input || !target || !note) throw new Error('expected attachment fixture elements');
    const secondNote: NormalizedFBDElement = {
      ...note,
      id: '11',
      position: { x: '560', y: '420' },
    };
    const sheet: NormalizedFBDSheet = {
      ...source,
      elements: [input, target, note, secondNote],
      connections: [],
      attachments: [
        { fromElementId: note.id, toElementId: target.id },
        { fromElementId: input.id, toElementId: target.id },
        { fromElementId: note.id, toElementId: '404' },
        { fromElementId: note.id, toElementId: secondNote.id },
      ],
    };

    const layout = buildFBDSheetLayout(sheet);
    expect(layout.attachments).toHaveLength(1);
    expect(layout.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'FBD_ATTACHMENT_INVALID_SOURCE',
      'FBD_ATTACHMENT_MISSING_ELEMENT',
      'FBD_ATTACHMENT_INVALID_TARGET',
    ]);
    expect(layout.elements).toHaveLength(4);
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
