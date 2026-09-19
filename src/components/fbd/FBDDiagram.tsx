import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type ColorMode,
  type EdgeTypes,
  type NodeTypes,
} from '@xyflow/react';
import {
  buildFBDConnectorIndex,
  buildFBDSheetLayout,
  type FBDLayoutDiagnostic,
  type FBDSheetLayout,
} from '../../layout';
import type {
  LadderDiagramTheme,
  NormalizedFBDBody,
  NormalizedFBDDiagnostic,
  NormalizedFBDElement,
} from '../../types';
import { mergeTheme } from '../../types';
import { FBDEdge, type FBDFlowEdge } from './FBDEdge';
import {
  FBDNode,
  attachmentHandleId,
  portHandleId,
  type FBDAttachmentSide,
  type FBDFlowNode,
} from './FBDNode';

export type FBDDiagramDiagnostic = NormalizedFBDDiagnostic | FBDLayoutDiagnostic;

export interface FBDDiagramProps {
  body: NormalizedFBDBody;
  /** Zero-based sheet to show initially, and to select when this prop changes. */
  sheetIndex?: number;
  /** Called whenever the active sheet changes through the sheet tabs. */
  onSheetIndexChange?: (sheetIndex: number) => void;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  theme?: LadderDiagramTheme;
  /** React Flow color mode. Inferred from the resolved background when omitted. */
  colorMode?: ColorMode;
  /** Show the React Flow zoom and fit controls. */
  showControls?: boolean;
  /** Show a source-grid background. */
  showBackground?: boolean;
  /** Show the React Flow minimap. */
  showMiniMap?: boolean;
  /** Allow viewport panning and zooming. Elements remain read-only. */
  interactive?: boolean;
  /** Render only viewport-visible elements. Disabled until a workload-specific benchmark opts in. */
  onlyRenderVisibleElements?: boolean;
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

interface FBDFlowModel {
  nodes: FBDFlowNode[];
  edges: FBDFlowEdge[];
}

const nodeTypes: NodeTypes = { fbdElement: FBDNode };
const edgeTypes: EdgeTypes = { fbdWire: FBDEdge };

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
): ReactNode {
  return (
    <div
      className="fbd-diagram-failed"
      style={{
        color: theme.boxTextColor,
        background: theme.bgPrimary,
        borderColor: theme.contactNCColor,
      }}
      data-render-failure={diagnostic.code}
      role="alert"
    >
      <strong style={{ color: theme.contactNCColor }}>
        <span aria-hidden="true">&#9888; </span>
        Unable to render FBD sheet
      </strong>
      <span style={{ color: theme.addressColor }}>{diagnostic.message}</span>
    </div>
  );
}

function boundedSheetIndex(sheetIndex: number | undefined, sheetCount: number): number {
  if (sheetCount === 0) return 0;
  if (!Number.isInteger(sheetIndex)) return 0;
  return Math.max(0, Math.min(sheetIndex ?? 0, sheetCount - 1));
}

function sheetAccessibleName(name: string, number: string): string {
  const numberLabel = `Sheet ${number}`;
  return name.trim().toLocaleLowerCase() === numberLabel.toLocaleLowerCase()
    ? numberLabel
    : `${numberLabel}: ${name}`;
}

function inferredColorMode(background: string): 'light' | 'dark' {
  const match = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(background.trim());
  if (!match) return 'light';
  const [red, green, blue] = match.slice(1).map((channel) => Number.parseInt(channel, 16));
  return red * 0.299 + green * 0.587 + blue * 0.114 < 128 ? 'dark' : 'light';
}

function normalizedElementId(element: NormalizedFBDElement): string | undefined {
  return 'id' in element ? element.id : undefined;
}

function reactFlowNodeId(element: NormalizedFBDElement, index: number): string {
  return `fbd-${normalizedElementId(element) ?? 'unknown'}-${index}`;
}

function attachmentSide(
  point: { x: number; y: number },
  bounds: { x: number; y: number; width: number; height: number },
): FBDAttachmentSide {
  const distances: Array<[FBDAttachmentSide, number]> = [
    ['left', Math.abs(point.x - bounds.x)],
    ['right', Math.abs(point.x - (bounds.x + bounds.width))],
    ['top', Math.abs(point.y - bounds.y)],
    ['bottom', Math.abs(point.y - (bounds.y + bounds.height))],
  ];
  distances.sort((left, right) => left[1] - right[1]);
  return distances[0][0];
}

export function buildFBDFlowModel(
  layout: FBDSheetLayout,
  theme: Required<LadderDiagramTheme>,
): FBDFlowModel {
  const nodeIdsByElementId = new Map<string, string[]>();
  const nodes = layout.elements.map<FBDFlowNode>((elementLayout, index) => {
    const id = reactFlowNodeId(elementLayout.element, index);
    const normalizedId = normalizedElementId(elementLayout.element);
    if (normalizedId !== undefined) {
      const ids = nodeIdsByElementId.get(normalizedId) ?? [];
      ids.push(id);
      nodeIdsByElementId.set(normalizedId, ids);
    }
    return {
      id,
      type: 'fbdElement',
      position: { x: elementLayout.bounds.x, y: elementLayout.bounds.y },
      width: elementLayout.bounds.width,
      height: elementLayout.bounds.height,
      initialWidth: elementLayout.bounds.width,
      initialHeight: elementLayout.bounds.height,
      data: { layout: elementLayout, theme },
      draggable: false,
      selectable: false,
      connectable: false,
      focusable: false,
      zIndex: 1,
    };
  });

  const edges: FBDFlowEdge[] = layout.connections.flatMap((connection, index) => {
    const sourceIds = nodeIdsByElementId.get(connection.connection.from.elementId) ?? [];
    const targetIds = nodeIdsByElementId.get(connection.connection.to.elementId) ?? [];
    if (sourceIds.length !== 1 || targetIds.length !== 1) return [];
    return [{
      id: `connection-${index}`,
      source: sourceIds[0],
      sourceHandle: portHandleId('output', connection.source.port.id),
      target: targetIds[0],
      targetHandle: portHandleId('input', connection.destination.port.id),
      type: 'fbdWire',
      className: `fbd-connection fbd-connection-${connection.connection.kind}`,
      data: { path: connection.path },
      style: {
        stroke: theme.wireColor,
        strokeWidth: 1.5,
      },
      selectable: false,
      focusable: false,
      deletable: false,
      reconnectable: false,
      zIndex: 0,
      ariaLabel: `${connection.connection.kind} ${connection.connection.from.elementId} to ${connection.connection.to.elementId}`,
    }];
  });

  layout.attachments.forEach((attachment, index) => {
    const sourceIds = nodeIdsByElementId.get(attachment.attachment.fromElementId) ?? [];
    const targetIds = nodeIdsByElementId.get(attachment.attachment.toElementId) ?? [];
    if (sourceIds.length !== 1 || targetIds.length !== 1) return;
    edges.push({
      id: `attachment-${index}`,
      source: sourceIds[0],
      sourceHandle: attachmentHandleId(
        'source',
        attachmentSide(attachment.points[0], attachment.from.bounds),
      ),
      target: targetIds[0],
      targetHandle: attachmentHandleId(
        'target',
        attachmentSide(attachment.points[attachment.points.length - 1], attachment.to.bounds),
      ),
      type: 'fbdWire',
      className: 'fbd-attachment',
      data: { path: attachment.path },
      style: {
        stroke: theme.addressColor,
        strokeWidth: 1.25,
        strokeDasharray: '3 3',
      },
      selectable: false,
      focusable: false,
      deletable: false,
      reconnectable: false,
      zIndex: 0,
      ariaLabel: `attachment ${attachment.attachment.fromElementId} to ${attachment.attachment.toElementId}`,
    });
  });

  return { nodes, edges };
}

/** Read-only React Flow renderer for one normalized Function Block Diagram sheet. */
export function FBDDiagram({
  body,
  sheetIndex = 0,
  onSheetIndexChange,
  width,
  height,
  className = '',
  style,
  theme: themeOverride,
  colorMode,
  showControls = true,
  showBackground = true,
  showMiniMap = false,
  interactive = true,
  onlyRenderVisibleElements = false,
  onDiagnostics,
}: FBDDiagramProps) {
  const requestedSheetIndex = boundedSheetIndex(sheetIndex, body.sheets.length);
  const [navigation, setNavigation] = useState(() => ({
    activeSheetIndex: requestedSheetIndex,
    requestedSheetIndex: sheetIndex,
    sheetCount: body.sheets.length,
  }));
  let activeSheetIndex = navigation.activeSheetIndex;
  const requestedSheetChanged = !Object.is(navigation.requestedSheetIndex, sheetIndex);
  if (
    requestedSheetChanged
    || navigation.sheetCount !== body.sheets.length
  ) {
    activeSheetIndex = boundedSheetIndex(
      requestedSheetChanged
        ? sheetIndex
        : navigation.activeSheetIndex,
      body.sheets.length,
    );
    setNavigation({
      activeSheetIndex,
      requestedSheetIndex: sheetIndex,
      sheetCount: body.sheets.length,
    });
  }
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const idPrefix = `fbd-${useId().replace(/:/g, '')}`;

  const selectSheet = (nextIndex: number, focus = false) => {
    const boundedIndex = boundedSheetIndex(nextIndex, body.sheets.length);
    setNavigation((current) => ({ ...current, activeSheetIndex: boundedIndex }));
    onSheetIndexChange?.(boundedIndex);
    if (focus) tabRefs.current[boundedIndex]?.focus();
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | undefined;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (index + 1) % body.sheets.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (index - 1 + body.sheets.length) % body.sheets.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = body.sheets.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    selectSheet(nextIndex, true);
  };

  const theme = useMemo(() => mergeTheme(themeOverride), [themeOverride]);
  const sheet = body.sheets[activeSheetIndex];
  const connectorState = useMemo<{
    connectorIndex?: ReturnType<typeof buildFBDConnectorIndex>;
    error?: unknown;
  }>(() => {
    try {
      return { connectorIndex: buildFBDConnectorIndex(body.sheets) };
    } catch (error) {
      return { error };
    }
  }, [body]);
  const stateCache = useMemo(() => new Map<number, FBDRenderState>(), [body]);
  const state = useMemo<FBDRenderState>(() => {
    const cached = stateCache.get(activeSheetIndex);
    if (cached) return cached;
    const bodyDiagnostics = body.diagnostics.filter(
      (diagnostic) => diagnostic.sheetIndex === undefined || diagnostic.sheetIndex === activeSheetIndex,
    );
    let nextState: FBDRenderState;
    if (!sheet) {
      nextState = {
        connectorDiagnosticCount: 0,
        connectorRelationshipCount: 0,
        diagnostics: bodyDiagnostics,
      };
    } else if (!connectorState.connectorIndex) {
      nextState = failedRenderState(connectorState.error, activeSheetIndex, bodyDiagnostics);
    } else {
      try {
        const layout = buildFBDSheetLayout(sheet);
        nextState = {
          layout,
          connectorDiagnosticCount: connectorState.connectorIndex.diagnostics.length,
          connectorRelationshipCount: connectorState.connectorIndex.relationships.length,
          diagnostics: [
            ...bodyDiagnostics,
            ...connectorState.connectorIndex.diagnostics,
            ...layout.diagnostics,
          ],
        };
      } catch (error) {
        nextState = failedRenderState(error, activeSheetIndex, bodyDiagnostics);
      }
    }
    stateCache.set(activeSheetIndex, nextState);
    return nextState;
  }, [activeSheetIndex, body.diagnostics, connectorState, sheet, stateCache]);

  useEffect(() => {
    onDiagnostics?.(state.diagnostics);
  }, [onDiagnostics, state.diagnostics]);

  const modelCache = useMemo(() => new Map<number, FBDFlowModel>(), [body, theme]);
  const model = useMemo<FBDFlowModel>(() => {
    const cached = modelCache.get(activeSheetIndex);
    if (cached) return cached;
    const nextModel = state.layout
      ? buildFBDFlowModel(state.layout, theme)
      : { nodes: [], edges: [] };
    modelCache.set(activeSheetIndex, nextModel);
    return nextModel;
  }, [activeSheetIndex, modelCache, state.layout, theme]);

  if (!sheet) return null;
  const layout = state.layout;
  const activeTabId = `${idPrefix}-tab-${activeSheetIndex}`;
  const summaryId = `${idPrefix}-summary-${activeSheetIndex}`;
  const accessibleName = sheetAccessibleName(sheet.name.value, sheet.number.value);
  const summary = layout
    ? `${layout.elements.length} elements and ${layout.connections.length} connections.`
    : 'Diagram unavailable.';
  const diagnosticSummary = state.diagnostics.length === 0
    ? 'No diagnostics.'
    : `${state.diagnostics.length} ${state.diagnostics.length === 1 ? 'diagnostic' : 'diagnostics'}.`;
  const fallbackHeight = layout ? layout.bounds.height + 76 : 172;
  const fallbackWidth = layout?.bounds.width ?? 420;

  return (
    <div
      className={`fbd-diagram fbd-routine ${className}`.trim()}
      style={{
        width: width ?? fallbackWidth,
        height: height ?? fallbackHeight,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        background: theme.bgPrimary,
        '--fbd-background': theme.bgPrimary,
        '--fbd-border': theme.boxBorderColor,
        '--fbd-border-subtle': theme.borderColor,
        '--fbd-node-background': `color-mix(in srgb, ${theme.rungNumberBg} 50%, ${theme.boxBgColor})`,
        '--fbd-surface': theme.rungNumberBg,
        '--fbd-text': theme.boxTextColor,
        '--fbd-muted': theme.addressColor,
        '--fbd-focus': theme.powerRailColor,
        '--fbd-diagnostic': theme.contactNCColor,
        '--fbd-wire': theme.wireColor,
        ...style,
      } as CSSProperties}
      data-sheet-number={sheet.number.value}
      data-layout-diagnostic-count={layout?.diagnostics.length ?? 0}
      data-connector-diagnostic-count={state.connectorDiagnosticCount}
      data-connector-relationship-count={state.connectorRelationshipCount}
      data-attachment-count={layout?.attachments.length ?? 0}
    >
      <div className="fbd-sheet-tabs" role="tablist" aria-label="Function block diagram sheets">
        {body.sheets.map((candidate, index) => {
          const tabId = `${idPrefix}-tab-${index}`;
          const panelId = `${idPrefix}-panel-${index}`;
          const selected = index === activeSheetIndex;
          return (
            <button
              key={`${candidate.number.value}-${index}`}
              ref={(element) => { tabRefs.current[index] = element; }}
              id={tabId}
              className="fbd-sheet-tab"
              type="button"
              role="tab"
              aria-controls={panelId}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => selectSheet(index)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              <span className="fbd-sheet-tab-number">Sheet {candidate.number.value}</span>
              {candidate.name.value.trim().toLocaleLowerCase()
                !== `Sheet ${candidate.number.value}`.toLocaleLowerCase() && (
                <span className="fbd-sheet-tab-name">{candidate.name.value}</span>
              )}
            </button>
          );
        })}
      </div>
      {body.sheets.map((candidate, index) => {
        const panelId = `${idPrefix}-panel-${index}`;
        const tabId = `${idPrefix}-tab-${index}`;
        if (index !== activeSheetIndex) {
          return (
            <div
              key={`${candidate.number.value}-${index}`}
              id={panelId}
              role="tabpanel"
              aria-labelledby={tabId}
              hidden
            />
          );
        }
        return (
          <div
            key={`${candidate.number.value}-${index}`}
            id={panelId}
            className="fbd-sheet-panel"
            role="tabpanel"
            aria-labelledby={activeTabId}
            aria-describedby={summaryId}
            tabIndex={0}
          >
            <div id={summaryId} className="fbd-sheet-summary">
              <span>{accessibleName}. {summary}</span>
              {state.diagnostics.length === 0 ? (
                <span className="fbd-diagnostic-summary">{diagnosticSummary}</span>
              ) : (
                <span className="fbd-diagnostic-summary fbd-diagnostic-summary-warning">
                  <span aria-hidden="true">&#9888; </span>
                  Warning: {diagnosticSummary}
                </span>
              )}
            </div>
            {!layout || state.failure ? (
              renderFailure(
                state.failure ?? {
                  code: 'FBD_RENDER_SHEET_FAILURE',
                  message: `Unable to render FBD sheet ${activeSheetIndex + 1}.`,
                  sheetIndex: activeSheetIndex,
                },
                theme,
              )
            ) : (
              <div className="fbd-react-flow" aria-label={`Function block diagram: ${sheet.name.value}`}>
                <ReactFlow<FBDFlowNode, FBDFlowEdge>
                  key={`${activeSheetIndex}-${sheet.number.value}-${layout.viewBox}`}
                  nodes={model.nodes}
                  edges={model.edges}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  colorMode={colorMode ?? inferredColorMode(theme.bgPrimary)}
                  fitView
                  fitViewOptions={{ padding: 0.08, minZoom: 0.15, maxZoom: 1.5 }}
                  minZoom={0.1}
                  maxZoom={4}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  nodesFocusable={false}
                  edgesFocusable={false}
                  edgesReconnectable={false}
                  elementsSelectable={false}
                  disableKeyboardA11y
                  panOnDrag={interactive}
                  panOnScroll={interactive}
                  zoomOnScroll={interactive}
                  zoomOnPinch={interactive}
                  zoomOnDoubleClick={interactive}
                  preventScrolling={interactive}
                  onlyRenderVisibleElements={onlyRenderVisibleElements}
                  translateExtent={[
                    [layout.bounds.x - layout.bounds.width, layout.bounds.y - layout.bounds.height],
                    [layout.bounds.x + layout.bounds.width * 2, layout.bounds.y + layout.bounds.height * 2],
                  ]}
                >
                  {showBackground && (
                    <Background
                      variant={BackgroundVariant.Lines}
                      gap={200}
                      size={0.75}
                      color={theme.borderColor}
                    />
                  )}
                  {showControls && <Controls showInteractive={false} />}
                  {showMiniMap && (
                    <MiniMap
                      ariaLabel={`Overview of ${accessibleName}`}
                      pannable={interactive}
                      zoomable={interactive}
                      nodeColor={theme.rungNumberBg}
                      maskColor={`${theme.bgPrimary}bb`}
                    />
                  )}
                </ReactFlow>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
