import { describe, it, expect, beforeEach } from 'vitest';
import { L5XParser, l5xParser } from '../../src/parsers/l5x';
import { readFileSync } from 'fs';
import { join } from 'path';

const exampleL5XPath = join(__dirname, '../../examples/Cooker_1_AutoLogic_Program.L5X');
const exampleL5XContent = readFileSync(exampleL5XPath, 'utf-8');

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
    it('should parse minimal L5X content', () => {
      const l5xContent = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="TestProgram" TargetType="Program">
<Controller Use="Context" Name="TestController">
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
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="Test" TargetType="Program">
<Controller Use="Context" Name="TestController">
<DataTypes>
<DataType Name="MyUDT" Family="NoFamily" Class="User">
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

    it('should fail for invalid XML', () => {
      // fast-xml-parser is lenient with malformed XML, so we need to use
      // something that will definitely fail validation
      const invalidXml = 'This is not XML at all';
      const result = parser.parse(invalidXml);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      // Will fail on structure validation rather than XML parsing
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
    const analogValveUDT = result.data?.dataTypes.find(dt => dt.name === 'Analog_Valve_UDT');
    expect(analogValveUDT).toBeDefined();
    expect(analogValveUDT?.class).toBe('User');
    expect(analogValveUDT?.members.length).toBeGreaterThan(0);

    // Should have programs
    expect(result.data?.programs.length).toBeGreaterThan(0);
    
    // Find the Cooker_1_AutoLogic program
    const cookerProgram = result.data?.programs.find(p => p.name === 'Cooker_1_AutoLogic');
    expect(cookerProgram).toBeDefined();
    expect(cookerProgram?.routines.length).toBeGreaterThan(0);
    
    // Check for RLL routines with rungs
    const rllRoutine = cookerProgram?.routines.find(r => r.type === 'RLL' && r.rungs.length > 0);
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
    const analogInputAOI = result.data?.aois.find(aoi => aoi.name === 'Analog_Input');
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
    const enableInParam = analogInputAOI?.parameters.find(p => p.name === 'EnableIn');
    expect(enableInParam).toBeDefined();
    expect(enableInParam?.usage).toBe('Input');
    expect(enableInParam?.dataType).toBe('BOOL');
    expect(enableInParam?.visible).toBe(false);
    expect(enableInParam?.required).toBe(false);
    
    // Find a visible input parameter
    const inRawParam = analogInputAOI?.parameters.find(p => p.name === 'In_Raw');
    expect(inRawParam).toBeDefined();
    expect(inRawParam?.usage).toBe('Input');
    expect(inRawParam?.visible).toBe(true);
    expect(inRawParam?.required).toBe(true);
    
    // Check local tags
    expect(analogInputAOI?.localTags.length).toBeGreaterThan(0);
    
    // Check that AOI has routines (internal logic)
    expect(analogInputAOI?.routines.length).toBeGreaterThan(0);
    
    // Find the Logic routine
    const logicRoutine = analogInputAOI?.routines.find(r => r.name === 'Logic');
    expect(logicRoutine).toBeDefined();
    expect(logicRoutine?.type).toBe('RLL');
    expect(logicRoutine?.rungs.length).toBeGreaterThan(0);
  });

  it('should parse VFD AOI with InOut parameters', () => {
    const result = l5xParser.parse(exampleL5XContent);

    expect(result.success).toBe(true);

    // Find the PF525_VFD_E_ENET AOI
    const vfdAOI = result.data?.aois.find(aoi => aoi.name === 'PF525_VFD_E_ENET');
    expect(vfdAOI).toBeDefined();
    
    // Check revision extension
    expect(vfdAOI?.revisionExtension).toBe('Deluxe Edition');
    
    // Check for InOut parameters
    const pf525InParam = vfdAOI?.parameters.find(p => p.name === 'PF525_In');
    expect(pf525InParam).toBeDefined();
    expect(pf525InParam?.usage).toBe('InOut');
    
    const pf525OutParam = vfdAOI?.parameters.find(p => p.name === 'PF525_Out');
    expect(pf525OutParam).toBeDefined();
    expect(pf525OutParam?.usage).toBe('InOut');
  });

  it('should parse AOI local tags with dimensions (arrays)', () => {
    const result = l5xParser.parse(exampleL5XContent);

    expect(result.success).toBe(true);

    // Find the Analog_Input AOI
    const analogInputAOI = result.data?.aois.find(aoi => aoi.name === 'Analog_Input');
    expect(analogInputAOI).toBeDefined();
    
    // Find the L_ONS local tag which is an array
    const onsTag = analogInputAOI?.localTags.find(t => t.name === 'L_ONS');
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
    const analogValveUDT = result.data?.dataTypes.find(dt => dt.name === 'Analog_Valve_UDT');
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
    const aiModule = result.data?.modules.find(m => m.name === 'AI_ECP100_C_2');
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
