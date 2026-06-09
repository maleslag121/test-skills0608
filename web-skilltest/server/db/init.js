import Database from 'better-sqlite3';
import { readFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { seedDatabase } from './seed.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '../..');
const dataDir = join(rootDir, 'data');
const dbPath = process.env.DB_PATH || join(dataDir, 'business.db');

let dbInstance = null;

export function getDbPath() {
  return dbPath;
}

export function getDb() {
  if (dbInstance) return dbInstance;

  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  dbInstance = new Database(dbPath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  dbInstance.exec(schema);

  const storeCount = dbInstance.prepare('SELECT COUNT(*) AS cnt FROM stores').get().cnt;
  if (storeCount === 0) {
    seedDatabase(dbInstance);
  }

  return dbInstance;
}

export function closeDb() {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
