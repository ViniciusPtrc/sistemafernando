import mongoose from 'mongoose';
import { env } from './env';

mongoose.set('strictQuery', true);

let connecting: Promise<typeof mongoose> | null = null;

/**
 * Conecta ao MongoDB. Não derruba o processo em caso de falha — o servidor
 * continua no ar e /api/health passa a reportar database:"disconnected".
 */
export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;

  mongoose.connection.on('connected', () => console.log('[db] MongoDB conectado'));
  mongoose.connection.on('disconnected', () => console.warn('[db] MongoDB desconectado'));
  mongoose.connection.on('error', (err) => console.error('[db] erro de conexão:', err.message));

  try {
    connecting =
      connecting ??
      mongoose.connect(env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
      });
    await connecting;
  } catch (err) {
    connecting = null;
    console.error('[db] Falha ao conectar no MongoDB:', (err as Error).message);
    console.error('[db] O servidor seguirá no ar; verifique MONGODB_URI no .env.');
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export function databaseStatus(): 'connected' | 'connecting' | 'disconnected' {
  switch (mongoose.connection.readyState) {
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    default:
      return 'disconnected';
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  connecting = null;
}
