import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureDirectory = join(repositoryRoot, 'tests/fixtures/l5x');
const schemaDirectory = process.env.L5X_SCHEMA_DIR
  ? resolve(process.env.L5X_SCHEMA_DIR)
  : resolve(repositoryRoot, '../l5x-schema/schemas');

if (!existsSync(schemaDirectory)) {
  throw new Error(
    `L5X schema directory not found: ${schemaDirectory}. Set L5X_SCHEMA_DIR to the directory containing l5x-v33.xsd through l5x-v35.xsd.`
  );
}

const intentionallyInvalidPrefixes = ['adversarial-', 'malformed-'];
const fixtureFiles = readdirSync(fixtureDirectory)
  .filter((file) => file.endsWith('.L5X'))
  .filter((file) => !intentionallyInvalidPrefixes.some((prefix) => file.startsWith(prefix)))
  .sort();

for (const file of fixtureFiles) {
  const version = file.match(/-v(33|34|35)\.L5X$/)?.[1];
  if (!version) {
    throw new Error(`Fixture name does not declare a supported schema version: ${file}`);
  }

  execFileSync(
    'xmllint',
    [
      '--noout',
      '--schema',
      join(schemaDirectory, `l5x-v${version}.xsd`),
      join(fixtureDirectory, file),
    ],
    { stdio: 'inherit' }
  );
}

console.log(`Validated ${fixtureFiles.length} L5X fixtures against schemas v33-v35.`);
