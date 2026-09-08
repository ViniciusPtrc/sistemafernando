import type { Request, Response } from 'express';
import { sendList, sendOk } from '../utils/http';
import {
  listContractsService,
  getContractService,
  createContractService,
  updateContractService,
  deleteContractService,
  listLinkableReceivablesService,
  linkReceivablesService,
  unlinkReceivableService,
  listContractCostsService,
  listLinkablePayablesService,
  linkPayablesService,
  createManualCostService,
  updateManualCostService,
  deleteCostService,
} from '../services/contract.service';

export const contractController = {
  list: async (req: Request, res: Response) => {
    const result = await listContractsService(req.query as any);
    sendList(res, result.data, result.pagination);
  },
  getOne: async (req: Request, res: Response) => {
    sendOk(res, await getContractService(req.params.id));
  },
  create: async (req: Request, res: Response) => {
    sendOk(res, await createContractService(req.body), 201);
  },
  update: async (req: Request, res: Response) => {
    sendOk(res, await updateContractService(req.params.id, req.body));
  },
  remove: async (req: Request, res: Response) => {
    sendOk(res, await deleteContractService(req.params.id));
  },

  linkableReceivables: async (req: Request, res: Response) => {
    const { page, limit, search } = req.query as any;
    const result = await listLinkableReceivablesService(req.params.id, page, limit, search);
    sendList(res, result.data, result.pagination);
  },
  linkReceivables: async (req: Request, res: Response) => {
    sendOk(res, await linkReceivablesService(req.params.id, req.body.receivableIds));
  },
  unlinkReceivable: async (req: Request, res: Response) => {
    sendOk(res, await unlinkReceivableService(req.params.id, req.params.subId));
  },

  costs: async (req: Request, res: Response) => {
    sendOk(res, await listContractCostsService(req.params.id));
  },
  linkablePayables: async (req: Request, res: Response) => {
    const { page, limit, search } = req.query as any;
    const result = await listLinkablePayablesService(req.params.id, page, limit, search);
    sendList(res, result.data, result.pagination);
  },
  linkPayables: async (req: Request, res: Response) => {
    sendOk(res, await linkPayablesService(req.params.id, req.body.payableIds, req.body.type));
  },
  createCost: async (req: Request, res: Response) => {
    sendOk(res, await createManualCostService(req.params.id, req.body), 201);
  },
  updateCost: async (req: Request, res: Response) => {
    sendOk(res, await updateManualCostService(req.params.subId, req.body));
  },
  deleteCost: async (req: Request, res: Response) => {
    sendOk(res, await deleteCostService(req.params.subId));
  },
};
