// @vitest-environment jsdom

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { StructuredTextViewer } from '../../src/components/StructuredTextViewer';
import type { NormalizedRoutine } from '../../src/types';

function renderLines(lines: string[]): HTMLDivElement {
  const routine: NormalizedRoutine = {
    name: 'StructuredText',
    type: 'ST',
    rungs: [],
    stContent: lines.map((text, number) => ({ number, text })),
  };
  const container = document.createElement('div');
  container.innerHTML = renderToStaticMarkup(<StructuredTextViewer routine={routine} />);
  return container;
}

function styledText(container: ParentNode, property: 'fontStyle' | 'fontWeight', value: string) {
  return Array.from(container.querySelectorAll<HTMLSpanElement>('span'))
    .filter((span) => span.style[property] === value)
    .map((span) => span.textContent);
}

describe('StructuredTextViewer', () => {
  it('highlights every line enclosed by a multiline block comment', () => {
    const container = renderLines([
      '(*',
      'line 1',
      'line 2',
      '*)',
      'IF Enabled THEN',
    ]);

    expect(styledText(container, 'fontStyle', 'italic')).toEqual([
      '(*',
      'line 1',
      'line 2',
      '*)',
    ]);
    expect(styledText(container, 'fontWeight', 'bold')).toEqual(['IF', 'THEN']);
  });

  it('resumes normal highlighting after a multiline comment closes mid-line', () => {
    const container = renderLines([
      '(* comment',
      'still comment *) IF Enabled THEN',
      'Output := TRUE;',
    ]);

    expect(styledText(container, 'fontStyle', 'italic')).toEqual([
      '(* comment',
      'still comment *)',
    ]);
    expect(styledText(container, 'fontWeight', 'bold')).toEqual(['IF', 'THEN', 'TRUE']);
  });
});
