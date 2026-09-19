import { memo, type CSSProperties, type ReactNode } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import {
  FBD_TEXT_LINE_HEIGHT,
  getFBDElementFooterLabels,
  wrapFBDText,
  type FBDElementLayout,
} from '../../layout';
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

function terminalLabel(element: NormalizedFBDElement): string {
  if (element.kind === 'reference') {
    return element.operand ?? (element.referenceType === 'input' ? 'Input' : 'Output');
  }
  if (element.kind === 'connector') return element.name ?? 'Connector';
  return '';
}

function terminalEmitsValue(element: NormalizedFBDElement): boolean {
  return element.kind === 'reference'
    ? element.referenceType === 'input'
    : element.kind === 'connector' && element.connectorType === 'input';
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
      {(Object.keys(attachmentPositions) as FBDAttachmentSide[]).flatMap((side) => (
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
      ))}
    </>
  );
}

function PortHandles({ layout, theme, showLabels = true }: {
  layout: FBDElementLayout;
  theme: Required<LadderDiagramTheme>;
  showLabels?: boolean;
}) {
  return (
    <>
      {layout.ports.map((port, index) => {
        const side = port.port.side === 'left' ? Position.Left : Position.Right;
        const top = port.point.y - layout.bounds.y;
        const labelStyle: CSSProperties = {
          color: theme.boxTextColor,
          top,
          [port.port.side === 'left' ? 'left' : 'right']: 10,
          transform: 'translateY(-50%)',
        };
        return (
          <div
            key={`${port.port.side}-${port.port.id}-${index}`}
            className={`fbd-port-label-wrap fbd-port-${port.port.direction}`}
            data-port-id={port.port.id}
            data-port-direction={port.port.direction}
          >
            <Handle
              id={portHandleId(port.port.direction, port.port.id)}
              type={port.port.direction === 'output' ? 'source' : 'target'}
              position={side}
              isConnectable={false}
              className="fbd-port-handle"
              style={{
                top,
                width: 1,
                height: 1,
                opacity: 0,
              }}
            />
            <span
              aria-hidden="true"
              className={`fbd-port-pin fbd-port-pin-${port.port.side}`}
              style={{
                top,
                background: theme.boxBgColor,
                borderColor: theme.boxBorderColor,
              }}
            />
            {showLabels && (
              <span className="fbd-port-label" style={labelStyle}>
                {port.port.label}
              </span>
            )}
          </div>
        );
      })}
    </>
  );
}

function TerminalNode({ layout, theme }: FBDFlowNodeData) {
  const { element } = layout;
  if (element.kind !== 'reference' && element.kind !== 'connector') return null;
  const emitsValue = terminalEmitsValue(element);
  const kindClass = element.kind === 'reference'
    ? `fbd-reference-shape fbd-reference-${emitsValue ? 'source' : 'target'}`
    : `fbd-connector-shape fbd-connector-${emitsValue ? 'source' : 'target'}`;

  return (
    <div className={`fbd-terminal-shape ${kindClass}`}>
      <span className="fbd-terminal-label">{terminalLabel(element)}</span>
      <PortHandles layout={layout} theme={theme} showLabels={false} />
    </div>
  );
}

interface InstructionFrameProps {
  layout: FBDElementLayout;
  theme: Required<LadderDiagramTheme>;
  title: string;
  subtitle?: string;
  footerLines?: string[];
}

function InstructionFrame({ layout, theme, title, subtitle, footerLines = [] }: InstructionFrameProps) {
  return (
    <div className="fbd-instruction-frame" style={{ borderColor: theme.boxBorderColor }}>
      <div
        className="fbd-instruction-header"
        style={{
          background: theme.rungNumberBg,
          borderColor: theme.boxBorderColor,
        }}
      >
        <strong className="fbd-instruction-title">{title}</strong>
        <span className="fbd-instruction-menu" aria-hidden="true">•••</span>
      </div>
      {subtitle && (
        <span className="fbd-instruction-subtitle" style={{ color: theme.boxTextColor }}>
          {subtitle}
        </span>
      )}
      {footerLines.length > 0 && (
        <div className="fbd-instruction-footer" style={{ color: theme.addressColor }}>
          {footerLines.map((line, index) => {
            const [label, ...valueParts] = line.split(': ');
            const value = valueParts.join(': ');
            return (
              <span className="fbd-binding" key={`${line}-${index}`}>
                <span>{label}</span>
                {value ? (
                  <span className="fbd-binding-value">{value}</span>
                ) : (
                  <span className="fbd-instruction-help" aria-label="No source value">?</span>
                )}
              </span>
            );
          })}
        </div>
      )}
      <PortHandles layout={layout} theme={theme} />
    </div>
  );
}

function InstructionNode({ layout, theme }: FBDFlowNodeData): ReactNode {
  const { element } = layout;
  if (element.kind === 'block') {
    return (
      <InstructionFrame
        layout={layout}
        theme={theme}
        title={element.instruction ?? 'Block'}
        subtitle={element.operand}
        footerLines={getFBDElementFooterLabels(element)}
      />
    );
  }
  if (element.kind === 'function') {
    return <InstructionFrame layout={layout} theme={theme} title={element.instruction} />;
  }
  if (element.kind === 'add-on-instruction') {
    return (
      <InstructionFrame
        layout={layout}
        theme={theme}
        title={element.name ?? 'Add-On Instruction'}
        subtitle={element.operand}
        footerLines={getFBDElementFooterLabels(element)}
      />
    );
  }
  if (element.kind === 'routine-control') {
    return (
      <InstructionFrame
        layout={layout}
        theme={theme}
        title={element.operation}
        subtitle={element.routine}
        footerLines={getFBDElementFooterLabels(element)}
      />
    );
  }
  return null;
}

function TextBoxNode({ layout, theme }: FBDFlowNodeData) {
  if (layout.element.kind !== 'text-box') return null;
  const lines = wrapFBDText(layout.element.text, layout.bounds.width);
  return (
    <div className="fbd-text-box" style={{ borderColor: theme.boxBorderColor }}>
      {lines.map((line, index) => (
        <span
          key={`${line}-${index}`}
          className="fbd-text-line"
          style={{ minHeight: FBD_TEXT_LINE_HEIGHT }}
        >
          {line || '\u00a0'}
        </span>
      ))}
    </div>
  );
}

function placeholderReason(element: Extract<NormalizedFBDElement, { kind: 'placeholder' }>): string {
  return element.reasonCodes.map((reason) => reason.replace(/-/g, ' ')).join(', ')
    || 'unsupported content';
}

function PlaceholderNode({ layout, theme }: FBDFlowNodeData) {
  if (layout.element.kind !== 'placeholder') return null;
  return (
    <div className="fbd-placeholder" style={{ borderColor: theme.contactNCColor }}>
      <strong style={{ color: theme.contactNCColor }}>{layout.element.sourceKind}</strong>
      <span>{`ID ${layout.element.id ?? 'unknown'}`}</span>
      <small style={{ color: theme.addressColor }}>{placeholderReason(layout.element)}</small>
      <PortHandles layout={layout} theme={theme} />
    </div>
  );
}

function FBDNodeComponent({ data }: NodeProps<FBDFlowNode>) {
  const { layout, theme } = data;
  const { element } = layout;
  let content: ReactNode;
  switch (element.kind) {
    case 'reference':
    case 'connector':
      content = <TerminalNode layout={layout} theme={theme} />;
      break;
    case 'block':
    case 'function':
    case 'add-on-instruction':
    case 'routine-control':
      content = <InstructionNode layout={layout} theme={theme} />;
      break;
    case 'text-box':
      content = <TextBoxNode layout={layout} theme={theme} />;
      break;
    case 'placeholder':
      content = <PlaceholderNode layout={layout} theme={theme} />;
      break;
  }

  return (
    <div
      className={`fbd-element fbd-element-${element.kind}`}
      style={{
        width: layout.bounds.width,
        height: layout.bounds.height,
        color: theme.boxTextColor,
        background: theme.boxBgColor,
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
      {content}
    </div>
  );
}

export const FBDNode = memo(FBDNodeComponent);

export { attachmentHandleId, portHandleId };
