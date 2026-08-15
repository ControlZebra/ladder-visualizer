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

  it('classifies complete rungs with branches and escaped content without reconstructing either side', () => {
    const current = `<Rung Number="11" Type="N"><Comment><![CDATA[Current &amp; verified]]></Comment><Text><![CDATA[XIC(Start)BSTXIC(Ready)NXB XIC(Bypass)BNDOTE(Motor);]]></Text></Rung>`;
    const incoming = `<Rung Number="11" Type="N"><Comment><![CDATA[Incoming &amp; verified]]></Comment><Text><![CDATA[XIC(Start)BSTXIC(Permit)NXB XIC(Bypass)BNDOTE(Motor);]]></Text></Rung>`;

    const result = adapter.classifyRegion(current, incoming);

    expect('kind' in result && result.kind).toBe('ladder');
    if ('kind' in result) {
      expect(result.current).toMatchObject({ number: 11, comment: 'Current &amp; verified' });
      expect(result.incoming).toMatchObject({ number: 11, comment: 'Incoming &amp; verified' });
    }

    expect(composeSelectedRegion(current, incoming, 'current')).toBe(current);
    expect(composeSelectedRegion(current, incoming, 'incoming')).toBe(incoming);
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

  it('classifies tags with multiple data formats and unsupported child XML', () => {
    const result = adapter.classifyRegion(
      `<Tag Name="CurrentTag" TagType="Base" DataType="DINT" Radix="Decimal"><Description><![CDATA[Current description]]></Description><Data Format="L5K"><![CDATA[42]]></Data><Data Format="Decorated"><DataValue DataType="DINT" Radix="Decimal" Value="42"/></Data><VendorExtension Enabled="true"><Nested Value="ignored"/></VendorExtension></Tag>`,
      `<Tag Name="IncomingTag" TagType="Base" DataType="DINT" Radix="Decimal"><Description><![CDATA[Incoming description]]></Description><Data Format="String"><![CDATA[43]]></Data><Data Format="Decorated"><DataValue DataType="DINT" Radix="Decimal" Value="43"/></Data><VendorExtension Enabled="false"><Nested Value="preserved-in-source"/></VendorExtension></Tag>`,
    );

    expect('kind' in result && result.kind).toBe('tag');
    if ('kind' in result) {
      expect(result.current).toMatchObject({ name: 'CurrentTag', description: 'Current description', dataType: 'DINT' });
      expect(result.incoming).toMatchObject({ name: 'IncomingTag', description: 'Incoming description', dataType: 'DINT' });
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
    ['a partial tag child', '<Data Format="L5K"><![CDATA[42]]></Data>', '<Data Format="L5K"><![CDATA[43]]></Data>'],
    ['a partial structured-text child', '<STContent><Line Number="1">Current := 1;</Line></STContent>', '<STContent><Line Number="1">Incoming := 2;</Line></STContent>'],
    ['multiple XML units', '<Rung Number="1" Type="N"/><Rung Number="2" Type="N"/>', '<Rung Number="1" Type="N"/>'],
    ['malformed XML', '<Tag Name="Broken">', '<Tag Name="Valid" TagType="Base" DataType="BOOL"/>'],
  ])('falls back for %s', (_description, current, incoming) => {
    expect(adapter.classifyRegion(current, incoming)).not.toHaveProperty('kind');
  });

  it('classifies a partial rung Text element as a ladder preview', () => {
    const result = adapter.classifyRegion(
      '<Text>\n<![CDATA[XIC(Start)OTE(Motor);]]>\n</Text>',
      '<Text>\n<![CDATA[XIC(Ready)OTE(Motor);]]>\n</Text>',
    );
    expect('kind' in result && result.kind).toBe('ladder');
    if ('kind' in result) {
      expect(result.current).toMatchObject({ raw: 'XIC(Start)OTE(Motor);' });
      expect(result.incoming).toMatchObject({ raw: 'XIC(Ready)OTE(Motor);' });
    }
  });

  it('classifies a partial rung Comment element as a ladder preview', () => {
    const result = adapter.classifyRegion(
      '<Comment><![CDATA[Current comment]]></Comment>',
      '<Comment><![CDATA[Incoming comment]]></Comment>',
    );
    expect('kind' in result && result.kind).toBe('ladder');
    if ('kind' in result) {
      expect(result.current).toMatchObject({ comment: 'Current comment' });
      expect(result.incoming).toMatchObject({ comment: 'Incoming comment' });
    }
  });

  it('classifies a bare CDATA payload as a ladder preview', () => {
    const result = adapter.classifyRegion(
      '<![CDATA[XIC(Cooker1.BIT_Logic[0].4)OTE(Cooker1.STATUS_BIT_HMI[0].13);]]>',
      '<![CDATA[XIC(Cooker1.BIT_Logic[0].6)OTE(Cooker1.STATUS_BIT_HMI[0].12);]]>',
    );
    expect('kind' in result && result.kind).toBe('ladder');
    if ('kind' in result) {
      expect(result.current).toMatchObject({ raw: 'XIC(Cooker1.BIT_Logic[0].4)OTE(Cooker1.STATUS_BIT_HMI[0].13);' });
      expect(result.incoming).toMatchObject({ raw: 'XIC(Cooker1.BIT_Logic[0].6)OTE(Cooker1.STATUS_BIT_HMI[0].12);' });
    }
  });

  it('classifies a multi-line Comment CDATA as a ladder preview', () => {
    const result = adapter.classifyRegion(
      '<Comment>\n<![CDATA[Current line 1\nCurrent line 2\n]]>\n</Comment>',
      '<Comment>\n<![CDATA[Incoming line 1\nIncoming line 2\n]]>\n</Comment>',
    );
    expect('kind' in result && result.kind).toBe('ladder');
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

  it('falls back for unsupported complete XML units', () => {
    const result = adapter.classifyRegion(
      '<DataType Name="CurrentType" Family="NoFamily" Class="User"/>',
      '<DataType Name="IncomingType" Family="NoFamily" Class="User"/>',
    );

    expect(result).toEqual({ reason: 'unsupported-unit' });
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

function composeSelectedRegion(current: string, incoming: string, side: 'current' | 'incoming'): string {
  return side === 'current' ? current : incoming;
}