import React from 'react';
import type {
  NormalizedDataType,
  NormalizedDataTypeMember,
} from '../types';
import { tableStyles } from './table/tableStyles';

export interface DataTypeTableProps {
  dataType: NormalizedDataType;
  allDataTypes?: NormalizedDataType[];
  onDataTypeSelect?: (dataType: NormalizedDataType) => void;
  className?: string;
}

export function DataTypeTable({
  dataType,
  allDataTypes = [],
  onDataTypeSelect,
  className = '',
}: DataTypeTableProps) {
  const renderTypeReference = (member: NormalizedDataTypeMember): React.ReactNode => {
    const target = allDataTypes.find(
      (candidate) => candidate.name === member.dataType && candidate.name !== dataType.name
    );
    if (!target || !onDataTypeSelect) return member.dataType;
    return (
      <button
        type="button"
        onClick={() => onDataTypeSelect(target)}
        style={styles.typeLink}
        title={`Open ${target.name}`}
      >
        {member.dataType}
      </button>
    );
  };

  return (
    <div className={className} style={styles.container}>
      <div style={styles.summary}>
        <h2 style={styles.title}>{dataType.name}</h2>
        {dataType.description ? <p style={styles.description}>{dataType.description}</p> : null}
      </div>

      {dataType.members.length ? (
        <div style={tableStyles.tableContainer}>
          <table style={tableStyles.table}>
            <thead style={tableStyles.stickyThead}>
              <tr>
                <Header>Name</Header>
                <Header>Data Type</Header>
                <Header>Description</Header>
              </tr>
            </thead>
            <tbody>
              {dataType.members.map((member, index) => (
                <tr key={`${member.name}-${index}`}>
                  <Cell mono>{member.name}</Cell>
                  <Cell mono>{renderTypeReference(member)}</Cell>
                  <Cell>{member.description ?? '—'}</Cell>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={styles.emptyState}>{emptyStateText(dataType)}</div>
      )}
    </div>
  );
}

function Header({ children }: { children: React.ReactNode }) {
  return <th style={{ ...tableStyles.header, ...tableStyles.stickyHeader }}>{children}</th>;
}

function Cell({ children, mono = false }: { children: React.ReactNode; mono?: boolean }) {
  return <td style={{ ...tableStyles.cell, ...(mono ? tableStyles.monoCell : {}) }}>{children}</td>;
}

function emptyStateText(dataType: NormalizedDataType): string {
  if (dataType.resolution === 'Atomic') return 'This is an atomic data type with no member structure.';
  if (dataType.resolution === 'Unresolved') {
    return 'This data type is referenced by the project, but its member structure is not included in the L5X export.';
  }
  return 'No members are defined for this data type.';
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
    height: '100%',
    gap: '12px',
    color: 'var(--lv-text-primary, #1e1e1e)',
    fontFamily: 'var(--lv-font-family, "Segoe UI", sans-serif)',
  },
  summary: {
    flexShrink: 0,
    padding: '12px',
    border: '1px solid var(--lv-border-default, #e0e0e0)',
    background: 'var(--lv-bg-secondary, #f5f5f5)',
  },
  title: { margin: 0, fontSize: '16px', fontWeight: 600 },
  description: { margin: '8px 0 0', color: 'var(--lv-text-secondary, #666666)' },
  typeLink: {
    padding: 0,
    border: 0,
    background: 'transparent',
    color: 'var(--ladder-power-rail-color, #3366cc)',
    cursor: 'pointer',
    font: 'inherit',
    textDecoration: 'underline',
  },
  emptyState: {
    padding: '24px',
    textAlign: 'center',
    color: 'var(--lv-text-secondary, #666666)',
    border: '1px solid var(--lv-border-default, #e0e0e0)',
    background: 'var(--lv-bg-secondary, #f5f5f5)',
  },
};

export default DataTypeTable;
