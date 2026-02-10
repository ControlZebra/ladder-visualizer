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
 */
export function matchByKey<T>(
  oldItems: T[],
  newItems: T[],
  keyFn: (item: T) => string,
): MatchResult<T> {
  const oldMap = new Map<string, T>();
  for (const item of oldItems) {
    oldMap.set(keyFn(item), item);
  }

  const newMap = new Map<string, T>();
  for (const item of newItems) {
    newMap.set(keyFn(item), item);
  }

  const added: T[] = [];
  const matched: Array<{ oldItem: T; newItem: T }> = [];

  for (const item of newItems) {
    const key = keyFn(item);
    const oldItem = oldMap.get(key);
    if (oldItem !== undefined) {
      matched.push({ oldItem, newItem: item });
    } else {
      added.push(item);
    }
  }

  const removed: T[] = [];
  for (const item of oldItems) {
    const key = keyFn(item);
    if (!newMap.has(key)) {
      removed.push(item);
    }
  }

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
 * Compare two values for shallow equality.
 * Handles Date objects, primitives, and simple arrays/objects via JSON comparison.
 */
export function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;

  // Date comparison
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // For objects/arrays, use JSON serialization as a simple deep equality check.
  // This is sufficient for our normalized domain types (no circular refs, no functions).
  if (typeof a === 'object' && typeof b === 'object') {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }

  return false;
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
