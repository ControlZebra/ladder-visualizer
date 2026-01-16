export * from './symbols';
export { 
  renderLadderDiagram, 
  renderRung, 
  MIN_RUNG_HEIGHT, 
  RAIL_WIDTH,
  // New decoupled API
  renderDiagram,
  calculateLayout,
  LayoutEngine,
  createLayoutEngine,
  SVGRenderer,
  createSVGRenderer,
} from './ladder-renderer';

// Export types
export type { 
  RenderDiagramOptions,
  DiagramLayout, 
  LayoutOptions,
} from './ladder-renderer';

// Export SVG renderer module
export { renderLayoutToSVG } from './svg-renderer';
export type { SVGRenderOptions } from './svg-renderer';
