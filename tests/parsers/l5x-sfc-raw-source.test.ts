import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { L5XParser, parseString, parseBuffer, parseFile, parseDocumentString } from '../../src/parsers';
import type { NormalizedRoutine } from '../../src/types';

const read = (name: string) => readFileSync(join(__dirname, '../fixtures/l5x', `${name}.L5X`), 'utf8');
const cp = '/RSLogix5000Content/Controller[1]';
const firstPath = `${cp}/Programs[1]/Program[1]/Routines[1]/Routine[2]`;
function expectedRoutine(source: string): string {
  const start = source.indexOf('<Routine Name="Sequence" Type=');
  return source.slice(start, source.indexOf('<Routine Name="Empty"', start)).trimEnd();
}
function assertSource(routine: NormalizedRoutine, source: string, text: string, path: string) {
  const start = source.indexOf(text);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(routine.rawSource).toEqual({
    format: 'xml', text, sourcePath: path, startOffset: start, endOffset: start + text.length,
  });
  expect(source.slice(routine.rawSource!.startOffset, routine.rawSource!.endOffset)).toBe(text);
}

describe('complete original SFC routine XML', () => {
  it.each([33, 34, 35])('v%i retains every body and nested construct through public parsing', major => {
    const source = read(`sfc-raw-v${major}`);
    const result = parseString(source);
    expect(result.success).toBe(true);
    expect(result.status).toBe('partial');
    const routines = result.data!.programs[0].routines;
    expect(routines[1]).toMatchObject({ name: 'Sequence', type: 'SFC', rungs: [], description: 'Raw sequence & nested code' });
    assertSource(routines[1], source, expectedRoutine(source), firstPath);
    const text = routines[1].rawSource!.text;
    for (const construct of ['<Description>', '<!-- Keep', '<Action ID="2"', '<Action ID="3"', '<LimitHigh>', '<LimitLow>', '<Preset>', '<Body>', '<Condition>', '<Branch ', '<Leg ', '<SbrRet ', '<Stop ', '<DirectedLink ', '<TextBox ', '<Attachment ', 'OnlineEditType="PendingEdits"', '&apos;A &amp; B&apos;', 'literal </Routine> and <Step />']) {
      expect(text).toContain(construct);
    }
    expect(routines[0].rawSource).toBeUndefined();
    expect(routines[0].rungs[0].raw).toBe('XIC(Ready)OTE(Output);');
    expect(routines[3].rawSource).toBeUndefined();
    expect(routines[3].stContent).toEqual([{ number: 0, text: 'Value := 1;' }]);
    assertSource(routines[2], source, '<Routine Name="Empty" Type="SFC" />', `${cp}/Programs[1]/Program[1]/Routines[1]/Routine[3]`);
    const second = '<Routine Name="Sequence" Type="SFC"><SFCContent SheetOrientation="Portrait"><Step ID="99" X="0" Y="0" /></SFCContent></Routine>';
    assertSource(result.data!.programs[1].routines[0], source, second, `${cp}/Programs[1]/Program[2]/Routines[1]/Routine[1]`);
  });

  it.each(['\n', '\r\n', '\r'])('preserves %j line endings, BOM offsets, comments, PI and CDATA', ending => {
    const source = '\uFEFF' + read('sfc-raw-v35')
      .replace('<!-- Keep', '<!-- <Routine Name="Fake" Type="SFC" /> </Routine> -->\n          <?view text="</Routine> >"?>\n          <!-- Keep')
      .replaceAll('\n', ending);
    const result = new L5XParser().parseDocument(source);
    expect(result.success).toBe(true);
    const resource = result.data!.resources.find(r => r.sourcePath === firstPath)!;
    expect(resource.kind).toBe('routine');
    if (resource.kind !== 'routine') throw new Error('Missing SFC resource');
    assertSource(resource.data, source, expectedRoutine(source), firstPath);
    const controller = result.data!.resources.find(r => r.kind === 'controller')!;
    if (controller.kind !== 'controller') throw new Error('Missing controller');
    expect(controller.data.programs[0].routines[1]).toBe(resource.data);
    expect(result.data!.fragments).toContainEqual(expect.objectContaining({ path: `${firstPath}/SFCContent[1]`, reason: 'unmodeled' }));
  });

  it.each(['Program', 'Routine'] as const)('retains source ownership and target selection in %s exports', target => {
    const routine = '<Routine Use="Target" Name="Sequence > 🦓" Type="SFC"><SFCContent SheetOrientation="Portrait" /></Routine>';
    const source = `<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="${target === 'Routine' ? 'Sequence > 🦓' : 'Only'}" TargetType="${target}" ContainsContext="true"><Controller Use="Context" Name="Context"><Programs><Program Name="Only"><Routines>${routine}</Routines></Program></Programs></Controller></RSLogix5000Content>`;
    const result = parseDocumentString(source, 'l5x');
    expect(result.success).toBe(true);
    const resource = result.data!.resources.find(r => r.kind === 'routine')!;
    if (resource.kind !== 'routine') throw new Error('Missing routine');
    assertSource(resource.data, source, routine, `${cp}/Programs[1]/Program[1]/Routines[1]/Routine[1]`);
    expect(resource.ownerId).toBe(`${cp}/Programs[1]/Program[1]`);
    expect(resource.role).toBe('target');
    expect(result.data!.targetIds).toEqual([target === 'Routine' ? resource.id : resource.ownerId]);
  });

  it('attaches source to AOI-owned SFC routines independently of program ownership', () => {
    const routine = '<Routine Name="Sequence" Type="SFC"><SFCContent SheetOrientation="Portrait" /></Routine>';
    const source = read('aoi-v35').replace('<Routine Name="EmptyStructured" Type="ST"><STContent /></Routine>', routine);
    const result = parseString(source, 'l5x');
    expect(result.success).toBe(true);
    assertSource(result.data!.aois[0].routines[2], source, routine, `${cp}/AddOnInstructionDefinitions[1]/AddOnInstructionDefinition[1]/Routines[1]/Routine[3]`);
  });

  it.each([17, 32])('transports original SFC source in v%i envelopes without claiming XSD coverage', major => {
    const source = read('sfc-raw-v35').replace('SoftwareRevision="35.01"', `SoftwareRevision="${major}.00"`);
    const result = parseString(source, 'l5x');
    expect(result.success).toBe(true);
    assertSource(result.data!.programs[0].routines[1], source, expectedRoutine(source), firstPath);
  });

  it('retains the same source through buffer and asynchronous file entry points', async () => {
    const source = read('sfc-raw-v35').replaceAll('\n', '\r\n');
    const buffer = new TextEncoder().encode(source).buffer;
    const file = { name: 'Sequence.L5X', size: buffer.byteLength, text: async () => source } as File;
    for (const result of [parseBuffer(buffer, 'l5x'), await parseFile(file)]) {
      expect(result.success).toBe(true);
      assertSource(result.data!.programs[0].routines[1], source, expectedRoutine(source), firstPath);
    }
  });

  it('keeps a bodyless non-self-closing routine intact', () => {
    const source = read('sfc-raw-v35').replace('<Routine Name="Empty" Type="SFC" />', '<Routine Name="Empty" Type="SFC"> <!-- no body --> </Routine>');
    assertSource(parseString(source, 'l5x').data!.programs[0].routines[2], source, '<Routine Name="Empty" Type="SFC"> <!-- no body --> </Routine>', `${cp}/Programs[1]/Program[1]/Routines[1]/Routine[3]`);
  });

  it('preserves opaque nested XML without claiming semantic completeness', () => {
    const source = read('sfc-v35').replace('</SFCContent>', '<VendorExtension Keep="&amp;"><![CDATA[uninterpreted]]></VendorExtension></SFCContent>');
    const result = parseString(source, 'l5x');
    expect(result.success).toBe(true);
    expect(result.status).toBe('partial');
    expect(result.data!.programs[0].routines[0].rawSource!.text).toContain('<VendorExtension Keep="&amp;"><![CDATA[uninterpreted]]></VendorExtension>');
  });

  it('continues to reject malformed, unsafe and resource-limited inputs before extraction', () => {
    const source = read('sfc-raw-v35');
    expect(parseString(source.slice(0, source.indexOf('</SFCContent>')), 'l5x').success).toBe(false);
    expect(parseString('<!DOCTYPE RSLogix5000Content>' + source, 'l5x').errors?.[0].code).toBe('UNSAFE_XML_ENTITY');
    expect(parseString(source, 'l5x', { resourceLimits: { maxXmlNodes: 5 } }).errors?.[0].code).toBe('XML_NODE_LIMIT_EXCEEDED');
    expect(parseString(source, 'l5x', { timeoutMs: 0 }).errors?.[0].code).toBe('PARSE_TIMEOUT');
  });
});
