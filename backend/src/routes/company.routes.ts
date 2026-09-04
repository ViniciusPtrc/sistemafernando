import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middlewares/validate';
import { companyController, catalogController } from '../controllers/company.controller';
import {
  companyScopedQuery,
  createCompanyBody,
  idOrSlugParam,
  updateCompanyBody,
} from '../validators/misc.schema';

const router = Router();

router.get('/companies', asyncHandler(companyController.list));
router.post('/companies', validate({ body: createCompanyBody }), asyncHandler(companyController.create));
router.get('/companies/:id', validate({ params: idOrSlugParam }), asyncHandler(companyController.getOne));
router.put('/companies/:id', validate({ params: idOrSlugParam, body: updateCompanyBody }), asyncHandler(companyController.update));
router.delete('/companies/:id', validate({ params: idOrSlugParam }), asyncHandler(companyController.remove));

router.get('/categories', asyncHandler(catalogController.categories));
router.get('/customers', validate({ query: companyScopedQuery }), asyncHandler(catalogController.customers));
router.get('/suppliers', validate({ query: companyScopedQuery }), asyncHandler(catalogController.suppliers));

export default router;
