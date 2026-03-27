import type { InlineDiffRungModel } from '../diff';
import type { NormalizedRung } from '../types';
import { prepareInlineDiffRungRenderLayout } from './diffLayoutAdapters';
import { MIN_RUNG_HEIGHT, calculateMinDiagramWidth, calculateRungLayouts } from './rungLayout';

export type RoutineDiffRowMeasurementInput =
  | {
      state: 'added' | 'removed';
      rung: NormalizedRung;
    }
  | {
      state: 'modified';
      inlineDiffModel: InlineDiffRungModel;
    };

export function measureRoutineDiffRowHeight(input: RoutineDiffRowMeasurementInput): number {
  if (input.state === 'modified') {
    return prepareInlineDiffRungRenderLayout(input.inlineDiffModel).layout.height;
  }

  const diagramWidth = calculateMinDiagramWidth([input.rung]);
  const [layout] = calculateRungLayouts([input.rung], diagramWidth);

  return layout?.height ?? MIN_RUNG_HEIGHT;
}