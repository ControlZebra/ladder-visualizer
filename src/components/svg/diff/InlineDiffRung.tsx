import { useMemo } from 'react';
import type { InlineDiffRungModel } from '../../../diff';
import { RUNG_NUMBER_WIDTH } from '../../../layout';
import { prepareInlineDiffRungRenderLayout } from '../../../layout/diffLayoutAdapters';
import type { InlineDiffNodeLayout } from '../../../layout';
import type { LadderDiagramTheme } from '../../../types';
import { mergeTheme } from '../../../types';
import { InlineDiffBranch } from './InlineDiffBranch';
import { InlineDiffInstruction } from './InlineDiffInstruction';
import { InlineTextChange } from './InlineTextChange';

export interface InlineDiffRungProps {
  model: InlineDiffRungModel;
  width?: number;
  yOffset?: number;
  theme?: LadderDiagramTheme;
}

function InlineDiffNodeRenderer({ layout, theme }: { layout: InlineDiffNodeLayout; theme: Required<LadderDiagramTheme> }) {
  if (layout.kind === 'instruction') {
    return <InlineDiffInstruction layout={layout} theme={theme} />;
  }

  return <InlineDiffBranch layout={layout} theme={theme} />;
}

function getNodeEndX(layout: InlineDiffNodeLayout): number {
  return layout.position.x + layout.dimensions.width;
}

function getRungWash(rungState: InlineDiffRungModel['rungState'], theme: Required<LadderDiagramTheme>): string | undefined {
  if (rungState === 'added') {
    return theme.diffRungAddedWash;
  }

  if (rungState === 'removed') {
    return theme.diffRungRemovedWash;
  }

  return undefined;
}

export function InlineDiffRung({ model, width, yOffset = 0, theme: themeOverride }: InlineDiffRungProps) {
  const theme = useMemo(() => mergeTheme(themeOverride), [themeOverride]);
  const { diagramWidth, layout } = useMemo(
    () => prepareInlineDiffRungRenderLayout(model, { width, yOffset }),
    [model, width, yOffset],
  );
  const rungWash = getRungWash(model.rungState, theme);

  return (
    <svg
      width={diagramWidth}
      height={layout.height}
      viewBox={`0 0 ${diagramWidth} ${layout.height}`}
      role="img"
      aria-label={`Inline diff rung ${model.rungNumber}`}
      data-inline-diff-rung={model.rungNumber}
      data-state={model.rungState}
    >
      <rect x={0} y={0} width={diagramWidth} height={layout.height} fill={theme.rowEvenBg} />
      {rungWash && (
        <rect
          x={RUNG_NUMBER_WIDTH}
          y={0}
          width={diagramWidth - RUNG_NUMBER_WIDTH}
          height={layout.height}
          fill={rungWash}
          className="inline-diff-rung-wash"
        />
      )}

      <rect x={0} y={0} width={RUNG_NUMBER_WIDTH} height={layout.height} fill={theme.rungNumberBg} />
      <text
        x={RUNG_NUMBER_WIDTH / 2}
        y={layout.height / 2 + 4}
        textAnchor="middle"
        fontSize="11"
        fill={theme.rungNumberColor}
      >
        {model.rungNumber}
      </text>

      {layout.comment && model.commentChange && (
        <InlineTextChange
          x={layout.comment.x}
          y={layout.comment.y}
          width={layout.comment.width}
          height={layout.comment.height}
          change={model.commentChange}
          theme={theme}
          prefixLabel="Comment"
        />
      )}

      <line x1={layout.leftRailX} y1={0} x2={layout.leftRailX} y2={layout.height} stroke={theme.powerRailColor} strokeWidth={2} />
      <line x1={layout.rightRailX} y1={0} x2={layout.rightRailX} y2={layout.height} stroke={theme.powerRailColor} strokeWidth={2} />

      {layout.lines.map((line) => {
        const conditionsEndX = line.conditions.length > 0
          ? getNodeEndX(line.conditions[line.conditions.length - 1])
          : line.conditionsStartX;

        return (
          <g key={line.lineIndex} className="inline-diff-rung-line">
            <line
              x1={layout.leftRailX}
              y1={line.wireY}
              x2={line.conditionsStartX}
              y2={line.wireY}
              stroke={theme.wireColor}
              strokeWidth="1"
            />

            {line.conditions.map((node) => (
              <InlineDiffNodeRenderer key={node.id} layout={node} theme={theme} />
            ))}

            {line.operations.length > 0 ? (
              <>
                {line.operationsStartX > conditionsEndX && (
                  <line
                    x1={conditionsEndX}
                    y1={line.wireY}
                    x2={line.operationsStartX}
                    y2={line.wireY}
                    stroke={theme.wireColor}
                    strokeWidth="1"
                  />
                )}

                {line.operations.map((node) => (
                  <InlineDiffNodeRenderer key={node.id} layout={node} theme={theme} />
                ))}

                <line
                  x1={getNodeEndX(line.operations[line.operations.length - 1])}
                  y1={line.wireY}
                  x2={layout.rightRailX}
                  y2={line.wireY}
                  stroke={theme.wireColor}
                  strokeWidth="1"
                />
              </>
            ) : (
              <line
                x1={conditionsEndX}
                y1={line.wireY}
                x2={layout.rightRailX}
                y2={line.wireY}
                stroke={theme.wireColor}
                strokeWidth="1"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default InlineDiffRung;