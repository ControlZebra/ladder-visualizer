import { FBD_FONT_FAMILY, FBD_LABEL_STYLES } from './fbdAppearance';
import { memo } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import type { FBDElementLayout } from '../../layout';
import type { LadderDiagramTheme } from '../../types';
import type { FBDDiffArtwork as Artwork, FBDTone } from './fbdDiffLayout';

export type FBDDiffCanvasNode = Node<
  { artwork: Artwork; theme: Required<LadderDiagramTheme> },
  'fbdComparison'
>;

// Separate coincident colored strokes without changing source coordinates or neutral context.
function strokeOffset(tone: FBDTone) {
  return tone === 'neutral' ? undefined : `translate(${tone === 'older' ? '-1 -1' : '1 1'})`;
}

function outline(layout: FBDElementLayout) {
  const { bounds: b, element } = layout;
  if (element.kind === 'reference') {
    return element.referenceType === 'input' ? (
      <path
        d={`M ${b.x} ${b.y} H ${b.x + b.width - 10} L ${b.x + b.width} ${b.y + b.height / 2} L ${b.x + b.width - 10} ${b.y + b.height} H ${b.x} Z`}
      />
    ) : (
      <path
        d={`M ${b.x + 10} ${b.y} H ${b.x + b.width} V ${b.y + b.height} H ${b.x + 10} L ${b.x} ${b.y + b.height / 2} Z`}
      />
    );
  }
  return (
    <rect
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
function isInstruction(layout: FBDElementLayout) {
  return ['block', 'function', 'add-on-instruction', 'routine-control'].includes(
    layout.element.kind
  );
}

function ArtworkNode({ data }: NodeProps<FBDDiffCanvasNode>) {
  const { artwork, theme } = data;
  const { bounds: b } = artwork;
  const color = (tone: FBDTone, neutral: string) =>
    tone === 'neutral'
      ? neutral
      : tone === 'older'
        ? theme.diffOldTextColor
        : theme.diffNewTextColor;
  const surfaces = {
    node: 'var(--fbd-node-background)',
    box: theme.boxBgColor,
    header: theme.rungNumberBg,
    canvas: theme.bgPrimary,
  };
  return (
    <svg
      className="fbd-diff-artwork"
      style={{ fontFamily: FBD_FONT_FAMILY }}
      width={b.width}
      height={b.height}
      viewBox={`${b.x} ${b.y} ${b.width} ${b.height}`}
      role="img"
      aria-label="FBD revision comparison"
    >
      {artwork.paths.map(({ value, tone }, index) => (
        <path
          key={`path-${index}`}
          className={`fbd-diff-wire fbd-diff-${value.kind}`}
          data-tone={tone}
          d={value.path}
          transform={strokeOffset(tone)}
          fill="none"
          stroke={color(tone, theme.wireColor)}
          strokeWidth={1.5}
          strokeDasharray={value.kind === 'attachment' ? '3 3' : undefined}
        />
      ))}
      {/* Paint all surfaces before outlines so newer fills cannot hide older strokes. */}
      {artwork.outlines.map(({ value, tone }, index) => (
        <g
          key={`surface-${index}`}
          className="fbd-diff-element-surface"
          transform={strokeOffset(tone)}
          stroke="none"
          fill={
            value.element.kind === 'text-box' || value.element.kind === 'placeholder'
              ? surfaces.box
              : surfaces.node
          }
        >
          {outline(value)}
          {isInstruction(value) && (
            <rect
              x={value.bounds.x}
              y={value.bounds.y}
              width={value.bounds.width}
              height={26}
              rx={3}
              fill={surfaces.header}
            />
          )}
        </g>
      ))}
      {artwork.outlines.map(({ value, tone }, index) => (
        <g
          key={`outline-${index}`}
          className={`fbd-diff-element fbd-diff-element-${value.element.kind}`}
          data-tone={tone}
          data-element-id={value.element.id}
          data-source-x={value.element.position?.x}
          data-source-y={value.element.position?.y}
          transform={strokeOffset(tone)}
          fill="none"
          stroke={color(tone, theme.boxBorderColor)}
          strokeWidth={1.5}
        >
          <title>{`${tone} ${value.element.kind} ${value.element.id ?? '(no ID)'}`}</title>
          {outline(value)}
          {isInstruction(value) && (
            <line
              x1={value.bounds.x}
              x2={value.bounds.x + value.bounds.width}
              y1={value.bounds.y + 26}
              y2={value.bounds.y + 26}
              strokeWidth={1}
            />
          )}
        </g>
      ))}
      {artwork.pins.map(({ value, tone }, index) => (
        <circle
          key={`pin-${index}`}
          className="fbd-diff-pin"
          data-tone={tone}
          data-port-id={value.port.id}
          transform={strokeOffset(tone)}
          cx={value.point.x}
          cy={value.point.y}
          r={2.5}
          fill={surfaces.node}
          stroke={color(tone, theme.boxBorderColor)}
          strokeWidth={1.5}
        />
      ))}
      {artwork.labels.map((label, index) => {
        const labelColor = color(
          label.tone,
          label.role === 'port' || label.role === 'footer' ? theme.addressColor : theme.boxTextColor
        );
        const typography = FBD_LABEL_STYLES[label.role];
        const centerY = label.y + label.height / 2;
        const moved = Math.abs(centerY - label.anchorY) > 14;
        return (
          <g
            key={index}
            className="fbd-diff-label"
            data-tone={label.tone}
            data-role={label.role}
            data-element-id={label.elementId}
          >
            {moved && (
              <path
                d={`M ${label.anchorX} ${label.anchorY} L ${label.x + label.width / 2} ${centerY}`}
                stroke={labelColor}
                strokeWidth={0.6}
                fill="none"
              />
            )}
            <rect
              x={label.x}
              y={label.y}
              width={label.width}
              height={label.height}
              fill={surfaces[label.surface]}
            />
            <text
              x={label.x + 4}
              y={centerY}
              dominantBaseline="central"
              fill={labelColor}
              fontSize={typography.fontSize}
              fontWeight={typography.fontWeight}
            >
              {label.text}
            </text>
          </g>
        );
      })}
      {!artwork.labels.length && (
        <text x={b.x + 24} y={b.y + 42} fill={theme.addressColor} fontSize={13}>
          Empty sheet
        </text>
      )}
    </svg>
  );
}
export const FBDDiffArtworkNode = memo(ArtworkNode);
