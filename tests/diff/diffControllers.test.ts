import { describe, it, expect } from 'vitest';
import { diffControllers } from '../../src/diff/diffControllers';
import type {
  NormalizedController,
  NormalizedProgram,
  NormalizedRoutine,
  NormalizedRung,
  NormalizedTag,
  NormalizedDataType,
  NormalizedAOI,
  NormalizedModule,
} from '../../src/types';

// ============================================================================
// Helpers — create minimal valid normalized entities
// ============================================================================

function makeController(overrides: Partial<NormalizedController> = {}): NormalizedController {
  return {
    name: 'TestController',
    dataTypes: [],
    tags: [],
    programs: [],
    aois: [],
    modules: [],
    ...overrides,
  };
}

function makeProgram(name: string, overrides: Partial<NormalizedProgram> = {}): NormalizedProgram {
  return {
    name,
    tags: [],
    routines: [],
    ...overrides,
  };
}

function makeRoutine(name: string, overrides: Partial<NormalizedRoutine> = {}): NormalizedRoutine {
  return {
    name,
    type: 'RLL',
    rungs: [],
    ...overrides,
  };
}

function makeRung(number: number, raw: string, comment?: string): NormalizedRung {
  return {
    number,
    raw,
    comment,
    elements: [],
    instructions: [],
  };
}

function makeTag(name: string, overrides: Partial<NormalizedTag> = {}): NormalizedTag {
  return {
    name,
    tagType: 'Base',
    dataType: 'DINT',
    scope: 'Controller',
    ...overrides,
  };
}

function makeDataType(name: string, overrides: Partial<NormalizedDataType> = {}): NormalizedDataType {
  return {
    name,
    class: 'User',
    members: [],
    ...overrides,
  };
}

function makeAOI(name: string, overrides: Partial<NormalizedAOI> = {}): NormalizedAOI {
  return {
    name,
    class: 'Standard',
    executePrescan: false,
    executePostscan: false,
    executeEnableInFalse: false,
    parameters: [],
    localTags: [],
    routines: [],
    ...overrides,
  };
}

function makeModule(id: number, name: string, overrides: Partial<NormalizedModule> = {}): NormalizedModule {
  return {
    id,
    name,
    inhibited: false,
    majorFault: false,
    safetyEnabled: false,
    ports: [],
    connections: [],
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('diffControllers', () => {
  describe('identical controllers', () => {
    it('should produce zero changes for identical controllers', () => {
      const ctrl = makeController({
        programs: [makeProgram('Main', { routines: [makeRoutine('MainRoutine')] })],
        tags: [makeTag('Sensor1')],
      });

      const diff = diffControllers(ctrl, ctrl);

      expect(diff.summary.totalChanges).toBe(0);
      expect(diff.programs).toHaveLength(0);
      expect(diff.tags).toHaveLength(0);
      expect(diff.dataTypes).toHaveLength(0);
      expect(diff.aois).toHaveLength(0);
      expect(diff.modules).toHaveLength(0);
    });

    it('should produce zero changes for empty controllers', () => {
      const diff = diffControllers(makeController(), makeController());
      expect(diff.summary.totalChanges).toBe(0);
    });
  });

  describe('controller info changes', () => {
    it('should detect controller name change', () => {
      const old = makeController({ name: 'OldName' });
      const nu = makeController({ name: 'NewName' });

      const diff = diffControllers(old, nu);

      expect(diff.controllerInfo.changes).toHaveLength(1);
      expect(diff.controllerInfo.changes[0]).toEqual({
        property: 'name',
        oldValue: 'OldName',
        newValue: 'NewName',
      });
    });

    it('should detect description change', () => {
      const old = makeController({ description: 'old desc' });
      const nu = makeController({ description: 'new desc' });

      const diff = diffControllers(old, nu);

      expect(diff.controllerInfo.changes.find((c) => c.property === 'description')).toBeDefined();
    });
  });

  describe('program changes', () => {
    it('should detect added program', () => {
      const old = makeController({ programs: [] });
      const nu = makeController({ programs: [makeProgram('NewProg')] });

      const diff = diffControllers(old, nu);

      expect(diff.programs).toHaveLength(1);
      expect(diff.programs[0].kind).toBe('added');
      expect(diff.programs[0].name).toBe('NewProg');
      expect(diff.summary.programs.added).toBe(1);
    });

    it('should detect removed program', () => {
      const old = makeController({ programs: [makeProgram('OldProg')] });
      const nu = makeController({ programs: [] });

      const diff = diffControllers(old, nu);

      expect(diff.programs).toHaveLength(1);
      expect(diff.programs[0].kind).toBe('removed');
      expect(diff.programs[0].name).toBe('OldProg');
      expect(diff.summary.programs.removed).toBe(1);
    });

    it('should detect modified program (description change)', () => {
      const old = makeController({
        programs: [makeProgram('Main', { description: 'old' })],
      });
      const nu = makeController({
        programs: [makeProgram('Main', { description: 'new' })],
      });

      const diff = diffControllers(old, nu);

      expect(diff.programs).toHaveLength(1);
      expect(diff.programs[0].kind).toBe('modified');
      expect(diff.programs[0].propertyChanges).toContainEqual({
        property: 'description',
        oldValue: 'old',
        newValue: 'new',
      });
    });
  });

  describe('routine changes', () => {
    it('should detect added routine within a program', () => {
      const old = makeController({
        programs: [makeProgram('Main', { routines: [] })],
      });
      const nu = makeController({
        programs: [makeProgram('Main', { routines: [makeRoutine('NewRoutine')] })],
      });

      const diff = diffControllers(old, nu);

      expect(diff.programs).toHaveLength(1);
      expect(diff.programs[0].kind).toBe('modified');
      expect(diff.programs[0].routineDiffs).toHaveLength(1);
      expect(diff.programs[0].routineDiffs[0].kind).toBe('added');
      expect(diff.programs[0].routineDiffs[0].name).toBe('NewRoutine');
    });

    it('should detect removed routine', () => {
      const old = makeController({
        programs: [makeProgram('Main', { routines: [makeRoutine('OldRoutine')] })],
      });
      const nu = makeController({
        programs: [makeProgram('Main', { routines: [] })],
      });

      const diff = diffControllers(old, nu);

      expect(diff.programs[0].routineDiffs).toHaveLength(1);
      expect(diff.programs[0].routineDiffs[0].kind).toBe('removed');
    });
  });

  describe('rung changes (RLL)', () => {
    it('should detect added rung', () => {
      const old = makeController({
        programs: [makeProgram('Main', {
          routines: [makeRoutine('MainRoutine', {
            rungs: [makeRung(0, 'XIC(Tag1)OTE(Tag2)')],
          })],
        })],
      });
      const nu = makeController({
        programs: [makeProgram('Main', {
          routines: [makeRoutine('MainRoutine', {
            rungs: [
              makeRung(0, 'XIC(Tag1)OTE(Tag2)'),
              makeRung(1, 'XIC(Tag3)OTE(Tag4)'),
            ],
          })],
        })],
      });

      const diff = diffControllers(old, nu);

      const routineDiff = diff.programs[0].routineDiffs[0];
      expect(routineDiff.rungDiffs).toHaveLength(1);
      expect(routineDiff.rungDiffs![0].kind).toBe('added');
      expect(routineDiff.rungDiffs![0].rungNumber).toBe(1);
      expect(routineDiff.summary?.rungsAdded).toBe(1);
    });

    it('should detect modified rung (raw text changed)', () => {
      const old = makeController({
        programs: [makeProgram('Main', {
          routines: [makeRoutine('MainRoutine', {
            rungs: [makeRung(0, 'XIC(Tag1)OTE(Tag2)')],
          })],
        })],
      });
      const nu = makeController({
        programs: [makeProgram('Main', {
          routines: [makeRoutine('MainRoutine', {
            rungs: [makeRung(0, 'XIC(Tag1)OTE(Tag99)')],
          })],
        })],
      });

      const diff = diffControllers(old, nu);

      const routineDiff = diff.programs[0].routineDiffs[0];
      expect(routineDiff.rungDiffs).toHaveLength(1);
      expect(routineDiff.rungDiffs![0].kind).toBe('modified');
      expect(routineDiff.rungDiffs![0].oldRung?.raw).toBe('XIC(Tag1)OTE(Tag2)');
      expect(routineDiff.rungDiffs![0].newRung?.raw).toBe('XIC(Tag1)OTE(Tag99)');
    });

    it('should detect removed rung', () => {
      const old = makeController({
        programs: [makeProgram('Main', {
          routines: [makeRoutine('MainRoutine', {
            rungs: [makeRung(0, 'rung0'), makeRung(1, 'rung1')],
          })],
        })],
      });
      const nu = makeController({
        programs: [makeProgram('Main', {
          routines: [makeRoutine('MainRoutine', {
            rungs: [makeRung(0, 'rung0')],
          })],
        })],
      });

      const diff = diffControllers(old, nu);

      const routineDiff = diff.programs[0].routineDiffs[0];
      expect(routineDiff.rungDiffs).toHaveLength(1);
      expect(routineDiff.rungDiffs![0].kind).toBe('removed');
      expect(routineDiff.rungDiffs![0].rungNumber).toBe(1);
    });

    it('should detect rung comment change', () => {
      const old = makeController({
        programs: [makeProgram('Main', {
          routines: [makeRoutine('MainRoutine', {
            rungs: [makeRung(0, 'XIC(A)OTE(B)', 'Old comment')],
          })],
        })],
      });
      const nu = makeController({
        programs: [makeProgram('Main', {
          routines: [makeRoutine('MainRoutine', {
            rungs: [makeRung(0, 'XIC(A)OTE(B)', 'New comment')],
          })],
        })],
      });

      const diff = diffControllers(old, nu);

      const routineDiff = diff.programs[0].routineDiffs[0];
      expect(routineDiff.rungDiffs).toHaveLength(1);
      expect(routineDiff.rungDiffs![0].kind).toBe('modified');
      expect(routineDiff.rungDiffs![0].propertyChanges).toContainEqual({
        property: 'comment',
        oldValue: 'Old comment',
        newValue: 'New comment',
      });
    });

    it('should not report unchanged rungs', () => {
      const rungs = [makeRung(0, 'rung0'), makeRung(1, 'rung1'), makeRung(2, 'rung2')];
      const old = makeController({
        programs: [makeProgram('Main', {
          routines: [makeRoutine('MainRoutine', { rungs })],
        })],
      });

      const diff = diffControllers(old, old);

      expect(diff.programs).toHaveLength(0);
      expect(diff.summary.rungs.modified).toBe(0);
    });
  });

  describe('structured text changes', () => {
    it('should detect ST routine content change', () => {
      const old = makeController({
        programs: [makeProgram('Main', {
          routines: [makeRoutine('STRoutine', {
            type: 'ST',
            rungs: [],
            stContent: [
              { number: 0, text: 'x := 1;' },
              { number: 1, text: 'y := 2;' },
            ],
          })],
        })],
      });
      const nu = makeController({
        programs: [makeProgram('Main', {
          routines: [makeRoutine('STRoutine', {
            type: 'ST',
            rungs: [],
            stContent: [
              { number: 0, text: 'x := 1;' },
              { number: 1, text: 'y := 99;' },
            ],
          })],
        })],
      });

      const diff = diffControllers(old, nu);

      const routineDiff = diff.programs[0].routineDiffs[0];
      expect(routineDiff.stDiff).toBeDefined();
      expect(routineDiff.stDiff!.oldText).toBe('x := 1;\ny := 2;');
      expect(routineDiff.stDiff!.newText).toBe('x := 1;\ny := 99;');
    });
  });

  describe('tag changes', () => {
    it('should detect added controller tag', () => {
      const old = makeController({ tags: [] });
      const nu = makeController({ tags: [makeTag('NewTag')] });

      const diff = diffControllers(old, nu);

      expect(diff.tags).toHaveLength(1);
      expect(diff.tags[0].kind).toBe('added');
      expect(diff.tags[0].name).toBe('NewTag');
    });

    it('should detect removed controller tag', () => {
      const old = makeController({ tags: [makeTag('OldTag')] });
      const nu = makeController({ tags: [] });

      const diff = diffControllers(old, nu);

      expect(diff.tags).toHaveLength(1);
      expect(diff.tags[0].kind).toBe('removed');
    });

    it('should detect modified tag (dataType change)', () => {
      const old = makeController({ tags: [makeTag('Sensor1', { dataType: 'DINT' })] });
      const nu = makeController({ tags: [makeTag('Sensor1', { dataType: 'REAL' })] });

      const diff = diffControllers(old, nu);

      expect(diff.tags).toHaveLength(1);
      expect(diff.tags[0].kind).toBe('modified');
      expect(diff.tags[0].propertyChanges).toContainEqual({
        property: 'dataType',
        oldValue: 'DINT',
        newValue: 'REAL',
      });
    });

    it('should detect modified tag (value change)', () => {
      const old = makeController({ tags: [makeTag('Counter1', { value: 0 })] });
      const nu = makeController({ tags: [makeTag('Counter1', { value: 42 })] });

      const diff = diffControllers(old, nu);

      expect(diff.tags).toHaveLength(1);
      expect(diff.tags[0].kind).toBe('modified');
      expect(diff.tags[0].propertyChanges).toContainEqual({
        property: 'value',
        oldValue: 0,
        newValue: 42,
      });
    });

    it('should not report unchanged tags', () => {
      const tags = [makeTag('Sensor1'), makeTag('Sensor2')];
      const diff = diffControllers(
        makeController({ tags }),
        makeController({ tags }),
      );

      expect(diff.tags).toHaveLength(0);
    });
  });

  describe('data type changes', () => {
    it('should detect added data type', () => {
      const old = makeController({ dataTypes: [] });
      const nu = makeController({ dataTypes: [makeDataType('MyUDT')] });

      const diff = diffControllers(old, nu);

      expect(diff.dataTypes).toHaveLength(1);
      expect(diff.dataTypes[0].kind).toBe('added');
      expect(diff.dataTypes[0].name).toBe('MyUDT');
    });

    it('should detect member changes within a data type', () => {
      const old = makeController({
        dataTypes: [makeDataType('MyUDT', {
          members: [
            { name: 'Field1', dataType: 'DINT', dimension: 0 },
            { name: 'Field2', dataType: 'BOOL', dimension: 0 },
          ],
        })],
      });
      const nu = makeController({
        dataTypes: [makeDataType('MyUDT', {
          members: [
            { name: 'Field1', dataType: 'REAL', dimension: 0 }, // changed type
            { name: 'Field2', dataType: 'BOOL', dimension: 0 },
            { name: 'Field3', dataType: 'STRING', dimension: 0 }, // added
          ],
        })],
      });

      const diff = diffControllers(old, nu);

      expect(diff.dataTypes).toHaveLength(1);
      expect(diff.dataTypes[0].kind).toBe('modified');

      const memberDiffs = diff.dataTypes[0].memberDiffs;
      expect(memberDiffs).toHaveLength(2); // Field1 modified + Field3 added

      const field1 = memberDiffs.find((m) => m.name === 'Field1');
      expect(field1?.kind).toBe('modified');
      expect(field1?.propertyChanges).toContainEqual({
        property: 'dataType',
        oldValue: 'DINT',
        newValue: 'REAL',
      });

      const field3 = memberDiffs.find((m) => m.name === 'Field3');
      expect(field3?.kind).toBe('added');
    });
  });

  describe('AOI changes', () => {
    it('should detect added AOI', () => {
      const old = makeController({ aois: [] });
      const nu = makeController({ aois: [makeAOI('MyAOI')] });

      const diff = diffControllers(old, nu);

      expect(diff.aois).toHaveLength(1);
      expect(diff.aois[0].kind).toBe('added');
    });

    it('should detect modified AOI (revision change)', () => {
      const old = makeController({
        aois: [makeAOI('MyAOI', { revision: '1.0' })],
      });
      const nu = makeController({
        aois: [makeAOI('MyAOI', { revision: '2.0' })],
      });

      const diff = diffControllers(old, nu);

      expect(diff.aois).toHaveLength(1);
      expect(diff.aois[0].kind).toBe('modified');
      expect(diff.aois[0].propertyChanges).toContainEqual({
        property: 'revision',
        oldValue: '1.0',
        newValue: '2.0',
      });
    });

    it('should compute parameter summary for modified AOI', () => {
      const old = makeController({
        aois: [makeAOI('MyAOI', {
          parameters: [
            { name: 'In1', tagType: 'Base', dataType: 'BOOL', usage: 'Input', required: true, visible: true, externalAccess: 'ReadWrite' },
            { name: 'Out1', tagType: 'Base', dataType: 'BOOL', usage: 'Output', required: true, visible: true, externalAccess: 'ReadWrite' },
          ],
        })],
      });
      const nu = makeController({
        aois: [makeAOI('MyAOI', {
          parameters: [
            { name: 'In1', tagType: 'Base', dataType: 'DINT', usage: 'Input', required: true, visible: true, externalAccess: 'ReadWrite' }, // modified dataType
            // Out1 removed
            { name: 'In2', tagType: 'Base', dataType: 'REAL', usage: 'Input', required: false, visible: true, externalAccess: 'ReadWrite' }, // added
          ],
        })],
      });

      const diff = diffControllers(old, nu);

      expect(diff.aois[0].parameterSummary).toEqual({
        added: 1,
        removed: 1,
        modified: 1,
      });
    });
  });

  describe('module changes', () => {
    it('should detect added module', () => {
      const old = makeController({ modules: [] });
      const nu = makeController({ modules: [makeModule(0, 'Ethernet')] });

      const diff = diffControllers(old, nu);

      expect(diff.modules).toHaveLength(1);
      expect(diff.modules[0].kind).toBe('added');
    });

    it('should detect modified module (slot change)', () => {
      const old = makeController({
        modules: [makeModule(0, 'IO_Card', { slot: 1 })],
      });
      const nu = makeController({
        modules: [makeModule(0, 'IO_Card', { slot: 3 })],
      });

      const diff = diffControllers(old, nu);

      expect(diff.modules).toHaveLength(1);
      expect(diff.modules[0].kind).toBe('modified');
      expect(diff.modules[0].propertyChanges).toContainEqual({
        property: 'slot',
        oldValue: 1,
        newValue: 3,
      });
    });
  });

  describe('summary computation', () => {
    it('should correctly aggregate all change counts', () => {
      const old = makeController({
        programs: [
          makeProgram('Main', {
            routines: [
              makeRoutine('MainRoutine', {
                rungs: [makeRung(0, 'old_rung_0'), makeRung(1, 'rung1')],
              }),
            ],
            tags: [makeTag('ProgramTag1', { scope: 'Program' })],
          }),
        ],
        tags: [makeTag('GlobalTag1'), makeTag('GlobalTag2')],
        dataTypes: [makeDataType('UDT1')],
      });

      const nu = makeController({
        programs: [
          makeProgram('Main', {
            routines: [
              makeRoutine('MainRoutine', {
                rungs: [makeRung(0, 'new_rung_0'), makeRung(1, 'rung1'), makeRung(2, 'rung2')],
              }),
              makeRoutine('NewRoutine'), // added routine
            ],
            tags: [makeTag('ProgramTag1', { scope: 'Program' })],
          }),
        ],
        tags: [makeTag('GlobalTag1'), makeTag('GlobalTag3')], // GlobalTag2 removed, GlobalTag3 added
        dataTypes: [makeDataType('UDT1'), makeDataType('UDT2')], // UDT2 added
      });

      const diff = diffControllers(old, nu);

      // Programs: Main is modified
      expect(diff.summary.programs.modified).toBe(1);

      // Routines: MainRoutine modified + NewRoutine added
      expect(diff.summary.routines.modified).toBe(1);
      expect(diff.summary.routines.added).toBe(1);

      // Rungs: rung0 modified + rung2 added
      expect(diff.summary.rungs.modified).toBe(1);
      expect(diff.summary.rungs.added).toBe(1);

      // Controller tags: GlobalTag2 removed + GlobalTag3 added
      // (program tags are counted separately in the summary)
      expect(diff.summary.tags.added).toBeGreaterThanOrEqual(1);
      expect(diff.summary.tags.removed).toBeGreaterThanOrEqual(1);

      // Data types: UDT2 added
      expect(diff.summary.dataTypes.added).toBe(1);

      // Total should be > 0
      expect(diff.summary.totalChanges).toBeGreaterThan(0);
    });
  });

  describe('complex scenario', () => {
    it('should handle a realistic multi-change scenario', () => {
      const old = makeController({
        name: 'Cooker_Controller',
        description: 'Production cooker v1',
        programs: [
          makeProgram('CookerLogic', {
            routines: [
              makeRoutine('AutoSequence', {
                type: 'RLL',
                rungs: [
                  makeRung(0, 'XIC(Start_PB)OTE(Motor_Run)', 'Start motor on button press'),
                  makeRung(1, 'XIC(Temp_High)OTE(Heater_Off)', 'Disable heater on high temp'),
                  makeRung(2, 'TON(CookTimer,?,?)OTE(Cook_Done)', 'Cook timer'),
                ],
              }),
              makeRoutine('FaultHandler', {
                type: 'ST',
                rungs: [],
                stContent: [
                  { number: 0, text: 'IF FaultBit THEN' },
                  { number: 1, text: '  AlarmCode := 1;' },
                  { number: 2, text: 'END_IF;' },
                ],
              }),
            ],
            tags: [makeTag('CookTimer', { scope: 'Program', dataType: 'TIMER' })],
          }),
        ],
        tags: [
          makeTag('Start_PB', { dataType: 'BOOL' }),
          makeTag('Motor_Run', { dataType: 'BOOL' }),
          makeTag('Temp_High', { dataType: 'BOOL' }),
        ],
        dataTypes: [
          makeDataType('CookerConfig', {
            members: [
              { name: 'MaxTemp', dataType: 'REAL', dimension: 0 },
              { name: 'CookTime', dataType: 'DINT', dimension: 0 },
            ],
          }),
        ],
        modules: [makeModule(0, 'LocalIO', { slot: 1, catalogNumber: '1756-IF16' })],
      });

      const nu = makeController({
        name: 'Cooker_Controller',
        description: 'Production cooker v2 - with safety', // changed
        programs: [
          makeProgram('CookerLogic', {
            routines: [
              makeRoutine('AutoSequence', {
                type: 'RLL',
                rungs: [
                  makeRung(0, 'XIC(Start_PB)XIC(Safety_OK)OTE(Motor_Run)', 'Start motor with safety check'), // modified
                  makeRung(1, 'XIC(Temp_High)OTE(Heater_Off)', 'Disable heater on high temp'), // unchanged
                  // Rung 2 removed
                  makeRung(3, 'XIC(EStop)OTU(Motor_Run)', 'E-Stop kills motor'), // added
                ],
              }),
              makeRoutine('FaultHandler', {
                type: 'ST',
                rungs: [],
                stContent: [
                  { number: 0, text: 'IF FaultBit THEN' },
                  { number: 1, text: '  AlarmCode := 2;' }, // changed from 1 to 2
                  { number: 2, text: '  SafetyStop := TRUE;' }, // added line
                  { number: 3, text: 'END_IF;' },
                ],
              }),
            ],
            tags: [
              makeTag('CookTimer', { scope: 'Program', dataType: 'TIMER' }),
              makeTag('SafetyStop', { scope: 'Program', dataType: 'BOOL' }), // added
            ],
          }),
        ],
        tags: [
          makeTag('Start_PB', { dataType: 'BOOL' }),
          makeTag('Motor_Run', { dataType: 'BOOL' }),
          makeTag('Temp_High', { dataType: 'BOOL' }),
          makeTag('Safety_OK', { dataType: 'BOOL' }), // added
          makeTag('EStop', { dataType: 'BOOL' }), // added
        ],
        dataTypes: [
          makeDataType('CookerConfig', {
            members: [
              { name: 'MaxTemp', dataType: 'REAL', dimension: 0 },
              { name: 'CookTime', dataType: 'DINT', dimension: 0 },
              { name: 'SafetyEnabled', dataType: 'BOOL', dimension: 0 }, // added member
            ],
          }),
        ],
        modules: [makeModule(0, 'LocalIO', { slot: 1, catalogNumber: '1756-IF16' })], // unchanged
      });

      const diff = diffControllers(old, nu);

      // Controller info: description changed
      expect(diff.controllerInfo.changes).toHaveLength(1);
      expect(diff.controllerInfo.changes[0].property).toBe('description');

      // Programs: CookerLogic modified
      expect(diff.programs).toHaveLength(1);
      expect(diff.programs[0].kind).toBe('modified');

      // AutoSequence routine: rung 0 modified, rung 2 removed, rung 3 added
      const autoSeq = diff.programs[0].routineDiffs.find((r) => r.name === 'AutoSequence');
      expect(autoSeq).toBeDefined();
      expect(autoSeq!.rungDiffs).toBeDefined();
      const rungDiffs = autoSeq!.rungDiffs!;
      expect(rungDiffs.find((r) => r.rungNumber === 0)?.kind).toBe('modified');
      expect(rungDiffs.find((r) => r.rungNumber === 2)?.kind).toBe('removed');
      expect(rungDiffs.find((r) => r.rungNumber === 3)?.kind).toBe('added');

      // FaultHandler ST routine: text changed
      const faultHandler = diff.programs[0].routineDiffs.find((r) => r.name === 'FaultHandler');
      expect(faultHandler).toBeDefined();
      expect(faultHandler!.stDiff).toBeDefined();
      expect(faultHandler!.stDiff!.oldText).toContain('AlarmCode := 1;');
      expect(faultHandler!.stDiff!.newText).toContain('AlarmCode := 2;');

      // Program tag: SafetyStop added
      expect(diff.programs[0].tagDiffs).toHaveLength(1);
      expect(diff.programs[0].tagDiffs[0].kind).toBe('added');
      expect(diff.programs[0].tagDiffs[0].name).toBe('SafetyStop');

      // Controller tags: Safety_OK and EStop added
      expect(diff.tags).toHaveLength(2);
      expect(diff.tags.every((t) => t.kind === 'added')).toBe(true);

      // Data type: CookerConfig modified (SafetyEnabled member added)
      expect(diff.dataTypes).toHaveLength(1);
      expect(diff.dataTypes[0].kind).toBe('modified');
      expect(diff.dataTypes[0].memberDiffs).toHaveLength(1);
      expect(diff.dataTypes[0].memberDiffs[0].kind).toBe('added');
      expect(diff.dataTypes[0].memberDiffs[0].name).toBe('SafetyEnabled');

      // Modules: no changes
      expect(diff.modules).toHaveLength(0);

      // Summary should account for everything
      expect(diff.summary.totalChanges).toBeGreaterThan(0);
    });
  });
});
