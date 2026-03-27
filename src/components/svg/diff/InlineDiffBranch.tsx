import type { LadderDiagramTheme } from '../../../types';
import type { InlineDiffBranchLayout, InlineDiffNodeLayout } from '../../../layout';
import { BRANCH_CONNECTOR_OFFSET } from '../../../layout';
import { InlineDiffInstruction } from './InlineDiffInstruction';

export interface InlineDiffBranchProps {
  layout: InlineDiffBranchLayout;
  theme: Required<LadderDiagramTheme>;
}

function getTintColors(state: InlineDiffBranchLayout['state'] | InlineDiffBranchLayout['legs'][number]['state'], theme: Required<LadderDiagramTheme>) {
  if (state === 'added') {
    return {
      stroke: theme.diffAddedBorderColor,
      fill: theme.diffAddedFillColor,
    };
  }

  if (state === 'removed') {
    return {
      stroke: theme.diffRemovedBorderColor,
      fill: theme.diffRemovedFillColor,
    };
  }

  return {
    stroke: 'transparent',
    fill: 'transparent',
  };
}

function getBranchConnectorStroke(state: InlineDiffBranchLayout['state'], theme: Required<LadderDiagramTheme>) {
  if (state === 'added') {
    return theme.diffAddedBorderColor;
  }

  if (state === 'removed') {
    return theme.diffRemovedBorderColor;
  }

  return theme.branchConnectorColor;
}

function getLegWireStroke(state: InlineDiffBranchLayout['legs'][number]['state'], theme: Required<LadderDiagramTheme>) {
  if (state === 'added') {
    return theme.diffAddedBorderColor;
  }

  if (state === 'removed') {
    return theme.diffRemovedBorderColor;
  }

  return theme.wireColor;
}

function InlineDiffNodeRenderer({ layout, theme }: { layout: InlineDiffNodeLayout; theme: Required<LadderDiagramTheme> }) {
  if (layout.kind === 'instruction') {
    return <InlineDiffInstruction layout={layout} theme={theme} />;
  }

  return <InlineDiffBranch layout={layout} theme={theme} />;
}

export function InlineDiffBranch({ layout, theme }: InlineDiffBranchProps) {
  if (layout.legs.length === 0) {
    return null;
  }

  const topY = layout.legs[0].wireY;
  const bottomY = layout.legs[layout.legs.length - 1].wireY;
  const connectorStroke = getBranchConnectorStroke(layout.state, theme);

  return (
    <g data-inline-diff-node="branch" data-state={layout.state}>
      {layout.legs.length > 1 && (
        <>
          <line
            x1={layout.connectorLeftX}
            y1={topY}
            x2={layout.connectorLeftX}
            y2={bottomY}
            stroke={connectorStroke}
            strokeWidth="1"
            className="branch-connector"
          />
          <line
            x1={layout.connectorRightX}
            y1={topY}
            x2={layout.connectorRightX}
            y2={bottomY}
            stroke={connectorStroke}
            strokeWidth="1"
            className="branch-connector"
          />
        </>
      )}

      {layout.legs.map((leg) => {
        const legColors = getTintColors(leg.state, theme);
        const legWireStroke = getLegWireStroke(leg.state, theme);

        return (
          <g key={leg.id} data-inline-diff-leg={leg.id} data-state={leg.state}>
            {(leg.state === 'added' || leg.state === 'removed') && (
              <rect
                x={layout.connectorLeftX}
                y={leg.y}
                width={layout.connectorRightX - layout.connectorLeftX}
                height={leg.height}
                rx={4}
                fill={legColors.fill}
                stroke={legColors.stroke}
                strokeWidth={1}
                className="inline-diff-leg-tint"
              />
            )}

            <line
              x1={layout.connectorLeftX}
              y1={leg.wireY}
              x2={leg.contentStartX}
              y2={leg.wireY}
              stroke={legWireStroke}
              strokeWidth="1"
            />

            {leg.nodes.map((node) => (
              <InlineDiffNodeRenderer key={node.id} layout={node} theme={theme} />
            ))}

            {leg.contentEndX < layout.connectorRightX - BRANCH_CONNECTOR_OFFSET && (
              <line
                x1={leg.contentEndX}
                y1={leg.wireY}
                x2={layout.connectorRightX - BRANCH_CONNECTOR_OFFSET}
                y2={leg.wireY}
                stroke={legWireStroke}
                strokeWidth="1"
              />
            )}

            <line
              x1={layout.connectorRightX - BRANCH_CONNECTOR_OFFSET}
              y1={leg.wireY}
              x2={layout.connectorRightX}
              y2={leg.wireY}
              stroke={legWireStroke}
              strokeWidth="1"
            />
          </g>
        );
      })}
    </g>
  );
}

export default InlineDiffBranch;