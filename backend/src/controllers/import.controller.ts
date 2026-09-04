import type { Request, Response } from 'express';
import { commitImportService, listImportsService, previewImportService } from '../services/import.service';
import { sendList, sendOk } from '../utils/http';
import { HttpError } from '../utils/http';
import type { ImportKind } from '../imports/normalize';
import { coerceImportSource } from '../imports/sources';
import type { ImportSource } from '../models/enums';

function readImportForm(req: Request): { companyId: string; type: ImportKind; source: ImportSource } {
  const companyId = String(req.body?.companyId ?? '').trim();
  const type = String(req.body?.type ?? '').trim();
  if (!companyId) throw new HttpError(400, 'companyId é obrigatório.');
  if (type !== 'receivable' && type !== 'payable') {
    throw new HttpError(400, 'type deve ser "receivable" ou "payable".');
  }
  const source = coerceImportSource(req.body?.source);
  return { companyId, type, source };
}

export const importController = {
  preview: async (req: Request, res: Response) => {
    const { companyId, type, source } = readImportForm(req);
    sendOk(res, await previewImportService(companyId, type, source, req.file));
  },
  commit: async (req: Request, res: Response) => {
    const { companyId, type, source } = readImportForm(req);
    sendOk(res, await commitImportService(companyId, type, source, req.file));
  },
  list: async (req: Request, res: Response) => {
    const result = await listImportsService(req.query as any);
    sendList(res, result.data, result.pagination);
  },
};
