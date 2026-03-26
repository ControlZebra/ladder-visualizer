# One Rung Inline Diff Implementation Plan

Status: Proposed
Last Updated: March 26, 2026
Owner: Engineering
Primary Package: ladder-visualizer
Consumer: ControlZebra
Related Input: ONE_RUNG_INLINE_DIFF_PRODUCT_REQUIREMENTS.md

## Purpose

This document converts the one-rung inline diff product requirements into a phased implementation plan and a concrete technical design.

The package goal is to support a single-rung inline diff renderer for Rockwell RLL ladder logic without duplicating the existing ladder rendering system or introducing a second layout engine that diverges over time.

The design below is intentionally driven by two constraints:

- performance: diff rendering must stay safe for large routines and dense industrial tag names
- DRY: normal rung rendering and diff rung rendering must share the same parsing, layout, symbol, and theming foundations wherever possible

## Outcome

At the end of this plan, ladder-visualizer should provide a reusable diff-aware rung rendering contract that can:

- render added, removed, and modified rungs on a single rung surface
- preserve branch structure and reading order
- render text-only changes compactly without duplicating full instruction boxes
- expose overflow-safe detail disclosure for truncated diffs
- remain stable enough for ControlZebra to consume as package API, not as app-specific patchwork

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

- no inline diff render model exists between rung diffs and SVG output
- rung diffs are property-level only; they do not classify component-level edits
- the current ladder renderer mixes layout logic and rendering logic inside one component, which makes diff-specific reuse harder than it should be
- symbol components do not yet expose a shared diff decoration contract
- there is no common truncation and detail-disclosure pattern for long operand diffs

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

Keep instruction-specific code limited to:

- contact and coil label placement
- boxed instruction operand slot rendering

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

### Important Constraint

`InlineDiffRung.tsx` should not own classification logic.

It should only:

- read `InlineDiffRungModel`
- map model state to visuals
- delegate symbol drawing to existing symbol components or thin wrappers

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

## Phase 1: Component-Level Inline Diff Model

Goal:

Produce a reliable, testable inline diff data structure for a single rung pair.

Deliverables:

- old/new rung element matcher
- instruction change classifier
- branch-aware recursive diff model builder
- text truncation utility

Success criteria:

- given a modified rung, engineering can inspect a model that clearly identifies:
  - replacements
  - text-only changes
  - added elements
  - removed elements
  - added or removed branch legs

Testing:

- unit tests for instruction matching
- unit tests for branch leg add and remove cases
- unit tests for text-only change classification
- golden tests for model output from representative rung pairs

## Phase 2: Basic Inline Rung Renderer

Goal:

Render the new model inside one rung surface for the major structural cases.

Deliverables:

- `InlineDiffRung.tsx`
- shared diff decoration wrappers
- rung-level tinting for added and removed rungs
- replacement rendering with old then new ordering on the same rung line

In scope for this phase:

- complete added rung
- complete removed rung
- added component
- removed component
- replaced component using paired red and green render blocks

Out of scope for this phase:

- compact text-only diffs inside neutral boxes
- specialized contact or coil label diff treatment

Success criteria:

- modified rungs no longer require two separate rung cards for basic structural review
- reading order matches product rules
- branch wires and connectors remain correct under tinting

## Phase 3: Text-Only And Label Diffs

Goal:

Reduce visual noise when the instruction shape is stable and only user-facing text changed.

Deliverables:

- inline text-diff renderer for box instructions
- label-diff renderer for contacts and coils
- truncation plus detail-disclosure behavior
- comment diff rendering if desired at the rung header level

Success criteria:

- same-shape instruction text changes no longer produce duplicate red and green boxes
- old text is shown red with strike-through
- new text is shown green and bold
- long tags and operands remain readable through truncation plus disclosure

Risk:

- over-aggressive classification can hide meaningful structural changes

Mitigation:

- keep v1 conservative and fall back to replacement rendering when classification is uncertain

## Phase 4: Branch-Aware Inline Diff Hardening

Goal:

Support dense parallel logic safely and predictably.

Deliverables:

- full-leg tinting for added or removed branch legs
- mixed stable and changed branch leg support
- regression coverage for nested branches
- horizontal overflow handling for wide modified legs

Success criteria:

- nested branches render with correct connectors and wire continuity
- a stable leg stays visually stable while only changed legs receive diff treatment
- horizontal overflow does not collapse text or symbol readability

## Phase 5: Package API And Consumer Integration

Goal:

Expose the feature as a stable package surface for ControlZebra.

Deliverables:

- exported inline diff model builder
- exported inline diff rung component or routine viewer entry point
- documentation for consumer mapping responsibilities
- demo cases showing normal and diff rendering side by side for engineering validation

Success criteria:

- ControlZebra can feed existing `RungDiff` and normalized routines into the package without app-specific forks
- package consumers understand which layer is responsible for data diffing versus rendering

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
- branch leg added and removed classification
- truncation rules and disclosure payloads

## Layout Regression Tests

Add geometry-oriented tests for:

- unchanged branch layout after Phase 0 extraction
- added branch leg tint preserving connector positions
- replacement pair width handling
- wide text-only diff overflow behavior

## Story Or Demo Fixtures

Add representative demo cases for:

- full rung added
- full rung removed
- single instruction replaced
- operand text modified
- contact label modified
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