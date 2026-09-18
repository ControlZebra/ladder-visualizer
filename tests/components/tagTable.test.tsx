// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it } from 'vitest';
import { TagTable, type ColumnDefinition } from '../../src/components';
import { parseString } from '../../src/parsers';
import type { NormalizedTag } from '../../src/types';

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
  extraColumns?: ColumnDefinition<NormalizedTag>[]
): Promise<{
  container: HTMLDivElement;
  root: Root;
}> {
  const container = document.createElement('div');
  const root = createRoot(container);
  await act(async () => {
    root.render(<TagTable tags={tags} extraColumns={extraColumns} />);
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
