/**
 * PLC Ladder Logic Visualizer
 *
 * A TypeScript module for parsing and visualizing Allen-Bradley/Rockwell PLC export data.
 * 
 * ## Styling
 * 
 * Import the default styles to get the base theme:
 * ```ts
 * import 'ladder-visualizer/styles';
 * ```
 * 
 * Or import just the CSS variables for custom styling:
 * ```ts
 * import 'ladder-visualizer/styles/variables';
 * ```
 * 
 * Override CSS custom properties in your own CSS:
 * ```css
 * :root {
 *   --ladder-power-rail-color: #your-color;
 *   --ladder-wire-color: #your-gray;
 * }
 * ```
 * 
 * For dark mode, apply the `.ladder-visualizer-dark` class:
 * ```tsx
 * <div className={isDark ? 'ladder-visualizer-dark' : ''}>
 *   <VirtualizedLadderDiagram routine={routine} />
 * </div>
 * ```
 * 
 * Or pass theme props directly:
 * ```tsx
 * import { VirtualizedLadderDiagram, DARK_THEME } from 'ladder-visualizer';
 * 
 * <VirtualizedLadderDiagram 
 *   routine={routine} 
 *   theme={DARK_THEME}
 * />
 * ```
 */

// Export all types (including theme types)
export * from './types';

// Export parsers
export * from './parsers';

// Export diff engine
export * from './diff';

// Export shared ladder layout helpers
export * from './layout';

// Export React components
export * from './components';

// Export CSS defaults for programmatic theming
export { cssDefaults, ladderDefaults, tableDefaults, badgeDefaults, navigatorDefaults, controllerInfoDefaults, structuredTextDefaults, uiDefaults } from './styles/cssDefaults';
