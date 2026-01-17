import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  parseControllerExport,
  parseRoutine,
  VirtualizedLadderDiagram,
  TagTable,
  ControllerInfo,
  ProgramNavigator,
} from '../src';
import type { ControllerExport, Routine, ParsedRoutine, DataType } from '../src';
import { DataTypeTable } from './DataTypeTable';

// Import the sample data
import controllerData from '../examples/controller_output.json';

// Panel types for info panel (right side)
type InfoPanelType = 'controller-tags' | 'program-tags' | 'controller-info' | 'data-type' | null;

export default function App() {
  const [controller, setController] = useState<ControllerExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoutine, setSelectedRoutine] = useState<{
    programIndex: number;
    routineIndex: number;
  } | null>(null);
  const [selectedProgramIndex, setSelectedProgramIndex] = useState<number | null>(null);
  const [selectedDataType, setSelectedDataType] = useState<DataType | null>(null);
  const [infoPanelType, setInfoPanelType] = useState<InfoPanelType>(null);

  // Parse controller data on mount
  useEffect(() => {
    try {
      const parsed = parseControllerExport(controllerData);
      setController(parsed);
      // Select first routine by default
      if (parsed.programs.length > 0 && parsed.programs[0].routines.length > 0) {
        setSelectedRoutine({ programIndex: 0, routineIndex: 0 });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse controller data');
    }
  }, []);

  // Parse the selected routine
  const parsedRoutine: ParsedRoutine | null = useMemo(() => {
    if (!controller || !selectedRoutine) return null;
    const routine = controller.programs[selectedRoutine.programIndex]?.routines[selectedRoutine.routineIndex];
    if (!routine) return null;
    return parseRoutine(routine);
  }, [controller, selectedRoutine]);

  // Get program tags if viewing program tags - memoized to prevent recalculation
  const programTags = useMemo(() => {
    if (selectedProgramIndex === null || !controller) return [];
    return controller.programs[selectedProgramIndex]?.tags || [];
  }, [controller, selectedProgramIndex]);

  // Get program name
  const programName = useMemo(() => {
    if (selectedProgramIndex === null) return '';
    return selectedProgramIndex === 0 ? 'MainProgram' : `Program_${selectedProgramIndex + 1}`;
  }, [selectedProgramIndex]);

  const handleRoutineSelect = useCallback((programIndex: number, routineIndex: number, _routine: Routine) => {
    setSelectedRoutine({ programIndex, routineIndex });
    setInfoPanelType(null); // Close info panel when selecting a routine
  }, []);

  const handleControllerTagsSelect = useCallback(() => {
    setInfoPanelType('controller-tags');
  }, []);

  const handleProgramTagsSelect = useCallback((programIndex: number) => {
    setSelectedProgramIndex(programIndex);
    setInfoPanelType('program-tags');
  }, []);

  const handleControllerInfoSelect = useCallback(() => {
    setInfoPanelType('controller-info');
  }, []);

  const handleDataTypeSelect = useCallback((dataType: DataType) => {
    setSelectedDataType(dataType);
    setInfoPanelType('data-type');
  }, []);

  const closeInfoPanel = useCallback(() => {
    setInfoPanelType(null);
  }, []);

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h1 style={styles.errorTitle}>Error Loading Controller Data</h1>
        <p style={styles.errorMessage}>{error}</p>
      </div>
    );
  }

  if (!controller) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading controller data...</p>
      </div>
    );
  }

  // Render info panel content
  const renderInfoPanel = () => {
    if (!controller || !infoPanelType) return null;

    let title = '';
    let content: React.ReactNode = null;

    switch (infoPanelType) {
      case 'controller-tags':
        title = 'Controller Tags';
        content = <TagTable tags={controller.tags} />;
        break;
      case 'program-tags':
        title = `${programName} Tags`;
        content = programTags.length > 0 ? (
          <TagTable tags={programTags} />
        ) : (
          <p style={styles.noSelection}>No program-specific tags defined</p>
        );
        break;
      case 'controller-info':
        title = 'Controller Info';
        content = <ControllerInfo controller={controller} />;
        break;
      case 'data-type':
        if (selectedDataType) {
          title = `Data Type: ${selectedDataType.name}`;
          content = <DataTypeTable dataType={selectedDataType} allDataTypes={controller.data_types} />;
        }
        break;
    }

    return (
      <div style={styles.infoPanel}>
        <div style={styles.infoPanelHeader}>
          <span style={styles.infoPanelTitle}>{title}</span>
          <button 
            onClick={closeInfoPanel} 
            style={styles.closeButton}
            title="Close panel"
          >
            ×
          </button>
        </div>
        <div style={styles.infoPanelContent}>
          {content}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.app}>
      {/* Header - Studio 5000 style compact toolbar */}
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h1 style={styles.title}>Ladder Logic Visualizer</h1>
          <span style={styles.subtitle}>│ Allen-Bradley/Rockwell</span>
        </div>
        <div style={{ fontSize: '11px', opacity: 0.8 }}>
          {controller.modified_date && `Last Modified: ${controller.modified_date}`}
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.ladderLayout}>
          {/* Sidebar */}
          <aside style={styles.sidebar}>
            <ProgramNavigator
              controller={controller}
              programs={controller.programs}
              selectedRoutine={selectedRoutine ?? undefined}
              onRoutineSelect={handleRoutineSelect}
              onControllerTagsSelect={handleControllerTagsSelect}
              onProgramTagsSelect={handleProgramTagsSelect}
              onControllerInfoSelect={handleControllerInfoSelect}
              onDataTypeSelect={handleDataTypeSelect}
            />
          </aside>

          {/* Ladder Diagram - Main Content Area */}
          <div style={styles.diagramContainer}>
            {parsedRoutine ? (
              <>
                <div style={styles.routineTitle}>
                  <span style={{ fontWeight: 600 }}>{parsedRoutine.name}</span>
                  <span style={styles.routineBadge}>{parsedRoutine.type}</span>
                  <span style={styles.routineCount}>{parsedRoutine.rungs.length} rungs</span>
                </div>
                <div style={styles.ladderContent}>
                  <VirtualizedLadderDiagram
                    routine={parsedRoutine}
                    style={{ width: '100%', height: '100%' }}
                  />
                </div>
              </>
            ) : (
              <p style={styles.noSelection}>Select a routine from the Controller Organizer</p>
            )}
          </div>

          {/* Info Panel (slides in from right) */}
          {renderInfoPanel()}
        </div>
      </main>
    </div>
  );
}

// Studio 5000-inspired color scheme
const colors = {
  primary: '#2b579a',        // Deep blue (Studio 5000 accent)
  primaryDark: '#1e3f6f',    // Darker blue for header
  secondary: '#4a7c59',      // Green accent (for controller icon)
  background: '#e8e8e8',     // Light gray background
  surface: '#ffffff',        // White surface
  border: '#c0c0c0',         // Gray border
  text: '#333333',           // Dark text
  textLight: '#666666',      // Light text
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: '100vh',
    backgroundColor: colors.background,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    backgroundColor: colors.primaryDark,
    color: 'white',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `2px solid ${colors.primary}`,
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
  },
  subtitle: {
    margin: '0 0 0 12px',
    fontSize: '12px',
    opacity: 0.8,
  },
  main: {
    flex: 1,
    padding: '8px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  ladderLayout: {
    display: 'flex',
    gap: '8px',
    flex: 1,
    overflow: 'hidden',
  },
  sidebar: {
    width: '260px',
    flexShrink: 0,
    overflow: 'auto',
  },
  diagramContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0,
  },
  ladderContent: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
  },
  routineTitle: {
    margin: 0,
    padding: '8px 12px',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#f5f5f5',
    borderBottom: `1px solid ${colors.border}`,
    flexShrink: 0,
  },
  routineBadge: {
    fontSize: '10px',
    padding: '2px 6px',
    backgroundColor: colors.primary,
    color: 'white',
    borderRadius: '2px',
  },
  routineCount: {
    fontSize: '11px',
    color: colors.textLight,
    marginLeft: 'auto',
  },
  noSelection: {
    color: colors.textLight,
    textAlign: 'center',
    padding: '40px',
    fontSize: '13px',
  },
  infoPanel: {
    width: '350px',
    flexShrink: 0,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  infoPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: '#f5f5f5',
    borderBottom: `1px solid ${colors.border}`,
    flexShrink: 0,
  },
  infoPanelTitle: {
    fontWeight: 600,
    fontSize: '13px',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    color: colors.textLight,
    padding: '0 4px',
    lineHeight: 1,
  },
  infoPanelContent: {
    flex: 1,
    overflow: 'auto',
    padding: '12px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '14px',
    color: colors.textLight,
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    padding: '24px',
  },
  errorTitle: {
    color: '#d32f2f',
    marginBottom: '16px',
  },
  errorMessage: {
    color: colors.textLight,
    maxWidth: '600px',
    textAlign: 'center',
    fontSize: '13px',
  },
};
