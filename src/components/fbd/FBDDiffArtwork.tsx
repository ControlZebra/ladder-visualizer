import {
  FBD_FONT_FAMILY,
  fbdNodeBackground,
  FBDFrameSurface,
  FBDFrameOutline,
  FBDPortPin,
  FBDFieldLabel,
  fbdFieldColor,
} from './elements';
import { memo } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
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
    node: fbdNodeBackground(theme),
    box: theme.boxBgColor,
    header: theme.rungNumberBg,
    canvas: theme.bgPrimary,
  };
  const renderWire = ({ value, tone }: Artwork['paths'][number], index: number) => (
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
  );
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
      {artwork.paths.filter((part) => part.tone === 'neutral').map(renderWire)}
      {/* Backgrounds cover neutral wires; changed routes and all outlines remain above fills. */}
      {artwork.outlines.map(({ value, tone }, index) => (
        <g
          key={`surface-${index}`}
          className="fbd-diff-element-surface"
          transform={strokeOffset(tone)}
        >
          <FBDFrameSurface layout={value} theme={theme} />
        </g>
      ))}
      {artwork.paths.filter((part) => part.tone !== 'neutral').map(renderWire)}
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
          <FBDFrameOutline
            layout={value}
            theme={theme}
            color={tone === 'neutral' ? undefined : color(tone, theme.boxBorderColor)}
          />
        </g>
      ))}
      {artwork.pins.map(({ value, tone }, index) => (
        <g
          key={`pin-${index}`}
          className="fbd-diff-pin"
          data-tone={tone}
          transform={strokeOffset(tone)}
        >
          <FBDPortPin port={value} theme={theme} color={color(tone, theme.boxBorderColor)} />
        </g>
      ))}
      {artwork.labels.map((label, index) => {
        const field = {
          key: '',
          role: label.role,
          text: label.text,
          x: label.x + 4,
          y: label.y + label.height / 2,
          align: 'start' as const,
        };
        const labelColor = color(label.tone, fbdFieldColor(field, theme));
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
            <FBDFieldLabel field={field} theme={theme} color={labelColor} />
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
