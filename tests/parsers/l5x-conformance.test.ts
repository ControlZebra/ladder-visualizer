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
  stLines: 'Line',
  parameters: 'Parameter',
  localTags: 'LocalTag',
  tasks: 'Task',
  ports: 'Port',
  connections: 'Connection',
  arrays: 'Array',
  encodedData: 'EncodedData',
  externalContents: 'ExternalContent',
  wallClockTimes: 'WallClockTime',
  scheduledPrograms: 'ScheduledProgram',
  trends: 'Trend',
  pens: 'Pen',
  quickWatchLists: 'QuickWatchList',
  watchTags: 'WatchTag',
  redundancyConfigurations: 'RedundancyInfo',
  securityConfigurations: 'Security',
  safetyConfigurations: 'SafetyInfo',
  serialPorts: 'SerialPort',
  csts: 'CST',
  dataLogs: 'DataLogs',
  timeSynchronizations: 'TimeSynchronize',
  internetProtocols: 'InternetProtocol',
  ethernetPorts: 'EthernetPort',
  ethernetNetworks: 'EthernetNetwork',
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
    programParameters: controller.programs.reduce(
      (count, program) => count + (program.parameters?.length ?? 0),
      0
    ),
    routines: routines.length,
    rungs: routines.reduce((count, routine) => count + routine.rungs.length, 0),
    aois: controller.aois.length,
    modules: controller.modules.length,
    stLines: routines.reduce((count, routine) => count + (routine.stContent?.length ?? 0), 0),
    aoiParameters: controller.aois.reduce((count, aoi) => count + aoi.parameters.length, 0),
    aoiLocalTags: controller.aois.reduce((count, aoi) => count + aoi.localTags.length, 0),
    modulePorts: controller.modules.reduce((count, module) => count + module.ports.length, 0),
    moduleConnections: controller.modules.reduce(
      (count, module) => count + module.connections.length,
      0
    ),
    tasks: controller.tasks.length,
    scheduledPrograms: controller.tasks.reduce(
      (count, task) => count + task.scheduledProgramNames.length,
      0
    ),
    trends: controller.trends.length,
    pens: controller.trends.reduce((count, trend) => count + trend.pens.length, 0),
    quickWatchLists: controller.quickWatchLists.length,
    watchTags: controller.quickWatchLists.reduce((count, list) => count + list.watchTags.length, 0),
    fbdBodies: routines.filter((routine) => routine.fbd !== undefined).length,
    fbdSheets: routines.reduce((count, routine) => count + (routine.fbd?.sheets.length ?? 0), 0),
    fbdElements: routines.reduce(
      (count, routine) =>
        count +
        (routine.fbd?.sheets.reduce((sheetCount, sheet) => sheetCount + sheet.elements.length, 0) ??
          0),
      0
    ),
    fbdConnections: routines.reduce(
      (count, routine) =>
        count +
        (routine.fbd?.sheets.reduce(
          (sheetCount, sheet) => sheetCount + sheet.connections.length,
          0
        ) ?? 0),
      0
    ),
    fbdAttachments: routines.reduce(
      (count, routine) =>
        count +
        (routine.fbd?.sheets.reduce(
          (sheetCount, sheet) => sheetCount + sheet.attachments.length,
          0
        ) ?? 0),
      0
    ),
    fbdPlaceholders: routines.reduce(
      (count, routine) =>
        count +
        (routine.fbd?.sheets.reduce(
          (sheetCount, sheet) =>
            sheetCount + sheet.elements.filter((element) => element.kind === 'placeholder').length,
          0
        ) ?? 0),
      0
    ),
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

  it('covers every required artifact family in every supported source version', () => {
    const artifactKinds = new Set(L5X_FIXTURES.map((fixture) => fixture.artifactKind));
    const versions = new Set(L5X_FIXTURES
      .filter((fixture) => /-v(33|34|35)\.L5X$/.test(fixture.file))
      .map((fixture) => fixture.studio5000Version.slice(0, 2)));
    const coverage = new Set(L5X_FIXTURES.flatMap((fixture) => fixture.coverage));

    const requiredArtifactKinds = [
      'controller',
      'program',
      'routine',
      'rung',
      'tag-set',
      'data-type',
      'add-on-instruction',
      'module',
    ] as const;

    for (const kind of requiredArtifactKinds) {
      expect(artifactKinds).toContain(kind);
    }
    expect(versions).toEqual(new Set(['33', '34', '35']));
    for (const version of versions) {
      const versionArtifacts = new Set(
        L5X_FIXTURES.filter((fixture) => fixture.studio5000Version.startsWith(version + '.')).map(
          (fixture) => fixture.artifactKind
        )
      );
      for (const kind of requiredArtifactKinds) {
        expect(versionArtifacts, `${version} is missing ${kind}`).toContain(kind);
      }

      const fullProjectFixture = L5X_FIXTURES.find(
        (fixture) =>
          fixture.studio5000Version.startsWith(version + '.') && fixture.coverage.includes('full-project export')
      );
      expect(
        fullProjectFixture,
        `${version} is missing full-project semantic coverage`
      ).toBeDefined();
      for (const semantic of [
        'structured text',
        'canonical FBD body',
        'unsupported SFC body',
        'protected routine',
        'produced tag',
        'consumed tag',
        'decorated array',
        'program parameter',
        'program local tag',
        'module connection',
        'task',
        'wall clock',
      ]) {
        expect(fullProjectFixture?.coverage, `${version} is missing ${semantic}`).toContain(
          semantic
        );
      }
    }

    for (const requiredCoverage of [
      'malformed input',
      'adversarial input',
      'protected routine',
      'canonical FBD body',
      'unsupported SFC body',
      'structured text',
      'produced tag',
      'consumed tag',
      'decorated array',
      'AOI mixed decorated child order',
      'program parameter',
      'program local tag',
      'module connection',
      'task',
      'wall clock',
      'program hierarchy',
      'equipment phase',
      'equipment id',
      'equipment sequence diagnostic',
      'trend',
      'quick watch list',
      'v33 integer network delay',
      'v34 float network delay',
      'v35 float network delay',
      'controller configuration',
      'redundancy configuration',
      'security configuration',
      'safety configuration',
      'communication port configuration',
      'CST configuration',
      'data log configuration',
      'time synchronization configuration',
      'Internet Protocol configuration',
      'Ethernet configuration',
      'preserved controller configuration diagnostic',
    ]) {
      expect(coverage).toContain(requiredCoverage);
    }
  });

  it('pins the v33-to-v34 module connection schema transition', () => {
    const v33 = readFileSync(join(fixtureDirectory, 'full-project-v33.L5X'), 'utf-8');
    const v34 = readFileSync(join(fixtureDirectory, 'full-project-v34.L5X'), 'utf-8');
    const v35 = readFileSync(join(fixtureDirectory, 'full-project-v35.L5X'), 'utf-8');

    expect(v33).toContain('MaxObservedNetworkDelay="12"');
    expect(v34).toContain('MaxObservedNetworkDelay="12.5"');
    expect(v35).toContain('MaxObservedNetworkDelay="12.5"');
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
    expect(result.status).toBe(fixture.expectedParseStatus);
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
      'rockwell-controller-rll': { complete: 22, partial: 0, failed: 0 },
      'rockwell-program-rll': { complete: 6, partial: 2, failed: 0 },
      'rockwell-routine-rll': { complete: 3, partial: 3, failed: 0 },
      'rockwell-rung-rll': { complete: 3, partial: 0, failed: 0 },
      'rockwell-tags': { complete: 16, partial: 9, failed: 0 },
      'rockwell-full-project': { complete: 13, partial: 31, failed: 3 },
    });
  });
});
