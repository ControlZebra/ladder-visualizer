import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDocumentString, parseString } from '../../src/parsers';

const fixtureDirectory = join(__dirname, '../fixtures/l5x');
const versions = [
  ['33', '10.20.30.40'],
  ['34', '10.20.30.41'],
  ['35', '10.20.30.42'],
] as const;

function fixture(version: string): string {
  return readFileSync(
    join(fixtureDirectory, `controller-configuration-v${version}.L5X`),
    'utf-8'
  );
}

const preservedConfigurationCodes = [
  'PRESERVED_L5X_CONTROLLER_ATTRIBUTES',
  'PRESERVED_L5X_REDUNDANCY_CONFIGURATION',
  'PRESERVED_L5X_SECURITY_CONFIGURATION',
  'PRESERVED_L5X_SAFETY_CONFIGURATION',
  'PRESERVED_L5X_COMM_PORT_CONFIGURATION',
  'PRESERVED_L5X_CST_CONFIGURATION',
  'PRESERVED_L5X_WALL_CLOCK_CONFIGURATION',
  'PRESERVED_L5X_DATA_LOG_CONFIGURATION',
  'PRESERVED_L5X_TIME_SYNCHRONIZATION_CONFIGURATION',
  'PRESERVED_L5X_INTERNET_PROTOCOL_CONFIGURATION',
  'PRESERVED_L5X_ETHERNET_PORT_CONFIGURATION',
  'PRESERVED_L5X_ETHERNET_NETWORK_CONFIGURATION',
];

const preservedConfigurationPaths = [
  '/RSLogix5000Content/Controller[1]',
  '/RSLogix5000Content/Controller[1]/RedundancyInfo[1]',
  '/RSLogix5000Content/Controller[1]/Security[1]',
  '/RSLogix5000Content/Controller[1]/SafetyInfo[1]',
  '/RSLogix5000Content/Controller[1]/CommPorts[1]',
  '/RSLogix5000Content/Controller[1]/CST[1]',
  '/RSLogix5000Content/Controller[1]/WallClockTime[1]',
  '/RSLogix5000Content/Controller[1]/DataLogs[1]',
  '/RSLogix5000Content/Controller[1]/TimeSynchronize[1]',
  '/RSLogix5000Content/Controller[1]/InternetProtocol[1]',
  '/RSLogix5000Content/Controller[1]/EthernetPorts[1]',
  '/RSLogix5000Content/Controller[1]/EthernetNetwork[1]',
];

describe('L5X remaining controller configuration', () => {
  it.each(versions)(
    'normalizes clear controller metadata and reports preserved v%s configuration',
    (version, address) => {
      const result = parseString(fixture(version), 'l5x');

      expect(result.success).toBe(true);
      expect(result.status).toBe('partial');
      expect(result.data).toMatchObject({
        name: `ControllerConfigurationV${version}`,
        processorType: '1756-L85E',
        commPath: `AB_ETHIP-1\\${address}\\Backplane\\0`,
      });
      expect(
        result.warnings
          ?.filter(({ code }) => code?.startsWith('PRESERVED_L5X_') && code !== 'PRESERVED_L5X_CONTENT')
          .map(({ code, location }) => ({ code, path: location?.path }))
      ).toEqual(
        preservedConfigurationCodes.map((code, index) => ({
          code,
          path: preservedConfigurationPaths[index],
        }))
      );
    }
  );

  it('retains complete family subtrees and repeated port members as document fragments', () => {
    const result = parseDocumentString(fixture('35'), 'l5x');
    const controllerPath = '/RSLogix5000Content/Controller[1]';

    expect(result.status).toBe('partial');
    expect(result.data?.fragments).toContainEqual({
      path: `${controllerPath}/CommPorts[1]`,
      reason: 'unmodeled',
      value: {
        SerialPort: [
          expect.objectContaining({ '@_Channel': '0', '@_ComDriverId': 'DF1' }),
          expect.objectContaining({ '@_Channel': '1', '@_ComDriverId': 'ASCII' }),
        ],
      },
    });
    expect(result.data?.fragments).toContainEqual({
      path: `${controllerPath}/EthernetPorts[1]`,
      reason: 'unmodeled',
      value: {
        EthernetPort: [
          expect.objectContaining({ '@_Port': '1', '@_DuplexMode': 'Full' }),
          expect.objectContaining({ '@_Port': '2', '@_DuplexMode': 'Half' }),
        ],
      },
    });
    expect(result.data?.fragments).toContainEqual({
      path: `${controllerPath}/DataLogs[1]`,
      reason: 'unmodeled',
      value: { DataLog: { '@_Name': 'BatchHistory', Entry: { '@_Tag': 'BatchId' } } },
    });
    expect(result.data?.fragments).toContainEqual({
      path: `${controllerPath}/@TimeSlice`,
      reason: 'source-representation',
      value: '20',
    });
    expect(result.data?.mappings).toContainEqual({
      sourcePath: `${controllerPath}/@ProcessorType`,
      resourceId: controllerPath,
      field: 'processorType',
    });
    expect(result.data?.mappings).toContainEqual({
      sourcePath: `${controllerPath}/@CommPath`,
      resourceId: controllerPath,
      field: 'commPath',
    });
  });

  it('does not report configuration diagnostics when the families and attributes are absent', () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="Empty" TargetType="Controller" ContainsContext="false">
  <Controller Use="Target" Name="Empty" />
</RSLogix5000Content>`;
    const result = parseString(source, 'l5x');

    expect(result.success).toBe(true);
    expect(result.status).toBe('complete');
    expect(result.data).toMatchObject({ name: 'Empty', processorType: undefined, commPath: undefined });
    expect(
      result.warnings?.some(({ code }) =>
        preservedConfigurationCodes.includes(code as (typeof preservedConfigurationCodes)[number])
      ) ?? false
    )
      .toBe(false);
  });
});
