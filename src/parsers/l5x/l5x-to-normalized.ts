/**
 * Transform L5X parsed content to normalized controller model
 */

import type {
  L5XContent,
  L5XController,
  L5XDataType,
  L5XDataTypes,
  L5XMember,
  L5XTag,
  L5XTagData,
  L5XTagStructure,
  L5XDataValue,
  L5XArray,
  L5XElement,
  L5XComment,
  L5XForceData,
  L5XAlarmParameters,
  L5XAlarmConfig,
  L5XProgram,
  L5XRoutine,
  L5XRoutines,
  L5XRung,
  L5XAddOnInstruction,
  L5XModule,
  L5XModules,
  L5XRungType,
  L5XParameter,
  L5XLocalTag,
  L5XLine,
  L5XTask,
  L5XTasks,
  L5XTrend,
  L5XPen,
  L5XQuickWatchList,
  L5XFBDContent,
  L5XSheet,
  L5XFBDPositioned,
  L5XFBDReference,
  L5XFBDConnector,
  L5XFBDBlock,
  L5XFBDAOI,
  L5XFBDRoutineControl,
  L5XFBDTextBox,
  L5XFBDWire,
  L5XFBDAttachment,
} from './l5x-types';
import {
  ensureArray,
  extractText,
  L5X_STRUCTURE_MEMBER_ORDER,
  L5X_TAG_DATA_VALUE_ORDER,
  parseBoolean,
  parseInt,
} from './l5x-types';
import type {
  NormalizedController,
  NormalizedDataType,
  NormalizedDataTypeMember,
  NormalizedTag,
  NormalizedProgram,
  NormalizedProgramParameter,
  ProgramParameterUsage,
  NormalizedRoutine,
  NormalizedRung,
  NormalizedRoutineType,
  NormalizedAOI,
  NormalizedModule,
  NormalizedTagType,
  TagScope,
  ExternalAccess,
  DataTypeClass,
  DataTypeUsage,
  ModuleUsage,
  ModulePort,
  ModuleConnection,
  ModuleCategory,
  PortType,
  AOIParameter,
  AOILocalTag,
  AOIClass,
  AOIParameterUsage,
  STLine,
  NormalizedTagData,
  NormalizedDecoratedTagValue,
  NormalizedAtomicTagValue,
  NormalizedArrayTagValue,
  NormalizedArrayElement,
  NormalizedStructureTagValue,
  NormalizedAlarmTagValue,
  NormalizedTagComment,
  NormalizedTagForceData,
  NormalizedTask,
  NormalizedTaskType,
  NormalizedTaskClass,
  NormalizedTrend,
  NormalizedTrendPen,
  NormalizedQuickWatchList,
  NormalizedFBDBody,
  NormalizedFBDSheet,
  NormalizedFBDElement,
  NormalizedFBDPlaceholder,
  NormalizedFBDPlaceholderReason,
  NormalizedFBDDiagnostic,
  NormalizedFBDPosition,
  NormalizedFBDPort,
  NormalizedFBDConnection,
  NormalizedFBDAttachment,
} from '../../types/normalized';
import { parseRungDetailed } from '../rung-parser';
import {
  resolveBuiltInFBDFunctionMetadata,
  type FBDMetadataDiagnostic,
  type FBDPortMetadata,
} from './fbd-metadata';

interface FBDBlockOperandDefinition {
  name: string;
  data: L5XTagData[];
}

type FBDBlockOperandScope = Map<string, FBDBlockOperandDefinition[]>;

interface FBDNormalizationContext {
  softwareRevision?: string;
  processorType?: string;
  aoiDefinitions: Map<string, L5XAddOnInstruction>;
  blockOperandScopes: FBDBlockOperandScope[];
}

/**
 * Convert L5X content to NormalizedController
 */
export function l5xToNormalized(content: L5XContent): NormalizedController {
  const root = content.RSLogix5000Content;
  const controller = root.Controller;
  const targetType = root['@_TargetType'];
  const aoiSources = ensureArray(
    controller.AddOnInstructionDefinitions?.AddOnInstructionDefinition
  );
  const fbdContext: FBDNormalizationContext = {
    softwareRevision: root['@_SoftwareRevision'],
    processorType: controller['@_ProcessorType'],
    aoiDefinitions: new Map(aoiSources.map((aoi) => [aoi['@_Name'], aoi])),
    blockOperandScopes: [createFBDTagOperandScope(controller.Tags?.Tag)],
  };
  const tags = normalizeControllerTags(controller.Tags?.Tag);
  const programs = normalizePrograms(controller.Programs?.Program, fbdContext);
  const aois = normalizeAOIs(aoiSources, fbdContext);
  const modules = normalizeModules(controller.Modules);
  const dataTypes = normalizeDataTypes(controller.DataTypes);
  const dataTypeCatalog = buildDataTypeCatalog(
    controller,
    dataTypes,
    tags,
    programs,
    aois,
    modules
  );

  return {
    // Core metadata
    name: extractControllerName(root),
    description: extractText(controller.Description),
    serialNumber: controller['@_ProjectSN'],
    commPath: controller['@_CommPath'],
    processorType: controller['@_ProcessorType'],
    createdDate: parseDate(controller['@_ProjectCreationDate']),
    modifiedDate: parseDate(controller['@_LastModifiedDate']),

    // Core data
    dataTypes,
    dataTypeCatalog,
    tags,
    programs,
    aois,
    modules,
    tasks: normalizeTasks(controller.Tasks),
    trends: normalizeTrends(controller.Trends?.Trend),
    quickWatchLists: normalizeQuickWatchLists(controller.QuickWatchLists?.QuickWatchList),

    // Source information
    vendor: 'rockwell',
    sourceFormat: 'l5x',
    vendorMetadata: {
      schemaRevision: root['@_SchemaRevision'],
      softwareRevision: root['@_SoftwareRevision'],
      targetType: targetType,
      targetName: root['@_TargetName'],
      targetClass: root['@_TargetClass'],
      exportDate: root['@_ExportDate'],
      exportOptions: root['@_ExportOptions'],
      processorType: controller['@_ProcessorType'],
      majorRev: controller['@_MajorRev'],
      minorRev: controller['@_MinorRev'],
      sfcExecutionControl: controller['@_SFCExecutionControl'],
      sfcRestartPosition: controller['@_SFCRestartPosition'],
      sfcLastScan: controller['@_SFCLastScan'],
      // Store controller name separately for when target type is Program
      controllerName: controller['@_Name'],
    },
  };
}

/**
 * Extract controller name from L5X content
 */
function extractControllerName(root: {
  '@_TargetName': string;
  Controller: L5XController;
}): string {
  // For Program exports, use the target name as it's more descriptive
  // For Controller exports, use the controller name
  return root.Controller['@_Name'] || root['@_TargetName'];
}

/**
 * Parse date string to Date object
 * L5X dates can be in ISO format or other formats
 */
function parseDate(dateString: string | undefined): Date | undefined {
  if (!dateString) return undefined;

  // Try parsing as ISO date
  const parsed = new Date(dateString);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  return undefined;
}

// ============================================
// Data Types
// ============================================

function normalizeDataTypes(dataTypes: L5XDataTypes | undefined): NormalizedDataType[] {
  if (!dataTypes) return [];

  const types = ensureArray(dataTypes.DataType);
  const usage = dataTypes['@_Use'] as DataTypeUsage | undefined;

  return types.map((dt) => normalizeDataType(dt, usage));
}

function normalizeDataType(dt: L5XDataType, usage?: DataTypeUsage): NormalizedDataType {
  const classMap: Record<string, DataTypeClass> = {
    User: 'User',
    ProductDefined: 'BuiltIn',
    Standard: 'BuiltIn',
  };

  // Use the data type's class attribute - context/module-defined info is in the usage field
  const dataTypeClass = classMap[dt['@_Class']] || 'Unknown';

  return {
    name: dt['@_Name'],
    family: dt['@_Family'],
    class: dataTypeClass,
    category: dt['@_Family'] === 'StringFamily' ? 'String' : 'UserDefined',
    resolution: 'Declared',
    members: normalizeMembers(dt.Members?.Member),
    description: extractText(dt.Description),
    usage: usage,
    provenance: [`DataTypes/${dt['@_Name']}`],
  };
}

function normalizeMembers(
  members: L5XMember | L5XMember[] | undefined
): NormalizedDataTypeMember[] {
  const memberArray = ensureArray(members);
  return memberArray.map(normalizeMember);
}

function normalizeMember(m: L5XMember): NormalizedDataTypeMember {
  const dimensions = parseIntegerList(m['@_Dimension']).filter((dimension) => dimension > 0);
  return {
    name: m['@_Name'],
    dataType: m['@_DataType'],
    dimension: dimensions[0] ?? 0,
    dimensions,
    radix: m['@_Radix'] !== 'NullType' ? m['@_Radix'] : undefined,
    hidden: parseBoolean(m['@_Hidden']),
    storageTarget: m['@_Target'],
    bitNumber: parseOptionalSafeInteger(m['@_BitNumber']),
    externalAccess: normalizeExternalAccess(m['@_ExternalAccess']),
    description: extractText(m.Description),
  };
}

const PREDEFINED_ATOMIC_TYPES = new Set([
  'BIT',
  'BOOL',
  'SINT',
  'INT',
  'DINT',
  'LINT',
  'USINT',
  'UINT',
  'UDINT',
  'ULINT',
  'REAL',
  'LREAL',
]);

/**
 * Build the controller-wide Studio 5000 data type catalog. Explicit schema
 * declarations remain authoritative; AOI parameter lists and decorated values
 * contribute the additional categories that L5X does not emit under DataTypes.
 */
function buildDataTypeCatalog(
  controller: L5XController,
  declaredTypes: NormalizedDataType[],
  tags: NormalizedTag[],
  programs: NormalizedProgram[],
  aois: NormalizedAOI[],
  modules: NormalizedModule[]
): NormalizedDataType[] {
  const catalog = new Map<string, NormalizedDataType>();
  const order: string[] = [];

  const addType = (incoming: NormalizedDataType): void => {
    if (!incoming.name) return;
    const existing = catalog.get(incoming.name);
    if (!existing) {
      catalog.set(incoming.name, incoming);
      order.push(incoming.name);
      return;
    }

    const provenance = Array.from(
      new Set([...(existing.provenance ?? []), ...(incoming.provenance ?? [])])
    );
    if (existing.resolution === 'Declared' || incoming.members.length === 0) {
      catalog.set(incoming.name, { ...existing, provenance });
      return;
    }

    const members = [...existing.members];
    let conflict = existing.resolution === 'Conflict';
    for (const member of incoming.members) {
      const matching = members.find((candidate) => candidate.name === member.name);
      if (!matching) {
        members.push(member);
        continue;
      }
      if (
        matching.dataType !== member.dataType ||
        JSON.stringify(matching.dimensions ?? []) !== JSON.stringify(member.dimensions ?? [])
      ) {
        conflict = true;
      }
    }
    catalog.set(incoming.name, {
      ...existing,
      members,
      provenance,
      resolution: conflict ? 'Conflict' : 'Inferred',
    });
  };

  const observeReference = (name: string | undefined, provenance: string): void => {
    if (!name) return;
    const isModuleDefined = name.startsWith('AB:');
    const isString = name === 'STRING';
    addType({
      name,
      ...(isString ? { family: 'StringFamily' } : {}),
      class: isModuleDefined ? 'ModuleDefined' : 'BuiltIn',
      category: isModuleDefined ? 'ModuleDefined' : isString ? 'String' : 'Predefined',
      resolution: PREDEFINED_ATOMIC_TYPES.has(name) ? 'Atomic' : 'Unresolved',
      members: [],
      provenance: [provenance],
    });
  };

  const scanDecoratedValue = (
    value: NormalizedDecoratedTagValue,
    provenance: string
  ): void => {
    if (value.kind === 'alarm') return;
    observeReference(value.dataType, provenance);

    if (value.kind === 'structure') {
      if (value.dataType) {
        addType({
          name: value.dataType,
          class: value.dataType.startsWith('AB:') ? 'ModuleDefined' : 'BuiltIn',
          category: value.dataType.startsWith('AB:') ? 'ModuleDefined' : 'Predefined',
          resolution: 'Inferred',
          members: value.members.flatMap(inferMembersFromDecoratedValue),
          provenance: [provenance],
        });
      }
      value.members.forEach((member) => scanDecoratedValue(member, provenance));
      return;
    }

    if (value.kind === 'array') {
      value.elements.forEach((element) =>
        element.structures.forEach((structure) => scanDecoratedValue(structure, provenance))
      );
    }
  };

  const scanTagData = (data: NormalizedTagData[] | undefined, provenance: string): void => {
    data?.forEach((representation) =>
      representation.values.forEach((value) => scanDecoratedValue(value, provenance))
    );
  };

  const scanTag = (tag: NormalizedTag, provenance: string): void => {
    observeReference(tag.dataType, provenance);
    scanTagData(tag.data, provenance);
  };

  declaredTypes.forEach(addType);

  for (const aoi of aois) {
    addType({
      name: aoi.name,
      family: 'NoFamily',
      class: 'AddOnDefined',
      category: 'AddOnDefined',
      resolution: 'Declared',
      description: aoi.description,
      members: aoi.parameters.map((parameter) => ({
        name: parameter.name,
        dataType: parameter.dataType,
        dimension: parameter.dimensions?.[0] ?? 0,
        dimensions: parameter.dimensions ?? [],
        radix: parameter.radix,
        description: parameter.description,
        usage: parameter.usage,
        tagType: parameter.tagType,
        required: parameter.required,
        visible: parameter.visible,
        externalAccess: parameter.externalAccess,
        defaultValue: parameter.defaultValue,
      })),
      provenance: [`AddOnInstructionDefinitions/${aoi.name}/Parameters`],
    });
  }

  for (const dataType of declaredTypes) {
    dataType.members.forEach((member) =>
      observeReference(member.dataType, `DataTypes/${dataType.name}/Members/${member.name}`)
    );
  }
  for (const tag of tags) scanTag(tag, `Tags/${tag.name}`);
  for (const program of programs) {
    program.parameters.forEach((parameter) =>
      observeReference(parameter.dataType, `Programs/${program.name}/Parameters/${parameter.name}`)
    );
    program.tags.forEach((tag) => scanTag(tag, `Programs/${program.name}/Tags/${tag.name}`));
  }
  for (const aoi of aois) {
    aoi.parameters.forEach((parameter) =>
      observeReference(
        parameter.dataType,
        `AddOnInstructionDefinitions/${aoi.name}/Parameters/${parameter.name}`
      )
    );
    aoi.localTags.forEach((tag) =>
      observeReference(tag.dataType, `AddOnInstructionDefinitions/${aoi.name}/LocalTags/${tag.name}`)
    );
  }
  for (const module of modules) {
    module.connections.forEach((connection) => {
      observeReference(
        connection.inputDataType,
        `Modules/${module.name}/Connections/${connection.name}/InputTag`
      );
      observeReference(
        connection.outputDataType,
        `Modules/${module.name}/Connections/${connection.name}/OutputTag`
      );
    });
  }

  for (const module of ensureArray(controller.Modules?.Module)) {
    const moduleName = module['@_Name'];
    for (const data of ensureArray(module.Communications?.ConfigTag?.Data)) {
      scanTagData([normalizeTagData(data)], `Modules/${moduleName}/ConfigTag`);
    }
    for (const connection of ensureArray(module.Communications?.Connections?.Connection)) {
      const connectionPath = `Modules/${moduleName}/Connections/${connection['@_Name']}`;
      observeReference(connection.InputTag?.['@_DataType'], `${connectionPath}/InputTag`);
      observeReference(connection.OutputTag?.['@_DataType'], `${connectionPath}/OutputTag`);
      for (const data of ensureArray(connection.InputTag?.Data)) {
        scanTagData([normalizeTagData(data)], `${connectionPath}/InputTag`);
      }
      for (const data of ensureArray(connection.OutputTag?.Data)) {
        scanTagData([normalizeTagData(data)], `${connectionPath}/OutputTag`);
      }
    }
  }

  return order.map((name) => catalog.get(name)!);
}

function inferMembersFromDecoratedValue(
  value: NormalizedDecoratedTagValue
): NormalizedDataTypeMember[] {
  if (value.kind === 'alarm' || !value.name || !value.dataType) return [];
  if (value.kind === 'array') {
    return [{
      name: value.name,
      dataType: value.dataType,
      dimension: value.dimensions[0] ?? 0,
      dimensions: value.dimensions,
      radix: value.radix,
    }];
  }
  if (value.kind === 'structure') {
    return [{ name: value.name, dataType: value.dataType, dimension: 0, dimensions: [] }];
  }
  return [{
    name: value.name,
    dataType: value.dataType,
    dimension: 0,
    dimensions: [],
    radix: value.radix,
  }];
}

// ============================================
// Tags
// ============================================

function createFBDBlockOperandScope(
  definitions: FBDBlockOperandDefinition[]
): FBDBlockOperandScope {
  const scope: FBDBlockOperandScope = new Map();
  for (const definition of definitions) {
    const existing = scope.get(definition.name) ?? [];
    existing.push(definition);
    scope.set(definition.name, existing);
  }
  return scope;
}

function createFBDTagOperandScope(tags: L5XTag | L5XTag[] | undefined): FBDBlockOperandScope {
  return createFBDBlockOperandScope(
    ensureArray(tags).map((tag) => ({
      name: tag['@_Name'],
      data: ensureArray(tag.Data),
    }))
  );
}

function createFBDLocalTagOperandScope(
  tags: L5XLocalTag | L5XLocalTag[] | undefined
): FBDBlockOperandScope {
  return createFBDBlockOperandScope(
    ensureArray(tags).map((tag) => ({
      name: tag['@_Name'],
      data: ensureArray(tag.DefaultData).filter((data): data is L5XTagData => typeof data !== 'string'),
    }))
  );
}

function normalizeControllerTags(tags: L5XTag | L5XTag[] | undefined): NormalizedTag[] {
  const tagArray = ensureArray(tags);
  return tagArray.map((tag) => normalizeTag(tag, 'Controller'));
}

function normalizeProgramTags(
  tags: L5XTag | L5XTag[] | undefined,
  programName: string
): NormalizedTag[] {
  const tagArray = ensureArray(tags);
  return tagArray.map((tag) => normalizeTag(tag, 'Program', programName));
}

function normalizeTag(tag: L5XTag, scope: TagScope, programName?: string): NormalizedTag {
  const tagTypeMap: Record<string, NormalizedTagType> = {
    Base: 'Base',
    Alias: 'Alias',
    Produced: 'Produced',
    Consumed: 'Consumed',
  };

  return {
    name: tag['@_Name'],
    tagType: tagTypeMap[tag['@_TagType']] || 'Unknown',
    dataType: tag['@_DataType'],
    radix: tag['@_Radix'],
    dimensions: parseIntegerList(tag['@_Dimensions']),
    constant: parseOptionalBoolean(tag['@_Constant']),
    canForce: parseOptionalBoolean(tag['@_CanForce']),
    externalAccess: normalizeOptionalExternalAccess(tag['@_ExternalAccess']),
    scope,
    programName,
    description: extractText(tag.Description),
    aliasFor: tag['@_AliasFor'],
    comments: normalizeTagComments(tag.Comments?.Comment),
    forceData: ensureArray(tag.ForceData).map(normalizeForceData),
    data: ensureArray(tag.Data).map(normalizeTagData),
    value: extractTagValue(tag),
  };
}

function normalizeOptionalExternalAccess(access: string | undefined): ExternalAccess | undefined {
  return access === undefined ? undefined : normalizeExternalAccess(access);
}

function normalizeExternalAccess(access: string | undefined): ExternalAccess {
  switch (access) {
    case 'Read/Write':
      return 'ReadWrite';
    case 'Read Only':
      return 'ReadOnly';
    case 'None':
      return 'None';
    default:
      return 'ReadWrite'; // Default
  }
}

function extractTagValue(tag: L5XTag): unknown {
  const data = ensureArray(tag.Data);
  // Studio exports can include both representations of a composite tag.
  // Keep its L5K text as the tag's value shortcut; AOI defaults use the
  // separate scalar-only rule in extractDefaultValue.
  const hasDecoratedComposite = data.some((entry) =>
    entry['@_Format'] === 'Decorated' &&
    (entry.Array !== undefined || entry.Structure !== undefined)
  );
  if (hasDecoratedComposite) {
    const l5kData = data.find((entry) => entry['@_Format'] === 'L5K');
    const text = extractNodeText(l5kData)?.trim();
    if (text) return parseScalarDefault(text);
  }
  return extractDefaultValue(tag.Data);
}

function normalizeTagData(data: L5XTagData | string): NormalizedTagData {
  if (typeof data === 'string') return { text: data, values: [] };
  const text = extractNodeText(data);
  const length = data['@_Length'] === undefined ? undefined : Number(data['@_Length']);
  const orderedValues = data[L5X_TAG_DATA_VALUE_ORDER];
  const values: NormalizedDecoratedTagValue[] = orderedValues
    ? orderedValues.map((entry) => {
        switch (entry.kind) {
          case 'atomic':
            return normalizeAtomicValue(entry.value);
          case 'array':
            return normalizeArrayValue(entry.value);
          case 'structure':
            return normalizeStructureValue(entry.value);
          case 'alarmDigital':
            return normalizeAlarmParameters(entry.value, 'digital');
          case 'alarmAnalog':
            return normalizeAlarmParameters(entry.value, 'analog');
          case 'alarmConfig':
            return normalizeAlarmConfig(entry.value);
        }
      })
    : [
        ...ensureArray(data.DataValue).map(normalizeAtomicValue),
        ...ensureArray(data.Array).map(normalizeArrayValue),
        ...ensureArray(data.Structure).map(normalizeStructureValue),
        ...ensureArray(data.AlarmDigitalParameters).map((alarm) => normalizeAlarmParameters(alarm, 'digital')),
        ...ensureArray(data.AlarmAnalogParameters).map((alarm) => normalizeAlarmParameters(alarm, 'analog')),
        ...ensureArray(data.AlarmConfig).map(normalizeAlarmConfig),
      ];
  return {
    ...(data['@_Format'] !== undefined ? { format: data['@_Format'] } : {}),
    ...(length !== undefined && Number.isSafeInteger(length) && length >= 0 ? { length } : {}),
    ...(text !== undefined ? { text } : {}),
    values,
  };
}

function normalizeAtomicValue(value: L5XDataValue): NormalizedAtomicTagValue {
  return {
    kind: 'atomic',
    ...(value['@_Name'] !== undefined ? { name: value['@_Name'] } : {}),
    ...(value['@_DataType'] !== undefined ? { dataType: value['@_DataType'] } : {}),
    ...(value['@_Radix'] !== undefined ? { radix: value['@_Radix'] } : {}),
    ...(value['@_Value'] !== undefined ? { value: value['@_Value'] } : {}),
    ...(value['@_ForceValue'] !== undefined ? { forceValue: value['@_ForceValue'] } : {}),
  };
}

function normalizeArrayValue(array: L5XArray): NormalizedArrayTagValue {
  return {
    kind: 'array',
    ...(array['@_Name'] !== undefined ? { name: array['@_Name'] } : {}),
    ...(array['@_DataType'] !== undefined ? { dataType: array['@_DataType'] } : {}),
    dimensions: parseIntegerList(array['@_Dimensions']),
    ...(array['@_Radix'] !== undefined ? { radix: array['@_Radix'] } : {}),
    elements: ensureArray(array.Element).map(normalizeArrayElement),
  };
}

function normalizeArrayElement(element: L5XElement): NormalizedArrayElement {
  return {
    index: parseIntegerList(element['@_Index']),
    ...(element['@_Value'] !== undefined ? { value: element['@_Value'] } : {}),
    ...(element['@_ForceValue'] !== undefined ? { forceValue: element['@_ForceValue'] } : {}),
    structures: ensureArray(element.Structure).map(normalizeStructureValue),
  };
}

function normalizeStructureValue(structure: L5XTagStructure): NormalizedStructureTagValue {
  const orderedMembers = structure[L5X_STRUCTURE_MEMBER_ORDER];
  const members: NormalizedDecoratedTagValue[] = orderedMembers
    ? orderedMembers.map((member) => {
        switch (member.kind) {
          case 'atomic':
            return normalizeAtomicValue(member.value);
          case 'structure':
            return normalizeStructureValue(member.value);
          case 'array':
            return normalizeArrayValue(member.value);
        }
      })
    : [
        ...ensureArray(structure.DataValueMember).map(normalizeAtomicValue),
        ...ensureArray(structure.StructureMember).map(normalizeStructureValue),
        ...ensureArray(structure.ArrayMember).map(normalizeArrayValue),
      ];
  return {
    kind: 'structure',
    ...(structure['@_Name'] !== undefined ? { name: structure['@_Name'] } : {}),
    ...(structure['@_DataType'] !== undefined ? { dataType: structure['@_DataType'] } : {}),
    members,
  };
}

function normalizeAlarmParameters(
  alarm: L5XAlarmParameters,
  alarmType: 'analog' | 'digital'
): NormalizedAlarmTagValue {
  return {
    kind: 'alarm',
    alarmType,
    parameters: Object.fromEntries(
      Object.entries(alarm)
        .filter(([name, value]) => name.startsWith('@_') && typeof value === 'string')
        .map(([name, value]) => [name.slice(2), value])
    ),
  };
}

function normalizeAlarmConfig(config: L5XAlarmConfig): NormalizedAlarmTagValue {
  const messages = ensureArray(config.Messages?.Message).map((message) => {
    const id = message['@_ID'] === undefined ? undefined : Number(message['@_ID']);
    return {
      ...(message['@_Type'] !== undefined ? { type: message['@_Type'] } : {}),
      ...(id !== undefined && Number.isSafeInteger(id) ? { id } : {}),
      ...(message.Text?.['@_Lang'] !== undefined ? { language: message.Text['@_Lang'] } : {}),
      ...(extractNodeText(message.Text) !== undefined
        ? { text: extractNodeText(message.Text) }
        : {}),
    };
  });
  return {
    kind: 'alarm',
    alarmType: 'config',
    parameters: {},
    ...(extractText(config.AlarmClass) !== undefined
      ? { alarmClass: extractText(config.AlarmClass) }
      : {}),
    ...(extractText(config.HMICmd) !== undefined ? { hmiCommand: extractText(config.HMICmd) } : {}),
    ...(messages.length ? { messages } : {}),
  };
}

function normalizeTagComments(
  comments: L5XComment | L5XComment[] | undefined
): NormalizedTagComment[] {
  return ensureArray(comments).map((comment) => {
    const localizedTexts = ensureArray(comment.LocalizedComment).flatMap((localized) => {
      const values = ensureArray(localized.Value);
      const texts = values.length ? values : [extractNodeText(localized)].filter(isString);
      return texts.map((text) => ({
        ...(localized['@_Lang'] !== undefined ? { language: localized['@_Lang'] } : {}),
        text,
      }));
    });
    const directValues = ensureArray(comment.Value);
    const mixedText = extractNodeText(comment);
    const values = [...(mixedText !== undefined ? [mixedText] : []), ...directValues];
    const directText = values[0];
    return {
      ...(comment['@_Operand'] !== undefined ? { operand: comment['@_Operand'] } : {}),
      ...(directText !== undefined ? { text: directText } : {}),
      values,
      ...(comment['@_Unused'] !== undefined
        ? { unused: parseBoolean(comment['@_Unused']) }
        : {}),
      localizedTexts,
    };
  });
}

function normalizeForceData(force: L5XForceData): NormalizedTagForceData {
  const value = extractNodeText(force);
  return {
    ...(force['@_Format'] !== undefined ? { format: force['@_Format'] } : {}),
    ...(value !== undefined ? { value } : {}),
  };
}

function extractNodeText(
  value: { '#text'?: string; '#cdata'?: string } | string | undefined
): string | undefined {
  if (typeof value === 'string') return value;
  return value?.['#cdata'] ?? value?.['#text'];
}

function parseIntegerList(value: string | undefined): number[] {
  if (value === undefined) return [];
  const unwrapped = value.trim().replace(/^\[/, '').replace(/\]$/, '');
  if (!unwrapped) return [];
  const parsed = unwrapped.split(/[\s,]+/).map((part) => Number(part.trim()));
  return parsed.every((item) => Number.isSafeInteger(item) && item >= 0) ? parsed : [];
}

function parseOptionalBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  return value === '1' || ['true', 'yes'].includes(value.toLowerCase());
}

function parseOptionalSafeInteger(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function isString(value: string | undefined): value is string {
  return value !== undefined;
}

// ============================================
// Programs
// ============================================

function normalizePrograms(
  programs: L5XProgram | L5XProgram[] | undefined,
  fbdContext: FBDNormalizationContext
): NormalizedProgram[] {
  const programArray = ensureArray(programs);
  return programArray.map((program, index) => normalizeProgram(program, index, fbdContext));
}

function normalizeProgram(
  program: L5XProgram,
  index: number,
  fbdContext: FBDNormalizationContext
): NormalizedProgram {
  const programName = program['@_Name'] || `Program_${index}`;
  const programFBDContext: FBDNormalizationContext = {
    ...fbdContext,
    blockOperandScopes: [
      createFBDTagOperandScope(program.Tags?.Tag),
      ...fbdContext.blockOperandScopes,
    ],
  };

  return {
    name: programName,
    uid: program['@_UId'],
    parentUid: program['@_ParentUId'],
    useAsFolder: parseOptionalBoolean(program['@_UseAsFolder']),
    tags: normalizeProgramTags(program.Tags?.Tag, programName),
    routines: normalizeRoutines(program.Routines, programFBDContext),
    parameters: normalizeProgramParameters(program.Parameters?.Parameter, programName),
    programType: program['@_Type'],
    description: extractText(program.Description),
    mainRoutineName: program['@_MainRoutineName'],
    preStateRoutineName: program['@_PreStateRoutineName'],
    faultRoutineName: program['@_FaultRoutineName'],
    executingTaskName: program['@_ExecutingTaskName'],
    testEdits: parseOptionalBoolean(program['@_TestEdits']),
    verified: parseOptionalBoolean(program['@_Verified']),
    editsExist: parseOptionalBoolean(program['@_EditsExist']),
    disabled: parseOptionalBoolean(program['@_Disabled']),
    initialStepIndex: parseOptionalSafeInteger(program['@_InitialStepIndex']),
    initialState: program['@_InitialState'],
    completeStateIfNotImplemented: program['@_CompleteStateIfNotImpl'],
    lossOfCommunicationCommand: program['@_LossOfCommCmd'],
    externalRequestAction: program['@_ExternalRequestAction'],
    equipmentId: parseOptionalSafeInteger(program['@_EquipmentId']),
    recipePhaseNames: program['@_RecipePhaseNames'],
    lastScanTime: parseOptionalSafeInteger(program['@_LastScanTime']),
    maxScanTime: parseOptionalSafeInteger(program['@_MaxScanTime']),
    synchronizeRedundancyDataAfterExecution: parseOptionalBoolean(
      program['@_SynchronizeRedundancyDataAfterExecution']
    ),
  };
}

function normalizeProgramParameters(
  parameters: L5XParameter | L5XParameter[] | undefined,
  programName: string
): NormalizedProgramParameter[] {
  return ensureArray(parameters).map((parameter) => ({
    name: parameter['@_Name'],
    dataType: parameter['@_DataType'],
    usage: parameter['@_Usage'] as ProgramParameterUsage,
    scope: 'Program',
    programName,
    ...(parameter['@_TagType'] !== undefined
      ? { tagType: parameter['@_TagType'] as NormalizedTagType }
      : {}),
    ...(parameter['@_UId'] !== undefined ? { uid: parameter['@_UId'] } : {}),
    ...(parameter['@_ParentUId'] !== undefined ? { parentUid: parameter['@_ParentUId'] } : {}),
    ...(parameter['@_DataTypeUId'] !== undefined
      ? { dataTypeUid: parameter['@_DataTypeUId'] }
      : {}),
    ...(parameter['@_Dimensions'] !== undefined
      ? { dimensions: parseIntegerList(parameter['@_Dimensions']) }
      : {}),
    ...(parameter['@_Radix'] !== undefined ? { radix: parameter['@_Radix'] } : {}),
    ...(parameter['@_Required'] !== undefined
      ? { required: parseOptionalBoolean(parameter['@_Required']) }
      : {}),
    ...(parameter['@_Visible'] !== undefined
      ? { visible: parseOptionalBoolean(parameter['@_Visible']) }
      : {}),
    ...(parameter['@_Constant'] !== undefined
      ? { constant: parseOptionalBoolean(parameter['@_Constant']) }
      : {}),
    ...(parameter['@_ExternalAccess'] !== undefined
      ? { externalAccess: normalizeOptionalExternalAccess(parameter['@_ExternalAccess']) }
      : {}),
    ...(parameter['@_Verified'] !== undefined
      ? { verified: parseOptionalBoolean(parameter['@_Verified']) }
      : {}),
    ...(extractText(parameter.Description) !== undefined
      ? { description: extractText(parameter.Description) }
      : {}),
    comments: normalizeTagComments(parameter.Comments?.Comment),
    ...(parameter.DefaultData !== undefined
      ? { defaultData: normalizeTagData(ensureArray(parameter.DefaultData)[0]) }
      : {}),
  }));
}

// ============================================
// Tasks
// ============================================

function normalizeTasks(tasks: L5XTasks | undefined): NormalizedTask[] {
  return ensureArray(tasks?.Task).map(normalizeTask);
}

function normalizeTask(task: L5XTask): NormalizedTask {
  const typeMap: Record<L5XTask['@_Type'], NormalizedTaskType> = {
    CONTINUOUS: 'Continuous',
    PERIODIC: 'Periodic',
    EVENT: 'Event',
  };
  const taskClass = task['@_Class'];
  const normalizedClass: NormalizedTaskClass | undefined =
    taskClass === 'Standard' || taskClass === 'Safety' ? taskClass : undefined;
  const event = task.EventInfo;
  const rate = parseOptionalInteger(task['@_Rate']);
  const priority = parseOptionalInteger(task['@_Priority']);
  const watchdog = parseOptionalInteger(task['@_Watchdog']);

  return {
    name: task['@_Name'],
    type: typeMap[task['@_Type']],
    description: extractText(task.Description),
    ...(rate !== undefined ? { rate } : {}),
    ...(priority !== undefined ? { priority } : {}),
    ...(watchdog !== undefined ? { watchdog } : {}),
    ...(task['@_DisableUpdateOutputs'] !== undefined
      ? { disableUpdateOutputs: parseOptionalBoolean(task['@_DisableUpdateOutputs']) }
      : {}),
    ...(task['@_InhibitTask'] !== undefined
      ? { inhibited: parseOptionalBoolean(task['@_InhibitTask']) }
      : {}),
    ...(task['@_Verified'] !== undefined
      ? { verified: parseOptionalBoolean(task['@_Verified']) }
      : {}),
    ...(normalizedClass !== undefined ? { class: normalizedClass } : {}),
    ...(event !== undefined
      ? {
          event: {
            ...(event['@_EventTrigger'] !== undefined
              ? { trigger: event['@_EventTrigger'] }
              : {}),
            ...(event['@_EventTag'] !== undefined ? { tag: event['@_EventTag'] } : {}),
            ...(event['@_EnableTimeout'] !== undefined
              ? { timeoutEnabled: parseOptionalBoolean(event['@_EnableTimeout']) }
              : {}),
          },
        }
      : {}),
    scheduledProgramNames: ensureArray(task.ScheduledPrograms?.ScheduledProgram).map(
      (program) => program['@_Name']
    ),
  };
}

function parseOptionalInteger(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

// ============================================
// Trends and Quick-Watch Lists
// ============================================

function normalizeTrends(trends: L5XTrend | L5XTrend[] | undefined): NormalizedTrend[] {
  return ensureArray(trends).map((trend) => {
    const normalized: NormalizedTrend = {
      pens: ensureArray(trend.Pens?.Pen).map(normalizeTrendPen),
    };
    const strings = {
      name: trend['@_Name'],
      uid: trend['@_UId'],
      description: extractText(trend.Description),
      captureSizeType: trend['@_CaptureSizeType'],
      startTriggerType: trend['@_StartTriggerType'],
      startTriggerTag1: trend['@_StartTriggerTag1'],
      startTriggerTargetType1: trend['@_StartTriggerTargetType1'],
      startTriggerTargetValue1: trend['@_StartTriggerTargetValue1'],
      startTriggerTargetTag1: trend['@_StartTriggerTargetTag1'],
      startTriggerLogicalOperation: trend['@_StartTriggerLogicalOperation'],
      startTriggerTag2: trend['@_StartTriggerTag2'],
      startTriggerTargetType2: trend['@_StartTriggerTargetType2'],
      startTriggerTargetValue2: trend['@_StartTriggerTargetValue2'],
      startTriggerTargetTag2: trend['@_StartTriggerTargetTag2'],
      preSampleType: trend['@_PreSampleType'],
      stopTriggerType: trend['@_StopTriggerType'],
      stopTriggerTag1: trend['@_StopTriggerTag1'],
      stopTriggerTargetType1: trend['@_StopTriggerTargetType1'],
      stopTriggerTargetValue1: trend['@_StopTriggerTargetValue1'],
      stopTriggerTargetTag1: trend['@_StopTriggerTargetTag1'],
      stopTriggerLogicalOperation: trend['@_StopTriggerLogicalOperation'],
      stopTriggerTag2: trend['@_StopTriggerTag2'],
      stopTriggerTargetType2: trend['@_StopTriggerTargetType2'],
      stopTriggerTargetValue2: trend['@_StopTriggerTargetValue2'],
      stopTriggerTargetTag2: trend['@_StopTriggerTargetTag2'],
      postSampleType: trend['@_PostSampleType'],
      trendxVersion: trend['@_TrendxVersion'],
    } as const;
    for (const [key, value] of Object.entries(strings)) {
      if (value !== undefined) Object.assign(normalized, { [key]: value });
    }
    const integers = {
      samplePeriod: trend['@_SamplePeriod'],
      numberOfCaptures: trend['@_NumberOfCaptures'],
      captureSize: trend['@_CaptureSize'],
      startTriggerOperation1: trend['@_StartTriggerOperation1'],
      startTriggerOperation2: trend['@_StartTriggerOperation2'],
      preSamples: trend['@_PreSamples'],
      stopTriggerOperation1: trend['@_StopTriggerOperation1'],
      stopTriggerOperation2: trend['@_StopTriggerOperation2'],
      postSamples: trend['@_PostSamples'],
    } as const;
    for (const [key, value] of Object.entries(integers)) {
      const parsed = parseOptionalSafeInteger(value);
      if (parsed !== undefined) Object.assign(normalized, { [key]: parsed });
    }
    return normalized;
  });
}

function normalizeTrendPen(pen: L5XPen): NormalizedTrendPen {
  const normalized: NormalizedTrendPen = {};
  const values = {
    name: pen['@_Name'],
    description: extractText(pen.Description),
    color: pen['@_Color'],
    type: pen['@_Type'],
    engineeringUnits: pen['@_EngUnits'],
  } as const;
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) Object.assign(normalized, { [key]: value });
  }
  if (pen['@_Visible'] !== undefined) normalized.visible = parseOptionalBoolean(pen['@_Visible']);
  for (const [key, value] of Object.entries({
    width: pen['@_Width'],
    style: pen['@_Style'],
    marker: pen['@_Marker'],
  })) {
    const parsed = parseOptionalSafeInteger(value);
    if (parsed !== undefined) Object.assign(normalized, { [key]: parsed });
  }
  const min = parseOptionalFloat(pen['@_Min']);
  const max = parseOptionalFloat(pen['@_Max']);
  if (min !== undefined) normalized.min = min;
  if (max !== undefined) normalized.max = max;
  return normalized;
}

function parseOptionalFloat(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (value === 'INF') return Number.POSITIVE_INFINITY;
  if (value === '-INF') return Number.NEGATIVE_INFINITY;
  if (value === 'NaN') return Number.NaN;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function normalizeQuickWatchLists(
  lists: L5XQuickWatchList | L5XQuickWatchList[] | undefined
): NormalizedQuickWatchList[] {
  return ensureArray(lists).map((list) => ({
    ...(list['@_Name'] !== undefined ? { name: list['@_Name'] } : {}),
    watchTags: ensureArray(list.WatchTag).map((tag) => ({
      ...(tag['@_Specifier'] !== undefined ? { specifier: tag['@_Specifier'] } : {}),
      ...(tag['@_Scope'] !== undefined ? { scope: tag['@_Scope'] } : {}),
    })),
  }));
}

// ============================================
// Routines
// ============================================

function normalizeRoutines(
  routines: L5XRoutines | undefined,
  fbdContext: FBDNormalizationContext
): NormalizedRoutine[] {
  return ensureArray(routines?.Routine).map((routine) => normalizeRoutine(routine, fbdContext));
}

function normalizeRoutine(
  routine: L5XRoutine,
  fbdContext: FBDNormalizationContext
): NormalizedRoutine {
  const type = routine['@_Type'] as NormalizedRoutineType;

  return {
    name: routine['@_Name'],
    type,
    rungs:
      type === 'RLL'
        ? normalizeRungs(ensureArray(routine.RLLContent).flatMap((body) => ensureArray(body.Rung)))
        : [],
    stContent:
      type === 'ST'
        ? normalizeSTContent(
            ensureArray(routine.STContent).flatMap((body) => ensureArray(body.Line))
          )
        : undefined,
    fbd:
      type === 'FBD' && routine.FBDContent !== undefined
        ? normalizeFBDContent(ensureArray(routine.FBDContent)[0], fbdContext)
        : undefined,
    description: extractText(routine.Description),
  };
}

const MAX_UNSIGNED_LONG = BigInt('18446744073709551615');

function normalizeFBDContent(
  content: L5XFBDContent,
  fbdContext: FBDNormalizationContext
): NormalizedFBDBody {
  const diagnostics: NormalizedFBDDiagnostic[] = [];
  const sheetSize = content['@_SheetSize'];
  const orientation = content['@_SheetOrientation'];

  if (sheetSize === undefined) {
    diagnostics.push({
      code: 'FBD_MISSING_SHEET_SIZE',
      message: 'FBD SheetSize is absent; using the canonical Unspecified display size.',
      severity: 'info',
    });
  }
  if (orientation === undefined) {
    diagnostics.push({
      code: 'FBD_MISSING_SHEET_ORIENTATION',
      message: 'FBD SheetOrientation is absent; using the canonical Landscape orientation.',
      severity: 'info',
    });
  } else if (orientation !== 'Landscape' && orientation !== 'Portrait') {
    diagnostics.push({
      code: 'FBD_INVALID_SHEET_ORIENTATION',
      message: `FBD SheetOrientation ${orientation} is unsupported; using Landscape.`,
      severity: 'info',
    });
  }

  return {
    sheetSize: {
      value: sheetSize ?? 'Unspecified',
      source: sheetSize === undefined ? 'fallback' : 'declared',
    },
    orientation: {
      value: orientation === 'Portrait' ? 'Portrait' : 'Landscape',
      source: orientation === 'Landscape' || orientation === 'Portrait' ? 'declared' : 'fallback',
    },
    sheets: ensureArray(content.Sheet).map((sheet, index) =>
      normalizeFBDSheet(sheet, index, diagnostics, fbdContext)
    ),
    diagnostics,
  };
}

function normalizeFBDSheet(
  sheet: L5XSheet,
  sheetIndex: number,
  diagnostics: NormalizedFBDDiagnostic[],
  fbdContext: FBDNormalizationContext
): NormalizedFBDSheet {
  const declaredNumber = sheet['@_Number'];
  const validNumber = isUnsignedLong(declaredNumber);
  const number = validNumber ? declaredNumber : String(sheetIndex + 1);
  const declaredName = sheet['@_Name'];

  if (declaredNumber === undefined) {
    diagnostics.push({
      code: 'FBD_MISSING_SHEET_NUMBER',
      message: `FBD sheet ${sheetIndex + 1} has no Number; using ${number}.`,
      severity: 'info',
      sheetIndex,
    });
  } else if (!validNumber) {
    diagnostics.push({
      code: 'FBD_INVALID_SHEET_NUMBER',
      message: `FBD sheet ${sheetIndex + 1} has invalid Number ${declaredNumber}; using ${number}.`,
      severity: 'info',
      sheetIndex,
    });
  }
  const elements: NormalizedFBDElement[] = [];
  const pendingConnections: Array<{ kind: 'wire' | 'feedback-wire'; value: L5XFBDWire }> = [];
  const pendingAttachments: L5XFBDAttachment[] = [];

  const appendElement = (element: NormalizedFBDElement) => {
    elements.push(element);
    if (element.kind === 'placeholder') {
      diagnostics.push({
        code: 'FBD_PLACEHOLDER_ELEMENT',
        message: `FBD ${element.sourceKind} was retained as a placeholder (${element.reasonCodes.join(', ')}).`,
        severity: 'warning',
        sheetIndex,
        sourceKind: element.sourceKind,
      });
    }
  };

  for (const [sourceKind, collection] of Object.entries(sheet)) {
    if (sourceKind.startsWith('@_') || sourceKind === 'Description') continue;
    if (sourceKind === 'Wire' || sourceKind === 'FeedbackWire') {
      ensureUnknownArray(collection).forEach((value) =>
        pendingConnections.push({
          kind: sourceKind === 'Wire' ? 'wire' : 'feedback-wire',
          value: asRecord(value) as L5XFBDWire,
        })
      );
      continue;
    }
    if (sourceKind === 'Attachment') {
      ensureUnknownArray(collection).forEach((value) =>
        pendingAttachments.push(asRecord(value) as L5XFBDAttachment)
      );
      continue;
    }

    ensureUnknownArray(collection).forEach((value) => {
      const node = asRecord(value);
      switch (sourceKind) {
        case 'IRef':
          appendElement(normalizeFBDReference(node as L5XFBDReference, 'input', sourceKind));
          break;
        case 'ORef':
          appendElement(normalizeFBDReference(node as L5XFBDReference, 'output', sourceKind));
          break;
        case 'ICon':
          appendElement(normalizeFBDConnector(node as L5XFBDConnector, 'input', sourceKind));
          break;
        case 'OCon':
          appendElement(normalizeFBDConnector(node as L5XFBDConnector, 'output', sourceKind));
          break;
        case 'Block':
          appendElement(
            normalizeFBDBlock(
              node as L5XFBDBlock,
              fbdContext,
              diagnostics,
              sheetIndex
            )
          );
          break;
        case 'AddOnInstruction':
          appendElement(
            normalizeFBDAOI(node as L5XFBDAOI, fbdContext, diagnostics, sheetIndex)
          );
          break;
        case 'GSV':
        case 'SSV':
          appendElement(
            createFBDPlaceholder(
              node,
              sourceKind,
              ['unsupported-semantics'],
              []
            )
          );
          break;
        case 'JSR':
        case 'SBR':
        case 'RET':
          appendElement(normalizeFBDRoutineControl(node as L5XFBDRoutineControl, sourceKind));
          break;
        case 'TextBox':
          appendElement(normalizeFBDTextBox(node as L5XFBDTextBox));
          break;
        case 'Function':
          appendElement(
            normalizeFBDFunction(node, fbdContext, diagnostics, sheetIndex)
          );
          break;
        default:
          appendElement(
            createFBDPlaceholder(
              node,
              sourceKind,
              ['unknown-kind', 'unresolved-metadata'],
              []
            )
          );
      }
    });
  }

  const connections: NormalizedFBDConnection[] = [];
  for (const pending of pendingConnections) {
    const fromId = pending.value['@_FromID'];
    const toId = pending.value['@_ToID'];
    if (!isUnsignedLong(fromId) || !isUnsignedLong(toId)) {
      const reasons: NormalizedFBDPlaceholderReason[] = [];
      if (fromId === undefined || toId === undefined) reasons.push('missing-id');
      if (
        (fromId !== undefined && !isUnsignedLong(fromId)) ||
        (toId !== undefined && !isUnsignedLong(toId))
      )
        reasons.push('invalid-id');
      appendElement(
        createNonPositionedPlaceholder(pending.kind === 'wire' ? 'Wire' : 'FeedbackWire', reasons)
      );
      continue;
    }
    const fromPort = pending.value['@_FromParam'] ?? implicitFBDPort(elements, fromId, 'from');
    const toPort = pending.value['@_ToParam'] ?? implicitFBDPort(elements, toId, 'to');
    connections.push({
      kind: pending.kind,
      from: { elementId: fromId, ...(fromPort !== undefined ? { port: fromPort } : {}) },
      to: { elementId: toId, ...(toPort !== undefined ? { port: toPort } : {}) },
      ...(parseFBDBoolean(pending.value['@_Verified']) !== undefined
        ? { verified: parseFBDBoolean(pending.value['@_Verified']) }
        : {}),
    });
  }

  const attachments: NormalizedFBDAttachment[] = [];
  for (const attachment of pendingAttachments) {
    const fromId = attachment['@_FromID'];
    const toId = attachment['@_ToID'];
    if (!isUnsignedLong(fromId) || !isUnsignedLong(toId)) {
      const reasons: NormalizedFBDPlaceholderReason[] = [];
      if (fromId === undefined || toId === undefined) reasons.push('missing-id');
      if (
        (fromId !== undefined && !isUnsignedLong(fromId)) ||
        (toId !== undefined && !isUnsignedLong(toId))
      )
        reasons.push('invalid-id');
      appendElement(createNonPositionedPlaceholder('Attachment', reasons));
      continue;
    }
    attachments.push({
      fromElementId: fromId,
      toElementId: toId,
      ...(parseFBDBoolean(attachment['@_Verified']) !== undefined
        ? { verified: parseFBDBoolean(attachment['@_Verified']) }
        : {}),
    });
  }

  return {
    number: { value: number, source: validNumber ? 'declared' : 'fallback' },
    name: {
      value: declaredName ?? `Sheet ${sheetIndex + 1}`,
      source: declaredName === undefined ? 'fallback' : 'declared',
    },
    descriptions: ensureArray(sheet.Description)
      .map(extractText)
      .filter((description): description is string => description !== undefined),
    elements,
    connections,
    attachments,
  };
}

function normalizeFBDReference(
  node: L5XFBDReference,
  referenceType: 'input' | 'output',
  sourceKind: 'IRef' | 'ORef'
): NormalizedFBDElement {
  const placeholderPorts = [
    implicitNormalizedFBDPort(referenceType === 'input' ? 'output' : 'input'),
  ];
  const positioned = normalizeFBDPositioned(node, sourceKind, placeholderPorts);
  if ('kind' in positioned) return positioned;
  const hidden = parseFBDBoolean(node['@_HideDesc']);
  return {
    kind: 'reference',
    referenceType,
    ...positioned,
    ...(node['@_Operand'] !== undefined ? { operand: node['@_Operand'] } : {}),
    ...(hidden !== undefined ? { hideDescription: hidden } : {}),
    ports: ['value'],
  };
}

function normalizeFBDConnector(
  node: L5XFBDConnector,
  connectorType: 'input' | 'output',
  sourceKind: 'ICon' | 'OCon'
): NormalizedFBDElement {
  const placeholderPorts = [
    implicitNormalizedFBDPort(connectorType === 'input' ? 'output' : 'input'),
  ];
  const positioned = normalizeFBDPositioned(node, sourceKind, placeholderPorts);
  if ('kind' in positioned) return positioned;
  return {
    kind: 'connector',
    connectorType,
    ...positioned,
    ...(node['@_Name'] !== undefined ? { name: node['@_Name'] } : {}),
    ports: ['value'],
  };
}

function normalizeFBDBlock(
  node: L5XFBDBlock,
  context: FBDNormalizationContext,
  diagnostics: NormalizedFBDDiagnostic[],
  sheetIndex: number
): NormalizedFBDElement {
  const visiblePinsSource = node['@_VisiblePins'];
  const visiblePins = splitTokens(visiblePinsSource);
  const mnemonic = node['@_Type']?.trim();
  const operand = node['@_Operand']?.trim();
  const unresolved = () =>
    createFBDPlaceholder(
      node as L5XFBDBlock & Record<string, unknown>,
      'Block',
      ['unresolved-metadata'],
      []
    );

  if (!mnemonic) {
    appendFBDBlockDiagnostic(
      diagnostics,
      'FBD_MISSING_BLOCK_TYPE',
      'FBD Block has no Type attribute.',
      sheetIndex
    );
    return unresolved();
  }
  if (!operand) {
    appendFBDBlockDiagnostic(
      diagnostics,
      'FBD_MISSING_BLOCK_OPERAND',
      `FBD ${mnemonic} has no Operand attribute.`,
      sheetIndex
    );
    return unresolved();
  }

  let definition: FBDBlockOperandDefinition | undefined;
  for (const scope of context.blockOperandScopes) {
    const candidates = scope.get(operand);
    if (!candidates?.length) continue;
    if (candidates.length > 1) {
      appendFBDBlockDiagnostic(
        diagnostics,
        'FBD_AMBIGUOUS_BLOCK_OPERAND',
        `FBD ${mnemonic} operand ${operand} resolves to multiple definitions in the same scope.`,
        sheetIndex
      );
      return unresolved();
    }
    definition = candidates[0];
    break;
  }
  if (!definition) {
    appendFBDBlockDiagnostic(
      diagnostics,
      'FBD_UNRESOLVED_BLOCK_OPERAND',
      `FBD ${mnemonic} operand ${operand} does not resolve in its owning scope.`,
      sheetIndex
    );
    return unresolved();
  }

  const structures = definition.data
    .filter((data) => data['@_Format'] === 'Decorated')
    .flatMap((data) => ensureArray(data.Structure));
  if (!structures.length) {
    appendFBDBlockDiagnostic(
      diagnostics,
      'FBD_MISSING_DECORATED_STRUCTURE',
      `FBD ${mnemonic} operand ${operand} has no decorated Structure.`,
      sheetIndex
    );
    return unresolved();
  }
  if (structures.length > 1) {
    appendFBDBlockDiagnostic(
      diagnostics,
      'FBD_AMBIGUOUS_DECORATED_STRUCTURE',
      `FBD ${mnemonic} operand ${operand} has multiple decorated Structures.`,
      sheetIndex
    );
    return unresolved();
  }

  const members = normalizeStructureValue(structures[0]).members.filter(
    (
      member
    ): member is NormalizedAtomicTagValue | NormalizedArrayTagValue | NormalizedStructureTagValue =>
      member.kind !== 'alarm'
  );
  const unnamedMembers = members.filter((member) => !member.name);
  if (unnamedMembers.length) {
    appendFBDBlockDiagnostic(
      diagnostics,
      'FBD_UNNAMED_STRUCTURE_MEMBER',
      `FBD ${mnemonic} operand ${operand} has an unnamed direct Structure member.`,
      sheetIndex
    );
    return unresolved();
  }
  const memberNames = members.map((member) => member.name!);
  const duplicateMembers = duplicateStrings(memberNames);
  if (duplicateMembers.length) {
    appendFBDBlockDiagnostic(
      diagnostics,
      'FBD_DUPLICATE_STRUCTURE_MEMBER',
      `FBD ${mnemonic} operand ${operand} has duplicate direct member ${duplicateMembers[0]}.`,
      sheetIndex
    );
    return unresolved();
  }

  const enableInIndex = memberNames.indexOf('EnableIn');
  const enableOutIndex = memberNames.indexOf('EnableOut');
  if (enableInIndex !== 0 || enableOutIndex <= enableInIndex) {
    appendFBDBlockDiagnostic(
      diagnostics,
      'FBD_INVALID_BLOCK_SENTINELS',
      `FBD ${mnemonic} operand ${operand} must start with EnableIn and declare EnableOut after its inputs.`,
      sheetIndex
    );
    return unresolved();
  }
  if (visiblePinsSource === undefined) {
    appendFBDBlockDiagnostic(
      diagnostics,
      'FBD_MISSING_VISIBLE_PINS',
      `FBD ${mnemonic} has no VisiblePins attribute.`,
      sheetIndex
    );
    return unresolved();
  }
  const duplicateVisiblePins = duplicateStrings(visiblePins);
  if (duplicateVisiblePins.length) {
    appendFBDBlockDiagnostic(
      diagnostics,
      'FBD_DUPLICATE_VISIBLE_PIN',
      `FBD ${mnemonic} selects duplicate visible pin ${duplicateVisiblePins[0]}.`,
      sheetIndex
    );
    return unresolved();
  }
  const knownMemberNames = new Set(memberNames);
  const unknownVisiblePins = visiblePins.filter((pin) => !knownMemberNames.has(pin));
  if (unknownVisiblePins.length) {
    appendFBDBlockDiagnostic(
      diagnostics,
      'FBD_UNKNOWN_VISIBLE_PIN',
      `FBD ${mnemonic} selects unknown Structure member ${unknownVisiblePins[0]}.`,
      sheetIndex
    );
    return unresolved();
  }

  const selectedPins = new Set(visiblePins);
  let inputOrder = 0;
  let outputOrder = 0;
  const ports: NormalizedFBDPort[] = members.flatMap((member, index) => {
    if (!selectedPins.has(member.name!)) return [];
    const input = index < enableOutIndex;
    return [
      {
        id: member.name!,
        label: member.name!,
        ...(member.dataType !== undefined ? { dataType: member.dataType } : {}),
        direction: input ? 'input' : 'output',
        side: input ? 'left' : 'right',
        order: input ? inputOrder++ : outputOrder++,
        visible: true,
      },
    ];
  });
  const arrays = ensureArray(node.Array).map((array) => ({
    ...(array['@_Name'] !== undefined ? { name: array['@_Name'] } : {}),
    ...(array['@_Operand'] !== undefined ? { operand: array['@_Operand'] } : {}),
  }));
  const positioned = normalizeFBDPositioned(node, 'Block', ports);
  if ('kind' in positioned) return positioned;
  const hidden = parseFBDBoolean(node['@_HideDesc']);
  return {
    kind: 'block',
    ...positioned,
    instruction: mnemonic,
    operand: node['@_Operand'],
    visiblePins,
    ports,
    arrays,
    arrayRequirements: [],
    ...(hidden !== undefined ? { hideDescription: hidden } : {}),
    ...(node['@_AutotuneTag'] !== undefined ? { autotuneTag: node['@_AutotuneTag'] } : {}),
  };
}

function appendFBDBlockDiagnostic(
  diagnostics: NormalizedFBDDiagnostic[],
  code: NormalizedFBDDiagnostic['code'],
  message: string,
  sheetIndex: number
): void {
  diagnostics.push({ code, message, severity: 'warning', sheetIndex, sourceKind: 'Block' });
}

function duplicateStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function normalizeFBDAOI(
  node: L5XFBDAOI,
  context: FBDNormalizationContext,
  diagnostics: NormalizedFBDDiagnostic[],
  sheetIndex: number
): NormalizedFBDElement {
  const visiblePinsSource = node['@_VisiblePins'];
  const visiblePins = splitTokens(visiblePinsSource);
  const bindings = ensureArray(node.InOutParameter).map((binding) => ({
    ...(binding['@_Name'] !== undefined ? { name: binding['@_Name'] } : {}),
    ...(binding['@_Argument'] !== undefined ? { argument: binding['@_Argument'] } : {}),
  }));
  const name = node['@_Name'] ?? '';
  const definition = context.aoiDefinitions.get(name);
  if (!definition) {
    diagnostics.push({
      code: 'FBD_UNKNOWN_AOI',
      message: `No AOI definition is available for ${name || '(unnamed)'}.`,
      severity: 'warning',
      sheetIndex,
      sourceKind: 'AddOnInstruction',
    });
    return {
      ...createFBDPlaceholder(
        node as L5XFBDAOI & Record<string, unknown>,
        'AddOnInstruction',
        ['unresolved-metadata'],
        []
      ),
      bindings,
    };
  }
  const portMetadata: FBDPortMetadata[] = [];
  let inputOrder = 0;
  let outputOrder = 0;
  for (const parameter of ensureArray(definition.Parameters?.Parameter)) {
    if (parameter['@_Usage'] === 'Input') {
      portMetadata.push({
        id: parameter['@_Name'],
        label: parameter['@_Name'],
        direction: 'input',
        side: 'left',
        order: inputOrder++,
        defaultVisible: parseBoolean(parameter['@_Visible']),
      });
    } else if (parameter['@_Usage'] === 'Output') {
      portMetadata.push({
        id: parameter['@_Name'],
        label: parameter['@_Name'],
        direction: 'output',
        side: 'right',
        order: outputOrder++,
        defaultVisible: parseBoolean(parameter['@_Visible']),
      });
    }
  }
  const duplicateIds = duplicatePortIds(portMetadata);
  for (const portId of duplicateIds) {
    diagnostics.push({
      code: 'FBD_DUPLICATE_PORT_ID',
      message: `AOI ${name} declares duplicate wireable parameter ${portId}.`,
      severity: 'warning',
      sheetIndex,
      sourceKind: 'AddOnInstruction',
    });
  }
  const ports = duplicateIds.length
    ? undefined
    : selectFBDPorts(
        portMetadata,
        visiblePins,
        visiblePinsSource !== undefined,
        diagnostics,
        sheetIndex,
        'AddOnInstruction',
        name
      );
  if (!ports) {
    return {
      ...createFBDPlaceholder(
        node as L5XFBDAOI & Record<string, unknown>,
        'AddOnInstruction',
        ['unresolved-metadata'],
        []
      ),
      bindings,
    };
  }
  const positioned = normalizeFBDPositioned(node, 'AddOnInstruction', ports);
  if ('kind' in positioned) return positioned;
  return {
    kind: 'add-on-instruction',
    ...positioned,
    ...(node['@_Name'] !== undefined ? { name: node['@_Name'] } : {}),
    ...(node['@_Operand'] !== undefined ? { operand: node['@_Operand'] } : {}),
    visiblePins,
    ports,
    bindings,
  };
}

function normalizeFBDFunction(
  node: Record<string, unknown>,
  context: FBDNormalizationContext,
  diagnostics: NormalizedFBDDiagnostic[],
  sheetIndex: number
): NormalizedFBDElement {
  const mnemonic = stringValue(node['@_Type']) ?? stringValue(node['@_Name']) ?? '';
  const resolution = resolveBuiltInFBDFunctionMetadata({
    mnemonic,
    softwareRevision: context.softwareRevision,
    processorType: context.processorType,
  });
  appendFBDMetadataDiagnostics(diagnostics, resolution.diagnostics, sheetIndex, 'Function');
  if (!resolution.metadata || resolution.diagnostics.length) {
    return createFBDPlaceholder(
      node,
      'Function',
      ['unsupported-semantics', 'unresolved-metadata'],
      []
    );
  }
  const visiblePinsSource = stringValue(node['@_VisiblePins']);
  const visiblePins = splitTokens(visiblePinsSource);
  const ports = selectFBDPorts(
    resolution.metadata.ports,
    visiblePins,
    node['@_VisiblePins'] !== undefined,
    diagnostics,
    sheetIndex,
    'Function',
    mnemonic
  );
  if (!ports) {
    return createFBDPlaceholder(
      node,
      'Function',
      ['unsupported-semantics', 'unresolved-metadata'],
      []
    );
  }
  const positioned = normalizeFBDPositioned(
    node as L5XFBDPositioned & Record<string, unknown>,
    'Function',
    ports
  );
  if ('kind' in positioned) return positioned;
  return { kind: 'function', instruction: mnemonic, ...positioned, ports };
}

function selectFBDPorts(
  metadata: FBDPortMetadata[],
  visiblePins: string[],
  visiblePinsDeclared: boolean,
  diagnostics: NormalizedFBDDiagnostic[],
  sheetIndex: number,
  sourceKind: string,
  mnemonic: string
): NormalizedFBDPort[] | undefined {
  const selectedIds = visiblePinsDeclared
    ? new Set(visiblePins)
    : new Set(metadata.filter((port) => port.defaultVisible).map((port) => port.id));
  const knownIds = new Set(metadata.map((port) => port.id));
  const unknownIds = [...selectedIds].filter((id) => !knownIds.has(id));
  for (const portId of unknownIds) {
    diagnostics.push({
      code: 'FBD_UNKNOWN_VISIBLE_PIN',
      message: `${sourceKind} ${mnemonic} selects unknown canonical port ${portId}.`,
      severity: 'warning',
      sheetIndex,
      sourceKind,
    });
  }
  if (unknownIds.length) return undefined;
  return metadata
    .filter((port) => selectedIds.has(port.id))
    .map((port) => ({
      id: port.id,
      label: port.label,
      direction: port.direction!,
      side: port.side!,
      order: port.order,
      defaultVisible: port.defaultVisible,
      visible: true,
    }));
}

function duplicatePortIds(ports: FBDPortMetadata[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const port of ports) {
    if (seen.has(port.id)) duplicates.add(port.id);
    seen.add(port.id);
  }
  return [...duplicates];
}

function appendFBDMetadataDiagnostics(
  target: NormalizedFBDDiagnostic[],
  source: FBDMetadataDiagnostic[],
  sheetIndex: number,
  sourceKind: string
) {
  for (const diagnostic of source) {
    target.push({
      code: diagnostic.code,
      message: diagnostic.message,
      severity: 'warning',
      sheetIndex,
      sourceKind,
    });
  }
}

function normalizeFBDRoutineControl(
  node: L5XFBDRoutineControl,
  operation: 'JSR' | 'SBR' | 'RET'
): NormalizedFBDElement {
  const positioned = normalizeFBDPositioned(node, operation, []);
  if ('kind' in positioned) return positioned;
  // Rockwell stores SBR inputs in Ret and RET returns in In because those names
  // describe the element-side connection, not the call parameter direction.
  const inputParameters = splitTokens(
    operation === 'RET' ? undefined : operation === 'SBR' ? node['@_Ret'] : node['@_In']
  );
  const returnParameters = splitTokens(
    operation === 'SBR' ? undefined : operation === 'RET' ? node['@_In'] : node['@_Ret']
  );
  return {
    kind: 'routine-control',
    operation,
    ...positioned,
    ...(node['@_Routine'] !== undefined ? { routine: node['@_Routine'] } : {}),
    inputParameters,
    returnParameters,
  };
}

function normalizeFBDTextBox(node: L5XFBDTextBox): NormalizedFBDElement {
  const positioned = normalizeFBDPositioned(node, 'TextBox', []);
  if ('kind' in positioned) return positioned;
  const text = extractFBDText(node.Text);
  return {
    kind: 'text-box',
    ...positioned,
    ...(node['@_Width'] !== undefined ? { width: node['@_Width'] } : {}),
    ...(text !== undefined ? { text } : {}),
  };
}

function normalizeFBDPositioned(
  node: L5XFBDPositioned,
  sourceKind: string,
  ports: NormalizedFBDPort[]
):
  | { id: string; position: { x: string; y: string }; verified?: boolean }
  | NormalizedFBDPlaceholder {
  const placeholder = createFBDPlaceholder(
    node as L5XFBDPositioned & Record<string, unknown>,
    sourceKind,
    [],
    ports
  );
  if (placeholder.reasonCodes.length) return placeholder;
  const verified = parseFBDBoolean(node['@_Verified']);
  return {
    id: node['@_ID']!,
    position: { x: node['@_X']!, y: node['@_Y']! },
    ...(verified !== undefined ? { verified } : {}),
  };
}

function createFBDPlaceholder(
  node: Record<string, unknown>,
  sourceKind: string,
  initialReasons: NormalizedFBDPlaceholderReason[],
  ports: NormalizedFBDPort[]
): NormalizedFBDPlaceholder {
  const id = stringValue(node['@_ID']);
  const x = stringValue(node['@_X']);
  const y = stringValue(node['@_Y']);
  const reasonCodes = [...initialReasons];
  if (id === undefined) reasonCodes.push('missing-id');
  else if (!isUnsignedLong(id)) reasonCodes.push('invalid-id');
  if (x === undefined || y === undefined) reasonCodes.push('missing-position');
  else if (!isUnsignedLong(x) || !isUnsignedLong(y)) reasonCodes.push('invalid-position');
  const position: NormalizedFBDPosition = {
    ...(x !== undefined ? { x } : {}),
    ...(y !== undefined ? { y } : {}),
  };
  return {
    kind: 'placeholder',
    sourceKind,
    ...(id !== undefined ? { id } : {}),
    ...(Object.keys(position).length ? { position } : {}),
    ports,
    reasonCodes,
  };
}

function createNonPositionedPlaceholder(
  sourceKind: string,
  reasonCodes: NormalizedFBDPlaceholderReason[]
): NormalizedFBDPlaceholder {
  return { kind: 'placeholder', sourceKind, ports: [], reasonCodes };
}

function implicitNormalizedFBDPort(direction: 'input' | 'output'): NormalizedFBDPort {
  return {
    id: 'value',
    label: 'Value',
    direction,
    side: direction === 'input' ? 'left' : 'right',
    order: 0,
    defaultVisible: true,
    visible: true,
  };
}

function implicitFBDPort(
  elements: NormalizedFBDElement[],
  id: string,
  endpoint: 'from' | 'to'
): string | undefined {
  const element = elements.find((candidate) => 'id' in candidate && candidate.id === id);
  if (!element) return undefined;
  if (
    endpoint === 'from' &&
    ((element.kind === 'reference' && element.referenceType === 'input') ||
      (element.kind === 'connector' && element.connectorType === 'input') ||
      (element.kind === 'placeholder' && ['IRef', 'ICon'].includes(element.sourceKind)))
  )
    return 'value';
  if (
    endpoint === 'to' &&
    ((element.kind === 'reference' && element.referenceType === 'output') ||
      (element.kind === 'connector' && element.connectorType === 'output') ||
      (element.kind === 'placeholder' && ['ORef', 'OCon'].includes(element.sourceKind)))
  )
    return 'value';
  return undefined;
}

function extractFBDText(value: L5XFBDTextBox['Text']): string | undefined {
  if (value === undefined || typeof value === 'string') return value;
  if (value['#cdata'] !== undefined) return value['#cdata'];
  if (value['#text'] !== undefined) return value['#text'];
  const direct = ensureArray(value.Value)[0];
  if (direct !== undefined) return direct;
  for (const localized of ensureArray(value.LocalizedText)) {
    if (typeof localized === 'string') return localized;
    if (localized['#cdata'] !== undefined) return localized['#cdata'];
    if (localized['#text'] !== undefined) return localized['#text'];
    const localizedValue = ensureArray(localized.Value)[0];
    if (localizedValue !== undefined) return localizedValue;
  }
  return undefined;
}

function parseFBDBoolean(value: string | undefined): boolean | undefined {
  if (value === undefined) return undefined;
  if (/^(true|yes|1)$/i.test(value)) return true;
  if (/^(false|no|0)$/i.test(value)) return false;
  return undefined;
}

function splitTokens(value: unknown): string[] {
  return typeof value === 'string' ? value.trim().split(/\s+/).filter(Boolean) : [];
}

function isUnsignedLong(value: string | undefined): value is string {
  if (value === undefined || !/^\d+$/.test(value)) return false;
  try {
    return BigInt(value) <= MAX_UNSIGNED_LONG;
  } catch {
    return false;
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function ensureUnknownArray(value: unknown): unknown[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

/**
 * Normalize Structured Text content
 */
function normalizeSTContent(lines: L5XLine | L5XLine[] | undefined): STLine[] {
  const lineArray = ensureArray(lines);
  return lineArray.map((line) => ({
    number: parseInt(line['@_Number'], 0),
    text: line['#cdata'] ?? line['#text'] ?? '',
  }));
}

function normalizeRungs(rungs: L5XRung | L5XRung[] | undefined): NormalizedRung[] {
  const rungArray = ensureArray(rungs);
  return rungArray.map(normalizeRung);
}

function normalizeRung(rung: L5XRung): NormalizedRung {
  // Extract the raw rung text from the Text element
  // L5X stores rung text in CDATA sections
  const rawText = extractRungText(rung.Text);
  const comment = extractText(rung.Comment);
  const rungNumber = parseInt(rung['@_Number'], 0);
  const rungType = mapRungType(rung['@_Type']);

  // Parse the rung text using the existing parser
  // The rung text format is identical between JSON and L5X exports
  let elements: NormalizedRung['elements'] = [];
  let instructions: NormalizedRung['instructions'] = [];
  let diagnostics: NonNullable<NormalizedRung['diagnostics']> = [];

  if (rawText && rawText.trim()) {
    try {
      const parsed = parseRungDetailed(rawText);
      elements = parsed.elements;
      instructions = parsed.instructions;
      diagnostics = parsed.diagnostics;
    } catch {
      // If parsing fails, keep empty arrays
      // This can happen with malformed rung text
    }
  }

  return {
    number: rungNumber,
    comment,
    raw: rawText,
    elements,
    instructions,
    diagnostics,
    type: rungType,
  };
}

/**
 * Extract rung text from L5X Text element
 * Handles CDATA and various text formats
 */
function extractRungText(
  text: { '#text'?: string; '#cdata'?: string } | string | undefined
): string {
  if (text === undefined) return '';
  if (typeof text === 'string') return text;
  // Check for CDATA content first (most L5X files use CDATA for rung text)
  if (text['#cdata']) return text['#cdata'];
  // Then check for regular text
  if (text['#text']) return text['#text'];
  return '';
}

/**
 * Map L5X rung types to normalized types
 */
function mapRungType(type: L5XRungType): NormalizedRung['type'] {
  const typeMap: Record<L5XRungType, NormalizedRung['type']> = {
    N: 'Normal',
    E: 'Empty',
    D: 'Delete',
    I: 'Insert',
    ID: 'InsertDirect',
    R: 'Replace',
    RD: 'ReplaceDirect',
  };
  return typeMap[type] || 'Normal';
}

// ============================================
// Add-On Instructions
// ============================================

function normalizeAOIs(
  aois: L5XAddOnInstruction | L5XAddOnInstruction[] | undefined,
  fbdContext: FBDNormalizationContext
): NormalizedAOI[] {
  const aoiArray = ensureArray(aois);
  return aoiArray.map((aoi) => normalizeAOI(aoi, fbdContext));
}

function normalizeAOI(
  aoi: L5XAddOnInstruction,
  fbdContext: FBDNormalizationContext
): NormalizedAOI {
  const classMap: Record<string, AOIClass> = {
    Standard: 'Standard',
    Safety: 'Safety',
  };
  const aoiFBDContext: FBDNormalizationContext = {
    ...fbdContext,
    blockOperandScopes: [createFBDLocalTagOperandScope(aoi.LocalTags?.LocalTag)],
  };

  return {
    // Identification
    name: aoi['@_Name'],
    description: extractText(aoi.Description),
    revision: aoi['@_Revision'],
    revisionExtension: aoi['@_RevisionExtension'],
    vendor: aoi['@_Vendor'] || aoi['@_CreatedBy'],

    // Classification
    class: classMap[aoi['@_Class'] || 'Standard'] || 'Standard',

    // Timestamps
    createdDate: parseDate(aoi['@_CreatedDate']),
    createdBy: aoi['@_CreatedBy'],
    editedDate: parseDate(aoi['@_EditedDate']),
    editedBy: aoi['@_EditedBy'],

    // Documentation
    revisionNote: extractText(aoi.RevisionNote),
    helpText: extractText(aoi.AdditionalHelpText),

    // Execution options
    executePrescan: parseBoolean(aoi['@_ExecutePrescan']),
    executePostscan: parseBoolean(aoi['@_ExecutePostscan']),
    executeEnableInFalse: parseBoolean(aoi['@_ExecuteEnableInFalse']),

    // Interface definition
    parameters: normalizeAOIParameters(aoi.Parameters?.Parameter),
    localTags: normalizeAOILocalTags(aoi.LocalTags?.LocalTag),

    // Implementation
    routines: normalizeRoutines(aoi.Routines, aoiFBDContext),
  };
}

function normalizeAOIParameters(params: L5XParameter | L5XParameter[] | undefined): AOIParameter[] {
  const paramArray = ensureArray(params);
  return paramArray.map(normalizeAOIParameter);
}

function normalizeAOIParameter(param: L5XParameter): AOIParameter {
  const usageMap: Record<string, AOIParameterUsage> = {
    Input: 'Input',
    Output: 'Output',
    InOut: 'InOut',
  };

  return {
    name: param['@_Name'],
    tagType: param['@_TagType'] || 'Base',
    dataType: param['@_DataType'],
    usage: usageMap[param['@_Usage']] || 'Input',
    radix: param['@_Radix'],
    dimensions: parseIntegerList(param['@_Dimensions']),
    required: parseBoolean(param['@_Required']),
    visible: parseBoolean(param['@_Visible']),
    ...(param['@_Constant'] !== undefined ? { constant: parseOptionalBoolean(param['@_Constant']) } : {}),
    externalAccess: normalizeExternalAccess(param['@_ExternalAccess']),
    description: extractText(param.Description),
    ...(param.Comments !== undefined ? { comments: normalizeTagComments(param.Comments.Comment) } : {}),
    ...(param.DefaultData !== undefined ? { defaultData: ensureArray(param.DefaultData).map(normalizeTagData) } : {}),
    defaultValue: extractDefaultValue(param.DefaultData),
  };
}

function normalizeAOILocalTags(tags: L5XLocalTag | L5XLocalTag[] | undefined): AOILocalTag[] {
  const tagArray = ensureArray(tags);
  return tagArray.map(normalizeAOILocalTag);
}

function normalizeAOILocalTag(tag: L5XLocalTag): AOILocalTag {
  return {
    name: tag['@_Name'],
    dataType: tag['@_DataType'],
    radix: tag['@_Radix'],
    externalAccess: normalizeExternalAccess(tag['@_ExternalAccess']),
    description: extractText(tag.Description),
    ...(tag.Comments !== undefined ? { comments: normalizeTagComments(tag.Comments.Comment) } : {}),
    ...(tag.DefaultData !== undefined ? { defaultData: ensureArray(tag.DefaultData).map(normalizeTagData) } : {}),
    defaultValue: extractDefaultValue(tag.DefaultData),
    ...(tag['@_Dimensions'] !== undefined ? { dimensions: parseIntegerList(tag['@_Dimensions']) } : {}),
  };
}

function extractDefaultValue(defaultData: L5XTagData | string | (L5XTagData | string)[] | undefined): unknown {
  if (!defaultData) return undefined;

  const dataArray = ensureArray(defaultData);
  // The decorated representation is authoritative. A composite value has no
  // scalar shortcut; callers use defaultData for its typed recursive tree.
  for (const data of dataArray.filter((entry): entry is L5XTagData => typeof entry !== 'string' && entry['@_Format'] === 'Decorated')) {
    if (data.Array !== undefined || data.Structure !== undefined) return undefined;
    const values = ensureArray(data.DataValue);
    if (values.length === 1) {
      const value = values[0]['@_Value'];
      if (value !== undefined) return parseScalarDefault(value);
    }
  }
  for (const format of ['L5K', 'String']) {
    for (const data of dataArray.filter((entry): entry is L5XTagData => typeof entry !== 'string' && entry['@_Format'] === format)) {
      const text = extractNodeText(data)?.trim();
      if (text) return parseScalarDefault(text);
    }
  }
  return undefined;
}

function parseScalarDefault(value: string): number | string {
  if (value === '') return value;
  const number = Number(value);
  return Number.isFinite(number) ? number : value;
}

// ============================================
// Modules
// ============================================

function normalizeModules(modules: L5XModules | undefined): NormalizedModule[] {
  if (!modules) return [];

  const moduleArray = ensureArray(modules.Module);
  const containerUsage = modules['@_Use'] as ModuleUsage | undefined;

  return moduleArray.map((mod, index) => normalizeModule(mod, index, containerUsage));
}

function normalizeModule(
  module: L5XModule,
  index: number,
  containerUsage?: ModuleUsage
): NormalizedModule {
  // Module's own usage takes precedence over container usage
  const moduleUsage = (module['@_Use'] as ModuleUsage | undefined) || containerUsage;
  const catalogNumber = module['@_CatalogNumber'];

  return {
    // Identification
    id: index,
    name: module['@_Name'],
    catalogNumber,
    description: extractText(module.Description),

    // Vendor/Product Info
    vendorId: module['@_Vendor'] ? parseInt(module['@_Vendor'], undefined) : undefined,
    productType: module['@_ProductType'] ? parseInt(module['@_ProductType'], undefined) : undefined,
    productCode: module['@_ProductCode'] ? parseInt(module['@_ProductCode'], undefined) : undefined,
    majorRevision: module['@_Major'] ? parseInt(module['@_Major'], undefined) : undefined,
    minorRevision: module['@_Minor'] ? parseInt(module['@_Minor'], undefined) : undefined,

    // Classification
    category: deriveModuleCategory(catalogNumber),

    // Hierarchy
    parentId: undefined, // Would need to resolve from ParentModule name in a second pass
    parentModuleName: module['@_ParentModule'],
    parentPortId: module['@_ParentModPortId']
      ? parseInt(module['@_ParentModPortId'], undefined)
      : undefined,
    slot: extractSlotFromPorts(module.Ports),

    // Configuration
    inhibited: parseBoolean(module['@_Inhibited']),
    majorFault: parseBoolean(module['@_MajorFault']),
    safetyEnabled: parseBoolean(module['@_SafetyEnabled']),
    eKeyState: normalizeEKeyState(module.EKey),

    // Ports
    ports: normalizePorts(module.Ports),

    // Connections
    connections: normalizeConnections(module.Communications),

    // Metadata
    comments: catalogNumber ? [catalogNumber] : undefined,
    usage: moduleUsage,
  };
}

/**
 * Normalize electronic keying state
 */
function normalizeEKeyState(ekey: L5XModule['EKey']): NormalizedModule['eKeyState'] {
  if (!ekey) return undefined;

  const state = ekey['@_State'];
  if (state === 'ExactMatch' || state === 'CompatibleModule' || state === 'Disabled') {
    return state;
  }
  return undefined;
}

/**
 * Normalize module ports
 */
function normalizePorts(ports: L5XModule['Ports']): ModulePort[] {
  if (!ports) return [];

  const portArray = ensureArray(ports.Port);
  return portArray.map((port) => ({
    id: parseInt(port['@_Id'], 0),
    type: mapPortType(port['@_Type']),
    address: port['@_Address'],
    upstream: parseBoolean(port['@_Upstream']),
    busSize: port.Bus?.['@_Size'] ? parseInt(port.Bus['@_Size'], undefined) : undefined,
  }));
}

/**
 * Map L5X port type to normalized port type
 */
function mapPortType(type: string | undefined): PortType {
  if (!type) return 'Unknown';

  const typeUpper = type.toUpperCase();
  if (typeUpper.includes('ETHERNET') || typeUpper === 'ENET') return 'Ethernet';
  if (typeUpper.includes('BACKPLANE') || typeUpper === 'ICP') return 'Backplane';
  if (typeUpper.includes('POINTIO') || typeUpper === 'COMPACT') return 'PointIO';
  if (typeUpper.includes('SERIAL') || typeUpper === 'RS232') return 'Serial';
  if (typeUpper.includes('USB')) return 'USB';

  return 'Unknown';
}

/**
 * Extract slot number from port configurations
 * Typically the slot is the address of a backplane/ICP port
 */
function extractSlotFromPorts(ports: L5XModule['Ports']): number | undefined {
  if (!ports) return undefined;

  const portArray = ensureArray(ports.Port);

  // Look for backplane/ICP port with an address
  for (const port of portArray) {
    const type = port['@_Type']?.toUpperCase() || '';
    if ((type.includes('BACKPLANE') || type === 'ICP') && port['@_Address']) {
      const slot = parseInt(port['@_Address'], undefined);
      if (!isNaN(slot)) return slot;
    }
  }

  return undefined;
}

/**
 * Normalize module connections
 */
function normalizeConnections(communications: L5XModule['Communications']): ModuleConnection[] {
  if (!communications?.Connections) return [];

  const connectionArray = ensureArray(communications.Connections.Connection);
  return connectionArray.map((conn) => ({
    name: conn['@_Name'],
    rpiMicroseconds: conn['@_RPI'] ? parseInt(conn['@_RPI'], undefined) : undefined,
    type: conn['@_Type'],
    inputDataType: conn.InputTag?.['@_DataType'],
    outputDataType: conn.OutputTag?.['@_DataType'],
    unicast: conn['@_Unicast'] ? parseBoolean(conn['@_Unicast']) : undefined,
  }));
}

/**
 * Derive module category from catalog number
 * Uses Rockwell naming conventions to classify modules
 */
function deriveModuleCategory(catalogNumber: string | undefined): ModuleCategory {
  if (!catalogNumber) return 'Unknown';

  const cat = catalogNumber.toUpperCase();

  // ControlLogix/CompactLogix processors
  if (
    cat.includes('-L') &&
    (cat.includes('55') ||
      cat.includes('61') ||
      cat.includes('62') ||
      cat.includes('63') ||
      cat.includes('64') ||
      cat.includes('71') ||
      cat.includes('72') ||
      cat.includes('73') ||
      cat.includes('74') ||
      cat.includes('75') ||
      cat.includes('80') ||
      cat.includes('81') ||
      cat.includes('82') ||
      cat.includes('83') ||
      cat.includes('85'))
  ) {
    return 'Processor';
  }

  // Communication modules
  if (
    cat.includes('-EN') ||
    cat.includes('-CN') ||
    cat.includes('-DN') ||
    cat.includes('-DHRIO') ||
    cat.includes('-RIO') ||
    cat.includes('-NET')
  ) {
    return 'Communication';
  }

  // Safety modules
  if (
    cat.includes('/A') ||
    cat.includes('/B') ||
    cat.includes('SAFETY') ||
    (cat.includes('-S') && !cat.includes('-SC'))
  ) {
    return 'Safety';
  }

  // Motion modules
  if (cat.includes('-M0') || cat.includes('-M1') || cat.includes('-M2') || cat.includes('-HM')) {
    return 'Motion';
  }

  // Digital I/O
  if (cat.includes('-IB') || cat.includes('-IA') || cat.includes('-IG')) {
    return 'DigitalInput';
  }
  if (cat.includes('-OB') || cat.includes('-OA') || cat.includes('-OW') || cat.includes('-OG')) {
    return 'DigitalOutput';
  }
  if (cat.includes('-IQ') && cat.includes('O')) {
    return 'DigitalCombo';
  }
  if (cat.includes('-IQ') || cat.includes('-IV')) {
    return 'DigitalInput';
  }
  if (cat.includes('-OQ') || cat.includes('-OV')) {
    return 'DigitalOutput';
  }

  // Analog I/O
  if (cat.includes('-IF') || cat.includes('-IR') || cat.includes('-IT') || cat.includes('-IH')) {
    return 'AnalogInput';
  }
  if (cat.includes('-OF') || cat.includes('-OE')) {
    return 'AnalogOutput';
  }
  if (cat.includes('-COMBO')) {
    return 'AnalogCombo';
  }

  // Chassis
  if (
    cat.includes('-A') &&
    (cat.includes('4') ||
      cat.includes('7') ||
      cat.includes('10') ||
      cat.includes('13') ||
      cat.includes('17'))
  ) {
    return 'Chassis';
  }

  // Specialty (thermocouple, RTD, weighing, etc.)
  if (cat.includes('-TC') || cat.includes('-RTB') || cat.includes('-WS')) {
    return 'Specialty';
  }

  return 'Unknown';
}
