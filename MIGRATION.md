# Migration Guide: Legacy Types to Normalized Types

This guide helps you transition from the legacy format-specific types to the new vendor-agnostic normalized types introduced in the multi-format support update.

---

## Overview

The ladder-visualizer library originally used types that were tightly coupled to the Allen-Bradley/Rockwell JSON export format. To support multiple file formats (JSON, L5X, and potentially others), we've introduced a normalized type system that provides a vendor-agnostic internal representation.

### Benefits of Normalized Types
- **Format-agnostic**: Work with any supported file format
- **Consistent API**: Same types regardless of input format
- **Future-proof**: Easy to add support for new formats
- **Cleaner code**: No more format-specific conditionals

---

## Type Mapping

### Controller Types

| Legacy Type | Normalized Type | Notes |
|-------------|-----------------|-------|
| `ControllerExport` | `NormalizedController` | Root controller data |
| `Program` | `NormalizedProgram` | Program with routines |
| `Routine` | `NormalizedRoutine` | Routine definition |
| `ParsedRoutine` | `NormalizedRoutine` | Parsed routine with rungs |
| `Rung` | `NormalizedRung` | Individual rung |
| `Tag` | `NormalizedTag` | Tag definition |
| `DataType` | `NormalizedDataType` | Data type definition |
| `DataTypeMember` | `NormalizedDataTypeMember` | Member of structured type |
| `AOI` | `NormalizedAOI` | Add-On Instruction |

### Property Naming Changes

The normalized types use camelCase consistently:

| Legacy Property | Normalized Property |
|-----------------|---------------------|
| `serial_number` | `serialNumber` |
| `created_date` | `createdDate` |
| `modified_date` | `modifiedDate` |
| `data_types` | `dataTypes` |
| `map_devices` | `modules` |
| `tag_type` | `tagType` |
| `data_type` | `dataType` |
| `external_access` | `externalAccess` |

---

## Migration Steps

### Step 1: Update Imports

```typescript
// Before
import type { ControllerExport, Program, Routine, Tag, DataType } from 'ladder-visualizer';

// After
import type { 
  NormalizedController, 
  NormalizedProgram, 
  NormalizedRoutine, 
  NormalizedTag, 
  NormalizedDataType 
} from 'ladder-visualizer';
```

### Step 2: Update Parsing

The unified `parseFile()` and `parseString()` functions now return normalized types:

```typescript
// Before
import { parseControllerExport } from 'ladder-visualizer';
const controller = parseControllerExport(jsonData);

// After
import { parseFile, parseString } from 'ladder-visualizer';

// From file (auto-detects format)
const result = await parseFile(file);
if (result.success) {
  const controller: NormalizedController = result.data;
}

// From string
const result = parseString(jsonContent);
if (result.success) {
  const controller: NormalizedController = result.data;
}
```

### Step 3: Update Property Access

```typescript
// Before (legacy)
const serialNumber = controller.serial_number;
const tags = controller.tags;
const dataTypes = controller.data_types;

// After (normalized)
const serialNumber = controller.serialNumber;
const tags = controller.tags;
const dataTypes = controller.dataTypes;
```

### Step 4: Update Components

All components now accept both legacy and normalized types, so migration can be gradual:

```typescript
// Both work!
<TagTable tags={legacyTags} />
<TagTable tags={normalizedTags} />

<ControllerInfo controller={legacyController} />
<ControllerInfo controller={normalizedController} />

<ProgramNavigator 
  controller={controller}  // Either type works
  programs={programs}      // Either type works
/>

<VirtualizedLadderDiagram 
  routine={routine}  // ParsedRoutine or NormalizedRoutine
/>
```

---

## Type Definitions Comparison

### NormalizedController

```typescript
interface NormalizedController {
  name: string;
  description?: string;
  serialNumber?: string;
  commPath?: string;
  createdDate?: Date;       // Note: Date object, not string
  modifiedDate?: Date;
  dataTypes: NormalizedDataType[];
  tags: NormalizedTag[];
  programs: NormalizedProgram[];
  aois: NormalizedAOI[];
  modules: NormalizedModule[];  // Replaces map_devices
  vendor?: PLCVendor;
  sourceFormat?: SourceFormat;
  vendorMetadata?: Record<string, unknown>;
}
```

### NormalizedTag

```typescript
interface NormalizedTag {
  name: string;
  tagType: NormalizedTagType;  // 'Base' | 'Alias' | 'Produced' | 'Consumed' | 'Unknown'
  dataType: string;
  radix?: string;
  externalAccess?: ExternalAccess;  // 'ReadWrite' | 'ReadOnly' | 'None'
  scope: TagScope;  // 'Controller' | 'Program' | 'Local'
  programName?: string;
  description?: string;
  aliasFor?: string;
  value?: unknown;
}
```

### NormalizedRoutine

```typescript
interface NormalizedRoutine {
  name: string;
  type: NormalizedRoutineType;  // 'RLL' | 'FBD' | 'ST' | 'SFC'
  rungs: NormalizedRung[];
  description?: string;
}
```

### NormalizedRung

```typescript
interface NormalizedRung {
  number: number;
  comment?: string;       // Rung comments now first-class!
  raw: string;
  elements: RungElement[];
  instructions: Instruction[];
  type?: 'Normal' | 'Empty' | 'Delete' | 'Insert' | ...;
}
```

---

## Handling Dates

The normalized types use JavaScript `Date` objects instead of strings:

```typescript
// Before (legacy)
const createdDate: string = controller.created_date;
console.log(createdDate);  // "2024-01-15T10:30:00Z"

// After (normalized)
const createdDate: Date | undefined = controller.createdDate;
console.log(createdDate?.toISOString());  // "2024-01-15T10:30:00.000Z"
console.log(createdDate?.toLocaleDateString());  // "1/15/2024"
```

---

## Backward Compatibility

### Legacy API Still Works

The legacy parsing functions are still available but marked as deprecated:

```typescript
// Still works, but shows deprecation warning in IDE
import { parseControllerExport } from 'ladder-visualizer';
```

### Components Accept Both Types

All React components accept both legacy and normalized types, allowing gradual migration:

```typescript
// All of these work
<TagTable tags={legacyTags} />
<TagTable tags={normalizedTags} />
<TagTable tags={mixedTags} />  // Even mixed arrays work!
```

---

## Common Migration Patterns

### Pattern 1: Unified Controller Handling

```typescript
// Helper to work with both types
function getControllerName(controller: ControllerExport | NormalizedController): string {
  if ('serialNumber' in controller) {
    // Normalized
    return controller.name;
  }
  // Legacy
  return controller.serial_number 
    ? `Controller_${controller.serial_number}` 
    : 'Controller';
}
```

### Pattern 2: Type Guard

```typescript
function isNormalizedController(
  controller: ControllerExport | NormalizedController
): controller is NormalizedController {
  return 'serialNumber' in controller || 'sourceFormat' in controller;
}

// Usage
if (isNormalizedController(controller)) {
  console.log(controller.dataTypes);  // TypeScript knows the type
} else {
  console.log(controller.data_types);
}
```

### Pattern 3: Convert Legacy to Normalized

If you need to convert legacy data to normalized format, use the parsing functions:

```typescript
import { parseString } from 'ladder-visualizer';

// Parse legacy JSON string to get normalized result
const result = parseString(JSON.stringify(legacyController));
if (result.success) {
  const normalized = result.data;
}
```

---

## Timeline

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1-3 | ✅ Complete | Normalized types, parser registry, L5X support |
| Phase 4 | ✅ Complete | Components updated to accept normalized types |
| Future | Planned | Legacy types may be removed in v2.0 |

---

## Getting Help

If you encounter issues during migration:

1. Check the type definitions in `src/types/normalized/`
2. Look at the demo app (`demo/App.tsx`) for usage examples
3. Open an issue on GitHub with your specific use case

---

## Checklist

- [ ] Update imports to use normalized types
- [ ] Update parsing to use `parseFile()` or `parseString()`
- [ ] Update property access to use camelCase
- [ ] Handle `Date` objects instead of date strings
- [ ] Test with both JSON and L5X files
- [ ] Remove any format-specific conditionals
