// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as library from '../../src';
import type { NormalizedRoutine } from '../../src';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; });
const cleanups: Array<() => void> = [];
afterEach(() => { for (const cleanup of cleanups.splice(0)) cleanup(); });
function render(routine: NormalizedRoutine, showLineNumbers = true) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<library.RawRoutineViewer routine={routine} showLineNumbers={showLineNumbers} className="consumer-class" style={{ height: 240 }} />));
  cleanups.push(() => { act(() => root.unmount()); container.remove(); });
  return container;
}

describe('RawRoutineViewer public component', () => {
  it('is available from the package root', () => {
    expect(typeof library.RawRoutineViewer).toBe('function');
  });

  it('renders a publicly parsed SFC routine including nested bodies as literal text', () => {
    const source = readFileSync(join(__dirname, '../fixtures/l5x/sfc-raw-v35.L5X'), 'utf8');
    const routine = library.parseString(source, 'l5x').data!.programs[0].routines[1];
    const container = render(routine);
    expect(container.querySelector('code')?.textContent).toBe(routine.rawSource!.text);
    expect(container.querySelector('code')?.textContent).toContain('OnlineEditType="PendingEdits"');
    expect(container.querySelector('Routine')).toBeNull();
    expect(container.querySelector('[role="region"]')?.getAttribute('aria-label')).toBe('Sequence XML source');
    expect(container.querySelector('[role="region"]')?.getAttribute('tabindex')).toBe('0');
    expect(container.querySelector('.consumer-class')?.getAttribute('style')).toContain('height: 240px');
    const gutter = container.querySelector('[aria-hidden="true"]');
    expect(gutter?.textContent?.split('\n')).toHaveLength(routine.rawSource!.text.split('\n').length);
  });

  it('keeps source spelling and line endings while making XML/HTML inert', () => {
    const text = '<Routine>\r\n<!-- <script>alert(1)</script> -->\r<![CDATA[<img src=x onerror=alert(1)>]]>\n</Routine>';
    const routine: NormalizedRoutine = { name: 'Raw', type: 'SFC', rungs: [], rawSource: { format: 'xml', text, sourcePath: '/Routine', startOffset: 0, endOffset: text.length } };
    const container = render(routine, false);
    expect(container.querySelector('code')?.textContent).toBe(text);
    expect(container.querySelector('script, img')).toBeNull();
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('explains when no raw source was provided', () => {
    const container = render({ name: 'Missing', type: 'SFC', rungs: [] });
    expect(container.textContent).toContain('Original XML source is unavailable for this routine.');
    expect(container.querySelector('code')).toBeNull();
  });

  it('allows selecting an AOI routine with raw source in the public navigator', () => {
    const source = readFileSync(join(__dirname, '../fixtures/l5x/aoi-v35.L5X'), 'utf8')
      .replace('<Routine Name="EmptyStructured" Type="ST"><STContent /></Routine>', '<Routine Name="Sequence" Type="SFC"><SFCContent SheetOrientation="Portrait" /></Routine>');
    const controller = library.parseString(source, 'l5x').data!;
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const select = vi.fn();
    act(() => root.render(<library.ProgramNavigator controller={controller} programs={controller.programs} aois={controller.aois} onAOIRoutineSelect={select} initialExpanded={new Set(['aois', 'aoi-FixtureAOI', 'aoi-FixtureAOI-routines'])} />));
    cleanups.push(() => { act(() => root.unmount()); container.remove(); });
    const label = [...container.querySelectorAll('span')].find(span => span.textContent === 'Sequence');
    expect(label).toBeDefined();
    act(() => label!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    expect(select).toHaveBeenCalledWith(controller.aois[0], 2, controller.aois[0].routines[2]);
  });
});
