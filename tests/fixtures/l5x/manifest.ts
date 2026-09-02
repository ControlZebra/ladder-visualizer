export type L5XParseStatus = 'complete' | 'partial' | 'failed';

export interface L5XEntityCounts {
  dataTypes: number;
  controllerTags: number;
  programTags: number;
  programs: number;
  routines: number;
  rungs: number;
  aois: number;
  modules: number;
}

export interface L5XFixture {
  id: string;
  file: string;
  studio5000Version: string;
  exportTarget: 'Controller' | 'Program' | 'Routine' | 'AddOnInstructionDefinition';
  profiles: readonly string[];
  expectedProductionStatus: L5XParseStatus;
  expectedLegacySuccess: boolean;
  expectedCounts?: L5XEntityCounts;
  expectedErrorCode?: string;
  coverage: readonly string[];
}

export const L5X_FIXTURES: readonly L5XFixture[] = [
  {
    id: 'controller-rll-v35', file: 'controller-rll-v35.L5X', studio5000Version: '35.01', exportTarget: 'Controller',
    profiles: ['rockwell-controller-rll', 'rockwell-tags'], expectedProductionStatus: 'complete', expectedLegacySuccess: true,
    expectedCounts: { dataTypes: 1, controllerTags: 1, programTags: 1, programs: 1, routines: 2, rungs: 2, aois: 1, modules: 1 },
    coverage: ['controller', 'program', 'RLL', 'tag', 'UDT', 'AOI', 'module'],
  },
  {
    id: 'program-rll-v34', file: 'program-rll-v34.L5X', studio5000Version: '34.01', exportTarget: 'Program',
    profiles: ['rockwell-program-rll', 'rockwell-tags'], expectedProductionStatus: 'complete', expectedLegacySuccess: true,
    expectedCounts: { dataTypes: 0, controllerTags: 0, programTags: 1, programs: 1, routines: 1, rungs: 1, aois: 0, modules: 0 },
    coverage: ['program export', 'program tag', 'RLL'],
  },
  {
    id: 'routine-rll-v33', file: 'routine-rll-v33.L5X', studio5000Version: '33.00', exportTarget: 'Routine',
    profiles: ['rockwell-routine-rll'], expectedProductionStatus: 'complete', expectedLegacySuccess: true,
    expectedCounts: { dataTypes: 0, controllerTags: 0, programTags: 0, programs: 1, routines: 1, rungs: 1, aois: 0, modules: 0 },
    coverage: ['routine export', 'RLL'],
  },
  {
    id: 'rung-rll-v33', file: 'rung-rll-v33.L5X', studio5000Version: '33.00', exportTarget: 'Routine',
    profiles: ['rockwell-rung-rll'], expectedProductionStatus: 'complete', expectedLegacySuccess: true,
    expectedCounts: { dataTypes: 0, controllerTags: 0, programTags: 0, programs: 1, routines: 1, rungs: 1, aois: 0, modules: 0 },
    coverage: ['rung export', 'branch'],
  },
  {
    id: 'tag-v34', file: 'tag-v34.L5X', studio5000Version: '34.01', exportTarget: 'Controller',
    profiles: ['rockwell-tags'], expectedProductionStatus: 'complete', expectedLegacySuccess: true,
    expectedCounts: { dataTypes: 0, controllerTags: 2, programTags: 0, programs: 0, routines: 0, rungs: 0, aois: 0, modules: 0 },
    coverage: ['scalar tag', 'alias tag'],
  },
  {
    id: 'udt-v35', file: 'udt-v35.L5X', studio5000Version: '35.01', exportTarget: 'Controller',
    profiles: ['rockwell-tags'], expectedProductionStatus: 'complete', expectedLegacySuccess: true,
    expectedCounts: { dataTypes: 1, controllerTags: 0, programTags: 0, programs: 0, routines: 0, rungs: 0, aois: 0, modules: 0 },
    coverage: ['UDT', 'UDT members'],
  },
  {
    id: 'aoi-v35', file: 'aoi-v35.L5X', studio5000Version: '35.01', exportTarget: 'AddOnInstructionDefinition',
    profiles: ['rockwell-controller-rll'], expectedProductionStatus: 'complete', expectedLegacySuccess: true,
    expectedCounts: { dataTypes: 0, controllerTags: 0, programTags: 0, programs: 0, routines: 1, rungs: 1, aois: 1, modules: 0 },
    coverage: ['AOI export', 'AOI parameters', 'AOI local tags', 'AOI RLL'],
  },
  {
    id: 'module-v35', file: 'module-v35.L5X', studio5000Version: '35.01', exportTarget: 'Controller',
    profiles: ['rockwell-controller-rll'], expectedProductionStatus: 'complete', expectedLegacySuccess: true,
    expectedCounts: { dataTypes: 0, controllerTags: 0, programTags: 0, programs: 0, routines: 0, rungs: 0, aois: 0, modules: 1 },
    coverage: ['module', 'module port'],
  },
  {
    id: 'fbd-v35', file: 'fbd-v35.L5X', studio5000Version: '35.01', exportTarget: 'Program',
    profiles: ['rockwell-full-project'], expectedProductionStatus: 'partial', expectedLegacySuccess: true,
    expectedCounts: { dataTypes: 0, controllerTags: 0, programTags: 0, programs: 1, routines: 1, rungs: 0, aois: 0, modules: 0 },
    coverage: ['unsupported FBD body'],
  },
  {
    id: 'sfc-v35', file: 'sfc-v35.L5X', studio5000Version: '35.01', exportTarget: 'Program',
    profiles: ['rockwell-full-project'], expectedProductionStatus: 'partial', expectedLegacySuccess: true,
    expectedCounts: { dataTypes: 0, controllerTags: 0, programTags: 0, programs: 1, routines: 1, rungs: 0, aois: 0, modules: 0 },
    coverage: ['unsupported SFC body'],
  },
  {
    id: 'protected-routine-v35', file: 'protected-routine-v35.L5X', studio5000Version: '35.01', exportTarget: 'Program',
    profiles: ['rockwell-full-project'], expectedProductionStatus: 'partial', expectedLegacySuccess: true,
    expectedCounts: { dataTypes: 0, controllerTags: 0, programTags: 0, programs: 1, routines: 1, rungs: 0, aois: 0, modules: 0 },
    coverage: ['protected routine'],
  },
  {
    id: 'malformed-truncated-v35', file: 'malformed-truncated-v35.L5X', studio5000Version: '35.01', exportTarget: 'Controller',
    profiles: [], expectedProductionStatus: 'failed', expectedLegacySuccess: false, expectedErrorCode: 'INVALID_XML', coverage: ['truncated XML', 'adversarial input'],
  },
  {
    id: 'malformed-entity-v35', file: 'malformed-entity-v35.L5X', studio5000Version: '35.01', exportTarget: 'Controller',
    profiles: [], expectedProductionStatus: 'failed', expectedLegacySuccess: true,
    expectedCounts: { dataTypes: 0, controllerTags: 0, programTags: 0, programs: 0, routines: 0, rungs: 0, aois: 0, modules: 0 },
    coverage: ['undeclared entity', 'adversarial input'],
  },
];
