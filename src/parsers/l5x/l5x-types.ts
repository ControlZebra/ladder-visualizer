/**
 * L5X (Rockwell Logix5000 XML) file format types
 * 
 * These types represent the structure of L5X XML files as parsed by fast-xml-parser.
 * L5X is the native export format for Studio 5000/Logix Designer software.
 */

// ============================================
// Root Level Types
// ============================================

/**
 * Root element of L5X file
 */
export interface L5XContent {
  RSLogix5000Content: RSLogix5000Content;
}

/**
 * RSLogix5000Content element - the main container
 */
export interface RSLogix5000Content {
  '@_SchemaRevision': string;
  '@_SoftwareRevision': string;
  '@_TargetName': string;
  '@_TargetType': L5XTargetType;
  '@_TargetClass'?: string;
  '@_ContainsContext'?: string;
  '@_ExportDate'?: string;
  '@_ExportOptions'?: string;
  Controller: L5XController;
}

/**
 * Target type - what is being exported
 */
export type L5XTargetType = 'Controller' | 'Program' | 'Routine' | 'AddOnInstructionDefinition';

// ============================================
// Controller Types
// ============================================

/**
 * Controller element - main PLC configuration
 */
export interface L5XController {
  '@_Use'?: 'Target' | 'Context';
  '@_Name': string;
  '@_ProcessorType'?: string;
  '@_MajorRev'?: string;
  '@_MinorRev'?: string;
  '@_TimeSlice'?: string;
  '@_ShareUnusedTimeSlice'?: string;
  '@_ProjectCreationDate'?: string;
  '@_LastModifiedDate'?: string;
  '@_SFCExecutionControl'?: string;
  '@_SFCRestartPosition'?: string;
  '@_SFCLastScan'?: string;
  '@_ProjectSN'?: string;
  '@_MatchProjectToController'?: string;
  '@_CanUseRPIFromProducer'?: string;
  '@_InhibitAutomaticFirmwareUpdate'?: string;
  '@_PassThroughConfiguration'?: string;
  '@_DownloadProjectDocumentationAndExtendedProperties'?: string;
  '@_DownloadProjectCustomProperties'?: string;
  '@_ReportMinorOverflow'?: string;
  Description?: L5XDescription;
  RedundancyInfo?: unknown;
  Security?: unknown;
  SafetyInfo?: unknown;
  DataTypes?: L5XDataTypes;
  Modules?: L5XModules;
  AddOnInstructionDefinitions?: L5XAddOnInstructionDefinitions;
  Tags?: L5XTags;
  Programs?: L5XPrograms;
  Tasks?: unknown;
  CST?: unknown;
  WallClockTime?: unknown;
  Trends?: unknown;
  DataLogs?: unknown;
  TimeSynchronize?: unknown;
  EthernetPorts?: unknown;
  EthernetNetwork?: unknown;
}

// ============================================
// Data Types
// ============================================

export interface L5XDataTypes {
  '@_Use'?: 'Target' | 'Context';
  DataType?: L5XDataType | L5XDataType[];
}

export interface L5XDataType {
  '@_Name': string;
  '@_Family': string;
  '@_Class': 'User' | 'ProductDefined' | 'Standard';
  Description?: L5XDescription;
  Members?: L5XMembers;
  Dependencies?: L5XDependencies;
}

export interface L5XMembers {
  Member?: L5XMember | L5XMember[];
}

export interface L5XMember {
  '@_Name': string;
  '@_DataType': string;
  '@_Dimension': string;
  '@_Radix': string;
  '@_Hidden': string;
  '@_ExternalAccess': 'Read/Write' | 'Read Only' | 'None';
  '@_Target'?: string;
  '@_BitNumber'?: string;
  Description?: L5XDescription;
}

export interface L5XDependencies {
  Dependency?: L5XDependency | L5XDependency[];
}

export interface L5XDependency {
  '@_Type': string;
  '@_Name': string;
}

// ============================================
// Tags
// ============================================

export interface L5XTags {
  '@_Use'?: 'Target' | 'Context';
  Tag?: L5XTag | L5XTag[];
}

export interface L5XTag {
  '@_Name': string;
  '@_TagType': 'Base' | 'Alias' | 'Produced' | 'Consumed';
  '@_DataType': string;
  '@_Constant'?: string;
  '@_ExternalAccess'?: 'Read/Write' | 'Read Only' | 'None';
  '@_Radix'?: string;
  '@_AliasFor'?: string;
  Description?: L5XDescription;
  Data?: L5XTagData | L5XTagData[];
  Comments?: L5XComments;
}

export interface L5XTagData {
  '@_Format': 'L5K' | 'Decorated' | 'String';
  '#text'?: string;
  Structure?: L5XTagStructure;
  DataValue?: L5XDataValue;
  Array?: L5XArray;
}

export interface L5XTagStructure {
  '@_DataType': string;
  DataValueMember?: L5XDataValueMember | L5XDataValueMember[];
  StructureMember?: L5XStructureMember | L5XStructureMember[];
  ArrayMember?: L5XArrayMember | L5XArrayMember[];
}

export interface L5XDataValueMember {
  '@_Name': string;
  '@_DataType': string;
  '@_Value': string;
  '@_Radix'?: string;
}

export interface L5XStructureMember {
  '@_Name': string;
  '@_DataType': string;
  DataValueMember?: L5XDataValueMember | L5XDataValueMember[];
}

export interface L5XArrayMember {
  '@_Name': string;
  '@_DataType': string;
  '@_Dimensions': string;
  Element?: L5XElement | L5XElement[];
}

export interface L5XElement {
  '@_Index': string;
  '@_Value'?: string;
  Structure?: L5XTagStructure;
}

export interface L5XDataValue {
  '@_DataType': string;
  '@_Radix': string;
  '@_Value': string;
}

export interface L5XArray {
  '@_DataType': string;
  '@_Dimensions': string;
  '@_Radix'?: string;
  Element?: L5XElement | L5XElement[];
}

export interface L5XComments {
  Comment?: L5XComment | L5XComment[];
}

export interface L5XComment {
  '@_Operand': string;
  '#text': string;
}

// ============================================
// Modules
// ============================================

export interface L5XModules {
  '@_Use'?: 'Target' | 'Context';
  Module?: L5XModule | L5XModule[];
}

export interface L5XModule {
  /** How this module is used in the export: Target (exported), Context (part of controller), Reference (name only) */
  '@_Use'?: 'Target' | 'Context' | 'Reference';
  '@_Name': string;
  '@_CatalogNumber'?: string;
  '@_Vendor'?: string;
  '@_ProductType'?: string;
  '@_ProductCode'?: string;
  '@_Major'?: string;
  '@_Minor'?: string;
  '@_ParentModule'?: string;
  '@_ParentModPortId'?: string;
  '@_Inhibited'?: string;
  '@_MajorFault'?: string;
  EKey?: unknown;
  Ports?: unknown;
  Communications?: unknown;
  ExtendedProperties?: unknown;
}

// ============================================
// Add-On Instructions
// ============================================

export interface L5XAddOnInstructionDefinitions {
  '@_Use'?: 'Target' | 'Context';
  AddOnInstructionDefinition?: L5XAddOnInstruction | L5XAddOnInstruction[];
}

export interface L5XAddOnInstruction {
  '@_Name': string;
  '@_Class'?: string;
  '@_Revision'?: string;
  '@_RevisionExtension'?: string;
  '@_Vendor'?: string;
  '@_ExecutePrescan'?: string;
  '@_ExecutePostscan'?: string;
  '@_ExecuteEnableInFalse'?: string;
  '@_CreatedDate'?: string;
  '@_CreatedBy'?: string;
  '@_EditedDate'?: string;
  '@_EditedBy'?: string;
  '@_SoftwareRevision'?: string;
  Description?: L5XDescription;
  RevisionNote?: L5XDescription;
  AdditionalHelpText?: L5XDescription;
  Parameters?: L5XParameters;
  LocalTags?: L5XLocalTags;
  Routines?: L5XRoutines;
}

export interface L5XParameters {
  Parameter?: L5XParameter | L5XParameter[];
}

export interface L5XParameter {
  '@_Name': string;
  '@_TagType': string;
  '@_DataType': string;
  '@_Usage': 'Input' | 'Output' | 'InOut';
  '@_Radix'?: string;
  '@_Required'?: string;
  '@_Visible'?: string;
  '@_ExternalAccess'?: string;
  Description?: L5XDescription;
  DefaultData?: L5XTagData;
}

export interface L5XLocalTags {
  LocalTag?: L5XLocalTag | L5XLocalTag[];
}

export interface L5XLocalTag {
  '@_Name': string;
  '@_DataType': string;
  '@_Radix'?: string;
  '@_Dimensions'?: string;
  '@_ExternalAccess'?: string;
  Description?: L5XDescription;
  DefaultData?: L5XTagData;
}

// ============================================
// Programs
// ============================================

export interface L5XPrograms {
  '@_Use'?: 'Target' | 'Context';
  Program?: L5XProgram | L5XProgram[];
}

export interface L5XProgram {
  '@_Use'?: 'Target' | 'Context';
  '@_Name': string;
  '@_TestEdits'?: string;
  '@_MainRoutineName'?: string;
  '@_FaultRoutineName'?: string;
  '@_Disabled'?: string;
  '@_Class'?: string;
  '@_UseAsFolder'?: string;
  Description?: L5XDescription;
  Tags?: L5XTags;
  Routines?: L5XRoutines;
}

// ============================================
// Routines
// ============================================

export interface L5XRoutines {
  Routine?: L5XRoutine | L5XRoutine[];
}

export interface L5XRoutine {
  '@_Name': string;
  '@_Type': L5XRoutineType;
  Description?: L5XDescription;
  RLLContent?: L5XRLLContent;
  STContent?: L5XSTContent;
  FBDContent?: L5XFBDContent;
  SFCContent?: L5XSFCContent;
}

export type L5XRoutineType = 'RLL' | 'ST' | 'FBD' | 'SFC';

// ============================================
// Routine Content Types
// ============================================

/**
 * RLL (Relay Ladder Logic) content
 */
export interface L5XRLLContent {
  Rung?: L5XRung | L5XRung[];
}

export interface L5XRung {
  '@_Number': string;
  '@_Type': L5XRungType;
  Comment?: L5XDescription;
  Text?: L5XDescription;
}

export type L5XRungType = 'N' | 'E' | 'D' | 'I' | 'ID' | 'R' | 'RD';

/**
 * ST (Structured Text) content
 */
export interface L5XSTContent {
  Line?: L5XLine | L5XLine[];
}

export interface L5XLine {
  '@_Number': string;
  '#text'?: string;
}

/**
 * FBD (Function Block Diagram) content
 */
export interface L5XFBDContent {
  '@_SheetSize'?: string;
  '@_SheetOrientation'?: string;
  Sheet?: L5XSheet | L5XSheet[];
}

export interface L5XSheet {
  '@_Number': string;
  Description?: L5XDescription;
  Block?: unknown[];
  IRef?: unknown[];
  ORef?: unknown[];
  ICon?: unknown[];
  OCon?: unknown[];
  Wire?: unknown[];
  TextBox?: unknown[];
}

/**
 * SFC (Sequential Function Chart) content
 */
export interface L5XSFCContent {
  '@_SheetSize'?: string;
  '@_SheetOrientation'?: string;
  Step?: unknown | unknown[];
  Transition?: unknown | unknown[];
  Branch?: unknown | unknown[];
  Stop?: unknown | unknown[];
  TextBox?: unknown | unknown[];
  Attachment?: unknown | unknown[];
}

// ============================================
// Common Types
// ============================================

/**
 * Description/Comment element - can be a CDATA string or plain text
 * fast-xml-parser can return this in various formats depending on the content
 */
export type L5XDescription = {
  '#text'?: string;
  '#cdata'?: string;
} | string;

// ============================================
// Helper Types for Parsing
// ============================================

/**
 * Type guard helpers
 */
export function isArray<T>(value: T | T[] | undefined): value is T[] {
  return Array.isArray(value);
}

/**
 * Ensure value is an array (wrap single values)
 */
export function ensureArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Extract text from Description element
 * Handles various formats that fast-xml-parser may produce
 */
export function extractText(desc: L5XDescription | undefined): string | undefined {
  if (desc === undefined) return undefined;
  if (typeof desc === 'string') return desc;
  // Check for CDATA content first
  if (desc['#cdata']) return desc['#cdata'];
  // Then check for regular text
  if (desc['#text']) return desc['#text'];
  return undefined;
}

/**
 * Parse boolean string ('true'/'false') to boolean
 */
export function parseBoolean(value: string | undefined, defaultValue = false): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Parse integer string to number
 */
export function parseInt(value: string | undefined, defaultValue = 0): number {
  if (value === undefined) return defaultValue;
  const parsed = Number.parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}
