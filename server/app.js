import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import routes from './routes.js';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * 构建 Fastify 实例但不监听端口，便于 inject 测试与后续嵌入。
 */
export async function buildApp({ logger = true } = {}) {
  const app = Fastify({
    logger,
    bodyLimit: 10 * 1024 * 1024,
  });

  await routes(app);

  const distDir = join(here, '..', 'web', 'dist');
  if (existsSync(distDir)) {
    await app.register(fastifyStatic, { root: distDir, prefix: '/' });
    app.setNotFoundHandler((request, reply) => {
      if (request.raw.url?.startsWith('/api')) {
        return reply.code(404).send({ error: 'not found' });
      }
      return reply.sendFile('index.html');
    });
  } else {
    app.setNotFoundHandler((request, reply) => {
      reply.code(404).send({ error: '未找到构建产物，开发模式请访问 Vite 端口（默认 5173）' });
    });
  }

  app.setErrorHandler((error, request, reply) => {
    app.log.error({ err: error, url: request.url }, 'request failed');
    const status = error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
    reply.code(status).send({ error: error.message || 'internal error' });
  });

  return app;
}

export default buildApp;
