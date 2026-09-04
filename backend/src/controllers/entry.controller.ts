import type { Request, Response } from 'express';
import type { EntryKind } from '../repositories/entry.repo';
import {
  createEntryService,
  deleteEntryService,
  getEntryService,
  listEntriesService,
  summaryService,
  updateEntryService,
} from '../services/entry.service';
import { sendList, sendOk } from '../utils/http';

export function makeEntryController(kind: EntryKind) {
  return {
    list: async (req: Request, res: Response) => {
      const result = await listEntriesService(kind, req.query as any);
      sendList(res, result.data, result.pagination);
    },
    summary: async (req: Request, res: Response) => {
      sendOk(res, await summaryService(kind, req.query as any));
    },
    getOne: async (req: Request, res: Response) => {
      sendOk(res, await getEntryService(kind, req.params.id));
    },
    create: async (req: Request, res: Response) => {
      sendOk(res, await createEntryService(kind, req.body), 201);
    },
    update: async (req: Request, res: Response) => {
      sendOk(res, await updateEntryService(kind, req.params.id, req.body));
    },
    remove: async (req: Request, res: Response) => {
      sendOk(res, await deleteEntryService(kind, req.params.id));
    },
  };
}
