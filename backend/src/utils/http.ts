import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Erro de aplicação com status HTTP e lista opcional de detalhes. */
export class HttpError extends Error {
  status: number;
  errors: unknown[];

  constructor(status: number, message: string, errors: unknown[] = []) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.errors = errors;
  }
}

export const badRequest = (msg: string, errors: unknown[] = []) => new HttpError(400, msg, errors);
export const notFound = (msg = 'Recurso não encontrado') => new HttpError(404, msg);
export const conflict = (msg: string, errors: unknown[] = []) => new HttpError(409, msg, errors);
export const unprocessable = (msg: string, errors: unknown[] = []) => new HttpError(422, msg, errors);

export function sendOk<T>(res: Response, data: T, status = 200): void {
  res.status(status).json(data);
}

export function sendList<T>(res: Response, data: T[], pagination: PaginationMeta): void {
  res.status(200).json({ data, pagination });
}

export function buildPagination(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
