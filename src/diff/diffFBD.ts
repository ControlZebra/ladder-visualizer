import type {
  NormalizedFBDBody, NormalizedFBDSheet, NormalizedFBDElement,
  NormalizedFBDConnection, NormalizedFBDAttachment,
} from '../types';
import type { ChangeKind, PropertyChange } from './types';

export type FBDChangeCategory = 'logic' | 'presentation' | 'unknown';
export interface FBDPropertyChange extends PropertyChange { category: FBDChangeCategory }
export interface FBDDiffDiagnostic {
  code: 'FBD_DIFF_SHEET_ID_AMBIGUOUS' | 'FBD_DIFF_ELEMENT_ID_AMBIGUOUS';
  message: string;
}
export interface FBDItemDiff<T> {
  kind: ChangeKind | 'unchanged';
  /** Ambiguous items are kept individually, never silently paired or discarded. */
  ambiguous: boolean;
  oldIndex?: number;
  newIndex?: number;
  oldValue?: T;
  newValue?: T;
  propertyChanges: FBDPropertyChange[];
}
export interface FBDSheetDiff extends FBDItemDiff<NormalizedFBDSheet> {
  key: string;
  elements: FBDItemDiff<NormalizedFBDElement>[];
  connections: FBDItemDiff<NormalizedFBDConnection>[];
  attachments: FBDItemDiff<NormalizedFBDAttachment>[];
}
export interface FBDDiff {
  oldBody?: NormalizedFBDBody;
  newBody?: NormalizedFBDBody;
  hasChanges: boolean;
  /** False means identity is ambiguous; an empty result cannot establish equivalence. */
  complete: boolean;
  propertyChanges: FBDPropertyChange[];
  /** Includes unchanged sheets and elements so a viewer can render both complete versions. */
  sheets: FBDSheetDiff[];
  diagnostics: FBDDiffDiagnostic[];
}

/** Canonical decimal source identity, without converting potentially large IDs to Number. */
function numericId(value: string | undefined): string | undefined {
  return value !== undefined && /^\d+$/.test(value) ? value.replace(/^0+(?=\d)/, '') : undefined;
}
function sheetId(sheet: NormalizedFBDSheet): string | undefined {
  return sheet.number.source === 'declared' ? numericId(sheet.number.value) : undefined;
}
function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).filter((key) => record[key] !== undefined).sort()
      .map((key) => `${JSON.stringify(key)}:${stable(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'undefined';
}

function category(path: string, presentationOnly: boolean): FBDChangeCategory {
  if (presentationOnly) return 'presentation';
  if (/^(position|width|text|hideDescription|visiblePins)(\.|\[|$)/.test(path)
    || /^ports\[\d+\]\.(label|side|order|visible|defaultVisible)$/.test(path)) return 'presentation';
  if (/^(verified|reasonCodes|sourceKind)(\.|\[|$)/.test(path)) return 'unknown';
  // Unknown future fields must not be advertised as proven logic changes.
  return /^(kind|instruction|operand|name|referenceType|connectorType|autotuneTag|arrays|bindings|operation|routine|inputParameters|returnParameters|ports|from|to|fromElementId|toElementId)(\.|\[|$)/.test(path)
    ? 'logic' : 'unknown';
}
function properties(oldValue: unknown, newValue: unknown, presentationOnly = false, path = ''): FBDPropertyChange[] {
  if (stable(oldValue) === stable(newValue)) return [];
  if (oldValue && newValue && typeof oldValue === 'object' && typeof newValue === 'object') {
    if (Array.isArray(oldValue) && Array.isArray(newValue) && oldValue.length === newValue.length) {
      return oldValue.flatMap((value, index) => properties(value, newValue[index], presentationOnly, `${path}[${index}]`));
    }
    if (!Array.isArray(oldValue) && !Array.isArray(newValue)) {
      const oldRecord = oldValue as Record<string, unknown>;
      const newRecord = newValue as Record<string, unknown>;
      return [...new Set([...Object.keys(oldRecord), ...Object.keys(newRecord)])].sort()
        .flatMap((key) => properties(oldRecord[key], newRecord[key], presentationOnly, path ? `${path}.${key}` : key));
    }
  }
  return [{ property: path, oldValue, newValue, category: category(path, presentationOnly) }];
}

interface Pair<T> { oldValue?: T; newValue?: T; oldIndex?: number; newIndex?: number; ambiguous: boolean }
function pairUnique<T>(oldItems: T[], newItems: T[], keyOf: (item: T) => string | undefined): Pair<T>[] {
  const index = (items: T[]) => {
    const result = new Map<string, number[]>();
    items.forEach((item, i) => {
      const key = keyOf(item);
      if (key !== undefined) result.set(key, [...(result.get(key) ?? []), i]);
    });
    return result;
  };
  const oldKeys = index(oldItems), newKeys = index(newItems);
  const used = new Set<number>();
  const pairs: Pair<T>[] = newItems.map((newValue, newIndex) => {
    const key = keyOf(newValue);
    const oldIndices = key === undefined ? [] : oldKeys.get(key) ?? [];
    const ambiguous = key === undefined || oldIndices.length > 1 || (newKeys.get(key)?.length ?? 0) > 1;
    const oldIndex = !ambiguous && oldIndices.length === 1 ? oldIndices[0] : undefined;
    if (oldIndex !== undefined) used.add(oldIndex);
    return { newValue, newIndex, oldValue: oldIndex === undefined ? undefined : oldItems[oldIndex], oldIndex, ambiguous };
  });
  oldItems.forEach((oldValue, oldIndex) => {
    if (used.has(oldIndex)) return;
    const key = keyOf(oldValue);
    pairs.push({ oldValue, oldIndex, ambiguous: key === undefined || (oldKeys.get(key)?.length ?? 0) > 1 || (newKeys.get(key)?.length ?? 0) > 1 });
  });
  return pairs;
}
function itemDiff<T>(pair: Pair<T>, changes = properties(pair.oldValue, pair.newValue)): FBDItemDiff<T> {
  return { ...pair, kind: pair.oldValue === undefined ? 'added' : pair.newValue === undefined ? 'removed' : changes.length ? 'modified' : 'unchanged', propertyChanges: pair.oldValue === undefined || pair.newValue === undefined ? [] : changes };
}

/** Connections have no independent ID. Match endpoints as a multiset, preserving duplicates. */
function edgeDiffs<T>(oldItems: T[], newItems: T[], keyOf: (value: T) => string): FBDItemDiff<T>[] {
  const buckets = new Map<string, number[]>();
  oldItems.forEach((item, index) => { const key = keyOf(item); buckets.set(key, [...(buckets.get(key) ?? []), index]); });
  const used = new Set<number>();
  const result = newItems.map((newValue, newIndex) => {
    const candidates = buckets.get(keyOf(newValue)) ?? [];
    const exact = candidates.findIndex((index) => stable(oldItems[index]) === stable(newValue));
    const oldIndex = candidates.splice(exact < 0 ? 0 : exact, 1)[0];
    if (oldIndex !== undefined) used.add(oldIndex);
    return itemDiff({ newValue, newIndex, oldValue: oldIndex === undefined ? undefined : oldItems[oldIndex], oldIndex, ambiguous: false });
  });
  oldItems.forEach((oldValue, oldIndex) => { if (!used.has(oldIndex)) result.push(itemDiff({ oldValue, oldIndex, ambiguous: false })); });
  return result;
}
function elementComparable(element: NormalizedFBDElement): unknown {
  if (!('ports' in element) || element.ports[0] === 'value') return element;
  return { ...element, ports: [...element.ports].sort((a, b) => stable(a).localeCompare(stable(b))) };
}

/** Compare only normalized FBD content. Preserved XML/protected payloads require document comparison. */
export function diffFBD(oldBody?: NormalizedFBDBody, newBody?: NormalizedFBDBody): FBDDiff {
  const diagnostics: FBDDiffDiagnostic[] = [];
  const propertyChanges = properties(
    oldBody && { sheetSize: oldBody.sheetSize, orientation: oldBody.orientation },
    newBody && { sheetSize: newBody.sheetSize, orientation: newBody.orientation }, true,
  );
  const oldSheets = oldBody?.sheets ?? [], newSheets = newBody?.sheets ?? [];
  // Report a reorder separately only when both sides contain the same unique sheet identities.
  const oldOrder = oldSheets.map(sheetId), newOrder = newSheets.map(sheetId);
  if (oldOrder.every((id) => id !== undefined) && newOrder.every((id) => id !== undefined)
    && new Set(oldOrder).size === oldOrder.length && new Set(newOrder).size === newOrder.length
    && stable([...oldOrder].sort()) === stable([...newOrder].sort())) {
    propertyChanges.push(...properties(oldOrder, newOrder, true, 'sheetOrder'));
  }
  const sheets = pairUnique(oldSheets, newSheets, sheetId).map<FBDSheetDiff>((pair) => {
    const { oldValue, newValue } = pair;
    const number = (newValue ?? oldValue)!.number.value;
    if (pair.ambiguous) diagnostics.push({ code: 'FBD_DIFF_SHEET_ID_AMBIGUOUS', message: `Sheet ${number}: missing or duplicate source sheet number; versions are not paired.` });
    const elements = pairUnique(oldValue?.elements ?? [], newValue?.elements ?? [], (element) => numericId(element.id))
      .map((elementPair) => {
        if (elementPair.ambiguous) diagnostics.push({ code: 'FBD_DIFF_ELEMENT_ID_AMBIGUOUS', message: `Sheet ${number}: missing or duplicate element ID ${elementPair.newValue?.id ?? elementPair.oldValue?.id ?? '(missing)'}; elements are not paired.` });
        return itemDiff(elementPair, properties(elementPair.oldValue && elementComparable(elementPair.oldValue), elementPair.newValue && elementComparable(elementPair.newValue)));
      });
    const connections = edgeDiffs(oldValue?.connections ?? [], newValue?.connections ?? [], (connection) => stable([connection.kind, connection.from, connection.to]));
    const attachments = edgeDiffs(oldValue?.attachments ?? [], newValue?.attachments ?? [], (attachment) => stable([attachment.fromElementId, attachment.toElementId]));
    const changes = properties(oldValue && { name: oldValue.name, descriptions: oldValue.descriptions, number: oldValue.number }, newValue && { name: newValue.name, descriptions: newValue.descriptions, number: newValue.number }, true);
    const sheet = itemDiff(pair, changes);
    if (sheet.kind === 'unchanged' && [...elements, ...connections, ...attachments].some((item) => item.kind !== 'unchanged')) sheet.kind = 'modified';
    return { ...sheet, key: `old-${pair.oldIndex ?? 'none'}-new-${pair.newIndex ?? 'none'}`, elements, connections, attachments };
  });
  return { oldBody, newBody, hasChanges: propertyChanges.length > 0 || sheets.some((sheet) => sheet.kind !== 'unchanged'), complete: diagnostics.length === 0, propertyChanges, sheets, diagnostics };
}
