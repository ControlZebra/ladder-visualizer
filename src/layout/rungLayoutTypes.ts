import type { BranchGroup, Instruction, RungElement } from '../types/instructions';

export interface Dimensions {
  width: number;
  height: number;
  centerY: number;
}

export interface VerticalClearance {
  aboveWire: number;
  belowWire: number;
}

export interface InstructionLayout {
  type: 'instruction';
  instruction: Instruction;
  position: { x: number; y: number };
  dimensions: Dimensions;
  symbolOffset: number;
  label?: string;
  address?: string;
}

export interface BranchLegLayout {
  wireY: number;
  elements: RungElementLayout[];
  contentWidth: number;
  contentEndX: number;
}

export interface BranchGroupLayout {
  type: 'branch';
  branchGroup: BranchGroup;
  position: { x: number; y: number };
  dimensions: Dimensions;
  legs: BranchLegLayout[];
  connectorLeftX: number;
  connectorRightX: number;
}

export type RungElementLayout = InstructionLayout | BranchGroupLayout;

export interface LineLayout {
  lineIndex: number;
  yOffset: number;
  height: number;
  wireY: number;
  conditions: RungElementLayout[];
  operations: RungElementLayout[];
  conditionsStartX: number;
  operationsStartX: number;
  isLastLine: boolean;
}

export interface RungLayoutResult {
  rungIndex: number;
  yOffset: number;
  height: number;
  lines: LineLayout[];
  hasBranches: boolean;
}

export interface RungLayout {
  height: number;
  offset: number;
  contentWidth: number;
}

export interface ElementPartition {
  conditions: RungElement[];
  operations: RungElement[];
}

export interface ElementLine extends ElementPartition {
  conditionsWidth: number;
  operationsWidth: number;
  height: number;
  wireY: number;
  yOffset: number;
  isLastLine: boolean;
}