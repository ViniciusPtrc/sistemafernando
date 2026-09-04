import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middlewares/validate';
import { cashFlowController, dashboardController, reportController } from '../controllers/analytics.controller';
import {
  cashFlowQuery,
  comparisonQuery,
  companyScopedQuery,
  dashboardQuery,
  reportParams,
  reportQuery,
} from '../validators/misc.schema';

const router = Router();

router.get('/dashboard', validate({ query: dashboardQuery }), asyncHandler(dashboardController.overview));
router.get('/dashboard/companies', validate({ query: comparisonQuery }), asyncHandler(dashboardController.companies));

router.get('/cash-flow', validate({ query: cashFlowQuery }), asyncHandler(cashFlowController.points));
router.get('/cash-flow/summary', validate({ query: companyScopedQuery }), asyncHandler(cashFlowController.summary));
router.get('/cash-flow/entries', validate({ query: companyScopedQuery }), asyncHandler(cashFlowController.entries));
router.get('/cash-flow/comparison', asyncHandler(cashFlowController.comparison));

router.get('/reports/:type', validate({ params: reportParams, query: reportQuery }), asyncHandler(reportController.generate));

export default router;
