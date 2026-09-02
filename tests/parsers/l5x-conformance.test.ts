import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { L5XParser } from '../../src/parsers/l5x';
import type { NormalizedController } from '../../src/types/normalized';
import {
  L5X_COMPATIBILITY_MATRIX_VERSION,
  L5X_FIXTURES,
  L5X_PROFILE_IDS,
  type L5XNormalizedCounts,
  type L5XParseStatus,
  type L5XSourceCounts,
} from '../fixtures/l5x/manifest';

const fixtureDirectory = join(__dirname, '../fixtures/l5x');

const sourceElements: Record<keyof L5XSourceCounts, string> = {
  controllers: 'Controller',
  dataTypes: 'DataType',
  tags: 'Tag',
  programs: 'Program',
  routines: 'Routine',
  rungs: 'Rung',
  aois: 'AddOnInstructionDefinition',
  modules: 'Module',
  fbdSheets: 'Sheet',
  sfcSteps: 'Step',
};

function countSourceEntities(source: string): L5XSourceCounts {
  return Object.fromEntries(
    Object.entries(sourceElements).map(([key, element]) => [
      key,
      source.match(new RegExp(`<${element}(?=[\\s/>])`, 'g'))?.length ?? 0,
    ])
  ) as unknown as L5XSourceCounts;
}

function countNormalizedEntities(controller: NormalizedController): L5XNormalizedCounts {
  const programRoutines = controller.programs.flatMap((program) => program.routines);
  const aoiRoutines = controller.aois.flatMap((aoi) => aoi.routines);
  const routines = [...programRoutines, ...aoiRoutines];

  return {
    dataTypes: controller.dataTypes.length,
    controllerTags: controller.tags.length,
    programTags: controller.programs.reduce((count, program) => count + program.tags.length, 0),
    programs: controller.programs.length,
    routines: routines.length,
    rungs: routines.reduce((count, routine) => count + routine.rungs.length, 0),
    aois: controller.aois.length,
    modules: controller.modules.length,
  };
}

function buildProfileStatusReport(): Record<string, Record<L5XParseStatus, number>> {
  return Object.fromEntries(
    L5X_PROFILE_IDS.map((profile) => {
      const counts: Record<L5XParseStatus, number> = { complete: 0, partial: 0, failed: 0 };
      for (const fixture of L5X_FIXTURES.filter((candidate) =>
        candidate.profiles.includes(profile)
      )) {
        counts[fixture.expectedParseStatus] += 1;
      }
      return [profile, counts];
    })
  );
}

describe('L5X compatibility contract', () => {
  it('has a versioned matrix and one manifest entry for every fixture file', () => {
    expect(L5X_COMPATIBILITY_MATRIX_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(new Set(L5X_FIXTURES.map((fixture) => fixture.id)).size).toBe(L5X_FIXTURES.length);
    expect(new Set(L5X_FIXTURES.map((fixture) => fixture.file)).size).toBe(L5X_FIXTURES.length);

    const files = readdirSync(fixtureDirectory)
      .filter((file) => file.endsWith('.L5X'))
      .sort();
    expect(files).toEqual(L5X_FIXTURES.map((fixture) => fixture.file).sort());
  });

  it('covers every required artifact family, multiple source versions, and negative-input class', () => {
    const artifactKinds = new Set(L5X_FIXTURES.map((fixture) => fixture.artifactKind));
    const versions = new Set(L5X_FIXTURES.map((fixture) => fixture.studio5000Version));
    const coverage = new Set(L5X_FIXTURES.flatMap((fixture) => fixture.coverage));

    for (const kind of [
      'controller',
      'program',
      'routine',
      'rung',
      'tag-set',
      'data-type',
      'add-on-instruction',
      'module',
    ]) {
      expect(artifactKinds).toContain(kind);
    }
    expect(versions).toEqual(new Set(['33.00', '34.01', '35.01']));
    for (const requiredCoverage of [
      'malformed input',
      'adversarial input',
      'protected routine',
      'unsupported FBD body',
      'unsupported SFC body',
    ]) {
      expect(coverage).toContain(requiredCoverage);
    }
  });

  it.each(L5X_FIXTURES)('$id matches source metadata and exact source entity counts', (fixture) => {
    const source = readFileSync(join(fixtureDirectory, fixture.file), 'utf-8');

    expect(source).toContain(`SoftwareRevision="${fixture.studio5000Version}"`);
    expect(source).toContain(`TargetType="${fixture.targetType}"`);
    expect(countSourceEntities(source)).toEqual(fixture.sourceCounts);
  });

  it.each(L5X_FIXTURES)('$id matches the declared current parser baseline', (fixture) => {
    const source = readFileSync(join(fixtureDirectory, fixture.file), 'utf-8');
    const result = new L5XParser().parse(source);

    expect(result.success).toBe(fixture.currentParser.success);
    if (fixture.currentParser.success) {
      expect(result.data).toBeDefined();
      expect(countNormalizedEntities(result.data!)).toEqual(fixture.currentParser.normalizedCounts);
    } else {
      expect(result.data).toBeUndefined();
      expect(result.errors?.[0]?.code).toBe(fixture.currentParser.errorCode);
    }
  });

  it('reports status counts per profile without manufacturing an overall percentage', () => {
    expect(buildProfileStatusReport()).toEqual({
      'rockwell-controller-rll': { complete: 2, partial: 0, failed: 1 },
      'rockwell-program-rll': { complete: 1, partial: 0, failed: 0 },
      'rockwell-routine-rll': { complete: 1, partial: 0, failed: 0 },
      'rockwell-rung-rll': { complete: 0, partial: 0, failed: 1 },
      'rockwell-tags': { complete: 2, partial: 0, failed: 2 },
      'rockwell-full-project': { complete: 0, partial: 3, failed: 3 },
    });
  });
});
