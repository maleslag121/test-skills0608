import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const port = Number(process.env.PORT || 3009);
const host = process.env.HOST || '0.0.0.0';

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

function serveStatic(res, filePath) {
  const ext = extname(filePath);
  const body = readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  res.end(body);
}

const server = createServer((req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`).pathname;

  if (pathname === '/health') {
    sendJson(res, 200, { status: 'ok', service: 'company-intro' });
    return;
  }

  let filePath = join(rootDir, pathname === '/' ? 'index.html' : pathname);
  if (!existsSync(filePath) || !filePath.startsWith(rootDir)) {
    filePath = join(rootDir, 'index.html');
  }

  try {
    serveStatic(res, filePath);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
});

server.listen(port, host, () => {
  console.log(`company-intro listening on http://${host}:${port}`);
});
