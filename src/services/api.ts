/**
 * Cliente HTTP central. Todos os services falam com o backend por aqui —
 * nenhum componente usa fetch/axios direto.
 *
 * Base URL vem de VITE_API_URL (ex.: http://localhost:3000/api). Em dev, se
 * não definida, usa '/api' e o proxy do Vite encaminha para o backend.
 */
export const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api';

export class ApiError extends Error {
  status: number;
  errors: unknown[];

  constructor(message: string, status = 0, errors: unknown[] = []) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
  }
}

type QueryValue = string | number | boolean | null | undefined;

export function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const [chave, valor] of Object.entries(params)) {
    if (valor === undefined || valor === null || valor === '') continue;
    search.set(chave, String(valor));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

async function parseResposta<T>(response: Response): Promise<T> {
  const texto = await response.text();
  const corpo = texto ? safeJson(texto) : null;

  if (!response.ok) {
    const registro = (corpo && typeof corpo === 'object' ? (corpo as Record<string, unknown>) : {}) as Record<string, unknown>;
    const mensagem =
      typeof registro.message === 'string' && registro.message
        ? registro.message
        : `Erro ${response.status} ao acessar a API`;
    const errorsRaw = registro.errors;
    const errors = Array.isArray(errorsRaw) ? errorsRaw : errorsRaw ? [errorsRaw] : [];
    throw new ApiError(mensagem, response.status, errors);
  }

  return corpo as T;
}

function safeJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

function requestInit(init?: RequestInit): RequestInit {
  return {
    ...init,
    headers: { Accept: 'application/json', ...(init?.headers ?? {}) },
  };
}

async function executar<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, requestInit(init));
  } catch (erro) {
    throw new ApiError(
      'Não foi possível conectar ao servidor. Verifique se o backend está no ar.',
      0,
      [String(erro)],
    );
  }
  return parseResposta<T>(response);
}

export function apiGet<T>(path: string): Promise<T> {
  return executar<T>(path, { method: 'GET' });
}

export function apiSend<T>(path: string, method: 'POST' | 'PUT' | 'DELETE' | 'PATCH', body?: unknown): Promise<T> {
  return executar<T>(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Envio multipart (importação de arquivos). Não define Content-Type — o browser cuida do boundary. */
export function apiUpload<T>(path: string, form: FormData): Promise<T> {
  return executar<T>(path, { method: 'POST', body: form });
}

/** Envelope de listagem padrão do backend. */
export interface RespostaListaApi<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}
