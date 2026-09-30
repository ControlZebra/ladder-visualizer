import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { diffFBD, diffControllers } from '../../src/diff';
import { parseString } from '../../src/parsers';
import type { NormalizedFBDBody, NormalizedController } from '../../src/types';

function controller(): NormalizedController {
  const result = parseString(
    readFileSync(join(__dirname, '../fixtures/l5x/fbd-level-control-v35.L5X'), 'utf8'),
    'l5x'
  );
  if (!result.data) throw new Error('fixture failed to parse');
  return result.data;
}
function body(): NormalizedFBDBody {
  return controller().programs[0].routines[0].fbd!;
}

describe('normalized FBD comparison', () => {
  it('retains both complete versions of an unchanged export without reporting changes', () => {
    const old = body(),
      next = structuredClone(old);
    const result = diffFBD(old, next);
    expect(result.hasChanges).toBe(false);
    expect(result.complete).toBe(true);
    expect(result.sheets).toHaveLength(old.sheets.length);
    expect(result.sheets[0].elements).toHaveLength(old.sheets[0].elements.length);
    expect(result.sheets[0].oldValue).toBe(old.sheets[0]);
    expect(result.sheets[0].newValue).toBe(next.sheets[0]);
  });

  it('detects metadata-only changes through the public controller API and summary', () => {
    const old = controller(),
      next = structuredClone(old);
    next.programs[0].routines[0].fbd!.sheets[0].descriptions = ['Updated description'];
    const result = diffControllers(old, next);
    expect(result.summary.totalChanges).toBeGreaterThan(0);
    expect(result.summary.routines.modified).toBe(1);
    expect(result.programs[0].routineDiffs[0].fbdDiff!.sheets[0].propertyChanges).toEqual([
      {
        property: 'descriptions[0]',
        oldValue: 'Level control and simulation',
        newValue: 'Updated description',
        category: 'presentation',
      },
    ]);
  });

  it('separates moved blocks from changed operands, preserving both', () => {
    const old = body(),
      next = structuredClone(old);
    const block = next.sheets[0].elements.find((item) => item.kind === 'block')!;
    if (block.kind !== 'block') throw new Error('expected block');
    block.position.x = '350';
    block.operand = 'ADD_02';
    const changes = diffFBD(old, next).sheets[0].elements.find(
      (item) => item.kind === 'modified'
    )!.propertyChanges;
    expect(changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'position.x', category: 'presentation' }),
        expect.objectContaining({ property: 'operand', category: 'logic' }),
      ])
    );
  });

  it('pairs sheets by declared number after reordering, without inventing element changes', () => {
    const old = body(),
      next = structuredClone(old);
    next.sheets.reverse();
    const result = diffFBD(old, next);
    expect(result.sheets[0].oldIndex).toBe(1);
    expect(result.sheets.every((sheet) => sheet.kind === 'unchanged')).toBe(true);
    expect(result.propertyChanges[0].property).toBe('sheetOrder[0]');
    expect(result.propertyChanges.every((change) => change.category === 'presentation')).toBe(true);
  });

  it.each(['missing', 'duplicate'])('does not pair %s sheet numbers', (scenario) => {
    const old = body(),
      next = structuredClone(old);
    if (scenario === 'missing') next.sheets[0].number.source = 'fallback';
    else next.sheets[1].number = { ...next.sheets[0].number };
    const result = diffFBD(old, next);
    expect(result.complete).toBe(false);
    expect(result.diagnostics[0].code).toBe('FBD_DIFF_SHEET_ID_AMBIGUOUS');
    expect(
      result.sheets
        .filter((sheet) => sheet.ambiguous)
        .every((sheet) => !sheet.oldValue || !sheet.newValue)
    ).toBe(true);
    expect(result.sheets.filter((sheet) => sheet.oldValue)).toHaveLength(old.sheets.length);
    expect(result.sheets.filter((sheet) => sheet.newValue)).toHaveLength(next.sheets.length);
  });

  it('does not discard duplicate or missing element IDs', () => {
    const old = body(),
      next = structuredClone(old);
    next.sheets[0].elements[1].id = next.sheets[0].elements[0].id;
    next.sheets[0].elements.push({
      kind: 'placeholder',
      ports: [],
      sourceKind: 'Unknown',
      reasonCodes: ['missing-id'],
    });
    const result = diffFBD(old, next);
    expect(result.complete).toBe(false);
    expect(result.sheets[0].elements.filter((element) => element.newValue)).toHaveLength(
      next.sheets[0].elements.length
    );
    expect(result.sheets[0].elements.filter((element) => element.oldValue)).toHaveLength(
      old.sheets[0].elements.length
    );
  });

  it('compares wire topology as a multiset including feedback and duplicate wires', () => {
    const old = body(),
      next = structuredClone(old);
    next.sheets[0].connections.reverse();
    expect(diffFBD(old, next).hasChanges).toBe(false);
    next.sheets[0].connections.push(structuredClone(next.sheets[0].connections[0]));
    let changed = diffFBD(old, next).sheets[0].connections.filter(
      (item) => item.kind !== 'unchanged'
    );
    expect(changed.map((item) => item.kind)).toEqual(['added']);
    expect(changed[0].categories).toEqual(['logic']);
    next.sheets[0].connections[0].to.port = 'ChangedPort';
    changed = diffFBD(old, next).sheets[0].connections.filter((item) => item.kind !== 'unchanged');
    expect(changed[0].newValue?.to.port).toBe('ChangedPort');
  });

  it('detects attachments, text, placeholder payloads, ports and body metadata', () => {
    const old = body(),
      next = structuredClone(old);
    next.sheets[0].attachments.push({ fromElementId: '9', toElementId: '2' });
    next.sheets[0].elements.push({
      kind: 'text-box',
      id: '99',
      position: { x: '0', y: '0' },
      text: 'Review note',
    });
    const block = next.sheets[0].elements.find((item) => item.kind === 'block')!;
    if (block.kind !== 'block') throw new Error('expected block');
    block.ports[0].visible = !block.ports[0].visible;
    next.orientation.value = 'Portrait';
    const result = diffFBD(old, next);
    expect(result.propertyChanges[0].category).toBe('presentation');
    expect(result.sheets[0].attachments[0].kind).toBe('added');
    expect(result.sheets[0].attachments[0].categories).toEqual(['presentation']);
    expect(
      result.sheets[0].elements.find((item) => item.newValue?.id === '99')?.categories
    ).toEqual(['presentation']);
    expect(result.sheets[0].elements.find((item) => item.newValue?.id === '99')?.kind).toBe(
      'added'
    );
    expect(
      result.sheets[0].elements.find((item) => item.kind === 'modified')?.propertyChanges[0]
        .category
    ).toBe('presentation');
    const placeholder = {
      kind: 'placeholder' as const,
      id: '100',
      sourceKind: 'Unknown',
      ports: [],
      reasonCodes: ['unsupported-kind' as const],
      bindings: [{ name: 'arg', argument: 'old' }],
    };
    old.sheets[0].elements.push(placeholder);
    next.sheets[0].elements.push({ ...placeholder, bindings: [{ name: 'arg', argument: 'new' }] });
    expect(
      diffFBD(old, next).sheets[0].elements.find((item) => item.newValue?.id === '100')?.kind
    ).toBe('modified');
  });

  it('exposes added and removed bodies and sheets, including empty bodies', () => {
    const original = body();
    expect(diffFBD(undefined, original).sheets.every((item) => item.kind === 'added')).toBe(true);
    expect(diffFBD(original, undefined).sheets.every((item) => item.kind === 'removed')).toBe(true);
    expect(diffFBD(undefined, { ...original, sheets: [] }).hasChanges).toBe(true);
    const next = structuredClone(original);
    next.sheets.pop();
    expect(diffFBD(original, next).sheets.at(-1)?.kind).toBe('removed');
  });

  it('ignores object key and element enumeration order and does not mutate inputs', () => {
    const old = body(),
      next = structuredClone(old),
      before = JSON.stringify(old);
    next.sheets[0].elements.reverse();
    next.sheets[0].elements = next.sheets[0].elements.map(
      (element) => Object.fromEntries(Object.entries(element).reverse()) as typeof element
    );
    expect(diffFBD(old, next).hasChanges).toBe(false);
    expect(JSON.stringify(old)).toBe(before);
  });

  it('includes FBD routine details within AOI comparisons', () => {
    const old = controller();
    old.aois = [
      {
        name: 'FBDOwner',
        class: 'Standard',
        executePrescan: false,
        executePostscan: false,
        executeEnableInFalse: false,
        parameters: [],
        localTags: [],
        routines: [old.programs[0].routines[0]],
      },
    ];
    old.programs = [];
    const next = structuredClone(old);
    next.aois[0].routines[0].fbd!.sheets[0].descriptions = ['AOI change'];
    const result = diffControllers(old, next);
    expect(result.summary.aois.modified).toBe(1);
    expect(result.aois[0].routineDiffs?.[0].fbdDiff?.hasChanges).toBe(true);
  });
});
