import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, closeDb, getDbPath } from './db/init.js';
import { getDashboardData, getTablePreview } from './db/query.js';
import { SCHEMA_META } from './schema-meta.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const port = Number(process.env.PORT || 3002);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function parseUrl(req) {
  return new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
}

const server = createServer(async (req, res) => {
  const url = parseUrl(req);
  const pathname = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (pathname === '/health') {
      sendJson(res, 200, { status: 'ok', db: getDbPath() });
      return;
    }

    if (pathname === '/api/schema') {
      const db = getDb();
      const previews = {};
      for (const t of SCHEMA_META.tables) {
        previews[t.table] = getTablePreview(db, t.table, 3);
      }
      sendJson(res, 200, { ...SCHEMA_META, previews });
      return;
    }

    if (pathname === '/api/dashboard') {
      const period = url.searchParams.get('period') || 'today';
      const db = getDb();
      sendJson(res, 200, getDashboardData(db, period));
      return;
    }

    if (pathname === '/api/stats') {
      const db = getDb();
      sendJson(res, 200, {
        dbPath: getDbPath(),
        stores: db.prepare('SELECT COUNT(*) AS cnt FROM stores').get().cnt,
        orders: db.prepare('SELECT COUNT(*) AS cnt FROM orders').get().cnt,
        customers: db.prepare('SELECT COUNT(*) AS cnt FROM customers').get().cnt,
      });
      return;
    }

    // 静态文件（生产构建）
    if (req.method === 'GET' && existsSync(distDir)) {
      let filePath = pathname === '/' ? '/index.html' : pathname;
      const fullPath = join(distDir, filePath);
      if (existsSync(fullPath) && !fullPath.includes('..')) {
        const ext = extname(fullPath);
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(readFileSync(fullPath));
        return;
      }
      if (!pathname.startsWith('/api')) {
        const indexPath = join(distDir, 'index.html');
        if (existsSync(indexPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(readFileSync(indexPath));
          return;
        }
      }
    }

    sendJson(res, 404, { error: 'Not Found' });
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: err.message });
  }
});

server.listen(port, '0.0.0.0', () => {
  getDb(); // 初始化数据库
  console.log(`API server: http://127.0.0.1:${port}`);
  console.log(`Database:   ${getDbPath()}`);
});

process.on('SIGINT', () => {
  closeDb();
  process.exit(0);
});
