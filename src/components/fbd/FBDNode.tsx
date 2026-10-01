import { memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { FBDElementLayout } from '../../layout';
import { FBDElement, FBD_FONT_FAMILY } from './elements';
import type { LadderDiagramTheme, NormalizedFBDElement } from '../../types';

export type FBDFlowNodeData = {
  layout: FBDElementLayout;
  theme: Required<LadderDiagramTheme>;
};

export type FBDFlowNode = Node<FBDFlowNodeData, 'fbdElement'>;

export type FBDAttachmentSide = 'left' | 'right' | 'top' | 'bottom';

function elementId(element: NormalizedFBDElement): string | undefined {
  return 'id' in element ? element.id : undefined;
}

function portHandleId(direction: 'input' | 'output', id: string): string {
  return `${direction}:${id}`;
}

function attachmentHandleId(role: 'source' | 'target', side: FBDAttachmentSide): string {
  return `attachment-${role}-${side}`;
}

const attachmentPositions: Record<FBDAttachmentSide, Position> = {
  left: Position.Left,
  right: Position.Right,
  top: Position.Top,
  bottom: Position.Bottom,
};

function AttachmentHandles() {
  return (
    <>
      {(Object.keys(attachmentPositions) as FBDAttachmentSide[]).flatMap((side) =>
        (['source', 'target'] as const).map((role) => (
          <Handle
            key={`${role}-${side}`}
            id={attachmentHandleId(role, side)}
            type={role}
            position={attachmentPositions[side]}
            isConnectable={false}
            className="fbd-attachment-handle"
            style={{ visibility: 'hidden', width: 1, height: 1 }}
          />
        ))
      )}
    </>
  );
}

function PortHandles({ layout }: { layout: FBDElementLayout }) {
  return (
    <>
      {layout.ports.map((port, index) => (
        <Handle
          key={`${port.port.direction}-${port.port.id}-${index}`}
          id={portHandleId(port.port.direction, port.port.id)}
          type={port.port.direction === 'output' ? 'source' : 'target'}
          position={port.port.side === 'left' ? Position.Left : Position.Right}
          isConnectable={false}
          className="fbd-port-handle"
          style={{ top: port.point.y - layout.bounds.y, width: 1, height: 1, opacity: 0 }}
        />
      ))}
    </>
  );
}

function FBDNodeComponent({ data }: NodeProps<FBDFlowNode>) {
  const { layout, theme } = data;
  const { element } = layout;
  return (
    <div
      className={`fbd-element fbd-element-${element.kind}`}
      style={{
        width: layout.bounds.width,
        height: layout.bounds.height,
        color: theme.boxTextColor,
      }}
      data-element-id={elementId(element)}
      data-element-kind={element.kind}
      data-terminal-type={
        element.kind === 'reference'
          ? element.referenceType
          : element.kind === 'connector'
            ? element.connectorType
            : undefined
      }
    >
      <AttachmentHandles />
      <PortHandles layout={layout} />
      <svg
        className="fbd-element-artwork"
        width={layout.bounds.width}
        height={layout.bounds.height}
        viewBox={`${layout.bounds.x} ${layout.bounds.y} ${layout.bounds.width} ${layout.bounds.height}`}
        style={{ fontFamily: FBD_FONT_FAMILY }}
      >
        <FBDElement layout={layout} theme={theme} />
      </svg>
    </div>
  );
}

export const FBDNode = memo(FBDNodeComponent);

export { attachmentHandleId, portHandleId };
