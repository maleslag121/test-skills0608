import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyTicket } from './classify.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const distDir = join(rootDir, 'dist');
const port = Number(process.env.PORT || 3003);

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

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  const url = parseUrl(req);
  const pathname = url.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (pathname === '/health') {
      sendJson(res, 200, { status: 'ok', service: 'ticket-classifier' });
      return;
    }

    if (pathname === '/api/classify' && req.method === 'POST') {
      const raw = await readBody(req);
      let body;
      try {
        body = JSON.parse(raw || '{}');
      } catch {
        sendJson(res, 400, { error: '请求体必须是合法 JSON' });
        return;
      }

      const text = body.text ?? body.content ?? '';
      const result = classifyTicket(text);

      if (result.message) {
        sendJson(res, 400, { error: result.message });
        return;
      }

      sendJson(res, 200, {
        text: String(text).trim(),
        category: result.category,
        priority: result.priority,
        summary: result.summary,
      });
      return;
    }

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
  console.log(`API server: http://127.0.0.1:${port}`);
});
