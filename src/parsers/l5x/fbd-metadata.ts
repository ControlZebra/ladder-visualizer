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

export interface FBDMetadataResolution {
  metadata?: FBDInstructionMetadata;
  diagnostics: FBDMetadataDiagnostic[];
}

const supportedVersions = [33, 34, 35];
const allControllers: FBDControllerFamily[] = ['all'];
const functionControllers: FBDControllerFamily[] = [
  'compactlogix-5380',
  'compactlogix-5480',
  'controllogix-5580',
  'compact-guardlogix-5380',
  'guardlogix-5580',
];

function label(id: string): string {
  const special: Record<string, string> = {
    FF: 'Feed Forward',
    FB0: 'Feedback 0',
    FB1: 'Feedback 1',
    PV: 'PV',
    SP: 'SP',
    CVEU: 'CVEU',
  };
  return special[id] ?? id.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
}

function input(id: string, order: number, defaultVisible = true): FBDPortMetadata {
  return { id, label: label(id), direction: 'input', side: 'left', order, defaultVisible };
}

function output(id: string, order: number, defaultVisible = true): FBDPortMetadata {
  return { id, label: label(id), direction: 'output', side: 'right', order, defaultVisible };
}

function block(
  mnemonic: string,
  inputs: Array<[string, boolean?]>,
  outputs: Array<[string, boolean?]>,
  arrays: FBDArrayRequirement[] = []
): FBDInstructionMetadata {
  return {
    mnemonic,
    forms: ['block'],
    softwareMajorVersions: [...supportedVersions],
    controllerFamilies: [...allControllers],
    ports: [
      ...inputs.map(([id, visible], order) => input(id, order, visible ?? true)),
      ...outputs.map(([id, visible], order) => output(id, order, visible ?? true)),
    ],
    arrays,
  };
}

function fbdFunction(mnemonic: string, source: FBDInstructionMetadata): FBDInstructionMetadata {
  return {
    mnemonic,
    forms: ['function'],
    softwareMajorVersions: [...supportedVersions],
    controllerFamilies: [...functionControllers],
    ports: source.ports.map((port) => ({ ...port, defaultVisible: true })),
    arrays: [],
  };
}

const add = block(
  'ADD',
  [['SourceA'], ['SourceB']],
  [['Dest']]
);
const dedt = block(
  'DEDT',
  [['In'], ['Deadtime', false], ['Gain', false], ['Bias', false]],
  [['Out'], ['DeadtimeInv', false]],
  [{ id: 'StorageArray', label: 'Storage Array', order: 0, required: true }]
);
const hll = block(
  'HLL',
  [['In'], ['HighLimit', false], ['LowLimit', false]],
  [['Out'], ['HighAlarm'], ['LowAlarm']]
);
const ldlg = block(
  'LDLG',
  [['In'], ['Lead', false], ['Lag', false], ['Gain', false], ['Bias', false]],
  [['Out']]
);
const mul = block(
  'MUL',
  [['SourceA'], ['SourceB', false]],
  [['Dest']]
);
const pide = block(
  'PIDE',
  [
    ['PV'],
    ['SPProg'],
    ['SPCascade'],
    ['RatioProg'],
    ['CVProg'],
    ['FF'],
    ['HandFB'],
    ['ProgProgReq'],
    ['ProgOperReq'],
    ['ProgCasRatReq'],
    ['ProgAutoReq'],
    ['ProgManualReq'],
    ['ProgOverrideReq'],
    ['ProgHandReq'],
  ],
  [
    ['CVEU'],
    ['SP'],
    ['PVHHAlarm'],
    ['PVHAlarm'],
    ['PVLAlarm'],
    ['PVLLAlarm'],
    ['PVROCPosAlarm'],
    ['PVROCNegAlarm'],
    ['DevHHAlarm'],
    ['DevHAlarm'],
    ['DevLAlarm'],
    ['DevLLAlarm'],
    ['ProgOper'],
    ['CasRat'],
    ['Auto'],
    ['Manual'],
    ['Override'],
    ['Hand'],
  ]
);
const sub = block(
  'SUB',
  [['SourceA'], ['SourceB']],
  [['Dest']]
);
const d2sd = block(
  'D2SD',
  [
    ['ProgCommand'],
    ['State0Perm'],
    ['State1Perm'],
    ['FB0'],
    ['FB1'],
    ['HandFB'],
    ['ProgProgReq'],
    ['ProgOperReq'],
    ['ProgOverrideReq'],
    ['ProgHandReq'],
  ],
  [
    ['Out'],
    ['Device0State'],
    ['Device1State'],
    ['CommandStatus'],
    ['FaultAlarm'],
    ['ModeAlarm'],
    ['ProgOper'],
    ['Override'],
    ['Hand'],
  ]
);
const grt = block(
  'GRT',
  [['SourceA'], ['SourceB']],
  [['Dest']]
);

/** Canonical FBD metadata. Deliberately independent from the RLL instruction registry. */
export const FBD_INSTRUCTION_METADATA: readonly FBDInstructionMetadata[] = [
  add,
  dedt,
  hll,
  ldlg,
  mul,
  pide,
  sub,
  d2sd,
  grt,
  fbdFunction('ADD', add),
  fbdFunction('MUL', mul),
  fbdFunction('SUB', sub),
  fbdFunction('GRT', grt),
];

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

export function resolveBuiltInFBDInstructionMetadata(
  request: FBDMetadataRequest
): FBDMetadataResolution {
  return resolveFBDInstructionMetadata(FBD_INSTRUCTION_METADATA, request);
}
