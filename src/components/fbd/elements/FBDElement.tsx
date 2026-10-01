import { useId } from 'react';
import type { FBDElementLayout, FBDPortLayout } from '../../../layout';
import type { LadderDiagramTheme, NormalizedFBDElement } from '../../../types';
import { FBD_FONT_FAMILY, FBD_LABEL_STYLES, fbdNodeBackground, measureFBDText } from './appearance';
import { getFBDFields, type FBDField } from './fields';

type Theme = Required<LadderDiagramTheme>;

export function fbdShapeKey(element: NormalizedFBDElement): string {
  return element.kind === 'reference' ? `reference-${element.referenceType}` : element.kind;
}
export function isFBDInstruction(element: NormalizedFBDElement): boolean {
  return ['block', 'function', 'add-on-instruction', 'routine-control'].includes(element.kind);
}
export function fbdElementBackground(element: NormalizedFBDElement, theme: Theme): string {
  return element.kind === 'text-box' || element.kind === 'placeholder'
    ? theme.boxBgColor
    : fbdNodeBackground(theme);
}
export function fbdFieldColor(field: FBDField, theme: Theme): string {
  return field.role === 'warning'
    ? theme.contactNCColor
    : field.role === 'port' || field.role === 'footer'
      ? theme.addressColor
      : theme.boxTextColor;
}

/** Single definition of IRef/ORef, ICon/OCon, instruction, and annotation silhouettes. */
function Shape({ layout }: { layout: FBDElementLayout }) {
  const { bounds: b, element } = layout;
  if (element.kind === 'reference') {
    const source = element.referenceType === 'input';
    return (
      <path
        className={`fbd-reference-shape fbd-reference-${source ? 'source' : 'target'}`}
        d={
          source
            ? `M ${b.x} ${b.y} H ${b.x + b.width - 12} L ${b.x + b.width} ${b.y + b.height / 2} L ${b.x + b.width - 12} ${b.y + b.height} H ${b.x} Z`
            : `M ${b.x + 12} ${b.y} H ${b.x + b.width} V ${b.y + b.height} H ${b.x + 12} L ${b.x} ${b.y + b.height / 2} Z`
        }
      />
    );
  }
  return (
    <rect
      className={
        element.kind === 'connector'
          ? `fbd-connector-shape fbd-connector-${element.connectorType === 'input' ? 'source' : 'target'}`
          : undefined
      }
      x={b.x}
      y={b.y}
      width={b.width}
      height={b.height}
      rx={element.kind === 'connector' ? b.height / 2 : 3}
      strokeDasharray={
        element.kind === 'placeholder' || element.kind === 'text-box' ? '4 3' : undefined
      }
    />
  );
}

/** Separate surface/outline primitives let overlays retain both coincident revision strokes. */
export function FBDFrameSurface({ layout, theme }: { layout: FBDElementLayout; theme: Theme }) {
  const b = layout.bounds;
  return (
    <g fill={fbdElementBackground(layout.element, theme)} stroke="none">
      <Shape layout={layout} />
      {isFBDInstruction(layout.element) && (
        <rect x={b.x} y={b.y} width={b.width} height={26} rx={3} fill={theme.rungNumberBg} />
      )}
    </g>
  );
}
export function FBDFrameOutline({
  layout,
  theme,
  color,
}: {
  layout: FBDElementLayout;
  theme: Theme;
  color?: string;
}) {
  const b = layout.bounds;
  const stroke =
    color ?? (layout.element.kind === 'placeholder' ? theme.contactNCColor : theme.boxBorderColor);
  return (
    <g fill="none" stroke={stroke} strokeWidth={1.5}>
      <Shape layout={layout} />
      {isFBDInstruction(layout.element) && (
        <>
          <line x1={b.x} x2={b.x + b.width} y1={b.y + 26} y2={b.y + 26} strokeWidth={1} />
          <rect
            x={b.x + b.width - 29}
            y={b.y + 6}
            width={22}
            height={11}
            rx={5}
            fill={theme.bgPrimary}
            strokeWidth={0.6}
          />
          <text
            x={b.x + b.width - 18}
            y={b.y + 12}
            dominantBaseline="central"
            textAnchor="middle"
            fontFamily={FBD_FONT_FAMILY}
            fontSize={7}
            letterSpacing={1}
            fill={stroke}
            stroke="none"
            aria-hidden="true"
          >
            •••
          </text>
        </>
      )}
    </g>
  );
}
export function FBDPortPin({
  port,
  theme,
  color,
  background,
}: {
  port: FBDPortLayout;
  theme: Theme;
  color?: string;
  background?: string;
}) {
  const left = port.port.side === 'left';
  const stroke = color ?? theme.boxBorderColor;
  const x = port.point.x + (left ? -9 : -1);
  return (
    <g
      className={`fbd-port-pin fbd-port-pin-${left ? 'left' : 'right'}`}
      data-port-id={port.port.id}
      data-port-direction={port.port.direction}
    >
      <rect
        x={x}
        y={port.point.y - 6}
        width={10}
        height={12}
        rx={5}
        fill={background ?? fbdNodeBackground(theme)}
        stroke={stroke}
        strokeWidth={1.5}
      />
      <rect x={x + 3.5} y={port.point.y - 1.5} width={3} height={3} fill={stroke} />
    </g>
  );
}

const labelClasses = {
  title: 'fbd-instruction-title',
  subtitle: 'fbd-instruction-subtitle',
  terminal: 'fbd-terminal-label',
  port: 'fbd-port-label',
  footer: 'fbd-binding-label',
  value: 'fbd-binding-value',
  text: 'fbd-text-line',
  warning: 'fbd-placeholder-title',
};
export function FBDFieldLabel({
  field,
  theme,
  color,
  maxWidth,
}: {
  field: FBDField;
  theme: Theme;
  color?: string;
  maxWidth?: number;
}) {
  let text = field.text;
  if (maxWidth !== undefined && measureFBDText(text, field.role) > maxWidth) {
    while (text && measureFBDText(`${text}…`, field.role) > maxWidth)
      text = [...text].slice(0, -1).join('');
    text += '…';
  }
  return (
    <text
      className={labelClasses[field.role]}
      data-field-key={field.key}
      aria-label={field.text}
      x={field.x}
      y={field.y}
      dominantBaseline="central"
      textAnchor={field.align}
      fontFamily={FBD_FONT_FAMILY}
      {...FBD_LABEL_STYLES[field.role]}
      fill={color ?? fbdFieldColor(field, theme)}
    >
      {text}
    </text>
  );
}

/** Complete regular element; comparisons compose these same primitives with per-part colors. */
export function FBDElement({ layout, theme }: { layout: FBDElementLayout; theme: Theme }) {
  const clipId = useId();
  const b = layout.bounds;
  return (
    <g
      className={
        layout.element.kind === 'reference' || layout.element.kind === 'connector'
          ? 'fbd-terminal-node'
          : undefined
      }
    >
      <defs>
        <clipPath id={clipId}>
          <rect
            x={b.x + 4}
            y={b.y + 2}
            width={Math.max(0, b.width - 8)}
            height={Math.max(0, b.height - 4)}
          />
        </clipPath>
      </defs>
      {layout.ports.map((port, i) => (
        <FBDPortPin
          key={i}
          port={port}
          theme={theme}
          background={fbdElementBackground(layout.element, theme)}
        />
      ))}
      <FBDFrameSurface layout={layout} theme={theme} />
      <FBDFrameOutline layout={layout} theme={theme} />
      <g clipPath={`url(#${clipId})`}>
        {getFBDFields(layout).map((field) => (
          <FBDFieldLabel
            key={field.key}
            field={field}
            theme={theme}
            maxWidth={
              field.role === 'title'
                ? b.width - 40
                : field.role === 'port'
                  ? b.width / 2 - 14
                  : b.width - 22
            }
          />
        ))}
      </g>
    </g>
  );
}
