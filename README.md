
# PLC Ladder Logic Visualizer  
  
A TypeScript module for parsing and visualizing Allen-Bradley/Rockwell PLC export data. This tool transforms raw controller JSON exports into interactive, human-readable visualizations.

---

## 🎨 Theming

The ladder-visualizer library is fully themeable using CSS custom properties and/or JavaScript theme objects.

### Installing Styles

Import the default styles in your application:

```typescript
// Import full stylesheet (includes CSS variables + base styles)
import 'ladder-visualizer/styles';

// Or import just the CSS variables for custom styling
import 'ladder-visualizer/styles/variables';
```

### Using CSS Variables

Override CSS custom properties in your CSS to customize the look:

```css
:root {
  /* Ladder diagram colors */
  --ladder-power-rail-color: #3366cc;
  --ladder-wire-color: #333333;
  --ladder-contact-color: #333333;
  --ladder-contact-nc-color: #d32f2f;
  --ladder-coil-color: #333333;
  --ladder-box-border-color: #666666;
  --ladder-box-bg-color: #ffffff;
  --ladder-box-text-color: #000000;
  --ladder-rung-number-bg: #f0f0f0;
  --ladder-rung-number-color: #666666;

  /* Table colors */
  --table-header-bg: linear-gradient(180deg, #f7f8fa 0%, #e3e7eb 100%);
  --table-header-text: #1e1e1e;
  --table-cell-bg: #ffffff;
  --table-cell-text: #1e1e1e;
  --table-row-hover-bg: #cce8ff;

  /* Navigator colors */
  --navigator-bg: #ffffff;
  --navigator-text: #1e1e1e;
  --navigator-item-hover-bg: #f5f5f5;
  --navigator-item-selected-bg: #e8f4fc;

  /* General UI */
  --lv-bg-primary: #ffffff;
  --lv-text-primary: #1e1e1e;
  --lv-border-default: #e0e0e0;
  --lv-font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  --lv-font-mono: 'Consolas', 'Monaco', monospace;
}
```

### Dark Mode with CSS Class

Apply the `.ladder-visualizer-dark` class for built-in dark mode:

```tsx
<div className={isDark ? 'ladder-visualizer-dark' : ''}>
  <VirtualizedLadderDiagram routine={routine} />
  <TagTable tags={tags} />
  <ProgramNavigator programs={programs} />
</div>
```

### Using Theme Props (JavaScript)

Pass theme objects directly to components for programmatic theming:

```tsx
import { 
  VirtualizedLadderDiagram, 
  DEFAULT_THEME, 
  DARK_THEME,
  type LadderDiagramTheme 
} from 'ladder-visualizer';

// Use preset dark theme
<VirtualizedLadderDiagram routine={routine} theme={DARK_THEME} />

// Or create a custom theme
const customTheme: LadderDiagramTheme = {
  powerRailColor: '#0078d4',
  wireColor: '#444444',
  boxBgColor: '#f8f8f8',
  boxBorderColor: '#888888',
  energizedColor: '#00cc00',
  energizedFill: '#aaffaa',
};

<VirtualizedLadderDiagram routine={routine} theme={customTheme} />
```

### Integration with Design Systems (e.g., ControlZebra)

Map your design system variables to ladder-visualizer:

```css
/* Map ControlZebra design tokens to ladder-visualizer */
:root {
  --ladder-power-rail-color: var(--theme-accent);
  --ladder-wire-color: var(--theme-secondary);
  --ladder-box-bg-color: var(--theme-surface);
  --ladder-box-text-color: var(--theme-primary);
  --ladder-box-border-color: var(--theme-border);
  --table-header-bg: var(--theme-surface-elevated);
  --navigator-bg: var(--theme-sidebar-bg);
}

.dark {
  /* Dark mode mappings */
  --ladder-power-rail-color: var(--theme-accent-light);
  --ladder-wire-color: var(--theme-text-secondary);
}
```

Or use JavaScript theme mapping:

```tsx
const controlZebraTheme: LadderDiagramTheme = {
  powerRailColor: 'var(--theme-accent)',
  wireColor: 'var(--theme-secondary)',
  boxBgColor: 'var(--theme-surface)',
  boxTextColor: 'var(--theme-primary)',
  boxBorderColor: 'var(--theme-border)',
};

<VirtualizedLadderDiagram routine={routine} theme={controlZebraTheme} />
```

### Available CSS Variables

| Category | Variables |
|----------|-----------|
| **Ladder Diagram** | `--ladder-power-rail-color`, `--ladder-wire-color`, `--ladder-contact-color`, `--ladder-contact-nc-color`, `--ladder-coil-color`, `--ladder-box-*`, `--ladder-rung-number-*` |
| **Tables** | `--table-header-*`, `--table-cell-*`, `--table-row-*`, `--table-filter-*`, `--badge-*-bg/text/border` |
| **Navigator** | `--navigator-bg`, `--navigator-text`, `--navigator-item-*`, `--navigator-badge-*` |
| **Structured Text** | `--st-bg`, `--st-text`, `--st-keyword-color`, `--st-type-color`, `--st-function-color`, `--st-string-color`, `--st-comment-color` |
| **General UI** | `--lv-bg-primary`, `--lv-text-primary`, `--lv-border-default`, `--lv-font-family`, `--lv-font-mono` |

See `src/styles/variables.css` for the complete list of available CSS custom properties.

---

## 📊 Data Categories & Visualization Strategy

Based on analysis of the controller export JSON, the following high-level categories exist:

| Category | Description | Visualization Type |
|----------|-------------|-------------------|
| **Controller Metadata** | Serial number, dates, SFC settings | Info Card / Header Panel |
| **Data Types** | PLC type definitions (BOOL, INT, TIMER, etc.) with member structures | Hierarchical Table |
| **Tags** | Controller-scoped variables with data types and access levels | Sortable/Filterable Table |
| **Programs & Routines** | Ladder logic rungs with instructions (RLL type) | **Ladder Diagram (SVG)** |
| **AOIs** | Add-On Instructions (user-defined function blocks) | Function Block Diagram + Table |
| **Map Devices** | I/O module hardware configuration | Tree View / Hardware Topology Diagram |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Application Shell                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │ Metadata │  │   Tags   │  │  Types   │  │     Devices      │ │
│  │  Panel   │  │  Table   │  │   Tree   │  │      Tree        │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                    Ladder Logic Visualizer                       │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  ─┤├─────┤├─────────────────────────────────────────( )──   │ │
│  │  ─┤├─────┤/├────[GEQ]────[CPT]──────────────────────( )──   │ │
│  │  ─┤├─────────────────────────────────────────────────────   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Language** | TypeScript | Type safety for complex PLC data structures |
| **Rendering** | SVG (via React) | Ladder diagrams, interactive elements |
| **Tables** | TanStack Table / AG Grid | Sortable, filterable tag tables |
| **Styling** | CSS Variables + Tailwind | Themeable components |
| **Bundler** | Vite + TSUP | Modern build tooling, library output |
| **Testing** | Vitest | Unit tests for parser and renderers |

---

## 📋 Detailed Implementation Plan

### Phase 1: Project Setup & Core Infrastructure
**Estimated Time: 2-3 days**

#### Task 1.1: Initialize Project Structure
- [ ] Initialize npm project with TypeScript configuration
- [ ] Set up Vite for development and TSUP for library bundling
- [ ] Configure ESLint + Prettier for code quality
- [ ] Create folder structure:
  ```
  src/
  ├── parsers/           # JSON parsing & normalization
  ├── types/             # TypeScript interfaces
  ├── components/        # React/Vanilla components
  │   ├── tables/        # Tag tables, data type views
  │   ├── diagrams/      # Ladder logic SVG renderer
  │   ├── trees/         # Hierarchical views
  │   └── panels/        # Info cards, metadata
  ├── renderers/         # SVG rendering engine
  ├── utils/             # Helper functions
  └── index.ts           # Public API exports
  ```

#### Task 1.2: Define TypeScript Interfaces
- [ ] Create `ControllerExport` root interface
- [ ] Create `DataType` interface with nested `Member` interface
- [ ] Create `Tag` interface
- [ ] Create `Program` interface with `Routine` and `Rung` interfaces
- [ ] Create `AOI` interface
- [ ] Create `MapDevice` interface
- [ ] Export all types from `types/index.ts`

---

### Phase 2: JSON Parser Module
**Estimated Time: 2-3 days**

#### Task 2.1: Build Core Parser
- [ ] Create `parseControllerExport(json: unknown): ControllerExport` function
- [ ] Add JSON validation with Zod or custom validators
- [ ] Implement error handling for malformed exports

#### Task 2.2: Build Ladder Logic Rung Parser
- [ ] Parse rung strings like `"GEQ(WBGT_Fahreheit,87)XIC(Associates_Classified_as_Heavy_Duty)OTE(ThresholdLimitReachHeavy_0to25);"`
- [ ] Extract instruction type: `XIC`, `XIO`, `OTE`, `OTL`, `OTU`, `GEQ`, `LIM`, `CPT`, `ATN`, `XPY`, etc.
- [ ] Extract operands/arguments for each instruction
- [ ] Build normalized `Instruction[]` array per rung
- [ ] Handle branch logic (parallel paths) if present in data

#### Task 2.3: Build Tag Reference Resolver
- [ ] Create cross-reference map: Tag Name → Tag Definition
- [ ] Resolve data types for complex tags (e.g., `AB:1769_IF4:C:0`)
- [ ] Build tag usage index (which rungs use which tags)

---

### Phase 3: Table Components (Tags & Data Types)
**Estimated Time: 3-4 days**

#### Task 3.1: Tag Table Component
- [ ] Create sortable table with columns:
  - Name
  - Tag Type (Base, Alias, etc.)
  - Data Type
  - Radix (Decimal, Float, Binary, etc.)
  - External Access (Read/Write, None, Read Only)
- [ ] Implement search/filter functionality
- [ ] Add data type grouping/filtering
- [ ] Implement row click → highlight usage in ladder

#### Task 3.2: Data Type Viewer
- [ ] Create expandable tree for complex types (TIMER, COUNTER, PID, etc.)
- [ ] Show member details:
  - Member Name
  - Data Type
  - Dimension (array size)
  - Radix
  - Hidden flag
  - External Access
- [ ] Differentiate between `ProductDefined` vs `User` defined types
- [ ] Add search across type names and members

#### Task 3.3: Program/Routine Selector
- [ ] Create sidebar with program list
- [ ] Show routines under each program
- [ ] Display routine type (RLL, FBD, ST, SFC)
- [ ] Navigate to routine view on click

---

### Phase 4: Ladder Logic SVG Renderer (Core Feature)
**Estimated Time: 5-7 days**

#### Task 4.1: Define Ladder Element SVG Symbols
- [ ] Create SVG `<symbol>` definitions for:
  - **XIC** (Normally Open Contact): `─┤ ├─`
  - **XIO** (Normally Closed Contact): `─┤/├─`
  - **OTE** (Output Energize): `─( )─`
  - **OTL** (Output Latch): `─(L)─`
  - **OTU** (Output Unlatch): `─(U)─`
  - **TON/TOF/RTO** (Timers): Boxed instruction
  - **CTU/CTD** (Counters): Boxed instruction
  - **GEQ/LEQ/EQU/NEQ/LIM** (Comparators): Boxed instruction
  - **CPT/MOV/ADD/SUB/MUL/DIV** (Math): Boxed instruction
  - **ATN/XPY/SQR** (Advanced Math): Boxed instruction
- [ ] Use consistent grid sizing (e.g., 100px per instruction block)

#### Task 4.2: Build Ladder Rendering Engine
- [ ] Create `LadderRenderer` class
- [ ] Input: Parsed routine with normalized instructions
- [ ] Output: SVG element or React component
- [ ] Render power rails (left and right vertical lines)
- [ ] Render horizontal rungs with instruction blocks
- [ ] Position instructions left-to-right based on execution order
- [ ] Handle line continuation for long rungs

#### Task 4.3: Implement Instruction Rendering
- [ ] Create `renderInstruction(instruction: Instruction): SVGElement` function
- [ ] Show instruction mnemonic (XIC, OTE, CPT, etc.)
- [ ] Display operands/tag names inside or below instruction
- [ ] Add tooltips with full operand details
- [ ] Style based on instruction category (input, output, function)

#### Task 4.4: Interactive Features
- [ ] Click on instruction → Show operand details panel
- [ ] Click on tag reference → Highlight in tag table
- [ ] Hover → Show data type and current value (if live data provided)
- [ ] Zoom and pan for large routines
- [ ] Rung number labels on left side

---

### Phase 5: Hardware/Device Visualization
**Estimated Time: 2 days**

#### Task 5.1: Map Device Tree View
- [ ] Parse `map_devices` array
- [ ] Create hierarchical view based on `parent_module` relationships
- [ ] Display:
  - Module ID
  - Slot Number
  - Vendor ID → Vendor Name lookup
  - Product Type → Type Name lookup
  - Product Code
- [ ] Expandable nodes for module details

#### Task 5.2: I/O Module Info Panel
- [ ] Show detailed module specifications on selection
- [ ] Link to associated tags (e.g., `Local:1:I`, `Local:1:C`)

---

### Phase 6: Controller Metadata & Info Panels
**Estimated Time: 1 day**

#### Task 6.1: Controller Info Header
- [ ] Display serial number
- [ ] Show created/modified dates
- [ ] Show SFC execution settings
- [ ] Comm path display

#### Task 6.2: Statistics Dashboard
- [ ] Total tag count by type
- [ ] Program/routine summary
- [ ] Data type usage breakdown
- [ ] Instruction usage frequency chart

---

### Phase 7: State Management & Live Data
**Estimated Time: 2-3 days**

#### Task 7.1: Create State Store
- [ ] Set up Zustand store for:
  - Loaded controller data
  - Selected program/routine
  - Search/filter state
  - UI preferences (zoom, theme)
- [ ] Define state selectors for components

#### Task 7.2: Live Data Integration (Optional)
- [ ] Define `LiveTagData` interface
- [ ] Create WebSocket or polling connector interface
- [ ] Update tag values in real-time
- [ ] Animate power flow in ladder diagram (energized paths glow green)

---

### Phase 8: Packaging & Distribution
**Estimated Time: 1-2 days**

#### Task 8.1: Library Build Configuration
- [ ] Configure TSUP for multiple output formats (ESM, CJS, UMD)
- [ ] Generate TypeScript declaration files
- [ ] Create tree-shakeable exports

#### Task 8.2: Documentation
- [ ] Write API documentation with JSDoc
- [ ] Create usage examples
- [ ] Add README with installation and quick start

#### Task 8.3: Demo Application
- [ ] Build standalone demo app
- [ ] Load sample `Cooker_1_AutoLogic_Program.L5X`
- [ ] Showcase all visualization components

---

## 📁 File Structure (Final)

```
ladder-visualizer/
├── src/
│   ├── types/
│   │   ├── controller.ts      # Root export interface
│   │   ├── data-types.ts      # DataType, Member interfaces
│   │   ├── tags.ts            # Tag interface
│   │   ├── programs.ts        # Program, Routine, Rung interfaces
│   │   ├── instructions.ts    # Parsed instruction types
│   │   ├── devices.ts         # MapDevice interface
│   │   └── index.ts           # Re-exports all types
│   │
│   ├── parsers/
│   │   ├── controller-parser.ts   # Main JSON parser
│   │   ├── rung-parser.ts         # Ladder rung string parser
│   │   ├── instruction-parser.ts  # Individual instruction parser
│   │   └── index.ts
│   │
│   ├── renderers/
│   │   ├── svg/
│   │   │   ├── symbols/           # SVG symbol definitions
│   │   │   │   ├── contacts.ts    # XIC, XIO symbols
│   │   │   │   ├── coils.ts       # OTE, OTL, OTU symbols
│   │   │   │   ├── boxes.ts       # Timer, Counter, Math blocks
│   │   │   │   └── index.ts
│   │   │   ├── ladder-renderer.ts # Main SVG rendering engine
│   │   │   └── rung-renderer.ts   # Single rung renderer
│   │   └── index.ts
│   │
│   ├── components/
│   │   ├── LadderDiagram.tsx      # Ladder logic viewer
│   │   ├── TagTable.tsx           # Sortable tag table
│   │   ├── DataTypeTree.tsx       # Data type explorer
│   │   ├── ProgramNavigator.tsx   # Routine selector sidebar
│   │   ├── DeviceTree.tsx         # I/O module tree
│   │   ├── ControllerInfo.tsx     # Metadata header
│   │   └── index.ts
│   │
│   ├── store/
│   │   ├── controller-store.ts    # Zustand store
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── tag-resolver.ts        # Tag cross-reference
│   │   ├── vendor-lookup.ts       # Vendor ID → name
│   │   └── index.ts
│   │
│   └── index.ts                   # Public API
│
├── examples/
│   └── Cooker_1_AutoLogic_Program.L5X  # Real-world sample data
│
├── tests/
│   ├── parsers/
│   └── renderers/
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tsup.config.ts
└── README.md
```

---

## 🗓️ Timeline Summary

| Phase | Tasks | Duration |
|-------|-------|----------|
| Phase 1 | Project Setup & Types | 2-3 days |
| Phase 2 | JSON Parser Module | 2-3 days |
| Phase 3 | Table Components | 3-4 days |
| Phase 4 | Ladder SVG Renderer | 5-7 days |
| Phase 5 | Device Visualization | 2 days |
| Phase 6 | Metadata & Panels | 1 day |
| Phase 7 | State & Live Data | 2-3 days |
| Phase 8 | Packaging & Docs | 1-2 days |
| **Total** | | **18-25 days** |

---

## 🚀 Getting Started (After Implementation)

```typescript
import { 
  parseControllerExport, 
  LadderDiagram, 
  TagTable 
} from 'ladder-visualizer';

// Parse the exported JSON
const controller = parseControllerExport(jsonData);

// Render components
<LadderDiagram routine={controller.programs[0].routines[0]} />
<TagTable tags={controller.tags} />
```

---

## 📚 References

- **Ladder Logic Symbols**: IEC 61131-3 standard
- **Rockwell Data Types**: Logix5000 Data Access Manual
- **Instruction Set**: Allen-Bradley Logix5000 Instruction Reference
