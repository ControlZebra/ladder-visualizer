# L5X FBD Normalization Slice (Issue #40)

## Slice brief

- **Capability:** Expose one accepted static FBD body through `NormalizedRoutine.fbd` without silently discarding recognized or recoverable sheet content.
- **Public entry points:** `L5XParser.parse`, `L5XParser.parseDocument`, `parseString`, and `parseDocumentString` for Program-owned and AOI-owned routines.
- **Normalized result and invariants:** Bodies retain declared or explicitly marked fallback sheet metadata, ordered sheets and descriptions, positioned elements, exact string IDs and coordinates, ordered block arrays/AOI bindings/routine-call parameters, canonical connections, attachments, and recovery diagnostics. Omitted IRef/ICon source terminals and ORef/OCon destination terminals resolve to the canonical `value` port.
- **Supported versions:** Studio 5000 v33, v34, and v35. The FBD grammar used by this slice is identical in the three pinned schemas.
- **Export envelopes:** Program and AOI ownership are covered directly; Controller/full-project and standalone component selection continue through the existing document pipeline.
- **XSD symbols:** `FBDContentType`, `SheetType`, `FBD_IRefType`, `FBD_ORefType`, `FBD_IConType`, `FBD_OConType`, `FBD_BlockType`, `FBD_SpecialArrayType`, `FBD_AOIType`, `FBD_AOIArgumentType`, `FBD_GSVType`, `FBD_SSVType`, `FBD_JSRType`, `FBD_SBRType`, `FBD_RETType`, `FBD_WireType`, `FBD_FeedbackWireType`, `TextBoxType`, and `AttachmentType`.
- **Unsupported or invalid policy:** Schema-valid GSV/SSV nodes, schema-absent Function nodes, unknown sheet children, and malformed/unplaceable elements survive as canonical placeholders. Placeholder diagnostics make the result partial. Missing optional presentation metadata uses explicit `source: "fallback"` values and informational diagnostics without making an otherwise usable body partial.
- **Non-goals:** Instruction-port direction or datatype semantics, SVG layout, interaction, SFC normalization, online-edit selection, and ControlZebra integration.
- **Tests and fixtures:** `tests/parsers/l5x-fbd-normalization.test.ts`, `fbd-v33.L5X`, `fbd-v34.L5X`, `fbd-v35.L5X`, `fbd-aoi-v35.L5X`, `fbd-canonical-v35.L5X`, and the full-project/conformance regressions.
- **Completion commands:** Focused FBD tests, schema validation, conformance, typecheck, lint, full suite, and build.

## Canonical fallback policy

The normalized model keeps fallback provenance next to each value. Missing sheet size becomes `Unspecified`, missing or invalid orientation becomes `Landscape`, missing or invalid sheet number becomes the one-based source sheet index, and missing sheet name becomes `Sheet <number>`. These values are deterministic display metadata, not claims that the source declared them.

IDs, coordinates, sheet numbers, connection endpoints, and attachment endpoints remain decimal strings so valid `xs:unsignedLong` values are not rounded by JavaScript. Required positioned-element fields are checked against the full unsigned-long range. A recoverable node with missing or invalid fields becomes a placeholder with stable reason codes.

## Source preservation

The canonical FBD body is the consumer-facing representation. The accepted parsed `FBDContent` subtree also remains in `PlcDocument.fragments` with `reason: "source-representation"` for vendor-specific fidelity. It is no longer classified as `unmodeled`, and a valid body no longer makes the parse partial merely because it is FBD.
