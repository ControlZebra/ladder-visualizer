/**
 * Layout Engine Types
 * 
 * This module defines the interfaces for the separated layout engine.
 * The layout engine is responsible for calculating positions and dimensions,
 * while renderers are responsible for generating output (SVG, Canvas, etc.)
 */

import type { Instruction, BranchGroup } from '../../types';

// ============================================================================
// BASIC GEOMETRY TYPES
// ============================================================================

/**
 * A 2D position
 */
export interface Position {
  x: number;
  y: number;
}

/**
 * Basic dimensions
 */
export interface Dimensions {
  width: number;
  height: number;
}

/**
 * Extended dimensions with center offset
 */
export interface ElementDimensions extends Dimensions {
  /** Y offset from top to the center line (for wire connections) */
  centerY: number;
}

// ============================================================================
// INSTRUCTION LAYOUT TYPES
// ============================================================================

/**
 * Layout information for a single instruction
 */
export interface InstructionLayout {
  type: 'instruction';
  /** Reference to the instruction being laid out */
  instruction: Instruction;
  /** Position relative to the rung/parent container */
  position: Position;
  /** Dimensions of the instruction */
  dimensions: ElementDimensions;
  /** X offset for the symbol within the allocated space (for centering) */
  symbolOffset: number;
  /** The label to display (if any) */
  label?: string;
  /** The address to display (if any) */
  address?: string;
}

/**
 * Layout information for a branch group
 */
export interface BranchGroupLayout {
  type: 'branch';
  /** Reference to the branch group being laid out */
  branchGroup: BranchGroup;
  /** Position relative to the rung/parent container */
  position: Position;
  /** Total dimensions of the branch group */
  dimensions: ElementDimensions;
  /** Layout for each branch leg */
  legs: BranchLegLayout[];
  /** X position of the left vertical connector */
  connectorLeftX: number;
  /** X position of the right vertical connector */
  connectorRightX: number;
}

/**
 * Layout for a single branch leg (one path in a parallel branch)
 */
export interface BranchLegLayout {
  /** Y position of the wire for this leg */
  wireY: number;
  /** Elements in this leg */
  elements: RungElementLayout[];
  /** Width of the content in this leg */
  contentWidth: number;
}

/**
 * Union type for any rung element layout
 */
export type RungElementLayout = InstructionLayout | BranchGroupLayout;

// ============================================================================
// LINE AND RUNG LAYOUT TYPES
// ============================================================================

/**
 * Layout for a single line within a (potentially multi-line) rung
 */
export interface LineLayout {
  /** Index of this line within the rung */
  lineIndex: number;
  /** Y offset of this line from the rung start */
  yOffset: number;
  /** Height of this line */
  height: number;
  /** Y position of the wire for this line */
  wireY: number;
  /** Element layouts for this line (conditions and operations) */
  elements: RungElementLayout[];
  /** Condition element layouts (left-aligned) */
  conditions: RungElementLayout[];
  /** Operation element layouts (right-aligned on last line) */
  operations: RungElementLayout[];
  /** Whether this is the last line of the rung */
  isLastLine: boolean;
  /** Total width of conditions */
  conditionsWidth: number;
  /** Total width of operations */
  operationsWidth: number;
  /** X position where conditions start */
  conditionsStartX: number;
  /** X position where operations start (only valid on last line) */
  operationsStartX: number;
}

/**
 * Complete layout for a single rung
 */
export interface RungLayout {
  /** Index of this rung */
  rungIndex: number;
  /** Y offset from the diagram top */
  yOffset: number;
  /** Total height of this rung */
  height: number;
  /** Lines within this rung (usually 1, but can be more for wrapped content) */
  lines: LineLayout[];
  /** Whether this rung contains branches */
  hasBranches: boolean;
}

/**
 * Wire connection points for rendering
 */
export interface WireLayout {
  /** Start position */
  start: Position;
  /** End position */
  end: Position;
  /** Type of wire segment */
  type: 'horizontal' | 'vertical' | 'continuation';
}

/**
 * Power rail layout
 */
export interface PowerRailLayout {
  /** X position of the left rail */
  leftX: number;
  /** X position of the right rail */
  rightX: number;
  /** Visual width of the rails */
  width: number;
  /** Total height of the rails */
  height: number;
}

/**
 * Complete layout for the entire diagram
 */
export interface DiagramLayout {
  /** Total width of the diagram */
  width: number;
  /** Total height of the diagram */
  height: number;
  /** Layouts for each rung */
  rungs: RungLayout[];
  /** Power rail layout */
  powerRails: PowerRailLayout;
  /** Rung number column width */
  rungNumberWidth: number;
  /** Available width for ladder content (between rails) */
  contentWidth: number;
}

// ============================================================================
// LAYOUT OPTIONS
// ============================================================================

/**
 * Options for the layout engine
 */
export interface LayoutOptions {
  /** Total diagram width */
  width?: number;
  /** Minimum rung height */
  minRungHeight?: number;
  /** Spacing between instructions */
  instructionGap?: number;
  /** Minimum gap between conditions and operations */
  minConditionOperationGap?: number;
  /** Vertical spacing between wrapped lines */
  lineSpacing?: number;
  /** Vertical spacing between branch legs */
  branchVerticalGap?: number;
}

/**
 * Resolved layout options with all values set
 */
export interface ResolvedLayoutOptions {
  width: number;
  minRungHeight: number;
  instructionGap: number;
  minConditionOperationGap: number;
  lineSpacing: number;
  branchVerticalGap: number;
  rungNumberWidth: number;
  railWidth: number;
  railVisualWidth: number;
  labelOffset: number;
  addressLabelOffset: number;
  rungPadding: number;
  branchConnectorOffset: number;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a layout is for an instruction
 */
export function isInstructionLayout(layout: RungElementLayout): layout is InstructionLayout {
  return layout.type === 'instruction';
}

/**
 * Type guard to check if a layout is for a branch group
 */
export function isBranchGroupLayout(layout: RungElementLayout): layout is BranchGroupLayout {
  return layout.type === 'branch';
}
