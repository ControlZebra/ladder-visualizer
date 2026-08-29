# Multi-Format Support Plan: L5X and Beyond

## Executive Summary

This document outlines the architectural changes needed to support multiple file formats (starting with L5X) in the ladder-visualizer library. The current implementation is tightly coupled to a specific JSON schema from Allen-Bradley/Rockwell PLC exports. To support L5X (native Rockwell Logix5000 XML format) and future formats, we need to introduce abstraction layers, normalized domain models, and a parser registry pattern.

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [L5X File Format Overview](#l5x-file-format-overview)
3. [Architectural Changes Required](#architectural-changes-required)
4. [Implementation Phases](#implementation-phases)
5. [File Structure Changes](#file-structure-changes)
6. [Detailed Implementation Tasks](#detailed-implementation-tasks)
7. [Testing Strategy](#testing-strategy)
8. [Risk Assessment](#risk-assessment)

---

## Current State Analysis

### Current Architecture
```
JSON File → parseControllerExport() → ControllerExport (domain type) → Components
```

### Key Issues

| Issue | Location | Impact |
|-------|----------|--------|
| Single format coupling | `schemas.ts`, `controller-parser.ts` | Cannot add new formats without major refactoring |
| Domain types mirror input format | `types/controller.ts` | Types have Allen-Bradley-specific fields |
| No format detection | N/A | Users must manually specify file type |
| No parser interface | N/A | No contract for what a parser must provide |
| String-based rung parsing | `rung-parser.ts` | Expects specific text format from JSON export |

### Current Data Flow
```
Rockwell JSON export
        ↓
parseControllerExport(json) → Zod validation → ControllerExport
        ↓
parseRoutine(routine) → ParsedRoutine
        ↓
parseRung(rungString) → Instruction[] / RungElement[]
        ↓
VirtualizedLadderDiagram renders SVG
```

---

## L5X File Format Overview

### What is L5X?
L5X is the native XML export format for Rockwell Automation's Studio 5000/Logix Designer software. It contains the complete project structure including:

- Controller metadata
- User-Defined Data Types (UDTs)
- Tags (controller-scoped and program-scoped)
- Programs with routines
- Add-On Instructions (AOIs)
- Modules and I/O configuration

### L5X Structure (from example file)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" 
                    TargetName="Cooker_1_AutoLogic" TargetType="Program">
  <Controller Use="Context" Name="PLC100_Mashing">
    <DataTypes Use="Context">
      <DataType Name="Analog_Valve_UDT" Family="NoFamily" Class="User">
        <Members>
          <Member Name="DO_Energize" DataType="BIT" ... />
        </Members>
      </DataType>
    </DataTypes>
    <Programs>
      <Program Name="Cooker_1_AutoLogic">
        <Tags>...</Tags>
        <Routines>
          <Routine Name="Logic" Type="RLL">
            <RLLContent>
              <Rung Number="0" Type="N">
                <Comment><![CDATA[AI Scaling]]></Comment>
                <Text><![CDATA[XIC(HMI_Load_HiRaw)MOV(In_Raw,Cfg_RawMax);]]></Text>
              </Rung>
            </RLLContent>
          </Routine>
        </Routines>
      </Program>
    </Programs>
  </Controller>
</RSLogix5000Content>
```

### Key Observations

1. **Rung text format is IDENTICAL** - The `<Text>` element contains the same instruction format (`XIC(tag)OTE(output);`) as the JSON export. This means the existing `rung-parser.ts` can be reused!

2. **Structure differences:**
   - XML vs JSON format
   - Different nesting structure for programs/routines
   - Additional metadata (export options, schema version)
   - Rung comments are separate elements
   - More detailed data type definitions

3. **Target types:**
   - `TargetType="Program"` - Single program export
   - `TargetType="Controller"` - Full controller export

---

## Architectural Changes Required

### 1. Normalized Domain Model (Internal Types)

Create vendor-agnostic internal types that all parsers produce:

```typescript
// src/types/normalized/index.ts

/**
 * Normalized controller model - the common internal representation
 * that all format parsers produce.
 */
export interface NormalizedController {
  // Common metadata
  name: string;
  description?: string;
  createdDate?: Date;
  modifiedDate?: Date;
  
  // Core data
  dataTypes: NormalizedDataType[];
  tags: NormalizedTag[];
  programs: NormalizedProgram[];
  
  // Optional vendor-specific data
  vendor?: 'rockwell' | 'siemens' | 'mitsubishi' | 'other';
  vendorMetadata?: Record<string, unknown>;
}

export interface NormalizedProgram {
  name: string;
  tags: NormalizedTag[];
  routines: NormalizedRoutine[];
}

export interface NormalizedRoutine {
  name: string;
  type: 'RLL' | 'FBD' | 'ST' | 'SFC';
  rungs: NormalizedRung[];
}

export interface NormalizedRung {
  number: number;
  comment?: string;
  raw: string;  // Original text for parsing
  elements: RungElement[];
  instructions: Instruction[];
}
```

### 2. Parser Interface (Strategy Pattern)

```typescript
// src/parsers/parser-interface.ts

export type FileFormat = 'json' | 'l5x' | 'l5k' | 'xml';

export interface ParseResult<T> {
  success: boolean;
  data?: T;
  errors?: ParseError[];
  warnings?: ParseWarning[];
}

export interface PLCParser {
  /** Unique identifier for this parser */
  readonly id: string;
  
  /** Human-readable name */
  readonly name: string;
  
  /** Supported file extensions */
  readonly supportedExtensions: string[];
  
  /** Supported MIME types */
  readonly supportedMimeTypes: string[];
  
  /**
   * Check if this parser can handle the given input.
   * Should be fast - only check format signatures, not full validation.
   */
  canParse(input: string | ArrayBuffer): boolean;
  
  /**
   * Parse input into normalized controller model.
   */
  parse(input: string | ArrayBuffer): ParseResult<NormalizedController>;
  
  /**
   * Optionally validate without full parsing.
   */
  validate?(input: string | ArrayBuffer): ParseResult<void>;
}
```

### 3. Parser Registry

```typescript
// src/parsers/parser-registry.ts

export class ParserRegistry {
  private parsers: Map<string, PLCParser> = new Map();
  
  register(parser: PLCParser): void;
  unregister(parserId: string): void;
  
  getParser(id: string): PLCParser | undefined;
  getAllParsers(): PLCParser[];
  
  /**
   * Auto-detect format and find appropriate parser
   */
  detectParser(input: string | ArrayBuffer): PLCParser | null;
  
  /**
   * Parse input using auto-detection or specified parser
   */
  parse(
    input: string | ArrayBuffer, 
    parserId?: string
  ): ParseResult<NormalizedController>;
}

// Global registry instance
export const parserRegistry = new ParserRegistry();
```

### 4. Format Detection

```typescript
// src/parsers/format-detector.ts

export interface FormatSignature {
  format: FileFormat;
  confidence: number; // 0-1
  parserId: string;
}

export function detectFormat(input: string | ArrayBuffer): FormatSignature[];

// Detection strategies:
// - JSON: Try JSON.parse, check for expected fields
// - L5X: Check for <?xml and <RSLogix5000Content
// - L5K: Check for Rockwell text export patterns
```

---

## Implementation Phases

### Phase 1: Foundation (Non-Breaking)
**Goal:** Add abstraction layers without breaking existing API

1. Create normalized types alongside existing types
2. Create parser interface
3. Create parser registry
4. Implement adapter for existing JSON parser
5. Add format detection utilities

### Phase 2: L5X Parser Implementation
**Goal:** Add full L5X support

1. Implement XML parsing using a lightweight library (fast-xml-parser)
2. Create L5X-specific schema/types
3. Implement L5XParser class
4. Handle L5X-specific features:
   - Rung comments extraction
   - Program-scoped tags
   - Data type parsing
   - Controller vs Program exports

### Phase 3: Unified API
**Goal:** Single entry point for all formats

1. Create unified `parseFile()` function
2. Add file reading utilities
3. Update demo app to support file upload
4. Support both formats seamlessly

### Phase 4: Migrate Internal Usage
**Goal:** Use normalized types internally

1. Update components to use normalized types
2. Deprecate format-specific types in public API
3. Add migration guides

---

## File Structure Changes

### New Directory Structure
```
src/
├── parsers/
│   ├── index.ts                    # Public exports
│   ├── parser-interface.ts         # PLCParser interface
│   ├── parser-registry.ts          # Registry singleton
│   ├── format-detector.ts          # Auto-detection
│   ├── parse-error.ts              # Error types
│   │
│   ├── json/                       # JSON format parser
│   │   ├── index.ts
│   │   ├── json-parser.ts          # Implements PLCParser
│   │   ├── json-schemas.ts         # Zod schemas (moved from schemas.ts)
│   │   └── json-to-normalized.ts   # Transform to normalized
│   │
│   ├── l5x/                        # L5X format parser
│   │   ├── index.ts
│   │   ├── l5x-parser.ts           # Implements PLCParser
│   │   ├── l5x-schemas.ts          # L5X-specific types
│   │   ├── l5x-to-normalized.ts    # Transform to normalized
│   │   └── xml-utils.ts            # XML parsing helpers
│   │
│   ├── common/                     # Shared parsing utilities
│   │   ├── rung-parser.ts          # Moved, works on text
│   │   └── instruction-parser.ts
│   │
│   └── legacy/                     # Deprecated (Phase 4)
│       ├── controller-parser.ts    # Old JSON parser (for compatibility)
│       └── schemas.ts
│
├── types/
│   ├── index.ts
│   ├── normalized/                 # New normalized types
│   │   ├── index.ts
│   │   ├── controller.ts
│   │   ├── program.ts
│   │   ├── routine.ts
│   │   ├── rung.ts
│   │   ├── tag.ts
│   │   └── data-type.ts
│   │
│   ├── formats/                    # Format-specific types
│   │   ├── json/                   # Current JSON format types
│   │   └── l5x/                    # L5X-specific types
│   │
│   └── ... (existing type files)
```

---

## Detailed Implementation Tasks

### Task 1: Create Normalized Types
**Files to create:**
- `src/types/normalized/index.ts`
- `src/types/normalized/controller.ts`
- `src/types/normalized/program.ts`
- `src/types/normalized/routine.ts`
- `src/types/normalized/rung.ts`
- `src/types/normalized/tag.ts`
- `src/types/normalized/data-type.ts`

**Key decisions:**
- Rung should include both `raw` (for debugging) and `elements` (parsed)
- Tags need to capture both controller and program scope
- Data types should support nested members for UDTs

### Task 2: Create Parser Interface & Registry
**Files to create:**
- `src/parsers/parser-interface.ts`
- `src/parsers/parser-registry.ts`
- `src/parsers/parse-error.ts`
- `src/parsers/format-detector.ts`

**Key considerations:**
- Support both string and ArrayBuffer inputs
- Registry should be extensible (allow user-defined parsers)
- Format detection should handle edge cases gracefully

### Task 3: Refactor JSON Parser
**Files to modify/create:**
- Move `schemas.ts` → `src/parsers/json/json-schemas.ts`
- Create `src/parsers/json/json-parser.ts` (implements PLCParser)
- Create `src/parsers/json/json-to-normalized.ts`
- Keep `controller-parser.ts` as compatibility layer

**Approach:**
```typescript
// src/parsers/json/json-parser.ts
export class JSONParser implements PLCParser {
  readonly id = 'rockwell-json';
  readonly name = 'Rockwell JSON Export';
  readonly supportedExtensions = ['.json'];
  readonly supportedMimeTypes = ['application/json'];
  
  canParse(input: string): boolean {
    try {
      const obj = JSON.parse(input);
      return 'serial_number' in obj && 'programs' in obj;
    } catch {
      return false;
    }
  }
  
  parse(input: string): ParseResult<NormalizedController> {
    const json = JSON.parse(input);
    const validated = ControllerExportSchema.safeParse(json);
    if (!validated.success) {
      return { success: false, errors: [...] };
    }
    return {
      success: true,
      data: jsonToNormalized(validated.data)
    };
  }
}
```

### Task 4: Implement L5X Parser
**Files to create:**
- `src/parsers/l5x/index.ts`
- `src/parsers/l5x/l5x-parser.ts`
- `src/parsers/l5x/l5x-schemas.ts`
- `src/parsers/l5x/l5x-to-normalized.ts`
- `src/parsers/l5x/xml-utils.ts`

**Dependencies:**
- Add `fast-xml-parser` (lightweight, no dependencies)

**Key implementation details:**
```typescript
// src/parsers/l5x/l5x-parser.ts
export class L5XParser implements PLCParser {
  readonly id = 'rockwell-l5x';
  readonly name = 'Rockwell L5X Export';
  readonly supportedExtensions = ['.l5x', '.L5X'];
  readonly supportedMimeTypes = ['application/xml', 'text/xml'];
  
  canParse(input: string): boolean {
    return input.includes('<RSLogix5000Content');
  }
  
  parse(input: string): ParseResult<NormalizedController> {
    const parser = new XMLParser({ /* options */ });
    const xml = parser.parse(input);
    return this.transformToNormalized(xml);
  }
}
```

**L5X-specific handling:**
- Extract `<Rung><Text>` content → reuse existing rung-parser
- Extract `<Comment>` elements for rung comments
- Handle both `TargetType="Controller"` and `TargetType="Program"` exports
- Parse `<DataTypes>` section with nested members
- Parse `<Tags>` from both controller and program scope

### Task 5: Move Rung Parser to Common
**Files to modify:**
- Move `rung-parser.ts` → `src/parsers/common/rung-parser.ts`
- Update imports throughout codebase

**Rationale:** Rung text format is identical between JSON and L5X exports. The parser works on the text string regardless of source format.

### Task 6: Create Unified Parse Function
**Files to create/modify:**
- `src/parsers/index.ts` - Add new unified exports

```typescript
// src/parsers/index.ts

// New unified API
export { parseFile, parseString } from './parse';
export { parserRegistry, ParserRegistry } from './parser-registry';
export type { PLCParser, ParseResult, FileFormat } from './parser-interface';

// Individual parsers (for direct use)
export { JSONParser } from './json';
export { L5XParser } from './l5x';

// Legacy API (deprecated but maintained)
export { 
  parseControllerExport, 
  parseControllerExportString 
} from './legacy/controller-parser';
```

```typescript
// src/parsers/parse.ts

/**
 * Parse a file into a normalized controller model.
 * Automatically detects the file format.
 */
export async function parseFile(
  file: File
): Promise<ParseResult<NormalizedController>> {
  const content = await file.text();
  return parseString(content);
}

/**
 * Parse a string into a normalized controller model.
 * Automatically detects the format.
 */
export function parseString(
  content: string,
  formatHint?: FileFormat
): ParseResult<NormalizedController> {
  const parser = formatHint 
    ? parserRegistry.getParserByFormat(formatHint)
    : parserRegistry.detectParser(content);
    
  if (!parser) {
    return { 
      success: false, 
      errors: [{ message: 'Unable to detect file format' }] 
    };
  }
  
  return parser.parse(content);
}
```

### Task 7: Update Components
**Files to modify:**
- `src/components/VirtualizedLadderDiagram.tsx` - Accept normalized types
- `src/components/TagTable.tsx` - Accept normalized tags
- Other components as needed

**Strategy:**
- Components should accept normalized types
- Create adapters/mappers for legacy types if needed
- Ensure backward compatibility

### Task 8: Update Demo App
**Files to modify:**
- `demo/App.tsx` - Support file upload for both formats

```tsx
// Add file upload handler
const handleFileUpload = async (file: File) => {
  const result = await parseFile(file);
  if (result.success) {
    setController(result.data);
  } else {
    setError(result.errors?.map(e => e.message).join(', '));
  }
};
```

---

## Testing Strategy

### Unit Tests

| Component | Test Focus |
|-----------|------------|
| Format Detector | Correctly identify JSON vs L5X |
| JSON Parser | Parse valid JSON, handle errors |
| L5X Parser | Parse valid L5X, handle variations |
| Parser Registry | Registration, auto-detection |
| Rung Parser | Works with text from both formats |

### Integration Tests

| Test Scenario | Description |
|---------------|-------------|
| JSON → Normalized → Render | Full flow with focused synthetic JSON fixtures |
| L5X → Normalized → Render | Full flow with L5X file |
| Same project, both formats | Parse same PLC project exported in both formats, compare |

### Test Files

- Use `Cooker_1_AutoLogic_Program.L5X` for real-world parser and rendering coverage
- Use focused inline JSON fixtures for JSON detection and parser edge cases
- Create minimal test fixtures for edge cases

---

## Risk Assessment

### Low Risk
- Rung text format is identical - parser can be reused
- XML parsing is well-supported in JavaScript ecosystem
- Normalized types are additive, not breaking

### Medium Risk
- L5X has variations (controller vs program export, different schema versions)
- Some L5X-specific features may need new UI components
- Performance with large L5X files (can be 45k+ lines)

### Mitigation Strategies
1. **Schema versions:** Check `SchemaRevision` attribute, support common versions
2. **Export types:** Handle both `TargetType="Controller"` and `TargetType="Program"`
3. **Performance:** Use streaming XML parser if needed for very large files
4. **Validation:** Comprehensive error handling with helpful messages

---

## Dependencies to Add

```json
{
  "dependencies": {
    "fast-xml-parser": "^4.x.x"  // Lightweight, zero-dependency XML parser
  }
}
```

**Why fast-xml-parser?**
- Small bundle size (~35KB minified)
- Zero dependencies
- Good TypeScript support
- Handles CDATA sections (important for L5X)
- Configurable parsing options

---

## API Changes Summary

### New Exports (Public API)
```typescript
// Unified parsing
export function parseFile(file: File): Promise<ParseResult<NormalizedController>>;
export function parseString(content: string): ParseResult<NormalizedController>;

// Parser registry
export const parserRegistry: ParserRegistry;
export interface PLCParser { ... }

// Normalized types
export interface NormalizedController { ... }
export interface NormalizedProgram { ... }
export interface NormalizedRoutine { ... }
export interface NormalizedRung { ... }
export interface NormalizedTag { ... }
```

### Deprecated (Still Working)
```typescript
// Old API - marked deprecated but maintained
export function parseControllerExport(json: unknown): ControllerExport;
export function parseControllerExportString(jsonString: string): ControllerExport;
```

### Breaking Changes (Phase 4 Only)
- Internal components may switch to normalized types
- Format-specific types moved to `types/formats/`

---

## Timeline Estimate

| Phase | Duration | Deliverables |
|-------|----------|--------------|
| Phase 1: Foundation | 1-2 days | Interfaces, registry, normalized types |
| Phase 2: L5X Parser | 2-3 days | Full L5X parsing support |
| Phase 3: Unified API | 1 day | parseFile(), demo updates |
| Phase 4: Migration | 1-2 days | Internal usage, deprecations |

**Total: 5-8 days**

---

## Future Considerations

### Additional Formats to Consider
1. **L5K** - Rockwell text export format
2. **ACD** - Native Studio 5000 project files (binary, complex)
3. **Siemens TIA Portal** exports
4. **IEC 61131-3** standard formats

### Extensibility
The parser registry pattern allows:
- Users to register custom parsers
- Third-party parser plugins
- Format converters (L5X → JSON)

---

## Conclusion

Adding L5X support is highly feasible because:

1. **Rung format is identical** - The instruction text in `<Text>` elements uses the same format as JSON exports
2. **Clear abstraction pattern** - Parser interface + registry provides clean extension mechanism
3. **Non-breaking approach** - All changes can be additive without breaking existing API
4. **Existing example file** - The `Cooker_1_AutoLogic_Program.L5X` provides a real-world test case

The key insight is that this is primarily an **input format** problem, not a logic visualization problem. Once content is normalized, the existing rendering pipeline works unchanged.
