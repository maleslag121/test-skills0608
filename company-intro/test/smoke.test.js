import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

describe('company-intro static assets', () => {
  it('index.html exists and contains company name', () => {
    const html = join(rootDir, 'index.html');
    assert.ok(existsSync(html));
    const content = readFileSync(html, 'utf8');
    assert.match(content, /澄观科技/);
  });

  it('css and js exist', () => {
    assert.ok(existsSync(join(rootDir, 'css/style.css')));
    assert.ok(existsSync(join(rootDir, 'js/main.js')));
  });
});
