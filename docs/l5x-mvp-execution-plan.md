# Full-L5X MVP Execution Plan

## Goal

Deliver a target-aware L5X parser for the existing Studio 5000 v33-v35 compatibility matrix. Controller, Program, Routine, Rung, Tag, UDT, AOI, and Module exports must produce usable results. Every known element must be normalized, while protected or unsupported extensions must be retained as inspectable parsed fragments instead of being silently dropped.

## Execution sequence

1. Complete the remaining issue #14 top-level controller families against the stable document contract. Task scheduling (#30), program parameters/state (#31), child-program/equipment hierarchy (#32), and trends/watch lists (#33) are complete.
2. Complete issue #15: add typed FBD and SFC bodies, with protected or encoded bodies represented explicitly.
3. Complete the issue #16 MVP parsing scope: module hierarchy, ports, communications, and complete configuration data.
4. Integrate all extractors, update exact fixture baselines, enforce the no-silent-loss invariant, and run all verification gates.

The prerequisite slices are complete: issue #6 parser-owned AOI instruction context; issues #11 and #8 target-aware documents and fragment preservation; issue #9 source-aware RLL grammar; and issues #1 and #13 complete tag value and metadata normalization.

## Remaining parallel work

- The controller/program (#14), routine (#15), and module (#16) tracks can run in parallel on the completed `PlcDocument` and vendor-fragment contracts.
- The document-contract owner owns central public types, parser entry points, and final assembly. Feature tracks should contribute dedicated extractors and their fixtures/tests to minimize merge conflicts.
- Fixture work can accompany each content track; exact conformance baselines are finalized only during integration.

## Public API direction

- Add `PlcDocument` with source format/version/target metadata and a typed resource union for all declared export targets.
- Add `parseDocumentString`, `parseDocumentBuffer`, and `parseDocumentFile` as the source-of-truth document APIs.
- Preserve the existing `parseString`, `parseBuffer`, and `parseFile` controller-shaped behavior through a compatibility adapter where applicable.
- Associate AOI instruction metadata with each successful parse result; global instruction registration remains an explicit legacy operation.
- Preserve unnormalized schema-valid content with its XML path, parsed subtree, and reason. Byte-perfect spans and a formal partial-result protocol remain post-MVP.

## Test and completion gates

- Exercise every declared target type through the public parser API.
- Cover v33, v34, and v35 wherever an in-scope XSD construct exists.
- Assert exact tag values/scopes, task and program relationships, routine topology, and module hierarchy—not only counts.
- Test RLL nested calls, quoted delimiters, nested branches, unknown instructions, and malformed recovery.
- Prove two parsed controllers retain independent AOI metadata and rendering behavior.
- Verify every recognized fixture node maps to a typed field or preserved fragment.
- Run `npx vitest run tests/parsers/l5x-parser.test.ts`, `npm run test:schema`, `npm run test:conformance`, `npm run typecheck`, `npm run lint`, `npm run test:run`, and `npm run build`.

## Deferred work

Defer issue #7's full diagnostic contract, issue #10 package splitting, issue #12 stable query indexes, issue #17 vendor adapter SDK, and issue #18 service integration. Defer only the formal Studio-version support policy from issue #16. Issue #5 resource guards and cancellation support are already implemented. Keep issue #20 as the roadmap umbrella.

## Completed slice brief: issue #6

- **Capability:** Parsing an L5X or JSON controller returns controller-scoped AOI instruction metadata without mutating global state, and ladder/diff renderers can use that context for correct AOI labels.
- **Public entry points:** `parseString`, `parseBuffer`, and `parseFile`; `VirtualizedLadderDiagram`, `InlineDiffRung`, and BOX symbol rendering.
- **Result and invariants:** Each successful result owns a distinct instruction registry containing built-ins plus that document's AOIs; parsed instruction categories and rendered labels use the matching registry; parsing never clears or populates the global registry.
- **Supported versions and envelopes:** Existing v33-v35 Controller and Program fixtures; the isolation behavior is format-agnostic and also applies to JSON parser results.
- **Unsupported/invalid policy:** Existing parse errors and resource guards are unchanged; legacy callers may explicitly register AOIs globally.
- **Non-goals:** No canonical document model, new L5X construct, query index, service isolation, or removal of legacy global APIs.
- **Completion commands:** Focused parser and component tests, followed by typecheck, lint, conformance, schema validation, full suite, and build.

## Completed slice: issues #11 and #8

See [the document slice contract](l5x-document-slice.md). Target/context/reference resources, document entry points, parsed-fragment preservation, and strict missing-target behavior are implemented. Controller-shaped and document APIs return `MISSING_L5X_TARGET` for a Program envelope without an actual Program.

## Completed slice: issue #9

The permissive rung scanner has been replaced with a source-aware tokenizer and grammar. Nested operands, quoted delimiters, branch order, unknown instructions, and malformed recovery are covered across the normalized parsers and v33-v35 fixtures.

## Completed slice: issues #1 and #13

Tag parsing now covers decorated scalar, array, and structure values; aliases and dimensions; comments, constants, force data, alarms, access metadata, and scope. Schema-valid unmodeled encodings are preserved and reported as partial rather than silently discarded.

## Progress

- **2026-09-04 — Issue #6 implementation:** Parser-owned instruction contexts and explicit renderer injection are implemented in Ladder Visualizer. ControlZebra's file and diff viewers cache and forward those contexts without clearing or repopulating the global registry. Ladder Visualizer and ControlZebra verification gates pass.
- **2026-09-06 — Issue #6 review follow-up:** Context creation and category application are encapsulated behind one controller finalizer. Public parser results are fully classified before success is returned, regardless of global-registry contents. This follow-up does not change the v33-v35 XML contract, normalized fields, export envelopes, validation behavior, resource guards, or compatibility fixtures. Tests cover public parser isolation plus distinct flat/tree instruction objects; the standard parser, schema, conformance, typecheck, lint, full-suite, and build gates pass.
- **2026-09-16 — Issues #11 and #8 completion:** The target-aware `PlcDocument` API covers all eight declared export targets across v33-v35, retains context/reference resources and unmodeled parsed fragments, and shares strict target validation with controller-shaped APIs. Program envelopes without a Program now return `MISSING_L5X_TARGET`; no synthetic Program is created.
- **2026-09-17 — Issue #9 completion:** Source-aware RLL grammar support landed through PR #28, including nested calls, quoted delimiters, nested branches, unknown instructions, and recovery diagnostics.
- **2026-09-18 — Issues #1 and #13 completion:** Complete tag parsing across the supported schema versions landed through PR #29, with exact semantic fixtures, partial-status handling, renderer coverage, and conformance updates.
- **2026-09-18 — Issue #30 implementation:** Controller tasks, event metadata, ordered scheduled-program names, inverse program task names, relationship diagnostics, and exact task counts are implemented across v33-v35. Sanitized fixtures cover continuous, periodic, event, absent, repeated, preserved, and invalid relationship cases.
- **2026-09-18 — Issue #32 completion:** Program identities, parent relationships, folder metadata, Equipment Phase identifiers, recipe phase names, hierarchy diagnostics, and preserved SFC-based equipment sequencing are implemented across v33-v35.
- **2026-09-18 — Issue #33 implementation:** Controller trends, pens, quick-watch lists, and watch tags normalize in source order across v33-v35. Omitted and empty collections, schema-declared optionals, opaque trend templates, and unsafe integer diagnostics are covered by sanitized fixtures.
