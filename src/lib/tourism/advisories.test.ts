import { describe, expect, it } from 'vitest';

import { advisoriesFor } from './advisories';

describe('advisoriesFor', () => {
  it('returns an empty list when no verified notices are published', () => {
    expect(advisoriesFor('kalibo')).toEqual([]);
  });
});
