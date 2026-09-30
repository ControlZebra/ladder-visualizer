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
function ArtworkNode({ data }: NodeProps<FBDDiffCanvasNode>) {
  const { artwork, theme } = data;
  const { bounds: b } = artwork;
  const color = (tone: FBDTone, neutral: string) =>
    tone === 'neutral'
      ? neutral
      : tone === 'older'
        ? theme.diffOldTextColor
        : theme.diffNewTextColor;
  return (
    <svg
      className="fbd-diff-artwork"
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
          fill="none"
          stroke={color(tone, theme.boxBorderColor)}
          strokeWidth={1.5}
        />
      ))}
      {artwork.labels.map((label, index) => {
        const labelColor = color(label.tone, theme.boxTextColor);
        const moved = Math.abs(label.y + 5 - label.anchorY) > 14;
        return (
          <g
            key={index}
            className="fbd-diff-label"
            data-tone={label.tone}
            data-element-id={label.elementId}
          >
            {moved && (
              <path
                d={`M ${label.anchorX} ${label.anchorY} L ${label.x + label.width / 2} ${label.y + 5}`}
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
              fill={theme.bgPrimary}
            />
            <text
              x={label.x + 4}
              y={label.y + 8}
              fill={labelColor}
              fontSize={9}
              fontFamily="monospace"
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
