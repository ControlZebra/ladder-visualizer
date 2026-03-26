/**
 * Theme types for ladder-visualizer components
 * 
 * Use these types to pass custom colors directly to components,
 * or rely on CSS custom properties for theming.
 */

/**
 * Theme configuration for ladder diagram SVG elements
 */
export interface LadderDiagramTheme {
  /** Power rail color (default: #3366cc) */
  powerRailColor?: string;
  /** Wire/line color (default: #333333) */
  wireColor?: string;
  /** Contact symbol color (default: #333333) */
  contactColor?: string;
  /** Normally-closed contact diagonal line color (default: #d32f2f) */
  contactNCColor?: string;
  /** Coil symbol color (default: #333333) */
  coilColor?: string;
  /** Box instruction border color (default: #666666) */
  boxBorderColor?: string;
  /** Box instruction background color (default: #ffffff) */
  boxBgColor?: string;
  /** Box instruction text color (default: #000000) */
  boxTextColor?: string;
  /** Rung number cell background (default: #f0f0f0) */
  rungNumberBg?: string;
  /** Rung number text color (default: #666666) */
  rungNumberColor?: string;
  /** Label text color (default: #333333) */
  labelColor?: string;
  /** Address text color (default: #666666) */
  addressColor?: string;
  /** Branch connector color (default: #333333) */
  branchConnectorColor?: string;
  /** Energized state stroke color (default: #00aa00) */
  energizedColor?: string;
  /** Energized state fill color (default: #90EE90) */
  energizedFill?: string;
  /** Diff added border/stroke color (default: #2e7d32) */
  diffAddedBorderColor?: string;
  /** Diff added fill color (default: #e8f5e9) */
  diffAddedFillColor?: string;
  /** Diff removed border/stroke color (default: #c62828) */
  diffRemovedBorderColor?: string;
  /** Diff removed fill color (default: #ffebee) */
  diffRemovedFillColor?: string;
  /** Neutral background for text-only diffs (default: #f5f5f5) */
  diffTextModifiedBg?: string;
  /** Old text color for inline diffs (default: #c62828) */
  diffOldTextColor?: string;
  /** New text color for inline diffs (default: #2e7d32) */
  diffNewTextColor?: string;
  /** Whole-rung wash for added rungs (default: rgba(46, 125, 50, 0.12)) */
  diffRungAddedWash?: string;
  /** Whole-rung wash for removed rungs (default: rgba(198, 40, 40, 0.12)) */
  diffRungRemovedWash?: string;
  /** Row background for even rows (default: #ffffff) */
  rowEvenBg?: string;
  /** Row background for odd rows (default: #fafafa) */
  rowOddBg?: string;
  /** Cell background for even rows (default: #f0f0f0) */
  cellEvenBg?: string;
  /** Cell background for odd rows (default: #e8e8e8) */
  cellOddBg?: string;
  /** Primary background color (default: #ffffff) */
  bgPrimary?: string;
  /** Border color (default: #c0c0c0) */
  borderColor?: string;
  /** Muted text color (default: #999999) */
  textMuted?: string;
}

/**
 * Default light theme values
 */
export const DEFAULT_THEME: Required<LadderDiagramTheme> = {
  powerRailColor: '#3366cc',
  wireColor: '#333333',
  contactColor: '#333333',
  contactNCColor: '#d32f2f',
  coilColor: '#333333',
  boxBorderColor: '#666666',
  boxBgColor: '#ffffff',
  boxTextColor: '#000000',
  rungNumberBg: '#f0f0f0',
  rungNumberColor: '#666666',
  labelColor: '#333333',
  addressColor: '#666666',
  branchConnectorColor: '#333333',
  energizedColor: '#00aa00',
  energizedFill: '#90EE90',
  diffAddedBorderColor: '#2e7d32',
  diffAddedFillColor: '#e8f5e9',
  diffRemovedBorderColor: '#c62828',
  diffRemovedFillColor: '#ffebee',
  diffTextModifiedBg: '#f5f5f5',
  diffOldTextColor: '#c62828',
  diffNewTextColor: '#2e7d32',
  diffRungAddedWash: 'rgba(46, 125, 50, 0.12)',
  diffRungRemovedWash: 'rgba(198, 40, 40, 0.12)',
  rowEvenBg: '#ffffff',
  rowOddBg: '#fafafa',
  cellEvenBg: '#f0f0f0',
  cellOddBg: '#e8e8e8',
  bgPrimary: '#ffffff',
  borderColor: '#c0c0c0',
  textMuted: '#999999',
};

/**
 * Dark theme preset
 */
export const DARK_THEME: Required<LadderDiagramTheme> = {
  powerRailColor: '#5588ee',
  wireColor: '#cccccc',
  contactColor: '#cccccc',
  contactNCColor: '#ff6b6b',
  coilColor: '#cccccc',
  boxBorderColor: '#888888',
  boxBgColor: '#2d2d2d',
  boxTextColor: '#e0e0e0',
  rungNumberBg: '#2a2a2a',
  rungNumberColor: '#aaaaaa',
  labelColor: '#cccccc',
  addressColor: '#aaaaaa',
  branchConnectorColor: '#cccccc',
  energizedColor: '#44dd44',
  energizedFill: '#2a5a2a',
  diffAddedBorderColor: '#7ad67f',
  diffAddedFillColor: 'rgba(46, 125, 50, 0.24)',
  diffRemovedBorderColor: '#ff8a80',
  diffRemovedFillColor: 'rgba(198, 40, 40, 0.22)',
  diffTextModifiedBg: '#2f3237',
  diffOldTextColor: '#ff8a80',
  diffNewTextColor: '#7ad67f',
  diffRungAddedWash: 'rgba(46, 125, 50, 0.18)',
  diffRungRemovedWash: 'rgba(198, 40, 40, 0.18)',
  rowEvenBg: '#1e1e1e',
  rowOddBg: '#252525',
  cellEvenBg: '#2a2a2a',
  cellOddBg: '#252525',
  bgPrimary: '#1e1e1e',
  borderColor: '#555555',
  textMuted: '#777777',
};

/**
 * Merge a partial theme with defaults
 */
export function mergeTheme(theme?: LadderDiagramTheme): Required<LadderDiagramTheme> {
  if (!theme) return DEFAULT_THEME;
  return { ...DEFAULT_THEME, ...theme };
}

/**
 * Contact symbol theme props
 */
export interface ContactThemeProps {
  /** Stroke color for contact lines (default: #333333) */
  color?: string;
  /** Stroke color for normally-closed diagonal (default: inherits from color) */
  ncColor?: string;
  /** Energized state stroke color */
  energizedColor?: string;
  /** Energized state fill color */
  energizedFill?: string;
}

/**
 * Coil symbol theme props
 */
export interface CoilThemeProps {
  /** Stroke color for coil (default: #333333) */
  color?: string;
  /** Energized state stroke color */
  energizedColor?: string;
  /** Energized state fill color */
  energizedFill?: string;
}

/**
 * Box symbol theme props
 */
export interface BoxThemeProps {
  /** Border/stroke color (default: currentColor) */
  borderColor?: string;
  /** Background fill color (default: none) */
  bgColor?: string;
  /** Text color (default: inherits from borderColor) */
  textColor?: string;
  /** Energized state stroke color */
  energizedColor?: string;
}
