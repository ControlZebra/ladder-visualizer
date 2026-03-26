import type { CSSProperties } from 'react';
import type { NormalizedTag } from '../types';
import { GenericTable, type ColumnDefinition } from './table';

export interface TagTableProps {
  /** Array of tags to display */
  tags: NormalizedTag[];
  /** Optional CSS class name */
  className?: string;
  /** Callback when a tag is selected */
  onTagSelect?: (tag: NormalizedTag) => void;
  /** Additional columns appended to the default tag table */
  extraColumns?: ColumnDefinition<NormalizedTag>[];
  /** Optional row style override */
  getRowStyle?: (tag: NormalizedTag, index: number) => CSSProperties | undefined;
}

/** Column definitions for TagTable */
const TAG_COLUMNS: ColumnDefinition<NormalizedTag>[] = [
  {
    key: 'name',
    header: 'Name',
    mono: true,
  },
  {
    key: 'tagType',
    header: 'Type',
  },
  {
    key: 'dataType',
    header: 'Data Type',
    mono: true,
  },
  {
    key: 'radix',
    header: 'Style',
    render: (tag) => tag.radix ?? '-',
  },
  {
    key: 'externalAccess',
    header: 'Access',
    render: (tag) => tag.externalAccess ?? '-',
  },
];

/** Fields to include in filter search */
const FILTER_FIELDS: (keyof NormalizedTag)[] = ['name', 'dataType', 'tagType'];

/**
 * React component that renders a sortable, filterable table of PLC tags.
 */
export function TagTable({
  tags,
  className = '',
  onTagSelect,
  extraColumns,
  getRowStyle,
}: TagTableProps) {
  return (
    <GenericTable<NormalizedTag>
      data={tags}
      columns={extraColumns ? [...TAG_COLUMNS, ...extraColumns] : TAG_COLUMNS}
      getRowKey={(tag) => tag.name}
      filterFields={FILTER_FIELDS}
      defaultSortKey="name"
      className={`tag-table-container ${className}`}
      onRowSelect={onTagSelect}
      filterPlaceholder="Filter tags..."
      itemLabel="tags"
      getRowStyle={getRowStyle}
    />
  );
}

export default TagTable;
