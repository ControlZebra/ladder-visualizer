import React from 'react';
import type { Program, Routine } from '../types';

export interface ProgramNavigatorProps {
  /** Array of programs */
  programs: Program[];
  /** Currently selected routine */
  selectedRoutine?: { programIndex: number; routineIndex: number };
  /** Callback when a routine is selected */
  onRoutineSelect?: (programIndex: number, routineIndex: number, routine: Routine) => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * React component for navigating programs and routines.
 */
export function ProgramNavigator({
  programs,
  selectedRoutine,
  onRoutineSelect,
  className = '',
}: ProgramNavigatorProps) {
  const containerStyle: React.CSSProperties = {
    backgroundColor: '#fff',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    overflow: 'hidden',
  };

  const headerStyle: React.CSSProperties = {
    padding: '12px 16px',
    backgroundColor: '#f5f5f5',
    borderBottom: '1px solid #e0e0e0',
    fontWeight: 600,
    fontSize: '14px',
  };

  const programStyle: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: '#f9f9f9',
    fontWeight: 500,
    fontSize: '13px',
    borderBottom: '1px solid #eee',
  };

  const getRoutineStyle = (isSelected: boolean): React.CSSProperties => ({
    padding: '8px 16px 8px 32px',
    cursor: 'pointer',
    fontSize: '13px',
    backgroundColor: isSelected ? '#e3f2fd' : 'transparent',
    borderBottom: '1px solid #eee',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  });

  const badgeStyle: React.CSSProperties = {
    fontSize: '10px',
    padding: '2px 6px',
    backgroundColor: '#e0e0e0',
    borderRadius: '4px',
    color: '#666',
  };

  return (
    <div className={`program-navigator ${className}`} style={containerStyle}>
      <div style={headerStyle}>Programs & Routines</div>

      {programs.map((program, pIdx) => (
        <div key={pIdx}>
          <div style={programStyle}>Program {pIdx + 1}</div>

          {program.routines.map((routine, rIdx) => {
            const isSelected =
              selectedRoutine?.programIndex === pIdx && selectedRoutine?.routineIndex === rIdx;

            return (
              <div
                key={routine.name}
                style={getRoutineStyle(isSelected)}
                onClick={() => onRoutineSelect?.(pIdx, rIdx, routine)}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = '#f0f0f0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                <span>{routine.name}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <span style={badgeStyle}>{routine.type}</span>
                  <span style={badgeStyle}>{routine.rungs.length} rungs</span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default ProgramNavigator;
