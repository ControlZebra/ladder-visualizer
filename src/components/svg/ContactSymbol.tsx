import type { ContactThemeProps } from '../../types/theme';

/** Default colors for different states */
const DEFAULT_WIRE_COLOR = '#333333';
const DEFAULT_ENERGIZED_COLOR = '#00aa00';
const DEFAULT_ENERGIZED_FILL = '#90EE90';

export interface ContactSymbolProps extends ContactThemeProps {
  mnemonic: 'XIC' | 'XIO' | string;
  energized?: boolean;
}

/**
 * React SVG component for ladder logic contacts (XIC, XIO)
 * 
 * @param mnemonic - Contact type: 'XIC' (normally open) or 'XIO' (normally closed)
 * @param energized - Whether the contact is energized (active)
 * @param color - Override stroke color for contact lines (default: #333)
 * @param ncColor - Override color for normally-closed diagonal (default: inherits from color)
 * @param energizedColor - Override energized state stroke color (default: #00aa00)
 * @param energizedFill - Override energized state fill color (default: #90EE90)
 */
export function ContactSymbol({ 
  mnemonic, 
  energized = false,
  color = DEFAULT_WIRE_COLOR,
  ncColor,
  energizedColor = DEFAULT_ENERGIZED_COLOR,
  energizedFill = DEFAULT_ENERGIZED_FILL,
}: ContactSymbolProps) {
  const strokeColor = energized ? energizedColor : color;
  const strokeWidth = energized ? 2 : 1.5;
  const fillColor = energized ? energizedFill : 'transparent';
  // NC diagonal uses ncColor if provided, otherwise same as stroke
  const ncDiagonalColor = energized ? energizedColor : (ncColor || color);

  if (mnemonic === 'XIO') {
    // XIO (Normally Closed Contact) symbol: ─┤/├─
    return (
      <g className={`contact contact-xio ${energized ? 'energized' : ''}`}>
        {energized && <rect x="6" y="0" width="18" height="20" fill={fillColor} rx="2" />}
        <line x1="0" y1="10" x2="8" y2="10" stroke={strokeColor} strokeWidth={strokeWidth} />
        <line x1="8" y1="2" x2="8" y2="18" stroke={strokeColor} strokeWidth={strokeWidth} />
        <line x1="10" y1="18" x2="20" y2="2" stroke={ncDiagonalColor} strokeWidth={strokeWidth} />
        <line x1="22" y1="2" x2="22" y2="18" stroke={strokeColor} strokeWidth={strokeWidth} />
        <line x1="22" y1="10" x2="30" y2="10" stroke={strokeColor} strokeWidth={strokeWidth} />
      </g>
    );
  }

  // XIC (Normally Open Contact) symbol: ─┤ ├─ (default)
  return (
    <g className={`contact contact-xic ${energized ? 'energized' : ''}`}>
      {energized && <rect x="6" y="0" width="18" height="20" fill={fillColor} rx="2" />}
      <line x1="0" y1="10" x2="8" y2="10" stroke={strokeColor} strokeWidth={strokeWidth} />
      <line x1="8" y1="2" x2="8" y2="18" stroke={strokeColor} strokeWidth={strokeWidth} />
      <line x1="22" y1="2" x2="22" y2="18" stroke={strokeColor} strokeWidth={strokeWidth} />
      <line x1="22" y1="10" x2="30" y2="10" stroke={strokeColor} strokeWidth={strokeWidth} />
    </g>
  );
}

export default ContactSymbol;
