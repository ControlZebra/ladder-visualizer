import type { ContactThemeProps } from '../../types/theme';
import { DEFAULT_THEME } from '../../types/theme';

export interface ContactSymbolProps extends ContactThemeProps {
  mnemonic: 'XIC' | 'XIO' | string;
  energized?: boolean;
}

/**
 * React SVG component for ladder logic contacts (XIC, XIO)
 * 
 * @param mnemonic - Contact type: 'XIC' (normally open) or 'XIO' (normally closed)
 * @param energized - Whether the contact is energized (active)
 * @param color - Override stroke color for contact lines (default: DEFAULT_THEME.contactColor)
 * @param ncColor - Override color for normally-closed diagonal (default: inherits from color)
 * @param energizedColor - Override energized state stroke color (default: DEFAULT_THEME.energizedColor)
 * @param energizedFill - Override energized state fill color (default: DEFAULT_THEME.energizedFill)
 */
export function ContactSymbol({ 
  mnemonic, 
  energized = false,
  color = DEFAULT_THEME.contactColor,
  ncColor,
  energizedColor = DEFAULT_THEME.energizedColor,
  energizedFill = DEFAULT_THEME.energizedFill,
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
