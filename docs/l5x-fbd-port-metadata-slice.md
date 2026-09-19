# L5X FBD Port Metadata Slice (Issue #41)

- **Capability:** Resolve explicit canonical ports and special-array requirements for FBD Blocks, Functions, and Add-On Instructions without treating the RLL instruction registry or wire participation as FBD metadata.
- **Public entry points:** `L5XParser.parse`, `L5XParser.parseDocument`, `parseString`, `parseDocumentString`, and the exported FBD metadata resolver.
- **Normalized result and invariants:** Each resolved port has an exact wire ID, display label, input/output direction, left/right side, deterministic side-local order, and default-visibility flag. `VisiblePins` selects Block and AOI ports from canonical metadata. AOI InOut bindings remain separate from wireable Input and Output ports. DEDT retains its required `StorageArray` metadata and source binding.
- **Supported versions:** Studio 5000 v33, v34, and v35. The schema-declared Block and AOI grammar is identical in the three pinned schemas.
- **Export envelopes:** Program-owned and AOI-owned FBD routines use controller-scoped software revision, processor type, and AOI definitions from the containing export.
- **XSD symbols:** `FBD_BlockType`, `FBD_SpecialArrayType`, `FBD_AOIType`, `FBD_AOIArgumentType`, and `AOIParameterType`. `Function` is absent from the v33-v35 schemas, so Function tests remain explicit extension/placeholder behavior and do not expand schema conformance claims.
- **Unsupported or invalid policy:** Unknown mnemonics, unsupported form/controller/version combinations, duplicate port IDs, unresolved direction or side, and visible pins absent from usable metadata produce stable diagnostics. Affected elements become canonical placeholders with only safely resolved ports; wire direction is never inferred.
- **Non-goals:** SVG artwork, wire routing, application integration, live values, Studio 5000 visual cloning, exhaustive metadata for instructions outside the nine level-control mnemonics, and schema expansion beyond v33-v35.
- **Tests and fixtures:** `tests/parsers/l5x-fbd-port-metadata.test.ts`, `fbd-port-metadata-v33.L5X`, `fbd-port-metadata-v34.L5X`, `fbd-port-metadata-v35.L5X`, plus existing connected-wire and AOI regressions.
- **Completion commands:** Focused metadata tests, schema validation, conformance, typecheck, lint, full suite, and build.

The block catalog in this slice covers ADD, DEDT, HLL, LDLG, MUL, PIDE, SUB, D2SD, and GRT ports observed in the level-control export. Function metadata is limited to the math/compare mnemonics in that set and is additionally gated to supported modern controller families. Other instructions remain explicit unresolved placeholders until evidence is added in a later slice.
