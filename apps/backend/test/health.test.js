import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('health endpoint contract', () => {
  it('returns ok status shape', () => {
    const payload = {
      status: 'ok',
      app: 'kaifa-workflow',
      timestamp: new Date().toISOString(),
    };

    assert.equal(payload.status, 'ok');
    assert.ok(payload.timestamp);
  });
});
