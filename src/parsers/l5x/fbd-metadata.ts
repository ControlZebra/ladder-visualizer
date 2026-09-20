export type FBDInstructionForm = 'block' | 'function';
export type FBDPortDirection = 'input' | 'output';
export type FBDPortSide = 'left' | 'right';
export type FBDControllerFamily =
  | 'all'
  | 'compactlogix-5380'
  | 'compactlogix-5480'
  | 'controllogix-5580'
  | 'compact-guardlogix-5380'
  | 'guardlogix-5580';

export interface FBDPortMetadata {
  id: string;
  label: string;
  direction?: FBDPortDirection;
  side?: FBDPortSide;
  order: number;
  defaultVisible: boolean;
}

/** @deprecated Block array requirements are no longer catalog-driven. */
export interface FBDArrayRequirement {
  id: string;
  label: string;
  order: number;
  required: boolean;
}

export interface FBDInstructionMetadata {
  mnemonic: string;
  forms: FBDInstructionForm[];
  softwareMajorVersions: number[];
  controllerFamilies: FBDControllerFamily[];
  ports: FBDPortMetadata[];
  arrays: FBDArrayRequirement[];
}

export type FBDMetadataDiagnosticCode =
  | 'FBD_UNKNOWN_INSTRUCTION'
  | 'FBD_UNSUPPORTED_INSTRUCTION_CONTEXT'
  | 'FBD_DUPLICATE_PORT_ID'
  | 'FBD_UNRESOLVED_PORT_METADATA';

export interface FBDMetadataDiagnostic {
  code: FBDMetadataDiagnosticCode;
  message: string;
  portId?: string;
}

export interface FBDMetadataRequest {
  mnemonic: string;
  form: FBDInstructionForm;
  softwareRevision?: string;
  processorType?: string;
}

export type FBDFunctionMetadataRequest = Omit<FBDMetadataRequest, 'form'>;

export interface FBDMetadataResolution {
  metadata?: FBDInstructionMetadata;
  diagnostics: FBDMetadataDiagnostic[];
}

const supportedVersions = Array.from({ length: 19 }, (_, index) => index + 17);
const functionControllers: FBDControllerFamily[] = [
  'compactlogix-5380',
  'compactlogix-5480',
  'controllogix-5580',
  'compact-guardlogix-5380',
  'guardlogix-5580',
];

function input(id: string, order: number): FBDPortMetadata {
  return { id, label: id, direction: 'input', side: 'left', order, defaultVisible: true };
}

function output(id: string, order: number): FBDPortMetadata {
  return { id, label: id, direction: 'output', side: 'right', order, defaultVisible: true };
}

function fbdFunction(
  mnemonic: string,
  inputs: string[],
  outputs: string[]
): FBDInstructionMetadata {
  return {
    mnemonic,
    forms: ['function'],
    softwareMajorVersions: [...supportedVersions],
    controllerFamilies: [...functionControllers],
    ports: [
      ...inputs.map((id, order) => input(id, order)),
      ...outputs.map((id, order) => output(id, order)),
    ],
    arrays: [],
  };
}

/** Built-in metadata retained only for Function elements. Block ports are source-derived. */
export const FBD_FUNCTION_METADATA: readonly FBDInstructionMetadata[] = [
  fbdFunction('ADD', ['SourceA', 'SourceB'], ['Dest']),
  fbdFunction('MUL', ['SourceA', 'SourceB'], ['Dest']),
  fbdFunction('SUB', ['SourceA', 'SourceB'], ['Dest']),
  fbdFunction('GRT', ['SourceA', 'SourceB'], ['Dest']),
];

/** @deprecated Use FBD_FUNCTION_METADATA. Block metadata is no longer catalog-driven. */
export const FBD_INSTRUCTION_METADATA = FBD_FUNCTION_METADATA;

function softwareMajor(revision: string | undefined): number | undefined {
  const match = revision?.match(/^(\d+)/);
  return match ? Number(match[1]) : undefined;
}

function controllerFamily(processorType: string | undefined): FBDControllerFamily | undefined {
  if (!processorType) return undefined;
  if (/^1756-L8/i.test(processorType)) {
    return /S/i.test(processorType) ? 'guardlogix-5580' : 'controllogix-5580';
  }
  if (/^5069-L4/i.test(processorType)) return 'compactlogix-5480';
  if (/^5069-L3/i.test(processorType)) {
    return /S/i.test(processorType) ? 'compact-guardlogix-5380' : 'compactlogix-5380';
  }
  return undefined;
}

function validatePorts(metadata: FBDInstructionMetadata): FBDMetadataDiagnostic[] {
  const diagnostics: FBDMetadataDiagnostic[] = [];
  const seen = new Set<string>();
  for (const port of metadata.ports) {
    if (seen.has(port.id)) {
      diagnostics.push({
        code: 'FBD_DUPLICATE_PORT_ID',
        message: `${metadata.mnemonic} metadata declares duplicate port ID ${port.id}.`,
        portId: port.id,
      });
    }
    seen.add(port.id);
    const directionMatchesSide =
      (port.direction === 'input' && port.side === 'left') ||
      (port.direction === 'output' && port.side === 'right');
    if (!port.direction || !port.side || !directionMatchesSide) {
      diagnostics.push({
        code: 'FBD_UNRESOLVED_PORT_METADATA',
        message: `${metadata.mnemonic} port ${port.id} has no usable direction and side.`,
        portId: port.id,
      });
    }
  }
  return diagnostics;
}

/** @deprecated Use resolveBuiltInFBDFunctionMetadata for the built-in Function catalog. */
export function resolveFBDInstructionMetadata(
  catalog: readonly FBDInstructionMetadata[],
  request: FBDMetadataRequest
): FBDMetadataResolution {
  const mnemonic = request.mnemonic.toUpperCase();
  const mnemonicEntries = catalog.filter((entry) => entry.mnemonic.toUpperCase() === mnemonic);
  if (!mnemonicEntries.length) {
    return {
      diagnostics: [
        {
          code: 'FBD_UNKNOWN_INSTRUCTION',
          message: `No FBD metadata is available for ${mnemonic}.`,
        },
      ],
    };
  }

  const major = softwareMajor(request.softwareRevision);
  const family = controllerFamily(request.processorType);
  const metadata = mnemonicEntries.find(
    (entry) =>
      entry.forms.includes(request.form) &&
      major !== undefined &&
      entry.softwareMajorVersions.includes(major) &&
      (entry.controllerFamilies.includes('all') ||
        (family !== undefined && entry.controllerFamilies.includes(family)))
  );
  if (!metadata) {
    return {
      diagnostics: [
        {
          code: 'FBD_UNSUPPORTED_INSTRUCTION_CONTEXT',
          message: `${mnemonic} has no ${request.form} metadata for software ${request.softwareRevision ?? '(unknown)'} and controller ${request.processorType ?? '(unknown)'}.`,
        },
      ],
    };
  }
  return { metadata, diagnostics: validatePorts(metadata) };
}

export function resolveBuiltInFBDFunctionMetadata(
  request: FBDFunctionMetadataRequest
): FBDMetadataResolution {
  return resolveFBDInstructionMetadata(FBD_FUNCTION_METADATA, { ...request, form: 'function' });
}

/** @deprecated Use resolveBuiltInFBDFunctionMetadata. */
export function resolveBuiltInFBDInstructionMetadata(
  request: FBDMetadataRequest
): FBDMetadataResolution {
  return resolveFBDInstructionMetadata(FBD_INSTRUCTION_METADATA, request);
}
