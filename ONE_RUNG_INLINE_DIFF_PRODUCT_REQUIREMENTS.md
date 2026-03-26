# One Rung Inline Visual Diff Product Requirements

Status: Draft
Last Updated: March 26, 2026
Owner: Engineering
Applies To: ladder-visualizer package, with ControlZebra consuming the package API

## Summary

This document defines the product requirements for a one-rung inline visual diff experience for Rockwell RLL ladder logic.

The goal is to let users review rung changes inside a single rung surface instead of comparing separate old and new rung diagrams. The experience should remain understandable for controls engineers and non-software specialists who understand ladder logic but should not need to reason in source diff terms.

This requirement is specifically for a comparison-style inline diff, not a fully merged symbolic diff. Changed components remain visually explicit as old and new where appropriate, but they are rendered in one rung flow.

## Problem Statement

The current diff experience for modified ladder rungs requires users to compare separate old and new rung renderings. This increases cognitive load, makes branch edits harder to review, and forces users to scan for differences manually.

Users need a single-rung diff view that keeps the ladder structure visible while clearly marking added, removed, and modified logic.

## Primary Goal

Enable users to understand ladder rung changes quickly and safely by rendering changes directly inside one rung view.

## Target Users

- Controls engineers reviewing PLC logic changes
- Technicians validating changes before deployment
- Integrators comparing controller revisions
- Non-software specialists familiar with ladder logic

## Product Direction

The one-rung inline diff should use the existing ladder layout language and preserve rung readability.

The rendering model should follow these principles:

- Keep one rung surface per rung diff row
- Preserve ladder context and reading flow
- Use explicit color-coded change markers
- Avoid requiring side-by-side or stacked comparison for normal review
- Keep the experience visually restrained and operationally safe

## User Stories

- As a user reviewing a changed rung, I want to see changes inside one rung so I can understand them without comparing separate old and new diagrams.
- As a user, I want added, removed, and modified components to be visually distinct so I can tell what changed at a glance.
- As a user, I want unchanged parts of the rung to stay visible so I can understand the full logic context.
- As a user, I want added and removed branch structures to remain understandable within the same rung layout.
- As a user, I want text-only changes such as tag or parameter name changes to be shown compactly so the diff stays readable.
- As a user, I want long text diffs to degrade gracefully so large industrial tag names do not make the rung unreadable.

## Core Functional Requirements

### 1. Single-Rung Diff Surface

- The system must render one diff surface per rung.
- Modified rungs must no longer be rendered as separate old and new rung cards.
- Added and removed rungs must render as complete rungs within the same rung viewer surface.

### 2. Change State Visibility

- The system must support these visual change states:
  - added component
  - removed component
  - modified component
  - added rung
  - removed rung
- Unchanged context must remain visible and readable.

### 3. Component-Level Rendering Rules

- Added components must render with a green-tinted box.
- Removed components must render with a red-tinted box.
- Modified components that represent a component replacement must render old and new on the same rung line.
- For modified component replacements:
  - the old component must render in a red-tinted box
  - the new component must render in a green-tinted box
  - the red old component must appear before the green new component in reading order

### 4. Rung-Level Rendering Rules

- If a rung is added, the entire rung must be tinted green.
- If a rung is removed, the entire rung must be tinted red.
- Rung-level tinting must not obscure ladder symbols, labels, or wires.

### 5. Text-Only Change Rendering

For component parameter, operand, or tag-name changes where the change is effectively text inside an otherwise stable instruction shape:

- The system must keep a neutral box rather than rendering separate red and green component boxes.
- The system must show only the primary changed text inline.
- The old text must render in red with strikethrough.
- The new text must render after it in green bold text.
- When space is limited, the inline text diff may be truncated.
- A hover or detail affordance must reveal the full text diff when truncation occurs.

### 6. Contact And Coil Label Changes

For label-style changes where the label is shown around the contact or coil rather than inside a large instruction box:

- The new label must remain the primary visible label.
- The old label must render as struck-through red text just before the new label or above it in a smaller style.
- The label treatment must preserve readability of the ladder symbol itself.

### 7. Branch-Aware Diff Rendering

- The system must support inline diff rendering for branches.
- If a branch leg is structurally added, the full added leg should be rendered with added-state treatment.
- If a branch leg is structurally removed, the full removed leg should be rendered with removed-state treatment.
- If an existing branch leg is edited internally, only the changed components inside that leg should receive component-level diff treatment.

### 8. Context Preservation

- The diff view must preserve enough unchanged context to understand the role of each change.
- Unchanged context may be visually secondary, but it must not become hard to read.

## Visual Design Requirements

### 1. Color Semantics

- Green indicates added or new content.
- Red indicates removed or old content.
- Neutral styling indicates unchanged or stable structural context.
- Color treatment must work in both light and dark themes.

### 2. Box Treatment

- Tinted boxes must remain clearly legible for instruction text, borders, and symbol contents.
- Tints must be strong enough to communicate state but restrained enough to avoid drowning the ladder layout.

### 3. Text Diff Treatment

- Old text must be shown in red with strikethrough.
- New text must be shown in green and bold.
- Inline text diff styling must remain readable in dense industrial naming patterns.

### 4. Density Management

- The inline diff must remain readable when modified components expand horizontally.
- The system may use horizontal scrolling when needed.
- The system must not shrink symbols or text to the point that ladder review becomes unsafe.

## Interaction Requirements

### 1. Detail Access

- The user must be able to inspect the full value of truncated inline text diffs.
- The user must be able to inspect additional detail for a changed component when the inline presentation is insufficient.

### 2. Fallback Behavior

- The default experience should remain the one-rung inline diff.
- If an edge case cannot be represented clearly inline, the implementation may expose a secondary detail view or fallback presentation.
- Inline fallback behavior must not silently hide changes.

## Accepted Product Decisions

These decisions were explicitly chosen for v1.

### Decision 1: Diff Model Style

- The product will use comparison-style inline diff, not a fully merged symbolic diff.

### Decision 2: Modified Component Layout

- Modified component replacements will show old and new on the same rung line.
- Old renders first in a red-tinted box.
- New renders second in a green-tinted box.

### Decision 3: Added And Removed Components

- Added components render as green-tinted boxes in place.
- Removed components render as red-tinted boxes in place.

### Decision 4: Added And Removed Rungs

- Added rungs tint the full rung green.
- Removed rungs tint the full rung red.

### Decision 5: Text-Only Changes

- Text-only parameter or tag-name changes use a neutral box.
- Only the primary changed text is shown inline.
- Old text is red and struck through.
- New text is green and bold.
- Long inline text diffs are truncated with hover or detail fallback.

### Decision 6: Contact And Coil Label Changes

- New label remains primary.
- Old label appears struck through just before it or above it in smaller text.

## Acceptance Criteria

- A user can review a modified rung without needing two separate rung cards.
- A user can distinguish added, removed, and modified components directly in one rung.
- A user can understand rung-level additions and removals from rung tinting alone.
- A user can understand text-only changes without duplicated instruction boxes.
- A user can identify branch additions, removals, and in-leg edits within the same rung context.
- Truncated text diffs still allow access to the full values through hover or detail disclosure.
- The rendering remains legible in both light and dark themes.

## Out Of Scope For V1

- Fully merged symbolic diff rendering where old and new occupy the same exact symbol primitive
- Structured Text inline diff
- AOI, data type, or module visual diff requirements
- Natural-language explanations of rung changes
- Animation-heavy change transitions

## Engineering Consequences

This product direction implies the package must support diff-aware instruction rendering rather than only normal ladder rendering.

At minimum, the package will need reusable seams for:

- component-level diff render metadata
- rung-level diff state styling
- text-only inline diff rendering inside or around existing instruction shapes
- branch-aware diff rendering rules
- overflow-safe detail disclosure for truncated inline text changes

ControlZebra remains responsible for mapping controller diffs into the package's rendering contract, but ladder-visualizer should own the reusable rendering behavior.
