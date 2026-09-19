# L5X FBD Compatibility Slice (Issue #39)

## Slice brief

- **Capability:** Accept exactly one untagged static FBD body per routine and reject ambiguous online-edit representations before normalized-model creation.
- **Public entry points:** `L5XParser.parse`, `L5XParser.parseDocument`, `parseString`, and `parseDocumentString`.
- **Normalized result and invariants:** This boundary slice originally left FBD normalization to issue #40. Accepted static bodies now continue into the canonical model described by that slice; rejected bodies return no controller or document data.
- **Supported versions:** Studio 5000 v33, v34, and v35. The FBD schema region is byte-identical in the three supported XSDs.
- **Export envelopes:** Program-owned and AOI-owned routines in Controller, Program, Routine, and AOI envelopes share the same pre-normalization check.
- **XSD symbols:** `RoutineType.FBDContent` has `maxOccurs="unbounded"`; `FBDContentType.OnlineEditType` uses `LangContOnlineEditEnum` (`NoType`, `Original`, `PendingEdits`, `TestEdits`, `OrginalPending`, `LastType`). The handwritten raw type must therefore accept a singleton or array and expose the attribute.
- **Unsupported or invalid policy:** Only one FBD body with no `OnlineEditType` is accepted. `NoType` is not accepted without real-export evidence. Any tagged body, repeated body, combined edit views, or unknown state fails with `UNSUPPORTED_FBD_ONLINE_EDIT`, the owning routine path, and the observed states. No partial FBD model is returned.
- **Non-goals:** FBD element normalization, port metadata, diagram rendering, SFC compatibility, global source-version policy, and ControlZebra integration.
- **Tests and fixtures:** `tests/parsers/l5x-fbd-compatibility.test.ts`, `fbd-v33.L5X`, `fbd-v34.L5X`, `fbd-v35.L5X`, the full-project fixtures, and manifest/conformance baselines.
- **Completion commands:** focused FBD compatibility tests, schema validation, conformance, typecheck, lint, full suite, and build.

## Evidence and compatibility policy

The supported v33-v35 schemas declare the same FBD grammar. Focused fixtures therefore pin one untagged static Program-owned body in each supported version. Existing full-project fixtures exercise the same shape in a Controller envelope. The repository's sanitized fixtures are schema evidence, not claims about controller-family availability.

The available Rockwell sample corpus contains untagged static FBD exports from Studio 5000 v17 for ControlLogix 1756-L63 controllers. It demonstrates `Tabloid - 11 x 17 in` and `D - 22 x 34 in` sheet sizes, landscape orientation, CDATA sheet descriptions, and the `IRef`, `ORef`, `ICon`, `OCon`, `Block`, `AddOnInstruction`, `Wire`, `FeedbackWire`, `TextBox`, and `Attachment` families. These samples are useful shape evidence but do not expand the supported version range beyond v33-v35.

Current [Rockwell documentation for Function Block functions](https://www.rockwellautomation.com/en-il/docs/studio-5000-logix-designer/37-02/contents-ditamap/studio-5000-logix-designer/function-block-diagram-editor/function-block-editor-command-reference/function-block-functions.html) describes FBD functions for CompactLogix 5380/5480, ControlLogix 5580, Compact GuardLogix 5380, and GuardLogix 5580 controllers. The v33-v35 XSDs do not declare a `Function` child in `SheetType`, so issue #39 does not claim schema-backed Function support. Recoverable Function nodes now normalize as placeholders unless a supported-version export and compatible schema policy establish otherwise.

Conversely, all three supported XSDs declare `GSV` and `SSV` sheet children, while current [Rockwell GSV/SSV documentation](https://www.rockwellautomation.com/en-us/docs/studio-5000-logix-designer/38-01/contents-ditamap/instruction-set/input-output-instructions/get-system-value--gsv--and-set-system-value--ssv-.html) says those instructions are unavailable in Function Block. They are therefore schema-declared placeholder-only families for now: their presence in the XSD is not treated as proof of executable FBD support.

`DescriptionType` permits direct mixed text, `Value`, and localized-description forms. Real FBD sheet descriptions in the available corpus use CDATA. Issue #40 normalizes those description forms while retaining the whole accepted body as a parsed source-representation fragment.
