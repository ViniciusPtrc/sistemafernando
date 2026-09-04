import type { Request, Response } from 'express';
import { getCompanyComparisonService, getDashboardService } from '../services/dashboard.service';
import {
  cashFlowComparisonService,
  cashFlowEntriesService,
  cashFlowPointsService,
  cashFlowSummaryService,
} from '../services/cashflow.service';
import { generateReport, isReportType } from '../services/report.service';
import { HttpError, sendOk } from '../utils/http';

export const dashboardController = {
  overview: async (req: Request, res: Response) => {
    const { companyId } = req.query as { companyId?: string };
    sendOk(res, await getDashboardService(companyId));
  },
  companies: async (req: Request, res: Response) => {
    const { sort } = req.query as { sort?: string };
    sendOk(res, await getCompanyComparisonService(sort));
  },
};

export const cashFlowController = {
  points: async (req: Request, res: Response) => {
    sendOk(res, await cashFlowPointsService(req.query as any));
  },
  summary: async (req: Request, res: Response) => {
    sendOk(res, await cashFlowSummaryService((req.query as any).companyId));
  },
  entries: async (req: Request, res: Response) => {
    sendOk(res, await cashFlowEntriesService((req.query as any).companyId));
  },
  comparison: async (_req: Request, res: Response) => {
    sendOk(res, await cashFlowComparisonService());
  },
};

export const reportController = {
  generate: async (req: Request, res: Response) => {
    const { type } = req.params;
    if (!isReportType(type)) throw new HttpError(400, `Relatório desconhecido: ${type}`);
    const { companyId } = req.query as { companyId?: string };
    sendOk(res, await generateReport(type, companyId));
  },
};
