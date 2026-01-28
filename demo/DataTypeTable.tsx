import React from 'react';
import type { DataType, DataTypeMember } from '../src/types';
import { GenericTable, type ColumnDefinition } from '../src/components/table/GenericTable';

export interface DataTypeTableProps {
  /** The data type to display */
  dataType: DataType;
  /** All data types for resolving nested types */
  allDataTypes: DataType[];
}

/**
 * Rockwell-style data type table component.
 * Displays data type members in Studio 5000's table format using GenericTable.
 */
export function DataTypeTable({ dataType }: DataTypeTableProps) {
  const getCategoryLabel = (typeClass: string, family?: string): string => {
    if (typeClass === 'User') return 'User Defined';
    if (family === 'StringFamily') return 'String Type';
    return 'Predefined';
  };

  const columns: ColumnDefinition<DataTypeMember>[] = [
    {
      key: 'name',
      header: 'Name',
      sortKey: 'name',
      mono: true,
      render: (member) => member.name,
    },
    {
      key: 'dataType',
      header: 'Data Type',
      sortKey: 'dataType',
      mono: true,
      render: (member) => member.dataType,
    },
    {
      key: 'dimension',
      header: 'Dim',
      sortKey: 'dimension',
      mono: true,
      cellStyle: { textAlign: 'center' },
      render: (member) => (member.dimension > 0 ? `[${member.dimension}]` : ''),
    },
    {
      key: 'radix',
      header: 'Style',
      sortKey: 'radix',
      render: (member) => member.radix || '-',
    },
    {
      key: 'externalAccess',
      header: 'External Access',
      sortKey: 'externalAccess',
      render: (member) => member.externalAccess || '-',
    },
    {
      key: 'hidden',
      header: 'Hidden',
      sortable: false,
      cellStyle: { textAlign: 'center' },
      render: (member) => (member.hidden ? 'Yes' : ''),
    },
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <span style={styles.typeName}>{dataType.name}</span>
          <span style={styles.typeBadge}>{getCategoryLabel(dataType.class, dataType.family)}</span>
        </div>
      </div>

      {/* Info Row */}
      <div style={styles.infoRow}>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>Family:</span>
          <span style={styles.infoValue}>{dataType.family}</span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>Class:</span>
          <span style={styles.infoValue}>{dataType.class}</span>
        </div>
        <div style={styles.infoItem}>
          <span style={styles.infoLabel}>Members:</span>
          <span style={styles.infoValue}>{dataType.members.length}</span>
        </div>
      </div>

      {/* Members Table */}
      {dataType.members.length > 0 ? (
        <GenericTable<DataTypeMember>
          data={dataType.members}
          columns={columns}
          getRowKey={(member) => member.name}
          filterFields={['name', 'dataType', 'radix', 'externalAccess']}
          defaultSortKey="name"
          filterPlaceholder="Filter members..."
          itemLabel="members"
        />
      ) : (
        <div style={styles.noMembers}>
          <p>This is a primitive data type with no member structure.</p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    fontSize: '13px',
  },
  header: {
    backgroundColor: '#f5f5f5',
    padding: '12px 16px',
    borderBottom: '1px solid #ddd',
    marginBottom: '0',
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  typeName: {
    fontSize: '16px',
    fontWeight: 600,
    fontFamily: 'monospace',
    color: '#333',
  },
  typeBadge: {
    fontSize: '10px',
    padding: '2px 8px',
    backgroundColor: '#2b579a',
    color: 'white',
    borderRadius: '3px',
    marginLeft: '8px',
  },
  infoRow: {
    display: 'flex',
    gap: '24px',
    padding: '10px 16px',
    backgroundColor: '#fafafa',
    borderBottom: '1px solid #eee',
  },
  infoItem: {
    display: 'flex',
    gap: '6px',
  },
  infoLabel: {
    color: '#666',
    fontSize: '12px',
  },
  infoValue: {
    fontWeight: 500,
    fontSize: '12px',
  },
  noMembers: {
    padding: '24px',
    textAlign: 'center',
    color: '#666',
    backgroundColor: '#fafafa',
    borderTop: '1px solid #eee',
  },
};

export default DataTypeTable;
