import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middlewares/validate';
import { priceFormationController } from '../controllers/priceFormation.controller';
import { createPriceFormationBody, idParam, listPriceFormationsQuery, updatePriceFormationBody } from '../validators/priceFormation.schema';

const router = Router();

router.get('/price-formations', validate({ query: listPriceFormationsQuery }), asyncHandler(priceFormationController.list));
router.post('/price-formations', validate({ body: createPriceFormationBody }), asyncHandler(priceFormationController.create));
router.get('/price-formations/:id', validate({ params: idParam }), asyncHandler(priceFormationController.getOne));
router.put('/price-formations/:id', validate({ params: idParam, body: updatePriceFormationBody }), asyncHandler(priceFormationController.update));
router.delete('/price-formations/:id', validate({ params: idParam }), asyncHandler(priceFormationController.remove));
router.post('/price-formations/:id/duplicate', validate({ params: idParam }), asyncHandler(priceFormationController.duplicate));

export default router;
