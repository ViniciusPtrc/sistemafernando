import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middlewares/validate';
import { contractController } from '../controllers/contract.controller';
import { marginController } from '../controllers/margin.controller';
import {
  createContractBody,
  createContractCostBody,
  idParam,
  linkPayablesBody,
  linkReceivablesBody,
  linkableQuery,
  listContractsQuery,
  marginByContractQuery,
  marginQuery,
  twoIdParam,
  updateContractBody,
  updateContractCostBody,
} from '../validators/contract.schema';

const router = Router();

// Margem — Nível 1 (consolidado)
router.get('/margin/summary', validate({ query: marginQuery }), asyncHandler(marginController.summary));
router.get('/margin/monthly', validate({ query: marginQuery }), asyncHandler(marginController.monthly));
router.get('/margin/by-contract', validate({ query: marginByContractQuery }), asyncHandler(marginController.byContract));

// Contratos — CRUD
router.get('/contracts', validate({ query: listContractsQuery }), asyncHandler(contractController.list));
router.post('/contracts', validate({ body: createContractBody }), asyncHandler(contractController.create));
router.get('/contracts/:id', validate({ params: idParam }), asyncHandler(contractController.getOne));
router.put('/contracts/:id', validate({ params: idParam, body: updateContractBody }), asyncHandler(contractController.update));
router.delete('/contracts/:id', validate({ params: idParam }), asyncHandler(contractController.remove));

// Margem — Nível 2 (por contrato)
router.get('/contracts/:id/margin', validate({ params: idParam, query: marginQuery }), asyncHandler(marginController.contractSummary));
router.get('/contracts/:id/margin/monthly', validate({ params: idParam, query: marginQuery }), asyncHandler(marginController.contractMonthly));

// Vincular receitas existentes (§4/§14)
router.get('/contracts/:id/revenues/linkable', validate({ params: idParam, query: linkableQuery }), asyncHandler(contractController.linkableReceivables));
router.post('/contracts/:id/revenues/link', validate({ params: idParam, body: linkReceivablesBody }), asyncHandler(contractController.linkReceivables));
router.delete('/contracts/:id/revenues/:subId/link', validate({ params: twoIdParam }), asyncHandler(contractController.unlinkReceivable));

// Custos do contrato — manuais + vincular Contas a Pagar existentes (§10/§11/§12/§13)
router.get('/contracts/:id/costs', validate({ params: idParam }), asyncHandler(contractController.costs));
router.post('/contracts/:id/costs', validate({ params: idParam, body: createContractCostBody }), asyncHandler(contractController.createCost));
router.put('/contracts/:id/costs/:subId', validate({ params: twoIdParam, body: updateContractCostBody }), asyncHandler(contractController.updateCost));
router.delete('/contracts/:id/costs/:subId', validate({ params: twoIdParam }), asyncHandler(contractController.deleteCost));
router.get('/contracts/:id/costs/linkable', validate({ params: idParam, query: linkableQuery }), asyncHandler(contractController.linkablePayables));
router.post('/contracts/:id/costs/link', validate({ params: idParam, body: linkPayablesBody }), asyncHandler(contractController.linkPayables));

export default router;
