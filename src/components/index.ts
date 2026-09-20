// Virtualized Ladder Diagram (React SVG with windowed rendering)
export { VirtualizedLadderDiagram, type VirtualizedLadderDiagramProps } from './svg';
export { FBDDiagram, type FBDDiagramDiagnostic, type FBDDiagramProps } from './fbd';

// SVG Symbol Components
export {
  ContactSymbol,
  CoilSymbol,
  BoxSymbol,
  InlineDiffInstruction,
  InlineDiffBranch,
  InlineDiffRung,
  type ContactSymbolProps,
  type CoilSymbolProps,
  type BoxSymbolProps,
  type InlineDiffInstructionProps,
  type InlineDiffBranchProps,
  type InlineDiffRungProps,
} from './svg';

// Tag Table
export { TagTable, type TagTableProps } from './TagTable';

// Generic Table (type only)
export type { ColumnDefinition } from './table';

// Controller Info
export { ControllerInfo, type ControllerInfoProps } from './ControllerInfo';

// Data Type Table
export { DataTypeTable, type DataTypeTableProps } from './DataTypeTable';

// Program Navigator
export { ProgramNavigator, type ProgramNavigatorProps, type ProgramNavigatorFilter, type ProgramNavigatorBadges } from './ProgramNavigator';

// AOI Tables
export { AOIParameterTable, type AOIParameterTableProps } from './AOIParameterTable';
export { AOILocalTagTable, type AOILocalTagTableProps } from './AOILocalTagTable';

// Structured Text Viewer
export { StructuredTextViewer, type StructuredTextViewerProps } from './StructuredTextViewer';

// Module Info Table
export { ModuleInfoTable, type ModuleInfoTableProps } from './ModuleInfoTable';
