import buildApp from './app.js';

const PORT = Number(process.env.PORT || 8787);
// 默认只监听本机：记事本数据不需要暴露到局域网。
const HOST = process.env.HOST || '127.0.0.1';

const app = await buildApp({ logger: { level: process.env.LOG_LEVEL || 'info' } });

try {
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`notebox listening on http://${HOST}:${PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
