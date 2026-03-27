# Ladder Visualizer - Copilot Instructions

## Project Overview

Ladder Visualizer is a TypeScript library for parsing, diffing, and rendering Allen-Bradley/Rockwell PLC ladder logic diagrams as React SVG components. It ships as a dual-format (ESM + CJS) npm package consumed by the **ControlZebra Desktop** app's L5X viewer.

**Current Status (March 2026):**
- **Version:** 1.0.0
- Parsing: JSON + L5X/L5K formats via pluggable parser registry
- Rendering: Virtualized SVG ladder diagrams, tag tables, structured text viewer
- Diffing: Controller-level structural diff + inline rung-level diff engine
- Theming: Full CSS variable system with light/dark presets

**Primary consumer:** ControlZebra Desktop (`frontend/src/viewers/` — linked via `file:../../ladder-visualizer`)

---

## Engineer Instructions

**Role**: You are a senior developer working on an industrial visualization library. Code must be correct, performant, and extensible — PLC engineers rely on accurate representations of their control logic.

### Core Principles

1. **Understand Before Building**
   - Read existing code before writing new code
   - Check `src/types/` for domain types, `src/parsers/` for format handling, `src/components/` for React components
   - The library uses a registry pattern extensively — check `InstructionRegistry` and `ParserRegistry` before adding hardcoded logic

2. **No Redundant Logic**
   - Reuse existing patterns: `InstructionRegistry` for instruction metadata, `ParserRegistry` for format support, normalized types for cross-format data
   - Don't duplicate what exists in the layout engine (`src/layout/`), diff engine (`src/diff/`), or style system (`src/styles/`)

3. **Don't Over-Abstract**
   - Solve the immediate problem cleanly
   - Add abstraction only when you see concrete repetition (rule of three)
   - Prefer simple, readable code over clever patterns

4. **Accuracy Over Aesthetics**
   - Ladder diagrams must faithfully represent PLC logic — a misrendered branch or missing instruction is a functional bug
   - Diff output must be structurally correct — false positives/negatives break user trust

### Before You Code

```
1. What does the user actually need? (the underlying goal, not just what they said)
2. Does this already exist in the codebase?
3. What's the minimal change to achieve this?
4. What existing patterns should I follow?
```

---

## Architecture

### Module Structure

| Module | Purpose |
|--------|---------|
| `src/parsers/` | File format parsing → `NormalizedController` |
| `src/types/` | Domain types, instruction registry, theme definitions |
| `src/components/` | React SVG rendering components |
| `src/layout/` | Rung layout calculation engine (positioning, dimensions) |
| `src/diff/` | Controller diffing + inline rung diff model |
| `src/styles/` | CSS variables, theme defaults |

### Parser System (Registry-Based)

The library supports multiple PLC export formats via a pluggable parser registry:

```
Input (JSON / L5X / L5K) → PLCParser → NormalizedController → Components
```

- **Interface:** `PLCParser` in `src/parsers/parser-interface.ts`
- **Registry:** `ParserRegistry` in `src/parsers/parser-registry.ts`
- **Format detection:** `src/parsers/format-detector.ts` — auto-detects input format
- **Unified API:** `parseFile()` / `parseString()` in `src/parsers/parse.ts`
- **JSON parser:** `src/parsers/json/` — parses Rockwell JSON exports
- **L5X parser:** `src/parsers/l5x/` — parses Rockwell L5X/L5K XML exports

All parsers produce `NormalizedController` — a vendor-agnostic domain model.

### Instruction Registry

Replaces hardcoded instruction arrays with an extensible registry:

- **Registry:** `InstructionRegistry` class in `src/types/instruction-registry.ts`
- **Global instance:** `globalInstructionRegistry`
- **AOI registration:** `src/parsers/aoi-registration.ts` — registers Add-On Instructions from parsed controller data
- **Categories:** `input`, `output`, `compare`, `math`, `timer`, `counter`, `aoi`, `other`
- **Symbol types:** `contact`, `coil`, `box`

**Adding a new instruction:** Register via `globalInstructionRegistry.register()` — never add to hardcoded arrays.

### Normalized Domain Types (`src/types/normalized/`)

| Type | Purpose |
|------|---------|
| `NormalizedController` | Root container — programs, tags, data types, modules, AOIs |
| `NormalizedProgram` | Named program with routines and scoped tags |
| `NormalizedRoutine` | Routine with rungs (ladder) or structured text |
| `NormalizedRung` | Single rung — comment + parsed elements (instructions, branches) |
| `NormalizedTag` | Tag with name, data type, value, scope |
| `NormalizedDataType` | UDT with members |
| `NormalizedAOI` | Add-On Instruction definition |
| `NormalizedModule` | I/O module configuration |

### Layout Engine (`src/layout/`)

Calculates SVG positioning for ladder diagrams:

- `calculateRungLayoutComplete()` — Full layout computation for a rung
- `calculateInstructionDimensions()` — Symbol width/height based on instruction type and operands
- `calculateBranchDimensions()` / `positionBranch()` — Parallel branch geometry
- `calculateMinDiagramWidth()` — Minimum canvas width

Layout types: `RungLayout`, `InstructionLayout`, `BranchGroupLayout`

### Diff Engine (`src/diff/`)

Two-level diffing system:

1. **Controller diff** (`diffControllers.ts`): Compares two `NormalizedController` instances, produces `L5XDiff` with per-section diffs (programs, tags, data types, AOIs, modules)
2. **Inline rung diff** (`src/diff/inline/`): Element-level diff within a single rung — classifies instructions as added/removed/replaced/text-modified, builds `InlineDiffRungModel` for rendering

Key exports: `diffControllers()`, `buildInlineDiffModel()`, `matchRungElements()`, `classifyInstructionChange()`

### Component Library (`src/components/`)

| Component | Purpose |
|-----------|---------|
| `VirtualizedLadderDiagram` | Main SVG ladder renderer with virtualized scrolling |
| `ContactSymbol` / `CoilSymbol` / `BoxSymbol` | SVG instruction symbols |
| `ProgramNavigator` | Program/routine tree selector with filtering and badges |
| `TagTable` | Sortable/filterable tag browser |
| `ControllerInfo` | Controller metadata display |
| `StructuredTextViewer` | ST code with syntax highlighting |
| `AOIParameterTable` / `AOILocalTagTable` | AOI inspection tables |
| `ModuleInfoTable` | I/O module configuration table |

**Diff components** live in `src/components/svg/diff/` for inline rung diff rendering.

### Theming System

- **CSS variables:** Defined in `src/styles/variables.css`, defaults in `src/styles/cssDefaults.ts`
- **Theme types:** `LadderDiagramTheme` in `src/types/theme.ts`
- **Presets:** `DEFAULT_THEME` (light), `DARK_THEME`
- **Context:** `LadderThemeContext` in `VirtualizedLadderDiagram.tsx` — use `useLadderTheme()` hook
- **Dark mode:** Apply `.ladder-visualizer-dark` CSS class or pass `DARK_THEME` via props

Theme categories: ladder (power rail, wire, contact, coil, box), table, badge, navigator, controller info, structured text, UI chrome.

---

## Development Commands

```bash
# Dev server (demo app on localhost)
npm run dev

# Build library for distribution (TSUP → dist/)
npm run build:lib

# TypeScript type checking
npm run typecheck

# Run tests (watch mode)
npm test

# Run tests (single run, CI)
npm run test:run

# Lint
npm run lint
```

---

## Key Conventions

### Code Style

- **Formatter:** Prettier — 2-space indent, single quotes, trailing commas (ES5), 100 char width
- **Linter:** ESLint with `@typescript-eslint` — `any` warned, unused vars with `_` prefix allowed
- **TypeScript:** Strict mode, no implicit any, no unused locals/parameters
- **Path alias:** `@/*` → `src/*`

### Adding a New Parser

1. Implement `PLCParser` interface from `src/parsers/parser-interface.ts`
2. Return `ParseResult<NormalizedController>` from `parse()`
3. Register in `src/parsers/parser-registry.ts` global instance
4. Add format detection logic in `src/parsers/format-detector.ts`
5. Export from `src/parsers/index.ts`
6. Add integration tests in `tests/parsers/`

### Adding a New Component

1. Create component in `src/components/` with typed props interface
2. Export both the component and its props type from `src/components/index.ts`
3. Use `useLadderTheme()` for theme-aware styling in SVG components
4. Add to demo app in `demo/App.tsx` for visual verification

### Adding a New Instruction

1. Register via `globalInstructionRegistry.register()` with mnemonic, category, display name, parameter labels, and symbol type
2. Never add to hardcoded arrays or switch statements
3. The layout engine and renderers use the registry automatically

### Testing Patterns

- **Framework:** Vitest with jsdom environment
- **Test location:** `tests/` mirroring `src/` structure
- **Fixtures:** Real controller data in `examples/` directory
- **Golden tests:** `*.golden.test.ts` files for regression testing of complex outputs
- **Helper functions:** Build test data with factory helpers (e.g., `instruction()`, `branch()`, `rung()`)
- **Run single test:** `npm exec -- vitest run tests/path/to/test.ts`

---

## File Structure

```
src/
  index.ts                    # Public API — re-exports all modules
  components/
    index.ts                  # Component exports
    ProgramNavigator.tsx      # Program/routine tree selector
    TagTable.tsx              # Tag browser table
    ControllerInfo.tsx        # Controller metadata panel
    StructuredTextViewer.tsx  # ST syntax highlighting viewer
    AOIParameterTable.tsx     # AOI parameter display
    AOILocalTagTable.tsx      # AOI local tag display
    ModuleInfoTable.tsx       # I/O module table
    svg/
      VirtualizedLadderDiagram.tsx  # Main ladder renderer (virtualized SVG)
      ContactSymbol.tsx       # Contact instruction SVG
      CoilSymbol.tsx          # Coil instruction SVG
      BoxSymbol.tsx           # Box instruction SVG
      diff/                   # Inline diff rendering components
    table/                    # Generic table primitives
  parsers/
    parse.ts                  # Unified parseFile() / parseString() API
    parser-interface.ts       # PLCParser interface contract
    parser-registry.ts        # Parser plugin registry
    format-detector.ts        # Auto-detect input format
    rung-parser.ts            # Rung text → instruction tree parser
    routine-parser.ts         # Routine-level parsing
    tag-resolver.ts           # Tag name resolution across scopes
    aoi-registration.ts       # Register AOIs into instruction registry
    json/                     # JSON format parser
    l5x/                      # L5X/L5K XML format parser
  types/
    index.ts                  # Type exports
    instructions.ts           # Instruction, BranchGroup, RungElement types
    instruction-registry.ts   # InstructionRegistry class + global instance
    theme.ts                  # LadderDiagramTheme, DEFAULT_THEME, DARK_THEME
    normalized/               # Vendor-agnostic domain model types
  layout/
    rungLayout.ts             # Layout calculation engine
    rungLayoutTypes.ts        # Layout result types
  diff/
    diffControllers.ts        # Controller-level diff
    matching.ts               # Key-based matching utilities
    types.ts                  # Diff result types (L5XDiff, RungDiff, etc.)
    inline/                   # Inline rung diff model builder
  styles/
    variables.css             # CSS variable definitions
    index.css                 # Base styles
    cssDefaults.ts            # Programmatic theme defaults
demo/
  App.tsx                     # Demo application
  main.tsx                    # Demo entry point
tests/                        # Test files mirroring src/ structure
examples/                     # Real controller export fixtures
```

---

## Build & Distribution

- **Build tool:** TSUP (produces `dist/index.js` ESM, `dist/index.cjs` CJS, `dist/index.d.ts` declarations)
- **CSS:** Manually copied to `dist/styles/` via TSUP `onSuccess` hook
- **Peer deps:** React 18, React DOM 18 (not bundled)
- **Linked consumption:** ControlZebra Desktop links via `file:../../ladder-visualizer` in its `package.json`
- **`prepare` script:** Runs `build:lib` on `npm install` so consumers always get fresh dist
