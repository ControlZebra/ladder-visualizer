import React, { useMemo, useCallback } from 'react';
import type { DataType, DataTypeMember } from '../src/types';

export interface DataTypeTableProps {
  /** The data type to display */
  dataType: DataType;
  /** All data types for resolving nested types */
  allDataTypes: DataType[];
}

/**
 * Rockwell-style data type table component.
 * Displays data type members in Studio 5000's table format.
 */
export function DataTypeTable({ dataType, allDataTypes }: DataTypeTableProps) {
  // Memoize data type lookup map to avoid O(n) search for each member
  const dataTypeMap = useMemo(() => {
    const map = new Map<string, DataType>();
    for (const dt of allDataTypes) {
      map.set(dt.name, dt);
    }
    return map;
  }, [allDataTypes]);

  const getDataTypeIcon = useCallback((member: DataTypeMember) => {
    const type = member.dataType.toUpperCase();
    if (type === 'BOOL') return '🔘';
    if (type === 'DINT' || type === 'INT' || type === 'SINT' || type === 'LINT') return '🔢';
    if (type === 'REAL') return '📊';
    if (type.includes('STRING')) return '📝';
    const memberDataType = dataTypeMap.get(member.dataType);
    if (memberDataType && memberDataType.members.length > 0) return '📦';
    return '•';
  }, [dataTypeMap]);

  const renderMembers = (members: DataTypeMember[], indent: number = 0) => {
    return members.map((member, idx) => (
      <tr
        key={`${member.name}-${idx}`}
        style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}
      >
        <td style={{ ...styles.cell, ...styles.nameCell, paddingLeft: `${12 + indent * 16}px` }}>
          <span style={styles.icon}>{getDataTypeIcon(member)}</span>
          {member.name}
        </td>
        <td style={{ ...styles.cell, ...styles.typeCell }}>{member.dataType}</td>
        <td style={{ ...styles.cell, ...styles.dimCell }}>
          {member.dimension > 0 ? `[${member.dimension}]` : ''}
        </td>
        <td style={{ ...styles.cell, ...styles.radixCell }}>{member.radix}</td>
        <td style={{ ...styles.cell, ...styles.accessCell }}>{member.externalAccess}</td>
        <td style={{ ...styles.cell, ...styles.hiddenCell }}>
          {member.hidden ? '✓' : ''}
        </td>
      </tr>
    ));
  };

  const getCategoryLabel = (typeClass: string, family?: string): string => {
    if (typeClass === 'User') return 'User Defined';
    if (family === 'StringFamily') return 'String Type';
    return 'Predefined';
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <span style={styles.headerIcon}>📋</span>
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
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.headerCell, ...styles.nameCell }}>Name</th>
                <th style={{ ...styles.headerCell, ...styles.typeCell }}>Data Type</th>
                <th style={{ ...styles.headerCell, ...styles.dimCell }}>Dim</th>
                <th style={{ ...styles.headerCell, ...styles.radixCell }}>Style</th>
                <th style={{ ...styles.headerCell, ...styles.accessCell }}>External Access</th>
                <th style={{ ...styles.headerCell, ...styles.hiddenCell }}>Hidden</th>
              </tr>
            </thead>
            <tbody>
              {renderMembers(dataType.members)}
            </tbody>
          </table>
        </div>
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
  headerIcon: {
    fontSize: '18px',
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
  tableContainer: {
    overflow: 'auto',
    border: '1px solid #ddd',
    borderTop: 'none',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '12px',
  },
  headerCell: {
    padding: '8px 10px',
    textAlign: 'left',
    backgroundColor: '#e8e8e8',
    borderBottom: '2px solid #ccc',
    fontWeight: 600,
    color: '#333',
    whiteSpace: 'nowrap',
  },
  cell: {
    padding: '6px 10px',
    borderBottom: '1px solid #eee',
    verticalAlign: 'middle',
  },
  rowEven: {
    backgroundColor: '#fff',
  },
  rowOdd: {
    backgroundColor: '#fafafa',
  },
  nameCell: {
    minWidth: '180px',
    fontFamily: 'monospace',
  },
  typeCell: {
    minWidth: '120px',
    fontFamily: 'monospace',
    color: '#0066cc',
  },
  dimCell: {
    minWidth: '50px',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  radixCell: {
    minWidth: '80px',
  },
  accessCell: {
    minWidth: '100px',
  },
  hiddenCell: {
    minWidth: '60px',
    textAlign: 'center',
  },
  icon: {
    marginRight: '6px',
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
