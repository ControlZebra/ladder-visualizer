/**
 * Diff matching utilities — match entities between old/new controllers by stable keys.
 *
 * These are pure helper functions used by the main diffControllers engine.
 */

/**
 * Match two arrays of entities by a key extractor function.
 * Returns added, removed, and matched (old+new) pairs.
 */
export interface MatchResult<T> {
  added: T[];
  removed: T[];
  matched: Array<{ oldItem: T; newItem: T }>;
}

/**
 * Match entities from two arrays using a string key function.
 * Preserves order from the new array for matched + added items.
 * Duplicate keys match one-to-one, reserving unchanged pairs before edited pairs.
 */
export function matchByKey<T>(
  oldItems: T[],
  newItems: T[],
  keyFn: (item: T) => string,
): MatchResult<T> {
  const oldMap = new Map<string, number[]>();
  for (const [index, item] of oldItems.entries()) {
    const key = keyFn(item);
    const indices = oldMap.get(key) ?? [];
    indices.push(index);
    oldMap.set(key, indices);
  }

  const newMap = new Map<string, number[]>();
  for (const [index, item] of newItems.entries()) {
    const key = keyFn(item);
    const indices = newMap.get(key) ?? [];
    indices.push(index);
    newMap.set(key, indices);
  }

  const matches = new Map<number, number>();
  for (const [key, newIndices] of newMap) {
    const candidates = oldMap.get(key) ?? [];
    const pending: number[] = [];
    for (const newIndex of newIndices) {
      const exactIndex = candidates.length === 1 && newIndices.length === 1
        ? 0
        : candidates.findIndex((oldIndex) => valuesEqual(oldItems[oldIndex], newItems[newIndex]));
      if (exactIndex >= 0) {
        matches.set(newIndex, candidates.splice(exactIndex, 1)[0]);
      } else {
        pending.push(newIndex);
      }
    }
    for (const newIndex of pending) {
      const oldIndex = candidates.shift();
      if (oldIndex !== undefined) matches.set(newIndex, oldIndex);
    }
  }

  const added: T[] = [];
  const matched: Array<{ oldItem: T; newItem: T }> = [];

  for (const [index, item] of newItems.entries()) {
    const oldIndex = matches.get(index);
    if (oldIndex !== undefined) {
      matched.push({ oldItem: oldItems[oldIndex], newItem: item });
    } else {
      added.push(item);
    }
  }

  const matchedOldIndices = new Set(matches.values());
  const removed = oldItems.filter((_item, index) => !matchedOldIndices.has(index));

  return { added, removed, matched };
}

/**
 * Match entities by a numeric key (e.g., rung number, module id).
 */
export function matchByNumericKey<T>(
  oldItems: T[],
  newItems: T[],
  keyFn: (item: T) => number,
): MatchResult<T> {
  return matchByKey(oldItems, newItems, (item) => String(keyFn(item)));
}

/**
 * Compare normalized values, ignoring object key order while retaining array order.
 */
export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  // Date comparison
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Canonicalize object keys during JSON comparison; array order stays meaningful.
  // This is sufficient for our normalized domain types (no circular refs, no functions).
  if (typeof a === 'object' && typeof b === 'object') {
    try {
      return JSON.stringify(a, sortObjectKeys) === JSON.stringify(b, sortObjectKeys);
    } catch {
      return false;
    }
  }

  return false;
}

function sortObjectKeys(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(Object.keys(record).sort().map((key) => [key, record[key]]));
}

/**
 * Compare specific properties of two objects and return a list of changes.
 * Only the listed property names are compared.
 */
export function diffProperties<T extends Record<string, unknown>>(
  oldObj: T,
  newObj: T,
  properties: string[],
): import('./types').PropertyChange[] {
  const changes: import('./types').PropertyChange[] = [];

  for (const prop of properties) {
    const oldVal = oldObj[prop];
    const newVal = newObj[prop];
    if (!valuesEqual(oldVal, newVal)) {
      changes.push({ property: prop, oldValue: oldVal, newValue: newVal });
    }
  }

  return changes;
}
