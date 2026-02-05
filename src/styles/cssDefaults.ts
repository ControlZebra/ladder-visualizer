/**
 * Default values for CSS custom properties.
 * 
 * These values match the definitions in variables.css and should be used
 * as fallbacks when referencing CSS variables in component styles.
 * 
 * This ensures consistency between the CSS file and inline fallbacks,
 * making it easier to maintain and update colors across the library.
 * 
 * @example
 * ```tsx
 * import { cssDefaults } from '../styles/cssDefaults';
 * 
 * const style = {
 *   backgroundColor: `var(--navigator-bg, ${cssDefaults.navigator.bg})`,
 * };
 * ```
 */

// ============================================================================
// LADDER DIAGRAM
// ============================================================================

export const ladderDefaults = {
  powerRailColor: '#3366cc',
  powerRailWidth: '4px',
  wireColor: '#333333',
  wireWidth: '1px',
  branchConnectorColor: '#333333',
  rungNumberBg: '#f0f0f0',
  rungNumberColor: '#666666',
  rungNumberFontSize: '11px',
  contactColor: '#333333',
  contactNcColor: '#d32f2f',
  coilColor: '#333333',
  coilFill: 'none',
  boxBorderColor: '#666666',
  boxBgColor: '#ffffff',
  boxTextColor: '#000000',
  boxLabelColor: '#333333',
  labelColor: '#333333',
  addressColor: '#666666',
  energizedColor: '#00aa00',
  energizedFill: '#90EE90',
} as const;

// ============================================================================
// TABLE
// ============================================================================

export const tableDefaults = {
  headerBg: 'linear-gradient(180deg, #f7f8fa 0%, #e3e7eb 100%)',
  headerText: '#1e1e1e',
  headerBorder: '#a0a0a0',
  headerBorderRight: '#d0d0d0',
  cellBg: '#ffffff',
  cellText: '#1e1e1e',
  cellBorder: '#e0e0e0',
  cellBorderRight: '#e8e8e8',
  rowAltBg: '#f5f5f5',
  rowHoverBg: '#cce8ff',
  rowSelectedBg: '#0078d4',
  rowSelectedText: '#ffffff',
  filterBg: '#ffffff',
  filterBorder: '#7a7a7a',
  filterText: '#1e1e1e',
  containerBorder: '#a0a0a0',
  countText: '#444444',
} as const;

// ============================================================================
// BADGES
// ============================================================================

export const badgeDefaults = {
  inputBg: '#dff0d8',
  inputText: '#3c763d',
  inputBorder: '#b2dba1',
  outputBg: '#f2dede',
  outputText: '#a94442',
  outputBorder: '#dca7a7',
  inoutBg: '#d9edf7',
  inoutText: '#31708f',
  inoutBorder: '#9acfea',
} as const;

// ============================================================================
// NAVIGATOR
// ============================================================================

export const navigatorDefaults = {
  bg: '#ffffff',
  text: '#1e1e1e',
  textSecondary: '#666666',
  border: '#e0e0e0',
  itemHoverBg: '#f5f5f5',
  itemSelectedBg: '#e8f4fc',
  itemSelectedBorder: '#0078d4',
  badgeBg: '#f0f0f0',
  badgeText: '#666666',
  headerBg: '#1e3f6f',
  headerText: '#ffffff',
  headerBorder: '#2b579a',
} as const;

// ============================================================================
// CONTROLLER INFO
// ============================================================================

export const controllerInfoDefaults = {
  bg: '#ffffff',
  border: '#e0e0e0',
  titleColor: '#1e1e1e',
  labelColor: '#333333',
  valueColor: '#000000',
} as const;

// ============================================================================
// STRUCTURED TEXT VIEWER
// ============================================================================

export const structuredTextDefaults = {
  bg: '#ffffff',
  text: '#333333',
  lineNumberColor: '#999999',
  lineNumberBorder: '#e0e0e0',
  emptyStateColor: '#666666',
  keywordColor: '#0000ff',
  typeColor: '#267f99',
  functionColor: '#795e26',
  stringColor: '#a31515',
  numberColor: '#098658',
  commentColor: '#008000',
  operatorColor: '#333333',
  identifierColor: '#001080',
} as const;

// ============================================================================
// GENERAL UI
// ============================================================================

export const uiDefaults = {
  bgPrimary: '#ffffff',
  bgSecondary: '#f5f5f5',
  bgElevated: '#ffffff',
  bgRowEven: '#ffffff',
  bgRowOdd: '#fafafa',
  bgCellEven: '#f0f0f0',
  bgCellOdd: '#e8e8e8',
  textPrimary: '#1e1e1e',
  textSecondary: '#666666',
  textMuted: '#999999',
  borderDefault: '#e0e0e0',
  borderStrong: '#c0c0c0',
  borderSubtle: '#444444',
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  fontMono: "'Consolas', 'Monaco', monospace",
  fontSizeSm: '11px',
  fontSizeBase: '12px',
  fontSizeMd: '13px',
} as const;

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const cssDefaults = {
  ladder: ladderDefaults,
  table: tableDefaults,
  badge: badgeDefaults,
  navigator: navigatorDefaults,
  controllerInfo: controllerInfoDefaults,
  structuredText: structuredTextDefaults,
  ui: uiDefaults,
} as const;

export default cssDefaults;
