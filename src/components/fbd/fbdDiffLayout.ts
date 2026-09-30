import { FBD_LABEL_STYLES, type FBDLabelRole } from './fbdAppearance';
import {
  getFBDElementFooterLabels,
  wrapFBDText,
  type FBDElementLayout,
  type FBDPortLayout,
  type FBDRect,
  type FBDSheetLayout,
} from '../../layout';
import type { FBDSheetDiff, FBDItemDiff } from '../../diff';

export type FBDVersion = 'older' | 'newer';
export type FBDTone = FBDVersion | 'neutral';
export interface DrawingPart<T> {
  value: T;
  tone: FBDTone;
}
interface Field {
  role: FBDLabelRole;
  key: string;
  text: string;
  x: number;
  y: number;
  align: 'start' | 'middle' | 'end';
}
export interface FBDDiffLabel extends FBDRect {
  role: FBDLabelRole;
  surface: 'node' | 'box' | 'header' | 'canvas';
  text: string;
  tone: FBDTone;
  elementId?: string;
  anchorX: number;
  anchorY: number;
}
export interface FBDDiffArtwork {
  outlines: DrawingPart<FBDElementLayout>[];
  pins: DrawingPart<FBDPortLayout>[];
  paths: DrawingPart<{ path: string; kind: string }>[];
  labels: FBDDiffLabel[];
  bounds: FBDRect;
}

function title({ element }: FBDElementLayout): string {
  switch (element.kind) {
    case 'reference':
      return element.operand ?? (element.referenceType === 'input' ? 'Input' : 'Output');
    case 'connector':
      return element.name ?? 'Connector';
    case 'block':
      return element.instruction ?? 'Block';
    case 'function':
      return element.instruction;
    case 'add-on-instruction':
      return element.name ?? 'Add-On Instruction';
    case 'routine-control':
      return element.operation;
    case 'placeholder':
      return `${element.sourceKind} · ${element.reasonCodes.join(', ')}`;
    case 'text-box':
      return element.text ?? '';
  }
}
function fields(layout: FBDElementLayout): Field[] {
  const { bounds: b, element } = layout;
  const result: Field[] = [];
  const add = (
    key: string,
    text: string,
    x: number,
    y: number,
    align: Field['align'] = 'middle',
    role: FBDLabelRole = 'text'
  ) => {
    if (text) result.push({ key, text, x, y, align, role });
  };
  if (element.kind === 'text-box' || element.kind === 'placeholder') {
    wrapFBDText(title(layout), Math.max(140, b.width)).forEach((line, i) =>
      add(`text:${i}`, line, b.x + b.width / 2, b.y + 20 + i * 16)
    );
  } else {
    const terminal = element.kind === 'reference' || element.kind === 'connector';
    add(
      'title',
      title(layout),
      b.x + b.width / 2,
      b.y + (terminal ? b.height / 2 : 13),
      'middle',
      terminal ? 'terminal' : 'title'
    );
    const subtitle =
      'operand' in element && !terminal
        ? element.operand
        : element.kind === 'routine-control'
          ? element.routine
          : undefined;
    if (subtitle) add('subtitle', subtitle, b.x + b.width / 2, b.y + 39, 'middle', 'subtitle');
  }
  const footer =
    element.kind === 'placeholder'
      ? (element.bindings ?? []).map(
          (binding) => `${binding.name ?? '(unnamed)'}: ${binding.argument ?? '(no value)'}`
        )
      : getFBDElementFooterLabels(element);
  footer.forEach((text, i) =>
    add(
      `footer:${i}`,
      text,
      b.x + b.width / 2,
      b.y + b.height - (footer.length - i) * 24 + 12,
      'middle',
      'footer'
    )
  );
  if (element.kind !== 'reference' && element.kind !== 'connector') {
    layout.ports.forEach((port) =>
      add(
        portKey(port),
        port.port.label,
        port.port.side === 'left' ? b.x + 12 : b.x + b.width - 12,
        port.point.y,
        port.port.side === 'left' ? 'start' : 'end',
        'port'
      )
    );
  }
  return result;
}
function portKey(port: FBDPortLayout): string {
  return `${port.port.direction}:${port.port.id}`;
}

/** Unique matching parts draw once. Duplicate keys remain separate rather than guessed. */
function compareParts<T>(
  older: T[],
  newer: T[],
  keyOf: (part: T) => string,
  equal: (a: T, b: T) => boolean,
  emit: (part: T, tone: FBDTone) => void
) {
  const oldKeys = older.map(keyOf),
    newKeys = newer.map(keyOf);
  const matched = new Set<number>();
  newer.forEach((part, i) => {
    const key = newKeys[i],
      oldIndex = oldKeys.indexOf(key);
    if (
      oldIndex >= 0 &&
      oldKeys.lastIndexOf(key) === oldIndex &&
      newKeys.indexOf(key) === newKeys.lastIndexOf(key)
    ) {
      matched.add(oldIndex);
      if (equal(older[oldIndex], part)) {
        emit(part, 'neutral');
        return;
      }
      emit(older[oldIndex], 'older');
    }
    emit(part, 'newer');
  });
  older.forEach((part, i) => {
    if (!matched.has(i)) emit(part, 'older');
  });
}

/** Build one set of drawing parts. A comparison makes unchanged parts neutral; a single side keeps its version color. */
export function buildFBDDiffArtwork(
  older?: FBDSheetLayout,
  newer?: FBDSheetLayout,
  comparison?: FBDSheetDiff
): FBDDiffArtwork {
  const outlines: FBDDiffArtwork['outlines'] = [],
    pins: FBDDiffArtwork['pins'] = [],
    paths: FBDDiffArtwork['paths'] = [];
  const labels: FBDDiffLabel[] = [];
  const labelLayouts = new Map<FBDDiffLabel, FBDElementLayout>();
  const addLabel = (field: Field, tone: FBDTone, layout: FBDElementLayout) => {
    const { fontSize } = FBD_LABEL_STYLES[field.role];
    const width = [...field.text].reduce(
      (sum, c) => sum + (c.codePointAt(0)! > 255 ? fontSize : fontSize * 0.7),
      8
    );
    const label: FBDDiffLabel = {
      role: field.role,
      surface: 'canvas',
      text: field.text,
      tone,
      elementId: layout.element.id,
      x: field.x - (field.align === 'middle' ? width / 2 : field.align === 'end' ? width : 0),
      y: field.y - (fontSize + 4) / 2,
      width,
      height: fontSize + 4,
      anchorX: field.x,
      anchorY: field.y,
    };
    labels.push(label);
    labelLayouts.set(label, layout);
  };
  const addElement = (layout: FBDElementLayout, tone: FBDTone) => {
    outlines.push({ value: layout, tone });
    layout.ports.forEach((value) => pins.push({ value, tone }));
    fields(layout).forEach((field) => addLabel(field, tone, layout));
  };
  if (comparison) {
    const oldLayouts = new Map(older?.elements.map((layout) => [layout.element, layout]));
    const newLayouts = new Map(newer?.elements.map((layout) => [layout.element, layout]));
    comparison.elements.forEach((pair) => {
      const old = pair.oldValue && oldLayouts.get(pair.oldValue),
        next = pair.newValue && newLayouts.get(pair.newValue);
      const moved = pair.propertyChanges.some(
        (change) => change.property === 'position' || change.property.startsWith('position.')
      );
      if (!old || !next || moved || old.element.kind !== next.element.kind) {
        if (old) addElement(old, 'older');
        if (next) addElement(next, 'newer');
        return;
      }
      // Automatic text measurement is not a source geometry edit. Use the current frame.
      if (pair.propertyChanges.some((change) => change.property === 'width')) {
        outlines.push({ value: old, tone: 'older' }, { value: next, tone: 'newer' });
      } else outlines.push({ value: next, tone: 'neutral' });
      compareParts(
        old.ports,
        next.ports,
        portKey,
        (a, b) =>
          a.port.side === b.port.side &&
          a.port.order === b.port.order &&
          a.port.visible === b.port.visible,
        (value, tone) => pins.push({ value, tone })
      );
      compareParts(
        fields(old),
        fields(next),
        (field) => field.key,
        (a, b) => a.text === b.text,
        (field, tone) => addLabel(field, tone, tone === 'older' ? old : next)
      );
    });
    const addPaths = <T>(
      pairs: FBDItemDiff<T>[],
      oldPaths: Map<T, { path: string; kind: string }>,
      newPaths: Map<T, { path: string; kind: string }>
    ) => {
      pairs.forEach((pair) => {
        const old = pair.oldValue && oldPaths.get(pair.oldValue),
          next = pair.newValue && newPaths.get(pair.newValue);
        if (old && next && pair.kind === 'unchanged' && old.path === next.path)
          paths.push({ value: next, tone: 'neutral' });
        else {
          if (old) paths.push({ value: old, tone: 'older' });
          if (next) paths.push({ value: next, tone: 'newer' });
        }
      });
    };
    addPaths(
      comparison.connections,
      new Map(
        older?.connections.map((wire) => [
          wire.connection,
          { path: wire.path, kind: wire.connection.kind },
        ])
      ),
      new Map(
        newer?.connections.map((wire) => [
          wire.connection,
          { path: wire.path, kind: wire.connection.kind },
        ])
      )
    );
    addPaths(
      comparison.attachments,
      new Map(
        older?.attachments.map((wire) => [wire.attachment, { path: wire.path, kind: 'attachment' }])
      ),
      new Map(
        newer?.attachments.map((wire) => [wire.attachment, { path: wire.path, kind: 'attachment' }])
      )
    );
  } else {
    const layout = older ?? newer;
    const tone = older ? 'older' : 'newer';
    layout?.elements.forEach((element) => addElement(element, tone));
    layout?.connections.forEach((wire) =>
      paths.push({ value: { path: wire.path, kind: wire.connection.kind }, tone })
    );
    layout?.attachments.forEach((wire) =>
      paths.push({ value: { path: wire.path, kind: 'attachment' }, tone })
    );
  }
  labels.sort((a, b) => a.y - b.y || a.x - b.x || a.tone.localeCompare(b.tone));
  const placed: FBDDiffLabel[] = [];
  for (const label of labels) {
    let collision: FBDDiffLabel | undefined;
    while (
      (collision = placed.find(
        (p) =>
          label.x < p.x + p.width + 1 &&
          label.x + label.width + 1 > p.x &&
          label.y < p.y + p.height &&
          label.y + label.height > p.y
      ))
    )
      label.y = collision.y + collision.height;
    const layout = labelLayouts.get(label)!;
    const b = layout.bounds;
    if (
      label.x >= b.x &&
      label.x + label.width <= b.x + b.width &&
      label.y >= b.y &&
      label.y + label.height <= b.y + b.height
    ) {
      label.surface =
        layout.element.kind === 'text-box' || layout.element.kind === 'placeholder'
          ? 'box'
          : label.role === 'title' && label.y + label.height <= b.y + 26
            ? 'header'
            : 'node';
    }
    placed.push(label);
  }
  const rectangles = [older?.bounds, newer?.bounds, ...labels].filter((r): r is FBDRect =>
    Boolean(r)
  );
  const x = Math.min(0, ...rectangles.map((r) => r.x)) - 16,
    y = Math.min(0, ...rectangles.map((r) => r.y)) - 16;
  const width = Math.max(320, ...rectangles.map((r) => r.x + r.width)) + 16 - x;
  const height = Math.max(160, ...rectangles.map((r) => r.y + r.height)) + 16 - y;
  return { outlines, pins, paths, labels, bounds: { x, y, width, height } };
}
