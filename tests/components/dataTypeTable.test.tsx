import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { DataTypeTable } from '../../src/components/DataTypeTable';
import type { NormalizedDataType } from '../../src/types';

describe('DataTypeTable', () => {
  it('shows only name and description above a three-column member table', () => {
    const dataType: NormalizedDataType = {
      name: 'ValveControl',
      family: 'NoFamily',
      class: 'AddOnDefined',
      category: 'AddOnDefined',
      resolution: 'Declared',
      description: 'Controls one valve.',
      members: [
        {
          name: 'EnableIn', dataType: 'BOOL', dimension: 0, dimensions: [],
          usage: 'Input', required: false, visible: false,
        },
        {
          name: 'Samples', dataType: 'REAL', dimension: 2, dimensions: [2, 3],
          usage: 'InOut', required: true, visible: true,
        },
      ],
      provenance: ['AddOnInstructionDefinitions/ValveControl/Parameters'],
    };

    const markup = renderToStaticMarkup(<DataTypeTable dataType={dataType} />);

    expect(markup.match(/<th(?=[ >])/g)).toHaveLength(3);
    expect(markup).toContain('Name');
    expect(markup).toContain('Data Type');
    expect(markup).toContain('Description');
    expect(markup).not.toContain('Add-On Defined');
    expect(markup).not.toContain('Usage');
    expect(markup).not.toContain('Dimensions');
    expect(markup).not.toContain('External Access');
    expect(markup.indexOf('EnableIn')).toBeLessThan(markup.indexOf('Samples'));
    expect(markup).toContain('Controls one valve.');
  });

  it('distinguishes atomic and unresolved empty states', () => {
    const atomic: NormalizedDataType = {
      name: 'DINT', class: 'BuiltIn', category: 'Predefined', resolution: 'Atomic', members: [],
    };
    const unresolved: NormalizedDataType = {
      name: 'MESSAGE', class: 'BuiltIn', category: 'Predefined', resolution: 'Unresolved', members: [],
    };

    expect(renderToStaticMarkup(<DataTypeTable dataType={atomic} />)).toContain(
      'atomic data type with no member structure'
    );
    expect(renderToStaticMarkup(<DataTypeTable dataType={unresolved} />)).toContain(
      'member structure is not included in the L5X export'
    );
  });
});
