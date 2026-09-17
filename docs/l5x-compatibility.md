# L5X compatibility contract

Compatibility matrix version: **1.1.0**

This document defines the narrow, testable claims Ladder Visualizer may make about Rockwell L5X input. A profile is a promise about named constructs and export shapes. It is not a percentage derived from the number of entities that happened to survive normalization.

The executable source of truth is [`tests/fixtures/l5x/manifest.ts`](../tests/fixtures/l5x/manifest.ts). The manifest records the source version, actual L5X target type, expected parse status, source counts, normalized counts, and current parser outcome for every sanitized fixture.

## Compatibility profiles

| Profile                   | Version 1.1.0 status | Included contract                                                                                     | Known boundaries                                                                                                  |
| ------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `rockwell-controller-rll` | Supported            | Controller metadata, UDT headers, controller and program tags, AOIs, modules, RLL routines, and rungs | Does not promise complete controller configuration or decorated values                                            |
| `rockwell-program-rll`    | Supported            | Program target exports with program tags and RLL routines                                             | Program parameters and child programs are preserved but not normalized; resource IDs are document-local                              |
| `rockwell-routine-rll`    | Supported            | RLL routine target exports represented in the controller-shaped result                                | Document-local resource identity is available; stable cross-export identity and source spans are not modeled                                                        |
| `rockwell-rung-rll`       | Supported          | Standalone `TargetType="Rung"` exports are present in the corpus                                      | Rungs have typed resources and owner routine IDs                                                                    |
| `rockwell-tags`           | Partial              | Controller/program scalar tags, aliases, and UDT headers                                              | Standalone targets are supported; decorated values and additional metadata are preserved but not fully normalized |
| `rockwell-full-project`   | Unsupported          | Corpus coverage tracks RLL, FBD, SFC, protected content, and malformed/adversarial input              | Unsupported and encoded bodies are preserved with diagnostics; typed body normalization remains incomplete                                            |

“Supported” applies only to the declared fixture shapes and versions. “Partial” means useful content is returned but at least one declared construct is lost or rejected. “Unsupported” means the profile must not be advertised as a successful parse contract.

## Corpus matrix

The core corpus contains every required artifact target for every declared Studio 5000 version. Each cell is backed by a separate fixture rather than inferring compatibility from a different version.

| Artifact target            | v33.00   | v34.01   | v35.01   | Current boundary                    |
| -------------------------- | -------- | -------- | -------- | ----------------------------------- |
| Controller                 | complete | complete | complete | Controller-shaped result            |
| Program                    | complete | complete | complete | Controller-shaped result            |
| Routine                    | complete | complete | complete | Controller-shaped result            |
| Rung                       | complete | complete | complete | Typed rung and owner routine        |
| Tag                        | partial  | partial  | partial  | Tag data representations preserved  |
| DataType (UDT)             | complete | complete | complete | Typed UDT target and dependencies   |
| AddOnInstructionDefinition | complete | complete | complete | AOI metadata and RLL normalize      |
| Module                     | complete | complete | complete | Typed module target and dependencies |

Three additional `full-project-vXX` fixtures exercise the same semantic families in v33, v34, and v35:

- Structured Text lines, RLL, FBD, SFC, and protected routines.
- Base, produced, and consumed tags plus decorated array data.
- AOI and program parameters and local tags.
- Module ports and connections.
- Tasks, scheduled programs, and wall-clock configuration.
- The schema transition where `MaxObservedNetworkDelay` is an integer in v33 and a float in v34/v35.

Focused v35 FBD, SFC, and protected-routine fixtures retain small loss-regression cases. Truncated v35 XML, mismatched v34 XML, and a v35 entity-declaration fixture cover malformed and adversarial handling.

The distinction between contract status and current parser outcome is deliberate. The public parser still returns a legacy boolean result and cannot express `partial`; the corpus records the intended production status without pretending the legacy API already provides it. Later Phase 1 work can replace the current-outcome assertion with a direct status assertion.

## Target-aware document API

`parseDocumentString`, `parseDocumentBuffer`, `parseDocumentFile`, and `L5XParser.parseDocument` return a `PlcDocument`. All eight target families appear in `resources`, including context and reference dependencies. Each discriminated resource has a `kind`, typed `data`, a `role`, a one-based XML `sourcePath` used as its document-local `id`, and an `ownerId` where applicable. `targetIds` identifies only the declared export family; owned descendants inherit target roles unless explicitly overridden. IDs are not stable across exports.

Explicit resource `Use` takes precedence over the immediate collection's `Use`. Otherwise targets are selected by name, a unique eligible candidate, or an export without context. The parser checks declared target counts and reports `AMBIGUOUS_L5X_TARGET` instead of choosing between unresolved candidates. Missing targets produce `MISSING_L5X_TARGET` through document and controller-shaped APIs.

`fragments` retains unmodeled elements, protected/encoded content, and source representations that extend or overlap existing normalized fields. Each fragment has a path, parsed subtree, and reason (`unmodeled`, `protected`, or `source-representation`). Attributes use `@_`; text and CDATA use `#text` and `#cdata`. `mappings` accounts for source leaves represented by typed fields. Tests require every parsed leaf to be mapped or preserved. This is parsed-subtree preservation, without a byte-perfect XML, comment, or heterogeneous interleaving-order guarantee.

A successful result means a usable document was returned, not that all content was normalized. `PRESERVED_L5X_CONTENT` identifies results with retained fragments. Typed tag values, tasks/configuration and FBD/SFC bodies remain later slices. Encoded routines expose their headers and retain the body as a protected fragment.

Existing controller-shaped APIs use the same document pipeline and support the newly accepted target families. They return warnings, while the document APIs provide access to fragments. A `TargetType="Program"` envelope without an actual Program target returns `MISSING_L5X_TARGET` through both API families; the parser never fabricates a Program that is absent from the source.

The document capability is optional on `PLCParser`; existing custom parsers remain compatible. JSON parsing continues through the existing APIs. Calling a document API with a parser lacking that capability returns `UNSUPPORTED_FORMAT`.

## Count rules

Every fixture declares both `sourceCounts` and `normalizedCounts`:

- Source counts are lexical counts of the entity elements present in the L5X input. This remains deterministic even for intentionally malformed files.
- Normalized counts describe the current `NormalizedController` result. They are `null` when parsing fails.
- AOI routines and rungs are included in the aggregate routine and rung totals.
- Counts include ST lines, AOI parameters/local tags, module ports/connections, tasks, decorated arrays, protected-content containers, and wall-clock objects where applicable.
- A count change requires an intentional manifest update and review; tests must not silently regenerate baselines.

## Schema validation

Every corpus fixture other than the intentionally malformed and entity-policy cases must validate against its matching v33, v34, or v35 XSD. `npm run test:schema` uses `xmllint` and the schema directory named by `L5X_SCHEMA_DIR`; locally it defaults to the sibling `l5x-schema` checkout.

CI checks out `ControlZebra/l5x-schema` at commit `441573b4f96493a0fa31627a51b8a4ecb857e980`, so schema changes cannot silently alter the baseline. Intentionally malformed and entity-policy fixtures are excluded from XSD success validation and remain covered by parser assertions.

## Adding or changing fixtures

1. Prefer a minimal synthetic export. Anonymize controller names, project serials, network addresses, user names, process names, and proprietary logic before committing a real export.
2. Add the `.L5X` file and its manifest entry in the same change.
3. Declare profiles, Studio 5000 version, root target type, artifact kind, expected contract status, exact source counts, and current normalized counts or error code.
4. Use `partial` whenever source content is omitted or recovered. Use `failed` when the source must not produce a document under the intended production contract.
5. Never weaken an existing count merely to make a regression pass. Explain intentional model changes in the pull request.
6. Run `npm run test:schema`, `npm run test:conformance`, `npm run test:run`, and `npm run typecheck`.

## Reporting

Report corpus results by profile and Studio 5000 version, including complete, partial, and failed fixture counts. Do not publish one overall L5X compatibility percentage: retaining many RLL rungs does not compensate for discarding a single safety-critical FBD or SFC routine.

## Format reference

The fixture taxonomy follows Rockwell Automation publication 1756-RM014D-EN-P, _Logix 5000 Controllers Import/Export_ (September 2025). Fixtures are continuously checked against the corresponding `l5x-v33.xsd`, `l5x-v34.xsd`, or `l5x-v35.xsd` from the pinned ControlZebra `l5x-schema` revision. Public vendor-generated component exports were used only to corroborate root target spellings; committed fixtures are synthetic and contain no third-party project logic.
