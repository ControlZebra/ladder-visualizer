import React, { useMemo } from 'react';
import type { ParsedRoutine, Rung } from '../types';
import { renderLadderDiagram } from '../renderers/svg/ladder-renderer';

export interface LadderDiagramProps {
  /** Parsed routine to display */
  routine?: ParsedRoutine;
  /** Or provide rungs directly */
  rungs?: Rung[];
  /** Width of the diagram */
  width?: number;
  /** Optional CSS class name */
  className?: string;
  /** Optional inline styles */
  style?: React.CSSProperties;
}

/**
 * React component that renders a ladder logic diagram in Studio 5000 style.
 */
export function LadderDiagram({
  routine,
  rungs,
  width = 800,
  className = '',
  style,
}: LadderDiagramProps) {
  const diagramRungs = useMemo(() => {
    if (rungs) return rungs;
    if (routine) return routine.rungs;
    return [];
  }, [routine, rungs]);

  const svgHtml = useMemo(() => {
    if (diagramRungs.length === 0) {
      return '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="100"><text x="400" y="50" text-anchor="middle" fill="#999" font-family="Segoe UI, sans-serif" font-size="13">No rungs to display</text></svg>';
    }
    return renderLadderDiagram(diagramRungs, { width });
  }, [diagramRungs, width]);

  return (
    <div
      className={`ladder-diagram-container ${className}`}
      style={{
        overflow: 'auto',
        backgroundColor: '#fff',
        ...style,
      }}
      dangerouslySetInnerHTML={{ __html: svgHtml }}
    />
  );
}

export default LadderDiagram;
