import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const DIR = join(__dirname, '../../data/tourism');
const REPLACEMENT = '�';

// Every string value in a JSON tree, with its JSON path.
function strings(value: unknown, path = ''): [string, string][] {
  if (typeof value === 'string') return [[path, value]];
  if (Array.isArray(value))
    return value.flatMap((v, i) => strings(v, `${path}[${i}]`));
  if (value && typeof value === 'object')
    return Object.entries(value).flatMap(([k, v]) =>
      strings(v, path ? `${path}.${k}` : k)
    );
  return [];
}

describe('tourism JSON text', () => {
  const files = readdirSync(DIR).filter(f => f.endsWith('.json'));

  it.each(files)('%s contains no U+FFFD replacement character', file => {
    const data = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
    const bad = strings(data).filter(([, s]) => s.includes(REPLACEMENT));
    expect(
      bad.map(([p]) => p),
      `U+FFFD found in ${file}`
    ).toEqual([]);
  });
});
