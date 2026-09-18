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
  '@_TargetCount'?: string;
  '@_TargetClass'?: string;
  '@_ContainsContext'?: string;
  '@_ExportDate'?: string;
  '@_ExportOptions'?: string;
  Controller: L5XController;
}

/**
 * Target type - what is being exported
 */
export type L5XTargetType = import('../../types/normalized').PlcExportTarget;

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
  Tasks?: L5XTasks;
  CST?: unknown;
  WallClockTime?: unknown;
  Trends?: L5XTrends;
  DataLogs?: unknown;
  QuickWatchLists?: L5XQuickWatchLists;
  TimeSynchronize?: unknown;
  EthernetPorts?: unknown;
  EthernetNetwork?: unknown;
}

// ============================================
// Trends and Quick-Watch Lists
// ============================================

export interface L5XTrends {
  '@_UId'?: string;
  '@_ParentUId'?: string;
  Trend?: L5XTrend | L5XTrend[];
}

export type L5XTrendCaptureSizeType = 'No Limit' | 'Samples' | 'Time Period';
export type L5XTrendTriggerType = 'Event Trigger' | 'No Trigger';
export type L5XTrendTriggerTargetType = 'Target Tag' | 'Target Value';
export type L5XTrendSampleType = 'Samples' | 'Time Period';
export type L5XTrendLogicalOperation = 'AND' | 'OR';
export type L5XTrendPenType = 'Analog' | 'Digital' | 'Full-Width';

export interface L5XTrend {
  '@_Name'?: string;
  '@_UId'?: string;
  '@_SamplePeriod'?: string;
  '@_NumberOfCaptures'?: string;
  '@_CaptureSizeType'?: L5XTrendCaptureSizeType;
  '@_CaptureSize'?: string;
  '@_StartTriggerType'?: L5XTrendTriggerType;
  '@_StartTriggerTag1'?: string;
  '@_StartTriggerOperation1'?: string;
  '@_StartTriggerTargetType1'?: L5XTrendTriggerTargetType;
  '@_StartTriggerTargetValue1'?: string;
  '@_StartTriggerTargetTag1'?: string;
  '@_StartTriggerLogicalOperation'?: L5XTrendLogicalOperation;
  '@_StartTriggerTag2'?: string;
  '@_StartTriggerOperation2'?: string;
  '@_StartTriggerTargetType2'?: L5XTrendTriggerTargetType;
  '@_StartTriggerTargetValue2'?: string;
  '@_StartTriggerTargetTag2'?: string;
  '@_PreSampleType'?: L5XTrendSampleType;
  '@_PreSamples'?: string;
  '@_StopTriggerType'?: L5XTrendTriggerType;
  '@_StopTriggerTag1'?: string;
  '@_StopTriggerOperation1'?: string;
  '@_StopTriggerTargetType1'?: L5XTrendTriggerTargetType;
  '@_StopTriggerTargetValue1'?: string;
  '@_StopTriggerTargetTag1'?: string;
  '@_StopTriggerLogicalOperation'?: L5XTrendLogicalOperation;
  '@_StopTriggerTag2'?: string;
  '@_StopTriggerOperation2'?: string;
  '@_StopTriggerTargetType2'?: L5XTrendTriggerTargetType;
  '@_StopTriggerTargetValue2'?: string;
  '@_StopTriggerTargetTag2'?: string;
  '@_PostSampleType'?: L5XTrendSampleType;
  '@_PostSamples'?: string;
  '@_TrendxVersion'?: string;
  Description?: L5XDescription;
  Template?: string;
  Pens?: L5XPens;
}

export interface L5XPens {
  Pen?: L5XPen | L5XPen[];
}

export interface L5XPen {
  '@_Name'?: string;
  '@_Color'?: string;
  '@_Visible'?: string;
  '@_Width'?: string;
  '@_Type'?: L5XTrendPenType;
  '@_Style'?: string;
  '@_Marker'?: string;
  '@_Min'?: string;
  '@_Max'?: string;
  '@_EngUnits'?: string;
  Description?: L5XDescription;
}

export interface L5XQuickWatchLists {
  QuickWatchList?: L5XQuickWatchList | L5XQuickWatchList[];
}

export interface L5XQuickWatchList {
  '@_Name'?: string;
  WatchTag?: L5XWatchTag | L5XWatchTag[];
}

export interface L5XWatchTag {
  '@_Specifier'?: string;
  '@_Scope'?: string;
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
  '@_CanForce'?: string;
  '@_Dimensions'?: string;
  '@_ExternalAccess'?: 'Read/Write' | 'Read Only' | 'None';
  '@_Radix'?: string;
  '@_AliasFor'?: string;
  Description?: L5XDescription;
  Data?: L5XTagData | L5XTagData[];
  Comments?: L5XComments;
  ForceData?: L5XForceData | L5XForceData[];
}

export interface L5XTagData {
  '@_Format'?: string;
  '@_Length'?: string;
  '#text'?: string;
  '#cdata'?: string;
  Structure?: L5XTagStructure;
  DataValue?: L5XDataValue;
  Array?: L5XArray;
  AlarmAnalogParameters?: L5XAlarmParameters;
  AlarmDigitalParameters?: L5XAlarmParameters;
  AlarmConfig?: L5XAlarmConfig;
}

export interface L5XTagStructure {
  '@_Name'?: string;
  '@_DataType'?: string;
  DataValueMember?: L5XDataValueMember | L5XDataValueMember[];
  StructureMember?: L5XStructureMember | L5XStructureMember[];
  ArrayMember?: L5XArrayMember | L5XArrayMember[];
  [L5X_STRUCTURE_MEMBER_ORDER]?: L5XOrderedStructureMember[];
}

/**
 * Non-enumerable parser metadata used to retain the interleaving of unlike
 * structure member elements. fast-xml-parser otherwise groups them by name.
 */
export const L5X_STRUCTURE_MEMBER_ORDER = Symbol('l5xStructureMemberOrder');

export type L5XOrderedStructureMember =
  | { kind: 'atomic'; value: L5XDataValueMember }
  | { kind: 'structure'; value: L5XStructureMember }
  | { kind: 'array'; value: L5XArrayMember };

export interface L5XDataValueMember {
  '@_Name'?: string;
  '@_DataType'?: string;
  '@_Value'?: string;
  '@_Radix'?: string;
  '@_ForceValue'?: string;
}

export interface L5XStructureMember extends L5XTagStructure {}

export interface L5XArrayMember {
  '@_Name': string;
  '@_DataType'?: string;
  '@_Dimensions'?: string;
  '@_Radix'?: string;
  Element?: L5XElement | L5XElement[];
}

export interface L5XElement {
  '@_Index': string;
  '@_Value'?: string;
  '@_ForceValue'?: string;
  Structure?: L5XTagStructure | L5XTagStructure[];
}

export interface L5XDataValue {
  '@_Name'?: string;
  '@_DataType'?: string;
  '@_Radix'?: string;
  '@_Value'?: string;
  '@_ForceValue'?: string;
}

export interface L5XArray {
  '@_Name'?: string;
  '@_DataType'?: string;
  '@_Dimensions'?: string;
  '@_Radix'?: string;
  Element?: L5XElement | L5XElement[];
}

export interface L5XComments {
  Comment?: L5XComment | L5XComment[];
}

export interface L5XComment {
  '@_Operand'?: string;
  '@_Unused'?: string;
  '#text'?: string;
  '#cdata'?: string;
  Value?: string | string[];
  LocalizedComment?: L5XLocalizedComment | L5XLocalizedComment[];
}

export interface L5XLocalizedComment {
  '@_Lang'?: string;
  '#text'?: string;
  '#cdata'?: string;
  Value?: string | string[];
}

export interface L5XForceData {
  '@_Format'?: string;
  '#text'?: string;
  '#cdata'?: string;
}

export type L5XAlarmParameters = Record<`@_${string}`, string>;

export interface L5XAlarmConfig {
  Messages?: {
    Message?: L5XAlarmMessage | L5XAlarmMessage[];
  };
  AlarmClass?: L5XDescription;
  HMICmd?: L5XDescription;
}

export interface L5XAlarmMessage {
  '@_Type'?: string;
  '@_ID'?: string;
  Text?: L5XAlarmMessageText;
}

export interface L5XAlarmMessageText {
  '@_Lang'?: string;
  '#text'?: string;
  '#cdata'?: string;
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
  '@_SafetyEnabled'?: string;
  '@_Keying'?: string;
  Description?: L5XDescription;
  EKey?: L5XEKey;
  Ports?: L5XPorts;
  Communications?: L5XCommunications;
  ExtendedProperties?: L5XExtendedProperties;
}

/**
 * Electronic Keying configuration
 */
export interface L5XEKey {
  '@_State': 'ExactMatch' | 'CompatibleModule' | 'Disabled';
}

/**
 * Module port configurations
 */
export interface L5XPorts {
  Port?: L5XPort | L5XPort[];
}

export interface L5XPort {
  '@_Id': string;
  '@_Address'?: string;
  '@_Type': string;
  '@_Upstream'?: string;
  Bus?: L5XBus;
}

export interface L5XBus {
  '@_Size'?: string;
}

/**
 * Module communications configuration
 */
export interface L5XCommunications {
  ConfigTag?: L5XConfigTag;
  Connections?: L5XConnections;
}

export interface L5XConfigTag {
  '@_ConfigSize'?: string;
  '@_ExternalAccess'?: string;
  Data?: L5XTagData | L5XTagData[];
  Comments?: L5XComments;
}

export interface L5XConnections {
  Connection?: L5XConnection | L5XConnection[];
}

export interface L5XConnection {
  '@_Name': string;
  '@_RPI'?: string;
  '@_Type'?: string;
  '@_EventID'?: string;
  '@_ProgrammaticallySendEventTrigger'?: string;
  '@_Unicast'?: string;
  InputTag?: L5XIOTag;
  OutputTag?: L5XIOTag;
}

export interface L5XIOTag {
  '@_ExternalAccess'?: string;
  '@_DataType'?: string;
  Data?: L5XTagData | L5XTagData[];
  Comments?: L5XComments;
}

/**
 * Extended properties for modules
 */
export interface L5XExtendedProperties {
  public?: L5XPublicProperties;
}

export interface L5XPublicProperties {
  ConfigID?: { '@_Value': string };
  CatNum?: { '@_Value': string };
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
  '@_UId'?: string;
  '@_ParentUId'?: string;
  '@_DataTypeUId'?: string;
  '@_Dimensions'?: string;
  '@_Usage': 'Normal' | 'Local' | 'Input' | 'Output' | 'InOut' | 'Static' | 'NULL';
  '@_Radix'?: string;
  '@_Required'?: string;
  '@_Visible'?: string;
  '@_Constant'?: string;
  '@_ExternalAccess'?: string;
  '@_Verified'?: string;
  Comments?: L5XComments;
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
  '@_UId'?: string;
  '@_ParentUId'?: string;
  '@_Type'?: 'Typeless' | 'Normal' | 'EquipmentPhase' | 'LastProgramType';
  '@_TestEdits'?: string;
  '@_MainRoutineName'?: string;
  '@_PreStateRoutineName'?: string;
  '@_FaultRoutineName'?: string;
  '@_ExecutingTaskName'?: string;
  '@_Verified'?: string;
  '@_EditsExist'?: string;
  '@_Disabled'?: string;
  '@_InitialStepIndex'?: string;
  '@_InitialState'?: 'NullState' | 'Idle' | 'Aborted' | 'Stopped' | 'Complete' | 'LastState';
  '@_CompleteStateIfNotImpl'?:
    | 'NoAction'
    | 'StateComplete'
    | 'NotImplPhaseFailure'
    | 'LastNotImplAction';
  '@_LossOfCommCmd'?: 'None' | 'Abort' | 'Hold' | 'Stop' | 'LastCommLossAction';
  '@_ExternalRequestAction'?: 'None' | 'Clear' | 'LastExternalRequestAction';
  '@_EquipmentId'?: string;
  '@_RecipePhaseNames'?: string;
  '@_LastScanTime'?: string;
  '@_MaxScanTime'?: string;
  '@_SynchronizeRedundancyDataAfterExecution'?: string;
  '@_Class'?: string;
  '@_UseAsFolder'?: string;
  Description?: L5XDescription;
  Tags?: L5XTags;
  Parameters?: L5XParameters;
  Routines?: L5XRoutines;
}

// ============================================
// Tasks
// ============================================

export interface L5XTasks {
  '@_UId'?: string;
  '@_ParentUId'?: string;
  Task?: L5XTask | L5XTask[];
}

export type L5XTaskType = 'CONTINUOUS' | 'PERIODIC' | 'EVENT';

export interface L5XTask {
  '@_Name': string;
  '@_UId'?: string;
  '@_ParentUId'?: string;
  '@_Type': L5XTaskType;
  '@_Watchdog'?: string;
  '@_Priority'?: string;
  '@_Rate'?: string;
  '@_DisableUpdateOutputs'?: string;
  '@_InhibitTask'?: string;
  '@_Verified'?: string;
  '@_LastScanTime'?: string;
  '@_MaxScanTime'?: string;
  '@_MaxInterval'?: string;
  '@_MinInterval'?: string;
  '@_StartTime'?: string;
  '@_Class'?: string;
  Description?: L5XDescription;
  EventInfo?: L5XTaskEventInfo;
  ScheduledPrograms?: L5XScheduledPrograms;
}

export interface L5XTaskEventInfo {
  '@_EventTrigger'?: string;
  '@_EventTag'?: string;
  '@_EnableTimeout'?: string;
}

export interface L5XScheduledPrograms {
  ScheduledProgram?: L5XScheduledProgram | L5XScheduledProgram[];
}

export interface L5XScheduledProgram {
  '@_Name': string;
  '@_UId'?: string;
}

// ============================================
// Routines
// ============================================

export interface L5XRoutines {
  Routine?: L5XRoutine | L5XRoutine[];
  EncodedData?: L5XEncodedRoutine | L5XEncodedRoutine[];
}

export interface L5XEncodedRoutine {
  '@_Name': string;
  '@_Type'?: L5XRoutineType;
  '@_EncodedType'?: string;
  Description?: L5XDescription;
  '#text'?: string;
  '#cdata'?: string;
}

export interface L5XRoutine {
  '@_Name': string;
  '@_Type': L5XRoutineType;
  Description?: L5XDescription;
  RLLContent?: L5XRLLContent | L5XRLLContent[];
  STContent?: L5XSTContent | L5XSTContent[];
  FBDContent?: L5XFBDContent;
  SFCContent?: L5XSFCContent;
}

export type L5XRoutineType = 'RLL' | 'ST' | 'FBD' | 'SFC' | 'Typeless' | 'External' | 'Encrypted';

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
