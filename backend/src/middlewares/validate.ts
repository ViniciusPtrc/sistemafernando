import type { NextFunction, Request, Response } from 'express';
import { ZodTypeAny, z } from 'zod';

interface Schemas {
  params?: ZodTypeAny;
  query?: ZodTypeAny;
  body?: ZodTypeAny;
}

/**
 * Valida params/query/body com zod e SUBSTITUI req.* pelo objeto já parseado
 * e tipado. Nada de objeto cru do cliente chega às camadas de baixo (evita
 * NoSQL injection e coerção implícita).
 */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) req.params = schemas.params.parse(req.params) as typeof req.params;
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query) as Record<string, unknown>;
        // req.query é getter-only no Express 4 — troca o objeto de forma resiliente
        try {
          Object.defineProperty(req, 'query', { value: parsed, writable: true, configurable: true });
        } catch {
          const q = req.query as Record<string, unknown>;
          for (const k of Object.keys(q)) delete q[k];
          Object.assign(q, parsed);
        }
      }
      if (schemas.body) req.body = schemas.body.parse(req.body);
      next();
    } catch (err) {
      next(err);
    }
  };
}

/** Helpers de query comuns a várias rotas. */
export const paginationQuery = {
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(25),
  sort: z.string().trim().optional(),
};

export const dateStr = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'use o formato YYYY-MM-DD')
  .optional();
