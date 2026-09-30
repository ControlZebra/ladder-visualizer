import { memo } from 'react';
import type { Node, NodeProps } from '@xyflow/react';
import type { FBDElementLayout, FBDSheetLayout } from '../../layout';
import type { LadderDiagramTheme } from '../../types';
import type { FBDDiffArtwork as Artwork, FBDVersion } from './fbdDiffLayout';

export type FBDDiffCanvasNode = Node<
  { artwork: Artwork; theme: Required<LadderDiagramTheme> },
  'fbdComparison'
>;

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
function Geometry({
  layout,
  version,
  color,
  offset,
}: {
  layout: FBDSheetLayout;
  version: FBDVersion;
  color: string;
  offset: number;
}) {
  return (
    <g
      className={`fbd-diff-layer fbd-diff-${version}`}
      data-version={version}
      stroke={color}
      fill="none"
      strokeWidth={1.5}
      transform={`translate(${offset} ${offset})`}
    >
      {layout.connections.map((connection, index) => (
        <path
          key={`wire-${index}`}
          d={connection.path}
          className={`fbd-diff-wire fbd-diff-${connection.connection.kind}`}
        />
      ))}
      {layout.attachments.map((attachment, index) => (
        <path
          key={`attachment-${index}`}
          d={attachment.path}
          className="fbd-diff-attachment"
          strokeDasharray="3 3"
        />
      ))}
      {layout.elements.map((element, index) => (
        <g
          key={index}
          className={`fbd-diff-element fbd-diff-element-${element.element.kind}`}
          data-element-id={element.element.id}
          data-source-x={element.element.position?.x}
          data-source-y={element.element.position?.y}
        >
          <title>{`${version === 'older' ? 'Older' : 'Newer'} ${element.element.kind} ${element.element.id ?? '(no ID)'}`}</title>
          {outline(element)}
          {element.ports.map((port, i) => (
            <circle key={i} cx={port.point.x} cy={port.point.y} r={2.5} />
          ))}
        </g>
      ))}
    </g>
  );
}
function ArtworkNode({ data }: NodeProps<FBDDiffCanvasNode>) {
  const { artwork, theme } = data;
  const { bounds: b } = artwork;
  const overlay = Boolean(artwork.older && artwork.newer);
  return (
    <svg
      className="fbd-diff-artwork"
      width={b.width}
      height={b.height}
      viewBox={`${b.x} ${b.y} ${b.width} ${b.height}`}
      role="img"
      aria-label={overlay ? 'Older red and newer green FBD overlay' : 'FBD version'}
    >
      {artwork.older && (
        <Geometry
          layout={artwork.older}
          version="older"
          color={theme.diffRemovedBorderColor}
          offset={overlay ? -2 : 0}
        />
      )}
      {artwork.newer && (
        <Geometry
          layout={artwork.newer}
          version="newer"
          color={theme.diffAddedBorderColor}
          offset={overlay ? 2 : 0}
        />
      )}
      {artwork.labels.map((label, index) => {
        const color = label.version === 'older' ? theme.diffOldTextColor : theme.diffNewTextColor;
        const moved = Math.abs(label.y + 5 - label.anchorY) > 14;
        return (
          <g
            key={index}
            className="fbd-diff-label"
            data-version={label.version}
            data-element-id={label.elementId}
          >
            {moved && (
              <path
                d={`M ${label.anchorX} ${label.anchorY} L ${label.x + label.width / 2} ${label.y + 5}`}
                stroke={color}
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
            <text x={label.x + 4} y={label.y + 8} fill={color} fontSize={9} fontFamily="monospace">
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
