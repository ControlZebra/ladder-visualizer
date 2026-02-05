# Ladder Visualizer Theming Task List

> **Purpose**: Make ladder-visualizer fully themeable so ControlZebra can apply its design system via npm link  
> **Estimated Effort**: 3-4 days  
> **Priority**: High

---

## Overview

Currently, ladder-visualizer uses hardcoded inline styles with fixed colors. To integrate properly with ControlZebra's theming system (Tailwind CSS + CSS custom properties), we need to:

1. Replace hardcoded colors with CSS custom properties
2. Export a default CSS file that consumers can override
3. Make React components accept optional theme/className props
4. Ensure proper peer dependency configuration for React

---

## Task Checklist

### 1. Create CSS Custom Properties System

**File to create**: `src/styles/variables.css`

```css
:root {
  /* ============================================
   * LADDER DIAGRAM COLORS
   * ============================================ */
  
  /* Power rails */
  --ladder-power-rail-color: #3366cc;
  --ladder-power-rail-width: 4px;
  
  /* Wires and connections */
  --ladder-wire-color: #333333;
  --ladder-wire-width: 1px;
  --ladder-branch-connector-color: #333333;
  
  /* Rung numbers */
  --ladder-rung-number-bg: #f0f0f0;
  --ladder-rung-number-color: #666666;
  --ladder-rung-number-font-size: 11px;
  
  /* Contact symbols */
  --ladder-contact-color: #333333;
  --ladder-contact-nc-color: #d32f2f;  /* Normally closed (/) */
  
  /* Coil symbols */
  --ladder-coil-color: #333333;
  --ladder-coil-fill: none;
  
  /* Box symbols (instructions) */
  --ladder-box-border-color: #666666;
  --ladder-box-bg-color: #ffffff;
  --ladder-box-text-color: #000000;
  --ladder-box-label-color: #333333;
  
  /* ============================================
   * TABLE COLORS
   * ============================================ */
  
  /* Header */
  --table-header-bg: linear-gradient(180deg, #f7f8fa 0%, #e3e7eb 100%);
  --table-header-text: #1e1e1e;
  --table-header-border: #a0a0a0;
  
  /* Cells */
  --table-cell-bg: #ffffff;
  --table-cell-text: #1e1e1e;
  --table-cell-border: #e0e0e0;
  --table-row-alt-bg: #f5f5f5;
  --table-row-hover-bg: #cce8ff;
  --table-row-selected-bg: #0078d4;
  --table-row-selected-text: #ffffff;
  
  /* Filter input */
  --table-filter-bg: #ffffff;
  --table-filter-border: #7a7a7a;
  --table-filter-text: #1e1e1e;
  
  /* ============================================
   * NAVIGATOR COLORS
   * ============================================ */
  
  /* Tree view */
  --navigator-bg: #ffffff;
  --navigator-text: #1e1e1e;
  --navigator-text-secondary: #666666;
  --navigator-border: #e0e0e0;
  --navigator-item-hover-bg: #f5f5f5;
  --navigator-item-selected-bg: #e8f4fc;
  --navigator-item-selected-border: #0078d4;
  
  /* Badge */
  --navigator-badge-bg: #f0f0f0;
  --navigator-badge-text: #666666;
  
  /* ============================================
   * GENERAL UI COLORS
   * ============================================ */
  
  /* Backgrounds */
  --lv-bg-primary: #ffffff;
  --lv-bg-secondary: #f5f5f5;
  --lv-bg-elevated: #ffffff;
  
  /* Text */
  --lv-text-primary: #1e1e1e;
  --lv-text-secondary: #666666;
  --lv-text-muted: #999999;
  
  /* Borders */
  --lv-border-default: #e0e0e0;
  --lv-border-strong: #a0a0a0;
  
  /* Typography */
  --lv-font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  --lv-font-mono: 'Consolas', 'Monaco', monospace;
  --lv-font-size-sm: 11px;
  --lv-font-size-base: 12px;
  --lv-font-size-md: 13px;
}

/* Dark theme preset (consumers can use or override) */
.ladder-visualizer-dark {
  --ladder-power-rail-color: #5588ee;
  --ladder-wire-color: #cccccc;
  --ladder-contact-color: #cccccc;
  --ladder-contact-nc-color: #ff6b6b;
  --ladder-coil-color: #cccccc;
  --ladder-box-border-color: #888888;
  --ladder-box-bg-color: #2d2d2d;
  --ladder-box-text-color: #e0e0e0;
  --ladder-box-label-color: #cccccc;
  --ladder-rung-number-bg: #2a2a2a;
  --ladder-rung-number-color: #aaaaaa;
  
  --table-header-bg: linear-gradient(180deg, #3a3a3a 0%, #2d2d2d 100%);
  --table-header-text: #e0e0e0;
  --table-header-border: #555555;
  --table-cell-bg: #1e1e1e;
  --table-cell-text: #e0e0e0;
  --table-cell-border: #3a3a3a;
  --table-row-alt-bg: #252525;
  --table-row-hover-bg: #3a3a3a;
  
  --navigator-bg: #1e1e1e;
  --navigator-text: #e0e0e0;
  --navigator-text-secondary: #aaaaaa;
  --navigator-border: #3a3a3a;
  --navigator-item-hover-bg: #2d2d2d;
  --navigator-item-selected-bg: #264f78;
  
  --lv-bg-primary: #1e1e1e;
  --lv-bg-secondary: #252525;
  --lv-text-primary: #e0e0e0;
  --lv-text-secondary: #aaaaaa;
  --lv-border-default: #3a3a3a;
}
```

**File to create**: `src/styles/index.css`
```css
@import './variables.css';

/* Base reset for ladder-visualizer components */
.ladder-visualizer {
  font-family: var(--lv-font-family);
  font-size: var(--lv-font-size-base);
  color: var(--lv-text-primary);
  background: var(--lv-bg-primary);
}
```

- [ ] Create `src/styles/variables.css` with all CSS custom properties
- [ ] Create `src/styles/index.css` that imports variables
- [ ] Export CSS from package.json: `"style": "dist/styles/index.css"`
- [ ] Update tsup.config.ts to copy CSS files to dist

---

### 2. Update VirtualizedLadderDiagram.tsx

**Location**: `src/components/svg/VirtualizedLadderDiagram.tsx`

Replace hardcoded constants with CSS variable references:

```tsx
// BEFORE:
const POWER_RAIL_COLOR = '#3366cc';

// AFTER:
// For SVG, we need to read CSS variables at runtime or accept as props
export interface LadderDiagramTheme {
  powerRailColor?: string;
  wireColor?: string;
  contactColor?: string;
  contactNCColor?: string;
  coilColor?: string;
  boxBorderColor?: string;
  boxBgColor?: string;
  boxTextColor?: string;
  rungNumberBg?: string;
  rungNumberColor?: string;
}

const DEFAULT_THEME: LadderDiagramTheme = {
  powerRailColor: '#3366cc',
  wireColor: '#333333',
  contactColor: '#333333',
  contactNCColor: '#d32f2f',
  coilColor: '#333333',
  boxBorderColor: '#666666',
  boxBgColor: '#ffffff',
  boxTextColor: '#000000',
  rungNumberBg: '#f0f0f0',
  rungNumberColor: '#666666',
};
```

**Tasks:**

- [ ] Create `LadderDiagramTheme` interface in `src/types/theme.ts`
- [ ] Add optional `theme` prop to `VirtualizedLadderDiagramProps`
- [ ] Add optional `className` prop for container styling
- [ ] Replace all hardcoded color strings with theme object lookups
- [ ] Create `useLadderTheme()` hook that reads CSS variables as fallback
- [ ] Update `ContactSymbol`, `CoilSymbol`, `BoxSymbol` to accept color props
- [ ] Document theme props in JSDoc

**Specific lines to update:**

| Line | Current | Change to |
|------|---------|-----------|
| 32 | `const POWER_RAIL_COLOR = '#3366cc';` | Use `theme.powerRailColor` |
| SVG strokes | `stroke="#333"` | `stroke={theme.wireColor}` |
| Rung number bg | `fill="#f0f0f0"` | `fill={theme.rungNumberBg}` |

---

### 3. Update Symbol Components ✅

**Location**: `src/components/svg/ContactSymbol.tsx`, `CoilSymbol.tsx`, `BoxSymbol.tsx`

**Status: COMPLETE** - All symbol components already have theme props implemented:

- [x] Add `color` prop to `ContactSymbol` (default: `'#333333'`)
- [x] Add `ncColor` prop to `ContactSymbol` for normally-closed (default: inherits from color)
- [x] Add `energizedColor` and `energizedFill` props to `ContactSymbol`
- [x] Add `color` prop to `CoilSymbol` (default: `'#333333'`)
- [x] Add `energizedColor` and `energizedFill` props to `CoilSymbol`
- [x] Add `borderColor`, `bgColor`, `textColor` props to `BoxSymbol`
- [x] Add `energizedColor` prop to `BoxSymbol`
- [x] Update SVG `stroke` and `fill` attributes to use props
- [x] Theme types defined in `src/types/theme.ts` (`ContactThemeProps`, `CoilThemeProps`, `BoxThemeProps`)

Example for ContactSymbol:
```tsx
export interface ContactSymbolProps extends ContactThemeProps {
  mnemonic: 'XIC' | 'XIO' | string;
  energized?: boolean;
}

export function ContactSymbol({ 
  mnemonic, 
  energized = false,
  color = '#333333',
  ncColor,
  energizedColor = '#00aa00',
  energizedFill = '#90EE90',
}: ContactSymbolProps) {
  // Uses color, ncColor, energizedColor, energizedFill in SVG rendering
}
```

---

### 4. Update tableStyles.ts ✅

**Location**: `src/components/table/tableStyles.ts`

**Status: COMPLETE** - All hardcoded colors replaced with CSS variable references:

- [x] Replace all hardcoded colors with `var(--table-*)` references
- [x] Update `tableStyles.header` to use CSS variables
- [x] Update `tableStyles.cell` to use CSS variables
- [x] Update `tableStyles.filterInput` to use CSS variables
- [x] Update `tableStyles.rowHoverBg` and `alternateRowBg`
- [x] Update `badgeStyles` colors to use CSS variables
- [x] Add optional `className` support to GenericTable (already existed)
- [x] Add dark mode badge colors to `variables.css`

CSS Variables used:
```css
/* Header */
--table-header-bg
--table-header-text
--table-header-border
--table-header-border-right

/* Cells */
--table-cell-bg
--table-cell-text
--table-cell-border
--table-cell-border-right
--table-row-alt-bg
--table-row-hover-bg

/* Filter */
--table-filter-bg
--table-filter-border
--table-filter-text
--table-container-border
--table-count-text

/* Badges */
--badge-input-bg, --badge-input-text, --badge-input-border
--badge-output-bg, --badge-output-text, --badge-output-border
--badge-inout-bg, --badge-inout-text, --badge-inout-border

/* Typography */
--lv-font-family
--lv-font-mono
```

---

### 5. Update ProgramNavigator.tsx ✅

**Location**: `src/components/ProgramNavigator.tsx`

**Status: COMPLETE** - All inline styles replaced with CSS variable references:

- [x] Extract inline styles to use CSS variables
- [x] Add optional `className` prop to `ProgramNavigatorProps` (already existed)
- [x] Update `containerStyle` object to use CSS variables
- [x] Update `headerStyle` to use CSS variables
- [x] Update TreeItem hover/selected states to use CSS variables
- [x] Update badge styling to use CSS variables
- [x] Add JSDoc documenting theme props

CSS Variables used:
```css
/* Container */
--navigator-bg
--navigator-border
--navigator-text
--lv-font-family

/* Header */
--navigator-header-bg
--navigator-header-text
--navigator-header-border
--lv-font-size-base

/* Tree items */
--navigator-item-hover-bg
--navigator-item-selected-bg
--navigator-item-selected-border

/* Badges */
--navigator-badge-bg
--navigator-badge-text
--lv-font-size-sm
```

---

### 6. Update ControllerInfo.tsx ✅

**Location**: `src/components/ControllerInfo.tsx`

**Status: COMPLETE** - All inline styles replaced with CSS variable references:

- [x] Replace inline `cardStyle` colors with CSS variables
- [x] Add optional `className` prop (already existed)
- [x] Update property label/value colors to use CSS variables
- [x] Add JSDoc documenting theme props

CSS Variables used:
```css
--controller-info-bg
--controller-info-border
--controller-info-title-color
--controller-info-label-color
--controller-info-value-color
--lv-font-family
```

---

### 7. Update StructuredTextViewer.tsx ✅

**Location**: `src/components/StructuredTextViewer.tsx`

**Status: COMPLETE** - All syntax highlighting colors replaced with CSS variable references:

- [x] Add CSS variables for syntax highlighting colors
- [x] Add `className` prop support (already existed)
- [x] Ensure background and text colors are themeable
- [x] Add JSDoc documenting theme props

CSS Variables used:
```css
/* Container */
--st-bg
--st-text
--st-line-number-color
--st-line-number-border
--st-empty-state-color
--lv-font-mono

/* Syntax highlighting */
--st-keyword-color
--st-type-color
--st-function-color
--st-string-color
--st-number-color
--st-comment-color
--st-operator-color
--st-identifier-color
```

---

### 8. Update Package Configuration ✅

**Location**: `package.json`

**Status: COMPLETE** - Package configuration already has all required fields:

- [x] Add `"style"` field pointing to CSS file (`"style": "dist/styles/index.css"`)
- [x] Ensure `peerDependencies` includes React 18
- [x] Add CSS files to `"files"` array
- [x] Configure `exports` for styles sub-paths
- [x] Add `sideEffects` for CSS files

```json
{
  "main": "dist/index.js",
  "module": "dist/index.mjs", 
  "types": "dist/index.d.ts",
  "style": "dist/styles/index.css",
  "sideEffects": ["*.css"],
  "files": [
    "dist",
    "dist/styles"
  ],
  "peerDependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  }
}
```

---

### 9. Update tsup.config.ts ✅

**Location**: `tsup.config.ts`

**Status: COMPLETE** - Build configuration already copies CSS files:

- [x] Add CSS copying to build process (`onSuccess` hook)
- [x] Ensure styles directory is included in output

```ts
import { defineConfig } from 'tsup';
import { copyFileSync, mkdirSync } from 'fs';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'react-dom'],
  onSuccess: async () => {
    // Copy CSS files
    mkdirSync('dist/styles', { recursive: true });
    copyFileSync('src/styles/variables.css', 'dist/styles/variables.css');
    copyFileSync('src/styles/index.css', 'dist/styles/index.css');
  },
});
```

---

### 10. Export Theme Types ✅

**Location**: `src/types/theme.ts`

**Status: COMPLETE** - Theme types and presets already implemented:

- [x] Create `src/types/theme.ts` with comprehensive theme interface
- [x] Export theme types from `src/types/index.ts`
- [x] Export `DEFAULT_THEME` and `DARK_THEME` presets
- [x] Export `mergeTheme()` utility function
- [x] Include `ContactThemeProps`, `CoilThemeProps`, `BoxThemeProps`

Exported types include:
- `LadderDiagramTheme` - Full theme configuration
- `ContactThemeProps`, `CoilThemeProps`, `BoxThemeProps` - Component-specific props
- `DEFAULT_THEME` - Light theme preset (Required<LadderDiagramTheme>)
- `DARK_THEME` - Dark theme preset (Required<LadderDiagramTheme>)
- `mergeTheme(theme?)` - Merge partial theme with defaults

---

### 11. Update Main Exports ✅

**Location**: `src/index.ts`

**Status: COMPLETE** - Main exports already include theme types and JSDoc documentation:

- [x] Export theme types and presets (via `export * from './types'`)
- [x] Add CSS import instruction in JSDoc
- [x] Export `cssDefaults` for programmatic access to default values

The main entry point includes comprehensive JSDoc documentation explaining:
- How to import styles (`import 'ladder-visualizer/styles'`)
- How to import just variables (`import 'ladder-visualizer/styles/variables'`)
- How to override CSS custom properties
- How to use dark mode class
- How to pass theme props directly

---

### 12. Update README.md ✅

**Status: COMPLETE** - README now includes comprehensive theming documentation:

- [x] Add "Theming" section explaining CSS variables
- [x] Document how to override colors
- [x] Add example for dark mode (CSS class approach)
- [x] Add ControlZebra integration example (both CSS and JS approaches)
- [x] Add JavaScript theme props examples
- [x] Add CSS variables reference table by category
- [x] Document `DEFAULT_THEME` and `DARK_THEME` usage

---

## Testing Checklist

After completing the tasks above:

- [ ] Build library: `npm run build:lib`
- [ ] Link to test project: `npm link` then `npm link ladder-visualizer`
- [ ] Verify default theme renders correctly
- [ ] Verify CSS variable overrides work
- [ ] Verify theme prop overrides work
- [ ] Test dark mode preset
- [ ] Test with ControlZebra's Tailwind variables

### Quick Test Commands

```bash
cd ladder-visualizer
npm run build:lib
npm link

# In ControlZebra or test project
npm link ladder-visualizer
```

---

## ControlZebra Integration Example

Once theming is complete, ControlZebra can integrate like this:

```tsx
// ControlZebra's LadderViewer.tsx
import 'ladder-visualizer/dist/styles/index.css';
import { VirtualizedLadderDiagram, parseString } from 'ladder-visualizer';

// Map ControlZebra's CSS variables to ladder-visualizer
const controlZebraTheme = {
  powerRailColor: 'var(--theme-accent)',
  wireColor: 'var(--theme-secondary)',
  boxBgColor: 'var(--theme-surface)',
  boxTextColor: 'var(--theme-primary)',
  boxBorderColor: 'var(--theme-border)',
};

function LadderViewer({ filePath }: ViewerProps) {
  // ... load and parse file
  
  return (
    <div className="ladder-visualizer dark:ladder-visualizer-dark">
      <VirtualizedLadderDiagram 
        routine={routine}
        theme={controlZebraTheme}
        className="h-full w-full"
      />
    </div>
  );
}
```

Or via CSS only:

```css
/* ControlZebra's index.css */
@import 'ladder-visualizer/dist/styles/index.css';

:root {
  --ladder-power-rail-color: var(--theme-accent);
  --ladder-wire-color: var(--theme-secondary);
  --ladder-box-bg-color: var(--theme-surface);
  /* Map all variables */
}

.dark {
  --ladder-power-rail-color: var(--theme-accent);
  /* Dark mode mappings */
}
```

---

## Questions for Product/Design

1. Should icons (folder, program, routine) also be themeable, or keep Studio 5000 style?
2. Should we support multiple theme presets (light, dark, high-contrast)?
3. Are there specific ControlZebra brand colors that should be defaults?

---

## Definition of Done

- [x] All components accept optional `className` prop
- [x] All components accept optional `theme` prop (where applicable)
- [x] CSS variables file exported from package
- [x] Dark mode preset included
- [x] README updated with theming docs
- [x] No hardcoded colors remain in component files (use CSS variables)
- [x] TypeScript types exported for theme objects
- [ ] Tested with ControlZebra integration

### Remaining Task

Only the integration testing with ControlZebra remains. Run the testing checklist above to verify everything works end-to-end.
