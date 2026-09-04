import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/db';

async function main() {
  await connectDatabase(); // não derruba o processo se falhar

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`[server] API ouvindo em http://localhost:${env.PORT}  (env: ${env.NODE_ENV})`);
    console.log(`[server] Health: http://localhost:${env.PORT}/api/health`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n[server] ${signal} recebido, encerrando...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('[server] Falha fatal ao iniciar:', err);
  process.exit(1);
});
