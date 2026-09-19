import { useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
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
  /** Zero-based source sheet index. Sheet navigation is added by issue #44. */
  sheetIndex?: number;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: CSSProperties;
  theme?: LadderDiagramTheme;
  /** Show the React Flow zoom and fit controls. */
  showControls?: boolean;
  /** Show a source-grid background. */
  showBackground?: boolean;
  /** Show the React Flow minimap. */
  showMiniMap?: boolean;
  /** Allow viewport panning and zooming. Elements remain read-only. */
  interactive?: boolean;
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
  width: number | string | undefined,
  height: number | string | undefined,
  className: string,
  style: CSSProperties | undefined,
): ReactNode {
  return (
    <div
      className={`fbd-diagram fbd-diagram-failed ${className}`.trim()}
      style={{
        width: width ?? 420,
        height: height ?? 96,
        color: theme.boxTextColor,
        background: theme.bgPrimary,
        borderColor: theme.contactNCColor,
        ...style,
      }}
      data-render-failure={diagnostic.code}
    >
      <strong style={{ color: theme.contactNCColor }}>Unable to render FBD sheet</strong>
      <span style={{ color: theme.addressColor }}>{diagnostic.message}</span>
    </div>
  );
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
  width,
  height,
  className = '',
  style,
  theme: themeOverride,
  showControls = false,
  showBackground = true,
  showMiniMap = false,
  interactive = true,
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

  const model = useMemo(
    () => state.layout ? buildFBDFlowModel(state.layout, theme) : { nodes: [], edges: [] },
    [state.layout, theme],
  );

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
    <div
      className={`fbd-diagram fbd-react-flow ${className}`.trim()}
      style={{
        width: width ?? layout.bounds.width,
        height: height ?? layout.bounds.height,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        background: theme.bgPrimary,
        '--fbd-background': theme.bgPrimary,
        '--fbd-border': theme.boxBorderColor,
        '--fbd-node-background': `color-mix(in srgb, ${theme.rungNumberBg} 50%, ${theme.boxBgColor})`,
        '--fbd-text': theme.boxTextColor,
        '--fbd-wire': theme.wireColor,
        ...style,
      } as CSSProperties}
      data-sheet-number={sheet.number.value}
      data-layout-diagnostic-count={layout.diagnostics.length}
      data-connector-diagnostic-count={state.connectorDiagnosticCount}
      data-connector-relationship-count={state.connectorRelationshipCount}
      data-attachment-count={layout.attachments.length}
      aria-label={`Function block diagram: ${sheet.name.value}`}
    >
      <ReactFlow<FBDFlowNode, FBDFlowEdge>
        key={`${sheetIndex}-${sheet.number.value}-${layout.viewBox}`}
        nodes={model.nodes}
        edges={model.edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
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
        panOnDrag={interactive}
        panOnScroll={interactive}
        zoomOnScroll={interactive}
        zoomOnPinch={interactive}
        zoomOnDoubleClick={interactive}
        preventScrolling={interactive}
        onlyRenderVisibleElements={false}
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
            pannable={interactive}
            zoomable={interactive}
            nodeColor={theme.rungNumberBg}
            maskColor={`${theme.bgPrimary}bb`}
          />
        )}
      </ReactFlow>
    </div>
  );
}
