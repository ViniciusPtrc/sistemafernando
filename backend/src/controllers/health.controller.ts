import type { Request, Response } from 'express';
import { databaseStatus } from '../config/db';

export function healthCheck(_req: Request, res: Response): void {
  const database = databaseStatus();
  res.status(database === 'connected' ? 200 : 503).json({
    status: database === 'connected' ? 'ok' : 'degraded',
    database,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}
