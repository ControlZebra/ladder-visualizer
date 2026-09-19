import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FBDDiagram } from '../../src/components/svg/FBDDiagram';
import { parseString } from '../../src/parsers';
import { DARK_THEME, type NormalizedFBDBody } from '../../src/types';

const fixtureDirectory = join(__dirname, '../fixtures/l5x');

function fixtureBody(fixture: string, routineName: string): NormalizedFBDBody {
  const result = parseString(readFileSync(join(fixtureDirectory, fixture), 'utf8'), 'l5x');
  const body = result.data?.programs[0]?.routines.find((routine) => routine.name === routineName)?.fbd;
  if (!body) throw new Error('expected normalized level-control FBD body');
  return body;
}

const levelControlBody = () => fixtureBody('fbd-level-control-v35.L5X', 'MainFBD');

describe('FBDDiagram', () => {
  it('renders sheet topology through the real parser result with wires below elements', () => {
    const markup = renderToStaticMarkup(createElement(FBDDiagram, { body: levelControlBody(), sheetIndex: 0 }));

    expect(markup.match(/class="fbd-element fbd-element-block"/g)).toHaveLength(7);
    expect(markup.match(/class="fbd-connection fbd-connection-wire"/g)).toHaveLength(8);
    expect(markup.match(/class="fbd-connection fbd-connection-feedback-wire"/g)).toHaveLength(2);
    expect(markup).toContain('stroke-dasharray="6 4"');
    expect(markup).toContain('StorageArray: DEDT_01array');
    expect(markup.indexOf('class="fbd-connections"')).toBeLessThan(markup.indexOf('class="fbd-elements"'));
    expect(markup).toContain('data-connector-relationship-count="1"');
  });

  it('renders the second sheet and accepts the dark theme', () => {
    const markup = renderToStaticMarkup(createElement(FBDDiagram, {
      body: levelControlBody(),
      sheetIndex: 1,
      theme: DARK_THEME,
      width: 900,
      height: 600,
    }));

    expect(markup.match(/class="fbd-element fbd-element-block"/g)).toHaveLength(2);
    expect(markup.match(/class="fbd-connection fbd-connection-wire"/g)).toHaveLength(3);
    expect(markup).toContain('background-color:#1e1e1e');
    expect(markup).toContain('width="900"');
    expect(markup).toContain('height="600"');
  });

  it('renders both IRef and ORef implicit terminal directions', () => {
    const markup = renderToStaticMarkup(createElement(FBDDiagram, {
      body: fixtureBody('fbd-v35.L5X', 'FBDLogic'),
    }));

    expect(markup.match(/class="fbd-element fbd-element-reference"/g)).toHaveLength(2);
    expect(markup).toContain('data-terminal-type="input"');
    expect(markup).toContain('data-terminal-type="output"');
    expect(markup.match(/class="fbd-connection fbd-connection-wire"/g)).toHaveLength(1);
  });
});
