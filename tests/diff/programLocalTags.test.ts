import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { diffControllers, parseString } from '../../src';

const fixture = (version = '35') => readFileSync(
  new URL(`../fixtures/l5x/program-local-tags-v${version}.L5X`, import.meta.url), 'utf8',
);

function compare(before: string, after: string) {
  const oldResult = parseString(before, 'l5x');
  const newResult = parseString(after, 'l5x');
  expect(oldResult.status).toBe('complete');
  expect(newResult.status).toBe('complete');
  return diffControllers(oldResult.data!, newResult.data!);
}

describe('program local-tag comparison through the public API', () => {
  it.each(['33', '34', '35'])('matches duplicate v%s local names one-to-one', (version) => {
    const first = '<LocalTag Name="X" DataType="DINT" />';
    const second = '<LocalTag Name="X" DataType="BOOL" />';
    const source = (locals: string) => fixture(version).replace(/<LocalTags>[\s\S]*?<\/LocalTags>/,
      `<LocalTags>${locals}</LocalTags>`);
    const original = source(first + second);
    expect(compare(original, original).summary.totalChanges).toBe(0);
    expect(compare(original, source(second + first)).summary.totalChanges).toBe(0);
    expect(compare(original, source(second)).summary.tags).toEqual({ added: 0, removed: 1, modified: 0 });
    expect(compare(source(second), original).summary.tags).toEqual({ added: 1, removed: 0, modified: 0 });
    const changed = compare(original, source('<LocalTag Name="X" DataType="REAL" />' + first));
    expect(changed.summary.tags).toEqual({ added: 0, removed: 0, modified: 1 });
    expect(changed.programs[0].localTagDiffs?.[0]).toMatchObject({
      oldTag: { dataType: 'BOOL' }, newTag: { dataType: 'REAL' },
    });
    expect(compare(source(first + first), source(first)).summary.tags.removed).toBe(1);
    expect(compare(source(first), source(first + first)).summary.tags.added).toBe(1);
  });

  it.each(['33', '34', '35'])('ignores v%s local default attribute order and detects value edits', (version) => {
    const source = fixture(version).replace(/<LocalTags>[\s\S]*?<\/LocalTags>/,
      '<LocalTags><LocalTag Name="LocalAlarm" DataType="ALARM_ANALOG"><DefaultData Format="Decorated"><AlarmAnalogParameters EnableIn="1" In="1.0" /></DefaultData></LocalTag></LocalTags>');
    const reordered = source.replace('EnableIn="1" In="1.0"', 'In="1.0" EnableIn="1"');
    const diff = compare(source, reordered);
    expect(diff.programs).toEqual([]);
    expect(diff.summary.totalChanges).toBe(0);
    const edited = compare(source, reordered.replace('In="1.0"', 'In="2.0"'));
    expect(edited.programs[0].localTagDiffs?.[0].propertyChanges).toContainEqual(
      expect.objectContaining({ property: 'defaultData' }),
    );
    expect(edited.summary.tags.modified).toBe(1);
  });

  it.each(['33', '34', '35'])('reports v%s local default edits and summary counts', (version) => {
    const source = fixture(version);
    const changed = source.replace('Value="7"', 'Value="8"').replace('<![CDATA[7]]>', '<![CDATA[8]]>');
    const diff = compare(source, changed);
    expect(diff.programs).toMatchObject([{
      name: 'ProgramLocals', kind: 'modified', tagDiffs: [], routineDiffs: [],
      localTagDiffs: [{ name: 'Hidden', kind: 'modified',
        oldTag: { defaultValue: 7 }, newTag: { defaultValue: 8 },
        propertyChanges: expect.arrayContaining([
          { property: 'defaultValue', oldValue: 7, newValue: 8 },
          expect.objectContaining({ property: 'defaultData' }),
        ]),
      }],
    }]);
    expect(diff.summary.tags).toEqual({ added: 0, removed: 0, modified: 1 });
    expect(diff.summary.programs).toEqual({ added: 0, removed: 0, modified: 1 });
    expect(diff.summary.totalChanges).toBe(2);
  });

  it('reports local additions and removals independently of ordinary tags', () => {
    const source = fixture();
    const changed = source.replace('<LocalTag Name="Buffer" DataType="DINT" Dimensions="2 3" />',
      '<LocalTag Name="NewLocal" DataType="BOOL" />');
    const diff = compare(source, changed);
    expect(diff.programs[0].tagDiffs).toEqual([]);
    expect(diff.programs[0].localTagDiffs).toMatchObject([
      { name: 'NewLocal', kind: 'added', newTag: { dataType: 'BOOL' } },
      { name: 'Buffer', kind: 'removed', oldTag: { dimensions: [2, 3] } },
    ]);
    expect(diff.summary.tags).toEqual({ added: 1, removed: 1, modified: 0 });
  });

  it.each([
    ['UId="18446744073709551615"', 'UId="6"', 'uid'],
    ['ParentUId="4"', 'ParentUId="6"', 'parentUid'],
    ['DataTypeUId="5"', 'DataTypeUId="6"', 'dataTypeUid'],
    ['Dimensions="2 3"', 'Dimensions="3 3"', 'dimensions'],
    ['DataType="DINT" Dimensions=', 'DataType="REAL" Dimensions=', 'dataType'],
    ['Radix="Decimal"', 'Radix="Hex"', 'radix'],
    ['ExternalAccess="Read Only"', 'ExternalAccess="None"', 'externalAccess'],
    ['Verified="true"', 'Verified="false"', 'verified'],
    ['Hidden local', 'Updated local', 'description'],
    ['Initial value', 'Updated comment', 'comments'],
  ])('reports changes to local %s', (before, after, property) => {
    const source = fixture();
    const diff = compare(source, source.replace(before, after));
    expect(diff.programs[0].localTagDiffs).toHaveLength(1);
    expect(diff.programs[0].localTagDiffs?.[0].propertyChanges).toContainEqual(
      expect.objectContaining({ property }),
    );
    expect(diff.summary.tags.modified).toBe(1);
  });

  it('detects alternate default representation edits without a scalar change', () => {
    const source = fixture();
    const diff = compare(source, source.replace('Value="7"', 'Value="8"'));
    expect(diff.programs[0].localTagDiffs?.[0].propertyChanges).toEqual([
      expect.objectContaining({ property: 'defaultData' }),
    ]);
    expect(diff.programs[0].localTagDiffs?.[0].newTag?.defaultValue).toBe(7);
  });

  it('keeps same-name ordinary tags and local declarations separate', () => {
    const source = fixture().replace('<LocalTags>',
      '<Tags><Tag Name="Hidden" TagType="Base" DataType="BOOL"><Data Format="Decorated"><DataValue DataType="BOOL" Value="0" /></Data></Tag></Tags><LocalTags>');
    const changed = source.replace('Value="0"', 'Value="1"').replace('Value="7"', 'Value="8"');
    const diff = compare(source, changed);
    expect(diff.programs[0].tagDiffs).toMatchObject([{ name: 'Hidden', kind: 'modified' }]);
    expect(diff.programs[0].localTagDiffs).toMatchObject([{ name: 'Hidden', kind: 'modified' }]);
    expect(diff.summary.tags.modified).toBe(2);
  });

  it('includes locals when entire programs are added or removed', () => {
    const source = fixture().replace('TargetType="Program"', 'TargetType="Controller"')
      .replace('TargetName="ProgramLocals"', 'TargetName="FixtureController"')
      .replace('ContainsContext="true"', 'ContainsContext="false"')
      .replace('Use="Context"', 'Use="Target"');
    const empty = source.replace(/<Programs>[\s\S]*<\/Programs>/, '<Programs />');
    const added = compare(empty, source);
    const removed = compare(source, empty);
    expect(added.programs[0].localTagDiffs).toMatchObject([
      { name: 'Hidden', kind: 'added' }, { name: 'Buffer', kind: 'added' },
    ]);
    expect(removed.programs[0].localTagDiffs).toMatchObject([
      { name: 'Hidden', kind: 'removed' }, { name: 'Buffer', kind: 'removed' },
    ]);
    expect(added.summary.tags).toEqual({ added: 2, removed: 0, modified: 0 });
    expect(removed.summary.tags).toEqual({ added: 0, removed: 2, modified: 0 });
  });

  it('reports no changes for identical or reordered local declarations', () => {
    const source = fixture();
    expect(compare(source, source).summary.totalChanges).toBe(0);
    const reordered = source.replace(/(<LocalTag Name="Hidden"[\s\S]*?<\/LocalTag>)\s*(<LocalTag Name="Buffer"[^>]*\/>)/, '$2$1');
    expect(compare(source, reordered).summary.totalChanges).toBe(0);
  });
});
