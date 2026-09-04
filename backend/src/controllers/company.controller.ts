import type { Request, Response } from 'express';
import {
  createCompanyService,
  deleteCompanyService,
  getCompanyService,
  listCompaniesService,
  updateCompanyService,
} from '../services/company.service';
import { listCategories, listCustomers, listSuppliers } from '../services/catalog.service';
import { sendOk } from '../utils/http';

export const companyController = {
  list: async (_req: Request, res: Response) => sendOk(res, await listCompaniesService()),
  getOne: async (req: Request, res: Response) => sendOk(res, await getCompanyService(req.params.id)),
  create: async (req: Request, res: Response) => sendOk(res, await createCompanyService(req.body), 201),
  update: async (req: Request, res: Response) => sendOk(res, await updateCompanyService(req.params.id, req.body)),
  remove: async (req: Request, res: Response) => sendOk(res, await deleteCompanyService(req.params.id)),
};

export const catalogController = {
  categories: async (_req: Request, res: Response) => sendOk(res, await listCategories()),
  customers: async (req: Request, res: Response) => sendOk(res, await listCustomers((req.query as any).companyId)),
  suppliers: async (req: Request, res: Response) => sendOk(res, await listSuppliers((req.query as any).companyId)),
};
