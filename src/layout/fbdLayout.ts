import type {
  NormalizedFBDBlock,
  NormalizedFBDElement,
  NormalizedFBDPort,
  NormalizedFBDSheet,
} from '../types';
import type {
  FBDConnectionLayout,
  FBDConnectorIndex,
  FBDConnectorLocation,
  FBDElementLayout,
  FBDLayoutDiagnostic,
  FBDPoint,
  FBDPortLayout,
  FBDRect,
  FBDRouteKind,
  FBDSheetLayout,
} from './fbdLayoutTypes';

/** Rockwell FBD grid units map one-to-one to SVG user units. */
export const FBD_GRID_TO_SVG_SCALE = 1;
export const FBD_SHEET_PADDING = 32;
export const FBD_PORT_SPACING = 24;
export const FBD_BLOCK_HEADER_HEIGHT = 42;
export const FBD_BACKWARD_ROUTE_GAP = 28;
export const FBD_ROUTE_LANE_GAP = 12;

const CHARACTER_WIDTH = 7;
const REFERENCE_HEIGHT = 32;
const MIN_BLOCK_WIDTH = 140;

function textWidth(value: string | undefined): number {
  return (value?.length ?? 0) * CHARACTER_WIDTH;
}

function sourceCoordinate(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0
    ? parsed * FBD_GRID_TO_SVG_SCALE
    : undefined;
}

function elementPosition(element: NormalizedFBDElement): FBDPoint | undefined {
  if (!('position' in element) || element.position === undefined) {
    return undefined;
  }
  const x = sourceCoordinate(element.position.x);
  const y = sourceCoordinate(element.position.y);
  return x === undefined || y === undefined ? undefined : { x, y };
}

function elementTitle(element: NormalizedFBDElement): string {
  switch (element.kind) {
    case 'block':
      return element.instruction ?? 'Block';
    case 'add-on-instruction':
      return element.name ?? 'Add-On Instruction';
    case 'function':
      return element.instruction;
    case 'routine-control':
      return element.operation;
    case 'placeholder':
      return element.sourceKind;
    case 'reference':
      return element.operand ?? (element.referenceType === 'input' ? 'Input' : 'Output');
    case 'connector':
      return element.name ?? 'Connector';
    case 'text-box':
      return element.text ?? '';
  }
}

function elementPorts(element: NormalizedFBDElement): NormalizedFBDPort[] {
  if ('ports' in element && element.kind !== 'reference' && element.kind !== 'connector') {
    return element.ports;
  }
  return [];
}

function blockArrayRows(element: NormalizedFBDElement): number {
  return element.kind === 'block' ? element.arrays.length : 0;
}

export function measureFBDElement(element: NormalizedFBDElement): Pick<FBDRect, 'width' | 'height'> {
  if (element.kind === 'reference' || element.kind === 'connector') {
    return {
      width: Math.max(72, textWidth(elementTitle(element)) + 34),
      height: REFERENCE_HEIGHT,
    };
  }

  if (element.kind === 'text-box') {
    const declaredWidth = sourceCoordinate(element.width);
    return {
      width: declaredWidth ?? Math.max(120, textWidth(element.text) + 24),
      height: 56,
    };
  }

  const ports = elementPorts(element);
  const leftPorts = ports.filter((port) => port.side === 'left');
  const rightPorts = ports.filter((port) => port.side === 'right');
  const portRows = Math.max(leftPorts.length, rightPorts.length, 1);
  const leftLabelWidth = Math.max(0, ...leftPorts.map((port) => textWidth(port.label)));
  const rightLabelWidth = Math.max(0, ...rightPorts.map((port) => textWidth(port.label)));
  const titleWidth = textWidth(elementTitle(element)) + 28;
  const operand = element.kind === 'block' || element.kind === 'add-on-instruction'
    ? element.operand
    : element.kind === 'routine-control'
      ? element.routine
      : undefined;
  const operandWidth = textWidth(operand) + 28;
  const arrayRows = blockArrayRows(element);

  return {
    width: Math.max(MIN_BLOCK_WIDTH, titleWidth, operandWidth, leftLabelWidth + rightLabelWidth + 72),
    height: Math.max(64, FBD_BLOCK_HEADER_HEIGHT + portRows * FBD_PORT_SPACING + arrayRows * 18),
  };
}

function implicitTerminal(element: NormalizedFBDElement): FBDPortLayout['port'] | undefined {
  if (element.kind !== 'reference' && element.kind !== 'connector') {
    return undefined;
  }

  const emitsValue = element.kind === 'reference'
    ? element.referenceType === 'input'
    : element.connectorType === 'input';

  return {
    id: 'value',
    label: 'Value',
    direction: emitsValue ? 'output' : 'input',
    side: emitsValue ? 'right' : 'left',
    order: 0,
    defaultVisible: true,
    visible: true,
  };
}

export function placeFBDElementPorts(
  element: NormalizedFBDElement,
  bounds: FBDRect,
): FBDPortLayout[] {
  const implicit = implicitTerminal(element);
  if (implicit) {
    return [{
      port: implicit,
      point: {
        x: implicit.side === 'left' ? bounds.x : bounds.x + bounds.width,
        y: bounds.y + bounds.height / 2,
      },
    }];
  }
  const ports: FBDPortLayout['port'][] = implicit ? [implicit] : elementPorts(element);
  const sidePorts = (side: 'left' | 'right') => ports
    .filter((port) => port.side === side)
    .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id));

  return (['left', 'right'] as const).flatMap((side) => {
    const ordered = sidePorts(side);
    if (ordered.length === 0) {
      return [];
    }
    const footerHeight = blockArrayRows(element) * 18;
    const availableHeight = Math.max(
      bounds.height - FBD_BLOCK_HEADER_HEIGHT - footerHeight,
      FBD_PORT_SPACING,
    );
    const spacing = availableHeight / (ordered.length + 1);
    return ordered.map((port, index) => ({
      port,
      point: {
        x: side === 'left' ? bounds.x : bounds.x + bounds.width,
        y: bounds.y + FBD_BLOCK_HEADER_HEIGHT + spacing * (index + 1),
      },
    }));
  });
}

export function layoutFBDElement(element: NormalizedFBDElement): FBDElementLayout | undefined {
  const position = elementPosition(element);
  if (!position) {
    return undefined;
  }
  const dimensions = measureFBDElement(element);
  const bounds = { ...position, ...dimensions };
  return { element, bounds, ports: placeFBDElementPorts(element, bounds) };
}

function unionPoints(points: readonly FBDPoint[]): FBDRect {
  if (points.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function elementExtents(elements: readonly FBDElementLayout[]): FBDRect {
  return unionPoints(elements.flatMap((layout) => [
    { x: layout.bounds.x, y: layout.bounds.y },
    { x: layout.bounds.x + layout.bounds.width, y: layout.bounds.y + layout.bounds.height },
  ]));
}

function pointsToPath(points: readonly FBDPoint[]): string {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function deduplicateAdjacentPoints(points: readonly FBDPoint[]): FBDPoint[] {
  return points.filter((point, index) => {
    const previous = points[index - 1];
    return !previous || previous.x !== point.x || previous.y !== point.y;
  });
}

export function routeFBDConnection(
  source: FBDPortLayout,
  destination: FBDPortLayout,
  connectionKind: 'wire' | 'feedback-wire',
  connectionIndex: number,
  elementBounds: FBDRect,
): Pick<FBDConnectionLayout, 'points' | 'path' | 'routeKind'> {
  let routeKind: FBDRouteKind;
  let points: FBDPoint[];

  if (connectionKind === 'feedback-wire') {
    routeKind = 'feedback';
    const laneY = elementBounds.y + elementBounds.height + FBD_BACKWARD_ROUTE_GAP
      + connectionIndex * FBD_ROUTE_LANE_GAP;
    points = [
      source.point,
      { x: source.point.x + FBD_BACKWARD_ROUTE_GAP / 2, y: source.point.y },
      { x: source.point.x + FBD_BACKWARD_ROUTE_GAP / 2, y: laneY },
      { x: destination.point.x - FBD_BACKWARD_ROUTE_GAP / 2, y: laneY },
      { x: destination.point.x - FBD_BACKWARD_ROUTE_GAP / 2, y: destination.point.y },
      destination.point,
    ];
  } else if (destination.point.x > source.point.x) {
    routeKind = 'forward';
    const middleX = source.point.x + (destination.point.x - source.point.x) / 2;
    points = [
      source.point,
      { x: middleX, y: source.point.y },
      { x: middleX, y: destination.point.y },
      destination.point,
    ];
  } else {
    routeKind = 'backward';
    const laneY = elementBounds.y - FBD_BACKWARD_ROUTE_GAP
      - connectionIndex * FBD_ROUTE_LANE_GAP;
    points = [
      source.point,
      { x: source.point.x + FBD_BACKWARD_ROUTE_GAP / 2, y: source.point.y },
      { x: source.point.x + FBD_BACKWARD_ROUTE_GAP / 2, y: laneY },
      { x: destination.point.x - FBD_BACKWARD_ROUTE_GAP / 2, y: laneY },
      { x: destination.point.x - FBD_BACKWARD_ROUTE_GAP / 2, y: destination.point.y },
      destination.point,
    ];
  }

  const canonicalPoints = deduplicateAdjacentPoints(points);
  return { points: canonicalPoints, path: pointsToPath(canonicalPoints), routeKind };
}

interface EndpointResolution {
  port?: FBDPortLayout;
  diagnostic?: FBDLayoutDiagnostic;
}

function resolveEndpoint(
  layoutsById: ReadonlyMap<string, FBDElementLayout[]>,
  elementId: string,
  portId: string | undefined,
  expectedDirection: 'input' | 'output',
  connectionIndex: number,
): EndpointResolution {
  const matches = layoutsById.get(elementId) ?? [];
  if (matches.length !== 1) {
    return matches.length === 0
      ? {
        diagnostic: {
          code: 'FBD_LAYOUT_MISSING_ELEMENT',
          message: `Connection ${connectionIndex} references missing element ${elementId}.`,
          elementId,
          connectionIndex,
        },
      }
      : {};
  }

  const layout = matches[0];
  const port = portId === undefined && layout.ports.length === 1
    ? layout.ports[0]
    : layout.ports.find((candidate) => candidate.port.id === portId);
  if (!port) {
    return {
      diagnostic: {
        code: 'FBD_LAYOUT_MISSING_PORT',
        message: `Connection ${connectionIndex} references missing port ${portId ?? '(implicit)'} on element ${elementId}.`,
        elementId,
        connectionIndex,
      },
    };
  }
  if (port.port.direction !== expectedDirection) {
    return {
      diagnostic: {
        code: 'FBD_LAYOUT_INVALID_DIRECTION',
        message: `Connection ${connectionIndex} uses ${port.port.id} on element ${elementId} as an ${expectedDirection} port, but it is ${port.port.direction}.`,
        elementId,
        connectionIndex,
      },
    };
  }
  return { port };
}

function paddedBounds(
  elements: readonly FBDElementLayout[],
  connections: readonly FBDConnectionLayout[],
): FBDRect {
  const elementPoints = elements.flatMap((layout) => [
    { x: layout.bounds.x, y: layout.bounds.y },
    { x: layout.bounds.x + layout.bounds.width, y: layout.bounds.y + layout.bounds.height },
  ]);
  const routePoints = connections.flatMap((connection) => connection.points);
  const extent = unionPoints([...elementPoints, ...routePoints]);
  return {
    x: extent.x - FBD_SHEET_PADDING,
    y: extent.y - FBD_SHEET_PADDING,
    width: Math.max(64, extent.width + FBD_SHEET_PADDING * 2),
    height: Math.max(64, extent.height + FBD_SHEET_PADDING * 2),
  };
}

export function buildFBDSheetLayout(sheet: NormalizedFBDSheet): FBDSheetLayout {
  const diagnostics: FBDLayoutDiagnostic[] = [];
  const elements = sheet.elements
    .map(layoutFBDElement)
    .filter((layout): layout is FBDElementLayout => layout !== undefined);
  const layoutsById = new Map<string, FBDElementLayout[]>();

  for (const layout of elements) {
    if (!('id' in layout.element) || layout.element.id === undefined) {
      continue;
    }
    const matches = layoutsById.get(layout.element.id) ?? [];
    matches.push(layout);
    layoutsById.set(layout.element.id, matches);
  }

  for (const [elementId, matches] of layoutsById) {
    if (matches.length > 1) {
      diagnostics.push({
        code: 'FBD_LAYOUT_DUPLICATE_ELEMENT_ID',
        message: `Element ID ${elementId} occurs ${matches.length} times; its connections are ambiguous.`,
        elementId,
      });
    }
  }

  const baseBounds = elementExtents(elements);
  const connections: FBDConnectionLayout[] = [];
  sheet.connections.forEach((connection, connectionIndex) => {
    const source = resolveEndpoint(
      layoutsById,
      connection.from.elementId,
      connection.from.port,
      'output',
      connectionIndex,
    );
    const destination = resolveEndpoint(
      layoutsById,
      connection.to.elementId,
      connection.to.port,
      'input',
      connectionIndex,
    );
    if (source.diagnostic) diagnostics.push(source.diagnostic);
    if (destination.diagnostic) diagnostics.push(destination.diagnostic);
    if (!source.port || !destination.port) {
      return;
    }
    const route = routeFBDConnection(
      source.port,
      destination.port,
      connection.kind,
      connectionIndex,
      baseBounds,
    );
    connections.push({ connection, source: source.port, destination: destination.port, ...route });
  });

  const bounds = paddedBounds(elements, connections);
  return {
    sheet,
    elements,
    connections,
    diagnostics,
    bounds,
    viewBox: `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`,
  };
}

function connectorLocation(
  element: NormalizedFBDElement,
  sheetIndex: number,
): FBDConnectorLocation | undefined {
  return element.kind === 'connector' ? { sheetIndex, element } : undefined;
}

export function buildFBDConnectorIndex(sheets: readonly NormalizedFBDSheet[]): FBDConnectorIndex {
  const diagnostics: FBDLayoutDiagnostic[] = [];
  const groups = new Map<string, FBDConnectorLocation[]>();
  const lowerCaseNames = new Map<string, Set<string>>();

  sheets.forEach((sheet, sheetIndex) => {
    sheet.elements.forEach((element) => {
      const location = connectorLocation(element, sheetIndex);
      if (!location) return;
      const name = location.element.name;
      if (name === undefined || name.trim() === '') {
        diagnostics.push({
          code: 'FBD_CONNECTOR_BLANK_NAME',
          message: `Connector ${element.id} on sheet ${sheetIndex + 1} has no usable name.`,
          sheetIndex,
          elementId: element.id,
        });
        return;
      }
      const locations = groups.get(name) ?? [];
      locations.push(location);
      groups.set(name, locations);
      const caseFoldedName = name.toLowerCase();
      const variants = lowerCaseNames.get(caseFoldedName) ?? new Set<string>();
      variants.add(name);
      lowerCaseNames.set(caseFoldedName, variants);
    });
  });

  for (const variants of lowerCaseNames.values()) {
    if (variants.size > 1) {
      const names = [...variants];
      diagnostics.push({
        code: 'FBD_CONNECTOR_CASE_VARIANT',
        message: `Connector names differ only by case and remain distinct: ${names.join(', ')}.`,
        connectorName: names.join(', '),
      });
    }
  }

  const relationships: FBDConnectorIndex['relationships'] = [];
  for (const [name, locations] of groups) {
    const producers = locations.filter((location) => location.element.connectorType === 'output');
    const consumers = locations.filter((location) => location.element.connectorType === 'input');
    if (producers.length > 1) {
      diagnostics.push({
        code: 'FBD_CONNECTOR_AMBIGUOUS_SOURCE',
        message: `Connector ${name} has ${producers.length} output connectors; its source is ambiguous.`,
        connectorName: name,
      });
      continue;
    }
    if (producers.length !== 1 || consumers.length === 0) {
      diagnostics.push({
        code: 'FBD_CONNECTOR_UNMATCHED',
        message: `Connector ${name} requires exactly one output connector and at least one input connector.`,
        connectorName: name,
      });
      continue;
    }
    relationships.push({ name, producer: producers[0], consumers });
  }

  return { relationships, diagnostics };
}

export function getFBDBlockArrayLabels(block: NormalizedFBDBlock): string[] {
  return block.arrays.map((array) => [array.name, array.operand].filter(Boolean).join(': '));
}
