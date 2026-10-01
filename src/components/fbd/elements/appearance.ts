import type { LadderDiagramTheme } from '../../../types';

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
  value: { fontSize: 9, fontWeight: 400 },
  warning: { fontSize: 11, fontWeight: 600 },
  text: { fontSize: 11, fontWeight: 400 },
} as const;
export type FBDLabelRole = keyof typeof FBD_LABEL_STYLES;

// Measure the exact shared font in the browser. SSR uses a conservative bound.
let context: CanvasRenderingContext2D | null | undefined;
const widths = new Map<string, number>();
export function measureFBDText(text: string, role: FBDLabelRole): number {
  const { fontSize, fontWeight } = FBD_LABEL_STYLES[role];
  if (
    context === undefined &&
    typeof document !== 'undefined' &&
    typeof CanvasRenderingContext2D !== 'undefined'
  ) {
    context = document.createElement('canvas').getContext('2d');
  }
  if (!context) return [...text].length * fontSize * 1.2;
  const font = `${fontWeight} ${fontSize}px ${FBD_FONT_FAMILY}`;
  const key = `${font}:${text}`;
  const cached = widths.get(key);
  if (cached !== undefined) return cached;
  context.font = font;
  const metrics = context.measureText(text);
  const width = Math.ceil(
    Math.max(metrics.width, metrics.actualBoundingBoxLeft + metrics.actualBoundingBoxRight)
  );
  if (widths.size > 5000) widths.clear();
  widths.set(key, width);
  return width;
}
