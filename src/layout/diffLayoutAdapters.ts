import type {
  InlineDiffBranchLeg,
  InlineDiffBranchNode,
  InlineDiffInstructionNode,
  InlineDiffNode,
  InlineOperandTextChange,
  InlineDiffRungModel,
  InlineDiffState,
  InlineInstructionRenderMetadata,
  InlineTextChange,
} from '../diff/inline';
import { calculateBoxDimensions } from '../components/svg/BoxSymbol';
import { getInstructionParameterLabels } from '../types';
import type { Instruction, InstructionContext } from '../types';
import type { Dimensions, VerticalClearance } from './rungLayoutTypes';
import {
  CHAR_WIDTH_ESTIMATE,
  BRANCH_CONNECTOR_OFFSET,
  BRANCH_VERTICAL_GAP,
  COMMENT_BOTTOM_GAP,
  COMMENT_LINE_HEIGHT,
  INSTRUCTION_GAP,
  LABEL_PADDING,
  MIN_CONDITION_OPERATION_GAP,
  MIN_RUNG_HEIGHT,
  RAIL_VISUAL_WIDTH,
  RUNG_NUMBER_WIDTH,
  RUNG_PADDING,
  RUNG_START_OFFSET,
  SYMBOL_WIDTH,
  calculateRungCommentLayout,
  calculateElementVerticalClearance,
  calculateInstructionDimensions,
  getRungCommentWidth,
  wrapRungComment,
} from './rungLayout';

const INLINE_TEXT_DIFF_PADDING_X = 8;

const INLINE_NATIVE_LABEL_STACK_HEIGHT = 30;
const INLINE_NATIVE_BOX_ROW_HEIGHT = 30;

interface MeasuredNodeBase {
  dimensions: Dimensions;
  clearance: VerticalClearance;
}

export interface InlineDiffInstructionSegmentLayout {
  id: string;
  role: 'single' | 'old' | 'new';
  state: InlineDiffState;
  instruction: Instruction;
  position: { x: number; y: number };
  dimensions: Dimensions;
  intrinsicDimensions: Dimensions;
  clearance: VerticalClearance;
  symbolOffset: number;
  renderMetadata?: InlineInstructionRenderMetadata;
}

export interface InlineDiffInstructionLayout extends MeasuredNodeBase {
  kind: 'instruction';
  id: string;
  state: InlineDiffState;
  position: { x: number; y: number };
  segments: InlineDiffInstructionSegmentLayout[];
  textChange?: InlineTextChange;
  changedOperandIndex?: number;
  operandTextChanges?: InlineOperandTextChange[];
  labelChange?: InlineTextChange;
}

export interface InlineDiffBranchLegLayout {
  id: string;
  state: InlineDiffState;
  isEmpty: boolean;
  wireY: number;
  y: number;
  height: number;
  centerY: number;
  contentWidth: number;
  contentStartX: number;
  contentEndX: number;
  nodes: InlineDiffNodeLayout[];
}

export interface InlineDiffBranchLayout extends MeasuredNodeBase {
  kind: 'branch';
  id: string;
  state: InlineDiffState;
  position: { x: number; y: number };
  connectorLeftX: number;
  connectorRightX: number;
  legs: InlineDiffBranchLegLayout[];
}

export type InlineDiffNodeLayout = InlineDiffInstructionLayout | InlineDiffBranchLayout;

export interface InlineDiffLineLayout {
  lineIndex: number;
  yOffset: number;
  height: number;
  wireY: number;
  conditions: InlineDiffNodeLayout[];
  operations: InlineDiffNodeLayout[];
  conditionsStartX: number;
  operationsStartX: number;
}

export interface InlineDiffCommentLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  lineHeight: number;
  lines: string[];
  state: 'unchanged' | 'text-modified';
  oldLines?: string[];
  newLines?: string[];
}

export interface InlineDiffRungLayout {
  rungNumber: number;
  rungState: InlineDiffRungModel['rungState'];
  yOffset: number;
  height: number;
  contentWidth: number;
  leftRailX: number;
  rightRailX: number;
  comment?: InlineDiffCommentLayout;
  lines: InlineDiffLineLayout[];
}

export interface BuildInlineDiffRungLayoutOptions {
  yOffset?: number;
  leftRailX?: number;
  rightRailX: number;
  instructionContext?: InstructionContext;
}

export interface PrepareInlineDiffRungRenderLayoutOptions {
  width?: number;
  yOffset?: number;
  leftRailX?: number;
  instructionContext?: InstructionContext;
}

export interface InlineDiffRungRenderLayout {
  minWidth: number;
  diagramWidth: number;
  layout: InlineDiffRungLayout;
}

interface MeasuredInstructionSegment {
  role: 'single' | 'old' | 'new';
  state: InlineDiffState;
  instruction: Instruction;
  dimensions: Dimensions;
  intrinsicDimensions: Dimensions;
  clearance: VerticalClearance;
  renderMetadata?: InlineInstructionRenderMetadata;
}

interface MeasuredInstructionNode extends MeasuredNodeBase {
  kind: 'instruction';
  node: InlineDiffInstructionNode;
  segments: MeasuredInstructionSegment[];
}

interface MeasuredBranchLeg {
  leg: InlineDiffBranchLeg;
  width: number;
  height: number;
  centerY: number;
  nodes: MeasuredNode[];
}

interface MeasuredBranchNode extends MeasuredNodeBase {
  kind: 'branch';
  node: InlineDiffBranchNode;
  legs: MeasuredBranchLeg[];
}

type MeasuredNode = MeasuredInstructionNode | MeasuredBranchNode;

interface MeasuredInlineDiffRung {
  measuredConditions: MeasuredNode[];
  measuredOperations: MeasuredNode[];
  contentWidth: number;
  lineMetrics: { height: number; aboveWire: number };
}

function isOperationInstruction(instruction: Instruction): boolean {
  return (
    instruction.category === 'output' ||
    instruction.category === 'math' ||
    instruction.category === 'timer' ||
    instruction.category === 'counter' ||
    instruction.category === 'aoi' ||
    instruction.category === 'other'
  );
}

function nodeContainsOnlyOperations(node: InlineDiffNode): boolean {
  if (node.kind === 'instruction') {
    const representative = node.instruction ?? node.newInstruction ?? node.oldInstruction;
    return representative ? isOperationInstruction(representative) : false;
  }

  return node.legs.every((leg) => leg.nodes.length > 0 && leg.nodes.every((childNode) => nodeContainsOnlyOperations(childNode)));
}

function separateNodes(nodes: InlineDiffNode[]): { conditions: InlineDiffNode[]; operations: InlineDiffNode[] } {
  const conditions: InlineDiffNode[] = [];
  const operations: InlineDiffNode[] = [];

  for (const node of nodes) {
    if (nodeContainsOnlyOperations(node)) {
      operations.push(node);
      continue;
    }

    conditions.push(node);
  }

  return { conditions, operations };
}

function getSymbolOffset(instruction: Instruction, dimensions: Dimensions): number {
  if (instruction.category !== 'input' && instruction.category !== 'output') {
    return 0;
  }

  return (dimensions.width - SYMBOL_WIDTH) / 2;
}

function estimateInlineTextWidth(text: string): number {
  return text.length * CHAR_WIDTH_ESTIMATE;
}

function calculateCompactLabelWidth(change: InlineTextChange): number {
  const oldText = change.oldText;
  const newText = change.newText;

  return oldText.length > 0 || newText.length > 0
    ? Math.max(estimateInlineTextWidth(oldText), estimateInlineTextWidth(newText)) + LABEL_PADDING * 2
    : 0;
}

function calculateCompactOperandWidth(
  instruction: Instruction,
  changedOperandIndex: number | undefined,
  change: InlineTextChange,
  instructionContext?: InstructionContext,
): number {
  const prefixLabel = changedOperandIndex === undefined
    ? ''
    : `${getInstructionParameterLabels(
        instruction.mnemonic,
        instructionContext?.instructionRegistry,
      )[changedOperandIndex] ?? `Param ${changedOperandIndex + 1}`}: `;
  const oldText = change.oldText;
  const newText = change.newText;

  return estimateInlineTextWidth(prefixLabel) + Math.max(estimateInlineTextWidth(oldText), estimateInlineTextWidth(newText)) + 2 * INLINE_TEXT_DIFF_PADDING_X;
}

function getEffectiveOperandTextChanges(node: InlineDiffInstructionNode): InlineOperandTextChange[] {
  if (node.operandTextChanges && node.operandTextChanges.length > 0) {
    return node.operandTextChanges;
  }

  if (node.changedOperandIndex === undefined || !node.textChange) {
    return [];
  }

  return [{ operandIndex: node.changedOperandIndex, change: node.textChange }];
}

function getBoxRowHeights(
  operandCount: number,
  operandTextChanges: InlineOperandTextChange[],
): number[] | undefined {
  if (operandTextChanges.length === 0) {
    return undefined;
  }

  const changedIndexes = new Set(operandTextChanges.map(({ operandIndex }) => operandIndex));
  return Array.from({ length: operandCount }, (_, index) => (
    changedIndexes.has(index) ? INLINE_NATIVE_BOX_ROW_HEIGHT : 16
  ));
}

function calculateExpandedOperandWidth(
  instruction: Instruction,
  operandTextChanges: InlineOperandTextChange[],
  instructionContext?: InstructionContext,
): number {
  return operandTextChanges.reduce((maxWidth, { operandIndex, change }) => (
    Math.max(
      maxWidth,
      calculateCompactOperandWidth(instruction, operandIndex, change, instructionContext),
    )
  ), calculateInstructionDimensions(instruction, instructionContext).width);
}

function createMeasuredSegment(
  role: 'single' | 'old' | 'new',
  state: InlineDiffState,
  instruction: Instruction,
  renderMetadata?: InlineInstructionRenderMetadata,
  overrides?: Partial<Pick<MeasuredInstructionSegment, 'dimensions' | 'clearance'>>,
  instructionContext?: InstructionContext,
): MeasuredInstructionSegment {
  const intrinsicDimensions = calculateInstructionDimensions(instruction, instructionContext);

  return {
    role,
    state,
    instruction,
    dimensions: overrides?.dimensions ?? intrinsicDimensions,
    intrinsicDimensions,
    clearance: overrides?.clearance ?? calculateElementVerticalClearance(instruction, intrinsicDimensions),
    renderMetadata,
  };
}

function measureInstructionNode(
  node: InlineDiffInstructionNode,
  instructionContext?: InstructionContext,
): MeasuredInstructionNode {
  const representativeInstruction = node.instruction ?? node.newInstruction ?? node.oldInstruction;
  const segments: MeasuredInstructionSegment[] = [];

  if (node.state === 'text-modified' && representativeInstruction) {
    const intrinsicDimensions = calculateInstructionDimensions(representativeInstruction, instructionContext);
    const intrinsicClearance = calculateElementVerticalClearance(
      representativeInstruction,
      intrinsicDimensions,
      instructionContext,
    );
    let dimensions = intrinsicDimensions;
    let clearance = intrinsicClearance;

    if (node.labelChange && (representativeInstruction.category === 'input' || representativeInstruction.category === 'output')) {
      dimensions = {
        ...intrinsicDimensions,
        width: Math.max(intrinsicDimensions.width, calculateCompactLabelWidth(node.labelChange)),
      };
      clearance = {
        ...intrinsicClearance,
        aboveWire: intrinsicDimensions.centerY + INLINE_NATIVE_LABEL_STACK_HEIGHT,
      };
    }

    const operandTextChanges = getEffectiveOperandTextChanges(node);

    if (operandTextChanges.length > 0 && representativeInstruction.category !== 'input' && representativeInstruction.category !== 'output') {
      const operandRowHeights = getBoxRowHeights(
        representativeInstruction.operands.length,
        operandTextChanges,
      );
      const expandedDimensions = calculateBoxDimensions(
        representativeInstruction.mnemonic,
        representativeInstruction.operands,
        operandRowHeights,
        instructionContext,
      );
      dimensions = {
        width: Math.max(
          expandedDimensions.width,
          calculateExpandedOperandWidth(
            representativeInstruction,
            operandTextChanges,
            instructionContext,
          ),
        ),
        height: expandedDimensions.height,
        centerY: expandedDimensions.centerY,
      };
      clearance = {
        aboveWire: dimensions.centerY,
        belowWire: dimensions.height - dimensions.centerY,
      };
    }

    segments.push(
      createMeasuredSegment('single', 'text-modified', representativeInstruction, node.renderMetadata, {
        dimensions,
        clearance,
      }, instructionContext),
    );
  } else if (node.state === 'replaced') {
    if (node.oldInstruction) {
      segments.push(createMeasuredSegment(
        'old',
        'removed',
        node.oldInstruction,
        node.oldRenderMetadata,
        undefined,
        instructionContext,
      ));
    }
    if (node.newInstruction) {
      segments.push(createMeasuredSegment(
        'new',
        'added',
        node.newInstruction,
        node.newRenderMetadata,
        undefined,
        instructionContext,
      ));
    }
  } else if (representativeInstruction) {
    segments.push(createMeasuredSegment(
      'single',
      node.state,
      representativeInstruction,
      node.renderMetadata,
      undefined,
      instructionContext,
    ));
  }

  const width = segments.reduce((total, segment) => total + segment.dimensions.width, 0) + Math.max(segments.length - 1, 0) * INSTRUCTION_GAP;
  const aboveWire = segments.length > 0
    ? Math.max(...segments.map((segment) => segment.clearance.aboveWire))
    : MIN_RUNG_HEIGHT / 2;
  const belowWire = segments.length > 0
    ? Math.max(...segments.map((segment) => segment.clearance.belowWire))
    : MIN_RUNG_HEIGHT / 2;

  return {
    kind: 'instruction',
    node,
    segments,
    dimensions: {
      width,
      height: aboveWire + belowWire,
      centerY: aboveWire,
    },
    clearance: {
      aboveWire,
      belowWire,
    },
  };
}

function measureBranchLeg(
  leg: InlineDiffBranchLeg,
  instructionContext?: InstructionContext,
): MeasuredBranchLeg {
  const nodes = leg.nodes.map((node) => measureInlineDiffNode(node, instructionContext));
  const width = nodes.reduce((total, node) => total + node.dimensions.width, 0) + Math.max(nodes.length - 1, 0) * INSTRUCTION_GAP;
  const aboveWire = nodes.length > 0
    ? Math.max(...nodes.map((node) => node.clearance.aboveWire))
    : MIN_RUNG_HEIGHT / 2;
  const belowWire = nodes.length > 0
    ? Math.max(...nodes.map((node) => node.clearance.belowWire))
    : MIN_RUNG_HEIGHT / 2;

  return {
    leg,
    width,
    height: aboveWire + belowWire,
    centerY: aboveWire,
    nodes,
  };
}

function measureBranchNode(
  node: InlineDiffBranchNode,
  instructionContext?: InstructionContext,
): MeasuredBranchNode {
  const legs = node.legs.map((leg) => measureBranchLeg(leg, instructionContext));
  const width = legs.length > 0
    ? Math.max(...legs.map((leg) => leg.width)) + 2 * BRANCH_CONNECTOR_OFFSET
    : 0;
  const dimensions = {
    width,
    height: legs.reduce((total, leg, index) => total + leg.height + (index > 0 ? BRANCH_VERTICAL_GAP : 0), 0),
    centerY: legs[0]?.centerY ?? MIN_RUNG_HEIGHT / 2,
  };

  return {
    kind: 'branch',
    node,
    legs,
    dimensions,
    clearance: {
      aboveWire: dimensions.centerY,
      belowWire: dimensions.height - dimensions.centerY,
    },
  };
}

function measureInlineDiffNode(
  node: InlineDiffNode,
  instructionContext?: InstructionContext,
): MeasuredNode {
  return node.kind === 'instruction'
    ? measureInstructionNode(node, instructionContext)
    : measureBranchNode(node, instructionContext);
}

function calculateMeasuredNodesWidth(nodes: MeasuredNode[]): number {
  if (nodes.length === 0) {
    return 0;
  }

  return nodes.reduce((total, node) => total + node.dimensions.width, 0) + (nodes.length - 1) * INSTRUCTION_GAP;
}

function measureInlineDiffRung(
  model: InlineDiffRungModel,
  instructionContext?: InstructionContext,
): MeasuredInlineDiffRung {
  const { conditions, operations } = separateNodes(model.nodes);
  const measuredConditions = conditions.map((node) => measureInlineDiffNode(node, instructionContext));
  const measuredOperations = operations.map((node) => measureInlineDiffNode(node, instructionContext));
  const contentWidth = calculateMeasuredNodesWidth(measuredConditions)
    + MIN_CONDITION_OPERATION_GAP
    + calculateMeasuredNodesWidth(measuredOperations)
    + 2 * RUNG_START_OFFSET;

  return {
    measuredConditions,
    measuredOperations,
    contentWidth,
    lineMetrics: calculateLineHeight([...measuredConditions, ...measuredOperations]),
  };
}

function buildInlineDiffCommentLayout(
  model: InlineDiffRungModel,
  yOffset: number,
  leftRailX: number,
  rightRailX: number,
): InlineDiffCommentLayout | undefined {
  if (model.commentChange) {
    const width = getRungCommentWidth(leftRailX, rightRailX);
    const oldLines = wrapRungComment(model.commentChange.oldText, width);
    const newLines = wrapRungComment(model.commentChange.newText, width);
    const totalLineCount = oldLines.length + newLines.length;

    if (totalLineCount === 0) {
      return undefined;
    }

    return {
      x: leftRailX + RUNG_START_OFFSET,
      y: yOffset,
      width,
      height: totalLineCount * COMMENT_LINE_HEIGHT,
      lineHeight: COMMENT_LINE_HEIGHT,
      lines: newLines.length > 0 ? newLines : oldLines,
      state: 'text-modified',
      oldLines,
      newLines,
    };
  }

  const comment = calculateRungCommentLayout(model.comment, yOffset, leftRailX, rightRailX);
  if (!comment) {
    return undefined;
  }

  return {
    ...comment,
    state: 'unchanged',
  };
}

export function calculateInlineDiffRungContentWidth(
  model: InlineDiffRungModel,
  instructionContext?: InstructionContext,
): number {
  return measureInlineDiffRung(model, instructionContext).contentWidth;
}

export function calculateInlineDiffRungMinWidth(
  model: InlineDiffRungModel,
  instructionContext?: InstructionContext,
): number {
  return RUNG_NUMBER_WIDTH
    + 2 * RAIL_VISUAL_WIDTH
    + measureInlineDiffRung(model, instructionContext).contentWidth;
}

function buildInlineDiffRungLayoutFromMeasured(
  model: InlineDiffRungModel,
  measured: MeasuredInlineDiffRung,
  options: BuildInlineDiffRungLayoutOptions,
): InlineDiffRungLayout {
  const yOffset = options.yOffset ?? 0;
  const leftRailX = options.leftRailX ?? (RUNG_NUMBER_WIDTH + RAIL_VISUAL_WIDTH);
  const comment = buildInlineDiffCommentLayout(model, yOffset, leftRailX, options.rightRailX);
  const commentHeight = comment?.height ?? 0;
  const commentGap = comment ? COMMENT_BOTTOM_GAP : 0;
  const contentYOffset = yOffset + commentHeight + commentGap;
  const wireY = contentYOffset + measured.lineMetrics.aboveWire;

  let conditionX = leftRailX + RUNG_START_OFFSET;
  const conditionLayouts = measured.measuredConditions.map((node) => {
    const positioned = positionMeasuredNode(node, conditionX, wireY);
    conditionX += node.dimensions.width + INSTRUCTION_GAP;
    return positioned;
  });

  let operationX = options.rightRailX - RUNG_START_OFFSET;
  const operationLayouts: InlineDiffNodeLayout[] = [];
  for (let index = measured.measuredOperations.length - 1; index >= 0; index -= 1) {
    const node = measured.measuredOperations[index];
    const nodeX = operationX - node.dimensions.width;
    operationLayouts.unshift(positionMeasuredNode(node, nodeX, wireY));
    operationX = nodeX - INSTRUCTION_GAP;
  }

  return {
    rungNumber: model.rungNumber,
    rungState: model.rungState,
    yOffset,
    height: commentHeight + commentGap + measured.lineMetrics.height,
    contentWidth: measured.contentWidth,
    leftRailX,
    rightRailX: options.rightRailX,
    comment,
    lines: [
      {
        lineIndex: 0,
        yOffset: commentHeight + commentGap,
        height: measured.lineMetrics.height,
        wireY,
        conditions: conditionLayouts,
        operations: operationLayouts,
        conditionsStartX: leftRailX + RUNG_START_OFFSET,
        operationsStartX: operationLayouts[0]?.position.x ?? options.rightRailX - RUNG_START_OFFSET,
      },
    ],
  };
}

export function prepareInlineDiffRungRenderLayout(
  model: InlineDiffRungModel,
  options: PrepareInlineDiffRungRenderLayoutOptions = {},
): InlineDiffRungRenderLayout {
  const measured = measureInlineDiffRung(model, options.instructionContext);
  const minWidth = RUNG_NUMBER_WIDTH + 2 * RAIL_VISUAL_WIDTH + measured.contentWidth;
  const diagramWidth = Math.max(options.width ?? minWidth, minWidth);

  return {
    minWidth,
    diagramWidth,
    layout: buildInlineDiffRungLayoutFromMeasured(model, measured, {
      yOffset: options.yOffset,
      leftRailX: options.leftRailX,
      rightRailX: diagramWidth - RAIL_VISUAL_WIDTH,
      instructionContext: options.instructionContext,
    }),
  };
}

function positionMeasuredInstructionNode(
  measured: MeasuredInstructionNode,
  x: number,
  wireY: number,
): InlineDiffInstructionLayout {
  let currentX = x;

  const segments: InlineDiffInstructionSegmentLayout[] = measured.segments.map((segment, index) => {
    const position = {
      x: currentX,
      y: wireY - segment.dimensions.centerY,
    };
    currentX += segment.dimensions.width;
    if (index < measured.segments.length - 1) {
      currentX += INSTRUCTION_GAP;
    }

    return {
      id: `${measured.node.id}/${segment.role}`,
      role: segment.role,
      state: segment.state,
      instruction: segment.instruction,
      position,
      dimensions: segment.dimensions,
      intrinsicDimensions: segment.intrinsicDimensions,
      clearance: segment.clearance,
      symbolOffset: getSymbolOffset(segment.instruction, segment.dimensions),
      renderMetadata: segment.renderMetadata,
    };
  });

  return {
    kind: 'instruction',
    id: measured.node.id,
    state: measured.node.state,
    position: {
      x,
      y: wireY - measured.dimensions.centerY,
    },
    dimensions: measured.dimensions,
    clearance: measured.clearance,
    segments,
    textChange: measured.node.textChange,
    changedOperandIndex: measured.node.changedOperandIndex,
    operandTextChanges: measured.node.operandTextChanges,
    labelChange: measured.node.labelChange,
  };
}

function positionMeasuredBranchNode(
  measured: MeasuredBranchNode,
  branchStartX: number,
  mainWireY: number,
): InlineDiffBranchLayout {
  const connectorLeftX = branchStartX;
  const connectorRightX = branchStartX + measured.dimensions.width;
  const legWireYPositions: number[] = [];
  let currentWireY = mainWireY;

  for (let index = 0; index < measured.legs.length; index += 1) {
    if (index === 0) {
      legWireYPositions.push(mainWireY);
      continue;
    }

    const previousLeg = measured.legs[index - 1];
    const currentLeg = measured.legs[index];
    currentWireY += previousLeg.height - previousLeg.centerY + BRANCH_VERTICAL_GAP + currentLeg.centerY;
    legWireYPositions.push(currentWireY);
  }

  const legs = measured.legs.map((leg, index) => {
    const wireY = legWireYPositions[index] ?? mainWireY;
    const contentStartX = connectorLeftX + BRANCH_CONNECTOR_OFFSET;
    let currentX = contentStartX;
    const nodes = leg.nodes.map((node) => {
      const positioned = positionMeasuredNode(node, currentX, wireY);
      currentX += node.dimensions.width + INSTRUCTION_GAP;
      return positioned;
    });

    return {
      id: leg.leg.id,
      state: leg.leg.state,
      isEmpty: leg.leg.isEmpty,
      wireY,
      y: wireY - leg.centerY,
      height: leg.height,
      centerY: leg.centerY,
      contentWidth: leg.width,
      contentStartX,
      contentEndX: nodes.length > 0 ? currentX - INSTRUCTION_GAP : contentStartX,
      nodes,
    };
  });

  return {
    kind: 'branch',
    id: measured.node.id,
    state: measured.node.state,
    position: {
      x: branchStartX,
      y: mainWireY - measured.dimensions.centerY,
    },
    dimensions: measured.dimensions,
    clearance: measured.clearance,
    connectorLeftX,
    connectorRightX,
    legs,
  };
}

function positionMeasuredNode(measured: MeasuredNode, x: number, wireY: number): InlineDiffNodeLayout {
  return measured.kind === 'instruction'
    ? positionMeasuredInstructionNode(measured, x, wireY)
    : positionMeasuredBranchNode(measured, x, wireY);
}

function calculateLineHeight(nodes: MeasuredNode[]): { height: number; aboveWire: number } {
  let maxAboveWire = MIN_RUNG_HEIGHT / 2;
  let maxBelowWire = MIN_RUNG_HEIGHT / 2;

  for (const node of nodes) {
    maxAboveWire = Math.max(maxAboveWire, node.clearance.aboveWire + RUNG_PADDING);
    maxBelowWire = Math.max(maxBelowWire, node.clearance.belowWire + RUNG_PADDING);
  }

  return {
    height: maxAboveWire + maxBelowWire,
    aboveWire: maxAboveWire,
  };
}

export function buildInlineDiffRungLayout(
  model: InlineDiffRungModel,
  options: BuildInlineDiffRungLayoutOptions,
): InlineDiffRungLayout {
  return buildInlineDiffRungLayoutFromMeasured(
    model,
    measureInlineDiffRung(model, options.instructionContext),
    options,
  );
}
