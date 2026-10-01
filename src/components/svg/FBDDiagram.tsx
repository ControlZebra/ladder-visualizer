import { FBDElement, FBD_FONT_FAMILY } from '../fbd/elements';
import { useMemo, type CSSProperties } from 'react';
import { buildFBDConnectorIndex, buildFBDSheetLayout } from '../../layout';
import type { LadderDiagramTheme, NormalizedFBDBody } from '../../types';
import { mergeTheme } from '../../types';

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
  const layout = useMemo(() => (sheet ? buildFBDSheetLayout(sheet) : undefined), [sheet]);

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
        fontFamily: FBD_FONT_FAMILY,
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
            <FBDElement layout={element} theme={theme} />
          </g>
        ))}
      </g>
    </svg>
  );
}
