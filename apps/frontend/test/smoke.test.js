import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('frontend smoke', () => {
  it('passes basic assertion', () => {
    assert.equal(1 + 1, 2);
  });
});
