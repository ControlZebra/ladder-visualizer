# L5X compatibility contract

Compatibility matrix version: **1.0.0**

This document defines the narrow, testable claims Ladder Visualizer may make about Rockwell L5X input. A profile is a promise about named constructs and export shapes. It is not a percentage derived from the number of entities that happened to survive normalization.

The executable source of truth is [`tests/fixtures/l5x/manifest.ts`](../tests/fixtures/l5x/manifest.ts). The manifest records the source version, actual L5X target type, expected parse status, source counts, normalized counts, and current parser outcome for every sanitized fixture.

## Compatibility profiles

| Profile                   | Version 1.0.0 status | Included contract                                                                                     | Known boundaries                                                                                                  |
| ------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `rockwell-controller-rll` | Supported            | Controller metadata, UDT headers, controller and program tags, AOIs, modules, RLL routines, and rungs | Does not promise complete controller configuration or decorated values                                            |
| `rockwell-program-rll`    | Supported            | Program target exports with program tags and RLL routines                                             | Program parameters, child programs, and canonical component identity are not modeled                              |
| `rockwell-routine-rll`    | Supported            | RLL routine target exports represented in the controller-shaped result                                | Stable component identity and source spans are not modeled                                                        |
| `rockwell-rung-rll`       | Unsupported          | Standalone `TargetType="Rung"` exports are present in the corpus                                      | The current target-type validator rejects them                                                                    |
| `rockwell-tags`           | Partial              | Controller/program scalar tags, aliases, and UDT headers                                              | Standalone tag/datatype targets, arrays, decorated structures, alarms, forces, and OPC UA metadata are incomplete |
| `rockwell-full-project`   | Unsupported          | Corpus coverage tracks RLL, FBD, SFC, protected content, and malformed/adversarial input              | Unsupported routine bodies are currently discarded without diagnostics                                            |

“Supported” applies only to the declared fixture shapes and versions. “Partial” means useful content is returned but at least one declared construct is lost or rejected. “Unsupported” means the profile must not be advertised as a successful parse contract.

## Corpus matrix

The core corpus contains every required artifact target for every declared Studio 5000 version. Each cell is backed by a separate fixture rather than inferring compatibility from a different version.

| Artifact target            | v33.00   | v34.01   | v35.01   | Current boundary                    |
| -------------------------- | -------- | -------- | -------- | ----------------------------------- |
| Controller                 | complete | complete | complete | Controller-shaped result            |
| Program                    | complete | complete | complete | Controller-shaped result            |
| Routine                    | complete | complete | complete | Controller-shaped result            |
| Rung                       | failed   | failed   | failed   | Target validator rejects `Rung`     |
| Tag                        | failed   | failed   | failed   | Target validator rejects `Tag`      |
| DataType (UDT)             | failed   | failed   | failed   | Target validator rejects `DataType` |
| AddOnInstructionDefinition | complete | complete | complete | AOI metadata and RLL normalize      |
| Module                     | failed   | failed   | failed   | Target validator rejects `Module`   |

Three additional `full-project-vXX` fixtures exercise the same semantic families in v33, v34, and v35:

- Structured Text lines, RLL, FBD, SFC, and protected routines.
- Base, produced, and consumed tags plus decorated array data.
- AOI and program parameters and local tags.
- Module ports and connections.
- Tasks, scheduled programs, and wall-clock configuration.
- The schema transition where `MaxObservedNetworkDelay` is an integer in v33 and a float in v34/v35.

Focused v35 FBD, SFC, and protected-routine fixtures retain small loss-regression cases. Truncated v35 XML, mismatched v34 XML, and a v35 entity-declaration fixture cover malformed and adversarial handling.

The distinction between contract status and current parser outcome is deliberate. The public parser still returns a legacy boolean result and cannot express `partial`; the corpus records the intended production status without pretending the legacy API already provides it. Later Phase 1 work can replace the current-outcome assertion with a direct status assertion.

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
