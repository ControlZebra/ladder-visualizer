import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseString } from '../../src/parsers';
import { L5XParser } from '../../src/parsers/l5x';

const fixtureDirectory = join(__dirname, '../fixtures/l5x');
const versions = [
  ['33', '33.00'],
  ['34', '34.01'],
  ['35', '35.01'],
] as const;

function fixture(name: string): string {
  return readFileSync(join(fixtureDirectory, name), 'utf-8');
}

describe('L5X task scheduling normalization', () => {
  it.each(versions)('normalizes v%s tasks and ordered program relationships (%s)', (version) => {
    const result = parseString(fixture(`task-scheduling-v${version}.L5X`), 'l5x');

    expect(result.success).toBe(true);
    expect(result.status).toBe('complete');
    expect(result.data?.tasks).toEqual([
      {
        name: 'MainTask',
        type: 'Continuous',
        description: 'Main & coordination',
        priority: 10,
        watchdog: 500,
        disableUpdateOutputs: false,
        inhibited: false,
        verified: true,
        class: 'Standard',
        scheduledProgramNames: ['MainProgram'],
      },
      {
        name: 'PeriodicTask',
        type: 'Periodic',
        rate: 100,
        priority: 5,
        watchdog: 250,
        disableUpdateOutputs: false,
        inhibited: false,
        scheduledProgramNames: ['PeriodicProgramA', 'PeriodicProgramB'],
      },
      {
        name: 'MotionEventTask',
        type: 'Event',
        rate: 10,
        priority: 1,
        watchdog: 100,
        disableUpdateOutputs: true,
        inhibited: false,
        event: {
          trigger: 'Motion Group Execution',
          tag: 'MotionGroup',
          timeoutEnabled: version === '33',
        },
        scheduledProgramNames: [],
      },
    ]);
    expect(result.data?.programs.map(({ name, executingTaskName }) => ({
      name,
      executingTaskName,
    }))).toEqual([
      { name: 'MainProgram', executingTaskName: 'MainTask' },
      { name: 'PeriodicProgramA', executingTaskName: 'PeriodicTask' },
      { name: 'PeriodicProgramB', executingTaskName: 'PeriodicTask' },
    ]);
  });

  it('returns an empty task collection when Tasks is absent', () => {
    const result = parseString(fixture('controller-rll-v35.L5X'), 'l5x');

    expect(result.success).toBe(true);
    expect(result.data?.tasks).toEqual([]);
  });

  it('preserves schema-valid task metadata outside the canonical task model', () => {
    const result = new L5XParser().parseDocument(fixture('task-scheduling-v35.L5X'));

    expect(result.success).toBe(true);
    expect(result.status).toBe('complete');
    expect(result.data?.fragments).toContainEqual({
      path: '/RSLogix5000Content/Controller[1]/Tasks[1]/Task[3]/@LastScanTime',
      reason: 'source-representation',
      value: '12',
    });
    expect(result.data?.fragments.some((fragment) =>
      fragment.path === '/RSLogix5000Content/Controller[1]/Tasks[1]'
      && fragment.reason === 'unmodeled'
    )).toBe(false);
  });

  it('reports schema-valid task integers outside the normalized safe range as partial', () => {
    const result = parseString(fixture('task-numeric-overflow-v35.L5X'), 'l5x');

    expect(result.success).toBe(true);
    expect(result.status).toBe('partial');
    expect(result.data?.tasks).toEqual([{
      name: 'LargePeriodicTask',
      type: 'Periodic',
      description: undefined,
      scheduledProgramNames: [],
    }]);
    expect(result.warnings?.filter(
      (warning) => warning.code === 'UNSUPPORTED_L5X_TASK_NUMERIC_VALUE'
    ).map((warning) => warning.location?.path)).toEqual([
      '/RSLogix5000Content/Controller[1]/Tasks[1]/Task[1]/@Rate',
      '/RSLogix5000Content/Controller[1]/Tasks[1]/Task[1]/@Watchdog',
    ]);
  });

  it('returns stable partial diagnostics for invalid task/program relationships', () => {
    const result = parseString(fixture('task-relationships-invalid-v35.L5X'), 'l5x');

    expect(result.success).toBe(true);
    expect(result.status).toBe('partial');
    expect(result.data?.tasks.map((task) => task.scheduledProgramNames)).toEqual([
      ['GoodProgram', 'GoodProgram', 'MissingProgram', 'WrongOwner', 'SharedProgram'],
      ['SharedProgram'],
    ]);
    expect(result.warnings?.filter((warning) => warning.code?.includes('TASK')).map((warning) => ({
      code: warning.code,
      path: warning.location?.path,
    }))).toEqual([
      {
        code: 'DUPLICATE_TASK_PROGRAM_REFERENCE',
        path: '/RSLogix5000Content/Controller[1]/Tasks[1]/Task[1]/ScheduledPrograms[1]/ScheduledProgram[2]/@Name',
      },
      {
        code: 'MISSING_TASK_PROGRAM',
        path: '/RSLogix5000Content/Controller[1]/Tasks[1]/Task[1]/ScheduledPrograms[1]/ScheduledProgram[3]/@Name',
      },
      {
        code: 'CONTRADICTORY_TASK_PROGRAM_RELATIONSHIP',
        path: '/RSLogix5000Content/Controller[1]/Tasks[1]/Task[1]/ScheduledPrograms[1]/ScheduledProgram[4]/@Name',
      },
      {
        code: 'DUPLICATE_TASK_PROGRAM_REFERENCE',
        path: '/RSLogix5000Content/Controller[1]/Tasks[1]/Task[2]/ScheduledPrograms[1]/ScheduledProgram[1]/@Name',
      },
      {
        code: 'CONTRADICTORY_TASK_PROGRAM_RELATIONSHIP',
        path: '/RSLogix5000Content/Controller[1]/Programs[1]/Program[3]/@ExecutingTaskName',
      },
      {
        code: 'MISSING_EXECUTING_TASK',
        path: '/RSLogix5000Content/Controller[1]/Programs[1]/Program[4]/@ExecutingTaskName',
      },
    ]);
  });
});
