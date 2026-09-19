import { useMemo, type CSSProperties, type ReactNode } from 'react';
import {
  buildFBDConnectorIndex,
  buildFBDSheetLayout,
  FBD_BLOCK_HEADER_HEIGHT,
  getFBDBlockArrayLabels,
  type FBDElementLayout,
  type FBDPortLayout,
} from '../../layout';
import type {
  LadderDiagramTheme,
  NormalizedFBDBody,
  NormalizedFBDElement,
} from '../../types';
import { mergeTheme } from '../../types';

function portLabelX(layout: FBDElementLayout, port: FBDPortLayout): number {
  return port.port.side === 'left' ? layout.bounds.x + 10 : layout.bounds.x + layout.bounds.width - 10;
}

function renderPorts(layout: FBDElementLayout, color: string, showLabels = true): ReactNode {
  return (
    <g className="fbd-ports">
      {layout.ports.map((port) => (
        <g
          key={`${port.port.side}-${port.port.id}`}
          className={`fbd-port fbd-port-${port.port.direction}`}
          data-port-id={port.port.id}
          data-port-direction={port.port.direction}
        >
          <circle cx={port.point.x} cy={port.point.y} r="4" fill={color} />
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

function renderTerminal(
  layout: FBDElementLayout,
  theme: Required<LadderDiagramTheme>,
): ReactNode {
  const element = layout.element;
  if (element.kind !== 'reference' && element.kind !== 'connector') {
    return null;
  }
  const label = element.kind === 'reference'
    ? element.operand ?? (element.referenceType === 'input' ? 'Input' : 'Output')
    : element.name ?? 'Connector';
  const emitsValue = element.kind === 'reference'
    ? element.referenceType === 'input'
    : element.connectorType === 'input';
  const markerX = emitsValue ? layout.bounds.x + layout.bounds.width - 12 : layout.bounds.x + 12;
  const markerDirection = emitsValue ? 1 : -1;
  const centerY = layout.bounds.y + layout.bounds.height / 2;

  return (
    <>
      <rect
        x={layout.bounds.x}
        y={layout.bounds.y}
        width={layout.bounds.width}
        height={layout.bounds.height}
        rx={element.kind === 'connector' ? 10 : 2}
        fill={theme.boxBgColor}
        stroke={theme.boxBorderColor}
      />
      <path
        d={`M ${markerX - markerDirection * 5} ${centerY - 5} L ${markerX + markerDirection * 2} ${centerY} L ${markerX - markerDirection * 5} ${centerY + 5}`}
        fill="none"
        stroke={theme.boxTextColor}
        strokeWidth="1.5"
      />
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

function blockTitle(element: NormalizedFBDElement): string {
  return element.kind === 'block' ? element.instruction ?? 'Block' : 'Block';
}

function renderBlock(
  layout: FBDElementLayout,
  theme: Required<LadderDiagramTheme>,
): ReactNode {
  const element = layout.element;
  if (element.kind !== 'block') {
    return null;
  }
  const arrays = getFBDBlockArrayLabels(element);
  const arrayStartY = layout.bounds.y + layout.bounds.height - arrays.length * 18;

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
      <line
        x1={layout.bounds.x}
        y1={layout.bounds.y + FBD_BLOCK_HEADER_HEIGHT}
        x2={layout.bounds.x + layout.bounds.width}
        y2={layout.bounds.y + FBD_BLOCK_HEADER_HEIGHT}
        stroke={theme.boxBorderColor}
      />
      <text
        x={layout.bounds.x + layout.bounds.width / 2}
        y={layout.bounds.y + 16}
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
        fill={theme.boxTextColor}
      >
        {blockTitle(element)}
      </text>
      {element.operand && (
        <text
          x={layout.bounds.x + layout.bounds.width / 2}
          y={layout.bounds.y + 33}
          textAnchor="middle"
          fontSize="10"
          fill={theme.addressColor}
        >
          {element.operand}
        </text>
      )}
      {arrays.map((array, index) => (
        <text
          key={`${array}-${index}`}
          x={layout.bounds.x + layout.bounds.width / 2}
          y={arrayStartY + index * 18 + 13}
          textAnchor="middle"
          fontSize="9"
          fill={theme.addressColor}
          className="fbd-array-binding"
        >
          {array}
        </text>
      ))}
      {renderPorts(layout, theme.boxTextColor)}
    </>
  );
}

function renderElement(
  layout: FBDElementLayout,
  theme: Required<LadderDiagramTheme>,
): ReactNode {
  if (layout.element.kind === 'reference' || layout.element.kind === 'connector') {
    return renderTerminal(layout, theme);
  }
  if (layout.element.kind === 'block') {
    return renderBlock(layout, theme);
  }
  return null;
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
}: FBDDiagramProps) {
  const theme = useMemo(() => mergeTheme(themeOverride), [themeOverride]);
  const sheet = body.sheets[sheetIndex];
  const connectorIndex = useMemo(() => buildFBDConnectorIndex(body.sheets), [body.sheets]);
  const layout = useMemo(() => sheet ? buildFBDSheetLayout(sheet) : undefined, [sheet]);

  if (!layout) {
    return null;
  }

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
      data-connector-diagnostic-count={connectorIndex.diagnostics.length}
      data-connector-relationship-count={connectorIndex.relationships.length}
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
