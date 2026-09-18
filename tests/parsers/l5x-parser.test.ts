import { describe, it, expect, beforeEach } from 'vitest';
import { L5XParser, l5xParser } from '../../src/parsers/l5x';
import {
  parseBuffer,
  parseDocumentBuffer,
  parseDocumentFile,
  parseDocumentString,
  parseFile,
  parseString,
} from '../../src/parsers';
import { readFileSync } from 'fs';
import { join } from 'path';

const exampleL5XPath = join(__dirname, '../../examples/Cooker_1_AutoLogic_Program.L5X');
const exampleL5XContent = readFileSync(exampleL5XPath, 'utf-8');
const fixtureDirectory = join(__dirname, '../fixtures/l5x');

describe('L5XParser', () => {
  let parser: L5XParser;

  beforeEach(() => {
    parser = new L5XParser();
  });

  describe('canParse', () => {
    it('should return true for valid L5X content', () => {
      const l5xContent = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="Test" TargetType="Program">
<Controller Use="Context" Name="TestController">
</Controller>
</RSLogix5000Content>`;

      expect(parser.canParse(l5xContent)).toBe(true);
    });

    it('should return false for JSON content', () => {
      const jsonContent = '{"serial_number": "12345", "programs": []}';
      expect(parser.canParse(jsonContent)).toBe(false);
    });

    it('should return false for non-L5X XML content', () => {
      const xmlContent = `<?xml version="1.0"?>
<SomeOtherRoot>
  <Element>content</Element>
</SomeOtherRoot>`;

      expect(parser.canParse(xmlContent)).toBe(false);
    });

    it('should return false for plain text', () => {
      expect(parser.canParse('Hello, world!')).toBe(false);
    });
  });

  describe('parse', () => {
    it.each([
      ['33', 1],
      ['34', 2],
      ['35', 5],
    ])('normalizes program parameters and state for v%s', (version, parameterCount) => {
      const source = readFileSync(
        join(fixtureDirectory, `program-parameters-v${version}.L5X`),
        'utf-8'
      );
      const result = parser.parse(source);
      const program = result.data?.programs[0];

      expect(result.success).toBe(true);
      expect(result.status).toBe('complete');
      expect(program?.parameters).toHaveLength(parameterCount);
      expect(program?.parameters?.every((parameter) =>
        parameter.scope === 'Program' && parameter.programName === program.name
      )).toBe(true);
    });

    it('retains exact program parameter metadata, comments, dimensions, and default data', () => {
      const source = readFileSync(
        join(fixtureDirectory, 'program-parameters-v35.L5X'),
        'utf-8'
      );
      const result = parseString(source, 'l5x');
      const program = result.data?.programs[0];

      expect(program).toMatchObject({
        name: 'ProgramParamsV35',
        disabled: false,
        parameters: [
          {
            name: 'Recipe',
            uid: '18446744073709551615',
            parentUid: '9007199254740993',
            tagType: 'Base',
            dataType: 'DINT',
            dataTypeUid: '42',
            dimensions: [2, 3],
            usage: 'InOut',
            radix: 'Decimal',
            required: true,
            visible: true,
            constant: false,
            externalAccess: 'None',
            verified: true,
            scope: 'Program',
            programName: 'ProgramParamsV35',
            comments: [{
              operand: '[0,0]',
              text: 'First recipe cell',
              values: ['First recipe cell'],
              localizedTexts: [],
            }],
            defaultData: {
              format: 'Decorated',
              values: [{
                kind: 'array',
                dataType: 'DINT',
                dimensions: [2, 3],
                radix: 'Decimal',
                elements: [
                  { index: [0, 0], value: '7', structures: [] },
                  { index: [1, 2], value: '9', structures: [] },
                ],
              }],
            },
          },
          { name: 'Scratch', usage: 'Local' },
          { name: 'Status', usage: 'Static' },
          { name: 'NormalValue', usage: 'Normal' },
          { name: 'NullValue', usage: 'NULL' },
        ],
      });
      expect(program?.parameters[1].required).toBeUndefined();
      expect(program?.parameters[1].visible).toBeUndefined();
      expect(program?.parameters[1].externalAccess).toBeUndefined();
    });

    it('retains optional program edit, verification, routine-entry, and execution metadata', () => {
      const source = readFileSync(
        join(fixtureDirectory, 'program-parameters-v33.L5X'),
        'utf-8'
      );
      const result = parser.parse(source);

      expect(result.data?.programs[0]).toMatchObject({
        testEdits: false,
        mainRoutineName: 'Main',
        preStateRoutineName: 'Prepare',
        faultRoutineName: 'Fault',
        executingTaskName: 'PeriodicTask',
        verified: true,
        editsExist: false,
        disabled: false,
      });
      expect(result.data?.programs[0].parameters?.[0].defaultData).toEqual({
        format: 'Decorated',
        values: [{ kind: 'atomic', dataType: 'REAL', radix: 'Float', value: '12.5' }],
      });
      expect(result.data?.programs[0].parameters?.[0]).toMatchObject({
        description: 'Requested process setpoint',
        required: true,
        visible: true,
        constant: false,
        externalAccess: 'ReadWrite',
        verified: true,
      });
    });

    it('retains repeated parameter order, L5K defaults, and explicit false values', () => {
      const source = readFileSync(
        join(fixtureDirectory, 'program-parameters-v34.L5X'),
        'utf-8'
      );
      const result = parseDocumentString(source, 'l5x');
      const target = result.data?.resources.find((resource) => resource.kind === 'program');
      const program = target?.kind === 'program' ? target.data : undefined;

      expect(program).toMatchObject({
        testEdits: true,
        executingTaskName: 'EventTask',
        verified: false,
        editsExist: true,
        disabled: true,
      });
      expect(program?.parameters?.map((parameter) => parameter.name)).toEqual([
        'Command',
        'Complete',
      ]);
      expect(program?.parameters?.[0].defaultData).toEqual({
        format: 'L5K',
        text: '42',
        values: [],
      });
      expect(program?.parameters?.[1]).toMatchObject({
        usage: 'Output',
        required: false,
        visible: true,
        externalAccess: 'ReadOnly',
      });
    });

    it('does not invent optional program state or parameters when absent', () => {
      const source = readFileSync(join(fixtureDirectory, 'program-rll-v35.L5X'), 'utf-8');
      const result = parser.parse(source);
      const program = result.data?.programs[0];

      expect(program?.parameters).toEqual([]);
      expect(program?.testEdits).toBeUndefined();
      expect(program?.verified).toBeUndefined();
      expect(program?.editsExist).toBeUndefined();
      expect(program?.disabled).toBeUndefined();
      expect(program?.preStateRoutineName).toBeUndefined();
      expect(program?.executingTaskName).toBeUndefined();
    });

    it('preserves unsupported program parameter defaults with a stable partial diagnostic', () => {
      const source = readFileSync(
        join(fixtureDirectory, 'program-parameters-unsupported-v35.L5X'),
        'utf-8'
      );
      const result = parseDocumentString(source, 'l5x');

      expect(result.success).toBe(true);
      expect(result.status).toBe('partial');
      expect(result.warnings).toContainEqual(expect.objectContaining({
        code: 'UNSUPPORTED_L5X_PROGRAM_PARAMETER_DATA',
        location: {
          path: '/RSLogix5000Content/Controller[1]/Programs[1]/Program[1]/Parameters[1]/Parameter[1]/DefaultData[1]/AxisParameters[1]',
        },
      }));
      expect(result.data?.fragments).toContainEqual(expect.objectContaining({
        path: '/RSLogix5000Content/Controller[1]/Programs[1]/Program[1]/Parameters[1]',
        reason: 'source-representation',
      }));
    });

    it.each(['33', '34', '35'])(
      'normalizes program parameters in the full-project controller envelope for v%s',
      (version) => {
        const source = readFileSync(join(fixtureDirectory, `full-project-v${version}.L5X`), 'utf-8');
        const result = parser.parse(source);

        expect(result.data?.programs[0].parameters).toEqual([
          expect.objectContaining({
            name: 'ProgramInput',
            dataType: 'BOOL',
            usage: 'Input',
            scope: 'Program',
            programName: 'FixtureProgram',
          }),
        ]);
      }
    );

    it.each(['33', '34', '35'])('parses grammar-complete standalone rungs for v%s', (version) => {
      const source = readFileSync(join(fixtureDirectory, `rung-rll-v${version}.L5X`), 'utf-8');
      const result = parser.parse(source);
      const rung = result.data?.programs[0]?.routines[0]?.rungs[0];

      expect(result.success).toBe(true);
      expect(rung?.diagnostics).toEqual([]);
      expect(rung?.instructions.map((instruction) => [instruction.mnemonic, instruction.operands])).toEqual([
        ['XIC', ['A']],
        ['XIC', ['B']],
        ['XIC', ['C']],
        ['CPT', ['Destination', 'MAX(A,B)+1']],
        ['VendorOp', ['"A,B[0]"', 'Tag']],
        ['OTE', ['Output']],
      ]);
      expect(rung?.instructions[4].category).toBe('other');
      expect(rung?.instructions[4].source).toBe('VendorOp("A,B[0]",Tag)');
    });

    it('returns rung recovery diagnostics through the public L5X parser', () => {
      const source = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="Recovery" TargetType="Controller">
  <Controller Use="Target" Name="Recovery"><Programs><Program Name="Main"><Routines><Routine Name="Main" Type="RLL"><RLLContent>
    <Rung Number="0" Type="N"><Text><![CDATA[XIC(Start]OTE(Output);]]></Text></Rung>
  </RLLContent></Routine></Routines></Program></Programs></Controller>
</RSLogix5000Content>`;
      const result = parser.parse(source);
      const rung = result.data?.programs[0]?.routines[0]?.rungs[0];

      expect(result.success).toBe(true);
      expect(result.status).toBe('partial');
      expect(rung?.instructions.map((instruction) => instruction.mnemonic)).toEqual(['XIC', 'OTE']);
      expect(rung?.diagnostics).toContainEqual(expect.objectContaining({
        code: 'RLL_MISMATCHED_DELIMITER',
        span: { start: 9, end: 10 },
      }));
    });

    it('should parse minimal controller L5X content', () => {
      const l5xContent = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="TestController" TargetType="Controller">
<Controller Use="Target" Name="TestController">
</Controller>
</RSLogix5000Content>`;

      const result = parser.parse(l5xContent);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('TestController');
      expect(result.data?.vendor).toBe('rockwell');
      expect(result.data?.sourceFormat).toBe('l5x');
    });

    it('should parse L5X with programs and routines', () => {
      const l5xContent = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="TestProgram" TargetType="Program">
<Controller Use="Context" Name="TestController">
<Programs>
<Program Name="MainProgram" MainRoutineName="Main">
<Routines>
<Routine Name="Main" Type="RLL">
<RLLContent>
<Rung Number="0" Type="N">
<Text><![CDATA[XIC(Start)OTE(Output);]]></Text>
</Rung>
<Rung Number="1" Type="N">
<Comment><![CDATA[Timer rung]]></Comment>
<Text><![CDATA[TON(Timer1,1000,0);]]></Text>
</Rung>
</RLLContent>
</Routine>
</Routines>
</Program>
</Programs>
</Controller>
</RSLogix5000Content>`;

      const result = parser.parse(l5xContent);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.programs).toHaveLength(1);
      expect(result.data?.programs[0].name).toBe('MainProgram');
      expect(result.data?.programs[0].mainRoutineName).toBe('Main');
      expect(result.data?.programs[0].routines).toHaveLength(1);
      expect(result.data?.programs[0].routines[0].name).toBe('Main');
      expect(result.data?.programs[0].routines[0].type).toBe('RLL');
      expect(result.data?.programs[0].routines[0].rungs).toHaveLength(2);
    });

    it('should parse rungs correctly', () => {
      const l5xContent = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="TestProgram" TargetType="Program">
<Controller Use="Context" Name="TestController">
<Programs>
<Program Name="MainProgram">
<Routines>
<Routine Name="Main" Type="RLL">
<RLLContent>
<Rung Number="0" Type="N">
<Comment><![CDATA[Test comment]]></Comment>
<Text><![CDATA[XIC(Input1)XIC(Input2)OTE(Output1);]]></Text>
</Rung>
</RLLContent>
</Routine>
</Routines>
</Program>
</Programs>
</Controller>
</RSLogix5000Content>`;

      const result = parser.parse(l5xContent);

      expect(result.success).toBe(true);
      const rung = result.data?.programs[0].routines[0].rungs[0];
      expect(rung).toBeDefined();
      expect(rung?.number).toBe(0);
      expect(rung?.comment).toBe('Test comment');
      expect(rung?.raw).toBe('XIC(Input1)XIC(Input2)OTE(Output1);');
      expect(rung?.instructions).toHaveLength(3);
      expect(rung?.instructions[0].mnemonic).toBe('XIC');
      expect(rung?.instructions[0].operands).toEqual(['Input1']);
      expect(rung?.instructions[1].mnemonic).toBe('XIC');
      expect(rung?.instructions[1].operands).toEqual(['Input2']);
      expect(rung?.instructions[2].mnemonic).toBe('OTE');
      expect(rung?.instructions[2].operands).toEqual(['Output1']);
    });

    it('should preserve multi-line rung comments exactly as authored', () => {
      const l5xContent = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="TestProgram" TargetType="Program">
<Controller Use="Context" Name="TestController">
<Programs>
<Program Name="MainProgram">
<Routines>
<Routine Name="Main" Type="RLL">
<RLLContent>
<Rung Number="137" Type="N">
<Comment><![CDATA[Cooker #1
Drop To Drop Tub
Verify No Alarms
And Path OK]]></Comment>
<Text><![CDATA[XIC(Cooker1.BIT_Logic[5].0)OTE(Cooker1.Transfer_Step_OK[1]);]]></Text>
</Rung>
</RLLContent>
</Routine>
</Routines>
</Program>
</Programs>
</Controller>
</RSLogix5000Content>`;

      const result = parser.parse(l5xContent);
      const rung = result.data?.programs[0].routines[0].rungs[0];

      expect(result.success).toBe(true);
      expect(rung?.comment).toBe('Cooker #1\nDrop To Drop Tub\nVerify No Alarms\nAnd Path OK');
    });

    it('should parse data types', () => {
      const l5xContent = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="MyUDT" TargetType="DataType">
<Controller Use="Context" Name="TestController">
<DataTypes>
<DataType Use="Target" Name="MyUDT" Family="NoFamily" Class="User">
<Members>
<Member Name="Value1" DataType="DINT" Dimension="0" Radix="Decimal" Hidden="false" ExternalAccess="Read/Write">
<Description><![CDATA[First value]]></Description>
</Member>
<Member Name="Value2" DataType="REAL" Dimension="0" Radix="Float" Hidden="false" ExternalAccess="Read Only"/>
</Members>
</DataType>
</DataTypes>
</Controller>
</RSLogix5000Content>`;

      const result = parser.parse(l5xContent);

      expect(result.success).toBe(true);
      expect(result.data?.dataTypes).toHaveLength(1);

      const dataType = result.data?.dataTypes[0];
      expect(dataType?.name).toBe('MyUDT');
      expect(dataType?.class).toBe('User');
      expect(dataType?.members).toHaveLength(2);
      expect(dataType?.members[0].name).toBe('Value1');
      expect(dataType?.members[0].dataType).toBe('DINT');
      expect(dataType?.members[0].description).toBe('First value');
      expect(dataType?.members[0].externalAccess).toBe('ReadWrite');
      expect(dataType?.members[1].externalAccess).toBe('ReadOnly');
    });

    it.each(['33.00', '34.01', '35.01'])(
      'rejects a v%s Program export whose declared target is absent through every public entry point',
      async (softwareRevision) => {
        const source = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="${softwareRevision}" TargetName="MissingProgram" TargetType="Program">
  <Controller Use="Context" Name="ContextController" />
</RSLogix5000Content>`;
        const encoded = new TextEncoder().encode(source);
        const file = {
          name: 'missing-program.L5X',
          size: encoded.byteLength,
          text: async () => source,
        } as File;

        const results = [
          parser.parse(source),
          parser.parseDocument(source),
          parseString(source, 'l5x'),
          parseBuffer(encoded.buffer, 'l5x'),
          parseDocumentString(source, 'l5x'),
          parseDocumentBuffer(encoded.buffer, 'l5x'),
          await parseFile(file),
          await parseDocumentFile(file),
        ];

        for (const result of results) {
          expect(result.success).toBe(false);
          expect(result.data).toBeUndefined();
          expect(result.errors?.[0]).toMatchObject({
            code: 'MISSING_L5X_TARGET',
            location: { path: '/RSLogix5000Content/@TargetName' },
          });
        }
      }
    );

    it('should parse tags', () => {
      const l5xContent = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="Test" TargetType="Program">
<Controller Use="Context" Name="TestController">
<Tags>
<Tag Name="GlobalTag1" TagType="Base" DataType="DINT" Radix="Decimal" ExternalAccess="Read/Write">
<Description><![CDATA[A global tag]]></Description>
</Tag>
<Tag Name="AliasTag" TagType="Alias" DataType="BOOL" AliasFor="GlobalTag1.0"/>
</Tags>
<Programs>
<Program Name="MainProgram">
<Tags>
<Tag Name="ProgramTag1" TagType="Base" DataType="BOOL" Radix="Decimal" ExternalAccess="Read/Write"/>
</Tags>
</Program>
</Programs>
</Controller>
</RSLogix5000Content>`;

      const result = parser.parse(l5xContent);

      expect(result.success).toBe(true);

      // Controller tags
      expect(result.data?.tags).toHaveLength(2);
      expect(result.data?.tags[0].name).toBe('GlobalTag1');
      expect(result.data?.tags[0].tagType).toBe('Base');
      expect(result.data?.tags[0].scope).toBe('Controller');
      expect(result.data?.tags[0].description).toBe('A global tag');
      expect(result.data?.tags[1].tagType).toBe('Alias');
      expect(result.data?.tags[1].aliasFor).toBe('GlobalTag1.0');

      // Program tags
      expect(result.data?.programs[0].tags).toHaveLength(1);
      expect(result.data?.programs[0].tags[0].name).toBe('ProgramTag1');
      expect(result.data?.programs[0].tags[0].scope).toBe('Program');
      expect(result.data?.programs[0].tags[0].programName).toBe('MainProgram');
    });

    it('should handle branch structures in rungs', () => {
      const l5xContent = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="Test" TargetType="Program">
<Controller Use="Context" Name="TestController">
<Programs>
<Program Name="MainProgram">
<Routines>
<Routine Name="Main" Type="RLL">
<RLLContent>
<Rung Number="0" Type="N">
<Text><![CDATA[[XIC(A),XIC(B)]OTE(Out);]]></Text>
</Rung>
</RLLContent>
</Routine>
</Routines>
</Program>
</Programs>
</Controller>
</RSLogix5000Content>`;

      const result = parser.parse(l5xContent);

      expect(result.success).toBe(true);
      const rung = result.data?.programs[0].routines[0].rungs[0];
      expect(rung).toBeDefined();
      expect(rung?.raw).toBe('[XIC(A),XIC(B)]OTE(Out);');
      // The elements should include a branch structure
      expect(rung?.elements.length).toBeGreaterThan(0);
    });

    it('should fail for non-XML input', () => {
      const invalidXml = 'This is not XML at all';
      const result = parser.parse(invalidXml);

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('INVALID_XML');
    });

    it('should reject mismatched XML tags before normalization', () => {
      const mismatchedXml = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content TargetName="Test" TargetType="Controller">
<Controller Name="TestController">
</Controler>
</RSLogix5000Content>`;

      const result = parser.parse(mismatchedXml);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors?.[0]).toMatchObject({
        code: 'INVALID_XML',
        message: expect.stringContaining('Re-export it from Studio 5000'),
        location: {
          line: expect.any(Number),
          column: expect.any(Number),
        },
      });
    });

    it('should reject a truncated XML document before normalization', () => {
      const truncatedXml = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content TargetName="Test" TargetType="Controller">
<Controller Name="TestController">`;

      const result = parser.parse(truncatedXml);

      expect(result.success).toBe(false);
      expect(result.data).toBeUndefined();
      expect(result.errors?.[0].code).toBe('INVALID_XML');
    });

    it('should fail for missing required elements', () => {
      const missingController = `<?xml version="1.0"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="Test" TargetType="Program">
</RSLogix5000Content>`;

      const result = parser.parse(missingController);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.[0].code).toBe('MISSING_REQUIRED_FIELD');
    });
  });

  describe('validate', () => {
    it('should return success for valid L5X', () => {
      const l5xContent = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="Test" TargetType="Program">
<Controller Use="Context" Name="TestController"/>
</RSLogix5000Content>`;

      const result = parser.validate(l5xContent);
      expect(result.success).toBe(true);
    });

    it('should return failure for invalid L5X', () => {
      const invalidL5x = `<?xml version="1.0"?>
<RSLogix5000Content SchemaRevision="1.0">
</RSLogix5000Content>`;

      const result = parser.validate(invalidL5x);
      expect(result.success).toBe(false);
    });

    it('should reject malformed XML', () => {
      const malformedXml = `<?xml version="1.0"?>
<RSLogix5000Content TargetName="Test" TargetType="Controller">
<Controller Name="TestController">
</RSLogix5000Content>`;

      const result = parser.validate(malformedXml);

      expect(result.success).toBe(false);
      expect(result.errors?.[0].code).toBe('INVALID_XML');
    });
  });

  describe('resource guards', () => {
    const minimalL5X = `<RSLogix5000Content TargetName="Test" TargetType="Controller"><Controller Name="Test"/></RSLogix5000Content>`;

    it('rejects source bytes at the boundary before parsing', () => {
      const result = parser.parse(minimalL5X, {
        resourceLimits: { maxSourceBytes: minimalL5X.length - 1 },
      });

      expect(result).toMatchObject({
        success: false,
        errors: [{ code: 'SOURCE_BYTE_LIMIT_EXCEEDED' }],
      });
    });

    it('accepts source bytes exactly at the configured boundary', () => {
      const result = parser.parse(minimalL5X, {
        resourceLimits: { maxSourceBytes: new TextEncoder().encode(minimalL5X).byteLength },
      });

      expect(result.success).toBe(true);
    });

    it('counts UTF-8 bytes precisely when a string is within the cheap length bound', () => {
      const multibyteL5X = minimalL5X.replace('Name="Test"', 'Name="Café"');
      const result = parser.parse(multibyteL5X, {
        resourceLimits: { maxSourceBytes: multibyteL5X.length },
      });

      expect(result).toMatchObject({
        success: false,
        errors: [{ code: 'SOURCE_BYTE_LIMIT_EXCEEDED' }],
      });
    });

    it('checks ArrayBuffer size before decoding', () => {
      const bytes = new TextEncoder().encode(minimalL5X);
      const result = parseBuffer(bytes.buffer, 'l5x', {
        resourceLimits: { maxSourceBytes: bytes.byteLength - 1 },
      });

      expect(result).toMatchObject({
        success: false,
        errors: [{ code: 'SOURCE_BYTE_LIMIT_EXCEEDED' }],
      });
    });

    it('enforces the XML node limit at and just over its boundary', () => {
      const nodes = `<RSLogix5000Content TargetName="Test" TargetType="Controller"><Controller Name="Test"><Tags><Tag Name="One"/></Tags></Controller></RSLogix5000Content>`;
      const accepted = parser.parse(nodes, { resourceLimits: { maxXmlNodes: 4 } });
      const rejected = parser.parse(nodes, { resourceLimits: { maxXmlNodes: 3 } });

      expect(accepted.success).toBe(true);
      expect(rejected).toMatchObject({
        success: false,
        errors: [{ code: 'XML_NODE_LIMIT_EXCEEDED' }],
      });
    });

    it('enforces the XML nesting limit at and just over its boundary', () => {
      const nested = `<RSLogix5000Content TargetName="Test" TargetType="Controller"><Controller Name="Test"><Tags><Tag Name="One"><Data/></Tag></Tags></Controller></RSLogix5000Content>`;
      const accepted = parser.parse(nested, { resourceLimits: { maxXmlDepth: 4 } });
      const rejected = parser.parse(nested, { resourceLimits: { maxXmlDepth: 3 } });

      expect(accepted.success).toBe(true);
      expect(rejected).toMatchObject({
        success: false,
        errors: [{ code: 'XML_DEPTH_LIMIT_EXCEEDED' }],
      });
    });

    it('rejects DOCTYPE declarations instead of expanding custom entities', () => {
      const result = parser.parse(`<!DOCTYPE RSLogix5000Content [<!ENTITY unsafe "expanded">]>
<RSLogix5000Content TargetName="Test" TargetType="Controller"><Controller Name="Test"><Description>&unsafe;</Description></Controller></RSLogix5000Content>`);

      expect(result).toMatchObject({
        success: false,
        errors: [{ code: 'UNSAFE_XML_ENTITY' }],
      });
    });

    it('supports built-in XML entities without enabling HTML entities', () => {
      const result = parser.parse(
        `<RSLogix5000Content TargetName="Test" TargetType="Controller"><Controller Name="Fish &amp; Chips"/></RSLogix5000Content>`
      );

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Fish & Chips');
    });

    it('returns a typed cancellation diagnostic', () => {
      const controller = new AbortController();
      controller.abort();

      const result = parseString(minimalL5X, 'l5x', { signal: controller.signal });

      expect(result).toMatchObject({
        success: false,
        errors: [{ code: 'PARSE_CANCELLED' }],
      });
    });

    it('returns a typed timeout diagnostic', () => {
      const result = parser.parse(minimalL5X, { timeoutMs: 0 });

      expect(result).toMatchObject({
        success: false,
        errors: [{ code: 'PARSE_TIMEOUT' }],
      });
    });
  });

  describe('singleton instance', () => {
    it('should have correct parser id', () => {
      expect(l5xParser.id).toBe('rockwell-l5x');
    });

    it('should have correct name', () => {
      expect(l5xParser.name).toBe('Rockwell L5X Export');
    });

    it('should support .l5x extension', () => {
      expect(l5xParser.supportedExtensions).toContain('.l5x');
      expect(l5xParser.supportedExtensions).toContain('.L5X');
    });
  });
});

describe('L5XParser with real L5X file', () => {
  it('should parse the example Cooker_1_AutoLogic_Program.L5X file', () => {
    const result = l5xParser.parse(exampleL5XContent);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.parseTimeMs).toBeDefined();

    // Verify basic structure
    expect(result.data?.name).toBe('PLC100_Mashing');
    expect(result.data?.vendor).toBe('rockwell');
    expect(result.data?.sourceFormat).toBe('l5x');

    // Check vendor metadata
    expect(result.data?.vendorMetadata?.targetType).toBe('Program');
    expect(result.data?.vendorMetadata?.targetName).toBe('Cooker_1_AutoLogic');

    // Should have data types
    expect(result.data?.dataTypes.length).toBeGreaterThan(0);

    // Find specific data type from the file
    const analogValveUDT = result.data?.dataTypes.find((dt) => dt.name === 'Analog_Valve_UDT');
    expect(analogValveUDT).toBeDefined();
    expect(analogValveUDT?.class).toBe('User');
    expect(analogValveUDT?.members.length).toBeGreaterThan(0);

    // Should have programs
    expect(result.data?.programs.length).toBeGreaterThan(0);

    // Find the Cooker_1_AutoLogic program
    const cookerProgram = result.data?.programs.find((p) => p.name === 'Cooker_1_AutoLogic');
    expect(cookerProgram).toBeDefined();
    expect(cookerProgram?.routines.length).toBeGreaterThan(0);

    // Check for RLL routines with rungs
    const rllRoutine = cookerProgram?.routines.find((r) => r.type === 'RLL' && r.rungs.length > 0);
    expect(rllRoutine).toBeDefined();

    // Verify rungs are parsed
    const firstRung = rllRoutine?.rungs[0];
    expect(firstRung).toBeDefined();
    expect(typeof firstRung?.number).toBe('number');
    expect(typeof firstRung?.raw).toBe('string');
  });

  it('should parse AOIs with full metadata from example file', () => {
    const result = l5xParser.parse(exampleL5XContent);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // Should have AOIs
    expect(result.data?.aois.length).toBeGreaterThan(0);

    // Find the Analog_Input AOI
    const analogInputAOI = result.data?.aois.find((aoi) => aoi.name === 'Analog_Input');
    expect(analogInputAOI).toBeDefined();

    // Check basic metadata
    expect(analogInputAOI?.class).toBe('Standard');
    expect(analogInputAOI?.revision).toBe('1.1');

    // Check execution options
    expect(analogInputAOI?.executePrescan).toBe(false);
    expect(analogInputAOI?.executePostscan).toBe(false);
    expect(analogInputAOI?.executeEnableInFalse).toBe(false);

    // Check parameters
    expect(analogInputAOI?.parameters.length).toBeGreaterThan(0);

    // Find EnableIn parameter (standard AOI parameter)
    const enableInParam = analogInputAOI?.parameters.find((p) => p.name === 'EnableIn');
    expect(enableInParam).toBeDefined();
    expect(enableInParam?.usage).toBe('Input');
    expect(enableInParam?.dataType).toBe('BOOL');
    expect(enableInParam?.visible).toBe(false);
    expect(enableInParam?.required).toBe(false);

    // Find a visible input parameter
    const inRawParam = analogInputAOI?.parameters.find((p) => p.name === 'In_Raw');
    expect(inRawParam).toBeDefined();
    expect(inRawParam?.usage).toBe('Input');
    expect(inRawParam?.visible).toBe(true);
    expect(inRawParam?.required).toBe(true);

    // Check local tags
    expect(analogInputAOI?.localTags.length).toBeGreaterThan(0);

    // Check that AOI has routines (internal logic)
    expect(analogInputAOI?.routines.length).toBeGreaterThan(0);

    // Find the Logic routine
    const logicRoutine = analogInputAOI?.routines.find((r) => r.name === 'Logic');
    expect(logicRoutine).toBeDefined();
    expect(logicRoutine?.type).toBe('RLL');
    expect(logicRoutine?.rungs.length).toBeGreaterThan(0);
  });

  it('should parse VFD AOI with InOut parameters', () => {
    const result = l5xParser.parse(exampleL5XContent);

    expect(result.success).toBe(true);

    // Find the PF525_VFD_E_ENET AOI
    const vfdAOI = result.data?.aois.find((aoi) => aoi.name === 'PF525_VFD_E_ENET');
    expect(vfdAOI).toBeDefined();

    // Check revision extension
    expect(vfdAOI?.revisionExtension).toBe('Deluxe Edition');

    // Check for InOut parameters
    const pf525InParam = vfdAOI?.parameters.find((p) => p.name === 'PF525_In');
    expect(pf525InParam).toBeDefined();
    expect(pf525InParam?.usage).toBe('InOut');

    const pf525OutParam = vfdAOI?.parameters.find((p) => p.name === 'PF525_Out');
    expect(pf525OutParam).toBeDefined();
    expect(pf525OutParam?.usage).toBe('InOut');
  });

  it('should parse AOI local tags with dimensions (arrays)', () => {
    const result = l5xParser.parse(exampleL5XContent);

    expect(result.success).toBe(true);

    // Find the Analog_Input AOI
    const analogInputAOI = result.data?.aois.find((aoi) => aoi.name === 'Analog_Input');
    expect(analogInputAOI).toBeDefined();

    // Find the L_ONS local tag which is an array
    const onsTag = analogInputAOI?.localTags.find((t) => t.name === 'L_ONS');
    expect(onsTag).toBeDefined();
    expect(onsTag?.dataType).toBe('BOOL');
    expect(onsTag?.dimensions).toBe(32);
  });

  it('should correctly extract controller name and metadata from Program export', () => {
    const result = l5xParser.parse(exampleL5XContent);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // Controller name should be extracted from Controller element
    expect(result.data?.name).toBe('PLC100_Mashing');

    // Vendor metadata should include both controller name and target name
    expect(result.data?.vendorMetadata?.controllerName).toBe('PLC100_Mashing');
    expect(result.data?.vendorMetadata?.targetName).toBe('Cooker_1_AutoLogic');
    expect(result.data?.vendorMetadata?.targetType).toBe('Program');
  });

  it('should parse data types with usage context information', () => {
    const result = l5xParser.parse(exampleL5XContent);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // Data types from context should have usage set to 'Context'
    const analogValveUDT = result.data?.dataTypes.find((dt) => dt.name === 'Analog_Valve_UDT');
    expect(analogValveUDT).toBeDefined();
    expect(analogValveUDT?.class).toBe('User');
    expect(analogValveUDT?.usage).toBe('Context');
  });

  it('should parse modules with name and usage information', () => {
    const result = l5xParser.parse(exampleL5XContent);

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();

    // Should have modules
    expect(result.data?.modules.length).toBeGreaterThan(0);

    // Find a specific module by name
    const aiModule = result.data?.modules.find((m) => m.name === 'AI_ECP100_C_2');
    expect(aiModule).toBeDefined();
    expect(aiModule?.usage).toBe('Reference');

    // Check that all modules have names
    for (const module of result.data?.modules || []) {
      expect(module.name).toBeDefined();
      expect(typeof module.name).toBe('string');
      expect(module.name.length).toBeGreaterThan(0);
    }
  });
});
