import type { InlineTextChange as InlineTextChangeModel } from '../../../diff';
import type { LadderDiagramTheme } from '../../../types';

export interface InlineTextChangeProps {
  x: number;
  y: number;
  width: number;
  height: number;
  change: InlineTextChangeModel;
  theme: Required<LadderDiagramTheme>;
  prefixLabel?: string;
}

export function InlineTextChange({
  x,
  y,
  width,
  height,
  change,
  theme,
  prefixLabel,
}: InlineTextChangeProps) {
  const prefix = prefixLabel ? `${prefixLabel}: ` : '';

  const oldAnchorX = x + 8;
  const labelY = y + height / 2 + 3;

  return (
    <g data-inline-diff-text-change="comment">
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        fill={theme.diffTextModifiedBg}
        stroke={theme.borderColor}
        strokeWidth={1}
      />
      <text
        x={oldAnchorX}
        y={labelY}
        fontSize="10"
        fill={theme.textMuted}
      >
        {prefix}
      </text>
      <text
        x={oldAnchorX + prefix.length * 6.25}
        y={labelY}
        fontSize="10"
        fill={theme.diffOldTextColor}
        textDecoration="line-through"
      >
        {change.oldText}
      </text>
      <text
        x={x + width / 2}
        y={labelY}
        textAnchor="middle"
        fontSize="9"
        fill={theme.textMuted}
      >
        {'->'}
      </text>
      <text
        x={x + width - 8}
        y={labelY}
        textAnchor="end"
        fontSize="10"
        fill={theme.diffNewTextColor}
        fontWeight="700"
      >
        {change.newText}
      </text>
    </g>
  );
}

export default InlineTextChange;