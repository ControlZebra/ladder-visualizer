import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { L5XParser } from '../../src/parsers/l5x';
import { parseDocumentString, parseString } from '../../src/parsers';

const fixtureDirectory = join(__dirname, '../fixtures/l5x');

function readFixture(name: string): string {
  return readFileSync(join(fixtureDirectory, name), 'utf-8');
}

describe('L5X trends and quick-watch lists', () => {
  it('normalizes exact trend, pen, and watch-tag semantics from a singleton v33 shape', () => {
    const result = parseString(readFixture('trends-watch-lists-v33.L5X'), 'l5x');

    expect(result.success).toBe(true);
    expect(result.status).toBe('complete');
    expect(result.data?.trends).toEqual([
      {
        name: 'ProcessTrend',
        uid: '18446744073709551615',
        description: 'Process trend description',
        samplePeriod: 10,
        numberOfCaptures: 2,
        captureSizeType: 'Samples',
        captureSize: 500,
        startTriggerType: 'Event Trigger',
        startTriggerTag1: 'StartTag',
        startTriggerOperation1: 1,
        startTriggerTargetType1: 'Target Value',
        startTriggerTargetValue1: '5',
        startTriggerTargetTag1: 'StartTarget',
        startTriggerLogicalOperation: 'AND',
        startTriggerTag2: 'PermitTag',
        startTriggerOperation2: 2,
        startTriggerTargetType2: 'Target Tag',
        startTriggerTargetValue2: '6',
        startTriggerTargetTag2: 'PermitTarget',
        preSampleType: 'Samples',
        preSamples: 12,
        stopTriggerType: 'Event Trigger',
        stopTriggerTag1: 'StopTag',
        stopTriggerOperation1: 3,
        stopTriggerTargetType1: 'Target Tag',
        stopTriggerTargetValue1: '7',
        stopTriggerTargetTag1: 'StopTarget',
        stopTriggerLogicalOperation: 'OR',
        stopTriggerTag2: 'FaultTag',
        stopTriggerOperation2: 4,
        stopTriggerTargetType2: 'Target Value',
        stopTriggerTargetValue2: '8',
        stopTriggerTargetTag2: 'FaultTarget',
        postSampleType: 'Time Period',
        postSamples: 25,
        trendxVersion: '5.2',
        pens: [
          {
            name: 'Temperature',
            description: 'Temperature pen',
            color: '#ff0000',
            visible: true,
            width: 2,
            type: 'Analog',
            style: 1,
            marker: 3,
            min: -1.5,
            max: 42.25,
            engineeringUnits: 'degC',
          },
        ],
      },
    ]);
    expect(result.data?.quickWatchLists).toEqual([
      {
        name: 'Operators',
        watchTags: [{ specifier: 'Temperature', scope: 'MainProgram' }],
      },
    ]);
  });

  it('preserves source order for repeated v34 trends, pens, lists, and watch tags', () => {
    const result = new L5XParser().parse(readFixture('trends-watch-lists-v34.L5X'));

    expect(result.success).toBe(true);
    expect(result.status).toBe('complete');
    expect(result.data?.trends.map((trend) => trend.name)).toEqual(['Motion', 'EmptyPens']);
    expect(result.data?.trends.map((trend) => trend.description)).toEqual([
      'Motion trend',
      'Empty pens',
    ]);
    expect(result.data?.trends[0].pens).toMatchObject([
      {
        name: 'Axis.ActualPosition',
        description: 'Actual position',
        visible: false,
        type: 'Digital',
        min: -100,
        max: 100,
      },
      { name: 'Axis.CommandPosition', type: 'Full-Width', engineeringUnits: 'mm' },
    ]);
    expect(result.data?.trends[1].pens).toEqual([]);
    expect(result.data?.quickWatchLists).toEqual([
      {
        name: 'MotionValues',
        watchTags: [
          { specifier: 'Axis.ActualPosition', scope: 'MotionProgram' },
          { specifier: 'Axis.CommandPosition', scope: 'MotionProgram' },
        ],
      },
      {
        name: 'ControllerValues',
        watchTags: [{ specifier: 'MachineState', scope: '' }],
      },
    ]);
  });

  it('keeps omitted optional fields and empty v35 children absent', () => {
    const result = parseString(readFixture('trends-watch-lists-v35.L5X'), 'l5x');

    expect(result.success).toBe(true);
    expect(result.status).toBe('complete');
    expect(result.data?.trends).toEqual([
      { name: 'Minimal', description: 'Minimal trend', pens: [] },
    ]);
    expect(result.data?.quickWatchLists).toEqual([{ name: 'Empty', watchTags: [] }]);
  });

  it('returns empty arrays when trends and quick-watch lists are absent', () => {
    const source = `<?xml version="1.0" encoding="UTF-8"?>
<RSLogix5000Content SchemaRevision="1.0" SoftwareRevision="35.01" TargetName="Empty" TargetType="Controller" ContainsContext="false">
  <Controller Use="Target" Name="Empty" />
</RSLogix5000Content>`;
    const result = parseString(source, 'l5x');

    expect(result.data?.trends).toEqual([]);
    expect(result.data?.quickWatchLists).toEqual([]);
  });

  it('preserves opaque templates while accounting for normalized source leaves', () => {
    const result = parseDocumentString(readFixture('trends-watch-lists-v33.L5X'), 'l5x');
    const controllerPath = '/RSLogix5000Content/Controller[1]';

    expect(result.status).toBe('complete');
    expect(result.data?.fragments).toContainEqual(expect.objectContaining({
      path: `${controllerPath}/Trends[1]/Trend[1]/Template[1]`,
      reason: 'source-representation',
      value: 'opaque-studio-template',
    }));
    expect(result.data?.fragments).not.toContainEqual(expect.objectContaining({
      path: `${controllerPath}/Trends[1]`,
      reason: 'unmodeled',
    }));
    expect(result.data?.fragments).not.toContainEqual(expect.objectContaining({
      path: `${controllerPath}/QuickWatchLists[1]`,
      reason: 'unmodeled',
    }));
    expect(result.data?.mappings).toContainEqual({
      sourcePath: `${controllerPath}/Trends[1]/Trend[1]/Pens[1]/Pen[1]/@EngUnits`,
      resourceId: controllerPath,
      field: 'trends.0.pens.0.engineeringUnits',
    });
    expect(result.data?.mappings).toContainEqual({
      sourcePath: `${controllerPath}/Trends[1]/Trend[1]/Description[1]/Value[1]`,
      resourceId: controllerPath,
      field: 'trends.0.description',
    });
    expect(result.data?.mappings).toContainEqual({
      sourcePath: `${controllerPath}/Trends[1]/Trend[1]/Pens[1]/Pen[1]/Description[1]/LocalizedDescription[1]/Value[1]`,
      resourceId: controllerPath,
      field: 'trends.0.pens.0.description',
    });
    expect(result.data?.mappings).toContainEqual({
      sourcePath: `${controllerPath}/QuickWatchLists[1]/QuickWatchList[1]/WatchTag[1]/@Specifier`,
      resourceId: controllerPath,
      field: 'quickWatchLists.0.watchTags.0.specifier',
    });
  });

  it('reports unsafe trend and pen integers without discarding the usable controller', () => {
    const result = parseString(readFixture('trend-numeric-overflow-v35.L5X'), 'l5x');

    expect(result.success).toBe(true);
    expect(result.status).toBe('partial');
    expect(result.data?.trends).toEqual([
      { name: 'Overflow', pens: [{ name: 'OverflowPen' }] },
    ]);
    expect(result.warnings?.filter(({ code }) => code === 'UNSUPPORTED_L5X_TREND_NUMERIC_VALUE'))
      .toEqual([
        expect.objectContaining({
          location: { path: '/RSLogix5000Content/Controller[1]/Trends[1]/Trend[1]/@SamplePeriod' },
        }),
        expect.objectContaining({
          location: { path: '/RSLogix5000Content/Controller[1]/Trends[1]/Trend[1]/Pens[1]/Pen[1]/@Width' },
        }),
      ]);
  });
});
