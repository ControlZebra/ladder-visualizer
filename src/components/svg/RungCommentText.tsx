import type { InlineDiffCommentLayout, RungCommentLayout } from '../../layout';
import type { LadderDiagramTheme } from '../../types';

interface RungCommentTextProps {
  layout: RungCommentLayout | InlineDiffCommentLayout;
  theme: Required<LadderDiagramTheme>;
  className?: string;
}

export function RungCommentText({ layout, theme, className }: RungCommentTextProps) {
  const centerX = layout.x + layout.width / 2;
  const firstBaselineY = layout.y + 11;
  const oldLines = 'oldLines' in layout ? layout.oldLines ?? [] : [];
  const newLines = 'newLines' in layout ? layout.newLines ?? [] : [];
  const isDiffComment = oldLines.length > 0 || newLines.length > 0;

  if (isDiffComment) {
    const newStartY = firstBaselineY + oldLines.length * layout.lineHeight;

    return (
      <g className={className} data-rung-comment="true" data-inline-diff-native-text="comment">
        {oldLines.length > 0 && (
          <text
            x={centerX}
            y={firstBaselineY}
            fontSize="10"
            fill={theme.diffOldTextColor}
            xmlSpace="preserve"
            textAnchor="middle"
            textDecoration="line-through"
            data-inline-diff-text-row="old"
          >
            {oldLines.map((line, index) => (
              <tspan key={`old-${index}-${line}`} x={centerX} dy={index === 0 ? 0 : layout.lineHeight}>
                {line.length > 0 ? line : ' '}
              </tspan>
            ))}
          </text>
        )}

        {newLines.length > 0 && (
          <text
            x={centerX}
            y={newStartY}
            fontSize="11"
            fontWeight="700"
            fill={theme.diffNewTextColor}
            xmlSpace="preserve"
            textAnchor="middle"
            data-inline-diff-text-row="new"
          >
            {newLines.map((line, index) => (
              <tspan key={`new-${index}-${line}`} x={centerX} dy={index === 0 ? 0 : layout.lineHeight}>
                {line.length > 0 ? line : ' '}
              </tspan>
            ))}
          </text>
        )}
      </g>
    );
  }

  return (
    <text
      x={centerX}
      y={firstBaselineY}
      fontSize="11"
      fill={theme.labelColor}
      xmlSpace="preserve"
      textAnchor="middle"
      className={className}
      data-rung-comment="true"
    >
      {layout.lines.map((line, index) => (
        <tspan key={`${index}-${line}`} x={centerX} dy={index === 0 ? 0 : layout.lineHeight}>
          {line.length > 0 ? line : ' '}
        </tspan>
      ))}
    </text>
  );
}

export default RungCommentText;