# Phase 0 Finding 1 Implementation Plan

Status: Complete
Last Updated: March 27, 2026
Owner: Engineering
Primary Package: ladder-visualizer
Related Review Finding: Inconsistent top-level vs branch label and address clearance in the shared layout engine

## Progress Update

Completed in this pass:

- extracted a shared `VerticalClearance` helper in the layout layer
- centralized contact and coil label/address visibility detection used by layout measurement
- updated top-level line metric calculation to use the shared helper
- updated branch leg dimension calculation to use the shared helper
- updated branch leg positioning calculation to use the shared helper
- added focused unit coverage for addressed and non-addressed contact/coil clearance behavior
- added parity-focused geometry tests comparing top-level and branch-contained contact and coil layouts
- verified branch connector bounds and monotonic leg wire placement with addressed labels present
- ran `npm run test:run` for the package with no regressions (`13` files, `202` tests passed)
- ran `npm run typecheck` for the package after the test updates with no reported errors

Optional Follow-Up:

- optionally add a representative visual sanity check if diagram snapshots or manual review are needed before merge

## Summary

This document defines the remediation plan for review finding 1 from the Phase 0 inline diff work.

The problem is that the extracted layout engine currently computes different vertical clearance for the same contact or coil content depending on whether the element is rendered at the top level of a rung or inside a branch leg.

That inconsistency must be removed before more diff-aware rendering work is built on top of the shared layout seam.

## Problem

The current extracted layout logic reserves:

- label-only clearance for top-level line sizing
- label-plus-address clearance for branch leg sizing and branch positioning

This produces a geometry mismatch for addressed contacts and coils.

As a result:

- the same symbol can occupy different vertical space in different structural positions
- branch and non-branch layouts do not share one consistent measurement rule
- future inline diff rendering risks inheriting incorrect wire placement, clipped labels, or unstable row heights

## Why This Matters

Phase 0 exists to create one reusable layout engine.

If the engine has separate vertical measurement rules for top-level and branch cases, then it is not actually a single geometry model. Phase 1 and later phases would be forced to either preserve the inconsistency or add more conditionals around it.

That is the wrong foundation for inline diff rendering.

## Root Cause

The extracted layout code currently measures vertical text clearance in multiple places using slightly different logic.

Observed behavior:

- top-level line metrics reserve only label space
- branch dimension and branch position calculations reserve label and address space

The issue is not just a bad constant. The deeper problem is that vertical clearance rules are duplicated rather than centralized.

## Goal

Create one shared vertical measurement rule for contacts and coils so that:

- top-level and branch-contained elements produce the same geometry for the same content
- address-bearing labels always reserve enough space
- layout consumers do not need to know whether an element lives in a branch to size it correctly
- the result is stable enough for inline diff rendering and geometry-based tests

## Non-Goals

- redesigning contact or coil label visuals
- changing ladder symbol dimensions
- adding diff-specific rendering behavior
- solving unrelated DRY issues outside the finding unless directly required by the fix

## Desired End State

At the end of this work:

- one helper owns contact and coil label clearance rules
- all rung and branch height calculations use that helper
- addressed and non-addressed contacts/coils are measured consistently everywhere
- top-level and branch geometry tests cover the same instruction payloads
- the renderer still behaves the same visually except where it was previously under-measuring vertical space

## Implementation Strategy

### 1. Centralize Vertical Text Clearance Rules

Status: Complete

Add a shared pure helper in the layout layer that answers the question:

- how much space exists above and below the wire for this rung element

Suggested helper responsibilities:

- detect whether the element can render a label
- detect whether the rendered label also produces an address line
- return a single vertical clearance object used by all layout calculations

Suggested output shape:

```ts
interface VerticalClearance {
  aboveWire: number;
  belowWire: number;
}
```

This helper should live in the shared layout layer, not in the renderer.

### 2. Replace Duplicated Clearance Logic

Status: Complete

Update the following layout paths to use the same helper:

- line metric calculation for top-level rung layout
- branch leg dimension calculation
- branch leg positioning calculation

The implementation should stop open-coding combinations such as:

- label only
- label plus address
- ad hoc `centerY` math inside local loops

The rule should be defined once and applied everywhere.

### 3. Define The Address Rule Explicitly

Status: Complete

The code should not rely on a silent convention.

The plan is to make the address rule explicit:

- if a contact or coil renders an address line in the diagram, the layout engine must reserve vertical space for it in every structural context
- if an element does not render an address line, it should not reserve that extra space

The layout engine and renderer must agree on this rule.

If the renderer currently derives address visibility using string heuristics, the same decision path should be reused or extracted so layout and rendering cannot drift.

### 4. Keep The Fix Local To The Layout Contract

The preferred change is a seam-level correction, not a broad rewrite.

That means:

- do not change public diagram component APIs
- do not add diff-specific types yet
- do not alter symbol drawing code unless the address visibility rule must be extracted from rendering

If a small shared utility is needed for address visibility detection, extract only that utility.

### 5. Add Geometry Regression Coverage

Add tests that prove identical instruction payloads get consistent vertical treatment across structural positions.

Minimum coverage:

- top-level addressed contact or coil
- the same addressed contact or coil inside a branch leg
- non-addressed contact or coil at top level and inside a branch leg
- a branch case that confirms connector and leg wire positions still remain valid after the fix

The tests should assert geometry, not just that the function returns a non-zero height.

## Engineering Tasks

1. Identify the single source of truth for whether an element renders a label and address line.
  Status: Complete
2. Extract a shared pure vertical-clearance helper in the layout layer.
  Status: Complete
3. Replace top-level line metric clearance logic with the shared helper.
  Status: Complete
4. Replace branch leg dimension clearance logic with the shared helper.
  Status: Complete
5. Replace branch positioning clearance logic with the shared helper.
  Status: Complete
6. Verify that addressed contacts and coils produce the same reserved height at top level and inside branches.
  Status: Complete
7. Add targeted layout tests for addressed and non-addressed cases.
  Status: Complete
8. Run the full `vitest` suite and verify no layout regressions.
  Status: Complete

## Testing Plan

### Unit And Geometry Tests

Add focused tests for:

- addressed contact at top level reserves address space
- addressed contact inside a branch reserves the same vertical space
- non-addressed contact does not reserve address space in either context
- branch wire positions remain monotonic and connector bounds remain correct after the clearance change

### Regression Test Intent

The tests should prove all of the following:

- same content, same measurement rule
- structure does not change measurement semantics
- the fix does not break existing branch geometry assumptions

## Risks

### 1. Visual Height Change In Existing Diagrams

If top-level addressed contacts were previously under-measured, some rungs may become taller after the fix.

This is acceptable if the new geometry matches what the renderer actually draws.

### 2. Renderer And Layout Could Still Drift

If address visibility stays implemented in two different places, the bug may return later.

Mitigation:

- extract or reuse one shared decision path for address visibility

### 3. Nested Branches Could Surface Hidden Assumptions

Centralizing clearance rules may expose branch cases that only passed because of the inconsistent math.

Mitigation:

- include at least one nested or multi-leg branch regression test if the first round of changes reveals instability

## Exit Criteria

- one shared vertical clearance rule exists in the layout layer
- top-level and branch measurements no longer disagree for identical addressed contacts and coils
- layout tests explicitly cover addressed and non-addressed measurement parity
- the full `vitest` suite passes
- the shared layout seam is safer for Phase 1 inline diff model work

## Recommended Delivery Order

1. Extract address visibility and vertical clearance helpers.
  Status: Complete
2. Update top-level line metrics.
  Status: Complete
3. Update branch dimension and positioning logic.
  Status: Complete
4. Add parity-focused geometry tests.
  Status: Complete
5. Run the full suite and visually sanity check one representative addressed rung.
  Status: Complete for automated verification; visual sanity check remains optional follow-up

## Recommendation

Treat this as a seam-correction task, not as a cosmetic bug.

The right fix is to centralize measurement semantics so the layout engine has one answer for how much vertical space a labeled contact or coil needs. That keeps the Phase 0 extraction honest and prevents Phase 1 inline diff rendering from inheriting inconsistent rung geometry.