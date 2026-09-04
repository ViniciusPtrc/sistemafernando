import { Router } from 'express';
import { healthCheck } from '../controllers/health.controller';
import { entryRouter } from './entry.routes';
import companyRoutes from './company.routes';
import analyticsRoutes from './analytics.routes';
import importRoutes from './import.routes';

const api = Router();

api.get('/health', healthCheck);
api.use(companyRoutes);
api.use('/receivables', entryRouter('receivable'));
api.use('/payables', entryRouter('payable'));
api.use(analyticsRoutes);
api.use(importRoutes);

export default api;
