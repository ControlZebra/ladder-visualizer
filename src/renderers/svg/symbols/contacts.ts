/**
 * SVG symbol definitions for ladder logic contacts (XIC, XIO)
 */

/** Grid size for consistent spacing */
export const GRID_SIZE = 30;
export const SYMBOL_HEIGHT = 20;
export const SYMBOL_WIDTH = 30;

/** Character width for estimating text size */
export const CHAR_WIDTH_ESTIMATE = 7;

/** Minimum padding around text labels */
export const LABEL_PADDING = 10;

/**
 * Calculate the width needed for a contact/coil based on its label
 */
export function calculateSymbolWidth(label: string): number {
  const textWidth = label.length * CHAR_WIDTH_ESTIMATE;
  const minWidth = SYMBOL_WIDTH;
  return Math.max(minWidth, textWidth + LABEL_PADDING * 2);
}

/**
 * XIC (Normally Open Contact) symbol: ─┤ ├─
 */
export const ContactXIC = `
  <g>
    <line x1="0" y1="10" x2="7" y2="10" stroke="currentColor" stroke-width="1"/>
    <line x1="7" y1="2" x2="7" y2="18" stroke="currentColor" stroke-width="1"/>
    <line x1="23" y1="2" x2="23" y2="18" stroke="currentColor" stroke-width="1"/>
    <line x1="23" y1="10" x2="30" y2="10" stroke="currentColor" stroke-width="1"/>
  </g>
`;

/**
 * XIO (Normally Closed Contact) symbol: ─┤/├─
 */
export const ContactXIO = `
  <g>
    <line x1="0" y1="10" x2="7" y2="10" stroke="currentColor" stroke-width="1"/>
    <line x1="7" y1="2" x2="7" y2="18" stroke="currentColor" stroke-width="1"/>
    <line x1="10" y1="18" x2="20" y2="2" stroke="currentColor" stroke-width="1"/>
    <line x1="23" y1="2" x2="23" y2="18" stroke="currentColor" stroke-width="1"/>
    <line x1="23" y1="10" x2="30" y2="10" stroke="currentColor" stroke-width="1"/>
  </g>
`;

/**
 * Get contact symbol by mnemonic
 */
export function getContactSymbol(mnemonic: string): string {
  switch (mnemonic) {
    case 'XIC':
      return ContactXIC;
    case 'XIO':
      return ContactXIO;
    default:
      return ContactXIC;
  }
}
