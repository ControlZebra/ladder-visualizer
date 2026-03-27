# Phase 3 Inline Instruction Text Remediation Plan

Status: Complete in ladder-visualizer; downstream coverage follow-up open  
Last Updated: March 27, 2026  
Owner: Engineering  
Primary Package: ladder-visualizer

## Progress Update

Completed on March 27, 2026:

- instruction-local label diffs now render in the native contact and coil label slot as a two-row old/new stack
- instruction-local box diffs now render inside changed operand rows instead of in detached footer widgets, including stable multi-operand text-only cases
- diff layout measurement now grows native label and operand regions instead of reserving detached label or footer bands
- `InlineTextChange` is now scoped to the comment band path
- instruction-local label and operand diffs now render full old and new text without instruction-local truncation or disclosure
- internal-only inline diff layout exports were pruned from the public layout barrel
- focused renderer and geometry tests were updated to assert the full-text in-place contract
- targeted demo scenarios were added so the inline diff surface can be reviewed visually outside the test suite
- ladder-visualizer focused tests passed after the cleanup
- focused ControlZebra L5X diff integration tests passed against the linked package

Remaining follow-up on March 27, 2026:

- downstream validation is no longer blocked by the older `AccountFeatureGate.tsx` type error note
- current downstream confidence comes from focused ControlZebra L5X diff integration tests, but there is still no dedicated desktop inline-rung visual regression or documented manual sanity pass
- comment diff disclosure currently relies on SVG title fallback rather than a richer interactive popover or overlay

## Objective

Close the remaining Phase 3 follow-up so the completed library contract has stronger downstream validation and clearer consumer handoff.

The library-side Phase 3 work is complete. The remaining open items are downstream validation depth and whether comment disclosure should remain title-based or move to a richer interaction surface.

## Locked Decisions

1. Text-only versus structural replacement stays conservative.
   - Text-only is allowed only when the mnemonic is unchanged, operand count is unchanged, and exactly one native visible text slot changes in place.
   - Mnemonic changes, operand count changes, multiple operand changes, reordered operands, or any ambiguous mapping fall back to structural replacement.
2. Ownership is split by layer.
   - The inline diff model owns semantic classification and old/new payloads.
   - The layout adapter owns geometry and measurement.
   - The SVG renderer owns markup and styling only.
3. Geometry invariants are explicit.
   - Symbol geometry and wire centerlines do not change for text-only diffs.
   - Extra height comes only from the native text region that owns the diff.
   - No synthetic label band or footer band may be reserved for instruction-local text changes.
4. Comment diffs are the only current disclosure path.
   - Instruction-local label and operand diffs do not truncate under the normal Phase 3 contract.
   - Comment diffs may continue to use truncation and disclosure.
5. Downstream validation includes the linked ControlZebra consumer.
   - Library tests and build are necessary but not sufficient.
   - At least one desktop consumer sanity pass must confirm the corrected in-place behavior without consumer-side patching.

## Desired End State

At the end of this follow-up:

- changed contact and coil labels render in-place in the normal label region
- changed box operand values render in-place inside the box row
- label and operand diffs render as two-line old/new stacks inside their native instruction regions
- instruction-local label and operand diffs always render full old and new text in those native rows
- only comment diffs use truncation or disclosure
- structural replacements still render as old/new paired segments
- layout measurement matches the full-text in-place rendering behavior
- branch-contained and long-text cases remain stable without instruction-local truncation
- internal-only diff layout helpers are not re-exported from the package barrels

## Remaining Work

### 1. Keep Consumer Validation Open

The library-side cleanup is complete. The remaining work is to strengthen the linked ControlZebra consumer validation beyond the currently passing focused integration tests.

Deliverables:

- keep the relevant ControlZebra diff viewer tests green as the linked package evolves
- add a dedicated desktop inline-rung sanity check or visual regression path when the consumer view is ready
- confirm no consumer-side workaround remains for the old external diff widget behavior

## File-By-File Checklist

### `src/components/svg/diff/InlineDiffInstruction.tsx`

- [x] Stop using truncated instruction-local text for label diffs.
- [x] Stop using truncated instruction-local text for operand diffs.
- [x] Remove instruction-local `DiffDetailPopover` usage.
- [x] Preserve existing added, removed, unchanged, and replaced segment tint behavior.
- [x] Preserve structural replacement rendering for `replaced` nodes.

### `src/layout/diffLayoutAdapters.ts`

- [x] Measure instruction-local label diffs from full old and new text.
- [x] Measure instruction-local operand diffs from full old and new text.
- [x] Remove dead footer-era compatibility constants.
- [x] Preserve symbol centerlines and wire alignment so geometry changes only where native text regions actually grow.

### `src/layout/index.ts`

- [x] Remove internal-only inline diff render helpers from the public barrel.
- [x] Keep only stable inline diff layout helpers that are useful outside the renderer implementation.

### `tests/components/inlineDiffRung.test.tsx`

- [x] Replace the instruction-local truncation assertion with a full-text, no-disclosure assertion.
- [x] Keep comment diff assertions, since the comment band remains valid.

### `ControlZebra-Desktop/frontend` consumer sanity check

- [x] Run the focused desktop L5X diff integration tests that consume the linked package.
- [ ] Add dedicated inline-rung visual regression or documented manual sanity coverage in the desktop consumer.
- [ ] Confirm no consumer-side workaround remains for the old external diff widget behavior.

## Engineering Tasks

1. Remove instruction-local truncation  
   Owner: Ladder visualizer frontend and layout  
   Task: render full old and new label or operand text in native instruction rows and size those rows from full text.  
   Acceptance: no instruction-local popover or truncated text remains in the Phase 3 path.  
   Status: completed.

2. Prune public layout exports  
   Owner: Ladder visualizer maintainers  
   Task: remove internal inline diff render helpers and stale constants from the package barrels.  
   Acceptance: only intentional layout API remains publicly exported.  
   Status: completed.

3. Consumer validation  
   Owner: Integrations  
   Task: keep the linked ControlZebra consumer coverage current and add explicit inline-rung validation beyond adapter-level tests.  
   Acceptance: desktop diff view uses the library cleanup without consumer-side patching and has at least one direct inline-rung validation path.  
   Status: in progress.

## Acceptance Criteria

The follow-up is complete when all of these are true:

1. Contacts and coils with label-only text changes render old struck-through text and new text in the label area above the symbol.
2. Box instructions with one or more stable changed operands render old struck-through values and new values inside the corresponding box rows as two-line stacks.
3. Instruction-local label and operand diffs render full old and new text, with no truncation and no disclosure popover.
4. Comment diffs may remain in the dedicated comment band and may still use disclosure.
5. Structural changes still use the existing replacement-pair rendering.
6. Branch-contained instructions and long text still lay out cleanly without instruction-local truncation.
7. Existing non-diff ladder rendering is unaffected.
8. Internal-only diff layout helpers are not exported from the public barrels.

## Risks

- The main risk is removing truncation in the renderer but forgetting to size the layout from full text, which would reintroduce clipping.
- The second risk is leaving dead exports or constants in the public surface and implicitly supporting internals that should remain private.
- The downstream validation risk is now mainly about depth of consumer coverage rather than a known blocking frontend type error.
