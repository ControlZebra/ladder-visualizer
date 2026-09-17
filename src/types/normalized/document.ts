import type { NormalizedController, NormalizedAOI, NormalizedModule } from './controller';
import type { NormalizedProgram } from './program';
import type { NormalizedRoutine } from './routine';
import type { NormalizedRung } from './rung';
import type { NormalizedTag } from './tag';
import type { NormalizedDataType } from './data-type';

export type PlcResourceRole = 'target' | 'context' | 'reference';
export type PlcExportTarget =
  | 'Controller'
  | 'Program'
  | 'Routine'
  | 'Rung'
  | 'Tag'
  | 'DataType'
  | 'AddOnInstructionDefinition'
  | 'Module';
export interface PlcResourceData {
  controller: NormalizedController;
  program: NormalizedProgram;
  routine: NormalizedRoutine;
  rung: NormalizedRung;
  tag: NormalizedTag;
  dataType: NormalizedDataType;
  aoi: NormalizedAOI;
  module: NormalizedModule;
}
/** IDs are deterministic within a document, not stable across exports or edits. */
export type PlcResource = {
  [K in keyof PlcResourceData]: {
    kind: K;
    id: string;
    sourcePath: string;
    ownerId?: string;
    role: PlcResourceRole;
    data: PlcResourceData[K];
  };
}[keyof PlcResourceData];

/** fast-xml-parser subtree: attributes use @_ and text/CDATA use #text/#cdata. */
export type ParsedXmlValue = string | { [name: string]: ParsedXmlValue | ParsedXmlValue[] };
export interface PlcVendorFragment {
  /** One-based element occurrence path; attribute paths end in /@Name. */
  path: string;
  /** Source representations may overlap normalized fields intentionally. */
  reason: 'unmodeled' | 'protected' | 'source-representation';
  value: ParsedXmlValue;
}
export interface PlcSourceMapping {
  sourcePath: string;
  /** Omitted for a field on document.source. */
  resourceId?: string;
  /** Dot-separated field path on resource.data or document.source. */
  field: string;
}
export interface PlcDocument {
  source: {
    format: 'l5x';
    schemaRevision?: string;
    softwareRevision?: string;
    targetType: PlcExportTarget;
    targetName: string;
    /** Kept as a decimal string to avoid losing unsignedLong precision. */
    targetCount?: string;
    containsContext?: boolean;
  };
  /** Includes export targets, owned children and contextual dependencies. */
  resources: PlcResource[];
  /** Only the declared export family; descendants can also have role=target. */
  targetIds: string[];
  fragments: PlcVendorFragment[];
  /** Accounting for source leaves represented by typed fields. */
  mappings: PlcSourceMapping[];
}
