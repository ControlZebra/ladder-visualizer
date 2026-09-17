import type {
  NormalizedController,
  PlcDocument,
  PlcResource,
  PlcResourceData,
  PlcResourceRole,
  PlcExportTarget,
  ParsedXmlValue,
  PlcVendorFragment,
} from '../../types/normalized';
import type { L5XContent } from './l5x-types';
import { createParseError, type ParseError } from '../parse-error';

type Node = Record<string, unknown>;
const rootPath = '/RSLogix5000Content';
const targetKinds: Record<PlcExportTarget, PlcResource['kind']> = {
  Controller: 'controller',
  Program: 'program',
  Routine: 'routine',
  Rung: 'rung',
  Tag: 'tag',
  DataType: 'dataType',
  AddOnInstructionDefinition: 'aoi',
  Module: 'module',
};
export const L5X_TARGET_TYPES = Object.keys(targetKinds);
export class L5XDocumentError extends Error {
  constructor(readonly issue: ParseError) {
    super(issue.message);
  }
}
function targetError(message: string, code: string, attribute = 'TargetName'): never {
  throw new L5XDocumentError(
    createParseError(message, { code, location: { path: `${rootPath}/@${attribute}` } })
  );
}
function node(value: unknown): Node {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Node)
    : {};
}
function array(value: unknown): unknown[] {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}
function role(value: unknown): PlcResourceRole | undefined {
  return value === 'Target'
    ? 'target'
    : value === 'Context'
      ? 'context'
      : value === 'Reference'
        ? 'reference'
        : undefined;
}

/** Build resource wrappers over the same finalized objects used by compatibility callers. */
export function l5xToDocument(xml: L5XContent, controller: NormalizedController): PlcDocument {
  const root = xml.RSLogix5000Content;
  const doc: PlcDocument = {
    source: {
      format: 'l5x',
      schemaRevision: root['@_SchemaRevision'],
      softwareRevision: root['@_SoftwareRevision'],
      targetType: root['@_TargetType'],
      targetName: root['@_TargetName'],
      ...(root['@_TargetCount'] !== undefined ? { targetCount: root['@_TargetCount'] } : {}),
      ...(root['@_ContainsContext'] !== undefined
        ? { containsContext: root['@_ContainsContext'] === 'true' }
        : {}),
    },
    resources: [],
    targetIds: [],
    fragments: [],
    mappings: [],
  };
  const explicitRoles = new Map<string, PlcResourceRole>();
  const resourceNodes = new Map<string, Node>();

  function add<K extends keyof PlcResourceData>(
    kind: K,
    value: unknown,
    data: PlcResourceData[K],
    path: string,
    ownerId?: string,
    containerUse?: unknown
  ) {
    const source = node(value);
    const explicit = role(source['@_Use'] ?? containerUse);
    if (explicit) explicitRoles.set(path, explicit);
    resourceNodes.set(path, source);
    doc.resources.push({
      kind,
      data,
      id: path,
      sourcePath: path,
      ownerId,
      role: explicit ?? 'context',
    } as PlcResource);
    const collection = <C extends keyof PlcResourceData>(
      container: string,
      element: string,
      childKind: C,
      normalized: PlcResourceData[C][]
    ) => {
      const wrapper = node(source[container]);
      const ordinary = array(wrapper[element]);
      ordinary.forEach((item, index) => {
        if (normalized[index])
          add(
            childKind,
            item,
            normalized[index],
            `${path}/${container}[1]/${element}[${index + 1}]`,
            path,
            wrapper['@_Use']
          );
      });
      if (childKind === 'routine') {
        array(wrapper.EncodedData).forEach((item, index) => {
          const data = normalized[ordinary.length + index];
          if (data)
            add(
              childKind,
              item,
              data,
              `${path}/${container}[1]/EncodedData[${index + 1}]`,
              path,
              wrapper['@_Use']
            );
        });
      }
    };
    if (kind === 'controller') {
      const c = data as NormalizedController;
      collection('DataTypes', 'DataType', 'dataType', c.dataTypes);
      collection('Modules', 'Module', 'module', c.modules);
      collection('AddOnInstructionDefinitions', 'AddOnInstructionDefinition', 'aoi', c.aois);
      collection('Tags', 'Tag', 'tag', c.tags);
      collection('Programs', 'Program', 'program', c.programs);
    } else if (kind === 'program') {
      const p = data as PlcResourceData['program'];
      collection('Tags', 'Tag', 'tag', p.tags);
      collection('Routines', 'Routine', 'routine', p.routines);
    } else if (kind === 'aoi') {
      collection('Routines', 'Routine', 'routine', (data as PlcResourceData['aoi']).routines);
    } else if (kind === 'routine') {
      const routine = data as PlcResourceData['routine'];
      let rungIndex = 0;
      array(source.RLLContent).forEach((body, bodyIndex) => {
        array(node(body).Rung).forEach((rung, index) => {
          const normalized = routine.rungs[rungIndex++];
          if (normalized)
            add(
              'rung',
              rung,
              normalized,
              `${path}/RLLContent[${bodyIndex + 1}]/Rung[${index + 1}]`,
              path,
              node(body)['@_Use']
            );
        });
      });
    }
  }
  add('controller', root.Controller, controller, `${rootPath}/Controller[1]`);
  const candidates = doc.resources.filter((r) => r.kind === targetKinds[doc.source.targetType]);
  const eligible = candidates.filter(
    (r) => !explicitRoles.has(r.id) || explicitRoles.get(r.id) === 'target'
  );
  let selected = eligible.filter((r) => explicitRoles.get(r.id) === 'target');
  if (!selected.length) {
    selected =
      doc.source.containsContext === false
        ? eligible
        : eligible.filter((r) => resourceNodes.get(r.id)?.['@_Name'] === doc.source.targetName);
    if (!selected.length && eligible.length === 1) selected = eligible;
    if (
      selected.length > 1 &&
      doc.source.containsContext !== false &&
      doc.source.targetCount !== String(selected.length)
    ) {
      targetError(
        'More than one resource matches the export target. Supply an unambiguous export.',
        'AMBIGUOUS_L5X_TARGET'
      );
    }
  }
  if (!selected.length) {
    targetError(
      eligible.length
        ? 'The export target cannot be selected unambiguously.'
        : 'The declared export target is absent.',
      eligible.length ? 'AMBIGUOUS_L5X_TARGET' : 'MISSING_L5X_TARGET'
    );
  }
  if (
    doc.source.targetCount !== undefined &&
    (!/^\d+$/.test(doc.source.targetCount) ||
      BigInt(doc.source.targetCount) !== BigInt(selected.length))
  ) {
    targetError(
      'TargetCount does not match the selected export resources.',
      'INVALID_FIELD_TYPE',
      'TargetCount'
    );
  }
  doc.targetIds = selected.map((r) => r.id);
  const selectedIds = new Set(doc.targetIds);
  const roles = new Map<string, PlcResourceRole>();
  for (const resource of doc.resources) {
    resource.role = selectedIds.has(resource.id)
      ? 'target'
      : (explicitRoles.get(resource.id) ??
        (resource.ownerId ? roles.get(resource.ownerId) : undefined) ??
        'context');
    // A component export's controller is the containing envelope, not the selected component.
    if (resource.kind === 'controller' && doc.source.targetType !== 'Controller')
      resource.role = 'context';
    roles.set(resource.id, resource.role);
  }
  accountSource(doc, node(root));
  return doc;
}

/** Only claim leaves whose concrete normalized destination exists. Everything else survives. */
function accountSource(doc: PlcDocument, root: Node): void {
  const byPath = new Map(doc.resources.map((r) => [r.sourcePath, r]));
  const rootAttributes: Record<string, string> = {
    SchemaRevision: 'schemaRevision',
    SoftwareRevision: 'softwareRevision',
    TargetName: 'targetName',
    TargetType: 'targetType',
    TargetCount: 'targetCount',
    ContainsContext: 'containsContext',
  };
  const attributes: Partial<Record<PlcResource['kind'], Record<string, string>>> = {
    controller: { Name: 'name', ProjectSN: 'serialNumber' },
    program: {
      Name: 'name',
      MainRoutineName: 'mainRoutineName',
      FaultRoutineName: 'faultRoutineName',
      Disabled: 'disabled',
    },
    routine: { Name: 'name', Type: 'type' },
    rung: { Number: 'number', Type: 'type' },
    tag: {
      Name: 'name',
      TagType: 'tagType',
      DataType: 'dataType',
      Radix: 'radix',
      AliasFor: 'aliasFor',
      ExternalAccess: 'externalAccess',
    },
    dataType: { Name: 'name', Class: 'class' },
    aoi: {
      Name: 'name',
      Class: 'class',
      Revision: 'revision',
      RevisionExtension: 'revisionExtension',
      Vendor: 'vendor',
    },
    module: {
      Name: 'name',
      CatalogNumber: 'catalogNumber',
      ParentModule: 'parentModuleName',
      ParentModPortId: 'parentPortId',
    },
  };
  const children: Record<string, string[]> = {
    RSLogix5000Content: ['Controller'],
    Controller: ['DataTypes', 'Modules', 'AddOnInstructionDefinitions', 'Tags', 'Programs'],
    DataTypes: ['DataType'],
    Modules: ['Module'],
    AddOnInstructionDefinitions: ['AddOnInstructionDefinition'],
    Tags: ['Tag'],
    Programs: ['Program'],
    Program: ['Tags', 'Routines'],
    AddOnInstructionDefinition: ['Routines'],
    Routines: ['Routine'],
    Routine: ['RLLContent', 'STContent'],
    RLLContent: ['Rung'],
    STContent: ['Line'],
    Module: ['Communications'],
    Communications: ['Connections'],
    Connections: ['Connection'],
  };
  const representationElements = new Set([
    'Description',
    'Comment',
    'Members',
    'Ports',
    'EKey',
    'Parameters',
    'LocalTags',
    'InputTag',
    'OutputTag',
  ]);
  function preserve(value: unknown, path: string, reason: PlcVendorFragment['reason']) {
    doc.fragments.push({ path, reason, value: value as ParsedXmlValue });
  }
  function mapping(
    value: unknown,
    sourcePath: string,
    field: string | undefined,
    resource?: PlcResource
  ): boolean {
    if (!field) return false;
    const target = resource?.data ?? doc.source;
    const destination = field
      .split('.')
      .reduce<unknown>(
        (item, key) => (item != null ? (item as Record<string, unknown>)[key] : undefined),
        target
      );
    if (destination === undefined || typeof value === 'object') return false;
    // Do not let a normalizer's fallback silently consume an unknown source value.
    const translated: Record<string, string> = {
      'Read/Write': 'ReadWrite',
      'Read Only': 'ReadOnly',
      Standard: 'BuiltIn',
      ProductDefined: 'BuiltIn',
      N: 'Normal',
      E: 'Empty',
      D: 'Delete',
      I: 'Insert',
      ID: 'InsertDirect',
      R: 'Replace',
      RD: 'ReplaceDirect',
    };
    const equivalent =
      destination === value ||
      (typeof destination === 'string' && translated[String(value)] === destination) ||
      (typeof destination === 'boolean' &&
        typeof value === 'string' &&
        /^(true|false)$/i.test(value) &&
        (value.toLowerCase() === 'true') === destination) ||
      (typeof destination === 'number' &&
        Number.isSafeInteger(destination) &&
        Number(value) === destination);
    if (!equivalent) return false;
    doc.mappings.push({ sourcePath, ...(resource ? { resourceId: resource.id } : {}), field });
    return true;
  }
  function text(value: unknown, path: string, field: string, resource: PlcResource) {
    if (typeof value === 'string') {
      if (!mapping(value, path, field, resource)) preserve(value, path, 'source-representation');
    } else {
      const entries = Object.entries(node(value));
      if (entries.length !== 1 || !['#text', '#cdata'].includes(entries[0][0])) {
        preserve(value, path, 'source-representation');
      } else {
        const [key, child] = entries[0];
        if (!mapping(child, `${path}/${key}`, field, resource))
          preserve(value, path, 'source-representation');
      }
    }
  }
  const lineIndices = new Map<string, number>();
  function walk(value: unknown, path: string, element: string, owner?: PlcResource) {
    const resource = byPath.get(path);
    const currentOwner = resource ?? owner;
    if (typeof value === 'string') {
      // An empty collection/body is still represented as an inspectable source fragment.
      preserve(value, path, 'source-representation');
      return;
    }
    const source = node(value);
    for (const [key, child] of Object.entries(source)) {
      if (key.startsWith('@_')) {
        const name = key.slice(2);
        const attrPath = `${path}/@${name}`;
        const field =
          path === rootPath
            ? rootAttributes[name]
            : resource
              ? attributes[resource.kind]?.[name]
              : undefined;
        if (!mapping(child, attrPath, field, resource))
          preserve(child, attrPath, 'source-representation');
      } else if (key.startsWith('#')) {
        preserve(child, `${path}/${key}`, 'source-representation');
      } else {
        array(child).forEach((item, index) => {
          const childPath = `${path}/${key}[${index + 1}]`;
          if (
            resource &&
            (key === 'Description' ||
              key === 'Comment' ||
              (resource.kind === 'rung' && key === 'Text'))
          ) {
            text(
              item,
              childPath,
              key === 'Text' ? 'raw' : key === 'Comment' ? 'comment' : 'description',
              resource
            );
          } else if (
            element === 'STContent' &&
            key === 'Line' &&
            currentOwner?.kind === 'routine'
          ) {
            const lineIndex = lineIndices.get(currentOwner.id) ?? 0;
            lineIndices.set(currentOwner.id, lineIndex + 1);
            const prefix = `stContent.${lineIndex}`;
            for (const [lineKey, lineValue] of Object.entries(node(item))) {
              const linePath = `${childPath}/${lineKey.startsWith('@_') ? '@' + lineKey.slice(2) : lineKey}`;
              const field =
                lineKey === '@_Number'
                  ? `${prefix}.number`
                  : lineKey === '#text'
                    ? `${prefix}.text`
                    : undefined;
              if (!mapping(lineValue, linePath, field, currentOwner))
                preserve(lineValue, linePath, 'source-representation');
            }
            if (typeof item === 'string') preserve(item, childPath, 'source-representation');
          } else if (children[element]?.includes(key)) {
            walk(item, childPath, key, currentOwner);
          } else {
            const protectedContent = ['ExternalContent', 'EncodedData', 'EncryptedData'].includes(
              key
            );
            preserve(
              item,
              childPath,
              protectedContent
                ? 'protected'
                : representationElements.has(key)
                  ? 'source-representation'
                  : 'unmodeled'
            );
          }
        });
      }
    }
  }
  walk(root, rootPath, 'RSLogix5000Content');
}
