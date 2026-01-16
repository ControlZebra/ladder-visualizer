/**
 * SVG symbol definitions for ladder logic contacts (XIC, XIO)
 * Studio 5000 style with energized state support
 */

/** Grid size for consistent spacing */
export const GRID_SIZE = 30;
export const SYMBOL_HEIGHT = 20;
export const SYMBOL_WIDTH = 30;

/** Character width for estimating text size */
export const CHAR_WIDTH_ESTIMATE = 7;

/** Minimum padding around text labels */
export const LABEL_PADDING = 10;

/** Colors for different states */
const WIRE_COLOR = '#333';
const ENERGIZED_COLOR = '#00aa00';
const ENERGIZED_FILL = '#90EE90';

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
 * Studio 5000 style with cleaner lines
 */
export const ContactXIC = `
  <g class="contact contact-xic">
    <line x1="0" y1="10" x2="8" y2="10" stroke="${WIRE_COLOR}" stroke-width="1.5"/>
    <line x1="8" y1="2" x2="8" y2="18" stroke="${WIRE_COLOR}" stroke-width="1.5"/>
    <line x1="22" y1="2" x2="22" y2="18" stroke="${WIRE_COLOR}" stroke-width="1.5"/>
    <line x1="22" y1="10" x2="30" y2="10" stroke="${WIRE_COLOR}" stroke-width="1.5"/>
  </g>
`;

/**
 * XIC Energized (Normally Open Contact - ON): ─┤ ├─ with green fill
 */
export const ContactXICEnergized = `
  <g class="contact contact-xic energized">
    <rect x="6" y="0" width="18" height="20" fill="${ENERGIZED_FILL}" rx="2"/>
    <line x1="0" y1="10" x2="8" y2="10" stroke="${ENERGIZED_COLOR}" stroke-width="2"/>
    <line x1="8" y1="2" x2="8" y2="18" stroke="${ENERGIZED_COLOR}" stroke-width="2"/>
    <line x1="22" y1="2" x2="22" y2="18" stroke="${ENERGIZED_COLOR}" stroke-width="2"/>
    <line x1="22" y1="10" x2="30" y2="10" stroke="${ENERGIZED_COLOR}" stroke-width="2"/>
  </g>
`;

/**
 * XIO (Normally Closed Contact) symbol: ─┤/├─
 */
export const ContactXIO = `
  <g class="contact contact-xio">
    <line x1="0" y1="10" x2="8" y2="10" stroke="${WIRE_COLOR}" stroke-width="1.5"/>
    <line x1="8" y1="2" x2="8" y2="18" stroke="${WIRE_COLOR}" stroke-width="1.5"/>
    <line x1="10" y1="18" x2="20" y2="2" stroke="${WIRE_COLOR}" stroke-width="1.5"/>
    <line x1="22" y1="2" x2="22" y2="18" stroke="${WIRE_COLOR}" stroke-width="1.5"/>
    <line x1="22" y1="10" x2="30" y2="10" stroke="${WIRE_COLOR}" stroke-width="1.5"/>
  </g>
`;

/**
 * XIO Energized (Normally Closed Contact - ON)
 */
export const ContactXIOEnergized = `
  <g class="contact contact-xio energized">
    <rect x="6" y="0" width="18" height="20" fill="${ENERGIZED_FILL}" rx="2"/>
    <line x1="0" y1="10" x2="8" y2="10" stroke="${ENERGIZED_COLOR}" stroke-width="2"/>
    <line x1="8" y1="2" x2="8" y2="18" stroke="${ENERGIZED_COLOR}" stroke-width="2"/>
    <line x1="10" y1="18" x2="20" y2="2" stroke="${ENERGIZED_COLOR}" stroke-width="1.5"/>
    <line x1="22" y1="2" x2="22" y2="18" stroke="${ENERGIZED_COLOR}" stroke-width="2"/>
    <line x1="22" y1="10" x2="30" y2="10" stroke="${ENERGIZED_COLOR}" stroke-width="2"/>
  </g>
`;

/**
 * Get contact symbol by mnemonic
 * @param mnemonic - The instruction mnemonic (XIC, XIO)
 * @param energized - Whether the contact is in energized state
 */
export function getContactSymbol(mnemonic: string, energized: boolean = false): string {
  switch (mnemonic) {
    case 'XIC':
      return energized ? ContactXICEnergized : ContactXIC;
    case 'XIO':
      return energized ? ContactXIOEnergized : ContactXIO;
    default:
      return ContactXIC;
  }
}
