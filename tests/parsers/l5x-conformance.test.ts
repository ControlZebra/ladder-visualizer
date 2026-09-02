import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { L5XParser } from '../../src/parsers/l5x';
import type { NormalizedController } from '../../src/types/normalized';
import { L5X_FIXTURES, type L5XEntityCounts } from '../fixtures/l5x/manifest';

const fixtureDirectory = join(__dirname, '../fixtures/l5x');

function countEntities(controller: NormalizedController): L5XEntityCounts {
  const programTags = controller.programs.reduce((count, program) => count + program.tags.length, 0);
  const programRoutines = controller.programs.flatMap((program) => program.routines);
  const aoiRoutines = controller.aois.flatMap((aoi) => aoi.routines);
  const routines = [...programRoutines, ...aoiRoutines];

  return {
    dataTypes: controller.dataTypes.length,
    controllerTags: controller.tags.length,
    programTags,
    programs: controller.programs.length,
    routines: routines.length,
    rungs: routines.reduce((count, routine) => count + routine.rungs.length, 0),
    aois: controller.aois.length,
    modules: controller.modules.length,
  };
}

describe('L5X conformance fixture corpus', () => {
  it('declares every required export family, source version, and adversarial case', () => {
    const coverage = new Set(L5X_FIXTURES.flatMap((fixture) => fixture.coverage));
    const versions = new Set(L5X_FIXTURES.map((fixture) => fixture.studio5000Version));

    expect(versions).toEqual(new Set(['33.00', '34.01', '35.01']));
    for (const requiredCoverage of [
      'controller', 'program export', 'routine export', 'rung export', 'scalar tag',
      'UDT', 'AOI export', 'module', 'truncated XML', 'adversarial input',
      'unsupported FBD body', 'unsupported SFC body', 'protected routine',
    ]) {
      expect(coverage).toContain(requiredCoverage);
    }
  });

  it.each(L5X_FIXTURES)('$id remains deterministic against its declared legacy baseline', (fixture) => {
    const source = readFileSync(join(fixtureDirectory, fixture.file), 'utf-8');
    const result = new L5XParser().parse(source);

    expect(result.success).toBe(fixture.expectedLegacySuccess);

    if (fixture.expectedLegacySuccess) {
      expect(result.data).toBeDefined();
      expect(countEntities(result.data!)).toEqual(fixture.expectedCounts);
    } else {
      expect(result.data).toBeUndefined();
      expect(result.errors?.[0]?.code).toBe(fixture.expectedErrorCode);
    }
  });

  it('marks lossy fixtures as partial in the production contract until their content is preserved', () => {
    const lossyFixtures = L5X_FIXTURES.filter((fixture) => fixture.expectedProductionStatus === 'partial');

    expect(lossyFixtures.map((fixture) => fixture.id)).toEqual([
      'fbd-v35',
      'sfc-v35',
      'protected-routine-v35',
    ]);
  });
});
