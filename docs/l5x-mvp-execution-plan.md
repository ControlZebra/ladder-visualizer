# Full-L5X MVP Execution Plan

## Goal

Deliver a target-aware L5X parser for the existing Studio 5000 v33-v35 compatibility matrix. Controller, Program, Routine, Rung, Tag, UDT, AOI, and Module exports must produce usable results. Every known element must be normalized, while protected or unsupported extensions must be retained as inspectable parsed fragments instead of being silently dropped.

## Execution sequence

1. Finish issue #6: isolate AOI instruction metadata per parse result, pass that context explicitly to renderers, and retain global registration only as a deprecated opt-in compatibility path.
2. Establish the lean `PlcDocument` contract from issue #11 together with the issue #8 preservation mechanism. Add target-aware document entry points while retaining controller-shaped compatibility APIs.
3. Complete issue #9 by replacing the permissive RLL scanner with a tokenizer and grammar that preserves nested operands, quoted delimiters, branch order, unknown instructions, and recovered source.
4. Complete the content tracks against the stable document contract:
   - Issues #1 and #13 together: decorated tag values, structures, arrays, comments, constants, force/alarm/access metadata, and scope.
   - Issue #14: tasks, program parameters/connections, child-program/equipment hierarchy, and remaining top-level families.
   - Issue #15: typed FBD and SFC bodies, with protected or encoded bodies represented explicitly.
   - Issue #16 parsing scope: module hierarchy, ports, communications, and complete configuration data.
5. Integrate all extractors, update exact fixture baselines, enforce the no-silent-loss invariant, and run all verification gates.

## Parallel work

- Issues #6 and #9 can proceed immediately in parallel; they coordinate only on the instruction-context contract.
- After the `PlcDocument` and vendor-fragment contracts land, the tag (#1/#13), controller/program (#14), routine (#15), and module (#16) tracks can run in parallel.
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

Defer issue #5 resource/cancellation hardening, issue #7 complete/partial/failed diagnostics, issue #10 package splitting, issue #12 stable query indexes, issue #17 vendor adapter SDK, and issue #18 service integration. Defer only the formal Studio-version support policy from issue #16. Keep issue #20 as the roadmap umbrella.

## Current slice brief: issue #6

- **Capability:** Parsing an L5X or JSON controller returns controller-scoped AOI instruction metadata without mutating global state, and ladder/diff renderers can use that context for correct AOI labels.
- **Public entry points:** `parseString`, `parseBuffer`, and `parseFile`; `VirtualizedLadderDiagram`, `InlineDiffRung`, and BOX symbol rendering.
- **Result and invariants:** Each successful result owns a distinct instruction registry containing built-ins plus that document's AOIs; parsed instruction categories and rendered labels use the matching registry; parsing never clears or populates the global registry.
- **Supported versions and envelopes:** Existing v33-v35 Controller and Program fixtures; the isolation behavior is format-agnostic and also applies to JSON parser results.
- **Unsupported/invalid policy:** Existing parse errors and resource guards are unchanged; legacy callers may explicitly register AOIs globally.
- **Non-goals:** No canonical document model, new L5X construct, query index, service isolation, or removal of legacy global APIs.
- **Completion commands:** Focused parser and component tests, followed by typecheck, lint, conformance, schema validation, full suite, and build.

## Progress

- **2026-09-04 — Issue #6 implementation:** Parser-owned instruction contexts and explicit renderer injection are implemented in Ladder Visualizer. ControlZebra's file and diff viewers cache and forward those contexts without clearing or repopulating the global registry. Ladder Visualizer and ControlZebra verification gates pass.
- **2026-09-06 — Issue #6 review follow-up:** Context creation and category application are encapsulated behind one controller finalizer. Public parser results are fully classified before success is returned, regardless of global-registry contents. This follow-up does not change the v33-v35 XML contract, normalized fields, export envelopes, validation behavior, resource guards, or compatibility fixtures. Tests cover public parser isolation plus distinct flat/tree instruction objects; the standard parser, schema, conformance, typecheck, lint, full-suite, and build gates pass.
