import type React from 'react';
import { tableDefaults, badgeDefaults, uiDefaults } from '../../styles/cssDefaults';

/**
 * Shared styles for all table components.
 * Windows .NET DataGridView inspired look and feel.
 * 
 * All colors use CSS custom properties for theming support.
 * Override these in your CSS:
 * 
 * ```css
 * :root {
 *   --table-header-bg: linear-gradient(180deg, #f7f8fa 0%, #e3e7eb 100%);
 *   --table-header-text: #1e1e1e;
 *   --table-header-border: #a0a0a0;
 *   --table-header-border-right: #d0d0d0;
 *   --table-cell-bg: #ffffff;
 *   --table-cell-text: #1e1e1e;
 *   --table-cell-border: #e0e0e0;
 *   --table-cell-border-right: #e8e8e8;
 *   --table-row-alt-bg: #f5f5f5;
 *   --table-row-hover-bg: #cce8ff;
 *   --table-filter-bg: #ffffff;
 *   --table-filter-border: #7a7a7a;
 *   --table-filter-text: #1e1e1e;
 *   --table-count-text: #444444;
 *   --table-container-border: #a0a0a0;
 *   --lv-font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
 * }
 * ```
 */

export const tableStyles = {
  /** Wrapper style for the entire table component - takes full parent height */
  wrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    height: '100%',
    overflow: 'hidden',
    minHeight: 0,
  } satisfies React.CSSProperties,

  /** Table header cell style - Windows .NET style blue gradient header */
  header: {
    padding: '6px 8px',
    textAlign: 'left' as const,
    cursor: 'pointer',
    background: `var(--table-header-bg, ${tableDefaults.headerBg})`,
    borderBottom: `1px solid var(--table-header-border, ${tableDefaults.headerBorder})`,
    borderRight: `1px solid var(--table-header-border-right, ${tableDefaults.headerBorderRight})`,
    fontWeight: 600,
    fontSize: '12px',
    fontFamily: `var(--lv-font-family, ${uiDefaults.fontFamily})`,
    userSelect: 'none' as const,
    color: `var(--table-header-text, ${tableDefaults.headerText})`,
    whiteSpace: 'nowrap' as const,
  } satisfies React.CSSProperties,

  /** Sticky header cell style - stays at top when scrolling */
  stickyHeader: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 1,
  } satisfies React.CSSProperties,

  /** Sticky thead wrapper */
  stickyThead: {
    position: 'sticky' as const,
    top: 0,
    zIndex: 1,
  } satisfies React.CSSProperties,

  /** Table body cell style - Windows grid cell */
  cell: {
    padding: '4px 8px',
    borderBottom: `1px solid var(--table-cell-border, ${tableDefaults.cellBorder})`,
    borderRight: `1px solid var(--table-cell-border-right, ${tableDefaults.cellBorderRight})`,
    fontSize: '12px',
    fontFamily: `var(--lv-font-family, ${uiDefaults.fontFamily})`,
    color: `var(--table-cell-text, ${tableDefaults.cellText})`,
    backgroundColor: `var(--table-cell-bg, ${tableDefaults.cellBg})`,
  } satisfies React.CSSProperties,

  /** Monospace cell style (for code-like values) - now uses default font */
  monoCell: {
    fontFamily: `var(--lv-font-mono, var(--lv-font-family, ${uiDefaults.fontFamily}))`,
  } satisfies React.CSSProperties,

  /** Bold cell style */
  boldCell: {
    fontWeight: 600,
  } satisfies React.CSSProperties,

  /** Truncated text cell style */
  truncatedCell: {
    maxWidth: '200px',
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  } satisfies React.CSSProperties,

  /** Filter input style - Windows textbox */
  filterInput: {
    padding: '4px 8px',
    width: '100%',
    maxWidth: '250px',
    border: `1px solid var(--table-filter-border, ${tableDefaults.filterBorder})`,
    borderRadius: '0px',
    fontSize: '12px',
    fontFamily: `var(--lv-font-family, ${uiDefaults.fontFamily})`,
    backgroundColor: `var(--table-filter-bg, ${tableDefaults.filterBg})`,
    color: `var(--table-filter-text, ${tableDefaults.filterText})`,
  } satisfies React.CSSProperties,

  /** Filter container style */
  filterContainer: {
    marginBottom: '8px',
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '8px',
    flexShrink: 0,
  } satisfies React.CSSProperties,

  /** Count text style */
  countText: {
    color: `var(--table-count-text, ${tableDefaults.countText})`,
    fontSize: '12px',
    fontFamily: `var(--lv-font-family, ${uiDefaults.fontFamily})`,
  } satisfies React.CSSProperties,

  /** Table container style - Windows DataGridView border with scroll */
  tableContainer: {
    flex: 1,
    overflowY: 'auto' as const,
    overflowX: 'auto' as const,
    border: `1px solid var(--table-container-border, ${tableDefaults.containerBorder})`,
    backgroundColor: `var(--table-cell-bg, ${tableDefaults.cellBg})`,
    minHeight: 0,
  } satisfies React.CSSProperties,

  /** Table element style */
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '12px',
    backgroundColor: `var(--table-cell-bg, ${tableDefaults.cellBg})`,
  } satisfies React.CSSProperties,

  /** Clickable row style */
  clickableRow: {
    cursor: 'pointer',
  } satisfies React.CSSProperties,

  /** Default row style */
  defaultRow: {
    cursor: 'default',
  } satisfies React.CSSProperties,

  /** Row hover background color - Windows selection blue */
  rowHoverBg: `var(--table-row-hover-bg, ${tableDefaults.rowHoverBg})`,

  /** Alternating row background - light gray */
  alternateRowBg: `var(--table-row-alt-bg, ${tableDefaults.rowAltBg})`,
};

/**
 * Badge styles for usage indicators (Input/Output/InOut) - Windows .NET style
 * 
 * Override these CSS variables for custom badge colors:
 * 
 * ```css
 * :root {
 *   --badge-input-bg: #dff0d8;
 *   --badge-input-text: #3c763d;
 *   --badge-input-border: #b2dba1;
 *   --badge-output-bg: #f2dede;
 *   --badge-output-text: #a94442;
 *   --badge-output-border: #dca7a7;
 *   --badge-inout-bg: #d9edf7;
 *   --badge-inout-text: #31708f;
 *   --badge-inout-border: #9acfea;
 * }
 * ```
 */
export const badgeStyles = {
  base: {
    padding: '1px 6px',
    borderRadius: '2px',
    fontSize: '11px',
    fontWeight: 500,
    fontFamily: `var(--lv-font-family, ${uiDefaults.fontFamily})`,
    border: '1px solid',
  } satisfies React.CSSProperties,

  input: {
    backgroundColor: `var(--badge-input-bg, ${badgeDefaults.inputBg})`,
    color: `var(--badge-input-text, ${badgeDefaults.inputText})`,
    borderColor: `var(--badge-input-border, ${badgeDefaults.inputBorder})`,
  } satisfies React.CSSProperties,

  output: {
    backgroundColor: `var(--badge-output-bg, ${badgeDefaults.outputBg})`,
    color: `var(--badge-output-text, ${badgeDefaults.outputText})`,
    borderColor: `var(--badge-output-border, ${badgeDefaults.outputBorder})`,
  } satisfies React.CSSProperties,

  inout: {
    backgroundColor: `var(--badge-inout-bg, ${badgeDefaults.inoutBg})`,
    color: `var(--badge-inout-text, ${badgeDefaults.inoutText})`,
    borderColor: `var(--badge-inout-border, ${badgeDefaults.inoutBorder})`,
  } satisfies React.CSSProperties,
};

/**
 * Get badge style for a usage type
 */
export function getUsageBadgeStyle(usage: string): React.CSSProperties {
  const usageLower = usage.toLowerCase();
  let colorStyle: React.CSSProperties;

  if (usageLower === 'input') {
    colorStyle = badgeStyles.input;
  } else if (usageLower === 'output') {
    colorStyle = badgeStyles.output;
  } else {
    colorStyle = badgeStyles.inout;
  }

  return { ...badgeStyles.base, ...colorStyle };
}

/**
 * Combine multiple style objects
 */
export function combineStyles(...styles: (React.CSSProperties | undefined)[]): React.CSSProperties {
  return Object.assign({}, ...styles.filter(Boolean));
}

/**
 * Get row style with alternating background
 */
export function getRowStyle(index: number, isClickable: boolean): React.CSSProperties {
  return {
    ...(isClickable ? tableStyles.clickableRow : tableStyles.defaultRow),
    backgroundColor: index % 2 === 1 ? tableStyles.alternateRowBg : undefined,
  };
}
