import type { Request, Response } from 'express';
import { sendOk } from '../utils/http';
import { getMarginSummary, getMarginMonthly, getMarginByContract, getContractMargin, getContractMarginMonthly } from '../services/margin.service';

export const marginController = {
  summary: async (req: Request, res: Response) => {
    sendOk(res, await getMarginSummary(req.query as any));
  },
  monthly: async (req: Request, res: Response) => {
    sendOk(res, await getMarginMonthly(req.query as any));
  },
  byContract: async (req: Request, res: Response) => {
    const q = req.query as any;
    sendOk(res, await getMarginByContract(q, q.sort));
  },
  contractSummary: async (req: Request, res: Response) => {
    sendOk(res, await getContractMargin(req.params.id, req.query as any));
  },
  contractMonthly: async (req: Request, res: Response) => {
    sendOk(res, await getContractMarginMonthly(req.params.id, req.query as any));
  },
};
