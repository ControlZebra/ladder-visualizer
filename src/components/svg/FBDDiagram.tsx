import { useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import {
  buildFBDConnectorIndex,
  buildFBDSheetLayout,
  FBD_BLOCK_HEADER_HEIGHT,
  FBD_TEXT_LINE_HEIGHT,
  getFBDElementFooterLabels,
  wrapFBDText,
  type FBDElementLayout,
  type FBDLayoutDiagnostic,
  type FBDPortLayout,
  type FBDSheetLayout,
} from '../../layout';
import type {
  LadderDiagramTheme,
  NormalizedFBDBody,
  NormalizedFBDDiagnostic,
  NormalizedFBDElement,
} from '../../types';
import { mergeTheme } from '../../types';

export type FBDDiagramDiagnostic = NormalizedFBDDiagnostic | FBDLayoutDiagnostic;

function portLabelX(layout: FBDElementLayout, port: FBDPortLayout): number {
  return port.port.side === 'left' ? layout.bounds.x + 10 : layout.bounds.x + layout.bounds.width - 10;
}

function renderPorts(layout: FBDElementLayout, color: string, showLabels = true): ReactNode {
  return (
    <g className="fbd-ports">
      {layout.ports.map((port, index) => (
        <g
          key={`${port.port.side}-${port.port.id}-${index}`}
          className={`fbd-port fbd-port-${port.port.direction}`}
          data-port-id={port.port.id}
          data-port-direction={port.port.direction}
        >
          <rect
            x={port.point.x - 3.5}
            y={port.point.y - 3.5}
            width="7"
            height="7"
            fill={color}
          />
          {showLabels && (
            <text
              x={portLabelX(layout, port)}
              y={port.point.y + 4}
              textAnchor={port.port.side === 'left' ? 'start' : 'end'}
              fontSize="10"
              fill={color}
            >
              {port.port.label}
            </text>
          )}
        </g>
      ))}
    </g>
  );
}

function referencePath(layout: FBDElementLayout, emitsValue: boolean): string {
  const { x, y, width, height } = layout.bounds;
  const point = 12;
  return emitsValue
    ? `M ${x} ${y} L ${x + width - point} ${y} L ${x + width} ${y + height / 2} L ${x + width - point} ${y + height} L ${x} ${y + height} Z`
    : `M ${x + point} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x + point} ${y + height} L ${x} ${y + height / 2} Z`;
}

function renderTerminal(
  layout: FBDElementLayout,
  theme: Required<LadderDiagramTheme>,
): ReactNode {
  const element = layout.element;
  if (element.kind !== 'reference' && element.kind !== 'connector') return null;
  const label = element.kind === 'reference'
    ? element.operand ?? (element.referenceType === 'input' ? 'Input' : 'Output')
    : element.name ?? 'Connector';
  const emitsValue = element.kind === 'reference'
    ? element.referenceType === 'input'
    : element.connectorType === 'input';
  const centerY = layout.bounds.y + layout.bounds.height / 2;

  return (
    <>
      {element.kind === 'reference' ? (
        <path
          className="fbd-terminal-shape fbd-reference-shape"
          d={referencePath(layout, emitsValue)}
          fill={theme.boxBgColor}
          stroke={theme.boxBorderColor}
        />
      ) : (
        <rect
          className="fbd-terminal-shape fbd-connector-shape"
          x={layout.bounds.x}
          y={layout.bounds.y}
          width={layout.bounds.width}
          height={layout.bounds.height}
          rx={layout.bounds.height / 2}
          fill={theme.boxBgColor}
          stroke={theme.boxBorderColor}
        />
      )}
      <text
        x={layout.bounds.x + layout.bounds.width / 2}
        y={centerY + 4}
        textAnchor="middle"
        fontSize="11"
        fill={theme.boxTextColor}
      >
        {label}
      </text>
      {renderPorts(layout, theme.boxTextColor, false)}
    </>
  );
}

interface InstructionFrameOptions {
  title: string;
  subtitle?: string;
  footerLines?: string[];
}

function renderInstructionFrame(
  layout: FBDElementLayout,
  theme: Required<LadderDiagramTheme>,
  { title, subtitle, footerLines = [] }: InstructionFrameOptions,
): ReactNode {
  const footerStartY = layout.bounds.y + layout.bounds.height - footerLines.length * 18;

  return (
    <>
      <rect
        x={layout.bounds.x}
        y={layout.bounds.y}
        width={layout.bounds.width}
        height={layout.bounds.height}
        rx="3"
        fill={theme.boxBgColor}
        stroke={theme.boxBorderColor}
        strokeWidth="1.5"
      />
      <rect
        x={layout.bounds.x + 0.75}
        y={layout.bounds.y + 0.75}
        width={layout.bounds.width - 1.5}
        height={FBD_BLOCK_HEADER_HEIGHT - 0.75}
        rx="2"
        fill={theme.rungNumberBg}
      />
      <line
        x1={layout.bounds.x}
        y1={layout.bounds.y + FBD_BLOCK_HEADER_HEIGHT}
        x2={layout.bounds.x + layout.bounds.width}
        y2={layout.bounds.y + FBD_BLOCK_HEADER_HEIGHT}
        stroke={theme.boxBorderColor}
      />
      <text
        x={layout.bounds.x + layout.bounds.width / 2}
        y={layout.bounds.y + (subtitle ? 16 : 26)}
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
        fill={theme.boxTextColor}
      >
        {title}
      </text>
      {subtitle && (
        <text
          x={layout.bounds.x + layout.bounds.width / 2}
          y={layout.bounds.y + 33}
          textAnchor="middle"
          fontSize="10"
          fill={theme.addressColor}
        >
          {subtitle}
        </text>
      )}
      {footerLines.map((line, index) => (
        <text
          key={`${line}-${index}`}
          x={layout.bounds.x + layout.bounds.width / 2}
          y={footerStartY + index * 18 + 13}
          textAnchor="middle"
          fontSize="9"
          fill={theme.addressColor}
          className="fbd-binding"
        >
          {line}
        </text>
      ))}
      {renderPorts(layout, theme.boxTextColor)}
    </>
  );
}

function renderInstruction(
  layout: FBDElementLayout,
  theme: Required<LadderDiagramTheme>,
): ReactNode {
  const element = layout.element;
  if (element.kind === 'block') {
    return renderInstructionFrame(layout, theme, {
      title: element.instruction ?? 'Block',
      subtitle: element.operand,
      footerLines: getFBDElementFooterLabels(element),
    });
  }
  if (element.kind === 'function') {
    return renderInstructionFrame(layout, theme, { title: element.instruction });
  }
  if (element.kind === 'add-on-instruction') {
    return renderInstructionFrame(layout, theme, {
      title: element.name ?? 'Add-On Instruction',
      subtitle: element.operand,
      footerLines: getFBDElementFooterLabels(element),
    });
  }
  return null;
}

function renderRoutineControl(
  layout: FBDElementLayout,
  theme: Required<LadderDiagramTheme>,
): ReactNode {
  const element = layout.element;
  if (element.kind !== 'routine-control') return null;
  return renderInstructionFrame(layout, theme, {
    title: element.operation,
    subtitle: element.routine,
    footerLines: getFBDElementFooterLabels(element),
  });
}

function renderTextBox(
  layout: FBDElementLayout,
  theme: Required<LadderDiagramTheme>,
): ReactNode {
  const element = layout.element;
  if (element.kind !== 'text-box') return null;
  const lines = wrapFBDText(element.text, layout.bounds.width);
  return (
    <>
      <rect
        x={layout.bounds.x}
        y={layout.bounds.y}
        width={layout.bounds.width}
        height={layout.bounds.height}
        rx="4"
        fill={theme.boxBgColor}
        stroke={theme.boxBorderColor}
        strokeDasharray="4 3"
      />
      <text
        x={layout.bounds.x + 12}
        y={layout.bounds.y + 18}
        fontSize="11"
        fill={theme.boxTextColor}
      >
        {lines.map((line, index) => (
          <tspan
            key={`${line}-${index}`}
            className="fbd-text-line"
            x={layout.bounds.x + 12}
            dy={index === 0 ? 0 : FBD_TEXT_LINE_HEIGHT}
          >
            {line || ' '}
          </tspan>
        ))}
      </text>
    </>
  );
}

function placeholderReason(element: Extract<NormalizedFBDElement, { kind: 'placeholder' }>): string {
  return element.reasonCodes.map((reason) => reason.replace(/-/g, ' ')).join(', ')
    || 'unsupported content';
}

function renderPlaceholder(
  layout: FBDElementLayout,
  theme: Required<LadderDiagramTheme>,
): ReactNode {
  const element = layout.element;
  if (element.kind !== 'placeholder') return null;
  return (
    <>
      <rect
        x={layout.bounds.x}
        y={layout.bounds.y}
        width={layout.bounds.width}
        height={layout.bounds.height}
        rx="3"
        fill={theme.boxBgColor}
        stroke={theme.contactNCColor}
        strokeWidth="1.5"
        strokeDasharray="6 4"
      />
      <text
        x={layout.bounds.x + layout.bounds.width / 2}
        y={layout.bounds.y + 22}
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
        fill={theme.contactNCColor}
      >
        {element.sourceKind}
      </text>
      <text
        x={layout.bounds.x + layout.bounds.width / 2}
        y={layout.bounds.y + 39}
        textAnchor="middle"
        fontSize="10"
        fill={theme.boxTextColor}
      >
        {`ID ${element.id ?? 'unknown'}`}
      </text>
      <text
        x={layout.bounds.x + layout.bounds.width / 2}
        y={layout.bounds.y + 55}
        textAnchor="middle"
        fontSize="9"
        fill={theme.addressColor}
      >
        {placeholderReason(element)}
      </text>
      {renderPorts(layout, theme.boxTextColor)}
    </>
  );
}

function renderElement(
  layout: FBDElementLayout,
  theme: Required<LadderDiagramTheme>,
): ReactNode {
  switch (layout.element.kind) {
    case 'reference':
    case 'connector':
      return renderTerminal(layout, theme);
    case 'block':
    case 'function':
    case 'add-on-instruction':
      return renderInstruction(layout, theme);
    case 'routine-control':
      return renderRoutineControl(layout, theme);
    case 'text-box':
      return renderTextBox(layout, theme);
    case 'placeholder':
      return renderPlaceholder(layout, theme);
  }
}

export interface FBDDiagramProps {
  body: NormalizedFBDBody;
  /** Zero-based source sheet index. Sheet navigation is added by issue #44. */
  sheetIndex?: number;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  theme?: LadderDiagramTheme;
  /** Receives parser, connector, and selected-sheet layout diagnostics in stable order. */
  onDiagnostics?: (diagnostics: readonly FBDDiagramDiagnostic[]) => void;
}

interface FBDRenderState {
  layout?: FBDSheetLayout;
  connectorDiagnosticCount: number;
  connectorRelationshipCount: number;
  diagnostics: FBDDiagramDiagnostic[];
  failure?: FBDLayoutDiagnostic;
}

function failureMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : 'Unexpected renderer failure.';
}

function failedRenderState(
  error: unknown,
  sheetIndex: number,
  bodyDiagnostics: NormalizedFBDDiagnostic[],
): FBDRenderState {
  const failure: FBDLayoutDiagnostic = {
    code: 'FBD_RENDER_SHEET_FAILURE',
    message: `Unable to render FBD sheet ${sheetIndex + 1}: ${failureMessage(error)}`,
    sheetIndex,
  };
  return {
    connectorDiagnosticCount: 0,
    connectorRelationshipCount: 0,
    diagnostics: [...bodyDiagnostics, failure],
    failure,
  };
}

function renderFailure(
  diagnostic: FBDLayoutDiagnostic,
  theme: Required<LadderDiagramTheme>,
  width: number | string | undefined,
  height: number | string | undefined,
  className: string,
  style: CSSProperties | undefined,
): ReactNode {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`fbd-diagram fbd-diagram-failed ${className}`.trim()}
      width={width ?? 420}
      height={height ?? 96}
      viewBox="0 0 420 96"
      style={{
        display: 'block',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        backgroundColor: theme.bgPrimary,
        ...style,
      }}
      data-render-failure={diagnostic.code}
    >
      <rect
        x="1"
        y="1"
        width="418"
        height="94"
        rx="4"
        fill={theme.boxBgColor}
        stroke={theme.contactNCColor}
        strokeDasharray="6 4"
      />
      <text
        x="210"
        y="43"
        textAnchor="middle"
        fontSize="13"
        fontWeight="600"
        fill={theme.contactNCColor}
      >
        Unable to render FBD sheet
      </text>
      <text x="210" y="64" textAnchor="middle" fontSize="10" fill={theme.addressColor}>
        {diagnostic.message}
      </text>
    </svg>
  );
}

/** Deterministic, read-only renderer for one normalized Function Block Diagram sheet. */
export function FBDDiagram({
  body,
  sheetIndex = 0,
  width,
  height,
  className = '',
  style,
  theme: themeOverride,
  onDiagnostics,
}: FBDDiagramProps) {
  const theme = useMemo(() => mergeTheme(themeOverride), [themeOverride]);
  const sheet = body.sheets[sheetIndex];
  const state = useMemo<FBDRenderState>(() => {
    const bodyDiagnostics = body.diagnostics.filter(
      (diagnostic) => diagnostic.sheetIndex === undefined || diagnostic.sheetIndex === sheetIndex,
    );
    if (!sheet) {
      return {
        connectorDiagnosticCount: 0,
        connectorRelationshipCount: 0,
        diagnostics: bodyDiagnostics,
      };
    }
    try {
      const connectorIndex = buildFBDConnectorIndex(body.sheets);
      const layout = buildFBDSheetLayout(sheet);
      return {
        layout,
        connectorDiagnosticCount: connectorIndex.diagnostics.length,
        connectorRelationshipCount: connectorIndex.relationships.length,
        diagnostics: [...bodyDiagnostics, ...connectorIndex.diagnostics, ...layout.diagnostics],
      };
    } catch (error) {
      return failedRenderState(error, sheetIndex, bodyDiagnostics);
    }
  }, [body, sheet, sheetIndex]);

  useEffect(() => {
    onDiagnostics?.(state.diagnostics);
  }, [onDiagnostics, state.diagnostics]);

  if (!sheet) return null;
  if (!state.layout || state.failure) {
    return renderFailure(
      state.failure ?? {
        code: 'FBD_RENDER_SHEET_FAILURE',
        message: `Unable to render FBD sheet ${sheetIndex + 1}.`,
        sheetIndex,
      },
      theme,
      width,
      height,
      className,
      style,
    );
  }

  const { layout } = state;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={`fbd-diagram ${className}`.trim()}
      width={width ?? layout.bounds.width}
      height={height ?? layout.bounds.height}
      viewBox={layout.viewBox}
      preserveAspectRatio="xMidYMid meet"
      style={{
        display: 'block',
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        backgroundColor: theme.bgPrimary,
        ...style,
      }}
      data-sheet-number={sheet.number.value}
      data-layout-diagnostic-count={layout.diagnostics.length}
      data-connector-diagnostic-count={state.connectorDiagnosticCount}
      data-connector-relationship-count={state.connectorRelationshipCount}
      data-attachment-count={layout.attachments.length}
    >
      <title>{sheet.name.value}</title>
      <rect
        x={layout.bounds.x}
        y={layout.bounds.y}
        width={layout.bounds.width}
        height={layout.bounds.height}
        fill={theme.bgPrimary}
      />
      <g className="fbd-connections">
        {layout.connections.map((connection, index) => (
          <path
            key={`${connection.connection.from.elementId}-${connection.connection.to.elementId}-${index}`}
            className={`fbd-connection fbd-connection-${connection.connection.kind}`}
            data-route-kind={connection.routeKind}
            d={connection.path}
            fill="none"
            stroke={theme.wireColor}
            strokeWidth="1.5"
            strokeDasharray={connection.connection.kind === 'feedback-wire' ? '6 4' : undefined}
          />
        ))}
      </g>
      <g className="fbd-attachments">
        {layout.attachments.map((attachment, index) => (
          <path
            key={`${attachment.attachment.fromElementId}-${attachment.attachment.toElementId}-${index}`}
            className="fbd-attachment"
            d={attachment.path}
            fill="none"
            stroke={theme.addressColor}
            strokeWidth="1.25"
            strokeDasharray="3 3"
          />
        ))}
      </g>
      <g className="fbd-elements">
        {layout.elements.map((element, index) => (
          <g
            key={`${'id' in element.element ? element.element.id : 'element'}-${index}`}
            className={`fbd-element fbd-element-${element.element.kind}`}
            data-element-id={'id' in element.element ? element.element.id : undefined}
            data-element-kind={element.element.kind}
            data-terminal-type={
              element.element.kind === 'reference'
                ? element.element.referenceType
                : element.element.kind === 'connector'
                  ? element.element.connectorType
                  : undefined
            }
          >
            {renderElement(element, theme)}
          </g>
        ))}
      </g>
    </svg>
  );
}
