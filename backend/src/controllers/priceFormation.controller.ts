import type { Request, Response } from 'express';
import { sendList, sendOk } from '../utils/http';
import {
  listPriceFormationsService,
  getPriceFormationService,
  createPriceFormationService,
  updatePriceFormationService,
  deletePriceFormationService,
  duplicatePriceFormationService,
} from '../services/priceFormation.service';

export const priceFormationController = {
  list: async (req: Request, res: Response) => {
    const result = await listPriceFormationsService(req.query as any);
    sendList(res, result.data, result.pagination);
  },
  getOne: async (req: Request, res: Response) => {
    sendOk(res, await getPriceFormationService(req.params.id));
  },
  create: async (req: Request, res: Response) => {
    sendOk(res, await createPriceFormationService(req.body), 201);
  },
  update: async (req: Request, res: Response) => {
    sendOk(res, await updatePriceFormationService(req.params.id, req.body));
  },
  remove: async (req: Request, res: Response) => {
    sendOk(res, await deletePriceFormationService(req.params.id));
  },
  duplicate: async (req: Request, res: Response) => {
    sendOk(res, await duplicatePriceFormationService(req.params.id, req.body?.name), 201);
  },
};
