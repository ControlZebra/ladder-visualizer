import { StrictMode, useCallback, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { FBDDiagram, parseString, DARK_THEME, DEFAULT_THEME } from '../src';
import type { FBDDiagramDiagnostic, NormalizedFBDBody } from '../src';
import '../src/styles/index.css';
import './fbd.css';
import levelControlFixture from '../tests/fixtures/l5x/fbd-level-control-v35.L5X?raw';
import elementFixture from '../tests/fixtures/l5x/fbd-render-elements-v35.L5X?raw';
import { withFunctionElement } from '../tests/fixtures/fbdRenderElements';

type FixtureId = 'level-control' | 'elements';
type ThemeId = 'light' | 'dark';

function fixtureBody(fixture: FixtureId): NormalizedFBDBody {
  const source = fixture === 'elements' ? withFunctionElement(elementFixture) : levelControlFixture;
  const routineName = fixture === 'elements' ? 'Elements' : 'MainFBD';
  const result = parseString(source, 'l5x');
  const body = result.data?.programs[0]?.routines.find(
    (routine) => routine.name === routineName,
  )?.fbd;
  if (!body) throw new Error(`The ${routineName} fixture did not produce an FBD body.`);
  return body;
}

function Preview() {
  const [fixture, setFixture] = useState<FixtureId>('level-control');
  const [sheetIndex, setSheetIndex] = useState(0);
  const [themeId, setThemeId] = useState<ThemeId>('light');
  const [showGrid, setShowGrid] = useState(true);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [diagnostics, setDiagnostics] = useState<readonly FBDDiagramDiagnostic[]>([]);
  const body = useMemo(() => fixtureBody(fixture), [fixture]);
  const theme = themeId === 'dark' ? DARK_THEME : DEFAULT_THEME;
  const handleDiagnostics = useCallback((next: readonly FBDDiagramDiagnostic[]) => {
    setDiagnostics(next);
  }, []);

  const selectFixture = (next: FixtureId) => {
    setFixture(next);
    setSheetIndex(0);
  };

  return (
    <main className="preview-shell">
      <header className="preview-header">
        <div className="preview-heading">
          <h1>React Flow FBD Preview</h1>
          <p>Pan, zoom, inspect ports, and compare the supported element families.</p>
        </div>
        <div className="preview-controls">
          <label className="preview-field">
            Fixture
            <select value={fixture} onChange={(event) => selectFixture(event.target.value as FixtureId)}>
              <option value="level-control">Level control topology</option>
              <option value="elements">Element families</option>
            </select>
          </label>
          <label className="preview-field">
            Sheet
            <select value={sheetIndex} onChange={(event) => setSheetIndex(Number(event.target.value))}>
              {body.sheets.map((sheet, index) => (
                <option key={`${sheet.number.value}-${index}`} value={index}>
                  {`${index + 1}: ${sheet.name.value}`}
                </option>
              ))}
            </select>
          </label>
          <label className="preview-field">
            Theme
            <select value={themeId} onChange={(event) => setThemeId(event.target.value as ThemeId)}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="preview-check">
            <input type="checkbox" checked={showGrid} onChange={(event) => setShowGrid(event.target.checked)} />
            Grid
          </label>
          <label className="preview-check">
            <input type="checkbox" checked={showMiniMap} onChange={(event) => setShowMiniMap(event.target.checked)} />
            Minimap
          </label>
        </div>
      </header>
      <div className="preview-workspace">
        <section className="preview-canvas">
          <FBDDiagram
            body={body}
            sheetIndex={sheetIndex}
            width="100%"
            height="100%"
            theme={theme}
            showControls
            showBackground={showGrid}
            showMiniMap={showMiniMap}
            onDiagnostics={handleDiagnostics}
          />
        </section>
        <aside className="preview-sidebar">
          <h2>Diagnostics</h2>
          <p className="preview-summary">
            {diagnostics.length === 0 ? 'No diagnostics for this sheet.' : `${diagnostics.length} item(s)`}
          </p>
          {diagnostics.length === 0 ? (
            <p className="preview-empty">The selected normalized sheet is renderable without warnings.</p>
          ) : (
            <ul className="preview-diagnostics">
              {diagnostics.map((diagnostic, index) => (
                <li className="preview-diagnostic" key={`${diagnostic.code}-${index}`}>
                  <code>{diagnostic.code}</code>
                  {diagnostic.message}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Preview />
  </StrictMode>,
);
