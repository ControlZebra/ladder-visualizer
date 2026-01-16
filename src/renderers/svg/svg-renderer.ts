/**
 * SVG Renderer
 * 
 * Renders ladder diagrams to SVG using pre-calculated layouts.
 * This separates rendering concerns from layout calculation, enabling:
 * - Clean separation of concerns
 * - Easier testing of rendering logic
 * - Potential for alternative renderers (Canvas, PDF)
 */

import type { Instruction } from '../../types';
import type {
  DiagramLayout,
  RungLayout,
  LineLayout,
  RungElementLayout,
  InstructionLayout,
  BranchGroupLayout,
} from '../layout/types';
import { isInstructionLayout, isBranchGroupLayout } from '../layout/types';
import {
  SYMBOL_WIDTH,
  getContactSymbol,
  getCoilSymbol,
  createBoxSymbol,
  createTimerSymbol,
  createCounterSymbol,
} from './symbols';

// ============================================================================
// RENDER OPTIONS
// ============================================================================

export interface SVGRenderOptions {
  /** Whether to include the SVG wrapper element */
  includeSvgWrapper?: boolean;
  /** CSS class to add to the SVG element */
  className?: string;
  /** Whether to include gradient/filter definitions */
  includeDefinitions?: boolean;
}

const DEFAULT_RENDER_OPTIONS: Required<SVGRenderOptions> = {
  includeSvgWrapper: true,
  className: 'ladder-diagram',
  includeDefinitions: true,
};

// ============================================================================
// SVG RENDERER CLASS
// ============================================================================

/**
 * Renders ladder diagram layouts to SVG strings.
 */
export class SVGRenderer {
  private readonly options: Required<SVGRenderOptions>;

  constructor(options: SVGRenderOptions = {}) {
    this.options = { ...DEFAULT_RENDER_OPTIONS, ...options };
  }

  /**
   * Render a complete diagram layout to SVG
   */
  render(layout: DiagramLayout): string {
    const parts: string[] = [];

    if (this.options.includeSvgWrapper) {
      parts.push(this.renderSvgOpen(layout));
    }

    if (this.options.includeDefinitions) {
      parts.push(this.renderDefinitions());
    }

    // Background
    parts.push(this.renderBackground(layout));

    // Rung backgrounds and numbers
    for (const rungLayout of layout.rungs) {
      parts.push(this.renderRungBackground(rungLayout, layout));
      parts.push(this.renderRungNumberCell(rungLayout, layout));
    }

    // Power rails
    parts.push(this.renderPowerRails(layout));

    // Render each rung's content
    for (const rungLayout of layout.rungs) {
      parts.push(this.renderRungContent(rungLayout, layout));
    }

    if (this.options.includeSvgWrapper) {
      parts.push('</svg>');
    }

    return parts.join('');
  }

  /**
   * Render a single rung to SVG (useful for incremental rendering)
   */
  renderRung(rungLayout: RungLayout, diagramLayout: DiagramLayout): string {
    const parts: string[] = [];
    parts.push(this.renderRungBackground(rungLayout, diagramLayout));
    parts.push(this.renderRungNumberCell(rungLayout, diagramLayout));
    parts.push(this.renderRungContent(rungLayout, diagramLayout));
    return parts.join('');
  }

  // ============================================================================
  // SVG STRUCTURE
  // ============================================================================

  private renderSvgOpen(layout: DiagramLayout): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.width}" height="${layout.height}" viewBox="0 0 ${layout.width} ${layout.height}" class="${this.options.className}" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">`;
  }

  private renderDefinitions(): string {
    return `
    <defs>
      <linearGradient id="railGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#2255aa"/>
        <stop offset="50%" style="stop-color:#3366cc"/>
        <stop offset="100%" style="stop-color:#2255aa"/>
      </linearGradient>
      <filter id="energizedGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
        <feMerge>
          <feMergeNode in="coloredBlur"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    </defs>
  `;
  }

  private renderBackground(layout: DiagramLayout): string {
    return `<rect width="${layout.width}" height="${layout.height}" fill="#ffffff"/>`;
  }

  // ============================================================================
  // RUNG RENDERING
  // ============================================================================

  private renderRungBackground(rungLayout: RungLayout, diagramLayout: DiagramLayout): string {
    const rowBg = rungLayout.rungIndex % 2 === 0 ? '#ffffff' : '#fafafa';
    return `<rect x="${diagramLayout.rungNumberWidth}" y="${rungLayout.yOffset}" width="${diagramLayout.width - diagramLayout.rungNumberWidth}" height="${rungLayout.height}" fill="${rowBg}" class="rung-background"/>`;
  }

  private renderRungNumberCell(rungLayout: RungLayout, diagramLayout: DiagramLayout, isSelected: boolean = false): string {
    const bgColor = isSelected ? '#3366cc' : (rungLayout.rungIndex % 2 === 0 ? '#f0f0f0' : '#e8e8e8');
    const textColor = isSelected ? '#ffffff' : '#333333';
    const { yOffset, height, rungIndex } = rungLayout;
    const { rungNumberWidth } = diagramLayout;

    const parts: string[] = [];

    // Rung number cell background
    parts.push(`<rect x="0" y="${yOffset}" width="${rungNumberWidth}" height="${height}" fill="${bgColor}" class="rung-number-cell"/>`);

    // Border
    parts.push(`<line x1="${rungNumberWidth}" y1="${yOffset}" x2="${rungNumberWidth}" y2="${yOffset + height}" stroke="#c0c0c0" stroke-width="1"/>`);
    parts.push(`<line x1="0" y1="${yOffset + height}" x2="${rungNumberWidth}" y2="${yOffset + height}" stroke="#c0c0c0" stroke-width="1"/>`);

    // Rung number text (centered in cell)
    const textY = yOffset + height / 2 + 4;
    parts.push(`<text x="${rungNumberWidth / 2}" y="${textY}" text-anchor="middle" font-size="11" font-weight="500" fill="${textColor}" class="rung-number">${rungIndex}</text>`);

    return parts.join('');
  }

  private renderPowerRails(layout: DiagramLayout): string {
    const parts: string[] = [];
    const { powerRails } = layout;

    // Left power rail
    parts.push(`<rect x="${powerRails.leftX}" y="0" width="${powerRails.width}" height="${powerRails.height}" fill="#3366cc" class="power-rail left-rail"/>`);

    // Right power rail
    parts.push(`<rect x="${powerRails.rightX}" y="0" width="${powerRails.width}" height="${powerRails.height}" fill="#3366cc" class="power-rail right-rail"/>`);

    return parts.join('');
  }

  private renderRungContent(rungLayout: RungLayout, diagramLayout: DiagramLayout): string {
    const parts: string[] = [];

    for (let i = 0; i < rungLayout.lines.length; i++) {
      const line = rungLayout.lines[i];
      const prevLine = i > 0 ? rungLayout.lines[i - 1] : null;
      const nextLine = i < rungLayout.lines.length - 1 ? rungLayout.lines[i + 1] : null;

      parts.push(this.renderLine(line, prevLine, nextLine, diagramLayout));
    }

    return parts.join('');
  }

  // ============================================================================
  // LINE RENDERING
  // ============================================================================

  private renderLine(
    line: LineLayout,
    prevLine: LineLayout | null,
    nextLine: LineLayout | null,
    diagramLayout: DiagramLayout
  ): string {
    const parts: string[] = [];
    const { wireY, conditionsStartX, operationsStartX, isLastLine } = line;
    const leftRailX = diagramLayout.powerRails.leftX + diagramLayout.powerRails.width;
    const rightRailX = diagramLayout.powerRails.rightX;

    // Wire from left rail to conditions
    parts.push(`<line x1="${leftRailX}" y1="${wireY}" x2="${conditionsStartX}" y2="${wireY}" stroke="#333" stroke-width="1"/>`);

    // Render condition elements
    for (const element of line.conditions) {
      parts.push(this.renderElement(element));
    }

    const conditionsEndX = conditionsStartX + line.conditionsWidth + 
      (line.conditions.length > 0 ? 0 : 0); // instructionGap already accounted for in layout

    if (isLastLine && line.operations.length > 0) {
      // Wire between conditions and operations
      if (operationsStartX > conditionsEndX) {
        parts.push(`<line x1="${conditionsEndX}" y1="${wireY}" x2="${operationsStartX}" y2="${wireY}" stroke="#333" stroke-width="1"/>`);
      }

      // Render operation elements
      for (const element of line.operations) {
        parts.push(this.renderElement(element));
      }

      // Wire from operations to right rail
      const operationsEndX = operationsStartX + line.operationsWidth;
      parts.push(`<line x1="${operationsEndX}" y1="${wireY}" x2="${rightRailX}" y2="${wireY}" stroke="#333" stroke-width="1"/>`);
    } else {
      // Not the last line: draw continuation
      const continuationX = rightRailX - 0; // No gap needed
      parts.push(`<line x1="${conditionsEndX}" y1="${wireY}" x2="${continuationX}" y2="${wireY}" stroke="#333" stroke-width="1"/>`);

      // Vertical connector to next line
      if (nextLine) {
        parts.push(`<line x1="${continuationX}" y1="${wireY}" x2="${continuationX}" y2="${nextLine.wireY}" stroke="#333" stroke-width="1"/>`);
      }
    }

    // Vertical connector from previous line
    if (prevLine && line.lineIndex > 0) {
      parts.push(`<line x1="${conditionsStartX}" y1="${prevLine.wireY}" x2="${conditionsStartX}" y2="${wireY}" stroke="#333" stroke-width="1"/>`);
    }

    return parts.join('');
  }

  // ============================================================================
  // ELEMENT RENDERING
  // ============================================================================

  private renderElement(layout: RungElementLayout): string {
    if (isInstructionLayout(layout)) {
      return this.renderInstruction(layout);
    }
    if (isBranchGroupLayout(layout)) {
      return this.renderBranchGroup(layout);
    }
    return '';
  }

  private renderInstruction(layout: InstructionLayout): string {
    const { instruction, position, dimensions, symbolOffset, label, address } = layout;
    const symbol = this.getSymbol(instruction);
    const parts: string[] = [];

    const symbolX = position.x + symbolOffset;
    const wireY = position.y + dimensions.centerY;

    // For contacts/coils, add label and address
    if (instruction.category === 'input' || instruction.category === 'output') {
      if (label) {
        const labelX = position.x + dimensions.width / 2;
        const labelY = position.y - 5;
        parts.push(`<text x="${labelX}" y="${labelY}" text-anchor="middle" font-size="10" fill="#333" font-weight="500" class="instruction-label">${label}</text>`);
      }

      if (address) {
        const addressY = position.y + dimensions.height + 12;
        const addressX = position.x + dimensions.width / 2;
        parts.push(`<text x="${addressX}" y="${addressY}" text-anchor="middle" font-size="8" fill="#666" class="instruction-address">${address}</text>`);
      }

      // Connecting wires for centering
      if (symbolOffset > 0) {
        parts.push(`<line x1="${position.x}" y1="${wireY}" x2="${position.x + symbolOffset}" y2="${wireY}" stroke="currentColor" stroke-width="1"/>`);
        parts.push(`<line x1="${position.x + symbolOffset + SYMBOL_WIDTH}" y1="${wireY}" x2="${position.x + dimensions.width}" y2="${wireY}" stroke="currentColor" stroke-width="1"/>`);
      }
    }

    // Render the symbol
    parts.push(`
    <g class="instruction instruction-${instruction.category}" data-mnemonic="${instruction.mnemonic}" transform="translate(${symbolX}, ${position.y})">
      ${symbol}
    </g>
  `);

    return parts.join('');
  }

  private renderBranchGroup(layout: BranchGroupLayout): string {
    const { legs, connectorLeftX, connectorRightX } = layout;
    const parts: string[] = [];

    if (legs.length === 0) {
      return '';
    }

    // Draw vertical connectors
    if (legs.length > 1) {
      const topY = legs[0].wireY;
      const bottomY = legs[legs.length - 1].wireY;
      parts.push(`<line x1="${connectorLeftX}" y1="${topY}" x2="${connectorLeftX}" y2="${bottomY}" stroke="currentColor" stroke-width="1" class="branch-connector"/>`);
      parts.push(`<line x1="${connectorRightX}" y1="${topY}" x2="${connectorRightX}" y2="${bottomY}" stroke="currentColor" stroke-width="1" class="branch-connector"/>`);
    }

    // Render each leg
    for (const leg of legs) {
      // Wire from connector to content
      const firstElement = leg.elements[0];
      const contentStartX = firstElement ? 
        (isInstructionLayout(firstElement) ? firstElement.position.x : (firstElement as BranchGroupLayout).connectorLeftX) :
        connectorLeftX;

      parts.push(`<line x1="${connectorLeftX}" y1="${leg.wireY}" x2="${contentStartX}" y2="${leg.wireY}" stroke="currentColor" stroke-width="1"/>`);

      // Render elements
      for (const element of leg.elements) {
        parts.push(this.renderElement(element));
      }

      // Wire from content end to connector
      const lastElement = leg.elements[leg.elements.length - 1];
      let contentEndX = contentStartX + leg.contentWidth;
      if (lastElement) {
        if (isInstructionLayout(lastElement)) {
          contentEndX = lastElement.position.x + lastElement.dimensions.width;
        } else {
          contentEndX = (lastElement as BranchGroupLayout).connectorRightX;
        }
      }

      if (contentEndX < connectorRightX) {
        parts.push(`<line x1="${contentEndX}" y1="${leg.wireY}" x2="${connectorRightX}" y2="${leg.wireY}" stroke="currentColor" stroke-width="1"/>`);
      }
    }

    return parts.join('');
  }

  // ============================================================================
  // SYMBOL HELPERS
  // ============================================================================

  private getSymbol(instruction: Instruction): string {
    switch (instruction.category) {
      case 'input':
        return getContactSymbol(instruction.mnemonic);
      case 'output':
        return getCoilSymbol(instruction.mnemonic);
      case 'timer':
        return createTimerSymbol(instruction.mnemonic, instruction.operands);
      case 'counter':
        return createCounterSymbol(instruction.mnemonic, instruction.operands);
      default:
        return createBoxSymbol(instruction.mnemonic, instruction.operands);
    }
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create an SVG renderer with default options
 */
export function createSVGRenderer(options?: SVGRenderOptions): SVGRenderer {
  return new SVGRenderer(options);
}

/**
 * Render a diagram layout to SVG using default options
 */
export function renderLayoutToSVG(layout: DiagramLayout, options?: SVGRenderOptions): string {
  const renderer = new SVGRenderer(options);
  return renderer.render(layout);
}
