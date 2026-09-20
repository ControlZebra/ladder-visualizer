import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import type {
  NormalizedArrayTagValue,
  NormalizedDataType,
  NormalizedDataTypeMember,
  NormalizedDecoratedTagValue,
  NormalizedStructureTagValue,
  NormalizedTag,
} from '../types';
import type { ColumnDefinition } from './table';
import {
  combineStyles,
  getRowStyle as getDefaultRowStyle,
  tableStyles,
} from './table/tableStyles';

export interface TagTableProps {
  /** Array of tags to display */
  tags: NormalizedTag[];
  /** Optional declared data types used to describe raw-only structured tags. */
  dataTypes?: readonly NormalizedDataType[];
  /** Optional CSS class name */
  className?: string;
  /** Callback when a tag or one of its descendants is selected */
  onTagSelect?: (tag: NormalizedTag) => void;
  /** Additional columns appended after the Studio 5000-compatible columns */
  extraColumns?: ColumnDefinition<NormalizedTag>[];
  /** Optional row style override */
  getRowStyle?: (tag: NormalizedTag, index: number) => CSSProperties | undefined;
}

interface TagTableRow {
  id: string;
  tag: NormalizedTag;
  name: string;
  depth: number;
  value?: string;
  forceMask?: string;
  style?: string;
  dataType?: string;
  description?: string;
  constant?: boolean;
  topLevel: boolean;
  children: TagTableRow[] | (() => TagTableRow[]);
}

const COMPOSITE_VALUE = '{...}';
const EMPTY_VALUE = '-';
const EMPTY_DATA_TYPES: readonly NormalizedDataType[] = [];
const ATOMIC_DATA_TYPES = new Set([
  'BIT', 'BOOL', 'SINT', 'INT', 'DINT', 'LINT', 'USINT', 'UINT', 'UDINT', 'ULINT',
  'REAL', 'LREAL', 'STRING',
]);

function childRows(row: TagTableRow): TagTableRow[] {
  if (typeof row.children === 'function') row.children = row.children();
  return row.children;
}

function rowId(tag: NormalizedTag, path: string): string {
  return `${tag.scope}:${tag.programName ?? ''}:${path}`;
}

function memberPath(parentPath: string, memberName: string | undefined): string {
  return memberName ? `${parentPath}.${memberName}` : parentPath;
}

function indexPath(parentPath: string, index: number[]): string {
  return `${parentPath}[${index.join(',')}]`;
}

function formatDataType(dataType: string | undefined, dimensions: number[] = []): string | undefined {
  if (!dataType) return undefined;
  return dimensions.length ? `${dataType}[${dimensions.join(',')}]` : dataType;
}

function firstCommentText(tag: NormalizedTag, path: string): string | undefined {
  const operand = path.startsWith(tag.name) ? path.slice(tag.name.length) : path;
  const comment = (tag.comments ?? []).find((candidate) => candidate.operand === operand);
  return comment?.text ?? comment?.values[0] ?? comment?.localizedTexts[0]?.text;
}

function atomicRow(
  value: Extract<NormalizedDecoratedTagValue, { kind: 'atomic' }>,
  tag: NormalizedTag,
  parentPath: string,
  depth: number,
  inheritedStyle?: string
): TagTableRow {
  const path = memberPath(parentPath, value.name);
  return {
    id: rowId(tag, path),
    tag,
    name: path,
    depth,
    value: value.value,
    forceMask: value.forceValue,
    style: value.radix ?? inheritedStyle,
    dataType: value.dataType,
    description: firstCommentText(tag, path),
    topLevel: false,
    children: [],
  };
}

function structureChildren(
  structure: NormalizedStructureTagValue,
  tag: NormalizedTag,
  path: string,
  depth: number
): TagTableRow[] {
  return structure.members.map((member) => valueRow(member, tag, path, depth));
}

function arrayChildren(
  array: NormalizedArrayTagValue,
  tag: NormalizedTag,
  path: string,
  depth: number
): TagTableRow[] {
  return array.elements.map((element) => {
    const elementPath = indexPath(path, element.index);
    const structures = element.structures;
    const children = structures.flatMap((structure) =>
      structureChildren(structure, tag, elementPath, depth + 1)
    );
    return {
      id: rowId(tag, elementPath),
      tag,
      name: elementPath,
      depth,
      value: structures.length ? COMPOSITE_VALUE : element.value,
      forceMask: structures.length ? COMPOSITE_VALUE : element.forceValue,
      style: array.radix,
      dataType: structures[0]?.dataType ?? array.dataType,
      description: firstCommentText(tag, elementPath),
      topLevel: false,
      children,
    };
  });
}

function valueRow(
  value: NormalizedDecoratedTagValue,
  tag: NormalizedTag,
  parentPath: string,
  depth: number
): TagTableRow {
  switch (value.kind) {
    case 'atomic':
      return atomicRow(value, tag, parentPath, depth);
    case 'structure': {
      const path = memberPath(parentPath, value.name);
      return {
        id: rowId(tag, path),
        tag,
        name: path,
        depth,
        value: COMPOSITE_VALUE,
        forceMask: COMPOSITE_VALUE,
        dataType: value.dataType,
        description: firstCommentText(tag, path),
        topLevel: false,
        children: () => structureChildren(value, tag, path, depth + 1),
      };
    }
    case 'array': {
      const path = memberPath(parentPath, value.name);
      return {
        id: rowId(tag, path),
        tag,
        name: path,
        depth,
        value: COMPOSITE_VALUE,
        forceMask: COMPOSITE_VALUE,
        style: value.radix,
        dataType: formatDataType(value.dataType, value.dimensions),
        description: firstCommentText(tag, path),
        topLevel: false,
        children: () => arrayChildren(value, tag, path, depth + 1),
      };
    }
    case 'alarm':
      return {
        id: rowId(tag, `${parentPath}.${value.alarmType}`),
        tag,
        name: `${parentPath}.${value.alarmType}`,
        depth,
        value: COMPOSITE_VALUE,
        dataType: `${value.alarmType} alarm`,
        topLevel: false,
        children: [],
      };
  }
}

function decoratedValues(tag: NormalizedTag): NormalizedDecoratedTagValue[] {
  return (tag.data ?? []).flatMap((representation) => representation.values);
}

function scalarFallback(tag: NormalizedTag): string | undefined {
  const stringValue = (tag.data ?? [])
    .find((representation) => representation.format === 'String')?.text;
  const l5kValue = (tag.data ?? [])
    .find((representation) => representation.format === 'L5K')?.text;
  const value = stringValue ?? l5kValue ?? tag.value;
  return value === undefined ? undefined : String(value);
}

function arrayIndices(dimensions: number[]): number[][] {
  if (!dimensions.length) return [];
  let indices: number[][] = [[]];
  for (const dimension of dimensions) {
    const next: number[][] = [];
    for (const prefix of indices) {
      for (let index = 0; index < dimension; index += 1) next.push([...prefix, index]);
    }
    indices = next;
  }
  return indices;
}

function declaredMemberRows(
  members: readonly NormalizedDataTypeMember[],
  tag: NormalizedTag,
  path: string,
  depth: number,
  dataTypeMap: ReadonlyMap<string, NormalizedDataType>,
  ancestors: ReadonlySet<string>
): TagTableRow[] {
  return members
    .filter((member) => !member.hidden)
    .map((member) => declaredValueRow(
      member.name,
      member.dataType,
      member.dimensions ?? (member.dimension > 0 ? [member.dimension] : []),
      tag,
      path,
      depth,
      dataTypeMap,
      ancestors,
      member.description,
      member.radix,
      member.storageTarget ? 'BOOL' : undefined
    ));
}

function declaredValueRow(
  name: string | undefined,
  declaredDataType: string,
  dimensions: number[],
  tag: NormalizedTag,
  parentPath: string,
  depth: number,
  dataTypeMap: ReadonlyMap<string, NormalizedDataType>,
  ancestors: ReadonlySet<string>,
  description?: string,
  style?: string,
  displayDataType?: string
): TagTableRow {
  const path = name ? memberPath(parentPath, name) : parentPath;
  const dataType = dataTypeMap.get(declaredDataType);
  const isStructure = dataType !== undefined && !ATOMIC_DATA_TYPES.has(declaredDataType);
  const canExpandStructure = isStructure && !ancestors.has(declaredDataType);
  const nextAncestors = new Set(ancestors).add(declaredDataType);

  if (dimensions.length) {
    return {
      id: rowId(tag, path), tag, name: path, depth,
      value: COMPOSITE_VALUE,
      forceMask: COMPOSITE_VALUE,
      style,
      dataType: formatDataType(displayDataType ?? declaredDataType, dimensions),
      description: description ?? firstCommentText(tag, path),
      topLevel: false,
      children: () => arrayIndices(dimensions).map((index) => {
        const elementPath = indexPath(path, index);
        return {
          id: rowId(tag, elementPath), tag, name: elementPath, depth: depth + 1,
          value: canExpandStructure ? COMPOSITE_VALUE : undefined,
          forceMask: canExpandStructure ? COMPOSITE_VALUE : undefined,
          style,
          dataType: displayDataType ?? declaredDataType,
          description: firstCommentText(tag, elementPath),
          topLevel: false,
          children: canExpandStructure
            ? () => declaredMemberRows(
                dataType!.members, tag, elementPath, depth + 2, dataTypeMap, nextAncestors
              )
            : [],
        };
      }),
    };
  }

  return {
    id: rowId(tag, path), tag, name: path, depth,
    value: canExpandStructure ? COMPOSITE_VALUE : undefined,
    forceMask: canExpandStructure ? COMPOSITE_VALUE : undefined,
    style,
    dataType: displayDataType ?? declaredDataType,
    description: description ?? firstCommentText(tag, path),
    topLevel: false,
    children: canExpandStructure
      ? () => declaredMemberRows(dataType!.members, tag, path, depth + 1, dataTypeMap, nextAncestors)
      : [],
  };
}

function compareValues(left: unknown, right: unknown): number {
  if (typeof left === 'number' && typeof right === 'number') return left - right;
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function buildTagRow(
  tag: NormalizedTag,
  dataTypeMap: ReadonlyMap<string, NormalizedDataType>
): TagTableRow {
  const values = decoratedValues(tag);
  const primary = values.length === 1 ? values[0] : undefined;
  let children: TagTableRow[] | (() => TagTableRow[]) = [];
  let value = scalarFallback(tag);
  let forceMask = tag.forceData?.[0]?.value;
  let style = tag.radix;
  let dataType = formatDataType(tag.dataType, tag.dimensions);

  if (primary?.kind === 'atomic') {
    value = primary.value ?? value;
    forceMask = primary.forceValue ?? forceMask;
    style = primary.radix ?? style;
    dataType = primary.dataType ?? dataType;
  } else if (primary?.kind === 'structure') {
    value = COMPOSITE_VALUE;
    forceMask = COMPOSITE_VALUE;
    dataType = primary.dataType ?? dataType;
    children = () => structureChildren(primary, tag, tag.name, 1);
  } else if (primary?.kind === 'array') {
    value = COMPOSITE_VALUE;
    forceMask = COMPOSITE_VALUE;
    style = primary.radix ?? style;
    dataType = formatDataType(primary.dataType ?? tag.dataType, primary.dimensions);
    children = () => arrayChildren(primary, tag, tag.name, 1);
  } else if (values.length) {
    value = COMPOSITE_VALUE;
    children = () => values.map((item) => valueRow(item, tag, tag.name, 1));
  } else if (tag.dataType && dataTypeMap.has(tag.dataType)) {
    const declared = declaredValueRow(
      undefined,
      tag.dataType,
      tag.dimensions ?? [],
      tag,
      tag.name,
      0,
      dataTypeMap,
      new Set()
    );
    value = declared.value;
    forceMask = declared.forceMask;
    children = declared.children;
  }

  return {
    id: rowId(tag, tag.name),
    tag,
    name: tag.name,
    depth: 0,
    value,
    forceMask,
    style,
    dataType,
    description: tag.description,
    constant: tag.constant,
    topLevel: true,
    children,
  };
}

function rowMatches(row: TagTableRow, filter: string): boolean {
  return [row.name, row.value, row.forceMask, row.style, row.dataType, row.description]
    .some((value) => value?.toLowerCase().includes(filter));
}

function filterTree(row: TagTableRow, filter: string): TagTableRow | undefined {
  const children = childRows(row)
    .map((child) => filterTree(child, filter))
    .filter((child): child is TagTableRow => child !== undefined);
  if (!rowMatches(row, filter) && !children.length) return undefined;
  return { ...row, children: rowMatches(row, filter) ? row.children : children };
}

function flattenRows(
  rows: TagTableRow[],
  expanded: ReadonlySet<string>,
  forceExpanded: boolean
): TagTableRow[] {
  const result: TagTableRow[] = [];
  for (const row of rows) {
    result.push(row);
    if (forceExpanded || expanded.has(row.id)) {
      const children = childRows(row);
      if (children.length) result.push(...flattenRows(children, expanded, forceExpanded));
    }
  }
  return result;
}

function extraCell(tag: NormalizedTag, column: ColumnDefinition<NormalizedTag>): ReactNode {
  if (column.render) return column.render(tag);
  const value = (tag as unknown as Record<string, unknown>)[column.key];
  return value == null ? EMPTY_VALUE : String(value);
}

/**
 * Studio 5000-style tag grid with expandable structure and array rows.
 */
export function TagTable({
  tags,
  dataTypes = EMPTY_DATA_TYPES,
  className = '',
  onTagSelect,
  extraColumns = [],
  getRowStyle,
}: TagTableProps) {
  const [filter, setFilter] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortAscending, setSortAscending] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const dataTypeMap = useMemo(
    () => new Map(dataTypes.map((dataType) => [dataType.name, dataType])),
    [dataTypes]
  );
  const tagTrees = useMemo(() => tags.map((tag) => buildTagRow(tag, dataTypeMap)), [dataTypeMap, tags]);
  const normalizedFilter = filter.trim().toLowerCase();
  const filteredTrees = useMemo(() => {
    const matching = normalizedFilter
      ? tagTrees
          .map((row) => filterTree(row, normalizedFilter))
          .filter((row): row is TagTableRow => row !== undefined)
      : tagTrees;
    return [...matching].sort((left, right) => {
      const comparison = sortField === 'name'
        ? left.name.localeCompare(right.name)
        : compareValues(
            (left.tag as unknown as Record<string, unknown>)[sortField],
            (right.tag as unknown as Record<string, unknown>)[sortField]
          );
      return sortAscending ? comparison : -comparison;
    });
  }, [normalizedFilter, sortAscending, sortField, tagTrees]);
  const visibleRows = useMemo(
    () => flattenRows(filteredTrees, expanded, normalizedFilter.length > 0),
    [expanded, filteredTrees, normalizedFilter]
  );

  const toggleExpanded = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (field: string) => {
    if (sortField === field) setSortAscending((current) => !current);
    else {
      setSortField(field);
      setSortAscending(true);
    }
  };

  return (
    <div className={`tag-table-container ${className}`} style={tableStyles.wrapper}>
      <div style={tableStyles.filterContainer}>
        <input
          type="text"
          placeholder="Filter tags..."
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          style={tableStyles.filterInput}
        />
        <span style={tableStyles.countText}>
          {filteredTrees.length} of {tags.length} tags
        </span>
      </div>

      <div style={tableStyles.tableContainer}>
        <table style={tableStyles.table}>
          <thead style={tableStyles.stickyThead}>
            <tr>
              <th
                style={combineStyles(tableStyles.header, tableStyles.stickyHeader)}
                onClick={() => handleSort('name')}
              >
                Name {sortField === 'name' ? (sortAscending ? '▲' : '▼') : ''}
              </th>
              {['Value', 'Force Mask', 'Style', 'Data Type', 'Description', 'Constant'].map(
                (header) => (
                  <th
                    key={header}
                    style={combineStyles(
                      tableStyles.header,
                      tableStyles.stickyHeader,
                      { cursor: 'default' }
                    )}
                  >
                    {header}
                  </th>
                )
              )}
              {extraColumns.map((column) => {
                const sortable = column.sortable !== false;
                const field = String(column.sortKey ?? column.key);
                return (
                  <th
                    key={column.key}
                    style={combineStyles(
                      tableStyles.header,
                      tableStyles.stickyHeader,
                      !sortable ? { cursor: 'default' } : undefined,
                      column.headerStyle
                    )}
                    onClick={sortable ? () => handleSort(field) : undefined}
                  >
                    {column.header}
                    {sortField === field ? (sortAscending ? ' ▲' : ' ▼') : ''}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, index) => {
              const isExpanded = expanded.has(row.id);
              const hasChildren = typeof row.children === 'function' || row.children.length > 0;
              return (
                <tr
                  key={row.id}
                  data-tag-path={row.name}
                  data-tag-depth={row.depth}
                  style={combineStyles(
                    getDefaultRowStyle(index, !!onTagSelect),
                    getRowStyle?.(row.tag, index)
                  )}
                  onClick={() => onTagSelect?.(row.tag)}
                >
                  <td style={combineStyles(tableStyles.cell, tableStyles.monoCell)}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        paddingLeft: `${row.depth * 20}px`,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {hasChildren && !normalizedFilter ? (
                        <button
                          type="button"
                          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${row.name}`}
                          aria-expanded={isExpanded}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleExpanded(row.id);
                          }}
                          style={{
                            width: '18px',
                            padding: 0,
                            border: 0,
                            background: 'transparent',
                            color: 'inherit',
                            cursor: 'pointer',
                          }}
                        >
                          {isExpanded ? '▾' : '▸'}
                        </button>
                      ) : (
                        <span aria-hidden="true" style={{ display: 'inline-block', width: '18px' }} />
                      )}
                      <span>{row.name}</span>
                    </div>
                  </td>
                  <td style={combineStyles(tableStyles.cell, tableStyles.monoCell, { textAlign: 'right' })}>
                    {row.value ?? EMPTY_VALUE}
                  </td>
                  <td style={combineStyles(tableStyles.cell, tableStyles.monoCell, { textAlign: 'right' })}>
                    {row.forceMask ?? EMPTY_VALUE}
                  </td>
                  <td style={tableStyles.cell}>{row.style ?? EMPTY_VALUE}</td>
                  <td style={combineStyles(tableStyles.cell, tableStyles.monoCell)}>
                    {row.dataType ?? EMPTY_VALUE}
                  </td>
                  <td style={tableStyles.cell}>{row.description ?? EMPTY_VALUE}</td>
                  <td style={combineStyles(tableStyles.cell, { textAlign: 'center' })}>
                    {row.topLevel ? (
                      <input
                        type="checkbox"
                        aria-label={`Constant ${row.name}`}
                        checked={row.constant === true}
                        readOnly
                        disabled
                      />
                    ) : null}
                  </td>
                  {extraColumns.map((column) => (
                    <td
                      key={column.key}
                      style={combineStyles(
                        tableStyles.cell,
                        column.mono ? tableStyles.monoCell : undefined,
                        column.bold ? tableStyles.boldCell : undefined,
                        column.truncate ? tableStyles.truncatedCell : undefined,
                        column.cellStyle
                      )}
                    >
                      {extraCell(row.tag, column)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TagTable;
