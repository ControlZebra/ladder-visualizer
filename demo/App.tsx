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

type ViewType = 'ladder' | 'controller-tags' | 'program-tags' | 'controller-info' | 'data-type';

export default function App() {
  const [controller, setController] = useState<ControllerExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewType>('ladder');
  const [selectedRoutine, setSelectedRoutine] = useState<{
    programIndex: number;
    routineIndex: number;
  } | null>(null);
  const [selectedProgramIndex, setSelectedProgramIndex] = useState<number | null>(null);
  const [selectedDataType, setSelectedDataType] = useState<DataType | null>(null);

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

  // Consolidated state reset helper to reduce repetition
  const resetSelectionState = useCallback(() => {
    setSelectedRoutine(null);
    setSelectedDataType(null);
  }, []);

  const handleRoutineSelect = useCallback((programIndex: number, routineIndex: number, _routine: Routine) => {
    setSelectedRoutine({ programIndex, routineIndex });
    setCurrentView('ladder');
  }, []);

  const handleControllerTagsSelect = useCallback(() => {
    resetSelectionState();
    setCurrentView('controller-tags');
  }, [resetSelectionState]);

  const handleProgramTagsSelect = useCallback((programIndex: number) => {
    resetSelectionState();
    setSelectedProgramIndex(programIndex);
    setCurrentView('program-tags');
  }, [resetSelectionState]);

  const handleControllerInfoSelect = useCallback(() => {
    resetSelectionState();
    setCurrentView('controller-info');
  }, [resetSelectionState]);

  const handleDataTypeSelect = useCallback((dataType: DataType) => {
    setSelectedRoutine(null);
    setSelectedDataType(dataType);
    setCurrentView('data-type');
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

  // Get program tags if viewing program tags - memoized to prevent recalculation
  const programTags = useMemo(() => {
    if (selectedProgramIndex === null) return [];
    return controller.programs[selectedProgramIndex]?.tags || [];
  }, [controller.programs, selectedProgramIndex]);

  const renderContent = () => {
    switch (currentView) {
      case 'controller-tags':
        return (
          <div style={styles.contentPanel}>
            <h2 style={styles.sectionTitle}>Controller Tags</h2>
            <TagTable tags={controller.tags} />
          </div>
        );

      case 'program-tags':
        const programName = selectedProgramIndex === 0 ? 'MainProgram' : `Program_${(selectedProgramIndex || 0) + 1}`;
        return (
          <div style={styles.contentPanel}>
            <h2 style={styles.sectionTitle}>{programName} Tags</h2>
            {programTags.length > 0 ? (
              <TagTable tags={programTags} />
            ) : (
              <p style={styles.noSelection}>No program-specific tags defined</p>
            )}
          </div>
        );

      case 'controller-info':
        return (
          <div style={styles.contentPanel}>
            <ControllerInfo controller={controller} />
          </div>
        );

      case 'data-type':
        return selectedDataType ? (
          <div style={styles.contentPanel}>
            <DataTypeTable dataType={selectedDataType} allDataTypes={controller.data_types} />
          </div>
        ) : (
          <div style={styles.contentPanel}>
            <p style={styles.noSelection}>Select a data type from the Controller Organizer</p>
          </div>
        );

      case 'ladder':
      default:
        return parsedRoutine ? (
          <>
            <div style={styles.routineTitle}>
              <span style={{ fontWeight: 600 }}>{parsedRoutine.name}</span>
              <span style={styles.routineBadge}>{parsedRoutine.type}</span>
              <span style={styles.routineCount}>{parsedRoutine.rungs.length} rungs</span>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <VirtualizedLadderDiagram
                routine={parsedRoutine}
                height={500}
                style={{ width: '100%', minHeight: '100%' }}
              />
            </div>
          </>
        ) : (
          <p style={styles.noSelection}>Select a routine from the Controller Organizer</p>
        );
    }
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

          {/* Content Area */}
          <div style={styles.diagramContainer}>
            {renderContent()}
          </div>
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
  },
  header: {
    backgroundColor: colors.primaryDark,
    color: 'white',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: `2px solid ${colors.primary}`,
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
    padding: '8px',
    height: 'calc(100vh - 50px)',
    overflow: 'hidden',
  },
  ladderLayout: {
    display: 'flex',
    gap: '8px',
    height: '100%',
  },
  sidebar: {
    width: '280px',
    flexShrink: 0,
    overflow: 'auto',
  },
  diagramContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    border: `1px solid ${colors.border}`,
    overflow: 'auto',
    display: 'flex',
    flexDirection: 'column',
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
  contentPanel: {
    backgroundColor: colors.surface,
    padding: '16px',
    border: `1px solid ${colors.border}`,
    height: '100%',
    overflow: 'auto',
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: '12px',
    fontSize: '14px',
    fontWeight: 600,
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
