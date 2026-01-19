/**
 * Ladder Renderer - Main entry point for ladder diagram rendering
 * 
 * This module provides the public API for rendering ladder diagrams.
 * It uses a decoupled architecture:
 * - LayoutEngine: calculates positions and dimensions
 * - SVGRenderer: renders the layout to SVG
 */

import type { Rung } from '../../types';

// Import the layout engine
import { LayoutEngine, createLayoutEngine } from '../layout';
import type { DiagramLayout, LayoutOptions } from '../layout';

// Import the SVG renderer
import { SVGRenderer, createSVGRenderer } from './svg-renderer';

// ============================================================================
// CONSTANTS (exported for use by other components)
// ============================================================================

/** Rung number cell width (Studio 5000 style) */
export const RUNG_NUMBER_WIDTH = 30;

/** Power rail X offset from edge */
export const RAIL_WIDTH = 8;

/** Power rail visual width */
export const RAIL_VISUAL_WIDTH = 4;

/** Minimum rung height */
export const MIN_RUNG_HEIGHT = 80;

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Options for diagram rendering
 */
export interface RenderDiagramOptions {
  /** Total diagram width */
  width?: number;
}

/**
 * Render a ladder diagram using the decoupled layout engine and SVG renderer.
 * 
 * @param rungs - The rungs to render
 * @param options - Rendering options
 * @returns Object containing the SVG string and the computed layout
 */
export function renderDiagram(
  rungs: Rung[],
  options: RenderDiagramOptions = {}
): { svg: string; layout: DiagramLayout } {
  const { width = 800 } = options;

  // Calculate layout
  const layoutEngine = createLayoutEngine({ width });
  const layout = layoutEngine.calculateDiagramLayout(rungs);
  
  // Render to SVG
  const svgRenderer = createSVGRenderer();
  const svg = svgRenderer.render(layout);

  return { svg, layout };
}

/**
 * Calculate layout only, without rendering.
 * Useful for custom renderers or for getting layout information.
 */
export function calculateLayout(rungs: Rung[], options: LayoutOptions = {}): DiagramLayout {
  const layoutEngine = createLayoutEngine(options);
  return layoutEngine.calculateDiagramLayout(rungs);
}

// Re-export the layout engine and SVG renderer for direct use
export { LayoutEngine, createLayoutEngine, SVGRenderer, createSVGRenderer };
export type { DiagramLayout, LayoutOptions };
