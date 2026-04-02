# L5X Git Diff Noise Implementation Checklist

Status: Proposed  
Last Updated: April 2, 2026  
Owner: Engineering  
Primary Package: ladder-visualizer  
Primary Consumer: ControlZebra Desktop  
Related Desktop Plan: ../../ControlZebra-Desktop/docs/plans/L5X Git Diff Noise Reduction Plan.md

## Objective

Turn the high-level L5X Git diff noise reduction plan into a concrete ladder-visualizer implementation checklist with the phase 1 scope decisions already locked.

The package goal is to provide a Git-callable canonicalization path for Studio 5000 L5X files so Git compares a stable semantic text representation instead of raw export XML.

## Desired End State

At the end of this checklist:

- metadata-only Studio 5000 re-exports do not generate meaningful Git diff noise
- non-semantic collection reorder in L5X does not generate meaningful Git diff noise
- true logic changes still appear in canonical diff output
- ladder-visualizer exposes a short executable CLI that Git can call through `textconv`
- the canonicalization path reuses the existing normalized controller model instead of introducing a second L5X interpretation

## Scope Boundaries

Included in this checklist:

- canonical diff serialization for parsed L5X content
- filtering of volatile export metadata and timestamps for Git canonicalization
- deterministic ordering of controller entities and approved nested collections where order is not semantic
- packaging a CLI executable for Git integration
- focused fixtures and regression tests inside ladder-visualizer
- package-facing documentation for canonicalizer purpose and limits

Explicitly excluded from the first pass:

- rewriting tracked `.l5x` files via clean or smudge filters
- aggressive canonicalization of top-level rung instruction order
- branch equivalence or fuzzy matching that could hide real ladder logic changes
- consumer repository setup examples, `.gitattributes`, or local Git config documentation

## Scope Decisions Locked For Phase 1

These decisions are part of the contract for this checklist and should not be re-opened during implementation unless the product plan changes.

- `createdDate` and `modifiedDate` are always excluded from Git canonical output.
- The canonical serializer uses a narrow, logic-focused allowlist per section rather than dumping full normalized entities.
- Unsupported or ambiguous rung serialization falls back to an explicit marked raw-rung representation for that rung instead of failing the whole file.
- The CLI is packaged as a short executable command suitable for Git `textconv`, not a fragile `node path/to/script` invocation.
- Phase 1 canonicalizes these nested collections with stable keys:
	- data type members by name
	- AOI parameters by name
	- AOI local tags by name
	- AOI routines by name
	- module ports by id then address
	- module connections by name then type
- Test fixtures should be mostly sanitized real L5X exports rather than only synthetic examples.
- Exact Git setup examples live in ControlZebra Desktop documentation, not in this package plan.

## Existing Foundation To Reuse

- `src/parsers/parse.ts`
- `src/parsers/parser-interface.ts`
- `src/parsers/l5x/l5x-to-normalized.ts`
- `src/diff/diffControllers.ts`
- `src/diff/inline/buildInlineDiffModel.ts`
- `src/diff/inline/matchRungElements.ts`
- `tests/`
- `package.json`

## Implementation Checklist

## Phase 0: Lock The Canonical Diff Contract

### Output Contract

- [ ] Define the canonical output as human-readable stable text rather than raw JSON.
- [ ] Define fixed top-level section ordering for controller info, programs, routines, rungs, tags, data types, AOIs, and modules.
- [ ] Define the label and formatting rules for each section so golden tests can treat output as a stable public contract.
- [ ] Define explicit allowlists for what fields phase 1 serializes in each section.

### Noise Rules

- [ ] Exclude export-only metadata from canonical output.
- [ ] Exclude `exportDate`, `exportOptions`, `softwareRevision`, and `schemaRevision` from canonical output.
- [ ] Exclude `createdDate` and `modifiedDate` from canonical output in all phase 1 cases.
- [ ] Document that phase 1 canonical text is intentionally narrower than the full normalized model.

### Safety Rules

- [ ] Preserve top-level rung instruction order in phase 1.
- [ ] Preserve branch ordering unless semantic equivalence can be proven safely in a later phase.
- [ ] Emit an explicit raw-rung fallback marker when a rung cannot be serialized safely from parsed elements.
- [ ] Document that phase 1 prefers false negatives over hiding real logic changes.

## Phase 1: Canonical Serialization Core

### Controller Serializer

- [ ] Add a new canonical serialization module under `src/` for normalized controllers.
- [ ] Keep canonical serialization isolated from viewer rendering code.
- [ ] Serialize only the approved controller identity and descriptive fields in a stable order.
- [ ] Omit volatile vendor metadata and non-allowlisted controller metadata from canonical text.

### Stable Entity Ordering

- [ ] Sort programs by name.
- [ ] Sort routines by name within each program.
- [ ] Sort controller tags by name.
- [ ] Sort program tags by program name and tag name.
- [ ] Sort data types by name.
- [ ] Sort data type members by name.
- [ ] Sort AOIs by name.
- [ ] Sort AOI parameters by name.
- [ ] Sort AOI local tags by name.
- [ ] Sort AOI routines by name.
- [ ] Sort modules by name, with a stable secondary key if needed.
- [ ] Sort module ports by id then address.
- [ ] Sort module connections by name then type.
- [ ] Sort rungs by rung number.

### Section Allowlist Decisions

- [ ] Define the exact controller fields phase 1 keeps in canonical text.
- [ ] Define the exact program, routine, tag, data type, AOI, and module fields phase 1 keeps in canonical text.
- [ ] Keep phase 1 focused on review-relevant logic and documentation fields rather than every normalized property.
- [ ] Document any intentionally omitted normalized fields that remain available to the viewer or in-app diff engine.

### Rung Serialization

- [ ] Serialize rung comment text when present.
- [ ] Serialize rung instruction content from parsed rung elements rather than raw XML text where safe.
- [ ] Preserve instruction sequence at the top level of the rung.
- [ ] Preserve branch ordering in phase 1 output.
- [ ] Emit a marked raw-rung fallback for unsupported or ambiguous rung cases instead of silently normalizing them away.
- [ ] Make raw-rung fallback visible enough that reviewers can see canonicalization had to degrade for that rung.

## Phase 2: L5X-Specific Canonicalization Entry Point

### Parser Integration

- [ ] Reuse `parseString()` from `src/parsers/parse.ts` rather than adding a separate XML parser path.
- [ ] Add a package-internal canonicalization entry point for L5X content.
- [ ] Return deterministic canonical text or a clear error when parsing fails.
- [ ] Keep canonicalization terminology package-oriented rather than Git-specific unless a generic name is not practical.

### Parser Interface Boundary

- [ ] Decide whether `src/parsers/parser-interface.ts` needs a generic canonicalization hook or whether L5X-only wiring should stay outside the parser interface for phase 1.
- [ ] If a hook is added, keep it minimal and generic enough for future non-L5X formats.
- [ ] Avoid introducing a second interpretation path that can drift from `parseString()` and the normalized model.

## Phase 3: CLI Packaging For Git Textconv

### CLI Surface

- [ ] Add a small CLI entry point that accepts an L5X file path or stdin.
- [ ] Emit canonical text to stdout.
- [ ] Emit parse failures to stderr with a non-zero exit code.
- [ ] Keep the CLI independent from the demo app and React code.
- [ ] Expose the CLI as a short executable command suitable for `git config diff.l5x.textconv <command>`.

### Package Wiring

- [ ] Update `package.json` with a real `bin` entry for the canonicalizer.
- [ ] Ensure the build process emits the CLI artifact alongside the package dist consumed by linked workspaces.
- [ ] Verify the CLI works against the linked package consumption model used by ControlZebra Desktop.
- [ ] Verify the package does not require contributor-specific path patching to make the executable callable from Git.

## Phase 4: Test Coverage

### Fixture Coverage

- [ ] Add a metadata-only re-export fixture pair.
- [ ] Add a fixture pair with reordered non-semantic collections.
- [ ] Add a fixture pair with a real operand change.
- [ ] Add a fixture pair with a rung comment change.
- [ ] Add a fixture pair with rung add or remove.
- [ ] Add a fixture pair for an unsafe ordering case that should still produce diff output.
- [ ] Prefer sanitized real L5X exports for the fixture set unless a smaller synthetic file is needed for a narrowly targeted edge case.

### Automated Tests

- [ ] Add unit tests for top-level and nested canonical ordering rules.
- [ ] Add unit tests for metadata and timestamp filtering.
- [ ] Add snapshot or golden tests for canonical text output.
- [ ] Add a CLI integration test for a passing L5X file.
- [ ] Add a CLI integration test for invalid input.
- [ ] Add at least one test that proves raw-rung fallback stays visible in output rather than disappearing silently.

### Regression Guardrails

- [ ] Confirm metadata-only fixture pairs produce identical canonical output.
- [ ] Confirm approved non-semantic collection reorder produces identical canonical output.
- [ ] Confirm true logic changes produce different canonical output.
- [ ] Confirm unsupported or ambiguous cases remain visible in canonical output through the raw-rung fallback.

## Phase 5: Consumer Handoff

### ControlZebra Integration Support

- [ ] Confirm the CLI can be called from the linked workspace package without consumer-side patching.
- [ ] Provide the exact command name and invocation expectations needed by the ControlZebra Desktop integration plan.
- [ ] Align timestamp filtering choices with `src/diff/diffControllers.ts` or explicitly document why Git canonicalization and in-app diff semantics intentionally differ.

### Documentation

- [ ] Add a short package-facing usage note describing the canonicalizer purpose and limitations.
- [ ] Document that the first pass improves Git review output without changing stored L5X content.
- [ ] Document the safety boundary around branch order and top-level instruction sequence.
- [ ] Document that repository setup examples and contributor Git configuration live in ControlZebra Desktop docs, not in ladder-visualizer package docs.

## Suggested File Targets

These are the most likely package files to touch during implementation:

- `src/parsers/parse.ts`
- `src/parsers/parser-interface.ts`
- `src/parsers/l5x/l5x-to-normalized.ts`
- `src/diff/diffControllers.ts`
- `package.json`
- new canonical serialization module under `src/`
- new CLI entry point under `src/` or a package CLI location that builds into `dist/`
- new tests under `tests/`

## Acceptance Criteria

This checklist is complete when all of these are true:

1. Ladder-visualizer can turn an L5X file into deterministic canonical diff text.
2. Metadata-only Studio 5000 re-exports produce identical canonical output.
3. Stable non-semantic collection reorder, including approved nested collections, produces identical canonical output.
4. True ladder changes still modify the canonical output.
5. Unsupported or ambiguous rung cases remain visible via an explicit raw-rung fallback.
6. The package exposes a short CLI executable that Git can call for `textconv`.
7. The implementation has focused automated coverage for metadata filtering, ordering, raw-rung fallback, and CLI behavior.
8. The implementation does not rewrite tracked `.l5x` source files.

## Risks

- The primary risk is over-normalizing ladder content and hiding real logic changes.
- The second risk is building a canonicalizer that drifts from the existing viewer and diff semantics.
- The third risk is packaging a CLI that works in tests but is awkward to invoke from a linked workspace consumer.
- The fourth risk is allowing the canonical output contract to expand until it reintroduces metadata churn or becomes too unstable for Git review.

## Recommended First Cut

Start with the smallest safe implementation:

1. Filter volatile metadata and always remove `createdDate` and `modifiedDate`.
2. Canonicalize top-level entities plus the approved nested collections.
3. Preserve branch order and top-level instruction order.
4. Use marked raw-rung fallback for unsupported or ambiguous rung serialization.
5. Ship a short CLI executable that only targets L5X.
6. Add focused fixture-based tests before expanding normalization rules.