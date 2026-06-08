#!/usr/bin/env node
/**
 * Parse .deploy/config.yml into JSON for GitHub Actions.
 * Minimal YAML parser for flat and one-level nested keys.
 */
import { readFileSync } from 'node:fs';

const file = process.argv[2] || '.deploy/config.yml';
const lines = readFileSync(file, 'utf8').split('\n');

const result = {};
let currentSection = null;

for (const line of lines) {
  if (!line.trim() || line.trim().startsWith('#')) continue;

  const sectionMatch = line.match(/^([a-z_]+):\s*$/);
  if (sectionMatch) {
    currentSection = sectionMatch[1];
    result[currentSection] = {};
    continue;
  }

  const kvMatch = line.match(/^(\s*)([a-z_]+):\s*(.*)$/);
  if (!kvMatch) continue;

  const [, indent, key, rawValue] = kvMatch;
  let value = rawValue.trim().replace(/^["']|["']$/g, '');

  if (value === 'true') value = true;
  else if (value === 'false') value = false;
  else if (/^\d+$/.test(value)) value = Number(value);

  if (indent.length >= 2 && currentSection) {
    result[currentSection][key] = value;
  } else {
    currentSection = null;
    result[key] = value;
  }
}

console.log(JSON.stringify(result));
