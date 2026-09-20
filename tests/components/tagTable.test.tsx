// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { TagTable, type ColumnDefinition } from '../../src/components';
import { parseString } from '../../src/parsers';
import type { NormalizedDataType, NormalizedTag } from '../../src/types';

const fixtureDirectory = join(__dirname, '../fixtures/l5x');
const versions = ['33', '34', '35'] as const;

beforeAll(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
});

function fixtureTags(version: string): NormalizedTag[] {
  const source = readFileSync(join(fixtureDirectory, `tag-values-v${version}.L5X`), 'utf-8');
  const result = parseString(source, 'l5x');
  expect(result.success).toBe(true);
  return result.data!.tags;
}

function findRow(container: ParentNode, path: string): HTMLTableRowElement | undefined {
  return Array.from(container.querySelectorAll<HTMLTableRowElement>('tr[data-tag-path]'))
    .find((row) => row.dataset.tagPath === path);
}

function cellText(row: HTMLTableRowElement): string[] {
  return Array.from(row.querySelectorAll('td')).map((cell, index) => {
    if (index !== 0) return cell.textContent?.trim() ?? '';
    const nameCell = cell.cloneNode(true) as HTMLElement;
    nameCell.querySelector('button')?.remove();
    return nameCell.textContent?.trim() ?? '';
  });
}

function visiblePaths(container: ParentNode): string[] {
  return Array.from(container.querySelectorAll<HTMLTableRowElement>('tr[data-tag-path]'))
    .map((row) => row.dataset.tagPath!);
}

async function renderInteractive(
  tags: NormalizedTag[],
  extraColumns?: ColumnDefinition<NormalizedTag>[],
  dataTypes?: readonly NormalizedDataType[]
): Promise<{
  container: HTMLDivElement;
  root: Root;
}> {
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () => {
    root.render(<TagTable tags={tags} extraColumns={extraColumns} dataTypes={dataTypes} />);
  });
  return { container, root };
}

async function clickExpansion(container: ParentNode, path: string): Promise<void> {
  const button = Array.from(container.querySelectorAll<HTMLButtonElement>('button'))
    .find((candidate) => candidate.getAttribute('aria-label') === `Expand ${path}`);
  expect(button).toBeDefined();
  await act(async () => {
    button!.click();
  });
}

describe('TagTable', () => {
  it('matches the Studio 5000 tag column names and order', () => {
    const markup = renderToStaticMarkup(<TagTable tags={fixtureTags('33')} />);
    const container = document.createElement('div');
    container.innerHTML = markup;

    expect(Array.from(container.querySelectorAll('th')).map((header) => header.textContent?.trim()))
      .toEqual([
        'Name ▲',
        'Value',
        'Force Mask',
        'Style',
        'Data Type',
        'Description',
        'Constant',
      ]);
  });

  it.each(versions)('expands v%s structured tags into qualified Studio-style rows', async (version) => {
    const recipe = fixtureTags(version).find((tag) => tag.name === 'Recipe')!;
    const { container, root } = await renderInteractive([recipe]);

    expect(cellText(findRow(container, 'Recipe')!)).toEqual([
      'Recipe',
      '{...}',
      '{...}',
      '-',
      'RecipeType',
      '-',
      '',
    ]);
    expect(findRow(container, 'Recipe.Count')).toBeUndefined();

    await clickExpansion(container, 'Recipe');
    expect(visiblePaths(container)).toEqual(['Recipe', 'Recipe.Nested', 'Recipe.Count']);
    expect(cellText(findRow(container, 'Recipe.Count')!)).toEqual([
      'Recipe.Count',
      '2',
      '-',
      'Decimal',
      'DINT',
      'Recipe count',
      '',
    ]);
    expect(findRow(container, 'Recipe.Nested')).toBeDefined();
    expect(findRow(container, 'Recipe.Nested.Enabled')).toBeUndefined();

    await clickExpansion(container, 'Recipe.Nested');
    expect(visiblePaths(container)).toEqual([
      'Recipe',
      'Recipe.Nested',
      'Recipe.Nested.Steps',
      'Recipe.Nested.Enabled',
      'Recipe.Count',
    ]);
    expect(cellText(findRow(container, 'Recipe.Nested.Enabled')!)).toEqual([
      'Recipe.Nested.Enabled',
      '1',
      '-',
      'Decimal',
      'BOOL',
      'Nested enabled flag',
      '',
    ]);
    expect(cellText(findRow(container, 'Recipe.Nested.Steps')!)).toEqual([
      'Recipe.Nested.Steps',
      '{...}',
      '{...}',
      'Decimal',
      'DINT[2]',
      '-',
      '',
    ]);

    await clickExpansion(container, 'Recipe.Nested.Steps');
    expect(cellText(findRow(container, 'Recipe.Nested.Steps[1]')!)).toEqual([
      'Recipe.Nested.Steps[1]',
      '4',
      '5',
      'Decimal',
      'DINT',
      'Second recipe step',
      '',
    ]);

    await act(async () => root.unmount());
  });

  it.each(versions)('expands v%s raw-only UDT arrays from the declared type catalog', async (version) => {
    const source = readFileSync(join(fixtureDirectory, `raw-udt-array-v${version}.L5X`), 'utf8');
    const controller = parseString(source, 'l5x').data!;
    const raw = controller.programs[0].tags.find((tag) => tag.name === 'RawEvents')!;
    const { container, root } = await renderInteractive([raw], undefined, controller.dataTypes);

    expect(cellText(findRow(container, 'RawEvents')!)).toEqual([
      'RawEvents', '{...}', '{...}', '-', 'SOE_Data[2]', '-', '',
    ]);
    await clickExpansion(container, 'RawEvents');
    expect(visiblePaths(container)).toEqual(['RawEvents', 'RawEvents[0]', 'RawEvents[1]']);

    await clickExpansion(container, 'RawEvents[0]');
    expect(visiblePaths(container)).toContain('RawEvents[0].Events');
    expect(visiblePaths(container)).toContain('RawEvents[0].Timestamps');
    expect(visiblePaths(container)).toContain('RawEvents[0].Enabled');
    expect(visiblePaths(container)).not.toContain('RawEvents[0].ZZZZZZZZZZSOE_Data0');
    expect(cellText(findRow(container, 'RawEvents[0].Enabled')!)).toEqual([
      'RawEvents[0].Enabled', '-', '-', 'Decimal', 'BOOL', '-', '',
    ]);

    await clickExpansion(container, 'RawEvents[0].Events');
    await clickExpansion(container, 'RawEvents[0].Events[0]');
    expect(findRow(container, 'RawEvents[0].Events[0].Value')).toBeDefined();
    await act(async () => root.unmount());
  });

  it('keeps decorated values authoritative when a declared catalog is also available', async () => {
    const source = readFileSync(join(fixtureDirectory, 'raw-udt-array-v33.L5X'), 'utf8');
    const controller = parseString(source, 'l5x').data!;
    const decorated = controller.programs[0].tags.find((tag) => tag.name === 'DecoratedEvents')!;
    const { container, root } = await renderInteractive([decorated], undefined, controller.dataTypes);

    await clickExpansion(container, 'DecoratedEvents');
    await clickExpansion(container, 'DecoratedEvents[0]');
    await clickExpansion(container, 'DecoratedEvents[0].Events');
    await clickExpansion(container, 'DecoratedEvents[0].Events[0]');
    expect(cellText(findRow(container, 'DecoratedEvents[0].Events[0].Value')!)[1]).toBe('7');
    await act(async () => root.unmount());
  });

  it('does not build member rows for a large raw array until an element is expanded', async () => {
    let memberReads = 0;
    const dataType: NormalizedDataType = {
      name: 'SOE_Data', class: 'User',
      get members() {
        memberReads += 1;
        return [{ name: 'EventData', dataType: 'DINT', dimension: 0 }];
      },
    };
    const tag: NormalizedTag = {
      name: 'Events', tagType: 'Base', dataType: 'SOE_Data', dimensions: [2000], scope: 'Program',
    };
    const { container, root } = await renderInteractive([tag], undefined, [dataType]);
    const input = container.querySelector<HTMLInputElement>('input[placeholder="Filter tags..."]')!;

    expect(memberReads).toBe(0);
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, 'Events');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(memberReads).toBe(0);
    expect(visiblePaths(container)).toEqual(['Events']);
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, '');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await clickExpansion(container, 'Events');
    expect(memberReads).toBe(0);
    expect(visiblePaths(container)).toHaveLength(2001);
    await clickExpansion(container, 'Events[0]');
    expect(memberReads).toBe(1);
    expect(findRow(container, 'Events[0].EventData')).toBeDefined();
    await act(async () => root.unmount());
  });

  it('prefers instance operand comments over declared member descriptions', async () => {
    const dataType: NormalizedDataType = {
      name: 'RecipeType',
      class: 'User',
      members: [{
        name: 'Count', dataType: 'DINT', dimension: 0, description: 'Generic count',
      }],
    };
    const tag: NormalizedTag = {
      name: 'Recipe', tagType: 'Base', dataType: 'RecipeType', scope: 'Controller',
      comments: [{
        operand: '.Count', text: 'Instance count', values: ['Instance count'], localizedTexts: [],
      }],
    };
    const { container, root } = await renderInteractive([tag], undefined, [dataType]);

    await clickExpansion(container, 'Recipe');
    expect(cellText(findRow(container, 'Recipe.Count')!)[5]).toBe('Instance count');
    await act(async () => root.unmount());
  });

  it('treats a declared zero dimension as a scalar leaf', async () => {
    const dataType: NormalizedDataType = {
      name: 'SOE_Data',
      class: 'User',
      members: [{
        name: 'EventNumber',
        dataType: 'DINT',
        dimension: 0,
        dimensions: [0],
        radix: 'Decimal',
      }],
    };
    const tag: NormalizedTag = {
      name: 'Events', tagType: 'Base', dataType: 'SOE_Data', scope: 'Program',
      data: [{ text: '00 00 00 00', values: [] }],
    };
    const { container, root } = await renderInteractive([tag], undefined, [dataType]);

    await clickExpansion(container, 'Events');
    expect(cellText(findRow(container, 'Events.EventNumber')!)).toEqual([
      'Events.EventNumber', '-', '-', 'Decimal', 'DINT', '-', '',
    ]);
    expect(container.querySelector('button[aria-label="Expand Events.EventNumber"]')).toBeNull();
    await act(async () => root.unmount());
  });

  it('does not render opaque raw bytes as a scalar value', () => {
    const tag: NormalizedTag = {
      name: 'RawCounter', tagType: 'Base', dataType: 'DINT', scope: 'Controller',
      data: [{ text: '00 00 00 2A', values: [] }],
    };
    const markup = renderToStaticMarkup(<TagTable tags={[tag]} />);
    const container = document.createElement('div');
    container.innerHTML = markup;

    expect(cellText(findRow(container, 'RawCounter')!)[1]).toBe('-');
    expect(markup).not.toContain('00 00 00 2A');
  });

  it('maps scalar value, force, style, type, description, and constant columns', () => {
    const scalar = fixtureTags('33').find((tag) => tag.name === 'ConstantCounter')!;
    const markup = renderToStaticMarkup(<TagTable tags={[scalar]} />);
    const container = document.createElement('div');
    container.innerHTML = markup;
    const row = findRow(container, 'ConstantCounter')!;

    expect(cellText(row)).toEqual([
      'ConstantCounter',
      '10',
      '11',
      'Decimal',
      'DINT',
      'Constant counter',
      '',
    ]);
    expect(row.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
  });

  it('uses the String representation for STRING tag values', () => {
    const stringValue = fixtureTags('33').find((tag) => tag.name === 'StringValue')!;
    const markup = renderToStaticMarkup(<TagTable tags={[stringValue]} />);
    const container = document.createElement('div');
    container.innerHTML = markup;

    expect(cellText(findRow(container, 'StringValue')!)[1]).toBe("'0042'");
  });

  it('does not show ineffective expansion controls while filtering', async () => {
    const recipe = fixtureTags('33').find((tag) => tag.name === 'Recipe')!;
    const { container, root } = await renderInteractive([recipe]);
    const input = container.querySelector<HTMLInputElement>('input[placeholder="Filter tags..."]')!;

    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, 'Count');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    expect(visiblePaths(container)).toEqual(['Recipe', 'Recipe.Count']);
    expect(container.querySelector('button')).toBeNull();
    await act(async () => root.unmount());
  });

  it('sorts top-level tags by sortable extra columns', async () => {
    const alpha: NormalizedTag = {
      name: 'Alpha', tagType: 'Base', dataType: 'DINT', scope: 'Controller', value: 2,
    };
    const beta: NormalizedTag = {
      name: 'Beta', tagType: 'Base', dataType: 'DINT', scope: 'Controller', value: 1,
    };
    const { container, root } = await renderInteractive([alpha, beta], [{
      key: 'value', header: 'Rank', sortKey: 'value',
    }]);
    const rankHeader = Array.from(container.querySelectorAll('th'))
      .find((header) => header.textContent?.trim() === 'Rank')!;

    await act(async () => rankHeader.click());

    expect(visiblePaths(container)).toEqual(['Beta', 'Alpha']);
    await act(async () => root.unmount());
  });

  it('renders the legacy scalar value when typed tag data is absent', () => {
    const tag: NormalizedTag = {
      name: 'Counter',
      tagType: 'Base',
      dataType: 'DINT',
      scope: 'Controller',
      value: 42,
    };

    const markup = renderToStaticMarkup(<TagTable tags={[tag]} />);
    const container = document.createElement('div');
    container.innerHTML = markup;

    expect(cellText(findRow(container, 'Counter')!)[1]).toBe('42');
  });
});
