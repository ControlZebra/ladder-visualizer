import {
  getFBDElementFooterLabels,
  wrapFBDText,
  type FBDElementLayout,
  type FBDRect,
  type FBDSheetLayout,
} from '../../layout';

export type FBDVersion = 'older' | 'newer';
export interface FBDDiffLabel extends FBDRect {
  text: string;
  version: FBDVersion;
  elementId?: string;
  anchorX: number;
  anchorY: number;
}
export interface FBDDiffArtwork {
  older?: FBDSheetLayout;
  newer?: FBDSheetLayout;
  labels: FBDDiffLabel[];
  bounds: FBDRect;
}

function title(layout: FBDElementLayout): string {
  const element = layout.element;
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
function elementLabels(
  layout: FBDElementLayout,
  version: FBDVersion,
  overlay: boolean
): FBDDiffLabel[] {
  const { bounds: b, element } = layout;
  const labels: FBDDiffLabel[] = [];
  const offset = overlay ? (version === 'older' ? -5 : 5) : 0;
  const add = (
    text: string,
    x: number,
    y: number,
    align: 'start' | 'middle' | 'end' = 'middle'
  ) => {
    if (!text) return;
    // Monospace text gives a deterministic collision box without browser measurement.
    const width = [...text].reduce(
      (sum, character) => sum + (character.codePointAt(0)! > 255 ? 10 : 5.6),
      8
    );
    const left = x - (align === 'middle' ? width / 2 : align === 'end' ? width : 0);
    labels.push({
      text,
      version,
      elementId: element.id,
      x: left,
      y: y - 5 + offset,
      width,
      height: 11,
      anchorX: x,
      anchorY: y,
    });
  };
  if (element.kind === 'text-box' || element.kind === 'placeholder') {
    wrapFBDText(title(layout), Math.max(140, b.width)).forEach((line, index) =>
      add(line, b.x + b.width / 2, b.y + 20 + index * (overlay ? 26 : 16))
    );
    if (element.kind === 'placeholder') {
      const bindings = (element.bindings ?? []).map(
        (binding) => `${binding.name ?? '(unnamed)'}: ${binding.argument ?? '(no value)'}`
      );
      bindings.forEach((text, index) =>
        add(text, b.x + b.width / 2, b.y + b.height + 16 + index * (overlay ? 22 : 12))
      );
      layout.ports.forEach((port) =>
        add(
          port.port.label,
          port.port.side === 'left' ? b.x + 12 : b.x + b.width - 12,
          port.point.y,
          port.port.side === 'left' ? 'start' : 'end'
        )
      );
    }
  } else if (element.kind === 'reference' || element.kind === 'connector') {
    add(title(layout), b.x + b.width / 2, b.y + b.height / 2);
  } else {
    add(title(layout), b.x + b.width / 2, b.y + 13);
    const subtitle =
      'operand' in element
        ? element.operand
        : element.kind === 'routine-control'
          ? element.routine
          : undefined;
    if (subtitle) add(subtitle, b.x + b.width / 2, b.y + 37);
    const footer = getFBDElementFooterLabels(element);
    footer.forEach((text, index) =>
      add(text, b.x + b.width / 2, b.y + b.height - (footer.length - index) * 24 + 12)
    );
    layout.ports.forEach((port) =>
      add(
        port.port.label,
        port.port.side === 'left' ? b.x + 12 : b.x + b.width - 12,
        port.point.y,
        port.port.side === 'left' ? 'start' : 'end'
      )
    );
  }
  return labels;
}
function overlaps(a: FBDRect, b: FBDRect): boolean {
  return (
    a.x < b.x + b.width + 1 &&
    a.x + a.width + 1 > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Keeps source geometry fixed; only text labels may move to avoid obscuring either version. */
export function buildFBDDiffArtwork(
  older?: FBDSheetLayout,
  newer?: FBDSheetLayout
): FBDDiffArtwork {
  const overlay = Boolean(older && newer);
  const candidates = [
    ...(older?.elements.flatMap((element) => elementLabels(element, 'older', overlay)) ?? []),
    ...(newer?.elements.flatMap((element) => elementLabels(element, 'newer', overlay)) ?? []),
  ].sort((a, b) => a.y - b.y || a.x - b.x || a.version.localeCompare(b.version));
  const labels: FBDDiffLabel[] = [];
  for (const label of candidates) {
    let collision: FBDDiffLabel | undefined;
    // Each collision moves downward past an already placed label, so this always terminates.
    while ((collision = labels.find((placed) => overlaps(label, placed))))
      label.y = collision.y + collision.height;
    labels.push(label);
  }
  const rectangles = [older?.bounds, newer?.bounds, ...labels].filter((rect): rect is FBDRect =>
    Boolean(rect)
  );
  const left = Math.min(0, ...rectangles.map((rect) => rect.x)) - 16;
  const top = Math.min(0, ...rectangles.map((rect) => rect.y)) - 16;
  const right = Math.max(320, ...rectangles.map((rect) => rect.x + rect.width)) + 16;
  const bottom = Math.max(160, ...rectangles.map((rect) => rect.y + rect.height)) + 16;
  return {
    older,
    newer,
    labels,
    bounds: { x: left, y: top, width: right - left, height: bottom - top },
  };
}
