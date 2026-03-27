  # One Rung Inline Diff Implementation Plan

  Status: In Progress (Phase 0 complete; Phase 1 builder/model complete; Phase 2 structural renderer complete; Phase 3 next)
  Last Updated: March 27, 2026
  Owner: Engineering
  Primary Package: ladder-visualizer
  Consumer: ControlZebra
  Related Input: ONE_RUNG_INLINE_DIFF_PRODUCT_REQUIREMENTS.md
  Related Phase 0 Finding: PHASE0_FINDING1_LABEL_CLEARANCE_IMPLEMENTATION_PLAN.md

  ## Purpose

  This document converts the one-rung inline diff product requirements into a phased implementation plan and a concrete technical design.

  The package goal is to support a single-rung inline diff renderer for Rockwell RLL ladder logic without duplicating the existing ladder rendering system or introducing a second layout engine that diverges over time.

  The design below is intentionally driven by two constraints:

  - performance: diff rendering must stay safe for large routines and dense industrial tag names
  - DRY: normal rung rendering and diff rung rendering must share the same parsing, layout, symbol, and theming foundations wherever possible

  The completed Phase 0 layout finding adds one more non-negotiable constraint for the remaining phases: vertical text measurement and branch geometry semantics must stay centralized in the shared layout layer, because even small duplicated clearance rules can drift between top-level and branch-contained elements.

  ## Outcome

  At the end of this plan, ladder-visualizer should provide a reusable diff-aware rung rendering contract that can:

  - render added, removed, and modified rungs on a single rung surface
  - preserve branch structure and reading order
  - render text-only changes compactly without duplicating full instruction boxes
  - expose overflow-safe detail disclosure for truncated diffs
  - remain stable enough for ControlZebra to consume as package API, not as app-specific patchwork

  ## Progress Update

  Completed:

  - Phase 0 foundation work is complete, including shared rung layout extraction under `src/layout/`
  - the inline diff type layer exists under `src/diff/inline/` and is exported for later phases
  - centralized diff theme tokens are present in the shared theme and CSS defaults
  - the Phase 0 label-clearance follow-up is complete, with shared vertical-clearance logic and parity-focused layout coverage
  - Phase 1 builder utilities now exist under `src/diff/inline/`, including `buildInlineDiffModel`, `matchRungElements`, `classifyInstructionChange`, and `truncateTextChange`
  - the inline diff model now carries shared contact and coil label/address visibility metadata by reusing the Phase 0 layout decision path instead of re-deriving it inside diff code
  - branch legs are now first-class inline diff objects with stable IDs and explicit empty-leg state so later layout adapters do not need to infer missing geometry
  - focused Phase 1 model coverage is in place for structural matching, text-only instruction changes, branch leg add/remove handling, empty-leg preservation, addressed label parity, and comment truncation
  - the current Phase 1 implementation has been validated with focused `vitest` coverage plus package `tsc --noEmit`
  - Phase 2 now includes a diff layout adapter in `src/layout/diffLayoutAdapters.ts` that measures and positions inline diff nodes before JSX render
  - a package-exported inline diff SVG surface now exists under `src/components/svg/diff/`, including `InlineDiffRung`, `InlineDiffBranch`, and `InlineDiffInstruction`
  - structural inline diff rendering now covers added, removed, replaced, and branch-leg change cases on a single rung surface using the shared symbol primitives
  - whole-rung wash rendering for added and removed rungs plus full-leg tinting for added and removed branch legs is now implemented
  - current `text-modified` nodes intentionally fall back to paired old/new structural rendering until the compact Phase 3 text-only renderer lands
  - focused Phase 2 coverage is now in place for rung wash, replacement ordering, nested branch connector validity, and empty-leg geometry preservation
  - the current Phase 2 implementation has been validated with focused `vitest` coverage plus package `tsc --noEmit`

  Remaining:

  - compact text-only rendering still remains future work even though text-only model classification now exists
  - there is still no detail disclosure UI for truncated diffs; truncation metadata exists but there is no popover or overlay surface yet
  - there are not yet demo fixtures or consumer-facing docs for the new inline diff renderer surface

  Next Recommended Step:

  - start Phase 3 by replacing the current text-modified fallback with compact text and label diff rendering plus detail disclosure while preserving the shared layout seam

  ## Existing Foundation

  The current codebase already provides several pieces that should be reused rather than replaced.

  ### Reuse As-Is Or With Small Extensions

  - `src/parsers/rung-parser.ts`
    - parses instructions and nested branch groups
  - `src/types/normalized/rung.ts`
    - provides the normalized rung contract used across the package
  - `src/diff/diffControllers.ts`
    - already computes controller, routine, and rung-level diffs
  - `src/components/svg/VirtualizedLadderDiagram.tsx`
    - already owns ladder layout behavior, element spacing, and SVG composition
  - `src/components/svg/ContactSymbol.tsx`
  - `src/components/svg/CoilSymbol.tsx`
  - `src/components/svg/BoxSymbol.tsx`
    - already encapsulate symbol-specific rendering logic

  ### Current Gaps

  - the inline diff model builder and positioned diff layout adapter now exist, but compact text-only and label-diff presentation still does not
  - rung diffs remain property-level at the domain layer; component-level classification currently lives in the inline diff builder layer rather than in `RungDiff`
  - symbol components do not yet expose a shared diff decoration contract
  - truncation metadata now exists, but there is still no common detail-disclosure pattern for long operand diffs

  ## Design Principles

  ### 1. One Layout Engine

  Do not build a separate layout system for diff mode.

  Instead:

  - extract pure layout calculation from `VirtualizedLadderDiagram.tsx`
  - keep one geometry model for instructions, branches, wires, rails, and labels
  - feed either normal rung elements or diff-aware rung elements into the same layout pipeline

  Reason:

  - layout duplication is the fastest path to drift, rendering bugs, and maintenance debt
  - branch rendering correctness is already the hard part; reusing it is cheaper and safer than reimplementing it
  - Phase 0 showed that even small duplicated clearance rules can diverge between top-level and branch-contained elements, so vertical text measurement must stay centralized in the shared layout layer

  ### 2. Diff-As-Metadata, Not Diff-As-Forked-Renderer

  Normal symbols should remain the base renderer. Diff state should be metadata applied around them.

  That means:

  - contact, coil, and box renderers should still render the core symbol
  - diff wrappers should add state tint, inline old/new ordering, and text delta treatment
  - unchanged elements should use the same code path as normal ladder rendering

  Reason:

  - symbol logic stays centralized
  - bug fixes to normal rendering automatically benefit diff rendering
  - added and removed treatments become styling concerns layered on top of stable primitives

  ### 3. Precompute Diff Semantics Before React Render

  Do not ask the React tree to infer whether a change is a text-only operand diff, a replacement diff, or a branch structural diff during SVG rendering.

  Instead:

  - build a normalized inline diff model before render
  - make rendering a mostly deterministic mapping from model to SVG
  - cache or memoize model building per rung pair

  Reason:

  - keeps rendering cheap
  - makes tests much easier because classification can be validated independently of the UI
  - reduces repeated tree walks during scrolling and virtualization

  ### 3a. Precompute Geometry Before JSX

  Do not let diff React components re-derive width, branch leg height, connector positions, or wire offsets from raw diff nodes.

  Instead:

  - run a shared measured and positioned layout pass before JSX render
  - let diff adapters preserve diff metadata while reusing the shared rung geometry engine
  - have `InlineDiffRung` and `InlineDiffBranch` consume positioned layout objects only

  Reason:

  - Phase 0 extraction and follow-on work showed that geometry drift reappears quickly when JSX recomputes layout concerns locally
  - nested branches and empty branch legs are safer when leg state is fully measured once and then rendered deterministically

  ### 4. Stable Identity For Large Routine Performance

  The diff model must preserve stable keys for:

  - rung number
  - branch leg path
  - instruction position path
  - old/new replacement pair identity

  Reason:

  - stable keys reduce React churn inside virtualized lists
  - they also make diagnostics and snapshots easier to reason about

  ### 5. Prefer Shared Utilities Over Instruction-Specific Branching

  The design should avoid per-instruction custom diff code except where the symbol family truly differs.

  Centralize:

  - diff state types
  - text-diff truncation rules
  - tint token resolution
  - shared old/new replacement wrappers
  - label diff formatting helpers
  - label and address visibility rules that affect both rendering and layout measurement

## Target Architecture

## 1. New Inline Diff Render Model

Add a render-oriented model that sits between `RungDiff` and SVG components.

Suggested file:

- `src/diff/inline/types.ts`

Suggested types:

```ts
export type InlineDiffState =
  | 'unchanged'
  | 'added'
  | 'removed'
  | 'replaced'
  | 'text-modified';

export interface InlineTextChange {
  oldText: string;
  newText: string;
  truncatedOldText?: string;
  truncatedNewText?: string;
  isTruncated: boolean;
}

export interface InlineDiffInstructionNode {
  kind: 'instruction';
  id: string;
  state: InlineDiffState;
  instruction?: Instruction;
  oldInstruction?: Instruction;
  newInstruction?: Instruction;
  textChange?: InlineTextChange;
  labelChange?: InlineTextChange;
}

export interface InlineDiffBranchNode {
  kind: 'branch';
  id: string;
  state: InlineDiffState;
  legs: InlineDiffNode[][];
}

export type InlineDiffNode = InlineDiffInstructionNode | InlineDiffBranchNode;

export interface InlineDiffRungModel {
  rungNumber: number;
  rungState: 'unchanged' | 'added' | 'removed' | 'modified';
  commentChange?: InlineTextChange;
  nodes: InlineDiffNode[];
  hasStructuralChanges: boolean;
  hasTextOnlyChanges: boolean;
}
```

Design intent:

- keep the normal `Instruction` type untouched where possible
- add a separate diff model instead of stuffing optional diff fields into every existing type
- classify rendering states once and keep the UI dumb

## 2. Inline Diff Builder Layer

Add a builder that converts a rung pair into `InlineDiffRungModel`.

Suggested files:

- `src/diff/inline/buildInlineDiffModel.ts`
- `src/diff/inline/matchRungElements.ts`
- `src/diff/inline/classifyInstructionChange.ts`
- `src/diff/inline/truncateTextChange.ts`

Builder responsibilities:

1. accept a `RungDiff` or old/new rung pair
2. parse or reuse `elements` from the normalized rung
3. match old and new elements by structural position first, not by rendered text width
4. classify each match into one of:
   - unchanged
   - added
   - removed
   - replaced
   - text-modified
5. build a branch-aware tree that preserves reading order
6. compute truncation metadata without losing access to full values
7. preserve enough structural metadata for the shared diff layout adapter to build stable measured and positioned branch leg output, including empty-leg cases
8. carry forward or reference the shared contact and coil label/address visibility decision path used by the layout layer, so diff adapters and renderers do not re-derive whether an address line exists from raw instruction data

### Matching Strategy

Use a practical, deterministic strategy for v1.

#### Instruction Matching

- match by structural index within the same parent sequence
- if both sides share mnemonic family and position, compare operands for text-only change detection
- if mnemonic family or instruction shape changes, classify as replacement

This is intentionally conservative. It avoids expensive fuzzy diffing and keeps the behavior explainable.

#### Branch Matching

- match branch groups by sequence position within the parent element list
- match branch legs by index within the branch group
- if leg counts differ, treat extra legs as added or removed
- if a leg exists on both sides, recurse into that leg

This fits the accepted product rule that structural branch additions and removals tint the full leg, while edits inside a stable leg stay local to changed components.

### Text-Only Change Classification

Text-only changes should be detected only when the instruction shape is materially the same.

Initial v1 rule:

- same mnemonic
- same operand count
- only one primary visible operand or label changed
- no branch structure change

If those conditions fail, fall back to replacement rendering.

This keeps the classifier simple and predictable.

## 3. Shared Layout Extraction

Refactor `src/components/svg/VirtualizedLadderDiagram.tsx` by extracting pure layout code into a shared module.

Suggested files:

- `src/layout/rungLayout.ts`
- `src/layout/rungLayoutTypes.ts`
- `src/layout/diffLayoutAdapters.ts`

Extraction boundary:

- dimension calculation
- branch sizing
- condition and operation separation
- line metrics
- element positioning

Keep inside React component:

- virtualization glue
- SVG container management
- theme context wiring
- event handlers and detail popovers

Reason:

- the current mixed file is workable for normal rendering but too coupled for diff mode
- extracting pure layout functions gives one place to validate branch geometry for both render modes

### Phase 0 Learnings To Preserve

- treat label and address clearance as shared layout semantics, not local rendering details
- keep one explicit decision path for whether a contact or coil renders an address line so layout and rendering cannot drift
- do not open-code `centerY` plus label-spacing math inside branch or line loops; use one shared vertical-clearance helper
- keep diff-specific adaptation in an adapter layer that maps diff metadata onto shared measured layout output
- ensure empty branch legs still produce full measured leg state so later positioned layout passes do not yield missing child arrays or invalid wire offsets
- keep parity-focused geometry tests for top-level versus branch-contained addressed and non-addressed elements so future diff work does not regress the seam silently

## Cross-Phase Guardrails From The Phase 0 Finding

The Phase 0 label-clearance finding is not just a foundation note. It is a constraint on every remaining phase.

Every later phase must preserve all of the following:

- shared vertical clearance remains owned by the layout layer; no later phase may add diff-local top-level or branch-specific clearance math
- contact and coil address-line visibility must continue to flow through one shared decision path reused by builders, layout adapters, and renderers
- diff features may adapt shared measured and positioned layout output, but they may not bypass the layout seam by recomputing connector bounds, wire offsets, or label clearance inside JSX
- empty branch legs, added legs, removed legs, and stable legs must all keep full measured leg state so later render passes never need heuristic fallback geometry
- every phase that touches rendering or classification must add parity coverage for top-level versus branch-contained addressed and non-addressed contact or coil cases whenever the affected behavior could influence geometry or visible labels
- any new convenience helper for diff mode must be rejected if it duplicates label/address visibility rules, vertical clearance rules, or branch positioning semantics that already exist in the shared layout path

Phase-specific planning below should be read with these guardrails as mandatory exit criteria, not optional implementation advice.

## 4. Diff Rendering Surface

Add a dedicated rung component for inline diff rendering.

Suggested files:

- `src/components/svg/diff/InlineDiffRung.tsx`
- `src/components/svg/diff/InlineDiffInstruction.tsx`
- `src/components/svg/diff/InlineDiffBranch.tsx`
- `src/components/svg/diff/InlineTextChange.tsx`
- `src/components/svg/diff/InlineDiffLegend.tsx`

Responsibilities:

- render one rung surface using the shared layout output
- apply rung-level tinting for added and removed rungs
- render replacement pairs as red old then green new in reading order
- render text-only diffs in neutral containers with red strike-through old text plus green bold new text
- support label-specific rendering for contacts and coils
- avoid local fallback geometry math for branch connectors, leg offsets, or instruction positioning

### Important Constraint

`InlineDiffRung.tsx` should not own classification logic.

It should only:

- read `InlineDiffRungModel`
- map model state to visuals
- delegate symbol drawing to existing symbol components or thin wrappers
- consume precomputed positioned layout data rather than recalculating dimensions inside JSX

## 5. Shared Diff Decoration Contract

Do not create fully separate diff-specific contact, coil, and box implementations unless the base component cannot support the needed slots.

Preferred pattern:

```ts
interface DiffDecorationProps {
  state?: InlineDiffState;
  tintToken?: string;
  overlayLabel?: ReactNode;
  oldValueLabel?: ReactNode;
  newValueLabel?: ReactNode;
}
```

Then use either:

- thin wrappers around existing symbol components, or
- a shared decorator group that draws tint background, outline, and inline text delta around an existing symbol

### Box Instructions

For box instructions:

- keep `BoxSymbol` as the base shape renderer
- add slot support for operand-row replacement or text-diff rendering where needed
- centralize operand-label mapping in one helper instead of duplicating mnemonic maps again in diff code

Note:

`BoxSymbol.tsx` currently still contains hardcoded instruction naming and parameter label maps. Those should be reduced over time in favor of the existing instruction registry so diff mode does not create another hardcoded mapping table.

### Contacts And Coils

For contacts and coils:

- keep symbol geometry unchanged
- add a shared label renderer that supports normal label, old label, and new label composition
- keep the ladder symbol visually primary even when old label text is shown

## 6. Theme And Token Strategy

Add diff tokens at the theme layer rather than scattering colors across SVG components.

Suggested additions:

- added border and fill tokens
- removed border and fill tokens
- neutral text-diff background token
- old text color token
- new text color token
- rung added and removed wash tokens

Suggested files:

- `src/types/theme.ts`
- `src/styles/variables.css`
- `src/styles/cssDefaults.ts`

Rules:

- rung tint is a wash behind content, not a replacement for symbol stroke contrast
- symbol text and wire contrast must remain readable in both light and dark themes
- branch wires should stay readable even when a branch leg is tinted

## 7. Detail Disclosure Pattern

Add one shared detail-disclosure mechanism for truncated text diffs.

Suggested files:

- `src/components/common/DiffDetailPopover.tsx`
- or package-local equivalent under `src/components/svg/diff/`

Rules:

- truncation happens in one utility, not ad hoc per component
- full old and new values remain accessible on hover or click
- the disclosure API should be generic enough to reuse for operand diffs, label diffs, and comment diffs

## Phased Implementation Plan

## Phase 0: Refactor Foundations

Status: Complete

Goal:

Create shared seams so diff mode can be implemented without duplicating the renderer.

Deliverables:

- extract pure layout functions from `VirtualizedLadderDiagram.tsx`
- add inline diff model types
- add diff theme tokens
- reduce obvious duplication between instruction registry data and `BoxSymbol.tsx`

Success criteria:

- normal rung rendering output remains unchanged
- layout logic is callable without React component state
- theme can express added, removed, and text-diff colors centrally

Why this phase exists:

- without this, every later phase will either fork the renderer or bolt diff logic into the existing monolith

Risk:

- regression in normal ladder rendering layout

Mitigation:

- snapshot or geometry tests for representative rungs before extraction
- parity-focused geometry tests for addressed labels and branch-contained elements after extraction changes

### Phase 0 Engineering Tasks

The Phase 0 work should be tracked as the following engineering tasks.

1. Extract pure rung layout types and calculation helpers from `VirtualizedLadderDiagram.tsx` into `src/layout/`.
  - Scope:
  - move dimension calculation, branch sizing, element partitioning, positioning, and full rung layout calculation into pure functions
  - keep theme context, virtualization, scrolling affordances, and SVG composition in the React component
  - add a small exported surface so later diff components can reuse the same layout engine
  - Status: completed in kickoff implementation
2. Add Phase 0 geometry coverage for representative rungs.
  - Scope:
  - create targeted tests for single-line condition/output layouts
  - add branch geometry tests to confirm connector and leg positioning survive extraction
  - add parity-focused tests for addressed and non-addressed contact and coil clearance at top level and inside branches
  - add diagram-width and cumulative offset tests so virtualization inputs remain deterministic
  - Status: completed in kickoff implementation and Phase 0 finding follow-up
3. Introduce a render-oriented inline diff type layer under `src/diff/inline/`.
  - Scope:
  - add `InlineDiffState`, `InlineTextChange`, node unions, and `InlineDiffRungModel`
  - export these types through the package diff surface without wiring render logic yet
  - Status: completed in kickoff implementation
4. Extend the theme contract with centralized diff tokens.
  - Scope:
  - add added/removed border and fill colors
  - add neutral text-diff background and old/new text colors
  - add whole-rung wash tokens for added and removed rungs
  - update TypeScript defaults and CSS variable defaults together
  - Status: completed in kickoff implementation
5. Remove duplicated box-instruction metadata from `BoxSymbol.tsx`.
  - Scope:
  - stop maintaining separate hardcoded instruction-name and parameter-label maps in the renderer
  - rely on the shared instruction registry helpers so normal rendering and future diff rendering read the same metadata source
  - add coverage proving registry-backed dimensions affect box sizing
  - Status: completed in kickoff implementation
6. Keep `VirtualizedLadderDiagram.tsx` behavior stable after extraction.
  - Scope:
  - swap the component to consume the shared layout module
  - avoid public API changes or rendering rewrites beyond the extraction boundary
  - Status: completed in kickoff implementation

### Phase 0 Exit Criteria For This Kickoff

- normal ladder rendering still uses the existing SVG renderer
- layout logic is callable outside React from `src/layout/`
- inline diff model types exist and are exported for later phases
- diff colors are centrally defined in the theme and CSS defaults
- boxed instruction metadata comes from the instruction registry, not duplicated maps
- targeted tests cover the extracted layout seam and registry-backed box sizing

## Phase 1: Component-Level Inline Diff Model

Status: Complete

Goal:

Produce a reliable, testable inline diff data structure for a single rung pair.

Deliverables:

- old/new rung element matcher
- instruction change classifier
- branch-aware recursive diff model builder
- text truncation utility
- explicit adapter or utility usage for shared contact and coil label/address visibility semantics
- explicit preservation of shared structural metadata needed by the layout adapter, including empty-leg, addressed-label, and branch-contained parity cases

Success criteria:

- given a modified rung, engineering can inspect a model that clearly identifies:
  - replacements
  - text-only changes
  - added elements
  - removed elements
  - added or removed branch legs
- diff builders and layout adapters consume the same contact and coil label/address visibility rule as the shared layout engine instead of re-deriving it in JSX or diff-specific helpers
- model output carries enough stable metadata that later phases do not need to infer address-line visibility, vertical clearance, or empty-leg geometry from raw diff nodes

Testing:

- unit tests for instruction matching
- unit tests for branch leg add and remove cases
- unit tests for empty stable-versus-added-or-removed branch leg handling so layout adapters preserve measured leg state
- unit tests for text-only change classification
- unit tests proving addressed and non-addressed contact or coil label diffs resolve visibility through the shared decision path rather than diff-local heuristics
- unit tests proving the same addressed and non-addressed contact or coil payload produces the same model-facing visibility metadata at top level and inside a branch leg
- golden tests for model output from representative rung pairs

### Phase 1 Progress Notes

Completed in this pass:

- added `src/diff/inline/buildInlineDiffModel.ts`
- added `src/diff/inline/matchRungElements.ts`
- added `src/diff/inline/classifyInstructionChange.ts`
- added `src/diff/inline/truncateTextChange.ts`
- extended `src/diff/inline/types.ts` so instruction nodes can carry shared label/address visibility metadata and branch nodes can preserve first-class leg objects with stable IDs and empty-leg state
- exported the shared layout helper used for contact and coil label/address visibility so the diff builder reuses the same decision path as the layout engine
- exported the new Phase 1 utilities through the diff package surface
- added focused tests in `tests/diff/inlineDiffModel.test.ts`

Validated in this pass:

- focused `vitest` coverage passes for `tests/diff/inlineDiffModel.test.ts`
- representative Phase 1 golden model fixtures now live in `tests/diff/inlineDiffModel.golden.test.ts` with shared cases in `tests/diff/inlineDiffModel.fixtures.ts`
- shared layout regression coverage still passes for `tests/layout/rungLayout.test.ts`
- package typechecking passes with `npm exec -- tsc --noEmit`

Remaining follow-up within or adjacent to Phase 1:

- keep the current conservative classifier unless a later rendering need proves that broader text-only detection is safe

## Phase 2: Basic Inline Rung Renderer

Status: Complete

Goal:

Render the new model inside one rung surface for the major structural cases.

Deliverables:

- `InlineDiffRung.tsx`
- shared diff decoration wrappers
- rung-level tinting for added and removed rungs
- replacement rendering with old then new ordering on the same rung line
- diff renderer wiring that consumes shared positioned layout output and shared address-visibility semantics without JSX-local geometry fallback

In scope for this phase:

- complete added rung
- complete removed rung
- added component
- removed component
- replaced component using paired red and green render blocks
- consumption of shared positioned layout output rather than JSX-local geometry recomputation
- preservation of top-level versus branch-contained geometry parity for addressed and non-addressed contacts and coils under diff tinting

Out of scope for this phase:

- compact text-only diffs inside neutral boxes
- specialized contact or coil label diff treatment

Success criteria:

- modified rungs no longer require two separate rung cards for basic structural review
- reading order matches product rules
- branch wires and connectors remain correct under tinting
- addressed contacts and coils remain geometrically consistent whether they appear at top level or inside a branch leg
- no Phase 2 component reintroduces local `centerY`, wire-offset, connector, or address-clearance math for diff rendering

Testing:

- component and geometry tests proving `InlineDiffRung` and `InlineDiffBranch` consume positioned layout output only
- regression tests covering added, removed, and replaced components inside both top-level and branch-contained addressed and non-addressed contact or coil cases
- regression tests confirming empty branch legs still render with valid connector and wire geometry after diff tinting is applied

### Phase 2 Progress Notes

Completed in this pass:

- added the diff-aware layout adapter under `src/layout/diffLayoutAdapters.ts`
- exported adapter helpers and layout types through `src/layout/index.ts`
- added `src/components/svg/diff/InlineDiffInstruction.tsx`
- added `src/components/svg/diff/InlineDiffBranch.tsx`
- added `src/components/svg/diff/InlineDiffRung.tsx`
- exported the new SVG diff components through `src/components/svg/index.ts` and `src/components/index.ts`
- implemented rung-level wash rendering for added and removed rungs
- implemented structural paired old-then-new rendering for replaced nodes on one rung surface
- implemented branch-leg tinting for added and removed legs while preserving shared connector and wire geometry
- kept `text-modified` nodes on the structural old/new fallback path for correctness until the compact Phase 3 renderer is ready

Validated in this pass:

- focused `vitest` coverage passes for `tests/components/inlineDiffRung.test.tsx`
- the existing Phase 1 model coverage still passes for `tests/diff/inlineDiffModel.test.ts`
- package typechecking passes with `npm exec -- tsc --noEmit`

Remaining follow-up within or adjacent to Phase 2:

- add demo fixtures so the new renderer can be reviewed visually outside the unit tests
- keep the adapter seam stable and avoid reintroducing geometry math inside JSX as later phases add compact text diff rendering

## Phase 3: Text-Only And Label Diffs

Status: Not Started

Goal:

Reduce visual noise when the instruction shape is stable and only user-facing text changed.

Deliverables:

- inline text-diff renderer for box instructions
- label-diff renderer for contacts and coils
- truncation plus detail-disclosure behavior
- comment diff rendering if desired at the rung header level
- parity-safe addressed and non-addressed contact and coil diff rendering across top-level and branch-contained positions
- text and label diff presentation built on the same shared visibility and vertical-clearance decisions already used by normal rendering and Phase 2 structural diff rendering

Success criteria:

- same-shape instruction text changes no longer produce duplicate red and green boxes
- old text is shown red with strike-through
- new text is shown green and bold
- long tags and operands remain readable through truncation plus disclosure
- addressed and non-addressed contact and coil label diffs preserve the same geometry and address-line visibility semantics whether rendered at top level or inside branch legs
- the compact text-only path does not introduce a second label or address measurement rule distinct from the shared layout layer

Risk:

- over-aggressive classification can hide meaningful structural changes

Mitigation:

- keep v1 conservative and fall back to replacement rendering when classification is uncertain

Testing:

- focused geometry and rendering tests for text-only and label-only diffs at top level and inside branches using the same contact and coil payloads
- regression tests ensuring truncation and disclosure change visible text content without changing the measured vertical-clearance contract
- regression tests confirming addressed label diffs do not shift branch connector or wire placement relative to the equivalent non-diff layout path

## Phase 4: Branch-Aware Inline Diff Hardening

Status: Not Started

Goal:

Support dense parallel logic safely and predictably.

Deliverables:

- full-leg tinting for added or removed branch legs
- mixed stable and changed branch leg support
- regression coverage for nested branches
- horizontal overflow handling for wide modified legs
- hardening of diff layout adapters so nested, empty, and tinted legs continue to preserve full measured leg state from the shared layout layer

Success criteria:

- nested branches render with correct connectors and wire continuity
- a stable leg stays visually stable while only changed legs receive diff treatment
- horizontal overflow does not collapse text or symbol readability
- nested addressed and non-addressed contact or coil cases remain parity-safe without any branch-depth-specific clearance exceptions

Testing:

- nested-branch geometry regression tests for stable, added, removed, and empty legs containing addressed and non-addressed contacts or coils
- overflow tests proving wide modified legs can scroll or truncate without introducing connector drift or missing child arrays
- adapter-level tests confirming no nested branch pass falls back to local leg-height or wire-offset inference

## Phase 5: Package API And Consumer Integration

Status: Not Started

Goal:

Expose the feature as a stable package surface for ControlZebra.

Deliverables:

- exported inline diff model builder
- exported inline diff rung component or routine viewer entry point
- documentation for consumer mapping responsibilities
- demo cases showing normal and diff rendering side by side for engineering validation
- API and documentation language that explicitly states the shared layout and visibility seams consumers must not bypass or reimplement downstream

Success criteria:

- ControlZebra can feed existing `RungDiff` and normalized routines into the package without app-specific forks
- package consumers understand which layer is responsible for data diffing versus rendering
- exported package seams make it harder for consumers to accidentally fork address-visibility, vertical-clearance, or branch-geometry semantics outside the package

Testing And Validation:

- package-level integration fixtures covering top-level and branch-contained addressed and non-addressed contact or coil diffs through the public API
- documentation examples and demo fixtures that show parity-safe behavior for the same rung content across normal, structural diff, and text-only diff paths
- consumer validation in ControlZebra confirming the package entry points are sufficient without app-side geometry patches

## Performance Design

## Non-Negotiable Performance Rules

### 1. Do Not Render Two Full Rung Trees For Modified Rungs

The product requirement is one rung surface. The implementation should also avoid the hidden cost of rendering full old and new rung trees and visually overlaying them.

Instead:

- build one merged inline diff tree
- render only the nodes required for the chosen presentation

Exception:

- replacement pairs may contain both old and new nodes, but only for the changed local segment, not the entire rung

### 2. Parse Once Per Source Rung

Avoid repeated parsing during render.

Rules:

- use `NormalizedRung.elements` when already available
- if parsing is needed, cache parsed output by rung identity and raw text
- do not re-run rung parsing from SVG child components

### 3. Memoize Layout Metrics For Identical Symbol Payloads

Box dimension measurement is a repeated hot path.

Cache keys should include:

- mnemonic
- operand count
- operand text lengths or values
- diff state when it changes visible width

Likely hot targets:

- box dimensions
- text truncation results
- branch subtree dimensions

### 4. Keep Classification Outside The Scroll Path

If a virtualized routine view is added, diff model building should happen before rows enter the viewport whenever practical.

Do not perform deep old/new structural comparison inside a row renderer on every scroll pass.

### 5. Use Stable Keys Everywhere

Key strategy should derive from structural path, for example:

- `rung:12`
- `rung:12/seq:3`
- `rung:12/branch:1/leg:0/seq:2`

This lowers unnecessary remounting when toggling detail views or switching themes.

The same structural identity should also be used by diff layout adapters so measured nodes, branch legs, and positioned children can be traced without JSX-level fallback heuristics.

### 6. Horizontal Scroll Is Acceptable; Unsafe Shrink Is Not

Do not solve dense diffs by shrinking font size or symbol size below safe review thresholds.

Preferred order:

1. compact text-only diff mode
2. controlled truncation with detail disclosure
3. horizontal scrolling

Avoid:

- scaling the entire SVG down until labels become unreadable

## DRY Design Rules

### 1. One Symbol Geometry Source

Contact, coil, and box shapes should keep one geometry implementation each.

Diff mode may wrap them, but it should not duplicate the core SVG path logic unless a shape truly diverges.

### 2. One Operand Label Source

Instruction parameter labels should come from the instruction registry or one shared helper.

Do not maintain:

- one map for normal rendering
- one map for diff rendering
- one map for docs or demo data

That drift is predictable and avoidable.

### 3. One Truncation Utility

Truncation thresholds and disclosure behavior must live in one utility used by:

- box operand diffs
- contact and coil label diffs
- rung comment diffs if rendered

### 4. One Theme Token Resolver

All diff colors should flow from the theme layer.

Do not hardcode separate red and green values inside multiple SVG components.

### 5. One Branch Traversal Utility

Recursive branch walking will be needed for:

- layout
- diff model building
- debug output
- test utilities

Add shared traversal helpers instead of writing slightly different recursion in each file.

The same rule applies to branch leg measurement and positioning: traversal may be shared, but geometry semantics must remain owned by the layout layer rather than duplicated in render components.

### 6. One Label And Address Visibility Rule

Contact and coil label/address visibility must keep one source of truth across normal rendering, diff builders, diff layout adapters, and diff renderers.

Do not maintain:

- one visibility heuristic in the normal renderer
- one heuristic in diff model building
- one heuristic in text-only or label-diff components

If a future phase needs richer metadata, extend the shared rule or its returned shape instead of cloning the logic.

## Proposed File Plan

This is the preferred target structure, not a requirement to create every file immediately.

```text
src/
  components/
    svg/
      VirtualizedLadderDiagram.tsx
      diff/
        InlineDiffRung.tsx
        InlineDiffInstruction.tsx
        InlineDiffBranch.tsx
        InlineTextChange.tsx
        DiffDetailPopover.tsx
  diff/
    diffControllers.ts
    inline/
      types.ts
      buildInlineDiffModel.ts
      matchRungElements.ts
      classifyInstructionChange.ts
      truncateTextChange.ts
  layout/
    rungLayout.ts
    rungLayoutTypes.ts
    diffLayoutAdapters.ts
  styles/
    variables.css
    cssDefaults.ts
  types/
    instructions.ts
    instruction-registry.ts
    theme.ts
```

## Testing Plan

## Unit Tests

Add focused tests for:

- instruction replacement classification
- text-only change classification
- contact and coil label diff formatting
- addressed and non-addressed contact and coil label diff parity through the shared visibility and layout path
- branch leg added and removed classification
- truncation rules and disclosure payloads

## Layout Regression Tests

Add geometry-oriented tests for:

- unchanged branch layout after Phase 0 extraction
- addressed and non-addressed contact and coil parity between top-level and branch-contained layout paths
- addressed and non-addressed contact and coil diff parity between top-level and branch-contained layout paths
- added branch leg tint preserving connector positions
- empty branch leg positioned output retaining valid wire offsets and child arrays
- replacement pair width handling
- wide text-only diff overflow behavior
- parity of address-line visibility decisions across model building, layout adaptation, and rendering for the same contact or coil payload

## Story Or Demo Fixtures

Add representative demo cases for:

- full rung added
- full rung removed
- single instruction replaced
- operand text modified
- contact label modified
- addressed contact label modified at top level and inside a branch
- addressed coil label modified at top level and inside a branch
- nested branch leg added
- nested branch leg removed

These fixtures matter because visual regressions are easier to catch through curated ladder examples than through abstract JSON snapshots alone.

## Suggested Delivery Order

If engineering wants the fastest path to visible progress without accumulating debt, the order should be:

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5

Do not start with label diff polish before the shared layout extraction and inline diff model exist. That would optimize the least important layer first.

Also do not treat the Phase 0 finding as closed simply because the initial extraction passed. Each later phase must re-assert the same parity guarantees when it introduces new diff metadata, new rendering states, or new consumer-facing seams.

## ControlZebra Integration Contract

The package should own:

- rung-level inline diff rendering behavior
- element-level diff classification for ladder rendering
- branch-aware diff presentation rules
- text truncation and detail-disclosure rendering contract

ControlZebra should own:

- mapping controller revisions into package inputs
- selecting which routine and rung diff to display
- surrounding application shell, tabs, navigation, and review workflow
- fallback UI when a routine or file type is outside the inline diff scope

## Open Decisions

These should be settled before or during Phase 1.

1. Whether `RungDiff` should remain a pure domain diff and the inline diff model stays fully separate, or whether a lightweight hook should be added from `RungDiff` to inline rendering metadata.
2. Whether detail disclosure in the package should be SVG-native, HTML overlay based, or left to the consumer through callbacks.
3. Whether comment diffs belong inside the rung surface or in a compact header row above it.
4. Whether replacement pairs should always render adjacent on the same baseline, or whether narrow viewports may stack them vertically as an explicit fallback.

## Recommendation

Proceed with a strict two-layer design:

- layer 1: build a deterministic `InlineDiffRungModel`
- layer 2: render that model using the shared ladder layout engine and shared symbol primitives

This is the cleanest design from both performance and DRY perspectives.

It avoids the two common failure modes for features like this:

- overloading the existing renderer with ad hoc diff conditionals everywhere
- building a second renderer that looks correct at first and then diverges from normal ladder behavior over time

If the team keeps those two failure modes out of the implementation, the one-rung inline diff feature stays maintainable.