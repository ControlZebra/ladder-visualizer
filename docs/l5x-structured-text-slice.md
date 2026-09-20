# L5X Structured Text normalization slice

- **Capability:** Preserve Structured Text source lines for routines owned by Programs and Add-On Instruction definitions.
- **Public entry point:** `L5XParser.parse`, `parseString`, and `parseDocumentString`.
- **Normalized result/invariants:** `NormalizedRoutine.stContent` retains source order, each declared line number, empty lines, and the exact CDATA or plain-text body. Program and AOI ownership remains explicit through their existing routine collections and document resources.
- **Supported versions in scope:** Studio 5000 v33, v34, and v35.
- **Export envelopes/TargetTypes:** Controller/full-project Programs and standalone `AddOnInstructionDefinition` targets.
- **XSD symbols and version differences:** `RoutineType/STContent`, `STContentType/Line`, and mixed `STLineType` are structurally identical in v33-v35. `STContent` and `Line` are both zero-or-more.
- **Unsupported or invalid policy:** Existing XML validation remains authoritative. Mixed text split across both ordinary text and CDATA within one line, and schema-valid lines without a `Number`, are not newly normalized by this slice.
- **Non-goals:** Parsing the ST language, evaluating code, inferring symbols/control flow, expanding supported schemas beyond v33-v35, or changing SFC/FBD behavior.
- **Test files and fixtures:** Existing full-project fixtures cover repeated CDATA Program lines; AOI fixtures gain ST routines for v33-v35, including singleton, plain-text, and empty-line-collection cases. The AB-samples `Equipment_Phase_Sequencer.L5X` export is the real-world v17 regression input used during investigation without expanding the schema compatibility claim.
- **Completion commands:** `npx vitest run tests/parsers/l5x-parser.test.ts tests/parsers/l5x-document.test.ts`; `npm run test:schema`; `npm run test:conformance`; `npm run typecheck`; `npm run lint`; `npm run test:run`.
