import type { NormalizedRung, NormalizedTag, STLine } from '../types/normalized';

export type VisualConflictKind = 'ladder' | 'structured-text' | 'tag';

export interface VisualConflictRegion {
  kind: VisualConflictKind;
  current: NormalizedRung | NormalizedTag | STLine;
  incoming: NormalizedRung | NormalizedTag | STLine;
}

export interface VisualConflictFallback {
  reason: 'incomplete-unit' | 'mixed-unit-kind' | 'unsupported-unit' | 'invalid-fragment';
}

export interface ValidationResult {
  valid: boolean;
}

export interface ConflictVisualAdapter {
  readonly format: string;

  classifyRegion(currentSource: string, incomingSource: string): VisualConflictRegion | VisualConflictFallback;

  validateComposedDocument(source: string): ValidationResult;
}