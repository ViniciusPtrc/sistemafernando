import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { validate } from '../middlewares/validate';
import { makeEntryController } from '../controllers/entry.controller';
import type { EntryKind } from '../repositories/entry.repo';
import {
  createPayableBody,
  createReceivableBody,
  idParam,
  listEntryQuery,
  summaryQuery,
  updatePayableBody,
  updateReceivableBody,
} from '../validators/entry.schema';

export function entryRouter(kind: EntryKind): Router {
  const router = Router();
  const c = makeEntryController(kind);
  const createBody = kind === 'receivable' ? createReceivableBody : createPayableBody;
  const updateBody = kind === 'receivable' ? updateReceivableBody : updatePayableBody;

  router.get('/', validate({ query: listEntryQuery }), asyncHandler(c.list));
  router.get('/summary', validate({ query: summaryQuery }), asyncHandler(c.summary));
  router.post('/', validate({ body: createBody }), asyncHandler(c.create));
  router.get('/:id', validate({ params: idParam }), asyncHandler(c.getOne));
  router.put('/:id', validate({ params: idParam, body: updateBody }), asyncHandler(c.update));
  router.delete('/:id', validate({ params: idParam }), asyncHandler(c.remove));

  return router;
}
