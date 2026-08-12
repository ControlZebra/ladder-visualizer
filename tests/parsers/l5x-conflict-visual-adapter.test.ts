import { describe, expect, it } from 'vitest';
import { L5XConflictVisualAdapter } from '../../src/parsers/l5x';

const adapter = new L5XConflictVisualAdapter();

describe('L5XConflictVisualAdapter', () => {
  it('classifies complete RLL rungs with comments as ladder previews', () => {
    const result = adapter.classifyRegion(
      `<Rung Number="10" Type="N"><Comment><![CDATA[Current comment]]></Comment><Text><![CDATA[XIC(Start)OTE(Motor);]]></Text></Rung>`,
      `<Rung Number="10" Type="N"><Comment><![CDATA[Incoming comment]]></Comment><Text><![CDATA[XIC(Ready)OTE(Motor);]]></Text></Rung>`,
    );

    expect('kind' in result && result.kind).toBe('ladder');
    if ('kind' in result) {
      expect(result.current).toMatchObject({ number: 10, comment: 'Current comment', raw: 'XIC(Start)OTE(Motor);' });
      expect(result.incoming).toMatchObject({ number: 10, comment: 'Incoming comment', raw: 'XIC(Ready)OTE(Motor);' });
    }
  });

  it('classifies complete tags without serializing their source', () => {
    const result = adapter.classifyRegion(
      `<Tag Name="CurrentTag" TagType="Base" DataType="DINT" Radix="Decimal"><Description><![CDATA[Current description]]></Description><Data Format="L5K"><![CDATA[42]]></Data></Tag>`,
      `<Tag Name="IncomingTag" TagType="Base" DataType="DINT" Radix="Decimal"><Description><![CDATA[Incoming description]]></Description><Data Format="Decorated"><DataValue DataType="DINT" Radix="Decimal" Value="43"/></Data></Tag>`,
    );

    expect('kind' in result && result.kind).toBe('tag');
    if ('kind' in result) {
      expect(result.current).toMatchObject({ name: 'CurrentTag', description: 'Current description', dataType: 'DINT' });
      expect(result.incoming).toMatchObject({ name: 'IncomingTag', description: 'Incoming description' });
    }
  });

  it('classifies complete ST Line elements as formatted structured-text previews', () => {
    const result = adapter.classifyRegion(
      '<Line Number="12">CurrentValue := 1;</Line>',
      '<Line Number="12">IncomingValue := 2;</Line>',
    );

    expect('kind' in result && result.kind).toBe('structured-text');
    if ('kind' in result) {
      expect(result.current).toEqual({ number: 12, text: 'CurrentValue := 1;' });
      expect(result.incoming).toEqual({ number: 12, text: 'IncomingValue := 2;' });
    }
  });

  it.each([
    ['a partial rung child', '<Text><![CDATA[XIC(Start)OTE(Motor);]]></Text>', '<Text><![CDATA[XIC(Ready)OTE(Motor);]]></Text>'],
    ['multiple XML units', '<Rung Number="1" Type="N"/><Rung Number="2" Type="N"/>', '<Rung Number="1" Type="N"/>'],
    ['malformed XML', '<Tag Name="Broken">', '<Tag Name="Valid" TagType="Base" DataType="BOOL"/>'],
  ])('falls back for %s', (_description, current, incoming) => {
    expect(adapter.classifyRegion(current, incoming)).not.toHaveProperty('kind');
  });

  it('falls back when a fragment contains non-whitespace text outside the XML unit', () => {
    const result = adapter.classifyRegion(
      'junk<Rung Number="1" Type="N"><Text><![CDATA[XIC(A)OTE(B);]]></Text></Rung>',
      '<Rung Number="1" Type="N"><Text><![CDATA[XIC(C)OTE(D);]]></Text></Rung>',
    );

    expect(result).toEqual({ reason: 'invalid-fragment' });
  });

  it.each([
    '<Rung Number="1" Type="N"/>',
    '<Rung Number="1" Type="N"><Comment><![CDATA[Only]]></Comment></Rung>',
  ])('falls back for incomplete rung fragments: %s', (current) => {
    const result = adapter.classifyRegion(
      current,
      '<Rung Number="1" Type="N"><Text><![CDATA[XIC(C)OTE(D);]]></Text></Rung>',
    );

    expect(result).toEqual({ reason: 'incomplete-unit' });
  });

  it('falls back when sides are different visual kinds', () => {
    const result = adapter.classifyRegion(
      '<Rung Number="1" Type="N"><Text><![CDATA[XIC(Start)OTE(Motor);]]></Text></Rung>',
      '<Tag Name="IncomingTag" TagType="Base" DataType="BOOL"/>',
    );

    expect(result).toEqual({ reason: 'mixed-unit-kind' });
  });

  it('validates a composed complete L5X document through a direct parser instance', () => {
    expect(adapter.validateComposedDocument(completeL5X)).toEqual({ valid: true });
    expect(adapter.validateComposedDocument('<RSLogix5000Content>')).toEqual({ valid: false });
  });
});

const completeL5X = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="Test" TargetType="Program">
  <Controller Name="Test"><Programs><Program Name="Main"><Routines><Routine Name="Main" Type="RLL"><RLLContent><Rung Number="0" Type="N"><Text><![CDATA[XIC(Start)OTE(Motor);]]></Text></Rung></RLLContent></Routine></Routines></Program></Programs></Controller>
</RSLogix5000Content>`;