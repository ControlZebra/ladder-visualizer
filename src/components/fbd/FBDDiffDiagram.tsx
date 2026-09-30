import { FBD_FONT_FAMILY, fbdNodeBackground } from './fbdAppearance';
import { useEffect, useId, useMemo, useState, type CSSProperties } from 'react';
import { Background, BackgroundVariant, Controls, ReactFlow, type NodeTypes } from '@xyflow/react';
import { diffFBD, type FBDSheetDiff } from '../../diff';
import { buildFBDConnectorIndex, buildFBDSheetLayout, type FBDSheetLayout } from '../../layout';
import { mergeTheme, type LadderDiagramTheme, type NormalizedFBDBody } from '../../types';
import { FBDDiffArtworkNode, type FBDDiffCanvasNode } from './FBDDiffArtwork';
import { buildFBDDiffArtwork } from './fbdDiffLayout';

export type FBDDiffView = 'overlay' | 'side-by-side';
export interface FBDDiffDiagramProps {
  oldBody?: NormalizedFBDBody;
  newBody?: NormalizedFBDBody;
  initialView?: FBDDiffView;
  width?: number | string;
  height?: number | string;
  theme?: LadderDiagramTheme;
  className?: string;
  style?: CSSProperties;
  /** Receives identity, parser and layout diagnostics for the selected comparison. */
  onDiagnostics?: (diagnostics: readonly string[]) => void;
}
const nodeTypes: NodeTypes = { fbdComparison: FBDDiffArtworkNode };
interface SheetState {
  layout?: FBDSheetLayout;
  messages: string[];
  failed: boolean;
}
function sheetState(body: NormalizedFBDBody | undefined, index: number | undefined): SheetState {
  if (!body || index === undefined) return { messages: [], failed: false };
  const messages = body.diagnostics
    .filter((diagnostic) => diagnostic.sheetIndex === undefined || diagnostic.sheetIndex === index)
    .map((diagnostic) => diagnostic.message);
  try {
    const layout = buildFBDSheetLayout(body.sheets[index]);
    messages.push(
      ...buildFBDConnectorIndex(body.sheets).diagnostics.map((diagnostic) => diagnostic.message),
      ...layout.diagnostics.map((diagnostic) => diagnostic.message)
    );
    return { layout, messages, failed: false };
  } catch (error) {
    messages.push(
      `Unable to render sheet: ${error instanceof Error ? error.message : 'unexpected layout failure'}`
    );
    return { messages, failed: true };
  }
}
function sheetLabel(pair: FBDSheetDiff): string {
  const sheet = (pair.newValue ?? pair.oldValue)!;
  const suffix = pair.ambiguous
    ? ` — unpaired ${pair.newValue ? 'newer' : 'older'} #${(pair.newIndex ?? pair.oldIndex ?? 0) + 1}`
    : pair.kind === 'added'
      ? ' — added'
      : pair.kind === 'removed'
        ? ' — removed'
        : '';
  return `Sheet ${sheet.number.source === 'declared' ? sheet.number.value : '(number unavailable)'}${suffix}`;
}
function metadataFields(
  body?: NormalizedFBDBody,
  sheet?: FBDSheetDiff['oldValue']
): Map<string, string> {
  const fields = new Map<string, string>();
  fields.set(
    'name',
    sheet
      ? `${sheet.name.value || `Sheet ${sheet.number.value}`}${sheet.name.source === 'fallback' ? ' (default name)' : ''}`
      : 'No sheet in this version'
  );
  sheet?.descriptions.forEach((text, index) => fields.set(`description:${index}`, text));
  if (body) {
    fields.set(
      'size',
      `${body.sheetSize.value}${body.sheetSize.source === 'fallback' ? ' (default)' : ''}`
    );
    fields.set(
      'orientation',
      `${body.orientation.value}${body.orientation.source === 'fallback' ? ' (default)' : ''}`
    );
  }
  return fields;
}
function Metadata({
  oldBody,
  newBody,
  pair,
  view,
}: {
  oldBody?: NormalizedFBDBody;
  newBody?: NormalizedFBDBody;
  pair?: FBDSheetDiff;
  view: FBDDiffView;
}) {
  const older = metadataFields(oldBody, pair?.oldValue),
    newer = metadataFields(newBody, pair?.newValue);
  return (
    <div className="fbd-diff-metadata-row">
      {[...new Set([...older.keys(), ...newer.keys()])].map((key) => {
        const oldText = older.get(key),
          newText = newer.get(key);
        return (
          <div className="fbd-diff-metadata-field" key={key} data-field={key}>
            {view === 'overlay' && oldText === newText ? (
              <span className="fbd-diff-neutral" data-tone="neutral">
                {newText}
              </span>
            ) : (
              <>
                <span className="fbd-diff-older" data-tone="older">
                  {oldText}
                </span>
                <span className="fbd-diff-newer" data-tone="newer">
                  {newText}
                </span>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
function Canvas({
  older,
  newer,
  theme,
  name,
  comparison,
}: {
  older?: FBDSheetLayout;
  newer?: FBDSheetLayout;
  theme: Required<LadderDiagramTheme>;
  name: string;
  comparison?: FBDSheetDiff;
}) {
  const artwork = useMemo(
    () => buildFBDDiffArtwork(older, newer, comparison),
    [older, newer, comparison]
  );
  const nodes = useMemo<FBDDiffCanvasNode[]>(
    () => [
      {
        id: 'comparison',
        type: 'fbdComparison',
        position: { x: artwork.bounds.x, y: artwork.bounds.y },
        width: artwork.bounds.width,
        height: artwork.bounds.height,
        initialWidth: artwork.bounds.width,
        initialHeight: artwork.bounds.height,
        data: { artwork, theme },
        draggable: false,
        selectable: false,
        connectable: false,
        focusable: false,
      },
    ],
    [artwork, theme]
  );
  return (
    <div className="fbd-diff-canvas fbd-react-flow" aria-label={name}>
      <ReactFlow<FBDDiffCanvasNode>
        key={`${artwork.bounds.x},${artwork.bounds.y},${artwork.bounds.width},${artwork.bounds.height}`}
        nodes={nodes}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.06, maxZoom: 1.5 }}
        minZoom={0.1}
        maxZoom={4}
        nodesDraggable={false}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        disableKeyboardA11y
        panOnScroll
      >
        <Background variant={BackgroundVariant.Lines} gap={100} color={theme.borderColor} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

/** Source-coordinate comparison with neutral context and colored changes. */
export function FBDDiffDiagram({
  oldBody,
  newBody,
  initialView = 'overlay',
  width = '100%',
  height = 700,
  theme: override,
  className = '',
  style,
  onDiagnostics,
}: FBDDiffDiagramProps) {
  const theme = useMemo(() => mergeTheme(override), [override]);
  const diff = useMemo(() => diffFBD(oldBody, newBody), [oldBody, newBody]);
  const [selection, setSelection] = useState('');
  const [view, setView] = useState<FBDDiffView>(initialView);
  const pair = diff.sheets.find((sheet) => sheet.key === selection) ?? diff.sheets[0];
  const older = useMemo(() => sheetState(oldBody, pair?.oldIndex), [oldBody, pair?.oldIndex]);
  const newer = useMemo(() => sheetState(newBody, pair?.newIndex), [newBody, pair?.newIndex]);
  const actualView = pair?.ambiguous || older.failed || newer.failed ? 'side-by-side' : view;
  const messages = useMemo(
    () => [
      ...diff.diagnostics.map((diagnostic) => diagnostic.message),
      ...older.messages.map((message) => `Older: ${message}`),
      ...newer.messages.map((message) => `Newer: ${message}`),
    ],
    [diff, older, newer]
  );
  useEffect(() => {
    onDiagnostics?.(messages);
  }, [messages, onDiagnostics]);
  const selectId = useId();
  return (
    <div
      className={`fbd-diff fbd-routine ${className}`.trim()}
      data-view={actualView}
      style={
        {
          width,
          height,
          fontFamily: FBD_FONT_FAMILY,
          color: theme.boxTextColor,
          background: theme.bgPrimary,
          '--fbd-background': theme.bgPrimary,
          '--fbd-node-background': fbdNodeBackground(theme),
          '--fbd-text': theme.boxTextColor,
          '--fbd-muted': theme.addressColor,
          '--fbd-border': theme.boxBorderColor,
          '--fbd-border-subtle': theme.borderColor,
          '--fbd-surface': theme.rungNumberBg,
          '--fbd-focus': theme.powerRailColor,
          '--fbd-old': theme.diffOldTextColor,
          '--fbd-new': theme.diffNewTextColor,
          ...style,
        } as CSSProperties
      }
    >
      <div className="fbd-diff-toolbar">
        <label htmlFor={selectId}>FBD comparison</label>
        <select
          id={selectId}
          value={pair?.key ?? ''}
          onChange={(event) => setSelection(event.target.value)}
          disabled={!pair}
        >
          {diff.sheets.map((sheet) => (
            <option key={sheet.key} value={sheet.key}>
              {sheetLabel(sheet)}
            </option>
          ))}
        </select>
        <div className="fbd-diff-modes" role="group" aria-label="Comparison view">
          <button
            type="button"
            aria-pressed={actualView === 'overlay'}
            disabled={Boolean(pair?.ambiguous || older.failed || newer.failed)}
            onClick={() => setView('overlay')}
          >
            Overlay
          </button>
          <button
            type="button"
            aria-pressed={actualView === 'side-by-side'}
            onClick={() => setView('side-by-side')}
          >
            Side by side
          </button>
        </div>
      </div>
      <div className="fbd-diff-legend" aria-label="Version colors">
        <span className="fbd-diff-older">− Older</span>
        <span className="fbd-diff-newer">+ Newer</span>
        {actualView === 'overlay' && <span>Unchanged</span>}
      </div>
      <Metadata oldBody={oldBody} newBody={newBody} pair={pair} view={actualView} />
      {messages.length > 0 && (
        <details
          className="fbd-diff-diagnostics"
          open={Boolean(pair?.ambiguous || older.failed || newer.failed)}
        >
          <summary>{messages.length} comparison diagnostics</summary>
          {messages.map((message, index) => (
            <p key={index}>{message}</p>
          ))}
        </details>
      )}
      {!pair ? (
        <div className="fbd-diff-empty">No FBD sheets available.</div>
      ) : actualView === 'overlay' ? (
        <Canvas
          key={`${pair.key}-overlay`}
          older={older.layout}
          newer={newer.layout}
          theme={theme}
          name="FBD overlay"
          comparison={pair}
        />
      ) : (
        <div className="fbd-diff-panes">
          {(['older', 'newer'] as const).map((version) => {
            const state = version === 'older' ? older : newer;
            return (
              <div
                key={version}
                className="fbd-diff-pane"
                aria-label={`${version === 'older' ? 'Older' : 'Newer'} version`}
              >
                {state.layout ? (
                  <Canvas
                    key={`${pair.key}-${version}`}
                    older={version === 'older' ? state.layout : undefined}
                    newer={version === 'newer' ? state.layout : undefined}
                    theme={theme}
                    name={`${version} FBD sheet`}
                  />
                ) : (
                  <div className="fbd-diff-empty">
                    {state.failed
                      ? 'Diagram unavailable. See diagnostics.'
                      : 'No sheet in this version.'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
