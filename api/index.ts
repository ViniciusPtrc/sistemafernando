import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from '../backend/src/app';
import { connectDatabase } from '../backend/src/config/db';

/**
 * Entrada serverless da Vercel: mesmo Express de sempre, só que sem `app.listen`.
 * `connectDatabase` é idempotente (não reconecta se já houver conexão viva), então
 * em invocações "quentes" (mesma instância reaproveitada) isso não tem custo real.
 */
const app = createApp();

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  await connectDatabase();
  app(req, res);
}
