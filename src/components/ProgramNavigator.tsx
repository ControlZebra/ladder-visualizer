import React, { useState, useMemo } from 'react';
import type { 
  NormalizedController,
  NormalizedProgram,
  NormalizedRoutine,
  NormalizedDataType,
  NormalizedAOI,
  NormalizedModule,
} from '../types';
import { navigatorDefaults, uiDefaults } from '../styles/cssDefaults';

// ============================================================================
// INTERNAL DISPLAY TYPES (for tree rendering)
// ============================================================================

interface DisplayProgram {
  name: string;
  routines: DisplayRoutine[];
  tagCount: number;
}

interface DisplayRoutine {
  name: string;
  type: string;
  rungCount: number;
}

interface DisplayDataType {
  name: string;
  family: string;
  cls: string;
}

interface DisplayController {
  name: string;
  tagCount: number;
  programs: DisplayProgram[];
  dataTypes: {
    userDefined: DisplayDataType[];
    strings: DisplayDataType[];
    addOnDefined: DisplayDataType[];
    predefined: DisplayDataType[];
    moduleDefined: DisplayDataType[];
  };
  moduleCount: number;
  aoiCount: number;
}

/**
 * Convert NormalizedController to display format
 */
function controllerToDisplay(controller: NormalizedController): DisplayController {
  const userDefined: DisplayDataType[] = [];
  const strings: DisplayDataType[] = [];
  const predefined: DisplayDataType[] = [];
  const addOnDefined: DisplayDataType[] = [];
  const moduleDefined: DisplayDataType[] = [];

  for (const dt of controller.dataTypes) {
    const display = { name: dt.name, family: dt.family || 'NoFamily', cls: dt.class };
    if (dt.class === 'User') {
      if (dt.name.includes(':')) {
        moduleDefined.push(display);
      } else {
        userDefined.push(display);
      }
    } else if (dt.class === 'AddOnDefined') {
      addOnDefined.push(display);
    } else {
      if (dt.family === 'StringFamily') {
        strings.push(display);
      } else {
        predefined.push(display);
      }
    }
  }

  return {
    name: controller.name,
    tagCount: controller.tags.length,
    programs: controller.programs.map(p => ({
      name: p.name,
      routines: p.routines.map(r => ({
        name: r.name,
        type: r.type,
        rungCount: r.rungs.length,
      })),
      tagCount: p.tags.length,
    })),
    dataTypes: { userDefined, strings, addOnDefined, predefined, moduleDefined },
    moduleCount: controller.modules.length,
    aoiCount: controller.aois.length,
  };
}

/**
 * Convert programs to display format
 */
function programsToDisplay(programs: NormalizedProgram[]): DisplayProgram[] {
  return programs.map(p => ({
    name: p.name,
    routines: p.routines.map(r => ({
      name: r.name,
      type: r.type,
      rungCount: r.rungs.length,
    })),
    tagCount: p.tags.length,
  }));
}

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
      <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" fill="#E8C872" stroke="#B8860B" strokeWidth="0.5"/>
      <circle cx="10" cy="9" r="2" fill="white" stroke="#B8860B" strokeWidth="0.5"/>
      <path d="M10 8V9.5L11 10" stroke="#B8860B" strokeWidth="0.5" strokeLinecap="round"/>
    </svg>
  ),
  taskOpen: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V7H4L2 12V4Z" fill="#E8C872" stroke="#B8860B" strokeWidth="0.5"/>
      <path d="M2 12L4 7H15L13 12H2Z" fill="#F5DEB3" stroke="#B8860B" strokeWidth="0.5"/>
      <circle cx="10" cy="10" r="2" fill="white" stroke="#B8860B" strokeWidth="0.5"/>
      <path d="M10 9V10.5L11 11" stroke="#B8860B" strokeWidth="0.5" strokeLinecap="round"/>
    </svg>
  ),
  program: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" fill="#E8C872" stroke="#B8860B" strokeWidth="0.5"/>
      <text x="8" y="11" textAnchor="middle" fontSize="6" fill="#6B4C00" fontWeight="bold">P</text>
    </svg>
  ),
  programOpen: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V7H4L2 12V4Z" fill="#E8C872" stroke="#B8860B" strokeWidth="0.5"/>
      <path d="M2 12L4 7H15L13 12H2Z" fill="#F5DEB3" stroke="#B8860B" strokeWidth="0.5"/>
      <text x="9" y="11" textAnchor="middle" fontSize="5" fill="#6B4C00" fontWeight="bold">P</text>
    </svg>
  ),
  // Ladder Logic (RLL) - yellow ladder icon
  routineRLL: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <line x1="4" y1="2" x2="4" y2="14" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="2" x2="12" y2="14" stroke="#B8860B" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="4" y1="4" x2="12" y2="4" stroke="#E8C872" strokeWidth="1.2"/>
      <line x1="4" y1="7" x2="12" y2="7" stroke="#E8C872" strokeWidth="1.2"/>
      <line x1="4" y1="10" x2="12" y2="10" stroke="#E8C872" strokeWidth="1.2"/>
      <line x1="4" y1="13" x2="12" y2="13" stroke="#E8C872" strokeWidth="1.2"/>
    </svg>
  ),
  // Structured Text (ST) - grey file icon
  routineST: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 2H10L13 5V14H4C3.44772 14 3 13.5523 3 13V3C3 2.44772 3.44772 2 4 2Z" fill="#E0E0E0" stroke="#888" strokeWidth="0.5"/>
      <path d="M10 2V5H13" fill="#C0C0C0" stroke="#888" strokeWidth="0.5"/>
      <line x1="5" y1="7" x2="11" y2="7" stroke="#666" strokeWidth="0.5"/>
      <line x1="5" y1="9" x2="11" y2="9" stroke="#666" strokeWidth="0.5"/>
      <line x1="5" y1="11" x2="9" y2="11" stroke="#666" strokeWidth="0.5"/>
    </svg>
  ),
  // Function Block Diagram (FBD) - flowchart icon
  routineFBD: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="4" rx="0.5" fill="#87CEEB" stroke="#4682B4" strokeWidth="0.5"/>
      <rect x="9" y="6" width="5" height="4" rx="0.5" fill="#87CEEB" stroke="#4682B4" strokeWidth="0.5"/>
      <rect x="2" y="10" width="5" height="4" rx="0.5" fill="#87CEEB" stroke="#4682B4" strokeWidth="0.5"/>
      <path d="M7 4H8.5V8H9" stroke="#4682B4" strokeWidth="0.8"/>
      <path d="M7 12H8.5V8" stroke="#4682B4" strokeWidth="0.8"/>
    </svg>
  ),
  // Sequential Function Chart (SFC) - step sequence icon
  routineSFC: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="5" y="2" width="6" height="3" fill="#98FB98" stroke="#228B22" strokeWidth="0.5"/>
      <line x1="8" y1="5" x2="8" y2="7" stroke="#228B22" strokeWidth="0.8"/>
      <rect x="6" y="7" width="4" height="1" fill="#228B22"/>
      <line x1="8" y1="8" x2="8" y2="9" stroke="#228B22" strokeWidth="0.8"/>
      <rect x="5" y="9" width="6" height="3" fill="#98FB98" stroke="#228B22" strokeWidth="0.5"/>
      <line x1="8" y1="12" x2="8" y2="14" stroke="#228B22" strokeWidth="0.8"/>
      <polygon points="6,14 10,14 8,15" fill="#228B22"/>
    </svg>
  ),
  tags: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 2L8 2L14 8L8 14L2 8L2 3C2 2.44772 2.44772 2 3 2Z" fill="#E8C872" stroke="#B8860B" strokeWidth="0.5"/>
      <circle cx="5" cy="5" r="1" fill="white"/>
    </svg>
  ),
  tag: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 3L8 3L13 8L8 13L3 8L3 4C3 3.44772 3.44772 3 4 3Z" fill="#E8C872" stroke="#B8860B" strokeWidth="0.5"/>
      <circle cx="5.5" cy="5.5" r="0.8" fill="white"/>
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
      <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V12C14 12.5523 13.5523 13 13 13H3C2.44772 13 2 12.5523 2 12V4Z" fill="#E8C872" stroke="#B8860B" strokeWidth="0.5"/>
      <text x="8" y="11" textAnchor="middle" fontSize="5" fill="#6B4C00" fontWeight="bold">AOI</text>
    </svg>
  ),
  aoiOpen: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4C2 3.44772 2.44772 3 3 3H6L7.5 5H13C13.5523 5 14 5.44772 14 6V7H4L2 12V4Z" fill="#E8C872" stroke="#B8860B" strokeWidth="0.5"/>
      <path d="M2 12L4 7H15L13 12H2Z" fill="#F5DEB3" stroke="#B8860B" strokeWidth="0.5"/>
      <text x="9" y="11" textAnchor="middle" fontSize="4" fill="#6B4C00" fontWeight="bold">AOI</text>
    </svg>
  ),
  description: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="1" fill="#F5F5DC" stroke="#A9A9A9" strokeWidth="0.5"/>
      <line x1="4" y1="5" x2="12" y2="5" stroke="#666" strokeWidth="0.5"/>
      <line x1="4" y1="7.5" x2="10" y2="7.5" stroke="#666" strokeWidth="0.5"/>
      <line x1="4" y1="10" x2="11" y2="10" stroke="#666" strokeWidth="0.5"/>
    </svg>
  ),
  input: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="4" width="12" height="8" rx="1" fill="#90EE90" stroke="#228B22" strokeWidth="0.5"/>
      <path d="M5 8L8 8M8 8L6 6M8 8L6 10" stroke="#228B22" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="11" y="10" fontSize="5" fill="#228B22" fontWeight="bold">I</text>
    </svg>
  ),
  output: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="4" width="12" height="8" rx="1" fill="#FFB6C1" stroke="#DC143C" strokeWidth="0.5"/>
      <path d="M8 8L11 8M11 8L9 6M11 8L9 10" stroke="#DC143C" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="5" y="10" fontSize="5" fill="#DC143C" fontWeight="bold">O</text>
    </svg>
  ),
  inout: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="4" width="12" height="8" rx="1" fill="#87CEEB" stroke="#4169E1" strokeWidth="0.5"/>
      <path d="M4 8L6 6M4 8L6 10M4 8L12 8M12 8L10 6M12 8L10 10" stroke="#4169E1" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
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

/**
 * Get the appropriate icon for a routine based on its type
 */
function getRoutineIcon(type: string): React.ReactNode {
  switch (type) {
    case 'RLL':
      return Icons.routineRLL;
    case 'ST':
      return Icons.routineST;
    case 'FBD':
      return Icons.routineFBD;
    case 'SFC':
      return Icons.routineSFC;
    default:
      return Icons.routineRLL; // Default to ladder logic
  }
}

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
    backgroundColor: isSelected 
      ? `var(--navigator-item-selected-bg, ${navigatorDefaults.itemSelectedBg})` 
      : isHovered 
        ? `var(--navigator-item-hover-bg, ${navigatorDefaults.itemHoverBg})` 
        : 'transparent',
    borderLeft: isSelected 
      ? `3px solid var(--navigator-item-selected-border, ${navigatorDefaults.itemSelectedBorder})` 
      : '3px solid transparent',
    fontSize: `var(--lv-font-size-base, ${uiDefaults.fontSizeBase})`,
    color: `var(--navigator-text, ${navigatorDefaults.text})`,
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
    fontSize: `var(--lv-font-size-sm, ${uiDefaults.fontSizeSm})`,
    padding: '1px 5px',
    backgroundColor: `var(--navigator-badge-bg, ${navigatorDefaults.badgeBg})`,
    borderRadius: '3px',
    color: `var(--navigator-badge-text, ${navigatorDefaults.badgeText})`,
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
  /** Controller data for full tree view */
  controller?: NormalizedController;
  /** Array of programs (fallback if no controller provided) */
  programs: NormalizedProgram[];
  /** Currently selected routine */
  selectedRoutine?: { programIndex: number; routineIndex: number };
  /** Currently selected AOI routine */
  selectedAOIRoutine?: { aoiName: string; routineIndex: number };
  /** Callback when a routine is selected */
  onRoutineSelect?: (programIndex: number, routineIndex: number, routine: NormalizedRoutine) => void;
  /** Callback when Controller Tags is selected */
  onControllerTagsSelect?: () => void;
  /** Callback when Program Tags is selected */
  onProgramTagsSelect?: (programIndex: number) => void;
  /** Callback when Controller info is selected (clicking controller node) */
  onControllerInfoSelect?: () => void;
  /** Callback when a data type is selected */
  onDataTypeSelect?: (dataType: NormalizedDataType) => void;
  /** Callback when an I/O module is selected */
  onModuleSelect?: (module: NormalizedModule) => void;
  /** Callback when AOI parameters are selected (to show in table) */
  onAOIParametersSelect?: (aoi: NormalizedAOI) => void;
  /** Callback when AOI local tags are selected (to show in table) */
  onAOILocalTagsSelect?: (aoi: NormalizedAOI) => void;
  /** Callback when an AOI routine is selected */
  onAOIRoutineSelect?: (aoi: NormalizedAOI, routineIndex: number, routine: NormalizedRoutine) => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * React component for navigating programs and routines in a Studio 5000-style tree.
 * 
 * Supports theming via CSS custom properties:
 * - `--navigator-bg`: Background color
 * - `--navigator-text`: Text color
 * - `--navigator-border`: Border color
 * - `--navigator-header-bg`: Header background color
 * - `--navigator-header-text`: Header text color
 * - `--navigator-header-border`: Header border color
 * - `--navigator-item-hover-bg`: Item hover background
 * - `--navigator-item-selected-bg`: Item selected background
 * - `--navigator-item-selected-border`: Item selected border color
 * - `--navigator-badge-bg`: Badge background color
 * - `--navigator-badge-text`: Badge text color
 * - `--lv-font-family`: Font family
 * - `--lv-font-size-base`: Base font size
 * - `--lv-font-size-sm`: Small font size (badges)
 */
export function ProgramNavigator({
  controller,
  programs,
  selectedRoutine,
  selectedAOIRoutine,
  onRoutineSelect,
  onControllerTagsSelect,
  onProgramTagsSelect,
  onControllerInfoSelect,
  onDataTypeSelect,
  onModuleSelect,
  onAOIParametersSelect,
  onAOILocalTagsSelect,
  onAOIRoutineSelect,
  className = '',
}: ProgramNavigatorProps) {
  // Convert to display format if provided
  const displayController = useMemo<DisplayController | null>(() => {
    if (!controller) return null;
    return controllerToDisplay(controller);
  }, [controller]);

  // Convert programs to display format
  const displayPrograms = useMemo<DisplayProgram[]>(() => {
    if (displayController) {
      return displayController.programs;
    }
    return programsToDisplay(programs);
  }, [displayController, programs]);

  // Expansion state for tree nodes - open all top-level folders by default
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(['controller', 'tasks', 'mainTask', 'aois', 'dataTypes', 'io'])
  );

  // Internal selection state for non-routine items
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

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

  // Helper to get original routine for callback
  const getOriginalRoutine = (programIndex: number, routineIndex: number): NormalizedRoutine | undefined => {
    const program = programs[programIndex];
    if (!program) return undefined;
    return program.routines[routineIndex];
  };

  // Helper to get original data type for callback
  const getOriginalDataType = (name: string): NormalizedDataType | undefined => {
    if (!controller) return undefined;
    return controller.dataTypes.find(dt => dt.name === name);
  };

  // Get data type categories from display controller
  const dataTypeCategories = displayController?.dataTypes ?? null;

  const containerStyle: React.CSSProperties = {
    backgroundColor: `var(--navigator-bg, ${navigatorDefaults.bg})`,
    border: `1px solid var(--navigator-border, ${navigatorDefaults.border})`,
    borderRadius: '0',
    fontFamily: `var(--lv-font-family, ${uiDefaults.fontFamily})`,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  };

  const treeContainerStyle: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    minHeight: 0,
  };

  const headerStyle: React.CSSProperties = {
    padding: '8px 12px',
    backgroundColor: `var(--navigator-header-bg, ${navigatorDefaults.headerBg})`,
    borderBottom: `1px solid var(--navigator-header-border, ${navigatorDefaults.headerBorder})`,
    fontWeight: 600,
    fontSize: `var(--lv-font-size-base, ${uiDefaults.fontSizeBase})`,
    color: `var(--navigator-header-text, ${navigatorDefaults.headerText})`,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  // Derive controller name from display controller or use default
  const controllerName = displayController?.name ?? 'Controller';

  return (
    <div className={`program-navigator ${className}`} style={containerStyle}>
      <div style={headerStyle}>
        <span>Controller Organizer</span>
      </div>

      <div style={treeContainerStyle}>
        <div style={{ padding: '4px 0' }}>
        {/* Controller - now at top level */}
        <TreeItem
          icon={expanded.has('controller') ? Icons.folderOpen : Icons.folder}
          label={`Controller ${controllerName}`}
          depth={0}
          isExpandable={true}
          isExpanded={expanded.has('controller')}
          isSelected={selectedItem === 'controller-info'}
          onToggle={() => toggleExpanded('controller')}
          onClick={() => {
            setSelectedItem('controller-info');
            onControllerInfoSelect?.();
          }}
        />

        {expanded.has('controller') && (
          <>
            {/* Controller Tags */}
            <TreeItem
              icon={Icons.tags}
              label="Controller Tags"
              depth={1}
              isSelected={selectedItem === 'controller-tags'}
              onClick={() => {
                setSelectedItem('controller-tags');
                onControllerTagsSelect?.();
              }}
            />
          </>
        )}

        {/* Tasks - now at top level */}
        <TreeItem
          icon={expanded.has('tasks') ? Icons.folderOpen : Icons.folder}
          label="Tasks"
          depth={0}
          isExpandable={true}
          isExpanded={expanded.has('tasks')}
          onToggle={() => toggleExpanded('tasks')}
        />

        {expanded.has('tasks') && (
          <>
            {/* MainTask */}
            <TreeItem
              icon={expanded.has('mainTask') ? Icons.taskOpen : Icons.task}
              label="MainTask"
              depth={1}
              isExpandable={true}
              isExpanded={expanded.has('mainTask')}
              onToggle={() => toggleExpanded('mainTask')}
            />

            {expanded.has('mainTask') && displayPrograms.map((program, pIdx) => {
              const programKey = `program-${pIdx}`;
              const programName = program.name;

              return (
                <React.Fragment key={programKey}>
                  <TreeItem
                    icon={expanded.has(programKey) ? Icons.programOpen : Icons.program}
                    label={programName}
                    depth={2}
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
                        depth={3}
                        isSelected={selectedItem === `program-tags-${pIdx}`}
                        onClick={() => {
                          setSelectedItem(`program-tags-${pIdx}`);
                          onProgramTagsSelect?.(pIdx);
                        }}
                      />

                      {/* Routines (sorted alphabetically) */}
                      {[...program.routines]
                        .map((routine, originalIdx) => ({ routine, originalIdx }))
                        .sort((a, b) => a.routine.name.localeCompare(b.routine.name))
                        .map(({ routine, originalIdx }) => {
                        const isRoutineSelected =
                          selectedRoutine?.programIndex === pIdx &&
                          selectedRoutine?.routineIndex === originalIdx;

                        return (
                          <TreeItem
                            key={routine.name}
                            icon={getRoutineIcon(routine.type)}
                            label={routine.name}
                            depth={3}
                            isSelected={isRoutineSelected || selectedItem === `routine-${pIdx}-${originalIdx}`}
                            onClick={() => {
                              setSelectedItem(`routine-${pIdx}-${originalIdx}`);
                              const originalRoutine = getOriginalRoutine(pIdx, originalIdx);
                              if (originalRoutine) {
                                onRoutineSelect?.(pIdx, originalIdx, originalRoutine);
                              }
                            }}
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
              depth={1}
              isExpandable={false}
            />
          </>
        )}

        {/* Motion Groups (unsupported) - now at top level */}
        <TreeItem
          icon={Icons.motionGroup}
          label="Motion Groups"
          depth={0}
        />

        {/* Add-On Instructions - now at top level */}
        <TreeItem
          icon={expanded.has('aois') ? Icons.folderOpen : Icons.folder}
          label="Add-On Instructions"
          depth={0}
          isExpandable={true}
          isExpanded={expanded.has('aois')}
          onToggle={() => toggleExpanded('aois')}
        />

        {expanded.has('aois') && controller && (
          controller.aois.map((aoi) => (
            <React.Fragment key={aoi.name}>
              <TreeItem
                icon={expanded.has(`aoi-${aoi.name}`) ? Icons.aoiOpen : Icons.aoi}
                label={aoi.name}
                depth={1}
                isExpandable={true}
                isExpanded={expanded.has(`aoi-${aoi.name}`)}
                onToggle={() => toggleExpanded(`aoi-${aoi.name}`)}
              />
              {expanded.has(`aoi-${aoi.name}`) && (
                <>
                  {/* AOI Description */}
                  {aoi.description && (
                    <TreeItem
                      icon={Icons.description}
                      label={aoi.description.length > 40 ? `${aoi.description.substring(0, 40)}...` : aoi.description}
                      depth={2}
                    />
                  )}
                  {/* Parameters */}
                  <TreeItem
                    icon={Icons.tags}
                    label="Parameters"
                    depth={2}
                    isSelected={selectedItem === `aoi-params-${aoi.name}`}
                    onClick={() => {
                      setSelectedItem(`aoi-params-${aoi.name}`);
                      onAOIParametersSelect?.(aoi);
                    }}
                  />
                  {/* Local Tags */}
                  <TreeItem
                    icon={Icons.tags}
                    label="Local Tags"
                    depth={2}
                    isSelected={selectedItem === `aoi-local-${aoi.name}`}
                    onClick={() => {
                      setSelectedItem(`aoi-local-${aoi.name}`);
                      onAOILocalTagsSelect?.(aoi);
                    }}
                  />
                  {/* Routines folder */}
                  <TreeItem
                    icon={expanded.has(`aoi-${aoi.name}-routines`) ? Icons.folderOpen : Icons.folder}
                    label="Routines"
                    depth={2}
                    isExpandable={aoi.routines.length > 0}
                    isExpanded={expanded.has(`aoi-${aoi.name}-routines`)}
                    onToggle={() => toggleExpanded(`aoi-${aoi.name}-routines`)}
                  />
                  {expanded.has(`aoi-${aoi.name}-routines`) && [...aoi.routines]
                    .map((routine, originalIdx) => ({ routine, originalIdx }))
                    .sort((a, b) => a.routine.name.localeCompare(b.routine.name))
                    .map(({ routine, originalIdx }) => {
                    const isAOIRoutineSelected = 
                      selectedAOIRoutine?.aoiName === aoi.name && 
                      selectedAOIRoutine?.routineIndex === originalIdx;
                    return (
                      <TreeItem
                        key={routine.name}
                        icon={getRoutineIcon(routine.type)}
                        label={routine.name}
                        depth={3}
                        isSelected={isAOIRoutineSelected || selectedItem === `aoi-routine-${aoi.name}-${originalIdx}`}
                        onClick={routine.type === 'RLL' ? () => {
                          setSelectedItem(`aoi-routine-${aoi.name}-${originalIdx}`);
                          onAOIRoutineSelect?.(aoi, originalIdx, routine);
                        } : undefined}
                      />
                    );
                  })}
                </>
              )}
            </React.Fragment>
          ))
        )}

        {/* Data Types - now at top level */}
        <TreeItem
          icon={expanded.has('dataTypes') ? Icons.folderOpen : Icons.folder}
          label="Data Types"
          depth={0}
          isExpandable={true}
          isExpanded={expanded.has('dataTypes')}
          onToggle={() => toggleExpanded('dataTypes')}
        />

        {expanded.has('dataTypes') && dataTypeCategories && (
          <>
            {/* User Defined */}
            <TreeItem
              icon={expanded.has('dt-user') ? Icons.folderOpen : Icons.folder}
              label="User Defined"
              depth={1}
              isExpandable={dataTypeCategories.userDefined.length > 0}
              isExpanded={expanded.has('dt-user')}
              onToggle={() => toggleExpanded('dt-user')}
            />
            {expanded.has('dt-user') && dataTypeCategories.userDefined.map((dt) => (
              <TreeItem
                key={dt.name}
                icon={Icons.dataType}
                label={dt.name}
                depth={2}
                isSelected={selectedItem === `dt-${dt.name}`}
                onClick={() => {
                  setSelectedItem(`dt-${dt.name}`);
                  const original = getOriginalDataType(dt.name);
                  if (original) onDataTypeSelect?.(original);
                }}
              />
            ))}

            {/* Strings */}
            <TreeItem
              icon={expanded.has('dt-string') ? Icons.folderOpen : Icons.folder}
              label="Strings"
              depth={1}
              isExpandable={dataTypeCategories.strings.length > 0}
              isExpanded={expanded.has('dt-string')}
              onToggle={() => toggleExpanded('dt-string')}
            />
            {expanded.has('dt-string') && dataTypeCategories.strings.map((dt) => (
              <TreeItem
                key={dt.name}
                icon={Icons.dataType}
                label={dt.name}
                depth={2}
                isSelected={selectedItem === `dt-${dt.name}`}
                onClick={() => {
                  setSelectedItem(`dt-${dt.name}`);
                  const original = getOriginalDataType(dt.name);
                  if (original) onDataTypeSelect?.(original);
                }}
              />
            ))}

            {/* Add-On Defined */}
            <TreeItem
              icon={expanded.has('dt-addon') ? Icons.folderOpen : Icons.folder}
              label="Add-On Defined"
              depth={1}
              isExpandable={dataTypeCategories.addOnDefined.length > 0}
              isExpanded={expanded.has('dt-addon')}
              onToggle={() => toggleExpanded('dt-addon')}
            />
            {expanded.has('dt-addon') && dataTypeCategories.addOnDefined.map((dt) => (
              <TreeItem
                key={dt.name}
                icon={Icons.dataType}
                label={dt.name}
                depth={2}
                isSelected={selectedItem === `dt-${dt.name}`}
                onClick={() => {
                  setSelectedItem(`dt-${dt.name}`);
                  const original = getOriginalDataType(dt.name);
                  if (original) onDataTypeSelect?.(original);
                }}
              />
            ))}

            {/* Predefined */}
            <TreeItem
              icon={expanded.has('dt-predefined') ? Icons.folderOpen : Icons.folder}
              label="Predefined"
              depth={1}
              isExpandable={dataTypeCategories.predefined.length > 0}
              isExpanded={expanded.has('dt-predefined')}
              onToggle={() => toggleExpanded('dt-predefined')}
            />
            {expanded.has('dt-predefined') && dataTypeCategories.predefined.map((dt) => (
              <TreeItem
                key={dt.name}
                icon={Icons.dataType}
                label={dt.name}
                depth={2}
                isSelected={selectedItem === `dt-${dt.name}`}
                onClick={() => {
                  setSelectedItem(`dt-${dt.name}`);
                  const original = getOriginalDataType(dt.name);
                  if (original) onDataTypeSelect?.(original);
                }}
              />
            ))}

            {/* Module Defined */}
            <TreeItem
              icon={expanded.has('dt-module') ? Icons.folderOpen : Icons.folder}
              label="Module Defined"
              depth={1}
              isExpandable={dataTypeCategories.moduleDefined.length > 0}
              isExpanded={expanded.has('dt-module')}
              onToggle={() => toggleExpanded('dt-module')}
            />
            {expanded.has('dt-module') && dataTypeCategories.moduleDefined.map((dt) => (
              <TreeItem
                key={dt.name}
                icon={Icons.dataType}
                label={dt.name}
                depth={2}
                isSelected={selectedItem === `dt-${dt.name}`}
                onClick={() => {
                  setSelectedItem(`dt-${dt.name}`);
                  const original = getOriginalDataType(dt.name);
                  if (original) onDataTypeSelect?.(original);
                }}
              />
            ))}
          </>
        )}

        {/* I/O Configuration - now at top level */}
        <TreeItem
          icon={Icons.io}
          label="I/O Configuration"
          depth={0}
          isExpandable={true}
          isExpanded={expanded.has('io')}
          onToggle={() => toggleExpanded('io')}
        />

        {expanded.has('io') && controller && (
          controller.modules.map((mod) => (
            <TreeItem
              key={mod.id}
              icon={Icons.ioModule}
              label={mod.catalogNumber ? `${mod.name} (${mod.catalogNumber})` : mod.name}
              depth={1}
              badge={mod.slot !== undefined ? `Slot ${mod.slot}` : undefined}
              isSelected={selectedItem === `io-module-${mod.id}`}
              onClick={() => {
                setSelectedItem(`io-module-${mod.id}`);
                onModuleSelect?.(mod);
              }}
            />
          ))
        )}
        </div>
      </div>
    </div>
  );
}

export default ProgramNavigator;
