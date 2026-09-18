# L5X compatibility contract

Compatibility matrix version: **1.7.0**

This document defines the narrow, testable claims Ladder Visualizer may make about Rockwell L5X input. A profile is a promise about named constructs and export shapes. It is not a percentage derived from the number of entities that happened to survive normalization.

The executable source of truth is [`tests/fixtures/l5x/manifest.ts`](../tests/fixtures/l5x/manifest.ts). The manifest records the source version, actual L5X target type, expected parse status, source counts, normalized counts, and current parser outcome for every sanitized fixture.

## Compatibility profiles

| Profile                   | Version 1.7.0 status | Included contract                                                                                     | Known boundaries                                                                                                  |
| ------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `rockwell-controller-rll` | Supported            | Controller identity/communication metadata, UDT headers, controller and program tags, program hierarchy, Equipment Phase metadata, tasks and schedules, trends and quick-watch lists, AOIs, modules, RLL routines, and rungs | Rockwell-specific controller configuration and SFC-based equipment sequences are preserved rather than normalized |
| `rockwell-program-rll`    | Supported            | Program target exports with identity/hierarchy attributes, parameters, program state, program tags, and RLL routines | A parent omitted from a component export is not treated as invalid; resource IDs are document-local |
| `rockwell-routine-rll`    | Partial              | RLL routine target exports represented in the controller-shaped result                                | Context-controller configuration is retained and reported as partial; stable cross-export identity and source spans are not modeled                                                        |
| `rockwell-rung-rll`       | Supported          | Standalone `TargetType="Rung"` exports are present in the corpus                                      | Rungs have typed resources and owner routine IDs                                                                    |
| `rockwell-tags`           | Partial              | Controller/program tags, aliases, dimensions, comments, forces, decorated arrays/structures, and alarms | Standard tag attributes outside the normalized contract are preserved and explicitly reported as partial |
| `rockwell-full-project`   | Unsupported          | Corpus coverage tracks controller configuration, tasks, RLL, FBD, SFC, protected content, and malformed/adversarial input | Rockwell-specific configuration and unsupported/encoded bodies are preserved with diagnostics; typed FBD/SFC bodies remain incomplete |

“Supported” applies only to the declared fixture shapes and versions. “Partial” means useful content is returned but at least one declared construct is preserved without full normalization, recovered, or rejected. “Unsupported” means the profile must not be advertised as a successful parse contract.

## Corpus matrix

The core corpus contains every required artifact target for every declared Studio 5000 version. Each cell is backed by a separate fixture rather than inferring compatibility from a different version.

| Artifact target            | v33.00   | v34.01   | v35.01   | Current boundary                    |
| -------------------------- | -------- | -------- | -------- | ----------------------------------- |
| Controller                 | complete | complete | complete | Controller-shaped result            |
| Program                    | complete | complete | complete | Controller-shaped result            |
| Routine                    | complete | complete | complete | Controller-shaped result            |
| Rung                       | complete | complete | complete | Typed rung and owner routine        |
| Tag                        | complete/partial | complete/partial | complete/partial | Declared value forms normalize; unmodeled metadata is partial |
| DataType (UDT)             | complete | complete | complete | Typed UDT target and dependencies   |
| AddOnInstructionDefinition | complete | complete | complete | AOI metadata and RLL normalize      |
| Module                     | complete | complete | complete | Typed module target and dependencies |
| Controller configuration  | partial  | partial  | partial  | Clear metadata normalizes; Rockwell-specific families are preserved with diagnostics |

Three additional `full-project-vXX` fixtures exercise the same semantic families in v33, v34, and v35:

- Structured Text lines, RLL, FBD, SFC, and protected routines.
- Base, produced, and consumed tags plus decorated array data.
- AOI and program parameters and local tags.
- Module ports and connections.
- Tasks, scheduled programs, and wall-clock configuration.
- The schema transition where `MaxObservedNetworkDelay` is an integer in v33 and a float in v34/v35.

Focused v33-v35 FBD fixtures and focused v35 SFC and protected-routine fixtures retain small loss-regression cases. Truncated v35 XML, mismatched v34 XML, and a v35 entity-declaration fixture cover malformed and adversarial handling.

Public parser results expose both the legacy `success` boolean and a `status` of `complete`, `partial`, or `failed`. Built-in parsers and result helpers always provide `status`. The field remains optional on the `PLCParser` implementation contract so custom parsers compiled against the earlier boolean-only result remain source-compatible; registry and document orchestration fill a missing status deterministically.

Controller results expose tasks in source order. Task types, descriptions, scheduling attributes, event metadata, and ordered scheduled-program names normalize across v33-v35. Programs retain their declared executing-task name. Missing, duplicate, or contradictory relationships produce stable warnings and a `partial` result while preserving the usable controller. Stable cross-document task and program IDs remain outside this profile.

Controller results expose trends and quick-watch lists in source order. Trends retain capture, trigger, pre/post-sample, and version metadata plus ordered pens; pens retain display and engineering-range metadata. Quick-watch lists retain ordered tag specifiers and their source scopes. Omitted collections and empty child collections normalize to empty arrays. Schema-valid trend and pen integers outside JavaScript's safe range remain source-preserved, produce `UNSUPPORTED_L5X_TREND_NUMERIC_VALUE`, and make the result `partial`. Opaque Studio trend templates and collection bookkeeping IDs remain inspectable source representations rather than vendor-neutral fields.

Controller name, description, project serial, project dates, processor type, and communication path have canonical fields. Remaining controller attributes and the `RedundancyInfo`, `Security`, `SafetyInfo`, `CommPorts`, `CST`, `WallClockTime`, `DataLogs`, `TimeSynchronize`, `InternetProtocol`, `EthernetPorts`, and `EthernetNetwork` families remain complete parsed fragments. Each present family emits a stable `PRESERVED_L5X_*_CONFIGURATION` warning and makes the result `partial`; no cross-vendor meaning is inferred. The v33-v35 schemas define the same shapes, including unconstrained `DataLogs` and repeated serial/Ethernet ports.

## Target-aware document API

`parseDocumentString`, `parseDocumentBuffer`, `parseDocumentFile`, and `L5XParser.parseDocument` return a `PlcDocument`. All eight target families appear in `resources`, including context and reference dependencies. Each discriminated resource has a `kind`, typed `data`, a `role`, a one-based XML `sourcePath` used as its document-local `id`, and an `ownerId` where applicable. `targetIds` identifies only the declared export family; owned descendants inherit target roles unless explicitly overridden. IDs are not stable across exports.

Explicit resource `Use` takes precedence over the immediate collection's `Use`. Otherwise targets are selected by name, a unique eligible candidate, or an export without context. The parser checks declared target counts and reports `AMBIGUOUS_L5X_TARGET` instead of choosing between unresolved candidates. Missing targets produce `MISSING_L5X_TARGET` through document and controller-shaped APIs.

`fragments` retains unmodeled elements, protected/encoded content, and source representations that extend or overlap existing normalized fields. Each fragment has a path, parsed subtree, and reason (`unmodeled`, `protected`, or `source-representation`). Attributes use `@_`; text and CDATA use `#text` and `#cdata`. `mappings` accounts for source leaves represented by typed fields. Tests require every parsed leaf to be mapped or preserved. This is parsed-subtree preservation, without a byte-perfect XML or comment guarantee. Normalized decorated structures retain heterogeneous member declaration order. Opaque trend templates are retained as source representations.

A successful result means a usable document was returned, not that all content was normalized. `PRESERVED_L5X_CONTENT` identifies results with retained fragments. Standard tag metadata outside the normalized contract, explicitly preserved Rockwell controller configuration, and FBD/SFC bodies can make a result partial. Encoded routines expose their headers and retain the body as a protected fragment.

### FBD compatibility boundary

Across v33-v35, the parser accepts exactly one FBD body only when `OnlineEditType` is absent. Repeated bodies or any declared or unknown edit-state tag fail before normalized-model creation with `UNSUPPORTED_FBD_ONLINE_EDIT`; the error identifies the owning routine path and observed states. This prevents Original, Pending Edits, and Test Edits views from being mistaken for one deterministic static routine. `NoType` is also rejected until a supported-version real export establishes its semantics. Accepted static FBD bodies remain preserved and partial until issue #40 supplies the canonical normalized model. See [the issue #39 slice contract](l5x-fbd-compatibility-slice.md).

Existing controller-shaped APIs use the same document pipeline and support the newly accepted target families. They return warnings, while the document APIs provide access to fragments. A `TargetType="Program"` envelope without an actual Program target returns `MISSING_L5X_TARGET` through both API families; the parser never fabricates a Program that is absent from the source.

### Program parameters and state

Program parameters are normalized separately from AOI parameters and retain source order, owning program scope, usage, type metadata, optional booleans, comments, and L5K or decorated default data. Program edit, verification, disabled, routine-entry, Equipment Phase state, scan-time, redundancy-synchronization, and executing-task metadata remain optional when their source attributes are absent. Schema-valid program integers outside JavaScript's safe range remain source-preserved and produce `UNSUPPORTED_L5X_PROGRAM_NUMERIC_VALUE` with a `partial` result. Unsupported schema-valid default-data nodes are retained in document fragments and produce `UNSUPPORTED_L5X_PROGRAM_PARAMETER_DATA` with a `partial` result.

The pinned v33, v34, and v35 schemas use the same `ProgramType` and `AOIParameterType` definitions for these fields. None of those schemas declares a program parameter-connection element or attribute, so this compatibility version does not invent or advertise a parameter-connection relationship. Program `LocalTags` and task-to-program relationship validation remain separate slices.

### Program hierarchy and Equipment Phases

Programs retain schema-declared `UId` and `ParentUId` values as exact strings, preserving `xs:unsignedLong` precision, and retain the optional `UseAsFolder` flag. Controller program order remains source order, so parent relationships are deterministic without introducing a second nested program tree. Complete controller exports report duplicate identities, missing parents, cycles, and children attached to an explicit `UseAsFolder=false` parent as stable warnings with source paths and a `partial` result. A standalone Program export may legitimately omit its parent context, so an unresolved `ParentUId` there is retained without a missing-parent warning.

Equipment Phase programs remain distinguishable through `programType: "EquipmentPhase"`. Their existing state and command attributes are joined by safe-integer `equipmentId` and the exact, opaque `recipePhaseNames` string. `RecipePhaseNames` is not split into inferred relationships because the supported XSDs define only an unconstrained string. An out-of-range `EquipmentId` is preserved in document fragments and reported with `UNSUPPORTED_L5X_PROGRAM_NUMERIC_VALUE`.

The v33, v34, and v35 schemas do not declare an EquipmentSequence entity. The sanitized AB-Samples regression represents sequencing as an SFC whose embedded Structured Text invokes `PCMD` against Equipment Phase programs. The parser therefore does not invent a canonical sequence model: it preserves the `SFCContent` fragment and emits `UNSUPPORTED_L5X_EQUIPMENT_SEQUENCE` at that source path. SFC body normalization remains outside this profile.

The document capability is optional on `PLCParser`; existing custom parsers remain compatible. JSON parsing continues through the existing APIs. Calling a document API with a parser lacking that capability returns `UNSUPPORTED_FORMAT`.

## Count rules

Every fixture declares both `sourceCounts` and `normalizedCounts`:

- Source counts are lexical counts of the entity elements present in the L5X input. This remains deterministic even for intentionally malformed files.
- Normalized counts describe the current `NormalizedController` result. They are `null` when parsing fails.
- AOI routines and rungs are included in the aggregate routine and rung totals.
- Counts include ST lines, program parameters, AOI parameters/local tags, module ports/connections, tasks, scheduled-program relationships, trends, pens, quick-watch lists, watch tags, decorated arrays, protected-content containers, and every remaining controller-configuration family and repeated port child where applicable.
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
