import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDocumentString, parseString } from '../../src/parsers';

const read = (name: string) => readFileSync(join(__dirname, `../fixtures/l5x/${name}.L5X`), 'utf8');
const fixture = (version: string) => read(`normalization-coverage-v${version}`);

const controllerPath = '/RSLogix5000Content/Controller[1]';
const aoiPath = `${controllerPath}/AddOnInstructionDefinitions[1]/AddOnInstructionDefinition[1]`;
const programPath = `${controllerPath}/Programs[1]/Program[1]`;

describe('L5X normalization completeness', () => {
  it.each(['33', '34', '35'])(
    'marks preserved-only v%s constructs partial with precise diagnostics',
    (version) => {
      const source = fixture(version);
      const documentResult = parseDocumentString(source, 'l5x');
      const controllerResult = parseString(source, 'l5x');

      for (const result of [documentResult, controllerResult]) {
        expect(result).toMatchObject({ success: true, status: 'partial' });
        expect(result.errors).toBeUndefined();
      }

      expect(documentResult.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'UNNORMALIZED_L5X_PROGRAM_LOCAL_TAG',
            location: { path: `${programPath}/LocalTags[1]/LocalTag[1]` },
          }),
          expect.objectContaining({
            code: 'UNNORMALIZED_L5X_PROGRAM_LOCAL_TAG',
            location: { path: `${programPath}/LocalTags[1]/LocalTag[2]` },
          }),
          expect.objectContaining({
            code: 'UNNORMALIZED_L5X_AOI_DEFAULT_DATA',
            location: { path: `${aoiPath}/Parameters[1]/Parameter[1]/DefaultData[1]` },
          }),
          expect.objectContaining({
            code: 'UNNORMALIZED_L5X_AOI_LOCAL_TAG_DIMENSIONS',
            location: { path: `${aoiPath}/LocalTags[1]/LocalTag[1]/@Dimensions` },
          }),
          expect.objectContaining({
            code: 'UNNORMALIZED_L5X_AOI_DEFAULT_DATA',
            location: { path: `${aoiPath}/LocalTags[1]/LocalTag[1]/DefaultData[1]` },
          }),
          expect.objectContaining({
            code: 'UNNORMALIZED_L5X_AOI_DEFAULT_DATA',
            location: { path: `${aoiPath}/LocalTags[1]/LocalTag[2]/DefaultData[1]` },
          }),
        ])
      );

      expect(
        documentResult.warnings?.filter(({ code }) => code?.startsWith('UNNORMALIZED_L5X_'))
      ).toHaveLength(6);
      expect(
        controllerResult.warnings?.filter(({ code }) => code?.startsWith('UNNORMALIZED_L5X_'))
      ).toEqual(
        documentResult.warnings?.filter(({ code }) => code?.startsWith('UNNORMALIZED_L5X_'))
      );
    }
  );

  it.each(['33', '34', '35'])(
    'does not mark supported v%s AOI source representations partial',
    (version) => {
      const result = parseDocumentString(read(`aoi-v${version}`), 'l5x');

      expect(result).toMatchObject({ success: true, status: 'complete' });
      expect(result.warnings).toContainEqual(
        expect.objectContaining({ code: 'PRESERVED_L5X_CONTENT' })
      );
      expect(result.warnings?.some(({ code }) => code?.startsWith('UNNORMALIZED_L5X_'))).toBe(
        false
      );
      expect(result.data?.fragments).toContainEqual(
        expect.objectContaining({
          path: expect.stringMatching(/\/LocalTags\[1\]$/),
          reason: 'source-representation',
        })
      );
    }
  );

  it.each(['33', '34', '35'])(
    'distinguishes normalized v%s AOI documentation from preserved-only defaults',
    (version) => {
      const result = parseDocumentString(fixture(version), 'l5x');
      const aoi = result.data?.resources.find((resource) => resource.kind === 'aoi');
      const program = result.data?.resources.find((resource) => resource.kind === 'program');

      expect(aoi?.data).toMatchObject({
        revisionNote: 'Normalized revision note',
        helpText: 'Normalized help text',
      });
      expect(program?.data).not.toHaveProperty('localTags');
      expect(
        result.data?.fragments.filter(
          ({ path, reason }) =>
            reason === 'unmodeled' &&
            (path.startsWith(`${aoiPath}/RevisionNote`) ||
              path.startsWith(`${aoiPath}/AdditionalHelpText`))
        )
      ).toEqual([]);
      expect(result.data?.fragments).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: `${programPath}/LocalTags[1]`,
            reason: 'source-representation',
          }),
          expect.objectContaining({
            path: `${aoiPath}/Parameters[1]`,
            reason: 'source-representation',
          }),
          expect.objectContaining({
            path: `${aoiPath}/LocalTags[1]`,
            reason: 'source-representation',
          }),
        ])
      );
    }
  );
});
