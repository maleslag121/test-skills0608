import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const testDbPath = join(__dirname, '../data-test/business.db');

before(() => {
  process.env.DB_PATH = testDbPath;
});

after(async () => {
  const { closeDb } = await import('../server/db/init.js');
  closeDb();
  const testDir = join(__dirname, '../data-test');
  if (existsSync(testDir)) rmSync(testDir, { recursive: true, force: true });
  delete process.env.DB_PATH;
});

test('database seeds and aggregates dashboard data', async () => {
  const { getDb, closeDb } = await import('../server/db/init.js');
  const db = getDb();

  const storeCount = db.prepare('SELECT COUNT(*) AS cnt FROM stores').get().cnt;
  assert.ok(storeCount >= 8, 'should have seeded stores');

  const orderCount = db.prepare('SELECT COUNT(*) AS cnt FROM orders').get().cnt;
  assert.ok(orderCount > 1000, 'should have seeded orders');

  const { getDashboardData } = await import('../server/db/query.js');
  const data = getDashboardData(db, 'month');

  assert.equal(data.kpis.length, 4);
  assert.ok(data.kpis[0].value >= 0);
  assert.ok(data.revenueTrend.length > 0);
  assert.ok(data.categories.length >= 4);
  assert.ok(data.channels.length >= 3);
  assert.ok(data.stores.length <= 5);

  closeDb();
});

test('schema meta has all tables documented', async () => {
  const { SCHEMA_META } = await import('../server/schema-meta.js');
  assert.equal(SCHEMA_META.tables.length, 5);
  for (const table of SCHEMA_META.tables) {
    assert.ok(table.label);
    assert.ok(table.fields.length >= 5);
    for (const field of table.fields) {
      assert.ok(field.header);
      assert.ok(field.column);
      assert.ok(field.example);
      assert.ok(field.note);
    }
  }
});
