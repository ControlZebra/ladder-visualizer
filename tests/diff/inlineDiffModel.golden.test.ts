import { describe, expect, it } from 'vitest';
import { buildInlineDiffModel } from '../../src/diff';
import { INLINE_DIFF_MODEL_GOLDEN_FIXTURES } from './inlineDiffModel.fixtures';

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((entry) => stripUndefinedDeep(entry)) as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .map(([key, entryValue]) => [key, stripUndefinedDeep(entryValue)]);

    return Object.fromEntries(entries) as T;
  }

  return value;
}

describe('buildInlineDiffModel golden fixtures', () => {
  it.each(INLINE_DIFF_MODEL_GOLDEN_FIXTURES)('matches %s', ({ input, expected }) => {
    const actual = buildInlineDiffModel(input);

    expect(stripUndefinedDeep(actual)).toEqual(expected);
  });
});