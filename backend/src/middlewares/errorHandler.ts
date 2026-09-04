import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { HttpError } from '../utils/http';

interface ErrorBody {
  success: false;
  message: string;
  errors: unknown[];
}

export function notFoundHandler(_req: Request, res: Response): void {
  const body: ErrorBody = { success: false, message: 'Rota não encontrada', errors: [] };
  res.status(404).json(body);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  let status = 500;
  let message = 'Erro interno do servidor';
  let errors: unknown[] = [];

  if (err instanceof HttpError) {
    status = err.status;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof ZodError) {
    status = 422;
    message = 'Dados inválidos';
    errors = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    status = 422;
    message = 'Falha de validação';
    errors = Object.values(err.errors).map((e) => ({ path: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    status = 400;
    message = `Valor inválido para o campo "${err.path}"`;
  } else if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    status = 409;
    message = 'Registro duplicado';
    errors = [(err as { keyValue?: unknown }).keyValue ?? {}];
  } else if (err instanceof Error) {
    message = err.message || message;
  }

  if (status >= 500) {
    console.error('[error]', err);
  }

  const body: ErrorBody = { success: false, message, errors };
  res.status(status).json(body);
}
