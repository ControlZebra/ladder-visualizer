import {
  getFBDElementFooterLabels,
  wrapFBDText,
  type FBDElementLayout,
  type FBDPortLayout,
} from '../../../layout';
import type { FBDLabelRole } from './appearance';

export interface FBDField {
  role: FBDLabelRole;
  key: string;
  text: string;
  x: number;
  y: number;
  align: 'start' | 'middle' | 'end';
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
export function getFBDFields(layout: FBDElementLayout): FBDField[] {
  const { bounds: b, element } = layout;
  const result: FBDField[] = [];
  const add = (
    key: string,
    text: string,
    x: number,
    y: number,
    align: FBDField['align'] = 'middle',
    role: FBDLabelRole = 'text'
  ) => {
    if (text) result.push({ key, text, x, y, align, role });
  };
  if (element.kind === 'placeholder') {
    add('title', element.sourceKind, b.x + b.width / 2, b.y + 16, 'middle', 'warning');
    add('id', `ID ${element.id ?? 'unknown'}`, b.x + b.width / 2, b.y + 32);
    add(
      'reason',
      element.reasonCodes.map((reason) => reason.replace(/-/g, ' ')).join(', ') ||
        'unsupported content',
      b.x + b.width / 2,
      b.y + 48,
      'middle',
      'footer'
    );
  } else if (element.kind === 'text-box') {
    wrapFBDText(title(layout), b.width).forEach((line, i) =>
      add(`text:${i}`, line, b.x + 12, b.y + 18 + i * 16, 'start')
    );
  } else {
    const terminal = element.kind === 'reference' || element.kind === 'connector';
    add(
      'title',
      title(layout),
      terminal ? b.x + b.width / 2 : b.x + 8,
      b.y + (terminal ? b.height / 2 : 13),
      terminal ? 'middle' : 'start',
      terminal ? 'terminal' : 'title'
    );
    const subtitle =
      'operand' in element && !terminal
        ? element.operand
        : element.kind === 'routine-control'
          ? element.routine
          : undefined;
    if (subtitle) add('subtitle', subtitle, b.x + 9, b.y + 39, 'start', 'subtitle');
  }
  const footer =
    element.kind === 'placeholder'
      ? (element.bindings ?? []).map(
          (binding) => `${binding.name ?? '(unnamed)'}: ${binding.argument ?? '(no value)'}`
        )
      : getFBDElementFooterLabels(element);
  footer.forEach((text, i) => {
    const y = b.y + b.height - (footer.length - i) * 18 + 5;
    if (element.kind === 'placeholder') {
      add(`footer:${i}`, text, b.x + b.width / 2, y, 'middle', 'footer');
    } else {
      const separator = text.indexOf(': ');
      add(
        `footer:${i}:name`,
        separator < 0 ? text : text.slice(0, separator),
        b.x + 8,
        y,
        'start',
        'footer'
      );
      add(
        `footer:${i}:value`,
        separator < 0 ? '?' : text.slice(separator + 2),
        b.x + b.width - 8,
        y,
        'end',
        'value'
      );
    }
  });
  if (element.kind !== 'reference' && element.kind !== 'connector') {
    layout.ports.forEach((port) =>
      add(
        portKey(port),
        port.port.label,
        port.port.side === 'left' ? b.x + 10 : b.x + b.width - 10,
        port.point.y,
        port.port.side === 'left' ? 'start' : 'end',
        'port'
      )
    );
  }
  return result;
}
export function portKey(port: FBDPortLayout): string {
  return `${port.port.direction}:${port.port.id}`;
}
