import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '0.0.0.0';
const frontendDist = join(__dirname, '../../frontend/dist');

const app = Fastify({ logger: true });

app.get('/health', async () => ({
  status: 'ok',
  app: process.env.APP_NAME || 'kaifa-workflow',
  timestamp: new Date().toISOString(),
}));

app.get('/api/hello', async () => ({
  message: 'Hello from kaifa-workflow backend',
}));

if (existsSync(frontendDist)) {
  await app.register(fastifyStatic, {
    root: frontendDist,
    prefix: '/',
  });

  app.setNotFoundHandler((request, reply) => {
    if (request.method === 'GET' && !request.url.startsWith('/api')) {
      return reply.sendFile('index.html');
    }
    reply.code(404).send({ error: 'Not Found' });
  });
}

try {
  await app.listen({ port, host });
  app.log.info(`Server listening on http://${host}:${port}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
