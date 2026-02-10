import { describe, it, expect } from 'vitest';
import { matchByKey, matchByNumericKey, diffProperties, valuesEqual } from '../../src/diff/matching';

describe('matchByKey', () => {
  it('should identify added items', () => {
    const oldItems = [{ name: 'A' }, { name: 'B' }];
    const newItems = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];

    const result = matchByKey(oldItems, newItems, (i) => i.name);

    expect(result.added).toHaveLength(1);
    expect(result.added[0].name).toBe('C');
    expect(result.removed).toHaveLength(0);
    expect(result.matched).toHaveLength(2);
  });

  it('should identify removed items', () => {
    const oldItems = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
    const newItems = [{ name: 'A' }];

    const result = matchByKey(oldItems, newItems, (i) => i.name);

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(2);
    expect(result.removed.map((r) => r.name)).toEqual(['B', 'C']);
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].oldItem.name).toBe('A');
  });

  it('should handle both added and removed simultaneously', () => {
    const oldItems = [{ name: 'A' }, { name: 'B' }];
    const newItems = [{ name: 'B' }, { name: 'C' }];

    const result = matchByKey(oldItems, newItems, (i) => i.name);

    expect(result.added).toHaveLength(1);
    expect(result.added[0].name).toBe('C');
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].name).toBe('A');
    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].oldItem.name).toBe('B');
  });

  it('should match correctly with identical arrays', () => {
    const items = [{ name: 'X' }, { name: 'Y' }, { name: 'Z' }];

    const result = matchByKey(items, [...items], (i) => i.name);

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.matched).toHaveLength(3);
  });

  it('should handle empty arrays', () => {
    const result = matchByKey([], [], (i: { name: string }) => i.name);

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(0);
    expect(result.matched).toHaveLength(0);
  });

  it('should handle old empty, new has items', () => {
    const newItems = [{ name: 'A' }];
    const result = matchByKey([], newItems, (i: { name: string }) => i.name);

    expect(result.added).toHaveLength(1);
    expect(result.removed).toHaveLength(0);
    expect(result.matched).toHaveLength(0);
  });

  it('should handle new empty, old has items', () => {
    const oldItems = [{ name: 'A' }];
    const result = matchByKey(oldItems, [], (i: { name: string }) => i.name);

    expect(result.added).toHaveLength(0);
    expect(result.removed).toHaveLength(1);
    expect(result.matched).toHaveLength(0);
  });
});

describe('matchByNumericKey', () => {
  it('should match items by numeric key', () => {
    const old = [{ number: 0 }, { number: 1 }, { number: 2 }];
    const nu = [{ number: 0 }, { number: 2 }, { number: 3 }];

    const result = matchByNumericKey(old, nu, (i) => i.number);

    expect(result.added).toHaveLength(1);
    expect(result.added[0].number).toBe(3);
    expect(result.removed).toHaveLength(1);
    expect(result.removed[0].number).toBe(1);
    expect(result.matched).toHaveLength(2);
  });
});

describe('valuesEqual', () => {
  it('should return true for identical primitives', () => {
    expect(valuesEqual(1, 1)).toBe(true);
    expect(valuesEqual('hello', 'hello')).toBe(true);
    expect(valuesEqual(true, true)).toBe(true);
  });

  it('should return false for different primitives', () => {
    expect(valuesEqual(1, 2)).toBe(false);
    expect(valuesEqual('a', 'b')).toBe(false);
  });

  it('should handle null/undefined', () => {
    expect(valuesEqual(null, null)).toBe(true);
    expect(valuesEqual(undefined, undefined)).toBe(true);
    expect(valuesEqual(null, undefined)).toBe(true);
    expect(valuesEqual(null, 'value')).toBe(false);
  });

  it('should compare Date objects', () => {
    const d1 = new Date('2025-01-01');
    const d2 = new Date('2025-01-01');
    const d3 = new Date('2025-06-15');

    expect(valuesEqual(d1, d2)).toBe(true);
    expect(valuesEqual(d1, d3)).toBe(false);
  });

  it('should deep compare objects and arrays', () => {
    expect(valuesEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(valuesEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    expect(valuesEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(valuesEqual([1, 2], [1, 2, 3])).toBe(false);
  });
});

describe('diffProperties', () => {
  it('should detect changed properties', () => {
    const old = { name: 'A', value: 10, desc: 'old' } as Record<string, unknown>;
    const nu = { name: 'A', value: 20, desc: 'new' } as Record<string, unknown>;

    const changes = diffProperties(old, nu, ['name', 'value', 'desc']);

    expect(changes).toHaveLength(2);
    expect(changes[0]).toEqual({ property: 'value', oldValue: 10, newValue: 20 });
    expect(changes[1]).toEqual({ property: 'desc', oldValue: 'old', newValue: 'new' });
  });

  it('should return empty array when nothing changed', () => {
    const obj = { name: 'A', value: 10 } as Record<string, unknown>;
    const changes = diffProperties(obj, { ...obj }, ['name', 'value']);

    expect(changes).toHaveLength(0);
  });

  it('should detect undefined to value change', () => {
    const old = { name: 'A' } as Record<string, unknown>;
    const nu = { name: 'A', description: 'new desc' } as Record<string, unknown>;

    const changes = diffProperties(old, nu, ['description']);

    expect(changes).toHaveLength(1);
    expect(changes[0].oldValue).toBeUndefined();
    expect(changes[0].newValue).toBe('new desc');
  });
});
