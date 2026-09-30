import type { LadderDiagramTheme } from '../../types';

export const FBD_FONT_FAMILY = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

/** Shared node surface for the regular and comparison viewers. */
export function fbdNodeBackground(theme: Required<LadderDiagramTheme>): string {
  return `color-mix(in srgb, ${theme.rungNumberBg} 50%, ${theme.boxBgColor})`;
}

export const FBD_LABEL_STYLES = {
  title: { fontSize: 11, fontWeight: 600 },
  subtitle: { fontSize: 11, fontWeight: 500 },
  terminal: { fontSize: 11, fontWeight: 400 },
  port: { fontSize: 10, fontWeight: 400 },
  footer: { fontSize: 9, fontWeight: 400 },
  text: { fontSize: 11, fontWeight: 400 },
} as const;
export type FBDLabelRole = keyof typeof FBD_LABEL_STYLES;
