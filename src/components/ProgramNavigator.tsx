import React, { useState, useMemo } from 'react';
import type { Program, Routine, ControllerExport, DataType } from '../types';

// ============================================================================
// SVG ICONS (Studio 5000 Style)
// ============================================================================

const Icons = {
  controller: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="1" fill="#4a7c59" stroke="#2d5016" strokeWidth="0.5"/>
      <rect x="4" y="5" width="2" height="2" fill="#90EE90"/>
      <rect x="7" y="5" width="2" height="2" fill="#FFD700"/>
      <rect x="10" y="5" width="2" height="2" fill="#FF6B6B"/>
      <rect x="4" y="9" width="8" height="2" rx="0.5" fill="#1a1a1a"/>
    </svg>
  ),
  folder: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" fill="#E8C872" stroke="#B8860B" strokeWidth="0.5"/>
    </svg>
  ),
  folderOpen: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V7H4L2 12V4Z" fill="#E8C872" stroke="#B8860B" strokeWidth="0.5"/>
      <path d="M2 12L4 7H15L13 12H2Z" fill="#F5DEB3" stroke="#B8860B" strokeWidth="0.5"/>
    </svg>
  ),
  task: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="2" width="10" height="12" rx="1" fill="#6B8DD6" stroke="#3B5998" strokeWidth="0.5"/>
      <path d="M5 5H11M5 8H11M5 11H9" stroke="white" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  ),
  program: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="1" fill="#9370DB" stroke="#6B4C9A" strokeWidth="0.5"/>
      <text x="8" y="11" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">P</text>
    </svg>
  ),
  routine: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="1" fill="#F5F5F5" stroke="#888" strokeWidth="0.5"/>
      <line x1="4" y1="6" x2="8" y2="6" stroke="#333" strokeWidth="1"/>
      <line x1="10" y1="6" x2="12" y2="6" stroke="#333" strokeWidth="1"/>
      <circle cx="11" cy="9" r="1.5" fill="none" stroke="#333" strokeWidth="0.8"/>
      <line x1="4" y1="9" x2="8" y2="9" stroke="#333" strokeWidth="1"/>
    </svg>
  ),
  tags: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 2L8 2L14 8L8 14L2 8L2 3C2 2.44772 2.44772 2 3 2Z" fill="#20B2AA" stroke="#008080" strokeWidth="0.5"/>
      <circle cx="5" cy="5" r="1" fill="white"/>
    </svg>
  ),
  dataTypes: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="1" fill="#FFA07A" stroke="#CD5C5C" strokeWidth="0.5"/>
      <text x="8" y="11" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">DT</text>
    </svg>
  ),
  dataType: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="3" width="10" height="10" rx="1" fill="#FFE4C4" stroke="#DEB887" strokeWidth="0.5"/>
      <text x="8" y="10" textAnchor="middle" fontSize="6" fill="#8B4513" fontWeight="bold">T</text>
    </svg>
  ),
  io: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="1" fill="#708090" stroke="#2F4F4F" strokeWidth="0.5"/>
      <circle cx="5" cy="6" r="1" fill="#90EE90"/>
      <circle cx="8" cy="6" r="1" fill="#90EE90"/>
      <circle cx="11" cy="6" r="1" fill="#FFD700"/>
      <rect x="4" y="9" width="2" height="2" fill="#333"/>
      <rect x="7" y="9" width="2" height="2" fill="#333"/>
      <rect x="10" y="9" width="2" height="2" fill="#333"/>
    </svg>
  ),
  ioModule: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="4" width="10" height="8" rx="1" fill="#B0C4DE" stroke="#4682B4" strokeWidth="0.5"/>
      <circle cx="6" cy="7" r="1" fill="#32CD32"/>
      <circle cx="10" cy="7" r="1" fill="#32CD32"/>
      <rect x="5" y="9" width="2" height="2" fill="#333"/>
      <rect x="9" y="9" width="2" height="2" fill="#333"/>
    </svg>
  ),
  motionGroup: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5" fill="#87CEEB" stroke="#4169E1" strokeWidth="0.5"/>
      <path d="M8 5V8L10 10" stroke="#4169E1" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  ),
  aoi: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="2" fill="#DDA0DD" stroke="#9932CC" strokeWidth="0.5"/>
      <text x="8" y="11" textAnchor="middle" fontSize="7" fill="#4B0082" fontWeight="bold">AOI</text>
    </svg>
  ),
  chevronRight: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M4 2L8 6L4 10" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  chevronDown: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 4L6 8L10 4" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
};

// ============================================================================
// TREE ITEM COMPONENT
// ============================================================================

interface TreeItemProps {
  icon: React.ReactNode;
  label: string;
  depth: number;
  isExpanded?: boolean;
  isExpandable?: boolean;
  isSelected?: boolean;
  badge?: string;
  onClick?: () => void;
  onToggle?: () => void;
}

function TreeItem({
  icon,
  label,
  depth,
  isExpanded,
  isExpandable,
  isSelected,
  badge,
  onClick,
  onToggle,
}: TreeItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    padding: '4px 8px',
    paddingLeft: `${8 + depth * 16}px`,
    cursor: onClick ? 'pointer' : 'default',
    backgroundColor: isSelected ? '#cce5ff' : isHovered ? '#f0f0f0' : 'transparent',
    borderLeft: isSelected ? '3px solid #0066cc' : '3px solid transparent',
    fontSize: '12px',
    userSelect: 'none',
    minHeight: '24px',
  };

  const chevronStyle: React.CSSProperties = {
    width: '16px',
    height: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '2px',
    cursor: isExpandable ? 'pointer' : 'default',
  };

  const iconStyle: React.CSSProperties = {
    marginRight: '6px',
    display: 'flex',
    alignItems: 'center',
  };

  const labelStyle: React.CSSProperties = {
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const badgeStyle: React.CSSProperties = {
    fontSize: '10px',
    padding: '1px 5px',
    backgroundColor: '#e0e0e0',
    borderRadius: '3px',
    color: '#666',
    marginLeft: '8px',
  };

  return (
    <div
      style={itemStyle}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={chevronStyle}
        onClick={(e) => {
          if (isExpandable && onToggle) {
            e.stopPropagation();
            onToggle();
          }
        }}
      >
        {isExpandable && (isExpanded ? Icons.chevronDown : Icons.chevronRight)}
      </div>
      <div style={iconStyle}>{icon}</div>
      <span style={labelStyle}>{label}</span>
      {badge && <span style={badgeStyle}>{badge}</span>}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export interface ProgramNavigatorProps {
  /** Controller export data for full tree view */
  controller?: ControllerExport;
  /** Array of programs (fallback if no controller provided) */
  programs: Program[];
  /** Currently selected routine */
  selectedRoutine?: { programIndex: number; routineIndex: number };
  /** Callback when a routine is selected */
  onRoutineSelect?: (programIndex: number, routineIndex: number, routine: Routine) => void;
  /** Callback when Controller Tags is selected */
  onControllerTagsSelect?: () => void;
  /** Callback when Program Tags is selected */
  onProgramTagsSelect?: (programIndex: number) => void;
  /** Callback when Controller info is selected (clicking controller node) */
  onControllerInfoSelect?: () => void;
  /** Callback when a data type is selected */
  onDataTypeSelect?: (dataType: DataType) => void;
  /** Callback when an I/O device is selected */
  onIODeviceSelect?: (deviceId: number) => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * React component for navigating programs and routines in a Studio 5000-style tree.
 */
export function ProgramNavigator({
  controller,
  programs,
  selectedRoutine,
  onRoutineSelect,
  onControllerTagsSelect,
  onProgramTagsSelect,
  onControllerInfoSelect,
  onDataTypeSelect,
  onIODeviceSelect,
  className = '',
}: ProgramNavigatorProps) {
  // Expansion state for tree nodes
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(['controller', 'tasks', 'mainTask', 'program-0'])
  );

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Categorize data types
  const dataTypeCategories = useMemo(() => {
    if (!controller) return null;
    
    const userDefined: DataType[] = [];
    const strings: DataType[] = [];
    const predefined: DataType[] = [];
    const addOnDefined: DataType[] = [];
    const moduleDefined: DataType[] = [];

    for (const dt of controller.data_types) {
      if (dt.cls === 'User') {
        // Check if it's a module-defined type (contains colon like "AB:1769_IF4:I:0")
        if (dt.name.includes(':')) {
          moduleDefined.push(dt);
        } else {
          userDefined.push(dt);
        }
      } else {
        // ProductDefined
        if (dt.family === 'StringFamily') {
          strings.push(dt);
        } else {
          predefined.push(dt);
        }
      }
    }

    return { userDefined, strings, addOnDefined, predefined, moduleDefined };
  }, [controller]);

  const containerStyle: React.CSSProperties = {
    backgroundColor: '#fafafa',
    border: '1px solid #c0c0c0',
    borderRadius: '0',
    overflow: 'auto',
    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
    height: '100%',
  };

  const headerStyle: React.CSSProperties = {
    padding: '8px 12px',
    backgroundColor: '#e8e8e8',
    borderBottom: '1px solid #c0c0c0',
    fontWeight: 600,
    fontSize: '12px',
    color: '#333',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  // Derive controller name from serial number or use default
  const controllerName = controller?.serial_number 
    ? `Controller_${controller.serial_number.replace('16#', '').replace(/_/g, '')}`
    : 'Controller';

  return (
    <div className={`program-navigator ${className}`} style={containerStyle}>
      <div style={headerStyle}>
        <span>Controller Organizer</span>
      </div>

      <div style={{ padding: '4px 0' }}>
        {/* Controller Root */}
        <TreeItem
          icon={Icons.controller}
          label={controllerName}
          depth={0}
          isExpandable={true}
          isExpanded={expanded.has('controller')}
          onToggle={() => toggleExpanded('controller')}
          onClick={onControllerInfoSelect}
        />

        {expanded.has('controller') && (
          <>
            {/* Controller Tags */}
            <TreeItem
              icon={Icons.tags}
              label="Controller Tags"
              depth={1}
              badge={controller ? `${controller.tags.length}` : undefined}
              onClick={onControllerTagsSelect}
            />

            {/* Tasks */}
            <TreeItem
              icon={expanded.has('tasks') ? Icons.folderOpen : Icons.folder}
              label="Tasks"
              depth={1}
              isExpandable={true}
              isExpanded={expanded.has('tasks')}
              onToggle={() => toggleExpanded('tasks')}
            />

            {expanded.has('tasks') && (
              <>
                {/* MainTask */}
                <TreeItem
                  icon={Icons.task}
                  label="MainTask"
                  depth={2}
                  isExpandable={true}
                  isExpanded={expanded.has('mainTask')}
                  onToggle={() => toggleExpanded('mainTask')}
                />

                {expanded.has('mainTask') && programs.map((program, pIdx) => {
                  const programKey = `program-${pIdx}`;
                  const programName = pIdx === 0 ? 'MainProgram' : `Program_${pIdx + 1}`;

                  return (
                    <React.Fragment key={programKey}>
                      <TreeItem
                        icon={Icons.program}
                        label={programName}
                        depth={3}
                        isExpandable={true}
                        isExpanded={expanded.has(programKey)}
                        onToggle={() => toggleExpanded(programKey)}
                      />

                      {expanded.has(programKey) && (
                        <>
                          {/* Program Tags */}
                          <TreeItem
                            icon={Icons.tags}
                            label="Program Tags"
                            depth={4}
                            onClick={() => onProgramTagsSelect?.(pIdx)}
                          />

                          {/* Routines */}
                          {program.routines.map((routine, rIdx) => {
                            const isSelected =
                              selectedRoutine?.programIndex === pIdx &&
                              selectedRoutine?.routineIndex === rIdx;

                            return (
                              <TreeItem
                                key={routine.name}
                                icon={Icons.routine}
                                label={routine.name}
                                depth={4}
                                isSelected={isSelected}
                                badge={`${routine.rungs.length}`}
                                onClick={() => onRoutineSelect?.(pIdx, rIdx, routine)}
                              />
                            );
                          })}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}

                {/* Unscheduled Programs */}
                <TreeItem
                  icon={expanded.has('unscheduled') ? Icons.folderOpen : Icons.folder}
                  label="Unscheduled"
                  depth={2}
                  isExpandable={false}
                />
              </>
            )}

            {/* Motion Groups (unsupported) */}
            <TreeItem
              icon={Icons.motionGroup}
              label="Motion Groups"
              depth={1}
              badge="Unsupported"
            />

            {/* Add-On Instructions */}
            <TreeItem
              icon={expanded.has('aois') ? Icons.folderOpen : Icons.folder}
              label="Add-On Instructions"
              depth={1}
              isExpandable={true}
              isExpanded={expanded.has('aois')}
              onToggle={() => toggleExpanded('aois')}
              badge={controller?.aois ? `${controller.aois.length}` : '0'}
            />

            {expanded.has('aois') && controller?.aois?.map((aoi) => (
              <TreeItem
                key={aoi.name}
                icon={Icons.aoi}
                label={aoi.name}
                depth={2}
              />
            ))}

            {/* Data Types */}
            <TreeItem
              icon={expanded.has('dataTypes') ? Icons.folderOpen : Icons.folder}
              label="Data Types"
              depth={1}
              isExpandable={true}
              isExpanded={expanded.has('dataTypes')}
              onToggle={() => toggleExpanded('dataTypes')}
              badge={controller ? `${controller.data_types.length}` : undefined}
            />

            {expanded.has('dataTypes') && dataTypeCategories && (
              <>
                {/* User Defined */}
                <TreeItem
                  icon={expanded.has('dt-user') ? Icons.folderOpen : Icons.folder}
                  label="User Defined"
                  depth={2}
                  isExpandable={dataTypeCategories.userDefined.length > 0}
                  isExpanded={expanded.has('dt-user')}
                  onToggle={() => toggleExpanded('dt-user')}
                  badge={`${dataTypeCategories.userDefined.length}`}
                />
                {expanded.has('dt-user') && dataTypeCategories.userDefined.map((dt) => (
                  <TreeItem
                    key={dt.name}
                    icon={Icons.dataType}
                    label={dt.name}
                    depth={3}
                    onClick={() => onDataTypeSelect?.(dt)}
                  />
                ))}

                {/* Strings */}
                <TreeItem
                  icon={expanded.has('dt-string') ? Icons.folderOpen : Icons.folder}
                  label="Strings"
                  depth={2}
                  isExpandable={dataTypeCategories.strings.length > 0}
                  isExpanded={expanded.has('dt-string')}
                  onToggle={() => toggleExpanded('dt-string')}
                  badge={`${dataTypeCategories.strings.length}`}
                />
                {expanded.has('dt-string') && dataTypeCategories.strings.map((dt) => (
                  <TreeItem
                    key={dt.name}
                    icon={Icons.dataType}
                    label={dt.name}
                    depth={3}
                    onClick={() => onDataTypeSelect?.(dt)}
                  />
                ))}

                {/* Add-On Defined */}
                <TreeItem
                  icon={expanded.has('dt-addon') ? Icons.folderOpen : Icons.folder}
                  label="Add-On Defined"
                  depth={2}
                  isExpandable={dataTypeCategories.addOnDefined.length > 0}
                  isExpanded={expanded.has('dt-addon')}
                  onToggle={() => toggleExpanded('dt-addon')}
                  badge={`${dataTypeCategories.addOnDefined.length}`}
                />
                {expanded.has('dt-addon') && dataTypeCategories.addOnDefined.map((dt) => (
                  <TreeItem
                    key={dt.name}
                    icon={Icons.dataType}
                    label={dt.name}
                    depth={3}
                    onClick={() => onDataTypeSelect?.(dt)}
                  />
                ))}

                {/* Predefined */}
                <TreeItem
                  icon={expanded.has('dt-predefined') ? Icons.folderOpen : Icons.folder}
                  label="Predefined"
                  depth={2}
                  isExpandable={dataTypeCategories.predefined.length > 0}
                  isExpanded={expanded.has('dt-predefined')}
                  onToggle={() => toggleExpanded('dt-predefined')}
                  badge={`${dataTypeCategories.predefined.length}`}
                />
                {expanded.has('dt-predefined') && dataTypeCategories.predefined.map((dt) => (
                  <TreeItem
                    key={dt.name}
                    icon={Icons.dataType}
                    label={dt.name}
                    depth={3}
                    onClick={() => onDataTypeSelect?.(dt)}
                  />
                ))}

                {/* Module Defined */}
                <TreeItem
                  icon={expanded.has('dt-module') ? Icons.folderOpen : Icons.folder}
                  label="Module Defined"
                  depth={2}
                  isExpandable={dataTypeCategories.moduleDefined.length > 0}
                  isExpanded={expanded.has('dt-module')}
                  onToggle={() => toggleExpanded('dt-module')}
                  badge={`${dataTypeCategories.moduleDefined.length}`}
                />
                {expanded.has('dt-module') && dataTypeCategories.moduleDefined.map((dt) => (
                  <TreeItem
                    key={dt.name}
                    icon={Icons.dataType}
                    label={dt.name}
                    depth={3}
                    onClick={() => onDataTypeSelect?.(dt)}
                  />
                ))}
              </>
            )}

            {/* I/O Configuration */}
            <TreeItem
              icon={Icons.io}
              label="I/O Configuration"
              depth={1}
              isExpandable={true}
              isExpanded={expanded.has('io')}
              onToggle={() => toggleExpanded('io')}
              badge={controller ? `${controller.map_devices.length}` : undefined}
            />

            {expanded.has('io') && controller?.map_devices.map((device) => (
              <TreeItem
                key={device.module_id}
                icon={Icons.ioModule}
                label={`Slot ${device.slot_no} - Module ${device.module_id}`}
                depth={2}
                onClick={() => onIODeviceSelect?.(device.module_id)}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default ProgramNavigator;
