import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProgramNavigator } from '../../src/components/ProgramNavigator';
import { parseString } from '../../src/parsers';
import type { NormalizedController } from '../../src/types';

const fixtureDirectory = join(__dirname, '../fixtures/l5x');

function fixtureController(name: string): NormalizedController {
  const source = readFileSync(join(fixtureDirectory, name), 'utf8');
  const result = parseString(source, 'l5x');
  if (!result.data) throw new Error(`expected ${name} to produce a normalized controller`);
  return result.data;
}

function labelCount(markup: string, label: string): number {
  return markup.match(new RegExp(`>${label}</span>`, 'g'))?.length ?? 0;
}

describe('ProgramNavigator task scheduling', () => {
  it('renders defined tasks, their scheduled programs, and unscheduled programs with routines', () => {
    const controller = fixtureController('program-navigator-tasks-v35.L5X');
    const markup = renderToStaticMarkup(
      <ProgramNavigator
        controller={controller}
        programs={controller.programs}
        initialExpanded={new Set([
          'tasks',
          'task-0',
          'task-1',
          'program-0',
          'program-1',
          'unscheduled',
        ])}
      />,
    );

    expect(markup.indexOf('Periodic100msec')).toBeLessThan(markup.indexOf('ProcessSimulation'));
    expect(markup.indexOf('ProcessSimulation')).toBeLessThan(markup.indexOf('SimulateProcess'));
    expect(markup.indexOf('EmptyTask')).toBeGreaterThan(markup.indexOf('SimulateProcess'));
    expect(markup.indexOf('Unscheduled')).toBeLessThan(markup.indexOf('UnscheduledProgram'));
    expect(markup.indexOf('UnscheduledProgram')).toBeLessThan(markup.indexOf('IdleRoutine'));
    expect(labelCount(markup, 'ProcessSimulation')).toBe(1);
    expect(labelCount(markup, 'UnscheduledProgram')).toBe(1);
  });

  it('places every program under Unscheduled when no tasks are defined', () => {
    const parsed = fixtureController('program-navigator-tasks-v35.L5X');
    const controller = { ...parsed, tasks: [] };
    const markup = renderToStaticMarkup(
      <ProgramNavigator
        controller={controller}
        programs={controller.programs}
        initialExpanded={new Set(['tasks', 'unscheduled'])}
      />,
    );

    expect(markup).not.toContain('Periodic100msec');
    expect(markup.indexOf('Unscheduled')).toBeLessThan(markup.indexOf('ProcessSimulation'));
    expect(markup.indexOf('ProcessSimulation')).toBeLessThan(markup.indexOf('UnscheduledProgram'));
  });

  it('deduplicates repeated references, ignores missing programs, and preserves cross-task conflicts', () => {
    const controller = fixtureController('task-relationships-invalid-v35.L5X');
    const markup = renderToStaticMarkup(
      <ProgramNavigator
        controller={controller}
        programs={controller.programs}
        initialExpanded={new Set(['tasks', 'task-0', 'task-1', 'unscheduled'])}
      />,
    );

    expect(labelCount(markup, 'GoodProgram')).toBe(1);
    expect(labelCount(markup, 'MissingProgram')).toBe(0);
    expect(labelCount(markup, 'SharedProgram')).toBe(2);
    expect(labelCount(markup, 'UnscheduledProgram')).toBe(1);
    expect(labelCount(markup, 'OrphanProgram')).toBe(1);
  });
});
