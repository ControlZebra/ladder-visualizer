import type { NormalizedTag } from '../types';
import { GenericTable, type ColumnDefinition } from './table';

export interface TagTableProps {
  /** Array of tags to display */
  tags: NormalizedTag[];
  /** Optional CSS class name */
  className?: string;
  /** Callback when a tag is selected */
  onTagSelect?: (tag: NormalizedTag) => void;
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
export function TagTable({ tags, className = '', onTagSelect }: TagTableProps) {
  return (
    <GenericTable<NormalizedTag>
      data={tags}
      columns={TAG_COLUMNS}
      getRowKey={(tag) => tag.name}
      filterFields={FILTER_FIELDS}
      defaultSortKey="name"
      className={`tag-table-container ${className}`}
      onRowSelect={onTagSelect}
      filterPlaceholder="Filter tags..."
      itemLabel="tags"
    />
  );
}

export default TagTable;
