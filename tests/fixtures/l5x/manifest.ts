export const L5X_COMPATIBILITY_MATRIX_VERSION = '1.0.0';

export const L5X_PROFILE_IDS = [
  'rockwell-controller-rll',
  'rockwell-program-rll',
  'rockwell-routine-rll',
  'rockwell-rung-rll',
  'rockwell-tags',
  'rockwell-full-project',
] as const;

export type L5XProfileId = (typeof L5X_PROFILE_IDS)[number];
export type L5XParseStatus = 'complete' | 'partial' | 'failed';

export type L5XArtifactKind =
  | 'controller'
  | 'program'
  | 'routine'
  | 'rung'
  | 'tag-set'
  | 'data-type'
  | 'add-on-instruction'
  | 'module'
  | 'unsupported-language'
  | 'protected-content'
  | 'malformed-input'
  | 'adversarial-input';

export interface L5XSourceCounts {
  controllers: number;
  dataTypes: number;
  tags: number;
  programs: number;
  routines: number;
  rungs: number;
  aois: number;
  modules: number;
  fbdSheets: number;
  sfcSteps: number;
}

export interface L5XNormalizedCounts {
  dataTypes: number;
  controllerTags: number;
  programTags: number;
  programs: number;
  routines: number;
  rungs: number;
  aois: number;
  modules: number;
}

interface L5XCurrentParserSuccess {
  success: true;
  normalizedCounts: L5XNormalizedCounts;
}

interface L5XCurrentParserFailure {
  success: false;
  errorCode: string;
  normalizedCounts: null;
}

export interface L5XFixture {
  id: string;
  file: string;
  studio5000Version: string;
  targetType: string;
  artifactKind: L5XArtifactKind;
  profiles: readonly L5XProfileId[];
  expectedParseStatus: L5XParseStatus;
  sourceCounts: L5XSourceCounts;
  currentParser: L5XCurrentParserSuccess | L5XCurrentParserFailure;
  coverage: readonly string[];
}

const emptySourceCounts: L5XSourceCounts = {
  controllers: 0,
  dataTypes: 0,
  tags: 0,
  programs: 0,
  routines: 0,
  rungs: 0,
  aois: 0,
  modules: 0,
  fbdSheets: 0,
  sfcSteps: 0,
};

const emptyNormalizedCounts: L5XNormalizedCounts = {
  dataTypes: 0,
  controllerTags: 0,
  programTags: 0,
  programs: 0,
  routines: 0,
  rungs: 0,
  aois: 0,
  modules: 0,
};

export const L5X_FIXTURES: readonly L5XFixture[] = [
  {
    id: 'controller-rll-v35',
    file: 'controller-rll-v35.L5X',
    studio5000Version: '35.01',
    targetType: 'Controller',
    artifactKind: 'controller',
    profiles: ['rockwell-controller-rll', 'rockwell-tags'],
    expectedParseStatus: 'complete',
    sourceCounts: {
      ...emptySourceCounts,
      controllers: 1,
      dataTypes: 1,
      tags: 2,
      programs: 1,
      routines: 2,
      rungs: 3,
      aois: 1,
      modules: 1,
    },
    currentParser: {
      success: true,
      normalizedCounts: {
        dataTypes: 1,
        controllerTags: 1,
        programTags: 1,
        programs: 1,
        routines: 2,
        rungs: 3,
        aois: 1,
        modules: 1,
      },
    },
    coverage: ['controller', 'RLL', 'tag', 'UDT', 'AOI', 'module'],
  },
  {
    id: 'program-rll-v34',
    file: 'program-rll-v34.L5X',
    studio5000Version: '34.01',
    targetType: 'Program',
    artifactKind: 'program',
    profiles: ['rockwell-program-rll', 'rockwell-tags'],
    expectedParseStatus: 'complete',
    sourceCounts: {
      ...emptySourceCounts,
      controllers: 1,
      tags: 1,
      programs: 1,
      routines: 1,
      rungs: 2,
    },
    currentParser: {
      success: true,
      normalizedCounts: {
        ...emptyNormalizedCounts,
        programTags: 1,
        programs: 1,
        routines: 1,
        rungs: 2,
      },
    },
    coverage: ['program export', 'program tag', 'RLL'],
  },
  {
    id: 'routine-rll-v33',
    file: 'routine-rll-v33.L5X',
    studio5000Version: '33.00',
    targetType: 'Routine',
    artifactKind: 'routine',
    profiles: ['rockwell-routine-rll'],
    expectedParseStatus: 'complete',
    sourceCounts: { ...emptySourceCounts, controllers: 1, programs: 1, routines: 1, rungs: 1 },
    currentParser: {
      success: true,
      normalizedCounts: { ...emptyNormalizedCounts, programs: 1, routines: 1, rungs: 1 },
    },
    coverage: ['routine export', 'RLL'],
  },
  {
    id: 'rung-rll-v33',
    file: 'rung-rll-v33.L5X',
    studio5000Version: '33.00',
    targetType: 'Rung',
    artifactKind: 'rung',
    profiles: ['rockwell-rung-rll'],
    expectedParseStatus: 'failed',
    sourceCounts: { ...emptySourceCounts, controllers: 1, programs: 1, routines: 1, rungs: 1 },
    currentParser: { success: false, errorCode: 'INVALID_FIELD_TYPE', normalizedCounts: null },
    coverage: ['rung export', 'branch'],
  },
  {
    id: 'tags-v34',
    file: 'tags-v34.L5X',
    studio5000Version: '34.01',
    targetType: 'Tag',
    artifactKind: 'tag-set',
    profiles: ['rockwell-tags'],
    expectedParseStatus: 'failed',
    sourceCounts: { ...emptySourceCounts, controllers: 1, tags: 2 },
    currentParser: { success: false, errorCode: 'INVALID_FIELD_TYPE', normalizedCounts: null },
    coverage: ['tag export', 'scalar tag', 'alias tag'],
  },
  {
    id: 'datatype-v35',
    file: 'datatype-v35.L5X',
    studio5000Version: '35.01',
    targetType: 'DataType',
    artifactKind: 'data-type',
    profiles: ['rockwell-tags'],
    expectedParseStatus: 'failed',
    sourceCounts: { ...emptySourceCounts, controllers: 1, dataTypes: 1 },
    currentParser: { success: false, errorCode: 'INVALID_FIELD_TYPE', normalizedCounts: null },
    coverage: ['UDT export', 'UDT members'],
  },
  {
    id: 'aoi-v35',
    file: 'aoi-v35.L5X',
    studio5000Version: '35.01',
    targetType: 'AddOnInstructionDefinition',
    artifactKind: 'add-on-instruction',
    profiles: ['rockwell-controller-rll'],
    expectedParseStatus: 'complete',
    sourceCounts: { ...emptySourceCounts, controllers: 1, routines: 1, rungs: 1, aois: 1 },
    currentParser: {
      success: true,
      normalizedCounts: { ...emptyNormalizedCounts, routines: 1, rungs: 1, aois: 1 },
    },
    coverage: ['AOI export', 'AOI parameter', 'AOI local tag', 'AOI RLL'],
  },
  {
    id: 'module-v35',
    file: 'module-v35.L5X',
    studio5000Version: '35.01',
    targetType: 'Module',
    artifactKind: 'module',
    profiles: ['rockwell-controller-rll'],
    expectedParseStatus: 'failed',
    sourceCounts: { ...emptySourceCounts, controllers: 1, modules: 1 },
    currentParser: { success: false, errorCode: 'INVALID_FIELD_TYPE', normalizedCounts: null },
    coverage: ['module export', 'module port'],
  },
  {
    id: 'fbd-v35',
    file: 'fbd-v35.L5X',
    studio5000Version: '35.01',
    targetType: 'Program',
    artifactKind: 'unsupported-language',
    profiles: ['rockwell-full-project'],
    expectedParseStatus: 'partial',
    sourceCounts: { ...emptySourceCounts, controllers: 1, programs: 1, routines: 1, fbdSheets: 1 },
    currentParser: {
      success: true,
      normalizedCounts: { ...emptyNormalizedCounts, programs: 1, routines: 1 },
    },
    coverage: ['unsupported FBD body'],
  },
  {
    id: 'sfc-v35',
    file: 'sfc-v35.L5X',
    studio5000Version: '35.01',
    targetType: 'Program',
    artifactKind: 'unsupported-language',
    profiles: ['rockwell-full-project'],
    expectedParseStatus: 'partial',
    sourceCounts: { ...emptySourceCounts, controllers: 1, programs: 1, routines: 1, sfcSteps: 2 },
    currentParser: {
      success: true,
      normalizedCounts: { ...emptyNormalizedCounts, programs: 1, routines: 1 },
    },
    coverage: ['unsupported SFC body'],
  },
  {
    id: 'protected-routine-v35',
    file: 'protected-routine-v35.L5X',
    studio5000Version: '35.01',
    targetType: 'Program',
    artifactKind: 'protected-content',
    profiles: ['rockwell-full-project'],
    expectedParseStatus: 'partial',
    sourceCounts: { ...emptySourceCounts, controllers: 1, programs: 1, routines: 1 },
    currentParser: {
      success: true,
      normalizedCounts: { ...emptyNormalizedCounts, programs: 1, routines: 1 },
    },
    coverage: ['protected routine'],
  },
  {
    id: 'malformed-truncated-v35',
    file: 'malformed-truncated-v35.L5X',
    studio5000Version: '35.01',
    targetType: 'Controller',
    artifactKind: 'malformed-input',
    profiles: ['rockwell-full-project'],
    expectedParseStatus: 'failed',
    sourceCounts: { ...emptySourceCounts, controllers: 1, programs: 1 },
    currentParser: { success: false, errorCode: 'INVALID_XML', normalizedCounts: null },
    coverage: ['truncated XML', 'malformed input'],
  },
  {
    id: 'malformed-mismatched-v34',
    file: 'malformed-mismatched-v34.L5X',
    studio5000Version: '34.01',
    targetType: 'Controller',
    artifactKind: 'malformed-input',
    profiles: ['rockwell-full-project'],
    expectedParseStatus: 'failed',
    sourceCounts: { ...emptySourceCounts, controllers: 1 },
    currentParser: { success: false, errorCode: 'INVALID_XML', normalizedCounts: null },
    coverage: ['mismatched XML', 'malformed input'],
  },
  {
    id: 'adversarial-doctype-v35',
    file: 'adversarial-doctype-v35.L5X',
    studio5000Version: '35.01',
    targetType: 'Controller',
    artifactKind: 'adversarial-input',
    profiles: ['rockwell-full-project'],
    expectedParseStatus: 'failed',
    sourceCounts: { ...emptySourceCounts, controllers: 1 },
    currentParser: { success: true, normalizedCounts: emptyNormalizedCounts },
    coverage: ['entity declaration', 'adversarial input'],
  },
];
