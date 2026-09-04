import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middlewares/validate';
import { uploadSpreadsheet } from '../middlewares/upload';
import { importController } from '../controllers/import.controller';
import { importListQuery } from '../validators/misc.schema';

const router = Router();

router.post('/import/preview', uploadSpreadsheet, asyncHandler(importController.preview));
router.post('/import', uploadSpreadsheet, asyncHandler(importController.commit));
router.get('/imports', validate({ query: importListQuery }), asyncHandler(importController.list));

export default router;
