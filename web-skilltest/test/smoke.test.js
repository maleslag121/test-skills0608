import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

test('package.json exists with required scripts', () => {
  const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  assert.equal(pkg.name, 'web-skilltest');
  assert.ok(pkg.scripts.dev);
  assert.ok(pkg.scripts['dev:server']);
  assert.ok(pkg.scripts['db:seed']);
  assert.ok(pkg.scripts.build);
});

test('entry files and server exist', () => {
  assert.ok(existsSync(resolve(root, 'index.html')));
  assert.ok(existsSync(resolve(root, 'src/main.jsx')));
  assert.ok(existsSync(resolve(root, 'src/App.jsx')));
  assert.ok(existsSync(resolve(root, 'server/index.js')));
  assert.ok(existsSync(resolve(root, 'server/db/schema.sql')));
  assert.ok(existsSync(resolve(root, 'docs/database-schema.md')));
});

test('format utils work', async () => {
  const { formatCurrency, PERIODS } = await import('../src/utils/format.js');
  assert.equal(PERIODS.length, 4);
  assert.equal(formatCurrency(128560), '13万');
  assert.equal(formatCurrency(999), '999');
});
