# Ladder Visualizer - Architecture Analysis Report

## Executive Summary

This report provides an in-depth analysis of the `ladder-visualizer` codebase, identifying architectural flaws, limitations, and potential scaling issues. The library parses and visualizes Allen-Bradley/Rockwell PLC ladder logic from JSON exports. While functional for its current scope, the codebase has several architectural decisions that will impede scalability and maintainability as requirements grow.

---

## Table of Contents

1. [Current Architecture Overview](#current-architecture-overview)
2. [File Format Scalability](#file-format-scalability)
3. [Ladder Element Extensibility](#ladder-element-extensibility)
4. [TypeScript Best Practices](#typescript-best-practices)
5. [Rendering Engine Architecture](#rendering-engine-architecture)
6. [Performance & Scaling Concerns](#performance--scaling-concerns)
7. [Testing Coverage](#testing-coverage)
8. [Recommendations Summary](#recommendations-summary)

---

## Current Architecture Overview

### Module Structure
```
src/
├── components/     # React components for UI
├── parsers/        # JSON → Domain model parsing
├── renderers/      # Domain → SVG rendering
├── types/          # TypeScript type definitions
└── utils/          # Utility functions
```

### Data Flow
```
JSON File → Controller Parser → Domain Types → Routine Parser → Rung Parser → SVG Renderer → React Component
```

---

## File Format Scalability

### Current State

**Issue: Tight Coupling to Single File Format**

The codebase is tightly coupled to a single JSON schema from Allen-Bradley/Rockwell PLC exports.

| File | Issue |
|------|-------|
| [schemas.ts](src/parsers/schemas.ts) | Hardcoded Zod schema for one format |
| [controller-parser.ts](src/parsers/controller-parser.ts) | No abstraction for different parsers |
| [controller.ts](src/types/controller.ts) | Domain types match input format 1:1 |

### Observations

1. **No Parser Interface/Strategy Pattern**
   ```typescript
   // Current: Direct parsing without abstraction
   export function parseControllerExport(json: unknown): ControllerExport {
     const result = ControllerExportSchema.safeParse(json);
     // ...
   }
   ```
   There's no interface defining what a "parser" must provide, making it impossible to swap parsers for different file formats.

2. **Domain Types Mirror Input Format**
   The `ControllerExport` type directly mirrors the JSON structure rather than representing a normalized internal domain model. Fields like `sfc_execution_control`, `sfc_restart_position` are Allen-Bradley specific.

3. **No File Format Detection**
   No mechanism exists to detect the file format and select the appropriate parser.

### Potential Issues at Scale

- Adding support for Siemens TIA Portal, Mitsubishi GX Works, or IEC 61131-3 standard formats would require:
  - Duplicating all parsing logic
  - Creating entirely new type hierarchies
  - Modifying all downstream consumers

### Recommended Solutions

1. **Create Abstract Parser Interface**
   ```typescript
   interface PLCParser<TInput = unknown> {
     readonly supportedFormats: string[];
     canParse(input: TInput): boolean;
     parse(input: TInput): NormalizedControllerModel;
   }
   ```

2. **Normalize Domain Types**
   Create vendor-agnostic internal types:
   ```typescript
   interface NormalizedController {
     metadata: ControllerMetadata;
     tags: NormalizedTag[];
     programs: NormalizedProgram[];
     // Vendor-specific extensions in a separate field
     vendorData?: Record<string, unknown>;
   }
   ```

3. **Implement Parser Registry**
   ```typescript
   class ParserRegistry {
     private parsers: PLCParser[] = [];
     
     register(parser: PLCParser): void;
     findParser(input: unknown): PLCParser | null;
     parse(input: unknown): NormalizedControllerModel;
   }
   ```

---

## Ladder Element Extensibility

### Current State

**Issue: Hardcoded Instruction Categories and Symbols**

| File | Issue |
|------|-------|
| [instructions.ts](src/types/instructions.ts#L68-L89) | Hardcoded category lookup with string arrays |
| [boxes.ts](src/renderers/svg/symbols/boxes.ts#L11-L42) | Hardcoded instruction names and parameter labels |
| [contacts.ts](src/renderers/svg/symbols/contacts.ts) | Fixed symbol definitions as template strings |
| [ladder-renderer.ts](src/renderers/svg/ladder-renderer.ts#L135-L150) | Switch statements for symbol selection |

### Observations

1. **Switch Statement Anti-Pattern**
   ```typescript
   // From ladder-renderer.ts - every new instruction requires modifying this
   function getSymbol(instruction: Instruction): string {
     switch (instruction.category) {
       case 'input':
         return getContactSymbol(instruction.mnemonic);
       case 'output':
         return getCoilSymbol(instruction.mnemonic);
       case 'timer':
         return createTimerSymbol(instruction.mnemonic, instruction.operands);
       // ...must add case for every new category
     }
   }
   ```

2. **Inline String Mappings**
   ```typescript
   // From instructions.ts - adding instructions requires modifying arrays
   export function getInstructionCategory(mnemonic: string): Instruction['category'] {
     const contacts: string[] = ['XIC', 'XIO'];
     const coils: string[] = ['OTE', 'OTL', 'OTU'];
     const compares: string[] = ['EQU', 'NEQ', 'GEQ', 'LEQ', 'GRT', 'LES', 'LIM'];
     // ... more hardcoded arrays
   }
   ```

3. **Static SVG Template Strings**
   ```typescript
   // From contacts.ts - symbols are hardcoded strings
   export const ContactXIC = `
     <g class="contact contact-xic">
       <line x1="0" y1="10" x2="8" y2="10" stroke="${WIRE_COLOR}" stroke-width="1.5"/>
       // ... hardcoded SVG
     </g>
   `;
   ```

4. **No Plugin/Extension Architecture**
   There's no mechanism for third parties or users to register custom instruction types or symbols without modifying source code.

### Potential Issues at Scale

- Adding support for Add-On Instructions (AOIs) requires code changes everywhere
- Custom/proprietary instructions can't be added without forking
- No way to customize rendering for specific use cases
- Testing new instructions requires rebuilding

### Recommended Solutions

1. **Instruction Registry Pattern**
   ```typescript
   interface InstructionDefinition {
     mnemonic: string;
     category: InstructionCategory;
     parameterLabels: string[];
     displayName: string;
     symbolRenderer: (instruction: Instruction) => SVGElement;
   }

   class InstructionRegistry {
     private definitions = new Map<string, InstructionDefinition>();
     
     register(definition: InstructionDefinition): void;
     get(mnemonic: string): InstructionDefinition | undefined;
     getCategory(mnemonic: string): InstructionCategory;
   }
   ```

2. **Symbol Factory Pattern**
   ```typescript
   interface SymbolFactory {
     readonly supportedMnemonics: string[];
     createSymbol(instruction: Instruction, options?: RenderOptions): SVGElement;
     calculateDimensions(instruction: Instruction): Dimensions;
   }
   
   class SymbolRegistry {
     registerFactory(factory: SymbolFactory): void;
     getFactory(mnemonic: string): SymbolFactory;
   }
   ```

3. **Configuration-Driven Definitions**
   Move instruction definitions to JSON/YAML configuration:
   ```yaml
   instructions:
     XIC:
       category: input
       displayName: "Examine If Closed"
       parameters: ["Bit"]
       symbolType: contact
   ```

---

## TypeScript Best Practices

### Current State

| Issue | Severity | Location |
|-------|----------|----------|
| Stringly-typed mnemonics | Medium | Throughout |
| Missing exhaustive checks | Medium | Switch statements |
| Implicit `any` in some areas | Low | Various |
| Loose type assertions | Medium | Parsers |

### Observations

1. **String-Based Mnemonic Types**
   ```typescript
   // Current: mnemonic is just a string
   export interface Instruction {
     mnemonic: string;  // Should be a union type or branded type
     operands: string[];
     category: 'input' | 'output' | 'compare' | 'math' | 'timer' | 'counter' | 'other';
   }
   ```
   While `InstructionMnemonic` type exists, it's not used in the `Instruction` interface.

2. **Non-Exhaustive Switch Statements**
   ```typescript
   // From ladder-renderer.ts - no exhaustive check
   function getSymbol(instruction: Instruction): string {
     switch (instruction.category) {
       case 'input':
         return getContactSymbol(instruction.mnemonic);
       // ...
       default:
         return createBoxSymbol(instruction.mnemonic, instruction.operands);
     }
   }
   ```
   Adding a new category won't cause a compile error.

3. **Repeated Type Guards**
   ```typescript
   // This pattern appears multiple times
   const isContactOrCoil = instruction.category === 'input' || instruction.category === 'output';
   ```
   Should be extracted to a type guard function.

4. **Magic Numbers Without Constants**
   ```typescript
   // From various files - scattered magic numbers
   const labelY = instrY - 5;  // Why 5?
   const addressY = instrY + dims.height + ADDRESS_LABEL_OFFSET;  // 12
   ```
   While some constants exist, many magic numbers are inline.

### Recommended Solutions

1. **Use Branded Types for Mnemonics**
   ```typescript
   type Mnemonic = string & { readonly __brand: unique symbol };
   
   // Or use the existing union type
   export interface Instruction {
     mnemonic: InstructionMnemonic | string;  // Allow extension
     // ...
   }
   ```

2. **Exhaustive Type Checking**
   ```typescript
   function assertNever(x: never): never {
     throw new Error(`Unexpected value: ${x}`);
   }

   function getSymbol(instruction: Instruction): string {
     switch (instruction.category) {
       case 'input': return getContactSymbol(instruction.mnemonic);
       case 'output': return getCoilSymbol(instruction.mnemonic);
       // ...
       default: return assertNever(instruction.category);
     }
   }
   ```

3. **Extract Type Guards**
   ```typescript
   function isContactOrCoil(instruction: Instruction): boolean {
     return instruction.category === 'input' || instruction.category === 'output';
   }
   
   function isBoxInstruction(instruction: Instruction): boolean {
     return ['compare', 'math', 'timer', 'counter'].includes(instruction.category);
   }
   ```

---

## Rendering Engine Architecture

### Current State

**Issue: Monolithic Rendering with String Concatenation**

| File | Lines | Issue |
|------|-------|-------|
| [ladder-renderer.ts](src/renderers/svg/ladder-renderer.ts) | 1234 | Single file, string-based SVG generation |

### Observations

1. **String Concatenation for SVG**
   ```typescript
   // Current approach throughout the codebase
   let svg = '';
   svg += `<line x1="${leftRailX}" y1="${wireY}" x2="${conditionsStartX}" y2="${wireY}".../>`;
   svg += `<text x="${labelX}" y="${labelY}"...>${label}</text>`;
   ```
   This approach:
   - Makes debugging difficult (no component tree)
   - Prevents DOM diffing optimizations
   - No type safety for SVG attributes
   - XSS vulnerabilities if labels contain special characters

2. **No Virtual DOM / Reconciliation**
   Every render creates a new string, even if only one element changed. The React component uses `dangerouslySetInnerHTML`:
   ```tsx
   <div dangerouslySetInnerHTML={{ __html: svgHtml }} />
   ```

3. **Coupled Layout and Rendering**
   Layout calculations and SVG generation are intertwined in the same functions:
   ```typescript
   function renderElementLine(
     line: ElementLine,
     lineIndex: number,
     wireY: number,
     diagramWidth: number,
     prevWireY: number | null,
     nextWireY: number | null
   ): string {
     // 80+ lines mixing layout logic and SVG generation
   }
   ```

4. **No Render-Time State Support**
   Current design doesn't support:
   - Hover states on instructions
   - Selection highlighting
   - Animated transitions
   - Tooltips

5. **Single Render Target (SVG only)**
   No abstraction allows rendering to other targets (Canvas, WebGL, PDF).

### Potential Issues at Scale

- Large diagrams will cause performance issues (full re-render on any change)
- No interactivity support without rewriting
- Memory usage scales with diagram complexity
- Can't export to other formats

### Recommended Solutions

1. **Adopt JSX for SVG Generation**
   ```tsx
   function ContactSymbol({ instruction, position }: ContactProps): JSX.Element {
     return (
       <g transform={`translate(${position.x}, ${position.y})`}>
         <line x1="0" y1="10" x2="8" y2="10" stroke="#333" />
         {/* ... */}
       </g>
     );
   }
   ```

2. **Separate Layout Engine**
   ```typescript
   interface LayoutEngine {
     calculateLayout(rungs: Rung[], options: LayoutOptions): DiagramLayout;
   }

   interface DiagramLayout {
     rungs: RungLayout[];
     totalWidth: number;
     totalHeight: number;
   }

   interface RungLayout {
     elements: ElementLayout[];
     wirePositions: Position[];
   }
   ```

3. **Renderer Interface for Multiple Targets**
   ```typescript
   interface Renderer<TOutput> {
     render(layout: DiagramLayout): TOutput;
   }

   class SVGRenderer implements Renderer<SVGElement> { }
   class CanvasRenderer implements Renderer<void> { }
   class PDFRenderer implements Renderer<Blob> { }
   ```

4. **Memoization Strategy**
   ```typescript
   // Cache rendered symbols
   const symbolCache = new Map<string, SVGElement>();
   
   function getOrCreateSymbol(instruction: Instruction): SVGElement {
     const key = `${instruction.mnemonic}-${instruction.operands.join(',')}`;
     if (!symbolCache.has(key)) {
       symbolCache.set(key, createSymbol(instruction));
     }
     return symbolCache.get(key)!.cloneNode(true);
   }
   ```

---

## Performance & Scaling Concerns

### Current State

| Concern | Location | Impact |
|---------|----------|--------|
| O(n²) layout calculations | [ladder-renderer.ts#L480-L600](src/renderers/svg/ladder-renderer.ts#L480-L600) | High |
| No virtualization | LadderDiagram component | High |
| String concatenation in loops | Throughout renderers | Medium |
| Full re-render on any change | React integration | High |

### Observations

1. **Repeated Layout Calculations**
   ```typescript
   // calculateElementLayout is called multiple times for same elements
   function calculateBranchGroupLayout(branch: BranchGroup): ElementLayout {
     const legLayouts = branch.branches.map(leg => calculateLegLayout(leg));
     // ...
   }

   function renderBranchGroup(branch: BranchGroup, x: number, mainWireY: number) {
     const legLayouts = branch.branches.map(leg => calculateLegLayout(leg));
     // Same calculation repeated
   }
   ```

2. **No Viewport Culling**
   All rungs are rendered regardless of visibility:
   ```typescript
   // Renders every rung, even those outside viewport
   for (let i = 0; i < rungs.length; i++) {
     svg += renderRung(rungs[i], i, rungOffsets[i], width);
   }
   ```

3. **Memory-Inefficient String Building**
   ```typescript
   let svg = '';
   // Repeated string concatenation creates many intermediate strings
   svg += renderRungNumberCell(i, rungOffsets[i], rungHeight);
   svg += renderPowerRails(width, finalHeight);
   ```

4. **No Lazy Parsing**
   All routines are parsed upfront in `TagResolver`:
   ```typescript
   for (let rIdx = 0; rIdx < program.routines.length; rIdx++) {
     const routine = program.routines[rIdx];
     const parsed = parseRoutine(routine);  // Parses everything
     this.scanRoutineForTags(parsed, pIdx, rIdx);
   }
   ```

### Potential Issues at Scale

| Scenario | Estimated Impact |
|----------|------------------|
| 1,000 rungs | Noticeable lag on render |
| 10,000 rungs | Significant memory usage, slow initial load |
| Real-time updates | Unusable without virtualization |
| Large branch structures | Exponential layout calculation time |

### Recommended Solutions

1. **Memoize Layout Calculations**
   ```typescript
   const layoutCache = new WeakMap<RungElement, ElementLayout>();
   
   function calculateElementLayout(element: RungElement): ElementLayout {
     if (layoutCache.has(element)) {
       return layoutCache.get(element)!;
     }
     const layout = computeLayout(element);
     layoutCache.set(element, layout);
     return layout;
   }
   ```

2. **Implement Virtualized Rendering**
   ```typescript
   function renderVisibleRungs(
     rungs: Rung[],
     viewport: { top: number; bottom: number },
     rungOffsets: number[]
   ): string {
     const visibleIndices = findVisibleRungIndices(rungOffsets, viewport);
     return visibleIndices.map(i => renderRung(rungs[i], i, rungOffsets[i], width)).join('');
   }
   ```

3. **Use Array.join() Instead of Concatenation**
   ```typescript
   // Instead of:
   let svg = '';
   svg += part1;
   svg += part2;

   // Use:
   const parts: string[] = [];
   parts.push(part1);
   parts.push(part2);
   return parts.join('');
   ```

4. **Lazy Routine Parsing**
   ```typescript
   class LazyRoutineParser {
     private cache = new Map<string, ParsedRoutine>();
     
     getRoutine(program: Program, index: number): ParsedRoutine {
       const key = `${program}-${index}`;
       if (!this.cache.has(key)) {
         this.cache.set(key, parseRoutine(program.routines[index]));
       }
       return this.cache.get(key)!;
     }
   }
   ```

---

## Testing Coverage

### Current State

| Area | Coverage | Issue |
|------|----------|-------|
| Rung Parser | Good | Comprehensive test cases |
| Controller Parser | Medium | Basic validation tests |
| Renderer | None | No rendering tests |
| Components | None | No component tests |
| Integration | Basic | Limited end-to-end tests |

### Observations

1. **No Rendering Tests**
   The entire SVG rendering pipeline has no tests:
   ```
   tests/
   ├── parsers/
   │   ├── controller-parser.test.ts
   │   ├── integration.test.ts
   │   ├── routine-parser.test.ts
   │   ├── rung-parser.test.ts
   │   └── tag-resolver.test.ts
   └── (no renderers/ or components/)
   ```

2. **No Visual Regression Tests**
   No mechanism to catch unintended visual changes.

3. **No Snapshot Tests**
   No SVG output snapshots to verify rendering consistency.

### Recommended Solutions

1. **Add Renderer Unit Tests**
   ```typescript
   describe('renderInstruction', () => {
     it('should render XIC contact correctly', () => {
       const instruction: Instruction = { mnemonic: 'XIC', operands: ['Tag1'], category: 'input' };
       const svg = renderInstruction(instruction, 0, 50);
       expect(svg).toContain('class="contact contact-xic"');
       expect(svg).toContain('Tag1');
     });
   });
   ```

2. **Implement Visual Regression with Percy/Chromatic**

3. **Add SVG Snapshot Tests**
   ```typescript
   it('should match snapshot for basic rung', () => {
     const rungs = [{ raw: 'XIC(A)OTE(B)', instructions: [...], elements: [...] }];
     const svg = renderLadderDiagram(rungs, { width: 800 });
     expect(svg).toMatchSnapshot();
   });
   ```

---

## Recommendations Summary

### Priority 1: Critical for Scaling

| Issue | Solution | Effort |
|-------|----------|--------|
| String-based SVG | Migrate to JSX/React SVG | High |
| No virtualization | Implement windowed rendering | High |
| Coupled layout/render | Separate layout engine | Medium |

### Priority 2: Important for Extensibility

| Issue | Solution | Effort |
|-------|----------|--------|
| Hardcoded instructions | Instruction registry pattern | Medium |
| Single file format | Parser abstraction layer | Medium |
| No symbol plugins | Symbol factory registry | Medium |

### Priority 3: Code Quality

| Issue | Solution | Effort |
|-------|----------|--------|
| No render tests | Add rendering test suite | Medium |
| Magic numbers | Extract to named constants | Low |
| Repeated calculations | Implement memoization | Low |
| Type safety gaps | Strengthen TypeScript types | Low |

### Suggested Architecture Evolution

```
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                 │
│  ParserRegistry | SymbolRegistry | InstructionRegistry          │
└─────────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                    Normalized Domain Model                       │
│  NormalizedController | NormalizedProgram | NormalizedRung      │
└─────────────────────────────────────────────────────────────────┘
                              │
┌───────────────┬─────────────┴─────────────┬────────────────────┐
│  Layout       │                           │                    │
│  Engine       │     Symbol Factories      │    Renderers       │
│               │  (Contact, Coil, Box...)  │  (SVG, Canvas, PDF)│
└───────────────┴───────────────────────────┴────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────────┐
│                     React Components                             │
│   LadderDiagram (virtualized) | ProgramNavigator | TagTable     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Conclusion

The `ladder-visualizer` codebase provides solid foundational functionality but requires architectural improvements to scale effectively. The most critical issues are:

1. **Rendering performance** - String concatenation and lack of virtualization
2. **Extensibility** - Hardcoded instructions and single file format support
3. **Maintainability** - Monolithic 1200+ line renderer file

Addressing these issues in priority order will transform the codebase from a proof-of-concept into a production-ready, extensible ladder logic visualization library.

---

*Report generated: January 16, 2026*
